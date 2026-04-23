import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { getAcademyId } from '@/lib/request-context';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get('tutor_id');
    const academyId = getAcademyId(request);
    let sql = `SELECT ta.*,
                      COALESCE(ta.course_name, c.course_name) AS course_name,
                      COALESCE(ta.course_code, c.course_code) AS course_code,
                      COALESCE(NULLIF(t.firstname,''), t.full_name_first_name) AS firstname,
                      COALESCE(NULLIF(t.surname,''), t.full_name_last_name) AS surname
               FROM tutor_course_assignments ta
               LEFT JOIN courses c ON ta.course_id = c.id
               LEFT JOIN LATERAL (
                 SELECT firstname, full_name_first_name, surname, full_name_last_name
                 FROM tutors
                 WHERE tutor_id = ta.tutor_id AND entry_status != 'deleted'
                 LIMIT 1
               ) t ON true
               WHERE ta.entry_status != 'deleted' AND (ta.academy_id = $1 OR $1 = 0)`;
    const params: (string | number)[] = [academyId];
    if (tutorId) { params.push(tutorId); sql += ` AND ta.tutor_id = $${params.length}`; }
    sql += ' ORDER BY ta.timestamp DESC';
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

    const existing = await queryOne(
      `SELECT tutor_assign_id FROM tutor_course_assignments
       WHERE tutor_id=$1 AND course_id=$2 AND entry_status!='deleted' AND (academy_id=$3 OR $3=0)`,
      [data.tutor_id, data.course_id, academyId]
    );
    if (existing) return NextResponse.json({ error: 'This tutor is already assigned to this course' }, { status: 409 });

    const assignId = generateId('TCA');
    const assignment = await queryOne(
      `INSERT INTO tutor_course_assignments
         (academy_id, tutor_assign_id, tutor_id, tutor_name, tutor_username, tutor_email,
          course_id, course_name, course_code, user_id, assigned_date, status, notes, entry_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active') RETURNING *`,
      [academyId || null, assignId, data.tutor_id, data.tutor_name, data.tutor_username,
       data.tutor_email, data.course_id, data.course_name, data.course_code,
       data.user_id || null, data.assigned_date || null,
       data.status || 'active', data.notes || null]
    );
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to assign course' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    const rows = await query<{ tutor_assign_id: string }>(
      `SELECT tutor_assign_id FROM tutor_course_assignments WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );
    await query(`DELETE FROM tutor_course_assignments WHERE (academy_id = $1 OR $1 = 0)`, [academyId]);
    return NextResponse.json({ deleted: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete assignments' }, { status: 500 });
  }
}

