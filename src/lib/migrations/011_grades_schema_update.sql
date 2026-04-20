-- Migration: Update grade_book table schema

-- Rename primary key
ALTER TABLE grade_book RENAME COLUMN id TO record_id;

-- Rename timestamp columns
ALTER TABLE grade_book RENAME COLUMN created_at TO timestamp;
ALTER TABLE grade_book RENAME COLUMN updated_at TO last_updated;

-- Drop course_id FK and convert to text
ALTER TABLE grade_book DROP CONSTRAINT IF EXISTS grade_book_course_id_fkey;
ALTER TABLE grade_book RENAME COLUMN course_id TO course_id_ref;
ALTER TABLE grade_book ALTER COLUMN course_id_ref TYPE TEXT USING course_id_ref::TEXT;

-- Drop user_id FK and convert to text
ALTER TABLE grade_book DROP CONSTRAINT IF EXISTS grade_book_user_id_fkey;
ALTER TABLE grade_book ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Add record_key column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grade_book' AND column_name='record_key') THEN
    ALTER TABLE grade_book ADD COLUMN record_key TEXT;
  END IF;
END $$;
