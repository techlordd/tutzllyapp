import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const publicPaths = ['/login', '/api/auth', '/api/setup', '/api/branding/public', '/select-academy'];

// Uses jose (Edge-compatible) instead of jsonwebtoken — required for Vercel Edge Runtime
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Domain-based routing ──────────────────────────────────────────────────────────────
  // Parse hostname to extract a "domain slug" for branded subdomains
  // (brightminds.tutzlly.com → "brightminds") or custom domains
  // (portal.brightminds.com → "portal.brightminds.com").
  // Set NEXT_PUBLIC_ROOT_DOMAIN in Vercel env vars to activate;
  // when absent, no slug is produced (dev/localhost safety).
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '';
  const hostname = request.nextUrl.hostname;
  let domainSlug: string | null = null;
  if (rootDomain && hostname !== rootDomain
      && !hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
    domainSlug = hostname.endsWith(`.${rootDomain}`)
      ? hostname.slice(0, -(rootDomain.length + 1))   // wildcard subdomain
      : hostname;                                       // custom domain
  }

  if (publicPaths.some((p) => pathname.startsWith(p)) || pathname === '/') {
    // Forward domain hint to public routes (login API, /api/branding/public)
    if (!domainSlug) return NextResponse.next();
    const fwdHeaders = new Headers(request.headers);
    fwdHeaders.set('x-domain-hint', domainSlug);
    return NextResponse.next({ request: { headers: fwdHeaders } });
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    // API routes: return JSON 401 so fetch callers can handle it cleanly
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    if (domainSlug) loginUrl.searchParams.set('a', domainSlug);
    return NextResponse.redirect(loginUrl);
  }

  let role: string;
  let currentAcademyId: number | null = null;
  let isSuperAdmin = false;
  let academySubdomain: string | null = null;

  try {
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
    );
    const { payload } = await jwtVerify(token, secret);
    role = payload.role as string;
    currentAcademyId = (payload.current_academy_id as number) ?? null;
    isSuperAdmin = !!(payload.is_super_admin);
    academySubdomain = (payload.academy_subdomain as string) ?? null;
  } catch {
    const loginUrl = new URL('/login', request.url);
    if (domainSlug) loginUrl.searchParams.set('a', domainSlug);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('token');
    return response;
  }

  // Domain enforcement: if the request arrived via a branded subdomain or custom domain,
  // verify the user's JWT is for that same academy. A mismatch means the user is logged
  // into a different academy — redirect them to the login page for this domain.
  // Skipped when there is no domain slug (plain root domain or dev) or when the academy
  // hasn't configured a subdomain yet.
  if (domainSlug && academySubdomain && academySubdomain !== domainSlug) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('a', domainSlug);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('token');
    return response;
  }

  // Super admin role (platform-level): can only access /super-admin.
  // They must "switch academy" to get an admin-scoped token for /admin routes.
  if (role === 'super_admin') {
    if (!pathname.startsWith('/super-admin') && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/super-admin', request.url));
    }
    // Allow /super-admin and all API calls
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-role', role);
    requestHeaders.set('x-is-super-admin', '1');
    if (domainSlug) requestHeaders.set('x-domain-hint', domainSlug);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // If multi-academy is active and no academy selected, redirect to selector
  if (!currentAcademyId && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/select-academy', request.url));
  }

  // Standard role-based route protection
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

  // /super-admin routes: only super_admin role (already handled above) or
  // is_super_admin flag (legacy compat for session pre-separation)
  if (pathname.startsWith('/super-admin') && !isSuperAdmin) {
    return NextResponse.redirect(new URL(`/${role}`, request.url));
  }

  // Attach academy context to request headers for API routes
  const requestHeaders = new Headers(request.headers);
  if (currentAcademyId) {
    requestHeaders.set('x-academy-id', String(currentAcademyId));
  }
  requestHeaders.set('x-user-role', role);
  requestHeaders.set('x-is-super-admin', isSuperAdmin ? '1' : '0');
  if (domainSlug) requestHeaders.set('x-domain-hint', domainSlug);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
