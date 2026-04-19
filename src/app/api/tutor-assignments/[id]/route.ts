import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const academyId = getAcademyId(request);
    const assignment = await queryOne(
      `UPDATE tutor_course_assignments
       SET tutor_name=$1, tutor_username=$2, tutor_email=$3,
           course_name=$4, course_code=$5, assigned_date=$6,
           status=$7, notes=$8, last_updated=NOW()
       WHERE tutor_assign_id=$9 AND (academy_id=$10 OR $10=0) AND entry_status!='deleted'
       RETURNING *`,
      [data.tutor_name, data.tutor_username, data.tutor_email,
       data.course_name, data.course_code, data.assigned_date || null,
       data.status || 'active', data.notes || null, id, academyId]
    );
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    return NextResponse.json({ assignment });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const academyId = getAcademyId(request);
    const assignment = await queryOne(
      `UPDATE tutor_course_assignments SET entry_status='deleted', last_updated=NOW()
       WHERE tutor_assign_id=$1 AND (academy_id=$2 OR $2=0) AND entry_status!='deleted'
       RETURNING tutor_assign_id`,
      [id, academyId]
    );
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}
