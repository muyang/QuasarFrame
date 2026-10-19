import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/auth/middleware';
import { db } from '@/db';
import { frameSkus } from '@/db/schema';
import { frameSkuUpdateSchema } from '@/lib/validators';

function nowTs() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// PATCH — update SKU
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

  const parsed = frameSkuUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const [existing] = await db.select().from(frameSkus).where(eq(frameSkus.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: 'SKU 不存在' }, { status: 404 });
  }

  const { images, specs, ...fields } = parsed.data;
  const updates: Partial<typeof frameSkus.$inferInsert> = {
    ...fields,
    updatedAt: nowTs(),
    ...(images !== undefined ? { images: JSON.stringify(images) } : {}),
    ...(specs !== undefined ? { specs: JSON.stringify(specs) } : {}),
  };

  await db.update(frameSkus).set(updates).where(eq(frameSkus.id, id));
  return NextResponse.json({ id });
}

// DELETE — discontinue (soft delete by setting status, hard delete only if no orders reference it)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole('admin');
  if (error) return error;
  const { id } = await params;

  const [existing] = await db.select().from(frameSkus).where(eq(frameSkus.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: 'SKU 不存在' }, { status: 404 });
  }

  await db
    .update(frameSkus)
    .set({ status: 'discontinued', updatedAt: nowTs() })
    .where(eq(frameSkus.id, id));
  return NextResponse.json({ id, status: 'discontinued' });
}
