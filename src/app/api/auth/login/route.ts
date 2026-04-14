import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateFullToken, getUserAcademyRoles } from '@/lib/auth';

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

    const academyRoles = await getUserAcademyRoles(user.id);

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
