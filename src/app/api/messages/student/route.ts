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
      // Pre-resolve all IDs that could identify this student so we can do a simple IN match.
      // This avoids a fragile subquery-level JOIN and handles: user_id string (USR-xxx),
      // student_id string (STU-xxx), and historic records that stored either format.
      const resolvedRows = await query<{ id: string }>(
        `SELECT student_id AS id FROM students WHERE student_id = $1
         UNION
         SELECT st.student_id AS id FROM students st
           JOIN users u ON st.user_id = u.id
           WHERE u.user_id = $1
         UNION
         SELECT s.student_id AS id FROM students s
           JOIN users u ON s.email = u.email
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
        conds.push(`recipient_id_student IN (${ph})`);
      }
    }
    if (status) { params.push(status); conds.push(`status = $${params.length}`); }
    const where = `WHERE ${conds.join(' AND ')}`;

    if (countOnly) {
      const row = await queryOne(`SELECT COUNT(*) AS count FROM messages_student ${where}`, params);
      return NextResponse.json({ count: Number(row?.count || 0) });
    }
    const messages = await query(`SELECT * FROM messages_student ${where} ORDER BY message_date DESC, message_time DESC, timestamp DESC`, params);
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

    // Resolve tutor_id from user_id when a tutor sends a message, so student replies can find the tutor
    let resolvedTutorId: string | null = d.tutor_id || null;
    if (!resolvedTutorId && d.role === 'tutor' && d.user_id) {
      const numericUserId = Number(String(d.user_id).trim());
      if (!isNaN(numericUserId) && numericUserId > 0) {
        const tRow = await queryOne<{ tutor_id: string }>('SELECT tutor_id FROM tutors WHERE user_id = $1', [numericUserId]);
        resolvedTutorId = tRow?.tutor_id ? String(tRow.tutor_id) : null;
      }
    }

    // Resolve recipient_id_student to the student's users.user_id string (e.g. 'USR-xxx') when
    // recipient_sender_user_id (their numeric users.id) is available. This allows the student
    // inbox GET to use a direct match (recipient_id_student = 'USR-xxx') without relying on the
    // fragile JOIN through students.user_id INTEGER FK (which can be NULL for imported students).
    let resolvedRecipientStudentId: string | null = d.recipient_id_student || null;
    if (d.recipient_sender_user_id) {
      const raw = String(d.recipient_sender_user_id).trim();
      const numericRecipientId = Number(raw);
      if (!isNaN(numericRecipientId) && numericRecipientId > 0) {
        // New-style: numeric users.id → resolve to user_id string
        const uRow = await queryOne<{ user_id: string }>('SELECT user_id FROM users WHERE id = $1', [numericRecipientId]);
        if (uRow?.user_id) {
          resolvedRecipientStudentId = uRow.user_id;
        } else if (!resolvedRecipientStudentId) {
          const sRow = await queryOne<{ student_id: string }>('SELECT student_id FROM students WHERE user_id = $1', [numericRecipientId]);
          resolvedRecipientStudentId = sRow?.student_id ? String(sRow.student_id) : null;
        }
      } else if (raw) {
        // Legacy: WordPress username → resolve to users.user_id string
        const uRow = await queryOne<{ user_id: string }>(
          'SELECT user_id FROM users WHERE username = $1 OR user_id = $1',
          [raw]
        );
        if (uRow?.user_id) resolvedRecipientStudentId = uRow.user_id;
      }
    }

    const message = await queryOne(
      `INSERT INTO messages_student (academy_id, message_date, message_time, role, sender, sender_email, user_role,
       message_to, tutor_name, tutor_id, student_name, student_id,
       recipient_name_student, recipient_id_student, recipient_email,
       recipient_name_tutor, recipient_id_tutor, recipient_name_parent, recipient_id_parent,
       recipient_admin, cc, subject, body, attach_file, status, user_id, entry_status)
       VALUES ($1, NOW()::date, NOW()::time, $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'unread',$23,'active') RETURNING *`,
      [academyId || null,
       d.role, d.sender, d.sender_email, d.user_role, d.message_to,
       d.tutor_name, resolvedTutorId, d.student_name, d.student_id,
       d.recipient_name_student, resolvedRecipientStudentId, d.recipient_email,
       d.recipient_name_tutor, d.recipient_id_tutor, d.recipient_name_parent, d.recipient_id_parent,
       d.recipient_admin, d.cc, d.subject, d.body, d.attach_file, d.user_id]
    );
    if (d.send_email && d.recipient_email && academyId) {
      sendEmail(academyId, d.recipient_email, d.subject,
        `<p>${(d.body || '').replace(/\n/g, '<br>')}</p>`
      ).catch(() => {});
    }
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('[messages/student POST]', error);
    return NextResponse.json({ error: 'Failed to send message', detail: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    const rows = await query<{ record_id: number }>(
      `SELECT record_id FROM messages_student WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );
    await query(`DELETE FROM messages_student WHERE (academy_id = $1 OR $1 = 0)`, [academyId]);
    return NextResponse.json({ deleted: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 });
  }
}
