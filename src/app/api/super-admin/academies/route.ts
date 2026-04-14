import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

function requireSuperAdmin(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload?.is_super_admin) return null;
  return payload;
}

export async function GET(request: NextRequest) {
  const payload = requireSuperAdmin(request);
  if (!payload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const academies = await query(
    `SELECT a.*, COUNT(DISTINCT uar.user_id)::int AS member_count
     FROM academies a
     LEFT JOIN user_academy_roles uar ON uar.academy_id = a.id
     GROUP BY a.id
     ORDER BY a.created_at DESC`
  );
  return NextResponse.json({ academies });
}

export async function POST(request: NextRequest) {
  const payload = requireSuperAdmin(request);
  if (!payload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { academy_name, academy_email, academy_description } = body;
  if (!academy_name) return NextResponse.json({ error: 'academy_name is required' }, { status: 400 });

  // Auto-generate a short slug like ACM-XXXXXX
  const slug = 'ACM-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const academy = await queryOne(
    `INSERT INTO academies (academy_id, academy_name, academy_email, academy_description, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (academy_id) DO NOTHING
     RETURNING *`,
    [slug, academy_name, academy_email || null, academy_description || null]
  );

  if (!academy) return NextResponse.json({ error: 'Failed to create academy (slug conflict)' }, { status: 409 });
  return NextResponse.json({ academy }, { status: 201 });
}
