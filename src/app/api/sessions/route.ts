import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { getAcademyId } from '@/lib/request-context';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get('tutor_id');
    const studentId = searchParams.get('student_id');
    const parentId = searchParams.get('parent_id');
    const status = searchParams.get('status');
    const countOnly = searchParams.get('count') === 'true';
    const academyId = getAcademyId(request);

    if (countOnly) {
      const countParams: (string | number)[] = [academyId];
      let countSql = `SELECT COUNT(*) AS total FROM sessions WHERE entry_status != 'deleted' AND (academy_id = $1 OR $1 = 0)`;
      if (status) { countParams.push(status); countSql += ` AND status = $${countParams.length}`; }
      if (tutorId) { countParams.push(tutorId); countSql += ` AND (tutor_id = $${countParams.length} OR tutor_id IN (SELECT t.tutor_id FROM tutors t JOIN users u ON t.user_id = u.id WHERE u.user_id = $${countParams.length} AND t.entry_status != 'deleted'))`; }
      const result = await queryOne<{ total: string }>(countSql, countParams);
      return NextResponse.json({ count: parseInt(result?.total ?? '0', 10) });
    }

    let sql = `SELECT s.*,
                      COALESCE(s.course_name, c.course_name) AS course_name,
                      COALESCE(s.course_code, c.course_code) AS course_code
               FROM sessions s
               LEFT JOIN courses c ON s.course_id = c.id
               WHERE s.entry_status != 'deleted' AND (s.academy_id = $1 OR $1 = 0)`;
    const params: (string | number)[] = [academyId];
    if (tutorId) { params.push(tutorId); sql += ` AND (s.tutor_id = $${params.length} OR s.tutor_id IN (SELECT t.tutor_id FROM tutors t JOIN users u ON t.user_id = u.id WHERE u.user_id = $${params.length} AND t.entry_status != 'deleted'))`; }
    if (studentId) { params.push(studentId); sql += ` AND s.student_id = $${params.length}`; }
    if (parentId) {
      params.push(parentId);
      sql += ` AND s.student_id IN (SELECT sid FROM (SELECT unnest(ARRAY[p.student_id1,p.student_id2,p.student_id3,p.student_id4,p.student_id5]) AS sid FROM parents p JOIN users u ON p.user_id = u.id WHERE u.user_id = $${params.length}) sub WHERE sid IS NOT NULL)`;
    }
    if (status) { params.push(status); sql += ` AND s.status = $${params.length}`; }
    sql += ' ORDER BY s.timestamp DESC';
    const sessions = await query(sql, params);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const academyId = getAcademyId(request);
    const ssid = generateId('SES');
    const session = await queryOne(
      `INSERT INTO sessions (academy_id, ssid, schedule_id, tutor_id, tutor_firstname, tutor_lastname,
       student_id, student_name, student_email, course_name, course_id, entry_date, day,
       schedule_start_time, schedule_end_time, schedule_day, zoom_link, meeting_id, meeting_passcode,
       mothers_email, fathers_email, status, course_code, entry_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,'active')
       RETURNING *`,
      [academyId || null, ssid, data.schedule_id, data.tutor_id, data.tutor_firstname, data.tutor_lastname,
       data.student_id, data.student_name, data.student_email, data.course_name, data.course_id,
       data.entry_date, data.day, data.schedule_start_time, data.schedule_end_time, data.schedule_day,
       data.zoom_link, data.meeting_id, data.meeting_passcode, data.mothers_email, data.fathers_email,
       data.status || 'started', data.course_code || null]
    );
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    const rows = await query<{ ssid: string }>(
      `SELECT ssid FROM sessions WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );
    await query(`DELETE FROM sessions WHERE (academy_id = $1 OR $1 = 0)`, [academyId]);
    return NextResponse.json({ deleted: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete sessions' }, { status: 500 });
  }
}
