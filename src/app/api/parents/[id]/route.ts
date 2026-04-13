import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parent = await queryOne('SELECT * FROM parents WHERE parent_id = $1', [id]);
  if (!parent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ parent });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const {
    firstname, lastname, email, phone_number, address,
    student1, student_id1, student2, student_id2, student3, student_id3,
    student4, student_id4, student5, student_id5,
  } = body;
  const result = await queryOne(
    `UPDATE parents SET firstname=$1, lastname=$2, email=$3, phone_number=$4, address=$5,
      student1=$6, student_id1=$7, student2=$8, student_id2=$9, student3=$10, student_id3=$11,
      student4=$12, student_id4=$13, student5=$14, student_id5=$15
     WHERE parent_id=$16 RETURNING *`,
    [firstname, lastname, email, phone_number, address,
     student1, student_id1, student2, student_id2, student3, student_id3,
     student4, student_id4, student5, student_id5, id]
  );
  return NextResponse.json({ parent: result });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await query('DELETE FROM parents WHERE parent_id = $1', [id]);
  return NextResponse.json({ success: true });
}
