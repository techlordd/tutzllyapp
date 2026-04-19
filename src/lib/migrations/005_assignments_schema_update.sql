-- Migration: Update tutor_course_assignments table schema
-- Run this script once against the live database.

-- Rename primary key
ALTER TABLE tutor_course_assignments RENAME COLUMN id TO record_id;

-- Rename timestamp columns
ALTER TABLE tutor_course_assignments RENAME COLUMN created_at TO timestamp;
ALTER TABLE tutor_course_assignments RENAME COLUMN updated_at TO last_updated;

-- Add new columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tutor_course_assignments' AND column_name='tutor_name') THEN
    ALTER TABLE tutor_course_assignments ADD COLUMN tutor_name VARCHAR(200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tutor_course_assignments' AND column_name='tutor_sex') THEN
    ALTER TABLE tutor_course_assignments ADD COLUMN tutor_sex VARCHAR(10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tutor_course_assignments' AND column_name='assigned_date') THEN
    ALTER TABLE tutor_course_assignments ADD COLUMN assigned_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tutor_course_assignments' AND column_name='status') THEN
    ALTER TABLE tutor_course_assignments ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tutor_course_assignments' AND column_name='notes') THEN
    ALTER TABLE tutor_course_assignments ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tutor_course_assignments' AND column_name='record_key') THEN
    ALTER TABLE tutor_course_assignments ADD COLUMN record_key VARCHAR(100);
  END IF;
END $$;
