import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne } from './db';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRY = '7d';

export interface AuthUser {
  id: number;
  user_id: string;
  username: string;
  email: string;
  role: 'admin' | 'tutor' | 'student' | 'parent';
  is_active: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, user_id: user.user_id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyToken(token: string): { id: number; user_id: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; user_id: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  return queryOne<AuthUser>(
    'SELECT id, user_id, username, email, role, is_active FROM users WHERE email = $1 AND is_active = true',
    [email]
  );
}

export async function getUserById(id: number): Promise<AuthUser | null> {
  return queryOne<AuthUser>(
    'SELECT id, user_id, username, email, role, is_active FROM users WHERE id = $1',
    [id]
  );
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const user = await queryOne<AuthUser & { password_hash: string }>(
    'SELECT id, user_id, username, email, role, is_active, password_hash FROM users WHERE email = $1',
    [email]
  );
  if (!user || !user.is_active) return null;
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return null;
  const { password_hash: _, ...authUser } = user;
  return authUser as AuthUser;
}
