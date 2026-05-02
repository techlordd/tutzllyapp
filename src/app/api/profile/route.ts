import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryOne } from '@/lib/db';

function getAuth(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  const payload = getAuth(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: userId, role } = payload;
  try {
    let profile;
    if (role === 'student') {
      profile = await queryOne(
        `SELECT s.*,
                COALESCE(NULLIF(s.email,''), u.email) AS email,
                COALESCE(NULLIF(s.username,''), u.username) AS username
         FROM students s LEFT JOIN users u ON s.user_id = u.id
         WHERE s.user_id = $1 AND s.entry_status != 'deleted'`,
        [userId]
      );
    } else if (role === 'tutor') {
      profile = await queryOne(
        `SELECT t.*,
                COALESCE(NULLIF(t.email,''), u.email) AS email,
                COALESCE(NULLIF(t.username,''), u.username) AS username
         FROM tutors t LEFT JOIN users u ON t.user_id = u.id
         WHERE t.user_id = $1 AND t.entry_status != 'deleted'`,
        [userId]
      );
    } else if (role === 'parent') {
      profile = await queryOne(
        `SELECT p.*,
                COALESCE(NULLIF(p.email,''), u.email) AS email,
                COALESCE(NULLIF(p.username,''), u.username) AS username
         FROM parents p LEFT JOIN users u ON p.user_id = u.id
         WHERE p.user_id = $1 AND p.entry_status != 'deleted'`,
        [userId]
      );
    } else {
      profile = await queryOne(
        `SELECT id, user_id, username, email, role, is_active FROM users WHERE id = $1`,
        [userId]
      );
    }

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    return NextResponse.json({ profile, role });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const payload = getAuth(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: userId, role } = payload;
  const data = await request.json();

  try {
    let profile;
    if (role === 'student') {
      profile = await queryOne(
        `UPDATE students SET
         firstname=$1, surname=$2, full_name_first_name=$1, full_name_last_name=$2,
         phone_no=$3, sex=$4, date_of_birth=$5, grade=$6, school=$7,
         mothers_name=$8, mothers_email=$9, fathers_name=$10, fathers_email=$11,
         address=$12, address_line_1=$13, address_line_2=$14, address_city=$15,
         address_state_province=$16, address_zip_postal=$17, address_country=$18,
         short_bio=$19, profile_image=COALESCE($20, profile_image), last_updated=NOW()
         WHERE user_id=$21 AND entry_status != 'deleted' RETURNING *`,
        [data.firstname || null, data.surname || null, data.phone_no || null, data.sex || null,
         data.date_of_birth || null, data.grade || null, data.school || null,
         data.mothers_name || null, data.mothers_email || null,
         data.fathers_name || null, data.fathers_email || null,
         data.address || null, data.address_line_1 || null, data.address_line_2 || null,
         data.address_city || null, data.address_state_province || null,
         data.address_zip_postal || null, data.address_country || null,
         data.short_bio || null, data.profile_image || null, userId]
      );
    } else if (role === 'tutor') {
      profile = await queryOne(
        `UPDATE tutors SET
         firstname=$1, surname=$2, full_name_first_name=$1, full_name_last_name=$2,
         phone_no=$3, sex=$4, date_of_birth=$5,
         address=$6, address_line_1=$7, address_line_2=$8, address_city=$9,
         address_state_province=$10, address_zip_postal=$11, address_country=$12,
         short_bio=$13, profile_image=COALESCE($14, profile_image), last_updated=NOW()
         WHERE user_id=$15 AND entry_status != 'deleted' RETURNING *`,
        [data.firstname || null, data.surname || null, data.phone_no || null, data.sex || null,
         data.date_of_birth || null, data.address || null, data.address_line_1 || null,
         data.address_line_2 || null, data.address_city || null,
         data.address_state_province || null, data.address_zip_postal || null,
         data.address_country || null, data.short_bio || null, data.profile_image || null, userId]
      );
    } else if (role === 'parent') {
      profile = await queryOne(
        `UPDATE parents SET
         full_name_first_name=$1, full_name_last_name=$2,
         phone_no=$3, sex=$4, date_of_birth=$5,
         address=$6, address_line_1=$7, address_line_2=$8, address_city=$9,
         address_state_province=$10, address_zip_postal=$11, address_country=$12,
         short_bio=$13, profile_image=COALESCE($14, profile_image), last_updated=NOW()
         WHERE user_id=$15 AND entry_status != 'deleted' RETURNING *`,
        [data.full_name_first_name || null, data.full_name_last_name || null,
         data.phone_no || null, data.sex || null, data.date_of_birth || null,
         data.address || null, data.address_line_1 || null, data.address_line_2 || null,
         data.address_city || null, data.address_state_province || null,
         data.address_zip_postal || null, data.address_country || null,
         data.short_bio || null, data.profile_image || null, userId]
      );
    } else {
      profile = await queryOne(
        `UPDATE users SET username=$1, updated_at=NOW()
         WHERE id=$2 RETURNING id, user_id, username, email, role, is_active`,
        [data.username, userId]
      );
    }
    return NextResponse.json({ profile });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
