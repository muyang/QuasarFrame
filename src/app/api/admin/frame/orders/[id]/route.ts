import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/auth/middleware';
import { db } from '@/db';
import { frameOrders } from '@/db/schema';
import { frameOrderUpdateSchema } from '@/lib/validators';

function nowTs() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// Allowed forward transitions for frame_order.status.
// (refunded is terminal — once refunded, no further state changes.)
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['cancelled'],
  paid: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  refunded: [],
  cancelled: [],
};

// PATCH — update status / tracking number (with state-machine guard)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole('admin');
  if (error) return error;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const parsed = frameOrderUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const [existing] = await db.select().from(frameOrders).where(eq(frameOrders.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 });
  }

  const { status: newStatus, trackingNo, paymentMethod } = parsed.data;

  // State-machine check: if status is being changed, must follow allowed transitions.
  if (newStatus && newStatus !== existing.status) {
    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `订单状态不可从 ${existing.status} 跳转到 ${newStatus}（允许：${allowed.join(', ') || '无'}）`,
        },
        { status: 400 }
      );
    }
  }

  // trackingNo may only be set once order has been shipped.
  if (trackingNo && !['shipped', 'delivered'].includes(existing.status) && !newStatus) {
    return NextResponse.json(
      { error: '订单未发货，无法填写运单号' },
      { status: 400 }
    );
  }

  const updates: Partial<typeof frameOrders.$inferInsert> = { updatedAt: nowTs() };
  if (newStatus) updates.status = newStatus;
  if (trackingNo !== undefined) updates.trackingNo = trackingNo;
  if (paymentMethod !== undefined && paymentMethod !== existing.paymentMethod) {
    return NextResponse.json({ error: '支付方式不可手动修改' }, { status: 400 });
  }

  await db.update(frameOrders).set(updates).where(eq(frameOrders.id, id));
  return NextResponse.json({ id });
}
