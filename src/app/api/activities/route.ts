import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get('tutor_id');
    const studentId = searchParams.get('student_id');
    const academyId = getAcademyId(request);
    let sql = `SELECT * FROM class_activities WHERE entry_status != 'deleted' AND (academy_id = $1 OR $1 = 0)`;
    const params: (string | number)[] = [academyId];
    if (tutorId) { params.push(tutorId); sql += ` AND (tutor_id = $${params.length} OR tutor_id IN (SELECT t.tutor_id FROM tutors t JOIN users u ON t.user_id = u.id WHERE u.user_id = $${params.length} AND t.entry_status != 'deleted'))`; }
    if (studentId) { params.push(studentId); sql += ` AND student_id = $${params.length}`; }
    sql += ' ORDER BY class_activity_date DESC, class_activity_time DESC';
    const activities = await query(sql, params);
    return NextResponse.json({ activities });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
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
    const activity = await queryOne(
      `INSERT INTO class_activities (academy_id, ssid, tutor_id, tutor_firstname, tutor_lastname, student_id, student_name,
       course_name, course_id_ref, session_code_status, mothers_email, fathers_email, class_activity_date, class_activity_time,
       topic_taught, details_of_class_activity, activity, assigned_homework_from_prev, status_of_past_homework_review,
       new_homework_assigned, topic_of_homework, no_homework_why, did_student_complete_prev_homework, homework1, homework2, homework3,
       student_reason_for_not_completing, did_student_join_on_time, punctuality1, punctuality2, student_reason_for_late,
       is_student_attentive, attentiveness1, attentiveness2, attentiveness3, student_engages_in_class,
       class_engagement1, class_engagement2, class_engagement3, tutors_general_observation, tutors_intervention,
       helpful_link1, helpful_link2, helpful_link3, course_code, entry_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,'active')
       RETURNING *`,
      [academyId || null, d.ssid,d.tutor_id,d.tutor_firstname,d.tutor_lastname,d.student_id,d.student_name,
       d.course_name,d.course_id_ref,d.session_code_status,d.mothers_email,d.fathers_email,
       d.class_activity_date,d.class_activity_time,d.topic_taught,d.details_of_class_activity,
       d.activity,d.assigned_homework_from_prev,d.status_of_past_homework_review,
       d.new_homework_assigned,d.topic_of_homework,d.no_homework_why,d.did_student_complete_prev_homework,
       d.homework1,d.homework2,d.homework3,d.student_reason_for_not_completing,
       d.did_student_join_on_time,d.punctuality1,d.punctuality2,d.student_reason_for_late,
       d.is_student_attentive,d.attentiveness1,d.attentiveness2,d.attentiveness3,
       d.student_engages_in_class,d.class_engagement1,d.class_engagement2,d.class_engagement3,
       d.tutors_general_observation,d.tutors_intervention,d.helpful_link1,d.helpful_link2,d.helpful_link3,
       d.course_code || null]
    );
    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    const rows = await query<{ record_id: number }>(
      `SELECT record_id FROM class_activities WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );
    await query(`DELETE FROM class_activities WHERE (academy_id = $1 OR $1 = 0)`, [academyId]);
    return NextResponse.json({ deleted: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete activities' }, { status: 500 });
  }
}
