import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const academyId = getAcademyId(request);
    const tutorId = searchParams.get('tutor_id');
    let sql = `SELECT * FROM messages_tutor WHERE entry_status != 'deleted' AND (academy_id = $1 OR $1 = 0)`;
    const params: (string | number)[] = [academyId];
    if (userId)  { params.push(userId);  sql += ` AND user_id = $${params.length}`; }
    if (tutorId) { params.push(tutorId); sql += ` AND recipient_tutor_id = $${params.length}`; }
    sql += ' ORDER BY message_date DESC, message_time DESC, timestamp DESC';
    const messages = await query(sql, params);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const d = await request.json();
    const academyId = getAcademyId(request);
    const senderCol = d.role === 'student' ? 'sender_student_name'
      : d.role === 'parent' ? 'sender_parent_name'
      : 'sender_admin';
    const message = await queryOne(
      `INSERT INTO messages_tutor (academy_id, message_date, message_time, role, sender, sender_admin,
       sender_student_name, sender_parent_name, sender_email, user_role,
       recipient_tutor_name, recipient_tutor_id, recipient_email, cc,
       subject, body, attach_file, status, entry_status)
       VALUES ($1, NOW()::date, NOW()::time, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'unread', 'active') RETURNING *`,
      [
        academyId || null,
        d.role,
        d.sender || null,
        senderCol === 'sender_admin'         ? (d.sender || null) : null,
        senderCol === 'sender_student_name'  ? (d.sender || null) : null,
        senderCol === 'sender_parent_name'   ? (d.sender || null) : null,
        d.sender_email || null,
        d.user_role || d.role || null,
        d.recipient_tutor_name || null,
        d.recipient_tutor_id || null,
        d.recipient_email || null,
        d.cc || null,
        d.subject || null,
        d.body || null,
        d.attach_file || null,
      ]
    );
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    const rows = await query<{ record_id: number }>(
      `SELECT record_id FROM messages_tutor WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );
    await query(`DELETE FROM messages_tutor WHERE (academy_id = $1 OR $1 = 0)`, [academyId]);
    return NextResponse.json({ deleted: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 });
  }
}
