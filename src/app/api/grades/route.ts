import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const tutorId = searchParams.get('tutor_id');
    const parentId = searchParams.get('parent_id');
    const academyId = getAcademyId(request);
    let sql = `SELECT * FROM grade_book WHERE entry_status != 'deleted' AND (academy_id = $1 OR $1 = 0)`;
    const params: (string | number)[] = [academyId];
    if (studentId) { params.push(studentId); sql += ` AND student_id = $${params.length}`; }
    if (tutorId) { params.push(tutorId); sql += ` AND (tutor_id = $${params.length} OR tutor_id IN (SELECT t.tutor_id FROM tutors t JOIN users u ON t.user_id = u.id WHERE u.user_id = $${params.length} AND t.entry_status != 'deleted'))`; }
    if (parentId) {
      params.push(parentId);
      sql += ` AND student_id IN (SELECT student_id FROM student_enrollments WHERE user_id = (SELECT id FROM users WHERE user_id = $${params.length} LIMIT 1) AND entry_status != 'deleted')`;
    }
    sql += ' ORDER BY year DESC, month DESC';
    const grades = await query(sql, params);
    return NextResponse.json({ grades });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const d = await request.json();
    const academyId = getAcademyId(request);
    if (d.tutor_id) {
      const resolved = await queryOne<{ tutor_id: string }>(
        `SELECT t.tutor_id FROM tutors t JOIN users u ON t.user_id = u.id WHERE u.user_id = $1 AND t.entry_status != 'deleted' LIMIT 1`,
        [d.tutor_id]
      );
      if (resolved) d.tutor_id = resolved.tutor_id;
    }
    const grade = await queryOne(
      `INSERT INTO grade_book (academy_id, tutor_id, tutor_name, student_id, student_name, course_name, course_id,
       month, year, punctuality, attentiveness, engagement, homework, test_score, remarks, grade_code_status, status, entry_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'active') RETURNING *`,
      [academyId || null, d.tutor_id,d.tutor_name,d.student_id,d.student_name,d.course_name,d.course_id,
       d.month,d.year,d.punctuality,d.attentiveness,d.engagement,d.homework,d.test_score,d.remarks,d.grade_code_status,
       d.status || 'draft']
    );
    return NextResponse.json({ grade }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create grade entry' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    const rows = await query<{ record_id: number }>(
      `SELECT record_id FROM grade_book WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );
    await query(`DELETE FROM grade_book WHERE (academy_id = $1 OR $1 = 0)`, [academyId]);
    return NextResponse.json({ deleted: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete grade book entries' }, { status: 500 });
  }
}
