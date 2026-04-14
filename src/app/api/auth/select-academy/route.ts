import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, generateFullToken, getUserById, getUserAcademyRoles } from '@/lib/auth';

// POST /api/auth/select-academy
// Body: { academy_id: number }
// After the login flow returns needs_academy_selection: true, the client
// echoes back the pending_token (set as cookie by the select-academy page)
// plus the chosen academy_id. We re-issue a full token scoped to that academy.
export async function POST(request: NextRequest) {
  try {
    const { academy_id } = await request.json();
    if (!academy_id) {
      return NextResponse.json({ error: 'academy_id is required' }, { status: 400 });
    }

    const rawToken = request.cookies.get('token')?.value;
    if (!rawToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(rawToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify this user actually has a role in the requested academy
    const roles = await getUserAcademyRoles(payload.id);
    const match = roles.find(r => r.academy_id === Number(academy_id));
    if (!match) {
      return NextResponse.json({ error: 'You do not have access to this academy' }, { status: 403 });
    }

    const user = await getUserById(payload.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newToken = await generateFullToken(user, Number(academy_id));

    const response = NextResponse.json({
      user: {
        id: user.id, user_id: user.user_id, username: user.username,
        email: user.email, role: match.role,
        current_academy_id: match.academy_id,
        academy_name: match.academy_name,
      },
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
    console.error('select-academy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
