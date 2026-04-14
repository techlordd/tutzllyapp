import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { runImport, ENTITY_CONFIG, COLUMN_MAPS } from '@/lib/importCore';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || !payload.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden: super admin access required' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const type = formData.get('type') as string | null;
  const file = formData.get('file') as File | null;
  const academyIdRaw = formData.get('academy_id') as string | null;

  if (!type || !file || !academyIdRaw) {
    return NextResponse.json({ error: '"type", "file", and "academy_id" are required' }, { status: 400 });
  }
  if (!ENTITY_CONFIG[type] || !COLUMN_MAPS[type]) {
    return NextResponse.json({ error: `Unknown entity type: "${type}"` }, { status: 400 });
  }

  const academyId = parseInt(academyIdRaw, 10);
  if (!Number.isFinite(academyId) || academyId <= 0) {
    return NextResponse.json({ error: 'Invalid academy_id' }, { status: 400 });
  }

  const academyRows = await pool.query<{ id: number }>(
    'SELECT id FROM academies WHERE id = $1 AND is_active = true',
    [academyId]
  );
  if (academyRows.rows.length === 0) {
    return NextResponse.json({ error: 'Academy not found or inactive' }, { status: 404 });
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
