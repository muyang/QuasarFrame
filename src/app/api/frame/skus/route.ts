import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { frameSkus } from '@/db/schema';

// GET — public list of active SKUs
export async function GET() {
  const skus = await db
    .select()
    .from(frameSkus)
    .where(eq(frameSkus.status, 'active'))
    .orderBy(frameSkus.screenInch);

  return NextResponse.json({
    skus: skus.map((s) => ({
      ...s,
      images: s.images ? JSON.parse(s.images) : [],
      specs: s.specs ? JSON.parse(s.specs) : {},
    })),
  });
}
