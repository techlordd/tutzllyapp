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
    sql += ' ORDER BY message_date DESC, message_time DESC, created_at DESC';
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
      `INSERT INTO messages_tutor (message_date, message_time, role, sender, user_role,
       subject, body, attach_file, status, user_id, entry_status)
       VALUES (NOW()::date, NOW()::time, $1, $2, $3, $4, $5, $6, 'unread', $7, 'active') RETURNING *`,
      [d.role, d.sender, d.user_role, d.subject, d.body, d.attach_file, d.user_id]
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
    const result = await query<{ count: string }>(
      `WITH deleted AS (
        DELETE FROM messages_tutor WHERE academy_id = \$1 OR \$1 = 0 RETURNING id
      ) SELECT COUNT(*) AS count FROM deleted`,
      [academyId]
    );
    const deleted = parseInt(result[0]?.count ?? '0', 10);
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 });
  }
}
