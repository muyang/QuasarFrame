import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { requireRole } from '@/auth/middleware';
import { db } from '@/db';
import { frameContentBundles } from '@/db/schema';
import { frameBundleCreateSchema } from '@/lib/validators';

// GET — admin list
export async function GET() {
  const { error } = await requireRole('admin');
  if (error) return error;

  const rows = await db
    .select()
    .from(frameContentBundles)
    .orderBy(desc(frameContentBundles.createdAt));

  return NextResponse.json({
    bundles: rows.map((b) => ({
      ...b,
      photoIds: b.photoIds ? JSON.parse(b.photoIds) : [],
      royaltyRule: b.royaltyRule ? JSON.parse(b.royaltyRule) : { type: 'percent', value: 0.5 },
    })),
  });
}

// POST — create bundle
export async function POST(req: Request) {
  const { error } = await requireRole('admin');
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const parsed = frameBundleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const bundleId = uuid();
  await db.insert(frameContentBundles).values({
    id: bundleId,
    skuId: parsed.data.skuId ?? null,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    photoIds: JSON.stringify(parsed.data.photoIds),
    royaltyRule: JSON.stringify(parsed.data.royaltyRule),
    price: parsed.data.price,
    status: parsed.data.status,
  });

  return NextResponse.json({ id: bundleId }, { status: 201 });
}
