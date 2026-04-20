-- Migration: Update messages_admin table schema

-- Rename primary key
ALTER TABLE messages_admin RENAME COLUMN id TO record_id;

-- Rename timestamp columns
ALTER TABLE messages_admin RENAME COLUMN created_at TO timestamp;
ALTER TABLE messages_admin RENAME COLUMN updated_at TO last_updated;

-- Drop user_id FK and convert to text
ALTER TABLE messages_admin DROP CONSTRAINT IF EXISTS messages_admin_user_id_fkey;
ALTER TABLE messages_admin ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Add record_key column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_admin' AND column_name='record_key') THEN
    ALTER TABLE messages_admin ADD COLUMN record_key TEXT;
  END IF;
END $$;
