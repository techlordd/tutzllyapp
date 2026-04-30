-- Migration 020: add course_code column to sessions and class_activities tables
-- Run this script once against the live database.

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS course_code TEXT;
ALTER TABLE class_activities ADD COLUMN IF NOT EXISTS course_code TEXT;
