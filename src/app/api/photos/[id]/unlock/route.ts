import { and, eq, gt, gte, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/auth/middleware';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { db } from '@/db';
import { photos, users, purchases, unlocks, commissions, userSubscriptions, membershipPlans } from '@/db/schema';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const userId = getUserId(session)!;
  if (!rateLimit(`unlock:${getClientIp(req)}:${id}`, 60_000, 10).success) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  try {
    const result = db.transaction((tx) => {
      const photo = tx.select().from(photos).where(eq(photos.id, id)).get();
      if (!photo || photo.status !== 'approved') throw new Error('作品不存在或尚未发布');
      if (photo.priceType === 'free') throw new Error('免费作品无需解锁');
      if (photo.userId === userId) throw new Error('自己的作品无需解锁');

      const existing = tx.select({ id: unlocks.id }).from(unlocks).where(and(
        eq(unlocks.userId, userId), eq(unlocks.resourceType, 'photo'), eq(unlocks.resourceId, id)
      )).get();
      if (existing) return 'already';

      const sub = tx.select().from(userSubscriptions).where(and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, 'active'),
        gt(userSubscriptions.expiresAt, new Date().toISOString())
      )).get();
      const plan = sub ? tx.select().from(membershipPlans)
        .where(eq(membershipPlans.id, sub.planId)).get() : null;
      const useSubscription = !!sub && !!plan &&
        (plan.maxDownloadsPerMonth === -1 || sub.downloadsUsed < plan.maxDownloadsPerMonth);

      if (useSubscription && sub) {
        tx.update(userSubscriptions)
          .set({ downloadsUsed: sql`${userSubscriptions.downloadsUsed} + 1` })
          .where(eq(userSubscriptions.id, sub.id)).run();
      } else {
        const debit = tx.update(users)
          .set({ balance: sql`${users.balance} - ${photo.price}` })
          .where(and(eq(users.id, userId), gte(users.balance, photo.price))).run();
        if (debit.changes !== 1) throw new Error('余额不足，请先充值');

        const purchaseId = uuid();
        tx.insert(purchases).values({
          id: purchaseId, userId, resourceType: 'photo', resourceId: id,
          amount: photo.price, currency: 'CNY', paymentMethod: 'balance', status: 'completed',
        }).run();
        const owner = tx.select({ role: users.role, isCreator: users.isCreator })
          .from(users).where(eq(users.id, photo.userId)).get();
        if (owner && (owner.isCreator || owner.role === 'admin')) {
          tx.insert(commissions).values({
            id: uuid(), contributorId: photo.userId, purchaseId,
            amount: photo.price * 0.7, percentage: 0.7,
            triggerType: 'photo_unlock', status: 'pending',
          }).run();
        }
      }

      tx.insert(unlocks).values({
        id: uuid(), userId, resourceType: 'photo', resourceId: id,
      }).run();
      tx.update(photos)
        .set({ downloadCount: sql`${photos.downloadCount} + 1` })
        .where(eq(photos.id, id)).run();
      return 'unlocked';
    });
    return NextResponse.json(result === 'already'
      ? { message: '已解锁', alreadyUnlocked: true }
      : { message: '解锁成功' });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '解锁失败' }, { status: 409 });
  }
}
