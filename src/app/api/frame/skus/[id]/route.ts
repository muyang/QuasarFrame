import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { frameSkus, frameContentBundles } from '@/db/schema';

// GET — public SKU detail (active only), includes bundles attached to this SKU
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [sku] = await db
    .select()
    .from(frameSkus)
    .where(and(eq(frameSkus.id, id), eq(frameSkus.status, 'active')))
    .limit(1);

  if (!sku) {
    return NextResponse.json({ error: '型号不存在或已下架' }, { status: 404 });
  }

  const bundles = await db
    .select()
    .from(frameContentBundles)
    .where(
      and(
        eq(frameContentBundles.skuId, id),
        eq(frameContentBundles.status, 'active')
      )
    );

  return NextResponse.json({
    sku: {
      ...sku,
      images: sku.images ? JSON.parse(sku.images) : [],
      specs: sku.specs ? JSON.parse(sku.specs) : {},
    },
    bundles: bundles.map((b) => ({
      ...b,
      photoIds: b.photoIds ? JSON.parse(b.photoIds) : [],
      royaltyRule: b.royaltyRule ? JSON.parse(b.royaltyRule) : { type: 'percent', value: 0.5 },
    })),
  });
}
