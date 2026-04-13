import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  console.log('Initializing Tutzlly Academy database...');

  // Run schema
  const schemaPath = join(__dirname, '../src/lib/schema.sql');
  const schema = readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('✓ Schema applied');

  // Create admin user
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Tutzlly1!';
  const hashed = await bcrypt.hash(adminPassword, 12);

  await pool.query(`
    INSERT INTO users (id, user_id, username, email, password_hash, role, is_active, created_at)
    VALUES (gen_random_uuid(), 'ADM-001', 'admin', 'admin@tutzllyacademy.com', $1, 'admin', true, NOW())
    ON CONFLICT (email) DO NOTHING
  `, [hashed]);

  console.log('✓ Admin user created');
  console.log('  Email: admin@tutzllyacademy.com');
  console.log('  Password:', adminPassword);
  console.log('\nDatabase initialization complete!');

  await pool.end();
}

initDb().catch(err => {
  console.error('Error initializing database:', err);
  process.exit(1);
});
