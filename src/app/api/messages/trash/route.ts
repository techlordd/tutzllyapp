import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

const TABLE_MAP: Record<string, string> = {
  admin: 'messages_admin',
  tutor: 'messages_tutor',
  student: 'messages_student',
  parent: 'messages_parent',
};

/**
 * GET /api/messages/trash?user_id=X&role=Y
 * Returns all soft-deleted messages (sent or received) for this user.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId    = searchParams.get('user_id');
    const role      = searchParams.get('role');
    const academyId = getAcademyId(request);

    if (!userId || !role) {
      return NextResponse.json({ error: 'user_id and role are required' }, { status: 400 });
    }

    const scope = `(academy_id = $1 OR $1 = 0 OR academy_id IS NULL) AND entry_status = 'deleted'`;

    // Each leg: deleted messages either sent by this user OR addressed to this user
    const adminQ = `
      SELECT 'admin' AS msg_type, record_id, message_date, message_time, subject, status, body,
             last_updated AS deleted_at,
             CASE WHEN user_id = $2 THEN 'sent' ELSE 'received' END AS direction,
             COALESCE(recipient_admin, 'Admin') AS other_party
      FROM messages_admin
      WHERE ${scope} AND (user_id = $2 OR recipient_admin_id = $2 OR recipient_admin_id::text = $2)`;

    const tutorQ = `
      SELECT 'tutor' AS msg_type, record_id, message_date, message_time, subject, status, body,
             last_updated AS deleted_at,
             CASE WHEN user_id = $2 THEN 'sent' ELSE 'received' END AS direction,
             COALESCE(recipient_tutor_name, 'Tutor') AS other_party
      FROM messages_tutor
      WHERE ${scope} AND (user_id = $2 OR recipient_tutor_id = $2 OR sender_student_id = $2)`;

    const studentQ = `
      SELECT 'student' AS msg_type, record_id, message_date, message_time, subject, status, body,
             last_updated AS deleted_at,
             CASE WHEN user_id = $2 THEN 'sent' ELSE 'received' END AS direction,
             COALESCE(student_name, recipient_name_student, 'Student') AS other_party
      FROM messages_student
      WHERE ${scope} AND (user_id = $2 OR recipient_student_id = $2 OR sender_tutor_id = $2)`;

    const parentQ = `
      SELECT 'parent' AS msg_type, record_id, message_date, message_time, subject, status, body,
             last_updated AS deleted_at,
             CASE WHEN user_id = $2 THEN 'sent' ELSE 'received' END AS direction,
             COALESCE(recipient_name, 'Parent') AS other_party
      FROM messages_parent
      WHERE ${scope} AND (user_id = $2 OR recipient_parent_id = $2)`;

    // Include all tables — user may have deleted messages in any of them
    const parts = [adminQ, tutorQ, studentQ, parentQ];
    const sql = parts.join(' UNION ALL ') + ' ORDER BY deleted_at DESC NULLS LAST, message_date DESC';

    const messages = await query(sql, [academyId, userId]);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch trash' }, { status: 500 });
  }
}

/**
 * PATCH /api/messages/trash — restore (set entry_status back to 'active')
 * Body: { items: { id: number; msg_type: string }[] }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { items }: { items: { id: number; msg_type: string }[] } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }
    for (const { id, msg_type } of items) {
      const table = TABLE_MAP[msg_type];
      if (table) {
        await query(
          `UPDATE ${table} SET entry_status='active', last_updated=NOW() WHERE record_id=$1`,
          [id]
        );
      }
    }
    return NextResponse.json({ restored: items.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to restore messages' }, { status: 500 });
  }
}

/**
 * DELETE /api/messages/trash — permanently delete messages
 * Body: { items: { id: number; msg_type: string }[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { items }: { items: { id: number; msg_type: string }[] } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }
    for (const { id, msg_type } of items) {
      const table = TABLE_MAP[msg_type];
      if (table) {
        await query(`DELETE FROM ${table} WHERE record_id=$1`, [id]);
      }
    }
    return NextResponse.json({ deleted: items.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to permanently delete messages' }, { status: 500 });
  }
}
