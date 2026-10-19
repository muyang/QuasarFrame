import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAuth, getUserId } from '@/auth/middleware';
import { db } from '@/db';
import { frameOrders } from '@/db/schema';

// GET — order detail (owner only)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const userId = getUserId(session)!;
  const { id } = await params;

  const [order] = await db
    .select()
    .from(frameOrders)
    .where(eq(frameOrders.id, id))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 });
  }
  if (order.userId !== userId) {
    return NextResponse.json({ error: '无权查看此订单' }, { status: 403 });
  }

  return NextResponse.json({
    ...order,
    itemsJson: order.itemsJson ? JSON.parse(order.itemsJson) : [],
    shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress) : null,
  });
}

// Payment settlement must be performed by a verified gateway callback.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const userId = getUserId(session)!;
  const { id } = await params;

  const [order] = await db
    .select()
    .from(frameOrders)
    .where(eq(frameOrders.id, id))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 });
  }
  if (order.userId !== userId) {
    return NextResponse.json({ error: '无权操作此订单' }, { status: 403 });
  }
  return NextResponse.json({ error: '模拟付款确认已关闭' }, { status: 501 });
}
