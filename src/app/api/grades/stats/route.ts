import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

const MONTH_ORDER = `CASE month
  WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
  WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
  WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
  WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
  ELSE 13 END`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const year      = searchParams.get('year');
    const tutorId   = searchParams.get('tutor_id');
    const academyId = getAcademyId(request);

    if (!studentId || !year) {
      return NextResponse.json({ error: 'student_id and year are required' }, { status: 400 });
    }

    const params: (string | number)[] = [academyId, studentId, year];

    let sql = `
      SELECT
        month,
        COUNT(*) AS count,
        ROUND(AVG(NULLIF(punctuality::text,  '')::numeric), 1) AS avg_punctuality,
        ROUND(AVG(NULLIF(attentiveness::text,'')::numeric), 1) AS avg_attentiveness,
        ROUND(AVG(NULLIF(engagement::text,   '')::numeric), 1) AS avg_engagement,
        ROUND(AVG(NULLIF(homework::text,     '')::numeric), 1) AS avg_homework,
        ROUND(AVG(NULLIF(test_score::text,   '')::numeric), 1) AS avg_test_score
      FROM grade_book
      WHERE entry_status != 'deleted'
        AND (academy_id = $1 OR $1 = 0)
        AND year = $3
        AND (
          student_id = $2
          OR student_id IN (
            SELECT st.student_id FROM students st
            JOIN users u ON st.user_id = u.id
            WHERE u.user_id = $2 AND st.entry_status != 'deleted'
          )
        )`;

    if (tutorId) {
      params.push(tutorId);
      sql += ` AND (tutor_id = $${params.length} OR tutor_id IN (
        SELECT t.tutor_id FROM tutors t JOIN users u ON t.user_id = u.id
        WHERE u.user_id = $${params.length} AND t.entry_status != 'deleted'
      ))`;
    }

    sql += ` GROUP BY month ORDER BY ${MONTH_ORDER}`;

    const rows = await query(sql, params);
    return NextResponse.json({ yearly_data: rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch grade stats' }, { status: 500 });
  }
}
