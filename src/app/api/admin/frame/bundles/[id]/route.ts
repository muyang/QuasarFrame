import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/auth/middleware';
import { db } from '@/db';
import { frameContentBundles } from '@/db/schema';
import { frameBundleUpdateSchema } from '@/lib/validators';

// PATCH
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

  const parsed = frameBundleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select()
    .from(frameContentBundles)
    .where(eq(frameContentBundles.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: '内容包不存在' }, { status: 404 });
  }

  const { photoIds, royaltyRule, ...fields } = parsed.data;
  const updates: Partial<typeof frameContentBundles.$inferInsert> = {
    ...fields,
    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    ...(photoIds !== undefined ? { photoIds: JSON.stringify(photoIds) } : {}),
    ...(royaltyRule !== undefined ? { royaltyRule: JSON.stringify(royaltyRule) } : {}),
  };

  if (Object.keys(updates).length > 1) {
    await db.update(frameContentBundles).set(updates).where(eq(frameContentBundles.id, id));
  }
  return NextResponse.json({ id });
}

// DELETE — hard delete
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole('admin');
  if (error) return error;
  const { id } = await params;

  const [existing] = await db
    .select()
    .from(frameContentBundles)
    .where(eq(frameContentBundles.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: '内容包不存在' }, { status: 404 });
  }

  await db.delete(frameContentBundles).where(eq(frameContentBundles.id, id));
  return NextResponse.json({ id, deleted: true });
}
