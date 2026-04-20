-- Migration: Update class_activities table schema
-- Run this script once against the live database.

-- Rename primary key
ALTER TABLE class_activities RENAME COLUMN id TO record_id;

-- Rename timestamp columns
ALTER TABLE class_activities RENAME COLUMN created_at TO timestamp;
ALTER TABLE class_activities RENAME COLUMN updated_at TO last_updated;

-- Add new columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='class_activities' AND column_name='course_id_ref') THEN
    ALTER TABLE class_activities ADD COLUMN course_id_ref TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='class_activities' AND column_name='record_key') THEN
    ALTER TABLE class_activities ADD COLUMN record_key TEXT;
  END IF;
END $$;
