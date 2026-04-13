import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const tutors = await query(
      `SELECT t.*, u.username, u.email FROM tutors t 
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.entry_status != 'deleted' AND (
         t.firstname ILIKE $1 OR t.surname ILIKE $1 OR t.tutor_id ILIKE $1 OR t.email ILIKE $1
       )
       ORDER BY t.created_at DESC`,
      [`%${search}%`]
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
    const tutorId = generateId('TUT');
    const userId_str = generateId('USR');
    const passwordHash = await hashPassword(data.password || 'Tutzlly@123');
    
    const user = await queryOne<{ id: number }>(
      `INSERT INTO users (user_id, username, email, password_hash, role) 
       VALUES ($1, $2, $3, $4, 'tutor') RETURNING id`,
      [userId_str, data.username || data.email.split('@')[0], data.email, passwordHash]
    );
    
    const tutor = await queryOne(
      `INSERT INTO tutors (tutor_id, user_id, username, email, firstname, surname, fullname_first, fullname_last,
       phone_no, sex, date_of_birth, address_line1, address_line2, address_city, address_state, address_zip,
       address_country, short_bio, pay_category, salary, payrate_per_hour, entry_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'active')
       RETURNING *`,
      [tutorId, user?.id, data.username, data.email, data.firstname, data.surname,
       data.firstname, data.surname, data.phone_no, data.sex, data.date_of_birth,
       data.address_line1, data.address_line2, data.address_city, data.address_state,
       data.address_zip, data.address_country, data.short_bio, data.pay_category,
       data.salary, data.payrate_per_hour]
    );
    return NextResponse.json({ tutor }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create tutor' }, { status: 500 });
  }
}
