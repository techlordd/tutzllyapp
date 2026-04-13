-- Tutzlly Academy Database Schema
-- Modeled after existing Formidable Forms structure

-- Users table (shared authentication across all roles)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'tutor', 'student', 'parent')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tutors table
CREATE TABLE IF NOT EXISTS tutors (
  id SERIAL PRIMARY KEY,
  tutor_id VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(100),
  email VARCHAR(255),
  firstname VARCHAR(100),
  surname VARCHAR(100),
  fullname_first VARCHAR(100),
  fullname_last VARCHAR(100),
  phone_no VARCHAR(30),
  sex VARCHAR(10),
  date_of_birth DATE,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_zip VARCHAR(20),
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) UNIQUE NOT NULL,
  enrollment_id VARCHAR(50),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(100),
  email VARCHAR(255),
  firstname VARCHAR(100),
  surname VARCHAR(100),
  fullname_first VARCHAR(100),
  fullname_last VARCHAR(100),
  phone_no VARCHAR(30),
  sex VARCHAR(10),
  grade VARCHAR(20),
  school VARCHAR(255),
  date_of_birth DATE,
  mothers_name VARCHAR(200),
  mothers_email VARCHAR(255),
  fathers_name VARCHAR(200),
  fathers_email VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_zip VARCHAR(20),
  address_country VARCHAR(100),
  short_bio TEXT,
  profile_image VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active',
  reason_for_inactive TEXT,
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Parents table
CREATE TABLE IF NOT EXISTS parents (
  id SERIAL PRIMARY KEY,
  parent_id VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(100),
  email VARCHAR(255),
  fullname_first VARCHAR(100),
  fullname_last VARCHAR(100),
  phone_no VARCHAR(30),
  sex VARCHAR(10),
  date_of_birth DATE,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_zip VARCHAR(20),
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
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
  zoom_link VARCHAR(500),
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
  ssid VARCHAR(50) UNIQUE NOT NULL,
  schedule_id VARCHAR(50),
  tutor_id VARCHAR(50),
  tutor_firstname VARCHAR(100),
  tutor_lastname VARCHAR(100),
  student_id VARCHAR(50),
  student_name VARCHAR(200),
  student_email VARCHAR(255),
  course_name VARCHAR(255),
  course_id INTEGER REFERENCES courses(id),
  entry_date DATE,
  day VARCHAR(20),
  schedule_start_time TIME,
  schedule_end_time TIME,
  schedule_day VARCHAR(20),
  zoom_link VARCHAR(500),
  meeting_id VARCHAR(100),
  meeting_passcode VARCHAR(100),
  start_session_date DATE,
  start_session_time TIME,
  end_session_date DATE,
  end_session_time TIME,
  session_duration INTEGER, -- in minutes
  reschedule_to DATE,
  reschedule_time TIME,
  status VARCHAR(30) DEFAULT 'scheduled', -- scheduled, started, ended, rescheduled, missed
  status_admin VARCHAR(30),
  session_code_status VARCHAR(50),
  mothers_email VARCHAR(255),
  fathers_email VARCHAR(255),
  -- Missed session repeater fields (up to 3)
  missed_session_id1 VARCHAR(50),
  missed_schedule_id1 VARCHAR(50),
  missed_status1 VARCHAR(30),
  missed_tutor_id1 VARCHAR(50),
  missed_tutor_firstname1 VARCHAR(100),
  missed_tutor_lastname1 VARCHAR(100),
  missed_student_name1 VARCHAR(200),
  missed_course1 VARCHAR(255),
  missed_course_id1 INTEGER,
  missed_session_code_status1 VARCHAR(50),
  missed_session_id2 VARCHAR(50),
  missed_schedule_id2 VARCHAR(50),
  missed_status2 VARCHAR(30),
  missed_tutor_id2 VARCHAR(50),
  missed_tutor_firstname2 VARCHAR(100),
  missed_tutor_lastname2 VARCHAR(100),
  missed_student_name2 VARCHAR(200),
  missed_course2 VARCHAR(255),
  missed_course_id2 INTEGER,
  missed_session_code_status2 VARCHAR(50),
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Class activities
CREATE TABLE IF NOT EXISTS class_activities (
  id SERIAL PRIMARY KEY,
  ssid VARCHAR(50),
  tutor_id VARCHAR(50),
  tutor_firstname VARCHAR(100),
  tutor_lastname VARCHAR(100),
  student_id VARCHAR(50),
  student_name VARCHAR(200),
  course_name VARCHAR(255),
  course_id INTEGER REFERENCES courses(id),
  session_code_status VARCHAR(50),
  mothers_email VARCHAR(255),
  fathers_email VARCHAR(255),
  class_activity_date DATE,
  class_activity_time TIME,
  topic_taught TEXT,
  details_of_class_activity TEXT,
  -- Activity
  activity VARCHAR(100),
  -- Homework
  assigned_homework_from_prev BOOLEAN DEFAULT false,
  status_of_past_homework_review VARCHAR(100),
  new_homework_assigned BOOLEAN DEFAULT false,
  topic_of_homework TEXT,
  no_homework_why TEXT,
  did_student_complete_prev_homework VARCHAR(20),
  homework1 VARCHAR(255),
  homework2 VARCHAR(255),
  homework3 VARCHAR(255),
  student_reason_for_not_completing TEXT,
  -- Punctuality
  did_student_join_on_time VARCHAR(20),
  punctuality1 VARCHAR(100),
  punctuality2 VARCHAR(100),
  student_reason_for_late TEXT,
  -- Attentiveness
  is_student_attentive VARCHAR(20),
  attentiveness1 VARCHAR(100),
  attentiveness2 VARCHAR(100),
  attentiveness3 VARCHAR(100),
  -- Engagement
  student_engages_in_class VARCHAR(20),
  class_engagement1 VARCHAR(100),
  class_engagement2 VARCHAR(100),
  class_engagement3 VARCHAR(100),
  -- General
  tutors_general_observation TEXT,
  tutors_intervention TEXT,
  helpful_link1 VARCHAR(500),
  helpful_link2 VARCHAR(500),
  helpful_link3 VARCHAR(500),
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Grade book
CREATE TABLE IF NOT EXISTS grade_book (
  id SERIAL PRIMARY KEY,
  tutor_id VARCHAR(50),
  tutor_name VARCHAR(200),
  student_id VARCHAR(50),
  student_name VARCHAR(200),
  course_name VARCHAR(255),
  course_id INTEGER REFERENCES courses(id),
  month VARCHAR(20),
  year VARCHAR(10),
  punctuality NUMERIC(5,2),
  attentiveness NUMERIC(5,2),
  engagement NUMERIC(5,2),
  homework NUMERIC(5,2),
  test_score NUMERIC(5,2),
  remarks TEXT,
  grade_code_status VARCHAR(50),
  status VARCHAR(20) DEFAULT 'draft',
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages - chat with admin
CREATE TABLE IF NOT EXISTS messages_admin (
  id SERIAL PRIMARY KEY,
  message_date DATE,
  message_time TIME,
  role VARCHAR(20),
  sender VARCHAR(200),
  user_role VARCHAR(20),
  user_role2 VARCHAR(20),
  tutor_name VARCHAR(200),
  tutor_id VARCHAR(50),
  student_name VARCHAR(200),
  student_id VARCHAR(50),
  parent_name VARCHAR(200),
  parent_id VARCHAR(50),
  recipient_admin VARCHAR(200),
  cc VARCHAR(255),
  subject VARCHAR(500),
  body TEXT,
  file_upload VARCHAR(500),
  status VARCHAR(20) DEFAULT 'unread',
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages - chat with parent
CREATE TABLE IF NOT EXISTS messages_parent (
  id SERIAL PRIMARY KEY,
  message_date DATE,
  message_time TIME,
  role VARCHAR(20),
  sender VARCHAR(200),
  sender_email VARCHAR(255),
  user_role VARCHAR(20),
  sender_admin VARCHAR(200),
  sender_tutor_name VARCHAR(200),
  sender_tutor_id VARCHAR(50),
  reply_to_tutor VARCHAR(255),
  reply_to_tutor_id VARCHAR(50),
  reply_to_admin VARCHAR(255),
  recipient_id VARCHAR(50),
  recipient_name VARCHAR(200),
  recipient_email VARCHAR(255),
  cc VARCHAR(255),
  subject VARCHAR(500),
  body TEXT,
  attach_file VARCHAR(500),
  status VARCHAR(20) DEFAULT 'unread',
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages - chat with student
CREATE TABLE IF NOT EXISTS messages_student (
  id SERIAL PRIMARY KEY,
  message_date DATE,
  message_time TIME,
  role VARCHAR(20),
  sender_email VARCHAR(255),
  user_role VARCHAR(20),
  message_to VARCHAR(20),
  sender VARCHAR(200),
  tutor_name VARCHAR(200),
  tutor_id VARCHAR(50),
  student_name VARCHAR(200),
  student_id VARCHAR(50),
  lookup_tutor_id VARCHAR(50),
  recipient_name_student VARCHAR(200),
  recipient_id_student VARCHAR(50),
  recipient_email VARCHAR(255),
  cc VARCHAR(255),
  recipient_name_tutor VARCHAR(200),
  recipient_id_tutor VARCHAR(50),
  recipient_name_parent VARCHAR(200),
  recipient_id_parent VARCHAR(50),
  recipient_admin VARCHAR(200),
  subject VARCHAR(500),
  body TEXT,
  attach_file VARCHAR(500),
  status VARCHAR(20) DEFAULT 'unread',
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages - chat with tutor
CREATE TABLE IF NOT EXISTS messages_tutor (
  id SERIAL PRIMARY KEY,
  message_date DATE,
  message_time TIME,
  role VARCHAR(20),
  sender VARCHAR(200),
  sender_email VARCHAR(255),
  user_role VARCHAR(20),
  user_role2 VARCHAR(20),
  sender_admin VARCHAR(200),
  sender_student_name VARCHAR(200),
  sender_student_id VARCHAR(50),
  lookup_student_id VARCHAR(50),
  sender_parent_name VARCHAR(200),
  sender_parent_id VARCHAR(50),
  recipient_tutor_name VARCHAR(200),
  recipient_tutor_id VARCHAR(50),
  recipient_email VARCHAR(255),
  cc VARCHAR(255),
  subject VARCHAR(500),
  body TEXT,
  attach_file VARCHAR(500),
  status VARCHAR(20) DEFAULT 'unread',
  user_id INTEGER REFERENCES users(id),
  entry_status VARCHAR(20) DEFAULT 'active',
  ip VARCHAR(45),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tutors_tutor_id ON tutors(tutor_id);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_parents_parent_id ON parents(parent_id);
CREATE INDEX IF NOT EXISTS idx_schedules_student_id ON schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_schedules_tutor_id ON schedules(tutor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tutor_id ON sessions(tutor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_ssid ON sessions(ssid);
CREATE INDEX IF NOT EXISTS idx_class_activities_tutor_id ON class_activities(tutor_id);
CREATE INDEX IF NOT EXISTS idx_class_activities_student_id ON class_activities(student_id);
CREATE INDEX IF NOT EXISTS idx_grade_book_student_id ON grade_book(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_tutor_id ON student_enrollments(tutor_id);
