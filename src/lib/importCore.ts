import 'server-only';
import { parse } from 'csv-parse/sync';
import type { PoolClient } from 'pg';
import { hashPassword } from '@/lib/auth';
import { generateId } from '@/lib/utils';

export const ENTITY_OPTIONS: { value: string; label: string; group: string }[] = [
  { value: 'tutors',           label: 'Tutors',                    group: 'People'   },
  { value: 'students',         label: 'Students',                  group: 'People'   },
  { value: 'parents',          label: 'Parents',                   group: 'People'   },
  { value: 'courses',          label: 'Courses',                   group: 'Academic' },
  { value: 'assignments',      label: 'Tutor Course Assignments',  group: 'Academic' },
  { value: 'enrollments',      label: 'Student Enrollments',       group: 'Academic' },
  { value: 'schedules',        label: 'Schedules',                 group: 'Sessions' },
  { value: 'sessions',         label: 'Sessions',                  group: 'Sessions' },
  { value: 'activities',       label: 'Class Activities',          group: 'Sessions' },
  { value: 'grades',           label: 'Grade Book',                group: 'Academic' },
  { value: 'messages_admin',   label: 'Messages (Admin)',          group: 'Messages' },
  { value: 'messages_parent',  label: 'Messages (Parent)',         group: 'Messages' },
  { value: 'messages_student', label: 'Messages (Student)',        group: 'Messages' },
  { value: 'messages_tutor',   label: 'Messages (Tutor)',          group: 'Messages' },
];

export interface ImportResult {
  inserted: number;
  skipped: number;
  errors: string[];
  log: string[];
  total: number;
  defaultPassword?: string;
}

function deduplicateColumns(headers: string[]): string[] {
  const seen: Record<string, number> = {};
  return headers.map(h => {
    const key = h.trim();
    if (!seen[key]) { seen[key] = 1; return key; }
    seen[key]++;
    return `${key}_${seen[key]}`;
  });
}

const BOOLEAN_FIELDS: Record<string, Set<string>> = {
  activities: new Set(['assigned_homework_from_prev', 'new_homework_assigned']),
};

// Columns that must be integers — fractional values (e.g. 1.5 hrs) are converted
// to whole minutes so existing INTEGER columns don't reject them.
const INTEGER_FIELDS: Record<string, Set<string>> = {
  sessions:  new Set(['session_duration']),
  schedules: new Set(['duration']),
};

// Hard truncation limits for VARCHAR columns that can receive very long strings.
// Values exceeding the limit are silently truncated to prevent insert errors.
const VARCHAR_MAX_LENGTH: Record<string, Record<string, number>> = {
  sessions:  { zoom_link: 500 },
  schedules: { zoom_link: 500 },
};

// DB columns that expect a DATE or TIMESTAMP value — non-date strings are coerced to null.
// Includes both legacy names (created_at/updated_at used by most tables) and the renamed
// timestamp columns (timestamp/last_updated) introduced in migrations 002-003.
const DATE_COLUMNS = new Set([
  'entry_date', 'start_session_date', 'end_session_date', 'reschedule_to',
  'class_activity_date', 'date_of_birth', 'message_date',
  'created_at', 'updated_at',
  'timestamp', 'last_updated',
  'date', 'assigned_date',
]);

// DB columns that expect a TIME value — non-time strings are coerced to null
const TIME_COLUMNS = new Set([
  'schedule_start_time', 'schedule_end_time', 'start_session_time', 'end_session_time',
  'reschedule_time', 'class_activity_time', 'message_time', 'session_start_time', 'session_end_time',
  'time',
]);

function isValidDate(val: string): boolean {
  if (!/^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(val)) return false;
  return !isNaN(Date.parse(val));
}

function isValidTime(val: string): boolean {
  return /^\d{1,2}:\d{2}(:\d{2})?(\s?(AM|PM))?$/i.test(val.trim());
}


/**
 * Returns true if all quoted fields in the string are closed (quote count is balanced).
 * Used to detect incomplete rows caused by unquoted newlines inside field values.
 */
function isQuoteBalanced(s: string): boolean {
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"') {
      if (inQuote && s[i + 1] === '"') {
        i++; // skip escaped quote ""
      } else {
        inQuote = !inQuote;
      }
    }
  }
  return !inQuote;
}


