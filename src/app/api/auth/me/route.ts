import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  const user = await getUserById(payload.id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Attach academy context from JWT
  let academy = null;
  if (payload.current_academy_id) {
    academy = await queryOne(
      `SELECT id, academy_id, academy_name, primary_color, secondary_color, accent_color,
              logo_url, favicon_url, site_title, academy_description, academy_email
       FROM academies WHERE id = $1`,
      [payload.current_academy_id]
    );
  }

  return NextResponse.json({
    user,
    current_academy_id: payload.current_academy_id ?? null,
    is_super_admin: payload.is_super_admin ?? false,
    roles: payload.roles ?? [],
    academy,
  });
}
