import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { getAcademyId } from '@/lib/request-context';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const tutorId = searchParams.get('tutor_id');
    const parentId = searchParams.get('parent_id');
    const academyId = getAcademyId(request);
    let sql = `SELECT se.*,
                      COALESCE(se.course_name, c.course_name) AS course_name,
                      COALESCE(se.course_code, c.course_code) AS course_code
               FROM student_enrollments se
               LEFT JOIN courses c ON se.course_id = c.id
               WHERE se.entry_status != 'deleted' AND (se.academy_id = $1 OR $1 = 0)`;
    const params: (string | number)[] = [academyId];
    if (studentId) { params.push(studentId); sql += ` AND se.student_id = $${params.length}`; }
    if (tutorId) { params.push(tutorId); sql += ` AND (se.tutor_id = $${params.length} OR se.tutor_id IN (SELECT t.tutor_id FROM tutors t JOIN users u ON t.user_id = u.id WHERE u.user_id = $${params.length} AND t.entry_status != 'deleted'))`; }
    if (parentId) {
      params.push(parentId);
      sql += ` AND se.student_id IN (SELECT sid FROM (SELECT unnest(ARRAY[p.student_id1,p.student_id2,p.student_id3,p.student_id4,p.student_id5]) AS sid FROM parents p JOIN users u ON p.user_id = u.id WHERE u.user_id = $${params.length}) sub WHERE sid IS NOT NULL)`;
    }
    sql += ' ORDER BY se.timestamp DESC';
    const enrollments = await query(sql, params);
    return NextResponse.json({ enrollments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const academyId = getAcademyId(request);
    const assignId = generateId('ENR');
    const enrollment = await queryOne(
      `INSERT INTO student_enrollments (academy_id, assign_id, student_id, student_name, student_sex,
       tutor_id, tutor_name, tutor_username, tutor_sex, tutor_email, course_id, course_name, course_code, entry_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active') RETURNING *`,
      [academyId || null, assignId, data.student_id, data.student_name, data.student_sex, data.tutor_id,
       data.tutor_name, data.tutor_username, data.tutor_sex, data.tutor_email,
       data.course_id || null, data.course_name, data.course_code]
    );
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create enrollment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    const rows = await query<{ assign_id: string }>(
      `SELECT assign_id FROM student_enrollments WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );
    await query(`DELETE FROM student_enrollments WHERE (academy_id = $1 OR $1 = 0)`, [academyId]);
    return NextResponse.json({ deleted: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete enrollments' }, { status: 500 });
  }
}
