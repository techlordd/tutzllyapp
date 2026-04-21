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
    // ── Migration: create classrooms table if it doesn't exist yet ──
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS classrooms (
          record_id SERIAL PRIMARY KEY,
          academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
          classroom_id TEXT UNIQUE,
          room_name TEXT,
          link TEXT,
          meeting_id TEXT,
          passcode TEXT,
          assigned_to TEXT,
          user_id TEXT,
          entry_status TEXT DEFAULT 'active',
          ip TEXT,
          record_key TEXT,
          created_by TEXT,
          updated_by TEXT,
          timestamp TIMESTAMP DEFAULT NOW(),
          last_updated TIMESTAMP DEFAULT NOW()
        )
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_classrooms_academy_id ON classrooms(academy_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_classrooms_classroom_id ON classrooms(classroom_id)`);
    } catch { /* ignore */ }

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
      `ALTER TABLE sessions ALTER COLUMN ssid TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN schedule_id TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN tutor_id TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN tutor_firstname TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN tutor_lastname TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN student_id TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN student_name TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN student_email TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN course_name TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN meeting_id TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN meeting_passcode TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN session_code_status TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN mothers_email TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN fathers_email TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_session_id1 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_schedule_id1 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_tutor_id1 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_tutor_firstname1 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_tutor_lastname1 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_student_name1 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_course1 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_session_code_status1 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_session_id2 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_schedule_id2 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_tutor_id2 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_tutor_firstname2 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_tutor_lastname2 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_student_name2 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_course2 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN missed_session_code_status2 TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN created_by TYPE TEXT`,
      `ALTER TABLE sessions ALTER COLUMN updated_by TYPE TEXT`,
    ];
    for (const sql of sessionAlterations) {
      try { await query(sql); } catch { /* column may not exist yet */ }
    }

    // Recreate sessions TEXT column indexes as HASH to avoid B-tree size limits
    try {
      await query(`DROP INDEX IF EXISTS idx_sessions_student_id`);
      await query(`CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON sessions USING HASH (student_id)`);
    } catch { /* ignore */ }
    try {
      await query(`DROP INDEX IF EXISTS idx_sessions_tutor_id`);
      await query(`CREATE INDEX IF NOT EXISTS idx_sessions_tutor_id ON sessions USING HASH (tutor_id)`);
    } catch { /* ignore */ }
    try {
      await query(`DROP INDEX IF EXISTS idx_sessions_ssid`);
      await query(`CREATE INDEX IF NOT EXISTS idx_sessions_ssid ON sessions USING HASH (ssid)`);
    } catch { /* ignore */ }
    // Drop unique constraint on ssid — sessions can have duplicate SSIDs (row count matters)
    try {
      await query(`
        DO $$ DECLARE r RECORD;
        BEGIN
          FOR r IN SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_name = 'sessions' AND constraint_type = 'UNIQUE'
              AND constraint_name ILIKE '%ssid%'
          LOOP
            EXECUTE 'ALTER TABLE sessions DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '"';
          END LOOP;
        END $$;
      `);
    } catch { /* ignore */ }

    // Widen class_activities VARCHAR columns → TEXT
    const activityAlterations: string[] = [
      `ALTER TABLE class_activities ALTER COLUMN ssid TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN tutor_id TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN tutor_firstname TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN tutor_lastname TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN student_id TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN student_name TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN course_name TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN session_code_status TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN mothers_email TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN fathers_email TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN activity TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN status_of_past_homework_review TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN did_student_complete_prev_homework TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN homework1 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN homework2 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN homework3 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN did_student_join_on_time TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN punctuality1 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN punctuality2 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN is_student_attentive TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN attentiveness1 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN attentiveness2 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN attentiveness3 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN student_engages_in_class TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN class_engagement1 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN class_engagement2 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN class_engagement3 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN helpful_link1 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN helpful_link2 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN helpful_link3 TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN created_by TYPE TEXT`,
      `ALTER TABLE class_activities ALTER COLUMN updated_by TYPE TEXT`,
    ];
    for (const sql of activityAlterations) {
      try { await query(sql); } catch { /* column may not exist yet */ }
    }

        // Widen grade_book VARCHAR columns → TEXT
    const gradeAlterations: string[] = [
      `ALTER TABLE grade_book ALTER COLUMN tutor_id TYPE TEXT`,
      `ALTER TABLE grade_book ALTER COLUMN tutor_name TYPE TEXT`,
      `ALTER TABLE grade_book ALTER COLUMN student_id TYPE TEXT`,
      `ALTER TABLE grade_book ALTER COLUMN student_name TYPE TEXT`,
      `ALTER TABLE grade_book ALTER COLUMN course_name TYPE TEXT`,
      `ALTER TABLE grade_book ALTER COLUMN month TYPE TEXT`,
      `ALTER TABLE grade_book ALTER COLUMN year TYPE TEXT`,
      `ALTER TABLE grade_book ALTER COLUMN grade_code_status TYPE TEXT`,
      `ALTER TABLE grade_book ALTER COLUMN created_by TYPE TEXT`,
      `ALTER TABLE grade_book ALTER COLUMN updated_by TYPE TEXT`,
    ];
    for (const sql of gradeAlterations) {
      try { await query(sql); } catch { /* column may not exist yet */ }
    }

        // Add academy_id to messages tables if missing (created before column was added)
    const messageTables = ['messages_admin', 'messages_parent', 'messages_student', 'messages_tutor'];
    for (const tbl of messageTables) {
      try {
        await query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE`);
      } catch { /* ignore */ }
    }

        // Widen messages table VARCHAR columns → TEXT
    const msgAlterations: string[] = [
      `ALTER TABLE messages_admin ALTER COLUMN role TYPE TEXT USING role::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN sender TYPE TEXT USING sender::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN sender_email TYPE TEXT USING sender_email::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN user_role TYPE TEXT USING user_role::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN user_role2 TYPE TEXT USING user_role2::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN message_to TYPE TEXT USING message_to::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN sender_admin TYPE TEXT USING sender_admin::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN sender_tutor_name TYPE TEXT USING sender_tutor_name::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN sender_tutor_id TYPE TEXT USING sender_tutor_id::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN reply_to_tutor TYPE TEXT USING reply_to_tutor::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN reply_to_tutor_id TYPE TEXT USING reply_to_tutor_id::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN reply_to_admin TYPE TEXT USING reply_to_admin::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN recipient_id TYPE TEXT USING recipient_id::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN recipient_name TYPE TEXT USING recipient_name::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN recipient_email TYPE TEXT USING recipient_email::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN cc TYPE TEXT USING cc::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN subject TYPE TEXT USING subject::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN file_upload TYPE TEXT USING file_upload::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN attach_file TYPE TEXT USING attach_file::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN tutor_name TYPE TEXT USING tutor_name::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN tutor_id TYPE TEXT USING tutor_id::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN student_name TYPE TEXT USING student_name::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN student_id TYPE TEXT USING student_id::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN parent_name TYPE TEXT USING parent_name::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN parent_id TYPE TEXT USING parent_id::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN recipient_admin TYPE TEXT USING recipient_admin::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN lookup_tutor_id TYPE TEXT USING lookup_tutor_id::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN lookup_student_id TYPE TEXT USING lookup_student_id::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN recipient_name_student TYPE TEXT USING recipient_name_student::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN recipient_id_student TYPE TEXT USING recipient_id_student::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN recipient_name_tutor TYPE TEXT USING recipient_name_tutor::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN recipient_id_tutor TYPE TEXT USING recipient_id_tutor::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN recipient_name_parent TYPE TEXT USING recipient_name_parent::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN recipient_id_parent TYPE TEXT USING recipient_id_parent::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN sender_student_name TYPE TEXT USING sender_student_name::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN sender_student_id TYPE TEXT USING sender_student_id::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN sender_parent_name TYPE TEXT USING sender_parent_name::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN sender_parent_id TYPE TEXT USING sender_parent_id::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN recipient_tutor_name TYPE TEXT USING recipient_tutor_name::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN recipient_tutor_id TYPE TEXT USING recipient_tutor_id::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT`,
      `ALTER TABLE messages_admin ALTER COLUMN updated_by TYPE TEXT USING updated_by::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN role TYPE TEXT USING role::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN sender TYPE TEXT USING sender::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN sender_email TYPE TEXT USING sender_email::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN user_role TYPE TEXT USING user_role::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN user_role2 TYPE TEXT USING user_role2::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN message_to TYPE TEXT USING message_to::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN sender_admin TYPE TEXT USING sender_admin::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN sender_tutor_name TYPE TEXT USING sender_tutor_name::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN sender_tutor_id TYPE TEXT USING sender_tutor_id::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN reply_to_tutor TYPE TEXT USING reply_to_tutor::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN reply_to_tutor_id TYPE TEXT USING reply_to_tutor_id::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN reply_to_admin TYPE TEXT USING reply_to_admin::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN recipient_id TYPE TEXT USING recipient_id::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN recipient_name TYPE TEXT USING recipient_name::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN recipient_email TYPE TEXT USING recipient_email::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN cc TYPE TEXT USING cc::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN subject TYPE TEXT USING subject::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN file_upload TYPE TEXT USING file_upload::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN attach_file TYPE TEXT USING attach_file::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN tutor_name TYPE TEXT USING tutor_name::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN tutor_id TYPE TEXT USING tutor_id::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN student_name TYPE TEXT USING student_name::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN student_id TYPE TEXT USING student_id::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN parent_name TYPE TEXT USING parent_name::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN parent_id TYPE TEXT USING parent_id::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN recipient_admin TYPE TEXT USING recipient_admin::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN lookup_tutor_id TYPE TEXT USING lookup_tutor_id::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN lookup_student_id TYPE TEXT USING lookup_student_id::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN recipient_name_student TYPE TEXT USING recipient_name_student::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN recipient_id_student TYPE TEXT USING recipient_id_student::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN recipient_name_tutor TYPE TEXT USING recipient_name_tutor::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN recipient_id_tutor TYPE TEXT USING recipient_id_tutor::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN recipient_name_parent TYPE TEXT USING recipient_name_parent::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN recipient_id_parent TYPE TEXT USING recipient_id_parent::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN sender_student_name TYPE TEXT USING sender_student_name::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN sender_student_id TYPE TEXT USING sender_student_id::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN sender_parent_name TYPE TEXT USING sender_parent_name::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN sender_parent_id TYPE TEXT USING sender_parent_id::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN recipient_tutor_name TYPE TEXT USING recipient_tutor_name::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN recipient_tutor_id TYPE TEXT USING recipient_tutor_id::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT`,
      `ALTER TABLE messages_parent ALTER COLUMN updated_by TYPE TEXT USING updated_by::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN role TYPE TEXT USING role::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN sender TYPE TEXT USING sender::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN sender_email TYPE TEXT USING sender_email::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN user_role TYPE TEXT USING user_role::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN user_role2 TYPE TEXT USING user_role2::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN message_to TYPE TEXT USING message_to::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN sender_admin TYPE TEXT USING sender_admin::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN sender_tutor_name TYPE TEXT USING sender_tutor_name::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN sender_tutor_id TYPE TEXT USING sender_tutor_id::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN reply_to_tutor TYPE TEXT USING reply_to_tutor::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN reply_to_tutor_id TYPE TEXT USING reply_to_tutor_id::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN reply_to_admin TYPE TEXT USING reply_to_admin::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN recipient_id TYPE TEXT USING recipient_id::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN recipient_name TYPE TEXT USING recipient_name::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN recipient_email TYPE TEXT USING recipient_email::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN cc TYPE TEXT USING cc::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN subject TYPE TEXT USING subject::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN file_upload TYPE TEXT USING file_upload::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN attach_file TYPE TEXT USING attach_file::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN tutor_name TYPE TEXT USING tutor_name::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN tutor_id TYPE TEXT USING tutor_id::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN student_name TYPE TEXT USING student_name::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN student_id TYPE TEXT USING student_id::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN parent_name TYPE TEXT USING parent_name::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN parent_id TYPE TEXT USING parent_id::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN recipient_admin TYPE TEXT USING recipient_admin::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN lookup_tutor_id TYPE TEXT USING lookup_tutor_id::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN lookup_student_id TYPE TEXT USING lookup_student_id::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN recipient_name_student TYPE TEXT USING recipient_name_student::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN recipient_id_student TYPE TEXT USING recipient_id_student::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN recipient_name_tutor TYPE TEXT USING recipient_name_tutor::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN recipient_id_tutor TYPE TEXT USING recipient_id_tutor::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN recipient_name_parent TYPE TEXT USING recipient_name_parent::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN recipient_id_parent TYPE TEXT USING recipient_id_parent::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN sender_student_name TYPE TEXT USING sender_student_name::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN sender_student_id TYPE TEXT USING sender_student_id::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN sender_parent_name TYPE TEXT USING sender_parent_name::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN sender_parent_id TYPE TEXT USING sender_parent_id::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN recipient_tutor_name TYPE TEXT USING recipient_tutor_name::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN recipient_tutor_id TYPE TEXT USING recipient_tutor_id::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT`,
      `ALTER TABLE messages_student ALTER COLUMN updated_by TYPE TEXT USING updated_by::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN role TYPE TEXT USING role::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN sender TYPE TEXT USING sender::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN sender_email TYPE TEXT USING sender_email::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN user_role TYPE TEXT USING user_role::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN user_role2 TYPE TEXT USING user_role2::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN message_to TYPE TEXT USING message_to::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN sender_admin TYPE TEXT USING sender_admin::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN sender_tutor_name TYPE TEXT USING sender_tutor_name::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN sender_tutor_id TYPE TEXT USING sender_tutor_id::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN reply_to_tutor TYPE TEXT USING reply_to_tutor::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN reply_to_tutor_id TYPE TEXT USING reply_to_tutor_id::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN reply_to_admin TYPE TEXT USING reply_to_admin::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN recipient_id TYPE TEXT USING recipient_id::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN recipient_name TYPE TEXT USING recipient_name::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN recipient_email TYPE TEXT USING recipient_email::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN cc TYPE TEXT USING cc::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN subject TYPE TEXT USING subject::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN file_upload TYPE TEXT USING file_upload::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN attach_file TYPE TEXT USING attach_file::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN tutor_name TYPE TEXT USING tutor_name::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN tutor_id TYPE TEXT USING tutor_id::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN student_name TYPE TEXT USING student_name::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN student_id TYPE TEXT USING student_id::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN parent_name TYPE TEXT USING parent_name::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN parent_id TYPE TEXT USING parent_id::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN recipient_admin TYPE TEXT USING recipient_admin::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN lookup_tutor_id TYPE TEXT USING lookup_tutor_id::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN lookup_student_id TYPE TEXT USING lookup_student_id::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN recipient_name_student TYPE TEXT USING recipient_name_student::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN recipient_id_student TYPE TEXT USING recipient_id_student::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN recipient_name_tutor TYPE TEXT USING recipient_name_tutor::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN recipient_id_tutor TYPE TEXT USING recipient_id_tutor::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN recipient_name_parent TYPE TEXT USING recipient_name_parent::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN recipient_id_parent TYPE TEXT USING recipient_id_parent::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN sender_student_name TYPE TEXT USING sender_student_name::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN sender_student_id TYPE TEXT USING sender_student_id::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN sender_parent_name TYPE TEXT USING sender_parent_name::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN sender_parent_id TYPE TEXT USING sender_parent_id::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN recipient_tutor_name TYPE TEXT USING recipient_tutor_name::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN recipient_tutor_id TYPE TEXT USING recipient_tutor_id::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT`,
      `ALTER TABLE messages_tutor ALTER COLUMN updated_by TYPE TEXT USING updated_by::TEXT`,
    ];
    for (const sql of msgAlterations) {
      try { await query(sql); } catch { /* column may not exist */ }
    }

    // ── Migration 012-015: Rename created_at→timestamp, updated_at→last_updated (idempotent) ──
    for (const tbl of ['messages_admin', 'messages_parent', 'messages_student', 'messages_tutor']) {
      await query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='${tbl}' AND column_name='created_at') THEN
            ALTER TABLE ${tbl} RENAME COLUMN created_at TO timestamp;
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='${tbl}' AND column_name='updated_at') THEN
            ALTER TABLE ${tbl} RENAME COLUMN updated_at TO last_updated;
          END IF;
        END $$;
      `);
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
        `INSERT INTO tutors (tutor_id, user_id, username, email, firstname, surname, full_name_first_name, full_name_last_name, entry_status)
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
         full_name_first_name, full_name_last_name, status, entry_status)
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
        `INSERT INTO parents (parent_id, user_id, username, email, full_name_first_name, full_name_last_name, entry_status)
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
