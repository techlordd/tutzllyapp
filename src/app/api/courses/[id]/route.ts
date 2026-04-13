import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const course = await queryOne(
      `UPDATE courses SET course_name=$1, course_code=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [data.course_name, data.course_code.toUpperCase(), id]
    );
    return NextResponse.json({ course });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query(`UPDATE courses SET entry_status='deleted', updated_at=NOW() WHERE id=$1`, [id]);
    return NextResponse.json({ message: 'Course deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
