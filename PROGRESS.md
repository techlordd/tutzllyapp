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

**Sessions CSV import — value too long errors:**
- Widened all string columns in `sessions` table from `VARCHAR(50/100/255)` → `TEXT` in both `src/lib/schema.sql` and `src/app/api/setup/route.ts` (took 3 rounds as errors surfaced row by row)
- Affected columns: `ssid`, `schedule_id`, `tutor_id`, `tutor_firstname`, `tutor_lastname`, `student_id`, `student_name`, `student_email`, `course_name`, `meeting_id`, `meeting_passcode`, `session_code_status`, `mothers_email`, `fathers_email`, all `missed_*` fields, `created_by`, `updated_by`

**Sessions CSV import — B-tree index size error:**
- After TEXT conversion, B-tree indexes failed with "index row size 4208 exceeds maximum 2704"
- Fixed by switching `idx_sessions_student_id`, `idx_sessions_tutor_id`, `idx_sessions_ssid` from B-tree → `HASH` indexes in `schema.sql` and `setup/route.ts`

**Sessions count inaccuracy (5330 shown vs 7631 imported):**
- Dashboard was fetching all session rows and counting `.length` — large payloads were truncated
- Added `?count=true` to `GET /api/sessions` which runs `SELECT COUNT(student_id)` directly
- Admin dashboard (`src/app/(dashboard)/admin/page.tsx`) updated to use `/api/sessions?count=true`

**Commits:**
- `794f015` — Initial VARCHAR widening (sessions)
- `31cf696` — Convert remaining VARCHAR(255) → TEXT
- `c94af93` — Convert remaining VARCHAR(100) → TEXT
- `35c909b` — HASH indexes on sessions TEXT columns
- `dabc36c` — Accurate sessions count via COUNT(student_id)

**Status:** Sessions CSV import fully working. All 7631 records visible on dashboard.

---

## Known Patterns / Gotchas
- Always run `/api/setup` after deploying schema changes to apply DB migrations
- All sessions string columns are `TEXT` — do not reintroduce VARCHAR limits
- HASH indexes used on sessions TEXT ID columns (`student_id`, `tutor_id`, `ssid`) — B-tree cannot handle large TEXT values
- Sessions stat card uses `?count=true` — do NOT revert to `.length` on full fetch
- Soft deletes only: `entry_status = 'deleted'` (never hard delete)
- Multi-academy scoping: all queries use `academy_id = $1 OR $1 = 0` (super_admin bypass)
