import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { auth } from '@/auth/config';
import { db } from '@/db';
import { photos } from '@/db/schema';
import { PRIVATE_IMAGE_DIR } from '@/lib/file-upload';
import { licensedFor } from '@/server/licenses';
import { hasEntitlement } from '@/server/entitlements';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [photo] = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
  if (!photo) return NextResponse.json({ error: '作品不存在' }, { status: 404 });

  const session = await auth();
  const userId = session?.user?.id;
  const ownsPhoto = userId === photo.userId || session?.user?.role === 'admin';
  const channel = new URL(req.url).searchParams.get('channel') === 'frame' ? 'frame' : 'web';
  if (photo.status !== 'approved' && !ownsPhoto) {
    return NextResponse.json({ error: '作品不存在' }, { status: 404 });
  }
  if (!ownsPhoto && !licensedFor('photo', id, channel, channel === 'frame' || photo.priceType === 'paid' ? 'paid' : 'view')) {
    return NextResponse.json({ error: '作品授权不可用' }, { status: 403 });
  }

  let allowed = channel === 'web' && photo.priceType === 'free' || ownsPhoto;
  if (!allowed && channel === 'frame' && userId) allowed = hasEntitlement(userId, 'photo', id, 'frame');
  if (!allowed && channel === 'web' && userId) allowed = hasEntitlement(userId, 'photo', id, 'web');
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
