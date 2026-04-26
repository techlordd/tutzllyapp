import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';
import { sendEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId      = searchParams.get('user_id');
    const tutorId     = searchParams.get('tutor_id');
    const recipientId = searchParams.get('recipient_id');
    const status      = searchParams.get('status');
    const countOnly   = searchParams.get('count') === 'true';
    const academyId   = getAcademyId(request);

    const conds: string[] = [`entry_status != 'deleted'`, `(academy_id = $1 OR $1 = 0)`];
    const params: (string | number)[] = [academyId];
    if (userId)  { params.push(userId);  conds.push(`user_id = $${params.length}`); }
    if (tutorId) { params.push(tutorId); conds.push(`recipient_tutor_id = $${params.length}`); }
    if (recipientId) {
      params.push(recipientId);
      conds.push(`(recipient_tutor_id = $${params.length} OR recipient_tutor_id IN (
        SELECT t.tutor_id FROM tutors t JOIN users u ON t.user_id = u.id WHERE u.user_id = $${params.length}
      ))`);
    }
    if (status) { params.push(status); conds.push(`status = $${params.length}`); }
    const where = `WHERE ${conds.join(' AND ')}`;

    if (countOnly) {
      const row = await queryOne(`SELECT COUNT(*) AS count FROM messages_tutor ${where}`, params);
      return NextResponse.json({ count: Number(row?.count || 0) });
    }
    const messages = await query(`SELECT * FROM messages_tutor ${where} ORDER BY message_date DESC, message_time DESC, timestamp DESC`, params);
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
    if (d.send_email && d.recipient_email && academyId) {
      sendEmail(academyId, d.recipient_email, d.subject,
        `<p>${(d.body || '').replace(/\n/g, '<br>')}</p>`
      ).catch(() => {});
    }
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
