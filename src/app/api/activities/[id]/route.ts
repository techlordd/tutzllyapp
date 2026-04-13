import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = await queryOne('SELECT * FROM class_activities WHERE id = $1', [Number(id)]);
  if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ activity });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const {
    topic_taught, details_of_class_activity, activity,
    did_student_complete_prev_homework, new_homework_assigned, topic_of_homework,
    did_student_join_on_time, punctuality1, is_student_attentive, attentiveness1,
    student_engages_in_class, class_engagement1, tutors_general_observation,
    tutors_intervention, helpful_link1, helpful_link2, helpful_link3,
  } = body;
  const result = await queryOne(
    `UPDATE class_activities SET
      topic_taught=$1, details_of_class_activity=$2, activity=$3,
      did_student_complete_prev_homework=$4, new_homework_assigned=$5, topic_of_homework=$6,
      did_student_join_on_time=$7, punctuality1=$8, is_student_attentive=$9, attentiveness1=$10,
      student_engages_in_class=$11, class_engagement1=$12, tutors_general_observation=$13,
      tutors_intervention=$14, helpful_link1=$15, helpful_link2=$16, helpful_link3=$17
    WHERE id=$18 RETURNING *`,
    [topic_taught, details_of_class_activity, activity,
     did_student_complete_prev_homework, new_homework_assigned, topic_of_homework,
     did_student_join_on_time, punctuality1, is_student_attentive, attentiveness1,
     student_engages_in_class, class_engagement1, tutors_general_observation,
     tutors_intervention, helpful_link1, helpful_link2, helpful_link3, Number(id)]
  );
  return NextResponse.json({ activity: result });
}
