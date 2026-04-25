import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyPassword, hashPassword } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { current_password, new_password } = await request.json();
    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 });
    }
    if (new_password.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const user = await queryOne<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1`,
      [payload.id]
    );
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const valid = await verifyPassword(current_password, user.password_hash);
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

    const hash = await hashPassword(new_password);
    await queryOne(`UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2 RETURNING id`, [hash, payload.id]);

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
