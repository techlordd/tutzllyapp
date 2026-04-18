import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const student = await queryOne(`SELECT * FROM students WHERE student_id = $1`, [id]);
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
      `UPDATE students SET enrollment_id=$1, firstname=$2, surname=$3, fullname_first=$4, fullname_last=$5,
       phone_no=$6, sex=$7, grade=$8, school=$9, date_of_birth=$10, mothers_name=$11, mothers_email=$12,
       fathers_name=$13, fathers_email=$14, address_line1=$15, address_line2=$16, address_city=$17,
       address_state=$18, address_zip=$19, address_country=$20, short_bio=$21, status=$22,
       reason_for_inactive=$23, updated_at=NOW() WHERE student_id=$24 RETURNING *`,
      [data.enrollment_id || null, data.firstname, data.surname, data.firstname, data.surname,
       data.phone_no, data.sex, data.grade, data.school, data.date_of_birth, data.mothers_name,
       data.mothers_email, data.fathers_name, data.fathers_email, data.address_line1,
       data.address_line2, data.address_city, data.address_state, data.address_zip,
       data.address_country, data.short_bio, data.status, data.reason_for_inactive, id]
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
    await query(`UPDATE students SET entry_status='deleted', updated_at=NOW() WHERE student_id=$1`, [id]);
    return NextResponse.json({ message: 'Student deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
