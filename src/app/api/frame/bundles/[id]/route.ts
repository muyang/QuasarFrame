import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { frameContentBundles } from '@/db/schema';
import { bundleDeliverable, parseBundlePhotoIds } from '@/lib/frame-royalty';

// GET — public bundle detail (active only)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [bundle] = await db
    .select()
    .from(frameContentBundles)
    .where(
      and(
        eq(frameContentBundles.id, id),
        eq(frameContentBundles.status, 'active')
      )
    )
    .limit(1);

  if (!bundle || !bundleDeliverable(bundle.photoIds)) {
    return NextResponse.json({ error: '内容包不存在或已下架' }, { status: 404 });
  }

  return NextResponse.json({
    bundle: {
      ...bundle,
      photoIds: parseBundlePhotoIds(bundle.photoIds),
      royaltyRule: bundle.royaltyRule ? JSON.parse(bundle.royaltyRule) : { type: 'percent', value: 0.5 },
    },
  });
}
