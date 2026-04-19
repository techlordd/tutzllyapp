-- Migration: Update student_enrollments table schema
-- Run this script once against the live database.

-- Rename primary key
ALTER TABLE student_enrollments RENAME COLUMN id TO record_id;

-- Rename timestamp columns
ALTER TABLE student_enrollments RENAME COLUMN created_at TO timestamp;
ALTER TABLE student_enrollments RENAME COLUMN updated_at TO last_updated;

-- Add new columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_enrollments' AND column_name='course_name_deprecated') THEN
    ALTER TABLE student_enrollments ADD COLUMN course_name_deprecated VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_enrollments' AND column_name='course_name_2') THEN
    ALTER TABLE student_enrollments ADD COLUMN course_name_2 VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_enrollments' AND column_name='course_code_2') THEN
    ALTER TABLE student_enrollments ADD COLUMN course_code_2 VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_enrollments' AND column_name='course_id_ref_2') THEN
    ALTER TABLE student_enrollments ADD COLUMN course_id_ref_2 VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_enrollments' AND column_name='course_name_deprecated_2') THEN
    ALTER TABLE student_enrollments ADD COLUMN course_name_deprecated_2 VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_enrollments' AND column_name='record_key') THEN
    ALTER TABLE student_enrollments ADD COLUMN record_key VARCHAR(100);
  END IF;
END $$;
