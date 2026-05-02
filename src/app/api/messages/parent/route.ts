import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';
import { sendEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId      = searchParams.get('user_id');
    const recipientId = searchParams.get('recipient_id');
    const status      = searchParams.get('status');
    const countOnly   = searchParams.get('count') === 'true';
    const academyId   = getAcademyId(request);

    const conds: string[] = [`entry_status != 'deleted'`, `(academy_id = $1 OR $1 = 0 OR academy_id IS NULL)`];
    const params: (string | number)[] = [academyId];
    if (userId) { params.push(userId); conds.push(`user_id = $${params.length}`); }
    if (recipientId) {
      params.push(recipientId);
      conds.push(`(recipient_id = $${params.length} OR recipient_id IN (
        SELECT p.parent_id FROM parents p JOIN users u ON p.user_id = u.id WHERE u.user_id = $${params.length}
      ))`);
    }
    if (status) { params.push(status); conds.push(`status = $${params.length}`); }
    const where = `WHERE ${conds.join(' AND ')}`;

    if (countOnly) {
      const row = await queryOne(`SELECT COUNT(*) AS count FROM messages_parent ${where}`, params);
      return NextResponse.json({ count: Number(row?.count || 0) });
    }
    const messages = await query(`SELECT * FROM messages_parent ${where} ORDER BY message_date DESC, message_time DESC, timestamp DESC`, params);
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
    const message = await queryOne(
      `INSERT INTO messages_parent (academy_id, message_date, message_time, role, sender, sender_email, user_role,
       sender_admin, sender_tutor_name, sender_tutor_id,
       reply_to_tutor, reply_to_tutor_id, reply_to_admin,
       recipient_id, recipient_name, recipient_email, cc,
       subject, body, attach_file, status, user_id, entry_status)
       VALUES ($1, NOW()::date, NOW()::time, $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'unread',$19,'active') RETURNING *`,
      [academyId || null,
       d.role, d.sender, d.sender_email, d.user_role,
       d.sender_admin, d.sender_tutor_name, d.sender_tutor_id,
       d.reply_to_tutor, d.reply_to_tutor_id, d.reply_to_admin,
       d.recipient_id, d.recipient_name, d.recipient_email, d.cc,
       d.subject, d.body, d.attach_file, d.user_id]
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
      `SELECT record_id FROM messages_parent WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );
    await query(`DELETE FROM messages_parent WHERE (academy_id = $1 OR $1 = 0)`, [academyId]);
    return NextResponse.json({ deleted: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 });
  }
}
