import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hashPassword } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

function requireSuperAdmin(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload?.is_super_admin) return null;
  return payload;
}

// GET: list admin users for an academy
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = requireSuperAdmin(request);
  if (!payload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const academyId = Number(id);
  const admins = await query(
    `SELECT u.id, u.user_id, u.username, u.email, u.is_active
     FROM users u
     JOIN user_academy_roles uar ON uar.user_id = u.id
     WHERE uar.academy_id = $1 AND uar.role = 'admin'
     ORDER BY u.id`,
    [academyId]
  );
  return NextResponse.json({ admins });
}

// POST: reset password for an admin of an academy
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = requireSuperAdmin(request);
  if (!payload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const academyId = Number(id);
  const { user_id, new_password } = await request.json();
  if (!user_id || !new_password) {
    return NextResponse.json({ error: 'user_id and new_password are required' }, { status: 400 });
  }

  // Verify the user is actually an admin of this academy
  const member = await queryOne(
    `SELECT u.id, u.email, u.username FROM users u
     JOIN user_academy_roles uar ON uar.user_id = u.id
     WHERE u.id = $1 AND uar.academy_id = $2 AND uar.role = 'admin'`,
    [user_id, academyId]
  );
  if (!member) return NextResponse.json({ error: 'Admin not found for this academy' }, { status: 404 });

  const hash = await hashPassword(new_password);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user_id]);

  return NextResponse.json({ success: true, email: member.email, username: member.username });
}
