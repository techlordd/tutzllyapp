-- Migration: Make course_code unique per-academy instead of globally
-- Allows different academies to share the same course codes (e.g. MATH101)

DO $$
BEGIN
  -- Drop the global unique constraint on course_code
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'courses' AND constraint_name = 'courses_course_code_key'
  ) THEN
    ALTER TABLE courses DROP CONSTRAINT courses_course_code_key;
  END IF;

  -- Add composite unique: course_code is unique within an academy
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'courses' AND constraint_name = 'courses_course_code_academy_id_key'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT courses_course_code_academy_id_key UNIQUE (course_code, academy_id);
  END IF;
END $$;
