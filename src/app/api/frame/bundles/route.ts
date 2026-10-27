import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { frameContentBundles } from '@/db/schema';
import { bundleDeliverable, parseBundlePhotoIds } from '@/lib/frame-royalty';

// GET — public list of active bundles
export async function GET() {
  const bundles = await db
    .select()
    .from(frameContentBundles)
    .where(eq(frameContentBundles.status, 'active'))
    .orderBy(frameContentBundles.createdAt);

  return NextResponse.json({
    bundles: bundles.filter((b) => bundleDeliverable(b.photoIds)).map((b) => ({
      ...b,
      photoIds: parseBundlePhotoIds(b.photoIds),
      royaltyRule: b.royaltyRule ? JSON.parse(b.royaltyRule) : { type: 'percent', value: 0.5 },
    })),
  });
}
