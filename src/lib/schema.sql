-- Tutzlly Academy Database Schema
-- Modeled after existing Formidable Forms structure

-- ─── Multi-Tenant: Academies ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academies (
  id SERIAL PRIMARY KEY,
  academy_id VARCHAR(50) UNIQUE NOT NULL,
  academy_name VARCHAR(255) NOT NULL,
  academy_email VARCHAR(255),
  academy_description TEXT,
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) DEFAULT '#1E40AF',
  accent_color VARCHAR(7) DEFAULT '#10B981',
  logo_url TEXT,
  favicon_url TEXT,
  site_title VARCHAR(255),
  login_bg_url TEXT,
  login_tagline VARCHAR(255),
  subdomain VARCHAR(100) UNIQUE,
  custom_domain VARCHAR(255) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── Multi-Tenant: Per-Academy Role Assignments ───────────────────────────────
CREATE TABLE IF NOT EXISTS user_academy_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  academy_id INTEGER NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'tutor', 'student', 'parent')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, academy_id, role)
);

-- ─── Super Admins (platform-level, across all academies) ─────────────────────
CREATE TABLE IF NOT EXISTS super_admins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users table (shared authentication across all roles)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'tutor', 'student', 'parent', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tutors table
CREATE TABLE IF NOT EXISTS tutors (
  record_id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  tutor_id VARCHAR(50) UNIQUE NOT NULL,
  user_role VARCHAR(20) DEFAULT 'tutor',
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(100),
  email VARCHAR(255),
  password VARCHAR(255),
  firstname VARCHAR(100),
  surname VARCHAR(100),
  full_name_first_name VARCHAR(100),
  full_name_last_name VARCHAR(100),
  phone_no VARCHAR(30),
  sex VARCHAR(10),
  date_of_birth DATE,
  address TEXT,
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  address_city VARCHAR(100),
  address_state_province VARCHAR(100),
  address_zip_postal VARCHAR(20),
  address_country VARCHAR(100),
  short_bio TEXT,
  pay_category VARCHAR(50),
  salary NUMERIC(15,2),
  payrate_per_hour NUMERIC(10,2),
  profile_image VARCHAR(500),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  timestamp TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  record_key VARCHAR(100)
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  record_id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  student_id VARCHAR(50) UNIQUE NOT NULL,
  enrollment_id VARCHAR(50),
  user_role VARCHAR(20) DEFAULT 'student',
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(100),
  email VARCHAR(255),
  password VARCHAR(255),
  firstname VARCHAR(100),
  surname VARCHAR(100),
  full_name_first_name VARCHAR(100),
  full_name_last_name VARCHAR(100),
  phone_no VARCHAR(30),
  sex VARCHAR(10),
  grade VARCHAR(20),
  school VARCHAR(255),
  date_of_birth DATE,
  mothers_name VARCHAR(200),
  mothers_email VARCHAR(255),
  fathers_name VARCHAR(200),
  fathers_email VARCHAR(255),
  address TEXT,
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  address_city VARCHAR(100),
  address_state_province VARCHAR(100),
  address_zip_postal VARCHAR(20),
  address_country VARCHAR(100),
  short_bio TEXT,
  profile_image VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active',
  reason_for_inactive TEXT,
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  timestamp TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  record_key VARCHAR(100),
  date DATE,
  time TIME
);

