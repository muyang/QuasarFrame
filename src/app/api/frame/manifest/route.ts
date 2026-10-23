import { eq, inArray } from 'drizzle-orm';
import { requireAuth, getUserId } from '@/auth/middleware';
import { db } from '@/db';
import { entitlementGrants, photos } from '@/db/schema';
import { hasEntitlement } from '@/server/entitlements';

export const runtime = 'nodejs';

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;
  const userId = getUserId(session)!;
  const grants = db.select({ resourceId: entitlementGrants.resourceId }).from(entitlementGrants)
    .where(eq(entitlementGrants.userId, userId)).all();
  const ids = [...new Set(grants.map((grant) => grant.resourceId))];
  const rows = ids.length ? db.select({ id: photos.id, title: photos.title, status: photos.status })
    .from(photos).where(inArray(photos.id, ids)).all() : [];
  const items = rows.filter((photo) => photo.status === 'approved' && hasEntitlement(userId, 'photo', photo.id, 'frame'))
    .map((photo) => ({ id: photo.id, title: photo.title, imageUrl: `/api/photos/${photo.id}/image?channel=frame` }));
  return Response.json({ items, channel: 'frame' }, { headers: { 'Cache-Control': 'private, no-store' } });
}
