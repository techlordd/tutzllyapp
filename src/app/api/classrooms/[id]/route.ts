import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const classroom = await queryOne(
      `SELECT * FROM classrooms WHERE record_id = $1`,
      [Number(id)]
    );
    if (!classroom) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ classroom });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch classroom' }, { status: 500 });
  }
}
