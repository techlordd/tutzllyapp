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
