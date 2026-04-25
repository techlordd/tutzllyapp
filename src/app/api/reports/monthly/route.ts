import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

export async function GET(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'student';
    const month = searchParams.get('month');

    const params: (string | number)[] = [academyId];
    let sql: string;

    if (type === 'tutor') {
      sql = `
        SELECT
          tutor_id AS id,
          TRIM(CONCAT(COALESCE(tutor_firstname,''), ' ', COALESCE(tutor_lastname,''))) AS name,
          TO_CHAR(entry_date::date, 'YYYY-MM') AS month,
          COUNT(*)::int AS expected,
          SUM(CASE WHEN status = 'ended'       THEN 1 ELSE 0 END)::int AS completed,
          SUM(CASE WHEN status = 'missed'      THEN 1 ELSE 0 END)::int AS missed,
          SUM(CASE WHEN status = 'rescheduled' THEN 1 ELSE 0 END)::int AS rescheduled
        FROM sessions
        WHERE entry_status != 'deleted'
          AND (academy_id = $1 OR $1 = 0)
          AND entry_date IS NOT NULL
          AND tutor_id IS NOT NULL
      `;
    } else {
      sql = `
        SELECT
          student_id AS id,
          student_name AS name,
          TO_CHAR(entry_date::date, 'YYYY-MM') AS month,
          COUNT(*)::int AS expected,
          SUM(CASE WHEN status = 'ended'       THEN 1 ELSE 0 END)::int AS completed,
          SUM(CASE WHEN status = 'missed'      THEN 1 ELSE 0 END)::int AS missed,
          SUM(CASE WHEN status = 'rescheduled' THEN 1 ELSE 0 END)::int AS rescheduled
        FROM sessions
        WHERE entry_status != 'deleted'
          AND (academy_id = $1 OR $1 = 0)
          AND entry_date IS NOT NULL
          AND student_id IS NOT NULL
      `;
    }

    if (month) {
      params.push(month);
      sql += ` AND TO_CHAR(entry_date::date, 'YYYY-MM') = $${params.length}`;
    }

    sql += type === 'tutor'
      ? ` GROUP BY tutor_id, name, month ORDER BY month DESC, name`
      : ` GROUP BY student_id, name, month ORDER BY month DESC, name`;

    const rows = await query(sql, params);
    return NextResponse.json({ rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch monthly stats' }, { status: 500 });
  }
}
