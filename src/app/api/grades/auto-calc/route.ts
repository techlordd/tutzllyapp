import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

const MONTH_NUM: Record<string, string> = {
  January: '01', February: '02', March: '03', April: '04',
  May: '05', June: '06', July: '07', August: '08',
  September: '09', October: '10', November: '11', December: '12',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId  = searchParams.get('student_id');
    const courseName = searchParams.get('course_name');
    const month      = searchParams.get('month');
    const year       = searchParams.get('year');
    const academyId  = getAcademyId(request);

    if (!studentId || !courseName || !month || !year) {
      return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
    }

    const monthNum = MONTH_NUM[month];
    if (!monthNum) return NextResponse.json({ error: 'Invalid month' }, { status: 400 });

    const datePrefix = `${year}-${monthNum}`;

    const row = await queryOne<{
      avg_punctuality: string | null;
      avg_attentiveness: string | null;
      avg_engagement: string | null;
      homework_pct: string | null;
      total: string;
    }>(
      `SELECT
         AVG(NULLIF(punctuality1, '')::numeric)    AS avg_punctuality,
         AVG(NULLIF(attentiveness1, '')::numeric)  AS avg_attentiveness,
         AVG(NULLIF(class_engagement1, '')::numeric) AS avg_engagement,
         ROUND(
           COUNT(CASE WHEN did_student_complete_prev_homework = 'yes' THEN 1 END) * 100.0 /
           NULLIF(COUNT(CASE WHEN did_student_complete_prev_homework IN ('yes','no','partial') THEN 1 END), 0)
         ) AS homework_pct,
         COUNT(*) AS total
       FROM class_activities
       WHERE entry_status != 'deleted'
         AND (academy_id = $1 OR $1 = 0)
         AND (
           student_id = $2
           OR student_id IN (
             SELECT st.student_id FROM students st
             JOIN users u ON st.user_id = u.id
             WHERE u.user_id = $2 AND st.entry_status != 'deleted'
           )
         )
         AND course_name = $3
         AND class_activity_date LIKE $4 || '%'`,
      [academyId, studentId, courseName, datePrefix]
    );

    const total = parseInt(row?.total ?? '0');
    const parse = (v: string | null) => v != null ? Math.round(parseFloat(v)) : null;

    return NextResponse.json({
      found: total > 0,
      total_activities: total,
      punctuality:  parse(row?.avg_punctuality ?? null),
      attentiveness: parse(row?.avg_attentiveness ?? null),
      engagement:   parse(row?.avg_engagement ?? null),
      homework:     parse(row?.homework_pct ?? null),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to calculate scores' }, { status: 500 });
  }
}
