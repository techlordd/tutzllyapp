import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';
import { generateId } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    const classrooms = await query(
      `SELECT * FROM classrooms WHERE entry_status != 'deleted' AND (academy_id = $1 OR $1 = 0)
       ORDER BY timestamp DESC`,
      [academyId]
    );
    return NextResponse.json({ classrooms });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch classrooms' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const d = await request.json();
    const academyId = getAcademyId(request);
    const classroomId = d.classroom_id || generateId('CLS');
    const classroom = await queryOne(
      `INSERT INTO classrooms (academy_id, classroom_id, room_name, link, meeting_id, passcode, assigned_to, user_id, entry_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [academyId || null, classroomId, d.room_name, d.link || null, d.meeting_id || null,
       d.passcode || null, d.assigned_to || null, d.user_id || null, d.entry_status || 'active']
    );
    return NextResponse.json({ classroom }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create classroom' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    const rows = await query<{ record_id: number }>(
      `SELECT record_id FROM classrooms WHERE (academy_id = $1 OR $1 = 0)`,
      [academyId]
    );
    await query(`DELETE FROM classrooms WHERE (academy_id = $1 OR $1 = 0)`, [academyId]);
    return NextResponse.json({ deleted: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete classrooms' }, { status: 500 });
  }
}
