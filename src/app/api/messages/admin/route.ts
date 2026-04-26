import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';
import { sendEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId    = searchParams.get('user_id');
    const status    = searchParams.get('status');
    const countOnly = searchParams.get('count') === 'true';
    const academyId = getAcademyId(request);

    const conds: string[] = [`entry_status != 'deleted'`, `(academy_id = $1 OR $1 = 0)`];
    const params: (string | number)[] = [academyId];
    if (userId) { params.push(userId); conds.push(`user_id = $${params.length}`); }
    if (status) { params.push(status); conds.push(`status = $${params.length}`); }
    const where = `WHERE ${conds.join(' AND ')}`;

    if (countOnly) {
      const row = await queryOne(`SELECT COUNT(*) AS count FROM messages_admin ${where}`, params);
      return NextResponse.json({ count: Number(row?.count || 0) });
    }
    const messages = await query(`SELECT * FROM messages_admin ${where} ORDER BY message_date DESC, message_time DESC, timestamp DESC`, params);
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
      `INSERT INTO messages_admin (message_date, message_time, role, sender, user_role, user_role2,
       tutor_name, tutor_id, student_name, student_id, parent_name, parent_id,
       recipient_admin, cc, subject, body, file_upload, status, user_id, entry_status)
       VALUES (NOW()::date, NOW()::time, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'unread',$16,'active') RETURNING *`,
      [d.role, d.sender, d.user_role, d.user_role2,
       d.tutor_name, d.tutor_id, d.student_name, d.student_id, d.parent_name, d.parent_id,
       d.recipient_admin, d.cc, d.subject, d.body, d.file_upload, d.user_id]
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
      `SELECT record_id FROM messages_admin WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );
    await query(`DELETE FROM messages_admin WHERE (academy_id = $1 OR $1 = 0)`, [academyId]);
    return NextResponse.json({ deleted: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 });
  }
}
