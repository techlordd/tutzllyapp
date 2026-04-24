import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await queryOne(`SELECT * FROM sessions WHERE ssid = $1`, [id]);
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ session });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    // Coerce empty strings to null so PostgreSQL doesn't fail casting '' to NUMERIC/TIME/DATE
    const n = (v: unknown) => (v === '' || v === undefined ? null : v);
    const duration = data.session_duration === '' || data.session_duration == null
      ? null
      : Number(data.session_duration);
    const session = await queryOne(
      `UPDATE sessions SET status=$1, start_session_date=$2, start_session_time=$3,
       end_session_date=$4, end_session_time=$5, session_duration=$6, reschedule_to=$7,
       reschedule_time=$8, status_admin=$9, session_code_status=$10, last_updated=NOW()
       WHERE ssid=$11 RETURNING *`,
      [n(data.status), n(data.start_session_date), n(data.start_session_time),
       n(data.end_session_date), n(data.end_session_time), duration,
       n(data.reschedule_to), n(data.reschedule_time),
       n(data.status_admin), n(data.session_code_status), id]
    );
    return NextResponse.json({ session });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
