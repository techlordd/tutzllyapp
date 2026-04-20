-- Migration: Fix class_activities schema for CSV compatibility

-- Step 1: Rename columns if not already done (from migration 010)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='class_activities' AND column_name='id') THEN
    ALTER TABLE class_activities RENAME COLUMN id TO record_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='class_activities' AND column_name='created_at') THEN
    ALTER TABLE class_activities RENAME COLUMN created_at TO timestamp;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='class_activities' AND column_name='updated_at') THEN
    ALTER TABLE class_activities RENAME COLUMN updated_at TO last_updated;
  END IF;
END $$;

-- Step 2: Add missing columns if not already done
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='class_activities' AND column_name='course_id_ref') THEN
    ALTER TABLE class_activities ADD COLUMN course_id_ref TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='class_activities' AND column_name='record_key') THEN
    ALTER TABLE class_activities ADD COLUMN record_key TEXT;
  END IF;
END $$;

-- Step 3: Convert BOOLEAN columns to TEXT (only if still BOOLEAN)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='class_activities' AND column_name='assigned_homework_from_prev'
    AND data_type = 'boolean'
  ) THEN
    ALTER TABLE class_activities
      ALTER COLUMN assigned_homework_from_prev TYPE TEXT USING
        CASE WHEN assigned_homework_from_prev THEN 'true' ELSE 'false' END;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='class_activities' AND column_name='new_homework_assigned'
    AND data_type = 'boolean'
  ) THEN
    ALTER TABLE class_activities
      ALTER COLUMN new_homework_assigned TYPE TEXT USING
        CASE WHEN new_homework_assigned THEN 'true' ELSE 'false' END;
  END IF;
END $$;

-- Step 4: Convert DATE/TIME to TEXT to accept any CSV format (only if not already TEXT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='class_activities' AND column_name='class_activity_date'
    AND data_type NOT IN ('text', 'character varying')
  ) THEN
    ALTER TABLE class_activities
      ALTER COLUMN class_activity_date TYPE TEXT USING class_activity_date::TEXT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='class_activities' AND column_name='class_activity_time'
    AND data_type NOT IN ('text', 'character varying')
  ) THEN
    ALTER TABLE class_activities
      ALTER COLUMN class_activity_time TYPE TEXT USING class_activity_time::TEXT;
  END IF;
END $$;

-- Step 5: Drop old course_id FK and convert user_id FK to TEXT (idempotent)
ALTER TABLE class_activities DROP CONSTRAINT IF EXISTS class_activities_course_id_fkey;
ALTER TABLE class_activities DROP CONSTRAINT IF EXISTS class_activities_user_id_fkey;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='class_activities' AND column_name='user_id'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE class_activities ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;
END $$;
