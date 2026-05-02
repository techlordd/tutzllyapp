import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const role   = searchParams.get('role');
    const academyId = getAcademyId(request);

    if (!userId || !role) {
      return NextResponse.json({ error: 'user_id and role are required' }, { status: 400 });
    }

    const params: (string | number)[] = [academyId, userId];
    const scope = `(academy_id = $1 OR $1 = 0 OR academy_id IS NULL) AND entry_status != 'deleted' AND user_id = $2`;

    const adminQ   = `SELECT 'admin'   AS msg_type, record_id, message_date, message_time, subject, status, body, COALESCE(recipient_admin,       'Admin')   AS recipient_name FROM messages_admin   WHERE ${scope}`;
    const tutorQ   = `SELECT 'tutor'   AS msg_type, record_id, message_date, message_time, subject, status, body, COALESCE(recipient_tutor_name,  'Tutor')   AS recipient_name FROM messages_tutor   WHERE ${scope}`;
    const studentQ = `SELECT 'student' AS msg_type, record_id, message_date, message_time, subject, status, body, COALESCE(student_name, recipient_name_student, 'Student') AS recipient_name FROM messages_student WHERE ${scope}`;
    const parentQ  = `SELECT 'parent'  AS msg_type, record_id, message_date, message_time, subject, status, body, COALESCE(recipient_name,        'Parent')  AS recipient_name FROM messages_parent  WHERE ${scope}`;

    const parts =
      role === 'tutor'   ? [adminQ, studentQ, parentQ] :
      role === 'student' ? [adminQ, tutorQ,   parentQ] :
      role === 'parent'  ? [adminQ, tutorQ,   studentQ] :
      /* admin */          [tutorQ, studentQ, parentQ];

    const sql = parts.join(' UNION ALL ') + ' ORDER BY message_date DESC, message_time DESC';
    const messages = await query(sql, params);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch sent messages' }, { status: 500 });
  }
}
