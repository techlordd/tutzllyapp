import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne } from './db';

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

export interface AcademyRole {
  academy_id: number;
  role: string;
  academy_name: string;
}

export interface TokenPayload {
  id: number;
  user_id: string;
  email: string;
  role: string; // active role in current_academy_id (kept for backward compat)
  roles: AcademyRole[];
  current_academy_id: number | null;
  is_super_admin: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Legacy single-academy token – kept for internal use in setup/import routes */
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, user_id: user.user_id, email: user.email, role: user.role,
      roles: [], current_academy_id: null, is_super_admin: false },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/** Full multi-academy token. Queries the DB for the user's academy roles. */
export async function generateFullToken(
  user: AuthUser,
  currentAcademyId?: number | null
): Promise<string> {
  const roleRows = await query<{ academy_id: number; role: string; academy_name: string }>(
    `SELECT uar.academy_id, uar.role, a.academy_name
     FROM user_academy_roles uar
     JOIN academies a ON a.id = uar.academy_id
     WHERE uar.user_id = $1 AND a.is_active = true
     ORDER BY uar.academy_id ASC`,
    [user.id]
  );

  const isSuperAdmin = !!(await queryOne<{ id: number }>(
    'SELECT id FROM super_admins WHERE user_id = $1',
    [user.id]
  ));

  // Resolve which academy is "active"
  let activeAcademyId: number | null = currentAcademyId ?? null;
  if (!activeAcademyId && roleRows.length > 0) {
    activeAcademyId = roleRows[0].academy_id;
  }

  const activeRole = roleRows.find(r => r.academy_id === activeAcademyId)?.role
    ?? (isSuperAdmin ? 'admin' : user.role);

  const payload: TokenPayload = {
    id: user.id,
    user_id: user.user_id,
    email: user.email,
    role: activeRole,
    roles: roleRows,
    current_academy_id: activeAcademyId,
    is_super_admin: isSuperAdmin,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getUserAcademyRoles(userId: number): Promise<AcademyRole[]> {
  return query<AcademyRole>(
    `SELECT uar.academy_id, uar.role, a.academy_name
     FROM user_academy_roles uar
     JOIN academies a ON a.id = uar.academy_id
     WHERE uar.user_id = $1 AND a.is_active = true
     ORDER BY uar.academy_id ASC`,
    [userId]
  );
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
