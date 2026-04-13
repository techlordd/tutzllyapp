import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// Only callable in development. On Vercel production use your DB provider's
// SQL console to run src/lib/schema.sql directly.
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Setup endpoint is disabled in production. Run schema.sql manually via your database provider.' }, { status: 403 });
  }

  try {
    const schemaPath = join(process.cwd(), 'src', 'lib', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    await query(schema);

    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Tutzlly1!';
    const demoPassword = 'Tutzlly@123';
    const adminHash = await hashPassword(adminPassword);
    const demoHash = await hashPassword(demoPassword);

    // ── Admin ────────────────────────────────────────────────────────────────
    await query(
      `INSERT INTO users (user_id, username, email, password_hash, role, is_active, created_at)
       VALUES ('ADM-001', 'admin', 'admin@tutzllyacademy.com', $1, 'admin', true, NOW())
       ON CONFLICT (email) DO NOTHING`,
      [adminHash]
    );

    // ── Demo Tutor ───────────────────────────────────────────────────────────
    const tutorRows = await query<{ id: number }>(
      `INSERT INTO users (user_id, username, email, password_hash, role, is_active)
       VALUES ('USR-DEMO-TUT', 'demo_tutor', 'demo.tutor@tutzllyacademy.com', $1, 'tutor', true)
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW() RETURNING id`,
      [demoHash]
    );
    if (tutorRows[0]) {
      await query(
        `INSERT INTO tutors (tutor_id, user_id, username, email, firstname, surname, fullname_first, fullname_last, entry_status)
         VALUES ('TUT-DEMO-001', $1, 'demo_tutor', 'demo.tutor@tutzllyacademy.com', 'Demo', 'Tutor', 'Demo', 'Tutor', 'active')
         ON CONFLICT (tutor_id) DO NOTHING`,
        [tutorRows[0].id]
      );
    }

    // ── Demo Student ─────────────────────────────────────────────────────────
    const studentRows = await query<{ id: number }>(
      `INSERT INTO users (user_id, username, email, password_hash, role, is_active)
       VALUES ('USR-DEMO-STU', 'demo_student', 'demo.student@tutzllyacademy.com', $1, 'student', true)
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW() RETURNING id`,
      [demoHash]
    );
    if (studentRows[0]) {
      await query(
        `INSERT INTO students (student_id, enrollment_id, user_id, username, email, firstname, surname,
         fullname_first, fullname_last, status, entry_status)
         VALUES ('STU-DEMO-001', 'ENR-DEMO-001', $1, 'demo_student', 'demo.student@tutzllyacademy.com',
         'Demo', 'Student', 'Demo', 'Student', 'active', 'active')
         ON CONFLICT (student_id) DO NOTHING`,
        [studentRows[0].id]
      );
    }

    // ── Demo Parent ──────────────────────────────────────────────────────────
    const parentRows = await query<{ id: number }>(
      `INSERT INTO users (user_id, username, email, password_hash, role, is_active)
       VALUES ('USR-DEMO-PAR', 'demo_parent', 'demo.parent@tutzllyacademy.com', $1, 'parent', true)
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW() RETURNING id`,
      [demoHash]
    );
    if (parentRows[0]) {
      await query(
        `INSERT INTO parents (parent_id, user_id, username, email, fullname_first, fullname_last, entry_status)
         VALUES ('PAR-DEMO-001', $1, 'demo_parent', 'demo.parent@tutzllyacademy.com', 'Demo', 'Parent', 'active')
         ON CONFLICT (parent_id) DO NOTHING`,
        [parentRows[0].id]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized with demo accounts',
      accounts: {
        admin:   { email: 'admin@tutzllyacademy.com',          password: adminPassword },
        tutor:   { email: 'demo.tutor@tutzllyacademy.com',   password: demoPassword },
        student: { email: 'demo.student@tutzllyacademy.com', password: demoPassword },
        parent:  { email: 'demo.parent@tutzllyacademy.com',  password: demoPassword },
      },
    });
  } catch (err) {
    console.error('DB init error:', err);
    return NextResponse.json({ error: 'Failed to initialize database', details: String(err) }, { status: 500 });
  }
}
