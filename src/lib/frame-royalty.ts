import { and, eq, gte, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { db } from '@/db';
import { frameSkus, frameContentBundles, photos, commissions } from '@/db/schema';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type RoyaltyRule = { type: 'percent' | 'fixed'; value: number };

export type LineItem = {
  skuId: string;
  quantity: number;
  bundleId: string | null;
  amount: number;
  skuName: string;
  bundleName: string | null;
  photoIds: string[];
  royaltyRule: RoyaltyRule;
  bundlePrice: number;
};

function parseBundleRule(raw: string | null): RoyaltyRule {
  if (!raw) return { type: 'percent', value: 0.5 };
  try {
    const parsed = JSON.parse(raw);
    return {
      type: (parsed.type === 'fixed' ? 'fixed' : 'percent'),
      value: typeof parsed.value === 'number' ? parsed.value : 0.5,
    };
  } catch {
    return { type: 'percent', value: 0.5 };
  }
}
/** Resolve items + bundles, compute line amounts and total. Throws on invalid input. */
export async function resolveOrderItems(
  items: { skuId: string; quantity: number; bundleId?: string }[]
): Promise<{ lineItems: LineItem[]; totalAmount: number }> {
  const lineItems: LineItem[] = [];
  let totalAmount = 0;

  for (const item of items) {
    const [sku] = await db
      .select()
      .from(frameSkus)
      .where(eq(frameSkus.id, item.skuId))
      .limit(1);
    if (!sku) throw new Error(`SKU ${item.skuId} 不存在`);
    if (sku.status !== 'active') throw new Error(`型号 ${sku.model} 已下架`);
    if (sku.stock < item.quantity)
      throw new Error(`型号 ${sku.model} 库存不足（剩 ${sku.stock}）`);

    let bundlePrice = 0;
    let photoIds: string[] = [];
    let royaltyRule: RoyaltyRule = { type: 'percent', value: 0.5 };
    let bundleName: string | null = null;

    if (item.bundleId) {
      const [b] = await db
        .select()
        .from(frameContentBundles)
        .where(eq(frameContentBundles.id, item.bundleId))
        .limit(1);
      if (!b) throw new Error(`内容包 ${item.bundleId} 不存在`);
      if (b.status !== 'active') throw new Error(`内容包 ${b.name} 已下架`);
      bundlePrice = b.price;
      photoIds = b.photoIds ? (JSON.parse(b.photoIds) as string[]) : [];
      royaltyRule = parseBundleRule(b.royaltyRule);
      bundleName = b.name;
    }

    const amount = (sku.price + bundlePrice) * item.quantity;
    totalAmount += amount;

    lineItems.push({
      skuId: item.skuId,
      quantity: item.quantity,
      bundleId: item.bundleId ?? null,
      amount,
      skuName: `${sku.model} ${sku.screenInch}″ ${sku.bezelColor}`,
      bundleName,
      photoIds,
      royaltyRule,
      bundlePrice,
    });
  }

  return { lineItems, totalAmount };
}

/** Decrement SKU stock and generate frame_royalty commissions for each bundle's photographers. */
export function settleFrameOrderRoyalties(
  tx: Tx,
  purchaseId: string,
  lineItems: LineItem[]
) {
  for (const line of lineItems) {
    const stockUpdate = tx
      .update(frameSkus)
      .set({ stock: sql`${frameSkus.stock} - ${line.quantity}` })
      .where(and(eq(frameSkus.id, line.skuId), gte(frameSkus.stock, line.quantity)))
      .run();
    if (stockUpdate.changes !== 1) throw new Error('商品库存不足，请刷新后重试');

    if (!line.bundleId || line.photoIds.length === 0) continue;

    const royaltyPool =
      line.royaltyRule.type === 'percent'
        ? line.bundlePrice * line.quantity * line.royaltyRule.value
        : line.royaltyRule.value * line.quantity;

    if (royaltyPool <= 0) continue;

    const perPhoto = royaltyPool / line.photoIds.length;
    const photoRows = tx.select({ id: photos.id, userId: photos.userId }).from(photos).all();
    const byPhoto = new Map(photoRows.map((p) => [p.id, p.userId]));

    for (const photoId of line.photoIds) {
      const contributorId = byPhoto.get(photoId);
      if (!contributorId) continue;
      tx.insert(commissions).values({
        id: uuid(),
        contributorId,
        purchaseId,
        amount: perPhoto,
        percentage: line.royaltyRule.type === 'percent' ? line.royaltyRule.value : 0,
        triggerType: 'frame_royalty',
        refTable: 'frame_content_bundles',
        refId: line.bundleId,
        status: 'pending',
      }).run();
    }
  }
}
