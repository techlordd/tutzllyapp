import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hashPassword } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { generateId } from '@/lib/utils';

function requireSuperAdmin(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload?.is_super_admin) return null;
  return payload;
}

export async function GET(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('GET /api/super-admin/academies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = requireSuperAdmin(request);
    if (!payload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { academy_name, academy_email, academy_description, subdomain, custom_domain,
            admin_email, admin_username, admin_password } = body;
    if (!academy_name) return NextResponse.json({ error: 'academy_name is required' }, { status: 400 });

    // Auto-generate a unique slug; retry once on collision
    const makeSlug = () => 'ACM-' + Array.from({ length: 6 }, () =>
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 36)]
    ).join('');

    let academy = null;
    for (let attempt = 0; attempt < 3 && !academy; attempt++) {
      const slug = makeSlug();
      academy = await queryOne(
        `INSERT INTO academies (academy_id, academy_name, academy_email, academy_description, subdomain, custom_domain, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (academy_id) DO NOTHING
         RETURNING *`,
        [slug, academy_name, academy_email || null, academy_description || null, subdomain || null, custom_domain || null]
      );
    }

    if (!academy) return NextResponse.json({ error: 'Failed to generate unique academy ID, please try again' }, { status: 409 });

    // Create admin user if credentials provided
    let adminUser = null;
    if (admin_email) {
      const password = admin_password || 'Tutzlly@123';
      const username = admin_username || admin_email.split('@')[0];
      const hash = await hashPassword(password);
      const userId = generateId('USR');

      // Upsert user (in case email already exists globally)
      const existing = await queryOne<{ id: number }>(
        'SELECT id FROM users WHERE email = $1', [admin_email]
      );
      let dbUserId: number;
      if (existing) {
        dbUserId = existing.id;
      } else {
        const newUser = await queryOne<{ id: number }>(
          `INSERT INTO users (user_id, username, email, password_hash, role, is_active)
           VALUES ($1, $2, $3, $4, 'admin', true) RETURNING id`,
          [userId, username, admin_email, hash]
        );
        dbUserId = newUser!.id;
      }

      await query(
        `INSERT INTO user_academy_roles (user_id, academy_id, role)
         VALUES ($1, $2, 'admin') ON CONFLICT DO NOTHING`,
        [dbUserId, academy.id]
      );

      adminUser = { email: admin_email, username, password };
    }

    return NextResponse.json({ academy, adminUser }, { status: 201 });
  } catch (error) {
    console.error('POST /api/super-admin/academies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
