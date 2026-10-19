import { NextResponse } from 'next/server';
import { eq, and, gt, gte, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { requireAuth, getUserId } from '@/auth/middleware';
import { db } from '@/db';
import { userSubscriptions, membershipPlans, users } from '@/db/schema';
import { subscriptionSchema } from '@/lib/validators';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// GET current user's active subscription
export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = getUserId(session)!;

  const subs = await db
    .select({
      id: userSubscriptions.id,
      planId: userSubscriptions.planId,
      startedAt: userSubscriptions.startedAt,
      expiresAt: userSubscriptions.expiresAt,
      downloadsUsed: userSubscriptions.downloadsUsed,
      autoRenew: userSubscriptions.autoRenew,
      status: userSubscriptions.status,
    })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  // Enrich with plan details
  const enriched = await Promise.all(
    subs.map(async (sub) => {
      const [plan] = await db
        .select()
        .from(membershipPlans)
        .where(eq(membershipPlans.id, sub.planId))
        .limit(1);
      return { ...sub, plan };
    })
  );

  return NextResponse.json(enriched);
}

// POST create new subscription
export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = getUserId(session)!;

  const limit = rateLimit(`subscribe:${getClientIp(req)}:${userId}`, 60 * 1000, 5);
  if (!limit.success) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = subscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { planId, autoRenew } = parsed.data;
    if (planId !== 'photo' && planId !== 'pro') {
      return NextResponse.json({ error: '此订阅计划不可用' }, { status: 400 });
    }

    // Check plan exists
    const [plan] = await db
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.id, planId))
      .limit(1);

    if (!plan) {
      return NextResponse.json({ error: '计划不存在' }, { status: 404 });
    }

    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + 1);
    db.transaction((tx) => {
      const existing = tx.select({ id: userSubscriptions.id }).from(userSubscriptions)
        .where(and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, 'active'),
          gt(userSubscriptions.expiresAt, now.toISOString())
        )).get();
      if (existing) throw new Error('你已有活跃订阅');

      const debit = tx.update(users).set({
        balance: sql`${users.balance} - ${plan.priceMonthly}`,
        membership: plan.id as 'free' | 'photo' | 'pro',
      }).where(and(eq(users.id, userId), gte(users.balance, plan.priceMonthly))).run();
      if (debit.changes !== 1) throw new Error('余额不足，请先充值');

      tx.insert(userSubscriptions).values({
        id: uuid(), userId, planId,
        startedAt: now.toISOString(), expiresAt: expires.toISOString(),
        downloadsUsed: 0, autoRenew, status: 'active',
      }).run();
    });

    return NextResponse.json({ message: '订阅成功', expiresAt: expires.toISOString() }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '订阅失败' }, { status: 409 });
  }
}
