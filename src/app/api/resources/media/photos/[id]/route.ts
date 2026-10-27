import { eq } from 'drizzle-orm';
import { auth } from '@/auth/config';
import { db } from '@/db';
import { photos } from '@/db/schema';
import { parseDistributionScope } from '@/lib/license';
import { buildPhotoMediaCard } from '@/lib/media-card';
import { latestSourceLicense } from '@/server/licenses';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = db.select().from(photos).where(eq(photos.id, id)).get();
  if (!photo) return Response.json({ error: '资源不存在' }, { status: 404 });
  const session = await auth();
  const owner = session?.user?.id === photo.userId || session?.user?.role === 'admin';
  const row = latestSourceLicense('photo', id);
  const scope = row ? parseDistributionScope(row.scopeJson) : null;
  const license = row && scope ? { status: row.status, version: row.version, scope } : null;
  const card = buildPhotoMediaCard(photo, license, owner ? 'owner' : 'public');
  if (!owner && card.status !== 'published') return Response.json({ error: '资源不可公开' }, { status: 404 });
  return Response.json({ card }, { headers: { 'Cache-Control': owner ? 'private, no-store' : 'no-store' } });
}
