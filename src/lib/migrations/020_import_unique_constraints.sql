-- Migration 020: Add unique constraints to class_activities and grade_book
-- to prevent duplicate records on CSV re-import.

-- ── class_activities ─────────────────────────────────────────────────────────
-- Each session (ssid) should produce exactly one activity log. Deduplicate by
-- keeping the highest record_id (most recently inserted) per ssid, then add
-- a unique constraint so future imports upsert instead of append.

DELETE FROM class_activities
WHERE ssid IS NOT NULL
  AND record_id NOT IN (
    SELECT MAX(record_id)
    FROM class_activities
    WHERE ssid IS NOT NULL
    GROUP BY ssid
  );

ALTER TABLE class_activities
  ADD CONSTRAINT uq_class_activities_ssid UNIQUE (ssid);

-- ── grade_book ────────────────────────────────────────────────────────────────
-- One grade entry per student-tutor-month-year per academy. Deduplicate first,
-- then enforce with a named constraint (required for ON CONFLICT ON CONSTRAINT).

DELETE FROM grade_book
WHERE record_id NOT IN (
  SELECT MAX(record_id)
  FROM grade_book
  GROUP BY student_id, tutor_id, month, year, academy_id
);

ALTER TABLE grade_book
  ADD CONSTRAINT uq_grade_book_student_tutor_period
  UNIQUE (student_id, tutor_id, month, year, academy_id);
