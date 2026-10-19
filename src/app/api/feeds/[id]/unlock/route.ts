import { and, eq, gte, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/auth/middleware';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { db } from '@/db';
import { cameraFeeds, users, purchases, unlocks, commissions } from '@/db/schema';
import { isFeedLicensed } from '@/lib/feed-access';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const userId = getUserId(session)!;
  if (!rateLimit(`feed-unlock:${getClientIp(req)}:${id}`, 60_000, 10).success) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }
  if (!isFeedLicensed(id)) {
    return NextResponse.json({ error: '此机位尚未获得分发授权' }, { status: 403 });
  }

  try {
    const result = db.transaction((tx) => {
      const feed = tx.select().from(cameraFeeds).where(eq(cameraFeeds.id, id)).get();
      if (!feed || feed.status !== 'active') throw new Error('摄像头不可用');
      if (feed.type === 'official' || feed.userId === userId) throw new Error('此机位无需解锁');

      const existing = tx.select({ id: unlocks.id }).from(unlocks).where(and(
        eq(unlocks.userId, userId), eq(unlocks.resourceType, 'feed'), eq(unlocks.resourceId, id)
      )).get();
      if (existing) return 'already';

      const unlockPrice = 5;
      const debit = tx.update(users)
        .set({ balance: sql`${users.balance} - ${unlockPrice}` })
        .where(and(eq(users.id, userId), gte(users.balance, unlockPrice))).run();
      if (debit.changes !== 1) throw new Error('余额不足，请先充值');

      const purchaseId = uuid();
      tx.insert(purchases).values({
        id: purchaseId, userId, resourceType: 'feed', resourceId: id,
        amount: unlockPrice, currency: 'CNY', paymentMethod: 'balance', status: 'completed',
      }).run();
      if (feed.userId) {
        const owner = tx.select({ role: users.role, isCreator: users.isCreator })
          .from(users).where(eq(users.id, feed.userId)).get();
        if (owner && (owner.isCreator || owner.role === 'admin')) {
          tx.insert(commissions).values({
            id: uuid(), contributorId: feed.userId, purchaseId,
            amount: unlockPrice * 0.7, percentage: 0.7,
            triggerType: 'feed_unlock', status: 'pending',
          }).run();
        }
      }
      tx.insert(unlocks).values({
        id: uuid(), userId, resourceType: 'feed', resourceId: id,
      }).run();
      return 'unlocked';
    });
    return NextResponse.json(result === 'already'
      ? { message: '已解锁', alreadyUnlocked: true }
      : { message: '解锁成功' });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '解锁失败' }, { status: 409 });
  }
}