-- Parents table
CREATE TABLE IF NOT EXISTS parents (
  record_id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  parent_id VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(100),
  email VARCHAR(255),
  password VARCHAR(255),
  full_name_first_name VARCHAR(100),
  full_name_last_name VARCHAR(100),
  phone_no VARCHAR(30),
  sex VARCHAR(10),
  date_of_birth DATE,
  address TEXT,
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  address_city VARCHAR(100),
  address_state_province VARCHAR(100),
  address_zip_postal VARCHAR(20),
  address_country VARCHAR(100),
  short_bio TEXT,
  no_of_students INTEGER DEFAULT 0,
  -- Repeater fields for up to 5 students
  student1 VARCHAR(200),
  student_id1 VARCHAR(50),
  student2 VARCHAR(200),
  student_id2 VARCHAR(50),
  student3 VARCHAR(200),
  student_id3 VARCHAR(50),
  student4 VARCHAR(200),
  student_id4 VARCHAR(50),
  student5 VARCHAR(200),
  student_id5 VARCHAR(50),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  record_key VARCHAR(100),
  timestamp TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  course_name VARCHAR(255) NOT NULL,
  course_code VARCHAR(50) UNIQUE NOT NULL,
  course_name_deprecated VARCHAR(255),
  course_code_deprecated VARCHAR(50),
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tutor course assignments
CREATE TABLE IF NOT EXISTS tutor_course_assignments (
  id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  tutor_assign_id VARCHAR(50) UNIQUE NOT NULL,
  tutor_id VARCHAR(50) NOT NULL,
  tutor_username VARCHAR(100),
  tutor_sex VARCHAR(10),
  tutor_email VARCHAR(255),
  course_id INTEGER REFERENCES courses(id),
  course_name VARCHAR(255),
  course_code VARCHAR(50),
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Student enrollments (assign tutor + course to student)
CREATE TABLE IF NOT EXISTS student_enrollments (
  id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  assign_id VARCHAR(50) UNIQUE NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  student_name VARCHAR(200),
  student_sex VARCHAR(10),
  tutor_id VARCHAR(50) NOT NULL,
  tutor_name VARCHAR(200),
  tutor_username VARCHAR(100),
  tutor_sex VARCHAR(10),
  tutor_email VARCHAR(255),
  course_id INTEGER REFERENCES courses(id),
  course_name VARCHAR(255),
  course_code VARCHAR(50),
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  schedule_id VARCHAR(50) UNIQUE NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  student_name VARCHAR(200),
  tutor_id VARCHAR(50) NOT NULL,
  tutor_name VARCHAR(200),
  tutor_email VARCHAR(255),
  course_id INTEGER REFERENCES courses(id),
  course_name VARCHAR(255),
  course_code VARCHAR(50),
  year VARCHAR(10),
  day VARCHAR(20),
  sort_id INTEGER,
  duration INTEGER, -- in minutes
  session_start_time TIME,
  session_end_time TIME,
  time_zone VARCHAR(100),
  zoom_link TEXT,
  meeting_id VARCHAR(100),
  meeting_passcode VARCHAR(100),
  assign_status VARCHAR(20) DEFAULT 'active',
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions (Start session form)
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  ssid TEXT NOT NULL,
  schedule_id TEXT,
  tutor_id TEXT,
  tutor_firstname TEXT,
  tutor_lastname TEXT,
  student_id TEXT,
  student_name TEXT,
  student_email TEXT,
  course_name TEXT,
  course_id INTEGER REFERENCES courses(id),
  entry_date DATE,
  day VARCHAR(20),
  schedule_start_time TIME,
  schedule_end_time TIME,
  schedule_day VARCHAR(20),
  zoom_link TEXT,
  meeting_id TEXT,
  meeting_passcode TEXT,
  start_session_date DATE,
  start_session_time TIME,
  end_session_date DATE,
  end_session_time TIME,
  session_duration NUMERIC(5,2), -- in hours (e.g. 1.5 = 1.5 hrs)
  reschedule_to DATE,
  reschedule_time TIME,
  status VARCHAR(30) DEFAULT 'scheduled', -- scheduled, started, ended, rescheduled, missed
  status_admin VARCHAR(30),
  session_code_status TEXT,
  mothers_email TEXT,
  fathers_email TEXT,
  -- Missed session repeater fields (up to 3)
  missed_session_id1 TEXT,
  missed_schedule_id1 TEXT,
  missed_status1 VARCHAR(30),
  missed_tutor_id1 TEXT,
  missed_tutor_firstname1 TEXT,
  missed_tutor_lastname1 TEXT,
  missed_student_name1 TEXT,
  missed_course1 TEXT,
  missed_course_id1 INTEGER,
  missed_session_code_status1 TEXT,
  missed_session_id2 TEXT,
  missed_schedule_id2 TEXT,
  missed_status2 VARCHAR(30),
  missed_tutor_id2 TEXT,
  missed_tutor_firstname2 TEXT,
  missed_tutor_lastname2 TEXT,
  missed_student_name2 TEXT,
  missed_course2 TEXT,
  missed_course_id2 INTEGER,
  missed_session_code_status2 TEXT,
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Class activities
CREATE TABLE IF NOT EXISTS class_activities (
  id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  ssid TEXT,
  tutor_id TEXT,
  tutor_firstname TEXT,
  tutor_lastname TEXT,
  student_id TEXT,
  student_name TEXT,
  course_name TEXT,
  course_id INTEGER REFERENCES courses(id),
  session_code_status TEXT,
  mothers_email TEXT,
  fathers_email TEXT,
  class_activity_date DATE,
  class_activity_time TIME,
  topic_taught TEXT,
  details_of_class_activity TEXT,
  -- Activity
  activity TEXT,
  -- Homework
  assigned_homework_from_prev BOOLEAN DEFAULT false,
  status_of_past_homework_review TEXT,
  new_homework_assigned BOOLEAN DEFAULT false,
  topic_of_homework TEXT,
  no_homework_why TEXT,
  did_student_complete_prev_homework TEXT,
  homework1 TEXT,
  homework2 TEXT,
  homework3 TEXT,
  student_reason_for_not_completing TEXT,
  -- Punctuality
  did_student_join_on_time TEXT,
  punctuality1 TEXT,
  punctuality2 TEXT,
  student_reason_for_late TEXT,
  -- Attentiveness
  is_student_attentive TEXT,
  attentiveness1 TEXT,
  attentiveness2 TEXT,
  attentiveness3 TEXT,
  -- Engagement
  student_engages_in_class TEXT,
  class_engagement1 TEXT,
  class_engagement2 TEXT,
  class_engagement3 TEXT,
  -- General
  tutors_general_observation TEXT,
  tutors_intervention TEXT,
  helpful_link1 TEXT,
  helpful_link2 TEXT,
  helpful_link3 TEXT,
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Grade book
CREATE TABLE IF NOT EXISTS grade_book (
  id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  tutor_id TEXT,
  tutor_name TEXT,
  student_id TEXT,
  student_name TEXT,
  course_name TEXT,
  course_id INTEGER REFERENCES courses(id),
  month TEXT,
  year TEXT,
  punctuality NUMERIC(5,2),
  attentiveness NUMERIC(5,2),
  engagement NUMERIC(5,2),
  homework NUMERIC(5,2),
  test_score NUMERIC(5,2),
  remarks TEXT,
  grade_code_status TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages - chat with admin
CREATE TABLE IF NOT EXISTS messages_admin (
  id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  message_date DATE,
  message_time TIME,
  role TEXT,
  sender TEXT,
  user_role TEXT,
  user_role2 TEXT,
  tutor_name TEXT,
  tutor_id TEXT,
  student_name TEXT,
  student_id TEXT,
  parent_name TEXT,
  parent_id TEXT,
  recipient_admin TEXT,
  cc TEXT,
  subject TEXT,
  body TEXT,
  file_upload TEXT,
  status VARCHAR(20) DEFAULT 'unread',
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages - chat with parent
CREATE TABLE IF NOT EXISTS messages_parent (
  id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  message_date DATE,
  message_time TIME,
  role TEXT,
  sender TEXT,
  sender_email TEXT,
  user_role TEXT,
  sender_admin TEXT,
  sender_tutor_name TEXT,
  sender_tutor_id TEXT,
  reply_to_tutor TEXT,
  reply_to_tutor_id TEXT,
  reply_to_admin TEXT,
  recipient_id TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  cc TEXT,
  subject TEXT,
  body TEXT,
  attach_file TEXT,
  status VARCHAR(20) DEFAULT 'unread',
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages - chat with student
CREATE TABLE IF NOT EXISTS messages_student (
  id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  message_date DATE,
  message_time TIME,
  role TEXT,
  sender_email TEXT,
  user_role TEXT,
  message_to TEXT,
  sender TEXT,
  tutor_name TEXT,
  tutor_id TEXT,
  student_name TEXT,
  student_id TEXT,
  lookup_tutor_id TEXT,
  recipient_name_student TEXT,
  recipient_id_student TEXT,
  recipient_email TEXT,
  cc TEXT,
  recipient_name_tutor TEXT,
  recipient_id_tutor TEXT,
  recipient_name_parent TEXT,
  recipient_id_parent TEXT,
  recipient_admin TEXT,
  subject TEXT,
  body TEXT,
  attach_file TEXT,
  status VARCHAR(20) DEFAULT 'unread',
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages - chat with tutor
CREATE TABLE IF NOT EXISTS messages_tutor (
  id SERIAL PRIMARY KEY,
  academy_id INTEGER REFERENCES academies(id) ON DELETE CASCADE,
  message_date DATE,
  message_time TIME,
  role TEXT,
  sender TEXT,
  sender_email TEXT,
  user_role TEXT,
  user_role2 TEXT,
  sender_admin TEXT,
  sender_student_name TEXT,
  sender_student_id TEXT,
  lookup_student_id TEXT,
  sender_parent_name TEXT,
  sender_parent_id TEXT,
  recipient_tutor_name TEXT,
  recipient_tutor_id TEXT,
  recipient_email TEXT,
  cc TEXT,
  subject TEXT,
  body TEXT,
  attach_file TEXT,
  status VARCHAR(20) DEFAULT 'unread',
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tutors_tutor_id ON tutors(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutors_academy_id ON tutors(academy_id);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_academy_id ON students(academy_id);
CREATE INDEX IF NOT EXISTS idx_parents_parent_id ON parents(parent_id);
CREATE INDEX IF NOT EXISTS idx_parents_academy_id ON parents(academy_id);
CREATE INDEX IF NOT EXISTS idx_schedules_student_id ON schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_schedules_tutor_id ON schedules(tutor_id);
CREATE INDEX IF NOT EXISTS idx_schedules_academy_id ON schedules(academy_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON sessions USING HASH (student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tutor_id ON sessions USING HASH (tutor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_ssid ON sessions USING HASH (ssid);
CREATE INDEX IF NOT EXISTS idx_sessions_academy_id ON sessions(academy_id);
CREATE INDEX IF NOT EXISTS idx_class_activities_tutor_id ON class_activities(tutor_id);
CREATE INDEX IF NOT EXISTS idx_class_activities_student_id ON class_activities(student_id);
CREATE INDEX IF NOT EXISTS idx_class_activities_academy_id ON class_activities(academy_id);
CREATE INDEX IF NOT EXISTS idx_grade_book_student_id ON grade_book(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_book_academy_id ON grade_book(academy_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_tutor_id ON student_enrollments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_academy_id ON student_enrollments(academy_id);
CREATE INDEX IF NOT EXISTS idx_courses_academy_id ON courses(academy_id);
CREATE INDEX IF NOT EXISTS idx_user_academy_roles_user_id ON user_academy_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_academy_roles_academy_id ON user_academy_roles(academy_id);
