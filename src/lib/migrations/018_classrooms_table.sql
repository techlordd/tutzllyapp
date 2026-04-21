-- Migration: Create classrooms table

CREATE TABLE IF NOT EXISTS classrooms (
  record_id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  classroom_id TEXT UNIQUE,
  room_name TEXT,
  link TEXT,
  meeting_id TEXT,
  passcode TEXT,
  assigned_to TEXT,
  user_id TEXT,
  entry_status TEXT DEFAULT 'active',
  ip TEXT,
  record_key TEXT,
  created_by TEXT,
  updated_by TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classrooms_academy_id ON classrooms(academy_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_classroom_id ON classrooms(classroom_id);
