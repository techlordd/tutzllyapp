-- Migration: Update schedules table schema
-- Run this script once against the live database.

-- Rename primary key
ALTER TABLE schedules RENAME COLUMN id TO record_id;

-- Rename timestamp columns
ALTER TABLE schedules RENAME COLUMN created_at TO timestamp;
ALTER TABLE schedules RENAME COLUMN updated_at TO last_updated;

-- Add new columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedules' AND column_name='time_zone_deprecated') THEN
    ALTER TABLE schedules ADD COLUMN time_zone_deprecated VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedules' AND column_name='record_key') THEN
    ALTER TABLE schedules ADD COLUMN record_key VARCHAR(100);
  END IF;
END $$;
