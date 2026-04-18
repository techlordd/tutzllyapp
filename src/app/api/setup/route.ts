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
    // ── Pre-migration: add academy_id to existing tables before running schema ──
    // (schema.sql tries to CREATE INDEXes on academy_id; those fail if the column
    //  doesn't exist on tables that were created by an older schema version.
    //  Using plain INTEGER avoids a dependency on the academies table existing yet.)
    for (const table of ['tutors', 'students', 'parents', 'courses', 'tutor_course_assignments',
                          'student_enrollments', 'schedules', 'sessions', 'class_activities', 'grade_book']) {
      try {
        await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS academy_id INTEGER`);
      } catch { /* table doesn't exist yet — schema.sql will create it with the column */ }
    }

    // Add branding + domain routing columns (all idempotent for existing DBs)
    try {
      await query(`ALTER TABLE academies ADD COLUMN IF NOT EXISTS login_bg_url TEXT`);
      await query(`ALTER TABLE academies ADD COLUMN IF NOT EXISTS login_tagline VARCHAR(255)`);
      await query(`ALTER TABLE academies ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100)`);
      await query(`CREATE UNIQUE INDEX IF NOT EXISTS academies_subdomain_key ON academies (subdomain) WHERE subdomain IS NOT NULL`);
      await query(`ALTER TABLE academies ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255)`);
      await query(`CREATE UNIQUE INDEX IF NOT EXISTS academies_custom_domain_key ON academies (custom_domain) WHERE custom_domain IS NOT NULL`);
    } catch { /* academies table doesn't exist yet — schema.sql will create it */ }

    // Widen zoom_link to TEXT and session_duration to NUMERIC(5,2) for existing DBs
    try {
      await query(`ALTER TABLE schedules ALTER COLUMN zoom_link TYPE TEXT`);
    } catch { /* column doesn't exist yet */ }
    try {
      await query(`ALTER TABLE sessions ALTER COLUMN zoom_link TYPE TEXT`);
    } catch { /* column doesn't exist yet */ }
    try {
      await query(`ALTER TABLE sessions ALTER COLUMN session_duration TYPE NUMERIC(5,2)`);
    } catch { /* column doesn't exist yet */ }

    // Widen sessions VARCHAR columns that were too narrow for real data
    const sessionAlterations: string[] = [
      `ALTER TABLE sessions ALTER COLUMN ssid TYPE VARCHAR(100)`,
      `ALTER TABLE sessions ALTER COLUMN schedule_id TYPE VARCHAR(100)`,
      `ALTER TABLE sessions ALTER COLUMN tutor_id TYPE VARCHAR(100)`,
      `ALTER TABLE sessions ALTER COLUMN tutor_firstname TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN tutor_lastname TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN student_id TYPE VARCHAR(100)`,
      `ALTER TABLE sessions ALTER COLUMN student_name TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN student_email TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN course_name TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN meeting_id TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN meeting_passcode TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN session_code_status TYPE VARCHAR(100)`,
      `ALTER TABLE sessions ALTER COLUMN mothers_email TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN fathers_email TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_session_id1 TYPE VARCHAR(100)`,
      `ALTER TABLE sessions ALTER COLUMN missed_schedule_id1 TYPE VARCHAR(100)`,
      `ALTER TABLE sessions ALTER COLUMN missed_tutor_id1 TYPE VARCHAR(100)`,
      `ALTER TABLE sessions ALTER COLUMN missed_tutor_firstname1 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_tutor_lastname1 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_student_name1 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_course1 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_session_code_status1 TYPE VARCHAR(100)`,
      `ALTER TABLE sessions ALTER COLUMN missed_session_id2 TYPE VARCHAR(100)`,
      `ALTER TABLE sessions ALTER COLUMN missed_schedule_id2 TYPE VARCHAR(100)`,
      `ALTER TABLE sessions ALTER COLUMN missed_tutor_id2 TYPE VARCHAR(100)`,
      `ALTER TABLE sessions ALTER COLUMN missed_tutor_firstname2 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_tutor_lastname2 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_student_name2 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_course2 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_session_code_status2 TYPE VARCHAR(100)`,
      `ALTER TABLE sessions ALTER COLUMN created_by TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN updated_by TYPE TEXT`,
    ];
    for (const sql of sessionAlterations) {
      try { await query(sql); } catch { /* column may not exist yet */ }
    }

    const schemaPath = join(process.cwd(), 'src', 'lib', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    await query(schema);

    // ── Migration: add super_admin to users role constraint (idempotent) ─────
    await query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('admin', 'tutor', 'student', 'parent', 'super_admin'));
    `);

    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Tutzlly1!';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Tutzlly@SuperAdmin1!';
    const demoPassword = 'Tutzlly@123';
    const adminHash = await hashPassword(adminPassword);
    const superAdminHash = await hashPassword(superAdminPassword);
    const demoHash = await hashPassword(demoPassword);

    // ── Tutzlly Platform Super Admin ─────────────────────────────────────────
    // This account belongs to Tutzlly company — platform-level, no academy membership.
    const superAdminRows = await query<{ id: number }>(
      `INSERT INTO users (user_id, username, email, password_hash, role, is_active, created_at)
       VALUES ('SUP-001', 'superadmin', 'superadmin@tutzlly.com', $1, 'super_admin', true, NOW())
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW() RETURNING id`,
      [superAdminHash]
    );
    if (superAdminRows[0]) {
      await query(
        `INSERT INTO super_admins (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [superAdminRows[0].id]
      );
    }

    // ── Admin (Default Academy admin — NOT a super admin) ────────────────────
    await query(
      `INSERT INTO users (user_id, username, email, password_hash, role, is_active, created_at)
       VALUES ('ADM-001', 'admin', 'admin@tutzllyacademy.com', $1, 'admin', true, NOW())
       ON CONFLICT (email) DO NOTHING`,
      [adminHash]
    );
    // Ensure admin is NOT in super_admins (clean separation)
    const adminUserRow = await query<{ id: number }>(
      `SELECT id FROM users WHERE email = 'admin@tutzllyacademy.com' LIMIT 1`
    );
    if (adminUserRow[0]) {
      await query(`DELETE FROM super_admins WHERE user_id = $1`, [adminUserRow[0].id]);
    }

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
        // Admin is a plain academy admin — NOT a super admin
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
        super_admin: { email: 'superadmin@tutzlly.com',             password: superAdminPassword, note: 'Tutzlly platform super admin' },
        admin:       { email: 'admin@tutzllyacademy.com',            password: adminPassword,      note: 'Default Academy admin' },
        tutor:       { email: 'demo.tutor@tutzllyacademy.com',     password: demoPassword },
        student:     { email: 'demo.student@tutzllyacademy.com',   password: demoPassword },
        parent:      { email: 'demo.parent@tutzllyacademy.com',    password: demoPassword },
      },
    });
  } catch (err) {
    console.error('DB init error:', err);
    return NextResponse.json({ error: 'Failed to initialize database', details: String(err) }, { status: 500 });
  }
}
