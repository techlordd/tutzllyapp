import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const student = await queryOne(
      `SELECT s.*, COALESCE(NULLIF(s.email,''), u.email) AS email,
              COALESCE(NULLIF(s.username,''), u.username) AS username
       FROM students s LEFT JOIN users u ON s.user_id = u.id
       WHERE s.student_id = $1`,
      [id]
    );
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ student });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const student = await queryOne(
      `UPDATE students SET
       enrollment_id=$1, firstname=$2, surname=$3, full_name_first_name=$4, full_name_last_name=$5,
       phone_no=$6, sex=$7, grade=$8, school=$9, date_of_birth=$10,
       mothers_name=$11, mothers_email=$12, fathers_name=$13, fathers_email=$14,
       address=$15, address_line_1=$16, address_line_2=$17, address_city=$18,
       address_state_province=$19, address_zip_postal=$20, address_country=$21,
       short_bio=$22, status=$23, reason_for_inactive=$24, last_updated=NOW()
       WHERE student_id=$25 RETURNING *`,
      [data.enrollment_id || null, data.firstname, data.surname, data.firstname, data.surname,
       data.phone_no, data.sex, data.grade, data.school, data.date_of_birth,
       data.mothers_name, data.mothers_email, data.fathers_name, data.fathers_email,
       data.address, data.address_line1, data.address_line2, data.address_city,
       data.address_state, data.address_zip, data.address_country,
       data.short_bio, data.status, data.reason_for_inactive, id]
    );
    return NextResponse.json({ student });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query(`UPDATE students SET entry_status='deleted', last_updated=NOW() WHERE student_id=$1`, [id]);
    return NextResponse.json({ message: 'Student deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
