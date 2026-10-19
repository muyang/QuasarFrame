import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { frameContentBundles } from '@/db/schema';

// GET — public list of active bundles
export async function GET() {
  const bundles = await db
    .select()
    .from(frameContentBundles)
    .where(eq(frameContentBundles.status, 'active'))
    .orderBy(frameContentBundles.createdAt);

  return NextResponse.json({
    bundles: bundles.map((b) => ({
      ...b,
      photoIds: b.photoIds ? JSON.parse(b.photoIds) : [],
      royaltyRule: b.royaltyRule ? JSON.parse(b.royaltyRule) : { type: 'percent', value: 0.5 },
    })),
  });
}
