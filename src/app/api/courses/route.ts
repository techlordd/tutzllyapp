import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

// Migration 019: replace global UNIQUE on course_code with per-academy composite unique
let courseMigrationDone = false;
async function ensureCourseConstraint() {
  if (courseMigrationDone) return;
  try {
    await query(`ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_course_code_key`);
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'courses' AND constraint_name = 'courses_course_code_academy_id_key'
        ) THEN
          ALTER TABLE courses ADD CONSTRAINT courses_course_code_academy_id_key UNIQUE (course_code, academy_id);
        END IF;
      END $$;
    `);
    courseMigrationDone = true;
  } catch { /* already applied */ courseMigrationDone = true; }
}

export async function GET(request: NextRequest) {
  await ensureCourseConstraint();
  try {
    const academyId = getAcademyId(request);
    const courses = await query(
      `SELECT * FROM courses
       WHERE entry_status != 'deleted' AND (academy_id = $1 OR $1 = 0)
       ORDER BY course_name ASC`,
      [academyId]
    );
    return NextResponse.json({ courses });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await ensureCourseConstraint();
  try {
    const data = await request.json();
    const academyId = getAcademyId(request);
    const course = await queryOne(
      `INSERT INTO courses (academy_id, course_name, course_code, entry_status)
       VALUES ($1, $2, $3, 'active') RETURNING *`,
      [academyId || null, data.course_name, data.course_code.toUpperCase()]
    );
    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    const rows = await query<{ id: number }>(
      `SELECT id FROM courses WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );
    await query(`DELETE FROM courses WHERE (academy_id = $1 OR $1 = 0)`, [academyId]);
    return NextResponse.json({ deleted: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete courses' }, { status: 500 });
  }
}
