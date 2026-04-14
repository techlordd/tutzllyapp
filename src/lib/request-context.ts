import type { NextRequest } from 'next/server';

/**
 * Extract the academy_id set by middleware (x-academy-id header).
 * Returns 0 if the header is missing — callers should treat 0 as "unauthenticated".
 */
export function getAcademyId(request: NextRequest): number {
  return parseInt(request.headers.get('x-academy-id') || '0', 10);
}

export function getIsSuperAdmin(request: NextRequest): boolean {
  return request.headers.get('x-is-super-admin') === '1';
}

export function getUserRole(request: NextRequest): string {
  return request.headers.get('x-user-role') || '';
}
