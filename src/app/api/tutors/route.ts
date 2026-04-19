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
    const tutors = await query(
      `SELECT t.*, u.username, u.email FROM tutors t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.entry_status != 'deleted'
         AND (t.academy_id = $2 OR $2 = 0)
         AND (t.firstname ILIKE $1 OR t.surname ILIKE $1 OR t.tutor_id ILIKE $1 OR t.email ILIKE $1)
       ORDER BY t.created_at DESC`,
      [`%${search}%`, academyId]
    );
    return NextResponse.json({ tutors });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch tutors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const academyId = getAcademyId(request);
    const tutorId = generateId('TUT');
    const userId_str = generateId('USR');
    const passwordHash = await hashPassword(data.password || 'Tutzlly@123');

    const user = await queryOne<{ id: number }>(
      `INSERT INTO users (user_id, username, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'tutor') RETURNING id`,
      [userId_str, data.username || data.email.split('@')[0], data.email, passwordHash]
    );

    if (user && academyId) {
      await queryOne(
        `INSERT INTO user_academy_roles (user_id, academy_id, role) VALUES ($1, $2, 'tutor') ON CONFLICT DO NOTHING`,
        [user.id, academyId]
      );
    }

    const tutor = await queryOne(
      `INSERT INTO tutors (academy_id, tutor_id, user_role, user_id, username, email, firstname, surname,
       full_name_first_name, full_name_last_name, phone_no, sex, date_of_birth,
       address, address_line_1, address_line_2, address_city, address_state_province, address_zip_postal,
       address_country, short_bio, pay_category, salary, payrate_per_hour, entry_status)
       VALUES ($1,$2,'tutor',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,'active')
       RETURNING *`,
      [academyId || null, tutorId, user?.id, data.username, data.email, data.firstname, data.surname,
       data.firstname, data.surname, data.phone_no, data.sex, data.date_of_birth,
       data.address, data.address_line1, data.address_line2, data.address_city,
       data.address_state, data.address_zip, data.address_country, data.short_bio,
       data.pay_category, data.salary, data.payrate_per_hour]
    );
    return NextResponse.json({ tutor }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create tutor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);

    // Collect user_ids before deleting so we can clean up auth accounts
    const tutorRows = await query<{ user_id: number; tutor_id: string }>(
      `SELECT user_id, tutor_id FROM tutors WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );

    // Hard-delete tutor records so UNIQUE constraints are freed for re-import
    await query(
      `DELETE FROM tutors WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );

    // Hard-delete the associated user accounts (tutor role only, not admins)
    const userIds = tutorRows.map(r => r.user_id).filter(Boolean);
    if (userIds.length > 0) {
      await query(
        `DELETE FROM users WHERE id = ANY($1) AND role = 'tutor'`,
        [userIds]
      );
    }

    return NextResponse.json({ deleted: tutorRows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete tutors' }, { status: 500 });
  }
}
