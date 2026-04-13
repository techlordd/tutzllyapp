import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const grade = await queryOne('SELECT * FROM grade_book WHERE id = $1', [Number(id)]);
  if (!grade) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ grade });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { punctuality, attentiveness, engagement, homework, test_score, remarks, status } = body;
  const result = await queryOne(
    `UPDATE grade_book SET punctuality=$1, attentiveness=$2, engagement=$3,
      homework=$4, test_score=$5, remarks=$6, status=$7
    WHERE id=$8 RETURNING *`,
    [punctuality, attentiveness, engagement, homework, test_score, remarks, status, Number(id)]
  );
  return NextResponse.json({ grade: result });
}
