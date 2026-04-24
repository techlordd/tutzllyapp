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
    let sql = `SELECT * FROM schedules s WHERE s.entry_status != 'deleted' AND (s.academy_id = $1 OR $1 = 0)`;
    const params: (string | number)[] = [academyId];
    if (studentId) { params.push(studentId); sql += ` AND s.student_id = $${params.length}`; }
    if (tutorId) { params.push(tutorId); sql += ` AND (s.tutor_id = $${params.length} OR s.tutor_id IN (SELECT t.tutor_id FROM tutors t JOIN users u ON t.user_id = u.id WHERE u.user_id = $${params.length} AND t.entry_status != 'deleted'))`; }
    if (parentId) {
      params.push(parentId);
      sql += ` AND s.student_id IN (SELECT sid FROM (SELECT unnest(ARRAY[p.student_id1,p.student_id2,p.student_id3,p.student_id4,p.student_id5]) AS sid FROM parents p JOIN users u ON p.user_id = u.id WHERE u.user_id = $${params.length}) sub WHERE sid IS NOT NULL)`;
    }
    sql += ' ORDER BY s.day, s.session_start_time';
    const schedules = await query(sql, params);
    return NextResponse.json({ schedules });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    const rows = await query<{ schedule_id: string }>(
      `SELECT schedule_id FROM schedules WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );
    await query(`DELETE FROM schedules WHERE (academy_id = $1 OR $1 = 0)`, [academyId]);
    return NextResponse.json({ deleted: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const academyId = getAcademyId(request);
    const scheduleId = generateId('SCH');
    const schedule = await queryOne(
      `INSERT INTO schedules (academy_id, schedule_id, student_id, student_name, tutor_id, tutor_name, tutor_email,
       course_id, course_name, course_code, year, day, duration, session_start_time, session_end_time,
       time_zone, zoom_link, meeting_id, meeting_passcode, assign_status, entry_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'active','active') RETURNING *`,
      [academyId || null, scheduleId, data.student_id, data.student_name, data.tutor_id, data.tutor_name, data.tutor_email,
       data.course_id, data.course_name, data.course_code, data.year, data.day, data.duration,
       data.session_start_time, data.session_end_time, data.time_zone, data.zoom_link,
       data.meeting_id, data.meeting_passcode]
    );
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}
