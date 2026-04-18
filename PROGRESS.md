# Tutzlly App — Progress Log

## Project
Full-stack tutoring management platform (Next.js 16, React 19, TypeScript, PostgreSQL).
Live URL: https://awafims.xyz
Repo: github.com/techlordd/tutzllyapp (branch: main)
Deployed on Vercel. After each deploy, run setup endpoint to apply DB migrations:
```
curl -X POST https://awafims.xyz/api/setup -H "x-setup-secret: <secret in env>"
```

---

## Session Log

### April 18, 2026

**Sessions CSV import — value too long errors (iterative, 3 rounds):**
- Widened all string columns in `sessions` table from `VARCHAR(50/100/255)` → `TEXT` in both `src/lib/schema.sql` and `src/app/api/setup/route.ts`
- Affected: `ssid`, `schedule_id`, `tutor_id`, `tutor_firstname`, `tutor_lastname`, `student_id`, `student_name`, `student_email`, `course_name`, `meeting_id`, `meeting_passcode`, `session_code_status`, `mothers_email`, `fathers_email`, all `missed_*` fields, `created_by`, `updated_by`

**Sessions CSV import — B-tree index size error:**
- After TEXT conversion, B-tree indexes failed: "index row size 4208 exceeds maximum 2704"
- Fixed: switched `idx_sessions_student_id`, `idx_sessions_tutor_id`, `idx_sessions_ssid` → `HASH` indexes in `schema.sql` and `setup/route.ts`

**Sessions dashboard count inaccuracy:**
- Was fetching all rows and counting `.length` — large payloads truncated
- Added `?count=true` to `GET /api/sessions` → runs `SELECT COUNT(*)`
- Also returns `total_including_deleted` for debugging
- Admin dashboard (`src/app/(dashboard)/admin/page.tsx`) uses `/api/sessions?count=true`

**Sessions upsert → plain INSERT (resolved duplicate SSID count issue):**
- CSV has 7631 rows; 2302 have duplicate SSIDs — previous upsert on `ssid` collapsed these to 5329 unique rows
- Goal: store all 7631 rows as-is (row count reflects actual import volume)
- Removed `UNIQUE` constraint from `ssid` column in `schema.sql`
- Removed `upsertOn: 'ssid'` from sessions `ENTITY_CONFIG`
- Added `allowDuplicates: true` to sessions `ENTITY_CONFIG` → uses plain `INSERT` (no `ON CONFLICT` clause)
- Setup migration now uses a `DO $$` PL/pgSQL block to find and drop any UNIQUE constraint on `ssid` by name pattern (robust — works regardless of what Postgres named the constraint)
- Result: 7631 inserted, 0 skipped. Dashboard count = 7631. ✅

**Ignored CSV columns — mappings added:**
- Full ignored-column list retrieved from import log
- Added missing mappings to `COLUMN_MAPS.sessions` in `importCore.ts`:
  - `Schedule ID` → `schedule_id` (alt of `Schedule ID (NEW)`)
  - `Student Name` → `student_name` (alt of `Student`)
  - `Course` → `course_name` (alt of `Course (NEW)`)
  - `Schedule Start/End Time (NEW)` → `schedule_start_time` / `schedule_end_time`
  - `Schedule Day` → `schedule_day`
  - `Start Session Time` → `start_session_time` (alt of `Hidden Start Session Time`)
  - `Reschedule To: (If Available)` → `reschedule_to`
  - `Reschedule Time: (If Available)` → `reschedule_time`
  - `Timestamp` → `created_at`
  - `Last Updated` → `updated_at`
- Intentionally ignored (safe): `Course ID` / `User ID` (INTEGER FKs, unsafe), `Confirmation`, `Email Lookup`, `Are you sure...` (form-only), `.1`/`.2` deduplicated duplicates

**`DELETE /api/sessions` endpoint:**
- Admin-only endpoint to wipe all sessions for an academy before a fresh reimport
- Returns `{ deleted: <count> }`

