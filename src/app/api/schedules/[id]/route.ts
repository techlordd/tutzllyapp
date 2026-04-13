import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const schedule = await queryOne(`SELECT * FROM schedules WHERE schedule_id = $1`, [id]);
    if (!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const schedule = await queryOne(
      `UPDATE schedules SET day=$1, session_start_time=$2, session_end_time=$3, duration=$4,
       time_zone=$5, zoom_link=$6, meeting_id=$7, meeting_passcode=$8, assign_status=$9, updated_at=NOW()
       WHERE schedule_id=$10 RETURNING *`,
      [data.day, data.session_start_time, data.session_end_time, data.duration,
       data.time_zone, data.zoom_link, data.meeting_id, data.meeting_passcode, data.assign_status, id]
    );
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query(`UPDATE schedules SET entry_status='deleted', updated_at=NOW() WHERE schedule_id=$1`, [id]);
    return NextResponse.json({ message: 'Schedule deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
