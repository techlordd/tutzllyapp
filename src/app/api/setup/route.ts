import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// Protected by SETUP_SECRET env var.
// In production: set SETUP_SECRET in Vercel env vars, call this endpoint once
// with the header `x-setup-secret: <your-secret>`, then delete the env var.
export async function POST(request: Request) {
  const setupSecret = process.env.SETUP_SECRET;

  if (!setupSecret) {
    return NextResponse.json({ error: 'Setup is disabled. Set SETUP_SECRET env var to enable.' }, { status: 403 });
  }

  const incomingSecret = request.headers.get('x-setup-secret');
  if (incomingSecret !== setupSecret) {
    return NextResponse.json({ error: 'Invalid or missing x-setup-secret header.' }, { status: 401 });
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

    // ── Default Academy ──────────────────────────────────────────────────────
    await query(
      `INSERT INTO academies (academy_id, academy_name, academy_email, is_active)
       VALUES ('ACM-DEFAULT', 'Default Academy', 'admin@tutzllyacademy.com', true)
       ON CONFLICT (academy_id) DO NOTHING`
    );
    const academyRows = await query<{ id: number }>(
      `SELECT id FROM academies WHERE academy_id = 'ACM-DEFAULT' LIMIT 1`
    );
    const defaultAcademyId = academyRows[0]?.id;

    if (defaultAcademyId) {
      // Backfill entity rows with academy_id
      for (const table of ['tutors', 'students', 'parents', 'courses', 'tutor_course_assignments',
                            'student_enrollments', 'schedules', 'sessions', 'class_activities', 'grade_book']) {
        await query(
          `UPDATE ${table} SET academy_id = $1 WHERE academy_id IS NULL`,
          [defaultAcademyId]
        );
      }

      // Register all 4 demo users in user_academy_roles
      const adminRows = await query<{ id: number }>(
        `SELECT id FROM users WHERE email = 'admin@tutzllyacademy.com' LIMIT 1`
      );
      if (adminRows[0]) {
        await query(
          `INSERT INTO user_academy_roles (user_id, academy_id, role)
           VALUES ($1, $2, 'admin') ON CONFLICT DO NOTHING`,
          [adminRows[0].id, defaultAcademyId]
        );
        // Mark admin as super admin
        await query(
          `INSERT INTO super_admins (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
          [adminRows[0].id]
        );
      }
      if (tutorRows[0]) {
        await query(
          `INSERT INTO user_academy_roles (user_id, academy_id, role)
           VALUES ($1, $2, 'tutor') ON CONFLICT DO NOTHING`,
          [tutorRows[0].id, defaultAcademyId]
        );
      }
      if (studentRows[0]) {
        await query(
          `INSERT INTO user_academy_roles (user_id, academy_id, role)
           VALUES ($1, $2, 'student') ON CONFLICT DO NOTHING`,
          [studentRows[0].id, defaultAcademyId]
        );
      }
      if (parentRows[0]) {
        await query(
          `INSERT INTO user_academy_roles (user_id, academy_id, role)
           VALUES ($1, $2, 'parent') ON CONFLICT DO NOTHING`,
          [parentRows[0].id, defaultAcademyId]
        );
      }
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
