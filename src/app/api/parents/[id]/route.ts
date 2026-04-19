import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parent = await queryOne(
      `SELECT p.*,
              COALESCE(NULLIF(p.email, ''), u.email) AS email,
              COALESCE(NULLIF(p.username, ''), u.username) AS username
       FROM parents p LEFT JOIN users u ON p.user_id = u.id
       WHERE p.parent_id = $1`,
      [id]
    );
    if (!parent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ parent });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch parent' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await req.json();
    const parent = await queryOne(
      `UPDATE parents SET
       full_name_first_name=$1, full_name_last_name=$2, phone_no=$3, sex=$4, date_of_birth=$5,
       address=$6, address_line_1=$7, address_line_2=$8, address_city=$9,
       address_state_province=$10, address_zip_postal=$11, address_country=$12,
       short_bio=$13, no_of_students=$14,
       student1=$15, student_id1=$16, student2=$17, student_id2=$18,
       student3=$19, student_id3=$20, student4=$21, student_id4=$22,
       student5=$23, student_id5=$24, last_updated=NOW()
       WHERE parent_id=$25 RETURNING *`,
      [data.full_name_first_name, data.full_name_last_name, data.phone_no, data.sex, data.date_of_birth,
       data.address, data.address_line1, data.address_line2, data.address_city,
       data.address_state, data.address_zip, data.address_country,
       data.short_bio, data.no_of_students || 0,
       data.student1, data.student_id1, data.student2, data.student_id2,
       data.student3, data.student_id3, data.student4, data.student_id4,
       data.student5, data.student_id5, id]
    );
    return NextResponse.json({ parent });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update parent' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query(`UPDATE parents SET entry_status='deleted', last_updated=NOW() WHERE parent_id=$1`, [id]);
    return NextResponse.json({ message: 'Parent deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete parent' }, { status: 500 });
  }
}
