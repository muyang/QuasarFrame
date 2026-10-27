import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth/config';
import { db } from '@/db';
import { photos } from '@/db/schema';
import { PRIVATE_THUMBNAIL_DIR } from '@/lib/file-upload';
import { licensedFor } from '@/server/licenses';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return Response.json({ error: '作品不存在' }, { status: 404 });
  const photo = db.select().from(photos).where(eq(photos.id, id)).get();
  if (!photo) return Response.json({ error: '作品不存在' }, { status: 404 });
  const session = await auth();
  const owner = session?.user?.id === photo.userId || session?.user?.role === 'admin';
  if (!owner && (photo.status !== 'approved' || !licensedFor('photo', id, 'web',
    photo.priceType === 'paid' ? 'paid' : 'preview'))) {
    return Response.json({ error: '缩略图不可公开' }, { status: 404 });
  }
  const extension = /^\/uploads\/[a-f0-9-]{36}_thumb\.(png|webp|jpe?g)$/i.exec(photo.thumbnailUrl)?.[1]?.toLowerCase() ?? 'jpg';
  const fileName = `${id}_thumb.${extension}`;
  try {
    let bytes: Buffer;
    try { bytes = await readFile(path.join(PRIVATE_THUMBNAIL_DIR, fileName)); }
    catch { bytes = await readFile(path.join(process.cwd(), 'public', 'uploads', fileName)); }
    return new Response(new Uint8Array(bytes), { headers: {
      'Content-Type': extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg',
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch { return Response.json({ error: '缩略图不可用' }, { status: 404 }); }
}
