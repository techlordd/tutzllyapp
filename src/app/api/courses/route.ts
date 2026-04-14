import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

export async function GET(request: NextRequest) {
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
