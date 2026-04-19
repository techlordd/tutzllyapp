-- Migration: Update sessions table schema
-- Run this script once against the live database.

-- Rename primary key
ALTER TABLE sessions RENAME COLUMN id TO record_id;

-- Rename timestamp columns
ALTER TABLE sessions RENAME COLUMN created_at TO timestamp;
ALTER TABLE sessions RENAME COLUMN updated_at TO last_updated;

-- Change missed_course_id columns from INTEGER to TEXT
ALTER TABLE sessions ALTER COLUMN missed_course_id1 TYPE TEXT USING missed_course_id1::TEXT;
ALTER TABLE sessions ALTER COLUMN missed_course_id2 TYPE TEXT USING missed_course_id2::TEXT;

-- Add new columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='email_lookup_student_id') THEN
    ALTER TABLE sessions ADD COLUMN email_lookup_student_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='confirmation') THEN
    ALTER TABLE sessions ADD COLUMN confirmation TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='course_id_ref') THEN
    ALTER TABLE sessions ADD COLUMN course_id_ref TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='start_session_confirmation') THEN
    ALTER TABLE sessions ADD COLUMN start_session_confirmation TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='end_session_confirmation') THEN
    ALTER TABLE sessions ADD COLUMN end_session_confirmation TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='record_key') THEN
    ALTER TABLE sessions ADD COLUMN record_key TEXT;
  END IF;
END $$;
