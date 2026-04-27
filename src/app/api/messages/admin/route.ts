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

    let resolvedStudentId: string | null = d.student_id || null;
    let resolvedParentId: string | null = d.parent_id || null;
    let resolvedTutorId: string | null = d.tutor_id || null;
    if (d.user_id && !resolvedStudentId && !resolvedParentId && !resolvedTutorId) {
      const numericUserId = Number(d.user_id);
      if (d.role === 'student') {
        const row = await queryOne<{ student_id: string }>('SELECT student_id FROM students WHERE user_id = $1', [numericUserId]);
        resolvedStudentId = row?.student_id ? String(row.student_id) : null;
      } else if (d.role === 'parent') {
        const row = await queryOne<{ parent_id: string }>('SELECT parent_id FROM parents WHERE user_id = $1', [numericUserId]);
        resolvedParentId = row?.parent_id ? String(row.parent_id) : null;
      } else if (d.role === 'tutor') {
        const row = await queryOne<{ tutor_id: string }>('SELECT tutor_id FROM tutors WHERE user_id = $1', [numericUserId]);
        resolvedTutorId = row?.tutor_id ? String(row.tutor_id) : null;
      }
    }

    const message = await queryOne(
      `INSERT INTO messages_admin (academy_id, message_date, message_time, role, sender, user_role, user_role2,
       tutor_name, tutor_id, student_name, student_id, parent_name, parent_id,
       recipient_admin, cc, subject, body, file_upload, status, user_id, entry_status)
       VALUES ($1, NOW()::date, NOW()::time, $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'unread',$17,'active') RETURNING *`,
      [academyId || null,
       d.role, d.sender, d.user_role, d.user_role2,
       d.tutor_name || null, resolvedTutorId, d.student_name || null, resolvedStudentId,
       d.parent_name || null, resolvedParentId,
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