**Commits (April 18):**
- `794f015` — Initial VARCHAR widening (sessions)
- `31cf696` — Convert remaining VARCHAR(255) → TEXT
- `c94af93` — Convert remaining VARCHAR(100) → TEXT
- `35c909b` — HASH indexes on sessions TEXT columns
- `dabc36c` — Count sessions via COUNT(student_id)
- `759d497` — Switch to COUNT(*) for full row count
- `03bd4db` — Add PROGRESS.md to repo
- `d169d2c` — Upsert sessions on reimport + DELETE endpoint to clear sessions
- `1724ead` — Debug: expose total_including_deleted in sessions count
- `ee47214` — Map missing sessions CSV columns (schedule_day, alternate time fields, created_at/updated_at)
- `2633eb1` — Remove ssid UNIQUE constraint; sessions use plain INSERT
- `630d525` — allowDuplicates flag in EntityConfig; robust DO $$ constraint drop in setup

**Status:** Sessions fully importable. 7631 rows in DB. Dashboard count accurate. All known ignored columns resolved. ✅

---

## Known Patterns / Gotchas
- Always run `/api/setup` after deploying schema changes to apply DB migrations
- All sessions string columns are `TEXT` — do not reintroduce VARCHAR limits
- HASH indexes used on sessions TEXT ID columns (`student_id`, `tutor_id`, `ssid`) — B-tree cannot handle large TEXT values
- Sessions stat card uses `?count=true` returning `{ count, total_including_deleted }` — do NOT revert to `.length` on full fetch
- Sessions `ssid` has NO unique constraint — duplicate SSIDs are stored as separate rows (all 7631 CSV rows preserved)
- Sessions import uses `allowDuplicates: true` → plain `INSERT`, no `ON CONFLICT` — do NOT add upsertOn or ON CONFLICT back
- `DELETE /api/sessions` endpoint exists (admin-only) to wipe all sessions before a fresh reimport
- Reimport workflow: POST /api/setup → DELETE /api/sessions → upload CSV via import page
- `Course ID` / `User ID` CSV columns are intentionally NOT mapped (INTEGER FKs, not safe to import as strings)
- Soft deletes only: `entry_status = 'deleted'` (never hard delete)
- Multi-academy scoping: all queries use `academy_id = $1 OR $1 = 0` (super_admin bypass)

---

### April 18, 2026 (continued — CSV pipeline, message tables, UI)

**Class activities — VARCHAR→TEXT:**
- All string columns in `class_activities` widened to `TEXT` in `schema.sql` and `setup/route.ts`
- `DELETE /api/activities` endpoint added (hard delete all for academy, admin-only)

**Grade book — VARCHAR→TEXT:**
- All string columns in `grade_book` widened to `TEXT` in `schema.sql` and `setup/route.ts`
- Affected: `tutor_id`, `student_id`, `tutor_name`, `student_name`, `course_name`, `month`, `year`, `grade_code_status`, `created_by`, `updated_by`
- `DELETE /api/grades` endpoint added (hard delete all for academy, admin-only)

**Message tables (admin/parent/student/tutor) — schema fixes:**
- All 4 message tables: every `VARCHAR` column widened to `TEXT` in `schema.sql` and `setup/route.ts`
- Affected per table: `role`, `sender`, `subject`, `cc`, `attach_file`, all `*_name`/`*_id`/`*_email` fields, `created_by`, `updated_by`
- `ADD COLUMN IF NOT EXISTS academy_id INTEGER` migration applied to all 4 tables (was missing)
- `DELETE` endpoint added to all 4 message routes (hard delete all for academy)

**Message tables — GET route fixes (blank tables bug):**
- All 4 GET routes were missing `academy_id` filter → returned empty results
- Fixed: `WHERE entry_status != 'deleted' AND (academy_id = $1 OR $1 = 0)` applied to all 4
- Added sort `ORDER BY message_date DESC, message_time DESC, created_at DESC`
- Added missing `getAcademyId` import to all 4 routes

