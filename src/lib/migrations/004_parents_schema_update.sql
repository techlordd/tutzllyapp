-- Migration: Update parents table schema
-- Run this script once against the live database.

-- Rename primary key
ALTER TABLE parents RENAME COLUMN id TO record_id;

-- Rename fullname columns
ALTER TABLE parents RENAME COLUMN fullname_first TO full_name_first_name;
ALTER TABLE parents RENAME COLUMN fullname_last  TO full_name_last_name;

-- Rename address columns
ALTER TABLE parents RENAME COLUMN address_line1 TO address_line_1;
ALTER TABLE parents RENAME COLUMN address_line2 TO address_line_2;
ALTER TABLE parents RENAME COLUMN address_state TO address_state_province;
ALTER TABLE parents RENAME COLUMN address_zip   TO address_zip_postal;

-- Rename timestamp columns
ALTER TABLE parents RENAME COLUMN created_at TO timestamp;
ALTER TABLE parents RENAME COLUMN updated_at TO last_updated;

-- Add new columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parents' AND column_name='password') THEN
    ALTER TABLE parents ADD COLUMN password VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parents' AND column_name='address') THEN
    ALTER TABLE parents ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parents' AND column_name='record_key') THEN
    ALTER TABLE parents ADD COLUMN record_key VARCHAR(100);
  END IF;
END $$;
