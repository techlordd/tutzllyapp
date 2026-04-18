import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const academyId = getAcademyId(request);
    const assignment = await queryOne(
      `UPDATE tutor_course_assignments SET entry_status='deleted', updated_at=NOW()
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
