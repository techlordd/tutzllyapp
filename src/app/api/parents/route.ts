import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { getAcademyId } from '@/lib/request-context';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const academyId = getAcademyId(request);
    const parents = await query(
      `SELECT p.*,
              COALESCE(NULLIF(p.email, ''), u.email) AS email,
              COALESCE(NULLIF(p.username, ''), u.username) AS username
       FROM parents p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.entry_status != 'deleted'
         AND (p.academy_id = $2 OR $2 = 0)
         AND (p.full_name_first_name ILIKE $1 OR p.full_name_last_name ILIKE $1
              OR p.parent_id ILIKE $1 OR p.email ILIKE $1 OR u.email ILIKE $1)
       ORDER BY p.timestamp DESC`,
      [`%${search}%`, academyId]
    );
    return NextResponse.json({ parents });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch parents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const academyId = getAcademyId(request);
    const parentId = generateId('PAR');
    const userId_str = generateId('USR');
    const passwordHash = await hashPassword(data.password || 'Tutzlly@123');

    const user = await queryOne<{ id: number }>(
      `INSERT INTO users (user_id, username, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'parent') RETURNING id`,
      [userId_str, data.username || data.email.split('@')[0], data.email, passwordHash]
    );

    if (user && academyId) {
      await queryOne(
        `INSERT INTO user_academy_roles (user_id, academy_id, role) VALUES ($1, $2, 'parent') ON CONFLICT DO NOTHING`,
        [user.id, academyId]
      );
    }

    const parent = await queryOne(
      `INSERT INTO parents (academy_id, parent_id, user_id, username, email,
       full_name_first_name, full_name_last_name, phone_no, sex, date_of_birth,
       address, address_line_1, address_line_2, address_city, address_state_province,
       address_zip_postal, address_country, short_bio,
       no_of_students, student1, student_id1, student2, student_id2,
       student3, student_id3, student4, student_id4, student5, student_id5,
       entry_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,'active')
       RETURNING *`,
      [academyId || null, parentId, user?.id, data.username, data.email,
       data.full_name_first_name, data.full_name_last_name, data.phone_no, data.sex, data.date_of_birth,
       data.address, data.address_line1, data.address_line2, data.address_city,
       data.address_state, data.address_zip, data.address_country, data.short_bio,
       data.no_of_students || 0,
       data.student1, data.student_id1, data.student2, data.student_id2,
       data.student3, data.student_id3, data.student4, data.student_id4,
       data.student5, data.student_id5]
    );
    return NextResponse.json({ parent }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create parent' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);

    const parentRows = await query<{ user_id: number; parent_id: string }>(
      `SELECT user_id, parent_id FROM parents WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );

    await query(`DELETE FROM parents WHERE (academy_id = $1 OR $1 = 0)`, [academyId]);

    const userIds = parentRows.map(r => r.user_id).filter(Boolean);
    if (userIds.length > 0) {
      await query(`DELETE FROM users WHERE id = ANY($1) AND role = 'parent'`, [userIds]);
    }

    return NextResponse.json({ deleted: parentRows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete parents' }, { status: 500 });
  }
}
