-- Migration: Add sender-specific columns to messages_tutor
-- These columns are in schema.sql but were not added in migration 012.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_tutor' AND column_name='sender_email') THEN
    ALTER TABLE messages_tutor ADD COLUMN sender_email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_tutor' AND column_name='user_role') THEN
    ALTER TABLE messages_tutor ADD COLUMN user_role TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_tutor' AND column_name='user_role2') THEN
    ALTER TABLE messages_tutor ADD COLUMN user_role2 TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_tutor' AND column_name='sender_admin') THEN
    ALTER TABLE messages_tutor ADD COLUMN sender_admin TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_tutor' AND column_name='sender_student_name') THEN
    ALTER TABLE messages_tutor ADD COLUMN sender_student_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_tutor' AND column_name='sender_student_id') THEN
    ALTER TABLE messages_tutor ADD COLUMN sender_student_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_tutor' AND column_name='lookup_student_id') THEN
    ALTER TABLE messages_tutor ADD COLUMN lookup_student_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_tutor' AND column_name='sender_parent_name') THEN
    ALTER TABLE messages_tutor ADD COLUMN sender_parent_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_tutor' AND column_name='sender_parent_id') THEN
    ALTER TABLE messages_tutor ADD COLUMN sender_parent_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_tutor' AND column_name='recipient_tutor_name') THEN
    ALTER TABLE messages_tutor ADD COLUMN recipient_tutor_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_tutor' AND column_name='recipient_tutor_id') THEN
    ALTER TABLE messages_tutor ADD COLUMN recipient_tutor_id TEXT;
  END IF;
  -- Backfill sender_admin from old generic sender column for existing rows
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages_tutor' AND column_name='sender') THEN
    UPDATE messages_tutor SET sender_admin = sender WHERE sender_admin IS NULL AND sender IS NOT NULL AND sender != '';
  END IF;
END $$;
