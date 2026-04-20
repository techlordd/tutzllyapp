-- Migration: Update messages_tutor table schema

-- Rename primary key
ALTER TABLE messages_tutor RENAME COLUMN id TO record_id;

-- Rename timestamp columns
ALTER TABLE messages_tutor RENAME COLUMN created_at TO timestamp;
ALTER TABLE messages_tutor RENAME COLUMN updated_at TO last_updated;

-- Drop user_id FK and convert to text
ALTER TABLE messages_tutor DROP CONSTRAINT IF EXISTS messages_tutor_user_id_fkey;
ALTER TABLE messages_tutor ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Add record_key column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_tutor' AND column_name='record_key') THEN
    ALTER TABLE messages_tutor ADD COLUMN record_key TEXT;
  END IF;
END $$;
