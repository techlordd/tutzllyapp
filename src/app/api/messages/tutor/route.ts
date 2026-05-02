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

    const conds: string[] = [`entry_status != 'deleted'`, `(academy_id = $1 OR $1 = 0 OR academy_id IS NULL)`];
    const params: (string | number)[] = [academyId];
    if (userId)  { params.push(userId);  conds.push(`user_id = $${params.length}`); }
    if (tutorId) { params.push(tutorId); conds.push(`recipient_tutor_id = $${params.length}`); }
    if (recipientId) {
      // Pre-resolve all IDs that could identify this tutor: tutor_id (TUT-xxx) and
      // users.user_id string (USR-xxx). Avoids fragile FK JOIN through tutors.user_id
      // INTEGER column (often NULL for CSV-imported tutors).
      const resolvedRows = await query<{ id: string }>(
        `SELECT tutor_id AS id FROM tutors WHERE tutor_id = $1
         UNION
         SELECT t.tutor_id AS id FROM tutors t
           JOIN users u ON t.user_id = u.id
           WHERE u.user_id = $1
         UNION
         SELECT t.tutor_id AS id FROM tutors t
           JOIN users u ON t.email = u.email
           WHERE u.user_id = $1
         UNION
         SELECT $1::text AS id`,
        [recipientId]
      );
      const allIds = Array.from(new Set(resolvedRows.map(r => r.id).filter(Boolean)));
      if (allIds.length > 0) {
        const idxStart = params.length + 1;
        params.push(...allIds);
        const ph = allIds.map((_, i) => `$${idxStart + i}`).join(', ');
        conds.push(`recipient_tutor_id IN (${ph})`);
      }
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

    let senderStudentId: string | null = null;
    let senderParentId: string | null = null;
    if (d.user_id) {
      const numericUserId = Number(d.user_id);
      if (d.role === 'student') {
        const row = await queryOne<{ student_id: string }>('SELECT student_id FROM students WHERE user_id = $1', [numericUserId]);
        senderStudentId = row?.student_id ? String(row.student_id) : null;
      } else if (d.role === 'parent') {
        const row = await queryOne<{ parent_id: string }>('SELECT parent_id FROM parents WHERE user_id = $1', [numericUserId]);
        senderParentId = row?.parent_id ? String(row.parent_id) : null;
      }
    }

    let recipientTutorId: string | null = d.recipient_tutor_id || null;
    // Always prefer users.user_id string (e.g. 'USR-xxx') as recipient_tutor_id when
    // recipient_sender_user_id (numeric users.id) is available. This allows the tutor
    // inbox GET to match directly without relying on the fragile tutors.user_id FK.
    if (d.recipient_sender_user_id) {
      const raw = String(d.recipient_sender_user_id).trim();
      const numericId = Number(raw);
      if (!isNaN(numericId) && numericId > 0) {
        const uRow = await queryOne<{ user_id: string }>('SELECT user_id FROM users WHERE id = $1', [numericId]);
        if (uRow?.user_id) {
          recipientTutorId = uRow.user_id;
        } else if (!recipientTutorId) {
          // Fallback: look up via tutors table FK
          const tRow = await queryOne<{ tutor_id: string }>('SELECT tutor_id FROM tutors WHERE user_id = $1', [numericId]);
          recipientTutorId = tRow?.tutor_id ? String(tRow.tutor_id) : null;
        }
      }
    }

    const message = await queryOne(
      `INSERT INTO messages_tutor (academy_id, message_date, message_time, role, sender, sender_admin,
       sender_student_name, sender_parent_name, sender_email, user_role,
       recipient_tutor_name, recipient_tutor_id, recipient_email, cc,
       subject, body, attach_file, status, entry_status,
       user_id, sender_student_id, sender_parent_id)
       VALUES ($1, NOW()::date, NOW()::time, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'unread', 'active',
       $16, $17, $18) RETURNING *`,
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
        recipientTutorId,
        d.recipient_email || null,
        d.cc || null,
        d.subject || null,
        d.body || null,
        d.attach_file || null,
        d.user_id || null,
        senderStudentId,
        senderParentId,
      ]
    );
    if (d.send_email && d.recipient_email && academyId) {
      sendEmail(academyId, d.recipient_email, d.subject,
        `<p>${(d.body || '').replace(/\n/g, '<br>')}</p>`
      ).catch(() => {});
    }
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('[messages/tutor POST]', error);
    return NextResponse.json({ error: 'Failed to send message', detail: String(error) }, { status: 500 });
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
