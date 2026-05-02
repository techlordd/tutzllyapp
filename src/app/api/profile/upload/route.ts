import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

function getAuth(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const payload = getAuth(request);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, WebP or GIF.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${payload.id}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes));

    const imageUrl = `/uploads/profiles/${fileName}`;

    // Persist to DB immediately
    const { id: userId, role } = payload;
    if (role === 'student') {
      await queryOne(
        `UPDATE students SET profile_image=$1, last_updated=NOW() WHERE user_id=$2`,
        [imageUrl, userId]
      );
    } else if (role === 'tutor') {
      await queryOne(
        `UPDATE tutors SET profile_image=$1, last_updated=NOW() WHERE user_id=$2`,
        [imageUrl, userId]
      );
    } else if (role === 'parent') {
      await queryOne(
        `UPDATE parents SET profile_image=$1, last_updated=NOW() WHERE user_id=$2`,
        [imageUrl, userId]
      );
    }

    return NextResponse.json({ url: imageUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
