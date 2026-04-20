import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const grade = await queryOne('SELECT * FROM grade_book WHERE record_id = $1', [Number(id)]);
  if (!grade) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ grade });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const {
    punctuality, attentiveness, engagement, homework, test_score,
    remarks, grade_code_status, status,
  } = body;
  const result = await queryOne(
    `UPDATE grade_book SET
      punctuality=$1, attentiveness=$2, engagement=$3, homework=$4, test_score=$5,
      remarks=$6, grade_code_status=$7, status=$8, last_updated=NOW()
    WHERE record_id=$9 RETURNING *`,
    [punctuality, attentiveness, engagement, homework, test_score,
     remarks, grade_code_status, status, Number(id)]
  );
  return NextResponse.json({ grade: result });
}
