import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { runImport, ENTITY_CONFIG, COLUMN_MAPS } from '@/lib/importCore';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
  }
  const academyId: number = payload.current_academy_id ?? 0;
  if (!academyId) {
    return NextResponse.json({ error: 'No academy context. Please select an academy first.' }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const type = formData.get('type') as string | null;
  const file = formData.get('file') as File | null;

  if (!type || !file) {
    return NextResponse.json({ error: 'Both "type" and "file" fields are required' }, { status: 400 });
  }
  if (!ENTITY_CONFIG[type] || !COLUMN_MAPS[type]) {
    return NextResponse.json({ error: `Unknown entity type: "${type}"` }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await runImport(client, academyId, type, file);
    await client.query('COMMIT');
    return NextResponse.json(result);
  } catch (err) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Transaction failed', details: String(err) }, { status: 500 });
  } finally {
    client.release();
  }
}
