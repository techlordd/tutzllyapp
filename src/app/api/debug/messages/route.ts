import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getUserRole } from '@/lib/request-context';

/**
 * Debug endpoint to diagnose inbox delivery issues.
 * Protected: must be called while logged in as admin or super_admin.
 * The middleware sets x-user-role before the request reaches this handler.
 *
 * Usage:
 *   GET /api/debug/messages?user_id=email@example.com
 */
export async function GET(request: NextRequest) {
  const role = getUserRole(request);
  if (role !== 'admin' && role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized — log in as admin first' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id'); // USR-xxx or email

  if (!userId) {
    return NextResponse.json({ error: 'Pass ?user_id=USR-xxx or ?user_id=email@...' }, { status: 400 });
  }

  try {
    // Lookup user by user_id string or email
    const userRow = await queryOne(
      `SELECT id, user_id, username, email, role FROM users WHERE user_id = $1 OR email = $1`,
      [userId]
    );

    // Pre-resolver for tutor table
    const tutorIds = await query<{ id: string }>(
      `SELECT tutor_id AS id FROM tutors WHERE tutor_id = $1
       UNION
       SELECT t.tutor_id AS id FROM tutors t JOIN users u ON t.user_id = u.id WHERE u.user_id = $1
       UNION
       SELECT t.tutor_id AS id FROM tutors t JOIN users u ON t.email = u.email WHERE u.user_id = $1
       UNION
       SELECT $1::text AS id`,
      [userId]
    );

    // Pre-resolver for student table
    const studentIds = await query<{ id: string }>(
      `SELECT student_id AS id FROM students WHERE student_id = $1
       UNION
       SELECT st.student_id AS id FROM students st JOIN users u ON st.user_id = u.id WHERE u.user_id = $1
       UNION
       SELECT s.student_id AS id FROM students s JOIN users u ON s.email = u.email WHERE u.user_id = $1
       UNION
       SELECT $1::text AS id`,
      [userId]
    );

    const tutorIdList = tutorIds.map(r => r.id).filter(Boolean);
    const studentIdList = studentIds.map(r => r.id).filter(Boolean);

    // Check recent messages_tutor where this user is the recipient
    const recentTutorMsgs = tutorIdList.length > 0
      ? await query(
          `SELECT record_id, timestamp, role, sender, recipient_tutor_id, recipient_tutor_name, subject, user_id
           FROM messages_tutor
           WHERE recipient_tutor_id = ANY($1::text[])
           ORDER BY timestamp DESC LIMIT 10`,
          [tutorIdList]
        )
      : [];

    // Check recent messages_student where this user is the recipient
    const recentStudentMsgs = studentIdList.length > 0
      ? await query(
          `SELECT record_id, timestamp, role, sender, recipient_id_student, recipient_name_student, subject, user_id
           FROM messages_student
           WHERE recipient_id_student = ANY($1::text[])
           ORDER BY timestamp DESC LIMIT 10`,
          [studentIdList]
        )
      : [];

    // Also show last 3 messages sent FROM this user (by numeric users.id) in BOTH tables
    const numericId = userRow ? (userRow as Record<string, unknown>).id : null;
    const sentTutor = numericId
      ? await query(
          `SELECT record_id, timestamp, role, sender, recipient_tutor_id, subject, user_id
           FROM messages_tutor WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 5`,
          [String(numericId)]
        )
      : [];
    const sentStudent = numericId
      ? await query(
          `SELECT record_id, timestamp, role, sender, recipient_id_student, subject, user_id
           FROM messages_student WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 5`,
          [String(numericId)]
        )
      : [];

    return NextResponse.json({
      queried_user_id: userId,
      user_row: userRow,
      resolved_tutor_ids: tutorIdList,
      resolved_student_ids: studentIdList,
      messages_tutor_as_recipient: recentTutorMsgs,
      messages_student_as_recipient: recentStudentMsgs,
      messages_tutor_sent_by_user: sentTutor,
      messages_student_sent_by_user: sentStudent,
    });
  } catch (error) {
    console.error('[debug/messages]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
