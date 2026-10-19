import { and, eq, gt, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { unlocks, userSubscriptions } from '@/db/schema';

// Distribution stays disabled until a feed ID is explicitly released after
// authorization review. Existing camera rows are not grandfathered in.
export function licensedFeedIds(): string[] {
  return (process.env.AUTHORIZED_FEED_IDS ?? '').split(',').map((part) => part.trim()).filter(Boolean);
}

export function isFeedLicensed(id: string): boolean {
  return licensedFeedIds().includes(id);
}

export async function hasActiveMembership(userId: string): Promise<boolean> {
  const [subscription] = await db.select({ id: userSubscriptions.id })
    .from(userSubscriptions)
    .where(and(
      eq(userSubscriptions.userId, userId),
      eq(userSubscriptions.status, 'active'),
      inArray(userSubscriptions.planId, ['photo', 'pro']),
      gt(userSubscriptions.expiresAt, new Date().toISOString())
    )).limit(1);
  return !!subscription;
}

export async function canViewFeed(feed: {
  id: string;
  type: 'official' | 'third_party';
  userId: string | null;
}, userId: string | null, role?: string): Promise<{
  canAccess: boolean;
  reason: 'free' | 'subscribed' | 'purchased' | 'owner' | 'login_required' | 'authorization_pending';
}> {
  if (userId && (feed.userId === userId || role === 'admin')) {
    return { canAccess: true, reason: 'owner' };
  }
  if (!isFeedLicensed(feed.id)) {
    return { canAccess: false, reason: 'authorization_pending' };
  }
  if (feed.type === 'official') return { canAccess: true, reason: 'free' };
  if (!userId) return { canAccess: false, reason: 'login_required' };
  if (await hasActiveMembership(userId)) return { canAccess: true, reason: 'subscribed' };
  const [unlock] = await db.select({ id: unlocks.id }).from(unlocks).where(and(
    eq(unlocks.userId, userId),
    eq(unlocks.resourceType, 'feed'),
    eq(unlocks.resourceId, feed.id)
  )).limit(1);
  return unlock
    ? { canAccess: true, reason: 'purchased' }
    : { canAccess: false, reason: 'login_required' };
}
