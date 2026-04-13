import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const parents = await query(
      `SELECT * FROM parents WHERE entry_status != 'deleted' AND (
         fullname_first ILIKE $1 OR fullname_last ILIKE $1 OR parent_id ILIKE $1 OR email ILIKE $1
       ) ORDER BY created_at DESC`,
      [`%${search}%`]
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
    const parentId = generateId('PAR');
    const userId_str = generateId('USR');
    const passwordHash = await hashPassword(data.password || 'Tutzlly@123');
    
    const user = await queryOne<{ id: number }>(
      `INSERT INTO users (user_id, username, email, password_hash, role) 
       VALUES ($1, $2, $3, $4, 'parent') RETURNING id`,
      [userId_str, data.username || data.email.split('@')[0], data.email, passwordHash]
    );
    
    const parent = await queryOne(
      `INSERT INTO parents (parent_id, user_id, username, email, fullname_first, fullname_last,
       phone_no, sex, date_of_birth, address_line1, address_line2, address_city, address_state, address_zip,
       address_country, short_bio, no_of_students, student1, student_id1, student2, student_id2,
       student3, student_id3, student4, student_id4, student5, student_id5, entry_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,'active')
       RETURNING *`,
      [parentId, user?.id, data.username, data.email, data.fullname_first, data.fullname_last,
       data.phone_no, data.sex, data.date_of_birth, data.address_line1, data.address_line2,
       data.address_city, data.address_state, data.address_zip, data.address_country, data.short_bio,
       data.no_of_students || 0, data.student1, data.student_id1, data.student2, data.student_id2,
       data.student3, data.student_id3, data.student4, data.student_id4, data.student5, data.student_id5]
    );
    return NextResponse.json({ parent }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create parent' }, { status: 500 });
  }
}
