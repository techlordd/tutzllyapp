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

**Sessions upsert on reimport:**
- Added `upsertOn: 'ssid'` to sessions `ENTITY_CONFIG` in `importCore.ts`
- Import now does `ON CONFLICT (ssid) DO UPDATE SET ...` instead of `DO NOTHING`
- Added `DELETE /api/sessions` endpoint (admin-only) to wipe all sessions for an academy before full reimport

**Sessions count reality check:**
- DB has 5329 unique sessions (confirmed via `COUNT(*)` and `total_including_deleted`)
- CSV has 7631 rows but 2302 are duplicate SSIDs — upsert merges them (last value wins)
- "7631 imported successfully" = upserts counted as success, which is correct

**Ignored columns during import (PENDING — needs fix next session):**
- Import log shows WARN for ignored CSV columns e.g. `Email Lookup (StudentID)`, `Confirmation`, `Course ID`, `Schedule Day`, etc.
- Need to get full list from the import log and add mappings for any that have real DB columns
- `Course ID` → likely maps to `course_id`; `Schedule Day` → `schedule_day`
- Form-only fields like `Confirmation`, `Email Lookup` can be safely ignored

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

**Status:** Sessions CSV fully importable. 5329 unique sessions in DB. Dashboard count accurate.

**Next steps:**
1. Get full ignored-columns list from import log
2. Add missing CSV → DB column mappings in `importCore.ts` sessions map (e.g. `Course ID` → `course_id`, `Schedule Day` → `schedule_day`)
3. Re-import sessions after column map fix to populate missing fields

---

## Known Patterns / Gotchas
- Always run `/api/setup` after deploying schema changes to apply DB migrations
- All sessions string columns are `TEXT` — do not reintroduce VARCHAR limits
- HASH indexes used on sessions TEXT ID columns (`student_id`, `tutor_id`, `ssid`) — B-tree cannot handle large TEXT values
- Sessions stat card uses `?count=true` returning `{ count, total_including_deleted }` — do NOT revert to `.length` on full fetch
- Sessions import uses upsert on `ssid` — safe to reimport full CSV anytime
- `DELETE /api/sessions` endpoint exists (admin-only) to wipe all sessions before a fresh reimport
- 5329 unique SSIDs in DB from a 7631-row CSV — 2302 rows are duplicate SSIDs, upsert merges them
- Soft deletes only: `entry_status = 'deleted'` (never hard delete)
- Multi-academy scoping: all queries use `academy_id = $1 OR $1 = 0` (super_admin bypass)
