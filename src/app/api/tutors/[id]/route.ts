import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tutor = await queryOne(`SELECT * FROM tutors WHERE tutor_id = $1`, [id]);
    if (!tutor) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ tutor });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch tutor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const tutor = await queryOne(
      `UPDATE tutors SET firstname=$1, surname=$2, fullname_first=$3, fullname_last=$4, phone_no=$5, sex=$6,
       date_of_birth=$7, address_line1=$8, address_line2=$9, address_city=$10, address_state=$11,
       address_zip=$12, address_country=$13, short_bio=$14, pay_category=$15, salary=$16,
       payrate_per_hour=$17, updated_at=NOW() WHERE tutor_id=$18 RETURNING *`,
      [data.firstname, data.surname, data.firstname, data.surname, data.phone_no, data.sex,
       data.date_of_birth, data.address_line1, data.address_line2, data.address_city,
       data.address_state, data.address_zip, data.address_country, data.short_bio,
       data.pay_category, data.salary, data.payrate_per_hour, id]
    );
    return NextResponse.json({ tutor });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update tutor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query(`UPDATE tutors SET entry_status='deleted', updated_at=NOW() WHERE tutor_id=$1`, [id]);
    return NextResponse.json({ message: 'Tutor deleted' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete tutor' }, { status: 500 });
  }
}
