import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { requireAuth, getUserId } from '@/auth/middleware';
import { db } from '@/db';
import { frameOrders, users, purchases } from '@/db/schema';
import { frameOrderCreateSchema, frameOrderStatusSchema } from '@/lib/validators';
import { resolveOrderItems, settleFrameOrderRoyalties, type LineItem } from '@/lib/frame-royalty';

// GET — list current user's frame orders
export async function GET(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const userId = getUserId(session)!;

  const url = new URL(req.url);
  const status = url.searchParams.get('status');

  const conds = [eq(frameOrders.userId, userId)];
  if (status) {
    const parsedStatus = frameOrderStatusSchema.safeParse(status);
    if (!parsedStatus.success) return NextResponse.json({ error: '无效订单状态' }, { status: 400 });
    conds.push(eq(frameOrders.status, parsedStatus.data));
  }

  const rows = await db
    .select()
    .from(frameOrders)
    .where(conds.length === 1 ? conds[0] : and(...conds))
    .orderBy(desc(frameOrders.createdAt));

  return NextResponse.json({
    orders: rows.map((o) => ({
      ...o,
      itemsJson: o.itemsJson ? JSON.parse(o.itemsJson) : [],
      shippingAddress: o.shippingAddress ? JSON.parse(o.shippingAddress) : null,
    })),
  });
}

// POST — place an order
export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const userId = getUserId(session)!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const parsed = frameOrderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { items, shippingAddress, paymentMethod } = parsed.data;
  if (paymentMethod !== 'balance') {
    return NextResponse.json({ error: '在线支付尚未接入验签回调，请使用余额支付' }, { status: 501 });
  }
  const requestId = req.headers.get('Idempotency-Key')?.trim();
  if (!requestId || !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) {
    return NextResponse.json({ error: '缺少有效的订单请求标识' }, { status: 400 });
  }
  const requestHash = createHash('sha256')
    .update(JSON.stringify({ items, shippingAddress, paymentMethod })).digest('hex');
  const existingOrder = await db.select().from(frameOrders).where(and(
    eq(frameOrders.userId, userId), eq(frameOrders.clientRequestId, requestId)
  )).limit(1);
  if (existingOrder[0]) {
    if (existingOrder[0].requestHash !== requestHash) {
      return NextResponse.json({ error: '订单请求标识已用于其他订单' }, { status: 409 });
    }
    return NextResponse.json({
      id: existingOrder[0].id, totalAmount: existingOrder[0].totalAmount,
      status: existingOrder[0].status, alreadyCreated: true,
    });
  }

  let lineItems: LineItem[];
  let totalAmount: number;
  try {
    const resolved = await resolveOrderItems(items);
    lineItems = resolved.lineItems;
    totalAmount = resolved.totalAmount;
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : '订单解析失败' }, { status: 400 });
  }

  const orderId = uuid();
  const purchaseId = uuid();
  try {
    const outcome = db.transaction((tx) => {
      const already = tx.select().from(frameOrders).where(and(
        eq(frameOrders.userId, userId), eq(frameOrders.clientRequestId, requestId)
      )).get();
      if (already) {
        if (already.requestHash !== requestHash) throw new Error('订单请求标识已用于其他订单');
        return { id: already.id, totalAmount: already.totalAmount, status: already.status, alreadyCreated: true };
      }
      const debit = tx.update(users)
        .set({ balance: sql`${users.balance} - ${totalAmount}` })
        .where(and(eq(users.id, userId), gte(users.balance, totalAmount))).run();
      if (debit.changes !== 1) throw new Error('余额不足，请先充值');

      tx.insert(frameOrders).values({
        id: orderId,
        userId,
        itemsJson: JSON.stringify(lineItems.map((l) => ({
          skuId: l.skuId,
          quantity: l.quantity,
          amount: l.amount,
          bundleId: l.bundleId,
          skuName: l.skuName,
          bundleName: l.bundleName,
        }))),
        totalAmount,
        shippingAddress: JSON.stringify(shippingAddress),
        status: 'paid',
        paymentMethod: 'balance',
        clientRequestId: requestId,
        requestHash,
      }).run();

      tx.insert(purchases).values({
        id: purchaseId,
        userId,
        resourceType: 'frame_order',
        resourceId: orderId,
        amount: totalAmount,
        currency: 'CNY',
        paymentMethod: 'balance',
        status: 'completed',
      }).run();
      settleFrameOrderRoyalties(tx, purchaseId, lineItems);
      return { id: orderId, purchaseId, totalAmount, status: 'paid', alreadyCreated: false };
    });
    return NextResponse.json(outcome, { status: outcome.alreadyCreated ? 200 : 201 });
  } catch (err) {
    const already = await db.select().from(frameOrders).where(and(
      eq(frameOrders.userId, userId), eq(frameOrders.clientRequestId, requestId)
    )).limit(1);
    if (already[0] && already[0].requestHash === requestHash) {
      return NextResponse.json({
        id: already[0].id, totalAmount: already[0].totalAmount,
        status: already[0].status, alreadyCreated: true,
      });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : '下单失败' }, { status: 409 });
  }
}
