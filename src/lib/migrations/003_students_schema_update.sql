-- Migration: Update students table schema
-- Run this script once against the live database.

-- Rename primary key
ALTER TABLE students RENAME COLUMN id TO record_id;

-- Rename fullname columns
ALTER TABLE students RENAME COLUMN fullname_first TO full_name_first_name;
ALTER TABLE students RENAME COLUMN fullname_last  TO full_name_last_name;

-- Rename address columns
ALTER TABLE students RENAME COLUMN address_line1 TO address_line_1;
ALTER TABLE students RENAME COLUMN address_line2 TO address_line_2;
ALTER TABLE students RENAME COLUMN address_state TO address_state_province;
ALTER TABLE students RENAME COLUMN address_zip   TO address_zip_postal;

-- Rename timestamp columns
ALTER TABLE students RENAME COLUMN created_at TO timestamp;
ALTER TABLE students RENAME COLUMN updated_at TO last_updated;

-- Add new columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='user_role') THEN
    ALTER TABLE students ADD COLUMN user_role VARCHAR(20) DEFAULT 'student';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='password') THEN
    ALTER TABLE students ADD COLUMN password VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='address') THEN
    ALTER TABLE students ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='record_key') THEN
    ALTER TABLE students ADD COLUMN record_key VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='date') THEN
    ALTER TABLE students ADD COLUMN date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='time') THEN
    ALTER TABLE students ADD COLUMN time TIME;
  END IF;
END $$;
