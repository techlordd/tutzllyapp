import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateFullToken, getUserAcademyRoles } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    let academyRoles = await getUserAcademyRoles(user.id);

    // Fallback for student/tutor/parent accounts whose user_academy_roles row was never
    // created (e.g. imported via CSV before that backfill ran). Look up their academy from
    // the role-specific table and write the missing row so future logins use the fast path.
    if (academyRoles.length === 0 && ['student', 'tutor', 'parent'].includes(user.role)) {
      const tableMap: Record<string, string> = { student: 'students', tutor: 'tutors', parent: 'parents' };
      const table = tableMap[user.role];
      const found = await query<{ academy_id: number; academy_name: string }>(
        `SELECT r.academy_id, a.academy_name
         FROM ${table} r
         JOIN academies a ON a.id = r.academy_id
         WHERE r.user_id = $1 AND a.is_active = true
         ORDER BY r.academy_id ASC`,
        [user.id]
      );
      if (found.length > 0) {
        for (const row of found) {
          await queryOne(
            `INSERT INTO user_academy_roles (user_id, academy_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [user.id, row.academy_id, user.role]
          );
        }
        academyRoles = found.map(r => ({ academy_id: r.academy_id, role: user.role, academy_name: r.academy_name }));
      }
    }

    // Super admin (platform-level Tutzlly staff): skip academy selection entirely
    if (user.role === 'super_admin') {
      const token = await generateFullToken(user, null);
      const response = NextResponse.json({
        user: {
          id: user.id, user_id: user.user_id, username: user.username,
          email: user.email, role: 'super_admin',
          current_academy_id: null, academy_name: null,
          is_super_admin: true,
        },
      });
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      return response;
    }

    // Domain-based auto-selection: if the request arrived via a branded subdomain or custom
    // domain, pre-select that academy instead of showing the academy picker.
    const domainHint = request.headers.get('x-domain-hint');
    if (domainHint) {
      const hintAcademy = await queryOne<{ id: number }>(
        `SELECT id FROM academies WHERE (subdomain = $1 OR custom_domain = $1) AND is_active = true LIMIT 1`,
        [domainHint]
      );
      if (hintAcademy) {
        const matchedRole = academyRoles.find(r => r.academy_id === hintAcademy.id);
        if (!matchedRole) {
          return NextResponse.json(
            { error: "You don't have access to this portal. Contact your administrator." },
            { status: 403 }
          );
        }
        const token = await generateFullToken(user, hintAcademy.id);
        const response = NextResponse.json({
          user: {
            id: user.id, user_id: user.user_id, username: user.username,
            email: user.email, role: matchedRole.role,
            current_academy_id: hintAcademy.id,
            academy_name: matchedRole.academy_name,
          },
        });
        response.cookies.set('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });
        return response;
      }
    }

    // Multiple academies: ask the client to pick one
    if (academyRoles.length > 1) {
      // Issue a pending token (no current_academy_id) and set as cookie
      // so select-academy endpoint can verify identity
      const pendingToken = await generateFullToken(user, undefined);
      const response = NextResponse.json({
        needs_academy_selection: true,
        academies: academyRoles.map(r => ({
          id: r.academy_id,
          academy_name: r.academy_name,
          role: r.role,
        })),
      });
      response.cookies.set('token', pendingToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10, // 10 min – just enough to complete selection
        path: '/',
      });
      return response;
    }

    // Single academy (or none yet – legacy / newly seeded): auto-select
    const token = await generateFullToken(user, academyRoles[0]?.academy_id ?? null);
    const response = NextResponse.json({
      user: {
        id: user.id, user_id: user.user_id, username: user.username,
        email: user.email, role: user.role,
        current_academy_id: academyRoles[0]?.academy_id ?? null,
        academy_name: academyRoles[0]?.academy_name ?? null,
      },
    });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
