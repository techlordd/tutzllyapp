-- Migration: Fix sort_id column type in schedules table
-- Run this script once against the live database.
ALTER TABLE schedules ALTER COLUMN sort_id TYPE VARCHAR(50) USING sort_id::TEXT;