/**
 * Sanitizes unescaped internal quotes inside quoted CSV fields.
 * Strategy: for each quoted field, scan character by character.
 * - `""` → properly escaped, keep as-is
 * - `"` followed by `,` or end-of-row → closing quote, end field
 * - `"` followed by anything else → unescaped internal quote, escape to `""`
 * This implements the "first quote opens, last valid quote closes" logic
 * without needing to know the column count.
 */
function sanitizeFieldQuotes(row: string): string {
  let i = 0;
  let out = '';

  while (i < row.length) {
    if (row[i] === '"') {
      // Quoted field — scan until we find the real closing quote
      out += '"';
      i++; // skip opening quote

      while (i < row.length) {
        if (row[i] === '"') {
          if (i + 1 < row.length && row[i + 1] === '"') {
            // Properly escaped "" — keep and advance past both
            out += '""';
            i += 2;
          } else if (i + 1 >= row.length || row[i + 1] === ',' || row[i + 1] === '\n') {
            // Closing quote — followed by separator, end of row, or newline
            out += '"';
            i++;
            break;
          } else {
            // Unescaped internal quote — escape it
            out += '""';
            i++;
          }
        } else {
          out += row[i];
          i++;
        }
      }

      // Consume field separator if present
      if (i < row.length && row[i] === ',') {
        out += ',';
        i++;
      }
    } else if (row[i] === ',') {
      out += ',';
      i++;
    } else {
      out += row[i];
      i++;
    }
  }

  return out;
}

/**
 * Pre-processes raw CSV text by merging continuation lines that belong to
 * an open quoted field (e.g. multi-line message bodies, code pasted into a cell).
 * Without this, csv-parse with relax_column_count treats each physical line as a
 * separate row, producing hundreds of blank records.
 */
function preprocessCsv(rawText: string): string {
  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const output: string[] = [];
  let buffer = '';

  for (const line of lines) {
    buffer = buffer === '' ? line : buffer + '\n' + line;
    if (isQuoteBalanced(buffer)) {
      output.push(sanitizeFieldQuotes(buffer));
      buffer = '';
    }
  }
  if (buffer) output.push(sanitizeFieldQuotes(buffer));
  return output.join('\n');
}

