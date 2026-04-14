import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, generateFullToken, getUserById } from '@/lib/auth';

// POST /api/super-admin/exit-academy
// Super admin only. Clears the current_academy_id from the JWT so they return
// to their platform-level super_admin context (no academy scope).
export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get('token')?.value;
    if (!rawToken) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = verifyToken(rawToken);
    if (!payload?.is_super_admin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const user = await getUserById(payload.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Generate a platform-level token (no academy context)
    const newToken = await generateFullToken(user, null);

    const response = NextResponse.json({ success: true });
    response.cookies.set('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('Exit academy error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
