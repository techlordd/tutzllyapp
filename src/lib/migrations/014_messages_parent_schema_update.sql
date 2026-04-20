-- Migration: Update messages_parent table schema

-- Rename primary key
ALTER TABLE messages_parent RENAME COLUMN id TO record_id;

-- Rename timestamp columns
ALTER TABLE messages_parent RENAME COLUMN created_at TO timestamp;
ALTER TABLE messages_parent RENAME COLUMN updated_at TO last_updated;

-- Drop user_id FK and convert to text
ALTER TABLE messages_parent DROP CONSTRAINT IF EXISTS messages_parent_user_id_fkey;
ALTER TABLE messages_parent ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Add new columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_parent' AND column_name='recipient_id_deprecated') THEN
    ALTER TABLE messages_parent ADD COLUMN recipient_id_deprecated TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_parent' AND column_name='recipient_deprecated') THEN
    ALTER TABLE messages_parent ADD COLUMN recipient_deprecated TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_parent' AND column_name='record_key') THEN
    ALTER TABLE messages_parent ADD COLUMN record_key TEXT;
  END IF;
END $$;
