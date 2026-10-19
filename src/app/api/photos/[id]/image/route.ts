import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { db } from '@/db';
import { photos, unlocks } from '@/db/schema';
import { PRIVATE_IMAGE_DIR } from '@/lib/file-upload';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [photo] = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
  if (!photo) return NextResponse.json({ error: '作品不存在' }, { status: 404 });

  const session = await auth();
  const userId = session?.user?.id;
  const ownsPhoto = userId === photo.userId || session?.user?.role === 'admin';
  if (photo.status !== 'approved' && !ownsPhoto) {
    return NextResponse.json({ error: '作品不存在' }, { status: 404 });
  }

  let allowed = photo.priceType === 'free' || ownsPhoto;
  if (!allowed && userId) {
    const [unlock] = await db.select({ id: unlocks.id }).from(unlocks).where(and(
      eq(unlocks.userId, userId),
      eq(unlocks.resourceType, 'photo'),
      eq(unlocks.resourceId, id)
    )).limit(1);
    allowed = !!unlock;
  }
  if (!allowed) return NextResponse.json({ error: '无查看权限' }, { status: 403 });

  // Old records still reference /uploads/<uuid>.<ext>; their originals are
  // relocated once to the private directory by scripts/private-images.ts.
  const legacyName = /^\/uploads\/([a-f0-9-]{36}\.(?:jpe?g|png|webp))$/i.exec(photo.imageUrl)?.[1];
  const fileName = legacyName ?? `${id}.jpg`;
  const filePath = path.join(PRIVATE_IMAGE_DIR, fileName);
  try {
    const bytes = await readFile(filePath);
    const contentType = fileName.endsWith('.png') ? 'image/png'
      : fileName.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: '图片文件不可用' }, { status: 404 });
  }
}
