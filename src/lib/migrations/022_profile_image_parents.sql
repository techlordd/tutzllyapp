-- Migration: Add profile_image column to parents table
ALTER TABLE parents ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500);
