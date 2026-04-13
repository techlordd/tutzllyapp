import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    let sql = `SELECT * FROM messages_admin WHERE entry_status != 'deleted'`;
    const params: string[] = [];
    if (userId) { params.push(userId); sql += ` AND user_id = $${params.length}`; }
    sql += ' ORDER BY created_at DESC';
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
      `INSERT INTO messages_admin (message_date, message_time, role, sender, user_role,
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
