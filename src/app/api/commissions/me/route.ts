import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, getUserId } from '@/auth/middleware';
import { db } from '@/db';
import { commissions, purchases } from '@/db/schema';

// GET — current user's commission ledger.
// Returns each row joined with the originating purchase so the UI can label
// the source (photo_unlock / feed_unlock / frame_royalty / ad_affiliate).
export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;
  const userId = getUserId(session)!;

  const rows = await db
    .select({
      id: commissions.id,
      triggerType: commissions.triggerType,
      refTable: commissions.refTable,
      refId: commissions.refId,
      amount: commissions.amount,
      percentage: commissions.percentage,
      status: commissions.status,
      createdAt: commissions.createdAt,
      purchaseId: commissions.purchaseId,
      purchaseAmount: purchases.amount,
      purchaseResourceType: purchases.resourceType,
      purchaseResourceId: purchases.resourceId,
      purchasePaymentMethod: purchases.paymentMethod,
    })
    .from(commissions)
    .innerJoin(purchases, eq(purchases.id, commissions.purchaseId))
    .where(eq(commissions.contributorId, userId))
    .orderBy(desc(commissions.createdAt));

  const totalPending = rows
    .filter((r) => r.status === 'pending')
    .reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalPaid = rows
    .filter((r) => r.status === 'paid')
    .reduce((s, r) => s + (r.amount ?? 0), 0);

  return NextResponse.json({
    commissions: rows,
    summary: {
      count: rows.length,
      pendingAmount: totalPending,
      paidAmount: totalPaid,
    },
  });
}