**Message UI (admin + all roles):**
- Added `resolveSender()` helper: tries `sender_admin → sender_tutor_name → sender_student_name → sender_parent_name → sender → tutor_name → student_name → parent_name → '—'`
- Added `resolveRecipient()` helper: tries all recipient columns across role schemas
- Columns: Date, Time, Sender, Subject, Recipient, Status + Eye (view) action
- View modal: shows Subject, From, To, Date, Time, Cc (if present), Body
- **Delete All UI**: red danger button, modal requires typing `DELETE` to confirm, calls `DELETE /api/messages/[role]`, refreshes table
- Applied to all 4 role message pages (admin, tutor, student, parent)

**CSV pipeline — multi-line field handling (`preprocessCsv`):**
- Problem: message bodies containing newlines (VBA code, HTML, multi-paragraph text) caused csv-parse to treat each physical line as a separate row → hundreds of blank rows inserted
- Solution: `preprocessCsv()` function in `importCore.ts` — buffers physical lines until all opened quote fields are closed (`isQuoteBalanced()` check), then emits a single complete logical row
- Applied to all CSV text before being sent to csv-parse

**CSV pipeline — blank row guard (`meaningfulCount`):**
- After `relax_column_count`, some all-null rows still slipped through
- Added guard: skip any row where all non-system columns (`academy_id`, `entry_status`, `created_at`, `updated_at`, `ip`) are empty/null
- Logged as `[SKIP] Row N — empty/continuation line, no mapped fields`

**CSV pipeline — unescaped internal quotes (`sanitizeFieldQuotes`):**
- Problem: CSV fields containing HTML (e.g. `<a href="url">`) or raw strings with unescaped `"` caused csv-parse parse errors
- Solution: `sanitizeFieldQuotes(row)` scans each row character by character, field by field:
  - `""` (escaped) → keep
  - `"` followed by `,`, `\n`, or end-of-row → treat as closing quote
  - `"` followed by anything else → unescaped internal quote → escape to `""`
- Applied inside `preprocessCsv()` on each completed logical row before csv-parse processes it

**CSV pipeline — time/date coercion order bug (fix):**
- Problem: `"0"` in a `message_time` column matched the generic numeric regex (`/^-?\d+(\.\d+)?$/`) before reaching the `TIME_COLUMNS` branch → passed as JS number `0` → PostgreSQL rejected: `invalid input syntax for type time: "0"`
- Fix: moved `DATE_COLUMNS` and `TIME_COLUMNS` checks to run **before** the numeric detection checks in `importCore.ts` type coercion chain
- Now any value in a time/date column is validated by `isValidTime()`/`isValidDate()` first; bare numbers like `"0"` are coerced to `null`

**COLUMN_MAPS additions (`messages_tutor`):**
- `Recipient (Tutor)` → `recipient_tutor_name`
- `Recipient (Tutor ID)` → `recipient_tutor_id`
- `Recipient Email` → `recipient_tutor_email`
- `Timestamp` → `created_at`
- `Last Updated` → `updated_at`

**Commits (this session continued):**
- `8c5b5d4` — Widen class_activities columns to TEXT; add DELETE endpoint
- `33b89df` — (multiple) message table TEXT widening, academy_id migration, GET fixes, Delete All UI
- `1cb4801` — CSV cleaner: sanitizeFieldQuotes for unescaped internal quotes
- `1ba6e71` — Fix: check DATE/TIME columns before numeric coercion to prevent type errors

**Status:** All 5 entity types (sessions, activities, grades, messages×4) fully importable. Message tables display correctly. CSV pipeline handles multi-line fields, blank rows, unescaped quotes, and invalid time/date values. ✅

---

## Known Patterns / Gotchas (updated)
- DATE/TIME column coercion must run BEFORE generic numeric coercion — order matters in importCore.ts
- `preprocessCsv` + `sanitizeFieldQuotes` must both stay in the pipeline — do not remove
- All message tables now have `academy_id` column — do not drop it
- All 4 message GET routes filter by `academy_id` — do not remove that WHERE clause
- `DELETE /api/activities`, `DELETE /api/grades`, `DELETE /api/messages/[role]` — all hard delete (intentional; used for reimport workflow)
- Session memory: reimport workflow is POST /api/setup → DELETE entity → upload CSV