export const COLUMN_MAPS: Record<string, Record<string, string>> = {
  tutors: {
    'Tutor ID': 'tutor_id', 'Tutor Username': 'username',
    'Tutor Email': 'email', 'Email': 'email',
    'Firstname': 'firstname', 'Surname': 'surname', 'Phone no': 'phone_no',
    'Sex': 'sex', 'Date of Birth': 'date_of_birth',
    'Address': 'address',
    'Address - Line 1': 'address_line_1', 'Address - Line 2': 'address_line_2',
    'Address - City': 'address_city', 'Address - State/Province': 'address_state_province',
    'Address - Zip/Postal': 'address_zip_postal', 'Address - Country': 'address_country',
    'Short Bio': 'short_bio', 'Pay Category': 'pay_category',
    'Salary (NGN)': 'salary', 'Payrate Per Hour (NGN)': 'payrate_per_hour',
    'Profile Image': 'profile_image',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
    'Timestamp': 'timestamp', 'Last Updated': 'last_updated',
    'Record Key': 'record_key', 'User Role': 'user_role',
  },
  students: {
    'StudentID': 'student_id', 'Enrollment ID': 'enrollment_id',
    'User Role': 'user_role',
    'Student Username': 'username',
    'Student Email': 'email', 'Email': 'email',
    'Student Password': 'password',
    'Firstname': 'firstname', 'Surname': 'surname',
    'Student Full Name (i4y29) - First Name': 'full_name_first_name',
    'Student Full Name (i4y29) - Last Name': 'full_name_last_name',
    'Phone no': 'phone_no', 'Sex': 'sex', 'Grade': 'grade', 'School': 'school',
    'Date of Birth': 'date_of_birth',
    "Mother's name": 'mothers_name', "Mother's email": 'mothers_email',
    "Father's name": 'fathers_name', "Father's email": 'fathers_email',
    'Address': 'address',
    'Address - Line 1': 'address_line_1', 'Address - Line 2': 'address_line_2',
    'Address - City': 'address_city', 'Address - State/Province': 'address_state_province',
    'Address - Zip/Postal': 'address_zip_postal', 'Address - Country': 'address_country',
    'Short Bio': 'short_bio', 'Profile Image': 'profile_image',
    'Status': 'status', 'Reason for Inactive': 'reason_for_inactive',
    'Timestamp': 'timestamp', 'Last Updated': 'last_updated',
    'Date': 'date', 'Time': 'time',
    'Key': 'record_key',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  parents: {
    'ParentID': 'parent_id', 'Parent Username': 'username',
    'Parent Email': 'email', 'Email': 'email',
    'Parent Password': 'password',
    'User ID': 'user_id',
    'Full Name (Optional) (i4y294) - First Name': 'full_name_first_name',
    'Full Name (Optional) (i4y294) - Last Name': 'full_name_last_name',
    'Phone no': 'phone_no', 'Sex': 'sex',
    'Date of Birth (Optional)': 'date_of_birth', 'Date of Birth': 'date_of_birth',
    'Address': 'address',
    'Address - Line 1': 'address_line_1', 'Address - Line 2': 'address_line_2',
    'Address - City': 'address_city', 'Address - State/Province': 'address_state_province',
    'Address - Zip/Postal': 'address_zip_postal', 'Address - Country': 'address_country',
    'Short Bio': 'short_bio', 'No of Students': 'no_of_students',
    'Student1': 'student1', 'StudentID1': 'student_id1',
    'Student2': 'student2', 'StudentID2': 'student_id2',
    'Student3': 'student3', 'StudentID3': 'student_id3',
    'Student4': 'student4', 'StudentID4': 'student_id4',
    'Student5': 'student5', 'StudentID5': 'student_id5',
    'Timestamp': 'timestamp', 'Last Updated': 'last_updated',
    'Key': 'record_key', 'ID': 'record_id',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  courses: {
    'Course Name': 'course_name', 'Course Code': 'course_code',
    'Course Name (DEPRECATED)': 'course_name_deprecated',
    'Course Code (DEPRECATED)': 'course_code_deprecated',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  assignments: {
    'Tutor Assign ID': 'tutor_assign_id',
    'TutorID': 'tutor_id', 'Tutor ID': 'tutor_id',
    'CourseID': 'course_code', 'Course ID': 'course_code', 'Course Code': 'course_code',
    'Course Name': 'course_name', 'Assign Course': 'course_name',
    'Tutor Name': 'tutor_name',
    'Tutor Email': 'tutor_email', 'Tutor email': 'tutor_email',
    'Tutor Username': 'tutor_username', 'User ID': 'tutor_username',
    'Tutor Sex': 'tutor_sex',
    'Assigned Date': 'assigned_date',
    'Status': 'status',
    'Notes': 'notes',
    'Timestamp': 'timestamp', 'Last Updated': 'last_updated',
    'Key': 'record_key', 'ID': 'record_id',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  enrollments: {
    'Assign ID': 'assign_id',
    'STUDENT ID': 'student_id', 'Student Name': 'student_name',
    'Confirm Student Sex': 'student_sex',
    'TUTOR ID': 'tutor_id', 'Tutor Name': 'tutor_name',
    'Confirm Tutor Username': 'tutor_username', 'Confirm Tutor Sex': 'tutor_sex',
    'Tutor Email': 'tutor_email',
    'Course (DEPRECATED)': 'course_name_deprecated',
    'COURSE': 'course_name', 'Course Code': 'course_code',
    'Course ID': 'course_code',
    'COURSE.1': 'course_name_2', 'Course Code.1': 'course_code_2',
    'Course ID.1': 'course_id_ref_2', 'Course (DEPRECATED).1': 'course_name_deprecated_2',
    'Timestamp': 'timestamp', 'Last Updated': 'last_updated',
    'Key': 'record_key', 'ID': 'record_id',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  schedules: {
    'Schedule ID': 'schedule_id', 'Student ID': 'student_id', 'Student Name': 'student_name',
    'Tutor ID': 'tutor_id', 'Tutor Name': 'tutor_name', 'Tutor Email': 'tutor_email',
    'Course': 'course_name', 'Course Code': 'course_code',
    'Course ID': 'course_code',
    'Year': 'year', 'Day': 'day', 'Sort ID': 'sort_id',
    'Duration': 'duration', 'Session Start Time': 'session_start_time',
    'Session End Time': 'session_end_time',
    'Time Zone (DEPRECATED)': 'time_zone_deprecated', 'Time Zone': 'time_zone',
    'Zoom Link': 'zoom_link', 'Meeting ID': 'meeting_id', 'Meeting Passcode': 'meeting_passcode',
    'Assign Status': 'assign_status',
    'Timestamp': 'timestamp', 'Last Updated': 'last_updated',
    'Key': 'record_key', 'ID': 'record_id',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  sessions: {
    'SSID': 'ssid',
    'Email Lookup (StudentID)': 'email_lookup_student_id',
    'Confirmation': 'confirmation',
    'Schedule ID (NEW)': 'schedule_id',
    'Entry Date': 'entry_date', 'Day': 'day',
    'Tutor ID': 'tutor_id',
    'Tutor Name (pf79t) - First Name': 'tutor_firstname',
    'Tutor Name (pf79t) - Last Name': 'tutor_lastname',
    'Student': 'student_name', 'Student ID': 'student_id', 'Student Email': 'student_email',
    'Course (NEW)': 'course_name',
    'Course ID': 'course_id_ref',
    'Schedule Start Time (NEW)': 'schedule_start_time',
    'Schedule End Time (NEW)': 'schedule_end_time',
    'Schedule Day': 'schedule_day',
    'Zoom Link': 'zoom_link', 'Meeting ID': 'meeting_id', 'Meeting Passcode': 'meeting_passcode',
    'Start Session Date': 'start_session_date',
    'Start Session Time': 'start_session_time',
    'Hidden Start Session Time': 'start_session_time',
    'Are you sure you want to start this session?': 'start_session_confirmation',
    'End Session Date': 'end_session_date', 'End Session Time': 'end_session_time',
    'Are you sure you want to end this session?': 'end_session_confirmation',
    'Session Duration': 'session_duration',
    'Reschedule To: (If Available)': 'reschedule_to',
    'Reschedule Time: (If Available)': 'reschedule_time',
    'Status (Admin)': 'status_admin',
    'Session Code Status': 'session_code_status',
    "Mother's Email": 'mothers_email', "Father's Email": 'fathers_email',
    // Missed Session 1
    'Session Missed ID': 'missed_session_id1',
    'Schedule ID': 'missed_schedule_id1',
    'Status': 'missed_status1',
    'Tutor ID.1': 'missed_tutor_id1',
    'Tutor Name (slzne) - First Name': 'missed_tutor_firstname1',
    'Tutor Name (slzne) - Last Name': 'missed_tutor_lastname1',
    'Student Name': 'missed_student_name1',
    'Course': 'missed_course1',
    'Course ID.1': 'missed_course_id1',
    'Session Code Status.1': 'missed_session_code_status1',
    // Missed Session 2
    'Session Missed ID.1': 'missed_session_id2',
    'Schedule ID.1': 'missed_schedule_id2',
    'Status.1': 'missed_status2',
    'Tutor ID.2': 'missed_tutor_id2',
    'Tutor Name (slzne2) - First Name': 'missed_tutor_firstname2',
    'Tutor Name (slzne2) - Last Name': 'missed_tutor_lastname2',
    'Student Name.1': 'missed_student_name2',
    'Course.1': 'missed_course2',
    'Course ID.2': 'missed_course_id2',
    'Session Code Status.2': 'missed_session_code_status2',
    // Record
    'Timestamp': 'timestamp', 'Last Updated': 'last_updated',
    'Key': 'record_key', 'ID': 'record_id',
    'Entry Status': 'entry_status', 'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
  activities: {
    'Tutor ID': 'tutor_id',
    'Tutor Name (c34n3) - First Name': 'tutor_firstname',
    'Tutor Name (c34n3) - Last Name': 'tutor_lastname',
    'Class Activity Date': 'class_activity_date',
    'Class Activity Time': 'class_activity_time',
    'SSID': 'ssid',
    'Student Name': 'student_name', 'Student ID': 'student_id',
    'Course': 'course_name',
    'Course ID': 'course_id_ref',
    'Session Code Status': 'session_code_status',
    "Mother's Email": 'mothers_email', "Father's Email": 'fathers_email',
    'Topic Taught': 'topic_taught',
    'Details of Class Activity': 'details_of_class_activity',
    'Activity': 'activity',
    'Assigned Homework from Previous Session?': 'assigned_homework_from_prev',
    'Status of Past Homework Review': 'status_of_past_homework_review',
    'New Homework Assigned for Current Session?': 'new_homework_assigned',
    'Topic of Homework assigned': 'topic_of_homework',
    'No Homework Why?': 'no_homework_why',
    'Did Student Complete Previous Homework?': 'did_student_complete_prev_homework',
    'Homework': 'homework1', 'Homework.1': 'homework2', 'Homework.2': 'homework3',
    'Student reason for not completing previous homework': 'student_reason_for_not_completing',
    'Did Student Joined Session on Time?': 'did_student_join_on_time',
    'Punctuality': 'punctuality1', 'Punctuality.1': 'punctuality2',
    'Student reason for not joining session on time?': 'student_reason_for_late',
    'Is student attentive in class?': 'is_student_attentive',
    'Attentiveness': 'attentiveness1', 'Attentiveness.1': 'attentiveness2', 'Attentiveness.2': 'attentiveness3',
    'Student engage in class?': 'student_engages_in_class',
    'Class Engagement': 'class_engagement1', 'Class Engagement.1': 'class_engagement2', 'Class Engagement.2': 'class_engagement3',
    "Tutor's General Observation": 'tutors_general_observation',
    "Tutor's Intervention/Action": 'tutors_intervention',
    'Any Helpful Link': 'helpful_link1', 'Any Helpful Link.1': 'helpful_link2', 'Any Helpful Link.2': 'helpful_link3',
    'Timestamp': 'timestamp', 'Last Updated': 'last_updated',
    'Key': 'record_key', 'ID': 'record_id',
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
    'Sender (ADMIN)': 'sender',
    'Sender (Student Name)': 'sender',
    'Sender (Student ID)': 'sender_student_id',
    'Lookup Student ID': 'lookup_student_id',
    'Sender (Parent Name)': 'sender',
    'Sender (Parent ID)': 'sender_parent_id',
    'RECIPIENT (Tutor Name)': 'recipient_tutor_name', 'Recipient (Tutor)': 'recipient_tutor_name',
    'RECIPIENT (Tutor ID)': 'recipient_tutor_id', 'Recipient (Tutor ID)': 'recipient_tutor_id',
    'RECIPIENT Email': 'recipient_email', 'Recipient Email': 'recipient_email',
    'Cc (optional)': 'cc',
    'Subject': 'subject', 'Body': 'body', 'Attach File (Optional)': 'attach_file',
    'Status': 'status', 'Entry Status': 'entry_status',
    'Timestamp': 'created_at', 'Last Updated': 'updated_at',
    'IP': 'ip', 'Created By': 'created_by', 'Updated By': 'updated_by',
  },
};

export interface EntityConfig {
  table: string;
  idField: string | null;
  idPrefix: string | null;
  createUser: boolean;
  userRole?: string;
  upsertOn?: string;         // column name for ON CONFLICT (...) DO UPDATE
  allowDuplicates?: boolean; // plain INSERT, no ON CONFLICT clause — all rows inserted
}

export const ENTITY_CONFIG: Record<string, EntityConfig> = {
  tutors:           { table: 'tutors',                   idField: 'tutor_id',        idPrefix: 'TUT', createUser: true,  userRole: 'tutor'   },
  students:         { table: 'students',                 idField: 'student_id',      idPrefix: 'STU', createUser: true,  userRole: 'student' },
  parents:          { table: 'parents',                  idField: 'parent_id',       idPrefix: 'PAR', createUser: true,  userRole: 'parent'  },
  courses:          { table: 'courses',                  idField: 'course_code',     idPrefix: null,  createUser: false },
  assignments:      { table: 'tutor_course_assignments', idField: 'tutor_assign_id', idPrefix: 'ASN', createUser: false, upsertOn: 'tutor_assign_id' },
  enrollments:      { table: 'student_enrollments',      idField: 'assign_id',       idPrefix: 'ENR', createUser: false, upsertOn: 'assign_id' },
  schedules:        { table: 'schedules',                idField: 'schedule_id',     idPrefix: 'SCH', createUser: false, upsertOn: 'schedule_id' },
  sessions:         { table: 'sessions',                 idField: null,              idPrefix: null,  createUser: false, allowDuplicates: true },
  activities:       { table: 'class_activities',         idField: null,              idPrefix: null,  createUser: false },
  grades:           { table: 'grade_book',               idField: null,              idPrefix: null,  createUser: false },
  messages_admin:   { table: 'messages_admin',           idField: null,              idPrefix: null,  createUser: false },
  messages_parent:  { table: 'messages_parent',          idField: null,              idPrefix: null,  createUser: false },
  messages_student: { table: 'messages_student',         idField: null,              idPrefix: null,  createUser: false },
  messages_tutor:   { table: 'messages_tutor',           idField: null,              idPrefix: null,  createUser: false },
};

export async function runImport(
  client: PoolClient,
  academyId: number,
  type: string,
  file: File,
): Promise<ImportResult> {
  const config = ENTITY_CONFIG[type];
  const columnMap = COLUMN_MAPS[type];

  const text = await file.text();
  const cleanedText = preprocessCsv(text);
  const records = parse(cleanedText, {
    columns: deduplicateColumns,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
    skip_records_with_error: true,
  }) as Record<string, string>[];

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];
  const log: string[] = [];

  if (records.length === 0) {
    log.push('[INFO] No records found in CSV');
    return { inserted: 0, skipped: 0, errors: [], log, total: 0 };
  }

  const csvHeaders = Object.keys(records[0]);
  const mappedHeaders = csvHeaders.filter(h => columnMap[h]);
  const unmappedHeaders = csvHeaders.filter(h => !columnMap[h]);
  log.push(`[INFO] Entity: ${type}  |  table: ${config.table}  |  rows: ${records.length}`);
  log.push(`[INFO] CSV columns: ${csvHeaders.length} total — ${mappedHeaders.length} mapped, ${unmappedHeaders.length} ignored`);
  if (unmappedHeaders.length > 0) {
    log.push(`[WARN] Ignored columns: ${unmappedHeaders.join(' | ')}`);
  }
  log.push('[INFO] Column mappings:');
  for (const h of mappedHeaders) {
    log.push(`       ${h}  =>  ${columnMap[h]}`);
  }
  log.push('[INFO] --- Row processing ---');

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    try {
      await client.query('SAVEPOINT sp');
      const dbRow: Record<string, unknown> = {};
      const boolCols = BOOLEAN_FIELDS[type];

      const intCols = INTEGER_FIELDS[type];
      const varcharLimits = VARCHAR_MAX_LENGTH[type];

      for (const [csvCol, val] of Object.entries(record)) {
        const dbCol = columnMap[csvCol];
        if (dbCol && val !== '' && val != null) {
          if (boolCols?.has(dbCol)) {
            dbRow[dbCol] = /^(yes|true|1)$/i.test(val);
          } else if (DATE_COLUMNS.has(dbCol)) {
            // DATE column: validate before passing to avoid type errors (e.g. "0")
            dbRow[dbCol] = isValidDate(val) ? val : null;
          } else if (TIME_COLUMNS.has(dbCol)) {
            // TIME column: validate before passing to avoid type errors (e.g. "0")
            dbRow[dbCol] = isValidTime(val) ? val : null;
          } else if (intCols?.has(dbCol) && /^-?\d+(\.\d+)?$/.test(val)) {
            // INTEGER column: convert fractional hours to whole minutes (e.g. 1.5 → 90)
            dbRow[dbCol] = Math.round(parseFloat(val) * 60);
          } else if (/^-?\d+(\.\d+)?$/.test(val)) {
            // Other numeric strings: pass as JS number so pg infers the correct type
            dbRow[dbCol] = parseFloat(val);
          } else if (varcharLimits?.[dbCol] && typeof val === 'string' && val.length > varcharLimits[dbCol]) {
            // Truncate strings that exceed the known VARCHAR column limit
            dbRow[dbCol] = val.slice(0, varcharLimits[dbCol]);
          } else {
            dbRow[dbCol] = val;
          }
        }
      }

      // Skip blank rows produced by relax_column_count (e.g. continuation lines of multi-line bodies)
      // Fields that are system-managed; a row with only these is treated as blank.
      // Includes both legacy timestamp names and the tutors-table names (migration 002).
      const SYSTEM_ONLY = new Set(['academy_id', 'entry_status', 'created_at', 'updated_at', 'ip', 'timestamp', 'last_updated']);
      const meaningfulCount = Object.keys(dbRow).filter(k => !SYSTEM_ONLY.has(k)).length;
      if (meaningfulCount === 0) {
        skipped++;
        log.push(`[SKIP] Row ${i + 1} — empty/continuation line, no mapped fields`);
        await client.query('RELEASE SAVEPOINT sp');
        continue;
      }

      if (config.idField && config.idPrefix && !dbRow[config.idField]) {
        dbRow[config.idField] = generateId(config.idPrefix);
      }
      if (!dbRow['entry_status']) dbRow['entry_status'] = 'active';

      dbRow['academy_id'] = academyId;

      let createdUserId: number | null = null;
      if (config.createUser && dbRow['email']) {
        const existing = await client.query<{ id: number }>(
          'SELECT id FROM users WHERE email = $1',
          [dbRow['email']]
        );
        let userId: number;
        if (existing.rows.length > 0) {
          userId = existing.rows[0].id;
        } else {
          const hash = await hashPassword('Tutzlly@123');
          const r = await client.query<{ id: number }>(
            `INSERT INTO users (user_id, username, email, password_hash, role, is_active)
             VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
            [
              generateId('USR'),
              dbRow['username'] || (dbRow['email'] as string).split('@')[0],
              dbRow['email'],
              hash,
              config.userRole,
            ]
          );
          userId = r.rows[0].id;
        }
        dbRow['user_id'] = userId;
        createdUserId = userId;
      }

      const cols = Object.keys(dbRow);
      const vals = Object.values(dbRow);
      const ph = vals.map((_, idx) => `$${idx + 1}`).join(', ');
      let sql: string;
      if (config.upsertOn) {
        const updateSet = cols
          .filter(c => c !== config.upsertOn)
          .map(c => `${c} = EXCLUDED.${c}`)
          .join(', ');
        sql = `INSERT INTO ${config.table} (${cols.join(', ')}) VALUES (${ph}) ON CONFLICT (${config.upsertOn}) DO UPDATE SET ${updateSet}`;
      } else if (config.allowDuplicates) {
        sql = `INSERT INTO ${config.table} (${cols.join(', ')}) VALUES (${ph})`;
      } else {
        sql = `INSERT INTO ${config.table} (${cols.join(', ')}) VALUES (${ph}) ON CONFLICT DO NOTHING`;
      }

      const result = await client.query(sql, vals);
      const rowKey = config.idField && dbRow[config.idField]
        ? String(dbRow[config.idField])
        : dbRow['email'] != null ? String(dbRow['email']) : `row-${i + 1}`;

      if ((result.rowCount ?? 0) === 0) {
        skipped++;
        log.push(`[SKIP] Row ${i + 1} | ${rowKey} — conflict, already exists`);
      } else {
        inserted++;
        log.push(`[OK]   Row ${i + 1} | ${rowKey}`);
        if (config.createUser && createdUserId && config.userRole) {
          await client.query(
            `INSERT INTO user_academy_roles (user_id, academy_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [createdUserId, academyId, config.userRole]
          );
        }
      }
      await client.query('RELEASE SAVEPOINT sp');
    } catch (err) {
      try { await client.query('ROLLBACK TO SAVEPOINT sp'); } catch { /* ignore */ }
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`Row ${i + 1}: ${errMsg}`);
      log.push(`[ERR]  Row ${i + 1} | ${errMsg}`);
      if (errors.length >= 20) {
        errors.push('Stopped after 20 errors.');
        log.push('[ERR]  Stopped processing after 20 errors.');
        break;
      }
    }
  }

  log.push(`[INFO] Summary — inserted: ${inserted}, skipped: ${skipped}, errors: ${errors.length}, total: ${records.length}`);

  return {
    inserted,
    skipped,
    errors,
    log,
    total: records.length,
    defaultPassword: config.createUser ? 'Tutzlly@123' : undefined,
  };
}
