import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const message = await queryOne('SELECT * FROM messages_parent WHERE record_id = $1', [Number(id)]);
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if ((message.status as string)?.toLowerCase() !== 'read') {
    await queryOne(
      `UPDATE messages_parent SET status='read', last_updated=NOW() WHERE record_id=$1 RETURNING record_id`,
      [Number(id)]
    );
    message.status = 'read';
  }
  return NextResponse.json({ message });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();
  const result = await queryOne(
    `UPDATE messages_parent SET status=$1, last_updated=NOW() WHERE record_id=$2 RETURNING *`,
    [status, Number(id)]
  );
  return NextResponse.json({ message: result });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await queryOne(
    `UPDATE messages_parent SET entry_status='deleted', last_updated=NOW() WHERE record_id=$1`,
    [Number(id)]
  );
  return NextResponse.json({ success: true });
}
