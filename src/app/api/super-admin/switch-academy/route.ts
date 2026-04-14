import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, generateFullToken, getUserById } from '@/lib/auth';
import { queryOne } from '@/lib/db';

// POST /api/super-admin/switch-academy
// Body: { academy_id: number }
// Super admin only. Switches current_academy_id in JWT so they can manage
// the target academy's data through the regular admin dashboard.
export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get('token')?.value;
    if (!rawToken) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = verifyToken(rawToken);
    if (!payload?.is_super_admin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { academy_id } = await request.json();
    if (!academy_id) return NextResponse.json({ error: 'academy_id is required' }, { status: 400 });

    // Verify the academy exists
    const academy = await queryOne<{ id: number; academy_name: string }>(
      'SELECT id, academy_name FROM academies WHERE id = $1 AND is_active = true',
      [academy_id]
    );
    if (!academy) return NextResponse.json({ error: 'Academy not found' }, { status: 404 });

    const user = await getUserById(payload.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Super admin may not have a row in user_academy_roles for this academy.
    // That's OK: generateFullToken will include their actual roles array but
    // current_academy_id will override which data context they see.
    const newToken = await generateFullToken(user, Number(academy_id));

    const response = NextResponse.json({
      switched_to: { academy_id: academy.id, academy_name: academy.academy_name },
    });
    response.cookies.set('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('switch-academy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
