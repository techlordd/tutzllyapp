import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { getAcademyId } from '@/lib/request-context';

export async function GET(request: NextRequest) {
  try {
    const academyId = getAcademyId(request);
    if (!academyId) {
      return NextResponse.json({
        primary_color: '#3B82F6',
        secondary_color: '#1E40AF',
        accent_color: '#10B981',
        site_title: 'Tutzlly Academy',
        academy_name: 'Tutzlly',
      });
    }
    const academy = await queryOne(
      `SELECT id, academy_id, academy_name, academy_email, academy_description,
              primary_color, secondary_color, accent_color, logo_url, favicon_url, site_title,
              login_bg_url, login_tagline, subdomain, custom_domain,
              smtp_host, smtp_port, smtp_username, smtp_password,
              smtp_from_name, smtp_from_email, smtp_encryption
       FROM academies WHERE id = $1`,
      [academyId]
    );
    if (!academy) return NextResponse.json({ error: 'Academy not found' }, { status: 404 });
    return NextResponse.json({ academy });
  } catch (error) {
    console.error('GET /api/branding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || (payload.role !== 'admin' && !payload.is_super_admin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const academyId = getAcademyId(request);
    if (!academyId) return NextResponse.json({ error: 'No academy context' }, { status: 400 });

    const body = await request.json();
    const allowed = ['academy_name', 'academy_email', 'academy_description',
      'primary_color', 'secondary_color', 'accent_color', 'logo_url', 'favicon_url', 'site_title',
      'login_bg_url', 'login_tagline', 'subdomain', 'custom_domain',
      'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password',
      'smtp_from_name', 'smtp_from_email', 'smtp_encryption'];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
      if (key in body) {
        values.push(body[key]);
        updates.push(`${key} = $${values.length}`);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(academyId);
    const academy = await queryOne(
      `UPDATE academies SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!academy) return NextResponse.json({ error: 'Academy not found' }, { status: 404 });
    return NextResponse.json({ academy });
  } catch (error) {
    console.error('PATCH /api/branding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
