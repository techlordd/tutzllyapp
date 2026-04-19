-- Migration: Update tutors table schema
-- Run this script once against the live database.

-- Rename primary key column
ALTER TABLE tutors RENAME COLUMN id TO record_id;

-- Rename name columns
ALTER TABLE tutors RENAME COLUMN fullname_first TO full_name_first_name;
ALTER TABLE tutors RENAME COLUMN fullname_last  TO full_name_last_name;

-- Rename address columns
ALTER TABLE tutors RENAME COLUMN address_line1 TO address_line_1;
ALTER TABLE tutors RENAME COLUMN address_line2 TO address_line_2;
ALTER TABLE tutors RENAME COLUMN address_state TO address_state_province;
ALTER TABLE tutors RENAME COLUMN address_zip   TO address_zip_postal;

-- Rename timestamp columns
ALTER TABLE tutors RENAME COLUMN created_at TO timestamp;
ALTER TABLE tutors RENAME COLUMN updated_at TO last_updated;

-- Add new columns (safe — only added if they don't already exist via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tutors' AND column_name='user_role') THEN
    ALTER TABLE tutors ADD COLUMN user_role VARCHAR(20) DEFAULT 'tutor';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tutors' AND column_name='password') THEN
    ALTER TABLE tutors ADD COLUMN password VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tutors' AND column_name='address') THEN
    ALTER TABLE tutors ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tutors' AND column_name='record_key') THEN
    ALTER TABLE tutors ADD COLUMN record_key VARCHAR(100);
  END IF;
END $$;
