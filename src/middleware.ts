import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const publicPaths = ['/login', '/api/auth', '/api/setup', '/select-academy'];

// Uses jose (Edge-compatible) instead of jsonwebtoken — required for Vercel Edge Runtime
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p)) || pathname === '/') {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    // API routes: return JSON 401 so fetch callers can handle it cleanly
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  let role: string;
  let currentAcademyId: number | null = null;
  let isSuperAdmin = false;

  try {
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
    );
    const { payload } = await jwtVerify(token, secret);
    role = payload.role as string;
    currentAcademyId = (payload.current_academy_id as number) ?? null;
    isSuperAdmin = !!(payload.is_super_admin);
  } catch {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('token');
    return response;
  }

  // Super admin routes – only accessible to super admins
  if (pathname.startsWith('/super-admin') && !isSuperAdmin) {
    return NextResponse.redirect(new URL(`/${role}`, request.url));
  }

  // If multi-academy is active and no academy selected, redirect to selector
  // (allow super-admin and api routes to pass through)
  if (!currentAcademyId && !isSuperAdmin && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/select-academy', request.url));
  }

  // Standard role-based route protection (super admins bypass all role guards)
  if (!isSuperAdmin) {
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    if (pathname.startsWith('/tutor') && role !== 'tutor' && role !== 'admin') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    if (pathname.startsWith('/student') && role !== 'student' && role !== 'admin') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    if (pathname.startsWith('/parent') && role !== 'parent' && role !== 'admin') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
  }

  // Attach academy context to request headers for API routes
  const requestHeaders = new Headers(request.headers);
  if (currentAcademyId) {
    requestHeaders.set('x-academy-id', String(currentAcademyId));
  }
  requestHeaders.set('x-user-role', role);
  requestHeaders.set('x-is-super-admin', isSuperAdmin ? '1' : '0');

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
