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
    const students = await query(
      `SELECT * FROM students
       WHERE entry_status != 'deleted'
         AND (academy_id = $2 OR $2 = 0)
         AND (firstname ILIKE $1 OR surname ILIKE $1 OR student_id ILIKE $1 OR email ILIKE $1)
       ORDER BY created_at DESC`,
      [`%${search}%`, academyId]
    );
    return NextResponse.json({ students });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const academyId = getAcademyId(request);
    const studentId = generateId('STU');
    const enrollmentId = generateId('ENR');
    const userId_str = generateId('USR');
    const passwordHash = await hashPassword(data.password || 'Tutzlly@123');

    const user = await queryOne<{ id: number }>(
      `INSERT INTO users (user_id, username, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'student') RETURNING id`,
      [userId_str, data.username || data.email.split('@')[0], data.email, passwordHash]
    );

    if (user && academyId) {
      await queryOne(
        `INSERT INTO user_academy_roles (user_id, academy_id, role) VALUES ($1, $2, 'student') ON CONFLICT DO NOTHING`,
        [user.id, academyId]
      );
    }

    const student = await queryOne(
      `INSERT INTO students (academy_id, student_id, enrollment_id, user_id, username, email, firstname, surname,
       fullname_first, fullname_last, phone_no, sex, grade, school, date_of_birth, mothers_name,
       mothers_email, fathers_name, fathers_email, address_line1, address_line2, address_city,
       address_state, address_zip, address_country, short_bio, status, entry_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,'active','active')
       RETURNING *`,
      [academyId || null, studentId, enrollmentId, user?.id, data.username, data.email, data.firstname, data.surname,
       data.firstname, data.surname, data.phone_no, data.sex, data.grade, data.school, data.date_of_birth,
       data.mothers_name, data.mothers_email, data.fathers_name, data.fathers_email,
       data.address_line1, data.address_line2, data.address_city, data.address_state,
       data.address_zip, data.address_country, data.short_bio]
    );
    return NextResponse.json({ student }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}
