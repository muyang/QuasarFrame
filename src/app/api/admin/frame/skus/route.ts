import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { requireRole } from '@/auth/middleware';
import { db } from '@/db';
import { frameSkus } from '@/db/schema';
import { frameSkuCreateSchema } from '@/lib/validators';

// GET — admin list (all statuses)
export async function GET() {
  const { error } = await requireRole('admin');
  if (error) return error;

  const rows = await db
    .select()
    .from(frameSkus)
    .orderBy(desc(frameSkus.createdAt));

  return NextResponse.json({
    skus: rows.map((s) => ({
      ...s,
      images: s.images ? JSON.parse(s.images) : [],
      specs: s.specs ? JSON.parse(s.specs) : {},
    })),
  });
}

// POST — create SKU
export async function POST(req: Request) {
  const { error } = await requireRole('admin');
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const parsed = frameSkuCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const skuId = uuid();
  await db.insert(frameSkus).values({
    id: skuId,
    model: parsed.data.model,
    screenInch: parsed.data.screenInch,
    bezelColor: parsed.data.bezelColor,
    price: parsed.data.price,
    stock: parsed.data.stock,
    images: parsed.data.images ? JSON.stringify(parsed.data.images) : null,
    specs: parsed.data.specs ? JSON.stringify(parsed.data.specs) : null,
    status: parsed.data.status,
  });

  return NextResponse.json({ id: skuId }, { status: 201 });
}
