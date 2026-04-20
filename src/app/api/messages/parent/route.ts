import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const academyId = getAcademyId(request);
    let sql = `SELECT * FROM messages_parent WHERE entry_status != 'deleted' AND (academy_id = $1 OR $1 = 0)`;
    const params: (string | number)[] = [academyId];
    if (userId) { params.push(userId); sql += ` AND user_id = $${params.length}`; }
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
    const message = await queryOne(
      `INSERT INTO messages_parent (message_date, message_time, role, sender, sender_email, user_role,
       sender_admin, sender_tutor_name, sender_tutor_id,
       reply_to_tutor, reply_to_tutor_id, reply_to_admin,
       recipient_id, recipient_name, recipient_email, cc,
       subject, body, attach_file, status, user_id, entry_status)
       VALUES (NOW()::date, NOW()::time, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'unread',$18,'active') RETURNING *`,
      [d.role, d.sender, d.sender_email, d.user_role,
       d.sender_admin, d.sender_tutor_name, d.sender_tutor_id,
       d.reply_to_tutor, d.reply_to_tutor_id, d.reply_to_admin,
       d.recipient_id, d.recipient_name, d.recipient_email, d.cc,
       d.subject, d.body, d.attach_file, d.user_id]
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
