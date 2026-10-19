import { NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { requireRole } from '@/auth/middleware';
import { db } from '@/db';
import { frameOrders, users } from '@/db/schema';
import { frameOrderStatusSchema } from '@/lib/validators';

// GET — admin list all orders, optional ?status= filter
export async function GET(req: Request) {
  const { error } = await requireRole('admin');
  if (error) return error;

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const userId = url.searchParams.get('userId');

  const conds = [];
  if (status) {
    const parsedStatus = frameOrderStatusSchema.safeParse(status);
    if (!parsedStatus.success) return NextResponse.json({ error: '无效订单状态' }, { status: 400 });
    conds.push(eq(frameOrders.status, parsedStatus.data));
  }
  if (userId) conds.push(eq(frameOrders.userId, userId));

  const rows = await db
    .select({
      id: frameOrders.id,
      userId: frameOrders.userId,
      itemsJson: frameOrders.itemsJson,
      totalAmount: frameOrders.totalAmount,
      shippingAddress: frameOrders.shippingAddress,
      trackingNo: frameOrders.trackingNo,
      status: frameOrders.status,
      paymentMethod: frameOrders.paymentMethod,
      bundleId: frameOrders.bundleId,
      createdAt: frameOrders.createdAt,
      updatedAt: frameOrders.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(frameOrders)
    .leftJoin(users, eq(users.id, frameOrders.userId))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(frameOrders.createdAt));

  return NextResponse.json({
    orders: rows.map((o) => ({
      ...o,
      itemsJson: o.itemsJson ? JSON.parse(o.itemsJson) : [],
      shippingAddress: o.shippingAddress ? JSON.parse(o.shippingAddress) : null,
    })),
  });
}
