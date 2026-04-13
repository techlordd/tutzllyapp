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
      `UPDATE students SET firstname=$1, surname=$2, fullname_first=$3, fullname_last=$4, phone_no=$5,
       sex=$6, grade=$7, school=$8, date_of_birth=$9, mothers_name=$10, mothers_email=$11,
       fathers_name=$12, fathers_email=$13, address_line1=$14, address_line2=$15, address_city=$16,
       address_state=$17, address_zip=$18, address_country=$19, short_bio=$20, status=$21,
       reason_for_inactive=$22, updated_at=NOW() WHERE student_id=$23 RETURNING *`,
      [data.firstname, data.surname, data.firstname, data.surname, data.phone_no, data.sex,
       data.grade, data.school, data.date_of_birth, data.mothers_name, data.mothers_email,
       data.fathers_name, data.fathers_email, data.address_line1, data.address_line2,
       data.address_city, data.address_state, data.address_zip, data.address_country,
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
    await query(`UPDATE students SET entry_status='deleted', updated_at=NOW() WHERE student_id=$1`, [id]);
    return NextResponse.json({ message: 'Student deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
