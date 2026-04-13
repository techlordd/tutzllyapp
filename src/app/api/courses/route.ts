import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET() {
  try {
    const courses = await query(
      `SELECT * FROM courses WHERE entry_status != 'deleted' ORDER BY course_name ASC`
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
    const course = await queryOne(
      `INSERT INTO courses (course_name, course_code, entry_status)
       VALUES ($1, $2, 'active') RETURNING *`,
      [data.course_name, data.course_code.toUpperCase()]
    );
    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
