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

/** PATCH /api/messages/sent — bulk soft-delete by { ids: number[], msg_type: string }[] */
export async function PATCH(request: NextRequest) {
  try {
    const { items }: { items: { id: number; msg_type: string }[] } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }
    const tableMap: Record<string, string> = {
      admin: 'messages_admin', tutor: 'messages_tutor',
      student: 'messages_student', parent: 'messages_parent',
    };
    for (const { id, msg_type } of items) {
      const table = tableMap[msg_type];
      if (table) {
        await query(`UPDATE ${table} SET entry_status='deleted', last_updated=NOW() WHERE record_id=$1`, [id]);
      }
    }
    return NextResponse.json({ deleted: items.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 });
  }
}
