import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// Only callable in development. On Vercel production use your DB provider's
// SQL console to run src/lib/schema.sql directly.
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Setup endpoint is disabled in production. Run schema.sql manually via your database provider.' }, { status: 403 });
  }

  try {
    const schemaPath = join(process.cwd(), 'src', 'lib', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    await query(schema);

    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Tutzlly1!';
    const hashed = await hashPassword(adminPassword);

    await query(`
      INSERT INTO users (user_id, username, email, password_hash, role, is_active, created_at)
      VALUES ('ADM-001', 'admin', 'admin@tutzllyacademy.com', $1, 'admin', true, NOW())
      ON CONFLICT (email) DO NOTHING
    `, [hashed]);

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      admin: {
        email: 'admin@tutzllyacademy.com',
        note: 'Password is stored in ADMIN_PASSWORD env var or default was used',
      },
    });
  } catch (err) {
    console.error('DB init error:', err);
    return NextResponse.json({ error: 'Failed to initialize database', details: String(err) }, { status: 500 });
  }
}
