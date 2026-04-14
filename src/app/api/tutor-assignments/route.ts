import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { getAcademyId } from '@/lib/request-context';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get('tutor_id');
    const academyId = getAcademyId(request);
    let sql = `SELECT ta.*, c.course_name, c.course_code, t.firstname, t.surname FROM tutor_course_assignments ta
               LEFT JOIN courses c ON ta.course_id = c.id
               LEFT JOIN tutors t ON ta.tutor_id = t.tutor_id
               WHERE ta.entry_status != 'deleted' AND (ta.academy_id = $1 OR $1 = 0)`;
    const params: (string | number)[] = [academyId];
    if (tutorId) { params.push(tutorId); sql += ` AND ta.tutor_id = $${params.length}`; }
    sql += ' ORDER BY ta.created_at DESC';
    const assignments = await query(sql, params);
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const academyId = getAcademyId(request);
    const assignId = generateId('TCA');
    const assignment = await queryOne(
      `INSERT INTO tutor_course_assignments (academy_id, tutor_assign_id, tutor_id, tutor_username, tutor_sex, tutor_email, course_id, course_name, course_code, entry_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active') RETURNING *`,
      [academyId || null, assignId, data.tutor_id, data.tutor_username, data.tutor_sex, data.tutor_email, data.course_id, data.course_name, data.course_code]
    );
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to assign course' }, { status: 500 });
  }
}
