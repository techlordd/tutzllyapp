import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { generateId } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const tutorId = searchParams.get('tutor_id');
    const parentId = searchParams.get('parent_id');
    let sql = `SELECT se.*, c.course_name, c.course_code FROM student_enrollments se
               LEFT JOIN courses c ON se.course_id = c.id
               WHERE se.entry_status != 'deleted'`;
    const params: string[] = [];
    if (studentId) { params.push(studentId); sql += ` AND se.student_id = $${params.length}`; }
    if (tutorId) { params.push(tutorId); sql += ` AND se.tutor_id = $${params.length}`; }
    if (parentId) {
      params.push(parentId);
      sql += ` AND se.student_id IN (SELECT sid FROM (SELECT unnest(ARRAY[p.student_id1,p.student_id2,p.student_id3,p.student_id4,p.student_id5]) AS sid FROM parents p JOIN users u ON p.user_id = u.id WHERE u.user_id = $${params.length}) sub WHERE sid IS NOT NULL)`;
    }
    sql += ' ORDER BY se.created_at DESC';
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
    const assignId = generateId('ASN');
    const enrollment = await queryOne(
      `INSERT INTO student_enrollments (assign_id, student_id, student_name, student_sex,
       tutor_id, tutor_name, tutor_username, tutor_sex, tutor_email, course_id, course_name, course_code, entry_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active') RETURNING *`,
      [assignId, data.student_id, data.student_name, data.student_sex, data.tutor_id,
       data.tutor_name, data.tutor_username, data.tutor_sex, data.tutor_email,
       data.course_id, data.course_name, data.course_code]
    );
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create enrollment' }, { status: 500 });
  }
}
