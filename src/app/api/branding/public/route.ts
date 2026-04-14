import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

/**
 * GET /api/branding/public?a=ACADEMY_SLUG
 *
 * Public endpoint — no auth required.
 * Returns a safe subset of branding fields so the login page can apply the
 * academy’s colours / logo before the user has authenticated.
 *
 * Lookup priority:
 *   1. ?a=SLUG          → match on the academy_id VARCHAR column (e.g. “ACM-DEFAULT”)
 *   2. x-domain-hint   → match on subdomain or custom_domain column
 *      (set by middleware when the request arrived via a branded domain)
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('a');
  const domainHint = request.headers.get('x-domain-hint');

  if (!slug && !domainHint) {
    return NextResponse.json({ error: 'Missing ?a= parameter' }, { status: 400 });
  }

  type BrandingRow = {
    academy_name: string;
    primary_color: string | null;
    secondary_color: string | null;
    logo_url: string | null;
    login_bg_url: string | null;
    login_tagline: string | null;
  };

  try {
    let academy: BrandingRow | null = null;

    if (slug) {
      academy = await queryOne<BrandingRow>(
        `SELECT academy_name, primary_color, secondary_color, logo_url, login_bg_url, login_tagline
         FROM academies
         WHERE academy_id = $1 AND is_active = true
         LIMIT 1`,
        [slug]
      );
    } else {
      // Fallback: branded subdomain (e.g. "brightminds") or full custom domain
      academy = await queryOne<BrandingRow>(
        `SELECT academy_name, primary_color, secondary_color, logo_url, login_bg_url, login_tagline
         FROM academies
         WHERE (subdomain = $1 OR custom_domain = $1) AND is_active = true
         LIMIT 1`,
        [domainHint]
      );
    }

    if (!academy) {
      return NextResponse.json({ error: 'Academy not found' }, { status: 404 });
    }

    return NextResponse.json({ branding: academy });
  } catch (error) {
    console.error('GET /api/branding/public error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
