#!/usr/bin/env node
/**
 * Formidable Forms CSV → PostgreSQL Migration Script
 *
 * Usage:
 *   node scripts/migrate-csv.js --type <entity> --file <path/to/export.csv> [--dry-run]
 *
 * Entity types:
 *   tutors | students | parents | courses | assignments | enrollments |
 *   schedules | sessions | activities | grades | messages_admin |
 *   messages_parent | messages_student | messages_tutor
 *
 * Requirements:
 *   npm install csv-parse (already in project) + dotenv + bcryptjs
 *   Set DATABASE_URL in .env
 *
 * CSV format expected:
 *   - Row 1: column headers (Formidable Forms field labels)
 *   - Rows 2+: data rows
 *   - Blank cells become NULL
 *
 * Edit COLUMN_MAPS to match your actual Formidable Forms field label names.
 */

'use strict';

require('dotenv').config();
const { parse } = require('csv-parse/sync');
const { readFileSync } = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i > -1 ? args[i + 1] : null; };
const DRY_RUN = args.includes('--dry-run');
const ENTITY_TYPE = getArg('--type');
const CSV_FILE = getArg('--file');

if (!ENTITY_TYPE || !CSV_FILE) {
  console.error('Usage: node scripts/migrate-csv.js --type <entity> --file <path.csv> [--dry-run]');
  console.error('Valid types: tutors, students, parents, courses, assignments, enrollments, schedules, sessions, activities, grades, messages_admin, messages_parent, messages_student, messages_tutor');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

function generateId(prefix) {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${ts}-${rnd}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Renames duplicate CSV column headers as 'Name_2', 'Name_3', etc.
// Required for Formidable Forms repeater exports (Homework ×3, Punctuality ×2, etc.)
function deduplicateColumns(headers) {
  const seen = {};
  return headers.map(h => {
    const key = h.trim();
    if (!seen[key]) { seen[key] = 1; return key; }
    seen[key]++;
    return `${key}_${seen[key]}`;
  });
}

// Boolean fields that hold 'Yes'/'No' in CSV but BOOLEAN in PostgreSQL
const BOOLEAN_FIELDS = {
  activities: new Set(['assigned_homework_from_prev', 'new_homework_assigned']),
};

// ─── Column Maps ──────────────────────────────────────────────────────────────
// Keys are the EXACT Formidable Forms field labels as they appear in the CSV export.
// Duplicate headers (repeater fields) are renamed 'FieldName_2', 'FieldName_3' by
// deduplicateColumns() above — map those suffixed names here.
const COLUMN_MAPS = {
  tutors: {
    'Tutor ID': 'tutor_id', 'Tutor Username': 'username', 'Tutor Email': 'email',
    'Firstname': 'firstname', 'Surname': 'surname', 'Phone no': 'phone_no',
    'Sex': 'sex', 'Date of Birth': 'date_of_birth',
    'Address - Line 1': 'address_line1', 'Address - Line 2': 'address_line2',
    'Address - City': 'address_city', 'Address - State/Province': 'address_state',
    'Address - Zip/Postal': 'address_zip', 'Address - Country': 'address_country',
    'Short Bio': 'short_bio', 'Pay Category': 'pay_category',
    'Salary (₦)': 'salary', 'Payrate Per Hour (₦)': 'payrate_per_hour',
    'Profile Image': 'profile_image',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  students: {
    'StudentID': 'student_id', 'Enrollment ID': 'enrollment_id',
    'Student Username': 'username', 'Student Email': 'email',
    'Firstname': 'firstname', 'Surname': 'surname', 'Phone no': 'phone_no',
    'Sex': 'sex', 'Grade': 'grade', 'School': 'school',
    'Date of Birth': 'date_of_birth',
    "Mother's name": 'mothers_name', "Mother's email": 'mothers_email',
    "Father's name": 'fathers_name', "Father's email": 'fathers_email',
    'Address - Line 1': 'address_line1', 'Address - Line 2': 'address_line2',
    'Address - City': 'address_city', 'Address - State/Province': 'address_state',
    'Address - Zip/Postal': 'address_zip', 'Address - Country': 'address_country',
    'Short Bio': 'short_bio', 'Profile Image': 'profile_image',
    'Status': 'status', 'Reason for Inactive': 'reason_for_inactive',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  parents: {
    'ParentID': 'parent_id', 'Parent Username': 'username', 'Parent Email': 'email',
    'Full Name (Optional) (i4y294) - First Name': 'fullname_first',
    'Full Name (Optional) (i4y294) - Last Name': 'fullname_last',
    'Phone no': 'phone_no', 'Sex': 'sex', 'Date of Birth': 'date_of_birth',
    'Address - Line 1': 'address_line1', 'Address - Line 2': 'address_line2',
    'Address - City': 'address_city', 'Address - State/Province': 'address_state',
    'Address - Zip/Postal': 'address_zip', 'Address - Country': 'address_country',
    'Short Bio': 'short_bio', 'No of Students': 'no_of_students',
    'Student1': 'student1', 'StudentID1': 'student_id1',
    'Student2': 'student2', 'StudentID2': 'student_id2',
    'Student3': 'student3', 'StudentID3': 'student_id3',
    'Student4': 'student4', 'StudentID4': 'student_id4',
    'Student5': 'student5', 'StudentID5': 'student_id5',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  courses: {
    'Course Name': 'course_name', 'Course Code': 'course_code',
    'Course Name (DEPRECATED)': 'course_name_deprecated',
    'Course Code (DEPRECATED)': 'course_code_deprecated',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  assignments: {
    'Tutor Assign ID': 'tutor_assign_id', 'Tutor ID': 'tutor_id',
    'Tutor Name': 'tutor_username', 'Tutor Sex': 'tutor_sex', 'Tutor Email': 'tutor_email',
    'Assign Course': 'course_name', 'Course Code': 'course_code',
    // NOTE: 'Course ID' from CSV is Formidable's internal entry ID, not the PostgreSQL FK.
    // Verify it matches courses.id before importing; otherwise leave unmapped.
    'Course ID': 'course_id',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  enrollments: {
    'Assign ID': 'assign_id', 'STUDENT ID': 'student_id', 'Student Name': 'student_name',
    'Confirm Student Sex': 'student_sex', 'TUTOR ID': 'tutor_id', 'Tutor Name': 'tutor_name',
    'Confirm Tutor Username': 'tutor_username', 'Confirm Tutor Sex': 'tutor_sex',
    'Tutor Email': 'tutor_email', 'COURSE': 'course_name', 'Course Code': 'course_code',
    'Course ID': 'course_id',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  schedules: {
    'Schedule ID': 'schedule_id', 'Student ID': 'student_id', 'Student Name': 'student_name',
    'Tutor ID': 'tutor_id', 'Tutor Name': 'tutor_name', 'Tutor Email': 'tutor_email',
    'Course': 'course_name', 'Course Code': 'course_code', 'Year': 'year', 'Day': 'day',
    'Duration': 'duration', 'Session Start Time': 'session_start_time',
    'Session End Time': 'session_end_time', 'Time Zone': 'time_zone',
    'Zoom Link': 'zoom_link', 'Meeting ID': 'meeting_id', 'Meeting Passcode': 'meeting_passcode',
    'Assign Status': 'assign_status',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  sessions: {
    'SSID': 'ssid', 'Schedule ID (NEW)': 'schedule_id', 'Tutor ID': 'tutor_id',
    'Tutor Name (pf79t) - First Name': 'tutor_firstname',
    'Tutor Name (pf79t) - Last Name': 'tutor_lastname',
    'Student ID': 'student_id', 'Student': 'student_name', 'Student Email': 'student_email',
    'Course (NEW)': 'course_name', 'Entry Date': 'entry_date', 'Day': 'day',
    'Schedule Start Time': 'schedule_start_time', 'Schedule End Time': 'schedule_end_time',
    'Zoom Link': 'zoom_link', 'Meeting ID': 'meeting_id', 'Meeting Passcode': 'meeting_passcode',
    // 'Hidden Start Session Time' is a hidden field copy of start_session_time
    'Hidden Start Session Time': 'start_session_time',
    'Start Session Date': 'start_session_date',
    'End Session Date': 'end_session_date', 'End Session Time': 'end_session_time',
    'Session Duration': 'session_duration', 'Reschedule To': 'reschedule_to',
    'Reschedule Time': 'reschedule_time', 'Status': 'status',
    'Status (Admin)': 'status_admin', 'Session Code Status': 'session_code_status',
    "Mother's Email": 'mothers_email', "Father's Email": 'fathers_email',
    // Missed session repeater — 'Session Missed ID' appears twice in the CSV;
    // deduplicateColumns() renames the second occurrence to 'Session Missed ID_2'.
    'Session Missed ID': 'missed_session_id1',
    'Session Missed ID_2': 'missed_session_id2',
    'Tutor Name (slzne) - First Name': 'missed_tutor_firstname1',
    'Tutor Name (slzne) - Last Name': 'missed_tutor_lastname1',
    'Tutor Name (slzne2) - First Name': 'missed_tutor_firstname2',
    'Tutor Name (slzne2) - Last Name': 'missed_tutor_lastname2',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  activities: {
    'SSID': 'ssid', 'Tutor ID': 'tutor_id',
    'Tutor Name (c34n3) - First Name': 'tutor_firstname',
    'Tutor Name (c34n3) - Last Name': 'tutor_lastname',
    'Student ID': 'student_id', 'Student Name': 'student_name',
    'Course': 'course_name', 'Activity Date': 'class_activity_date',
    'Activity Time': 'class_activity_time', 'Topic Taught': 'topic_taught',
    'Details': 'details_of_class_activity', 'Activity': 'activity',
    'Session Code Status': 'session_code_status',
    "Mother's Email": 'mothers_email', "Father's Email": 'fathers_email',
    // Boolean fields — 'Yes'/'No' in CSV, coerced to true/false via BOOLEAN_FIELDS
    'Assigned Homework from Previous Session?': 'assigned_homework_from_prev',
    'Status of Past Homework Review': 'status_of_past_homework_review',
    'Did Student Complete Previous Homework?': 'did_student_complete_prev_homework',
    'New Homework Assigned for Current Session?': 'new_homework_assigned',
    'Topic of Homework': 'topic_of_homework',
    'No Homework Why?': 'no_homework_why',
    'Student reason for not completing previous homework': 'student_reason_for_not_completing',
    // Repeating fields — deduplicateColumns() renames 2nd/3rd occurrences '_2'/'_3'
    'Homework': 'homework1', 'Homework_2': 'homework2', 'Homework_3': 'homework3',
    'Did Student Join on Time': 'did_student_join_on_time',
    'Student reason for not joining session on time?': 'student_reason_for_late',
    'Punctuality': 'punctuality1', 'Punctuality_2': 'punctuality2',
    'Is Student Attentive': 'is_student_attentive',
    'Attentiveness': 'attentiveness1', 'Attentiveness_2': 'attentiveness2', 'Attentiveness_3': 'attentiveness3',
    'Student Engages in Class': 'student_engages_in_class',
    'Class Engagement': 'class_engagement1', 'Class Engagement_2': 'class_engagement2', 'Class Engagement_3': 'class_engagement3',
    "Tutor's General Observation": 'tutors_general_observation',
    "Tutor's Intervention": 'tutors_intervention',
    'Helpful Link 1': 'helpful_link1', 'Helpful Link 2': 'helpful_link2', 'Helpful Link 3': 'helpful_link3',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  grades: {
    'Tutor ID': 'tutor_id', 'Tutor Name': 'tutor_name',
    'Student ID': 'student_id', 'Student Name': 'student_name',
    'Course': 'course_name', 'Month': 'month', 'Year': 'year',
    'Punctuality': 'punctuality', 'Attentiveness': 'attentiveness',
    'Engagement': 'engagement', 'Homework': 'homework', 'Test Score': 'test_score',
    'Remarks': 'remarks', 'Grade Code Status': 'grade_code_status',
    'Status': 'status', 'Entry Status': 'entry_status',
    'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  messages_admin: {
    'Date': 'message_date', 'Time': 'message_time', 'Roles': 'role',
    'Sender': 'sender', 'User Role': 'user_role', 'User Role2': 'user_role2',
    'Tutor Name': 'tutor_name', 'Tutor ID': 'tutor_id',
    'Student Name': 'student_name', 'Student ID': 'student_id',
    'Parent Name': 'parent_name', 'Parent ID': 'parent_id',
    'Recipient (Admin)': 'recipient_admin', 'Cc (optional)': 'cc',
    'Subject': 'subject', 'Body': 'body', 'File Upload (Optional)': 'file_upload',
    'Status': 'status', 'Entry Status': 'entry_status',
    'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  messages_parent: {
    'Date': 'message_date', 'Time': 'message_time', 'Roles': 'role',
    'Sender': 'sender', 'Sender Email': 'sender_email', 'User Role': 'user_role',
    'Sender (Admin)': 'sender_admin',
    'Sender (Tutor Name)': 'sender_tutor_name', 'Sender (Tutor ID)': 'sender_tutor_id',
    'Reply-to (Tutor)': 'reply_to_tutor', 'Reply-to (Tutor ID)': 'reply_to_tutor_id',
    'Reply-to (Admin)': 'reply_to_admin',
    'RECIPIENT ID': 'recipient_id', 'RECIPIENT NAME': 'recipient_name',
    'Recipient Email': 'recipient_email', 'Cc (optional)': 'cc',
    'Subject': 'subject', 'Body': 'body',
    'Status': 'status', 'Entry Status': 'entry_status',
    'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  messages_student: {
    'Date': 'message_date', 'Time': 'message_time', 'Roles': 'role',
    'Sender Email': 'sender_email', 'User Role': 'user_role', 'Message To': 'message_to',
    'Sender': 'sender', 'Tutor Name': 'tutor_name', 'Tutor ID': 'tutor_id',
    'Student Name': 'student_name', 'Student ID': 'student_id',
    'Lookup Tutor ID': 'lookup_tutor_id',
    'Recipient Name (Student)': 'recipient_name_student',
    'Recipient ID (Student)': 'recipient_id_student',
    'Recipient Email': 'recipient_email', 'Cc (optional)': 'cc',
    'Recipient Name (Tutor)': 'recipient_name_tutor',
    'Recipient ID (Tutor)': 'recipient_id_tutor',
    'Recipient Name (Parent)': 'recipient_name_parent',
    'Recipient ID (Parent)': 'recipient_id_parent',
    'Recipient (Admin)': 'recipient_admin',
    'Subject': 'subject', 'Body': 'body', 'Attach File (Optional)': 'attach_file',
    'Status': 'status', 'Entry Status': 'entry_status',
    'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  messages_tutor: {
    'Date': 'message_date', 'Time': 'message_time', 'Roles': 'role',
    'Sender Email': 'sender_email', 'User Role': 'user_role', 'User Role2': 'user_role2',
    'Sender (ADMIN)': 'sender_admin',
    'Sender (Student Name)': 'sender_student_name',
    'Sender (Student ID)': 'sender_student_id',
    'Lookup Student ID': 'lookup_student_id',
    'Sender (Parent Name)': 'sender_parent_name',
    'Sender (Parent ID)': 'sender_parent_id',
    // Primary recipient fields (capitalized headers); the mixed-case 'Recipient (Tutor)' etc. are
    // deprecated duplicate columns in the CSV and are intentionally NOT mapped here.
    'RECIPIENT (Tutor Name)': 'recipient_tutor_name',
    'RECIPIENT (Tutor ID)': 'recipient_tutor_id',
    'RECIPIENT Email': 'recipient_email',
    'Cc (optional)': 'cc',
    'Subject': 'subject', 'Body': 'body', 'Attach File (Optional)': 'attach_file',
    'Status': 'status', 'Entry Status': 'entry_status',
    'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
};

const ENTITY_CONFIG = {
  tutors:           { table: 'tutors',                   idField: 'tutor_id',        idPrefix: 'TUT', createUser: true,  userRole: 'tutor'   },
  students:         { table: 'students',                 idField: 'student_id',      idPrefix: 'STU', createUser: true,  userRole: 'student' },
  parents:          { table: 'parents',                  idField: 'parent_id',       idPrefix: 'PAR', createUser: true,  userRole: 'parent'  },
  courses:          { table: 'courses',                  idField: 'course_code',     idPrefix: null,  createUser: false                     },
  assignments:      { table: 'tutor_course_assignments', idField: 'tutor_assign_id', idPrefix: 'ASN', createUser: false                     },
  enrollments:      { table: 'student_enrollments',      idField: 'assign_id',       idPrefix: 'ENR', createUser: false                     },
  schedules:        { table: 'schedules',                idField: 'schedule_id',     idPrefix: 'SCH', createUser: false                     },
  sessions:         { table: 'sessions',                 idField: 'ssid',            idPrefix: 'SES', createUser: false                     },
  activities:       { table: 'class_activities',         idField: null,              idPrefix: null,  createUser: false                     },
  grades:           { table: 'grade_book',               idField: null,              idPrefix: null,  createUser: false                     },
  messages_admin:   { table: 'messages_admin',           idField: null,              idPrefix: null,  createUser: false                     },
  messages_parent:  { table: 'messages_parent',          idField: null,              idPrefix: null,  createUser: false                     },
  messages_student: { table: 'messages_student',         idField: null,              idPrefix: null,  createUser: false                     },
  messages_tutor:   { table: 'messages_tutor',           idField: null,              idPrefix: null,  createUser: false                     },
};

async function main() {
  const config = ENTITY_CONFIG[ENTITY_TYPE];
  if (!config) {
    console.error(`Unknown entity type: ${ENTITY_TYPE}`);
    console.error(`Valid types: ${Object.keys(ENTITY_CONFIG).join(', ')}`);
    process.exit(1);
  }

  const columnMap = COLUMN_MAPS[ENTITY_TYPE];
  const csvContent = readFileSync(CSV_FILE, 'utf8');
  // deduplicateColumns renames repeated headers (repeater fields) as 'Name_2', 'Name_3', etc.
  const records = parse(csvContent, { columns: deduplicateColumns, skip_empty_lines: true, trim: true, bom: true });

  console.log(`\n  Entity:  ${ENTITY_TYPE}`);
  console.log(`  File:    ${CSV_FILE}`);
  console.log(`  Records: ${records.length}`);
  console.log(`  Table:   ${config.table}`);
  if (DRY_RUN) console.log('  DRY RUN - no data will be written\n');
  else console.log('');

  if (records.length === 0) { console.log('No records found.'); return; }

  const csvHeaders = Object.keys(records[0]);
  console.log('CSV header mapping:');
  csvHeaders.forEach(h => {
    const mapped = columnMap[h];
    console.log(`  "${h}" -> ${mapped ? `"${mapped}"` : '(skipped - no mapping)'}`);
  });
  console.log('');

  let inserted = 0, errors = 0;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const record of records) {
      try {
        const dbRow = {};
        const boolCols = BOOLEAN_FIELDS[ENTITY_TYPE];
        for (const [csvCol, val] of Object.entries(record)) {
          const dbCol = columnMap[csvCol];
          if (dbCol && val !== '' && val != null) {
            dbRow[dbCol] = boolCols?.has(dbCol) ? /^(yes|true|1)$/i.test(val) : val;
          }
        }

        if (config.idField && config.idPrefix && !dbRow[config.idField]) {
          dbRow[config.idField] = generateId(config.idPrefix);
        }
        if (!dbRow['entry_status']) dbRow['entry_status'] = 'active';

        if (config.createUser && dbRow['email'] && !DRY_RUN) {
          const existing = await client.query('SELECT id FROM users WHERE email = $1', [dbRow['email']]);
          let userId;
          if (existing.rows.length > 0) {
            userId = existing.rows[0].id;
          } else {
            const hash = await bcrypt.hash('Tutzlly@123', 12);
            const r = await client.query(
              `INSERT INTO users (user_id, username, email, password_hash, role, is_active)
               VALUES ($1,$2,$3,$4,$5,true) RETURNING id`,
              [generateId('USR'), dbRow['username'] || dbRow['email'].split('@')[0], dbRow['email'], hash, config.userRole]
            );
            userId = r.rows[0].id;
          }
          dbRow['user_id'] = userId;
        }

        const cols = Object.keys(dbRow);
        const vals = Object.values(dbRow);
        const ph = vals.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO ${config.table} (${cols.join(', ')}) VALUES (${ph}) ON CONFLICT DO NOTHING`;

        if (DRY_RUN) {
          console.log(`  [DRY] ${JSON.stringify(dbRow).substring(0, 100)}...`);
        } else {
          await client.query(sql, vals);
        }
        inserted++;
        if (inserted % 100 === 0) process.stdout.write(`  Progress: ${inserted}/${records.length}\r`);
      } catch (err) {
        errors++;
        console.error(`  ERROR row ${inserted + errors}: ${err.message}`);
        if (errors > 20) { console.error('  Too many errors, aborting.'); break; }
      }
    }

    if (!DRY_RUN) await client.query('COMMIT');
    else await client.query('ROLLBACK');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`\nDone! Inserted: ${inserted}  Errors: ${errors}`);
  if (config.createUser && !DRY_RUN && inserted > 0) {
    console.log(`Default password for all created users: Tutzlly@123`);
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
