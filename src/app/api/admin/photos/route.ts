import { NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { requireRole } from '@/auth/middleware';
import { db } from '@/db';
import { photos, users } from '@/db/schema';
import { reviewSchema } from '@/lib/validators';

// GET — List all photos for admin review
export async function GET(req: Request) {
  const { error } = await requireRole('admin');
  if (error) return error;

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status) {
    conditions.push(eq(photos.status, status as 'draft' | 'pending' | 'approved' | 'rejected'));
  }

  const results = await db
    .select({
      id: photos.id,
      userId: photos.userId,
      title: photos.title,
      description: photos.description,
      thumbnailUrl: photos.thumbnailUrl,
      imageUrl: photos.imageUrl,
      locationId: photos.locationId,
      priceType: photos.priceType,
      price: photos.price,
      status: photos.status,
      rejectReason: photos.rejectReason,
      createdAt: photos.createdAt,
    })
    .from(photos)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(photos.createdAt))
    .limit(limit)
    .offset(offset);

  // Enrich with author names
  const enriched = await Promise.all(
    results.map(async (photo) => {
      const [author] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, photo.userId))
        .limit(1);
      return { ...photo, imageUrl: `/api/photos/${photo.id}/image`, author };
    })
  );

  return NextResponse.json({ photos: enriched, page, limit });
}

// PATCH — Review a photo (approve/reject)
export async function PATCH(req: Request) {
  const { error } = await requireRole('admin');
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { id, status, rejectReason } = parsed.data;

    const updateData: Partial<typeof photos.$inferInsert> = {
      status,
      rejectReason: rejectReason || null,
    };

    await db.update(photos).set(updateData).where(eq(photos.id, id));

    // Auto-promote author to creator on first approval
    if (status === 'approved') {
      const [photo] = await db
        .select({ userId: photos.userId })
        .from(photos)
        .where(eq(photos.id, id))
        .limit(1);
      if (photo) {
        await db.update(users)
          .set({ isCreator: true, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
          .where(eq(users.id, photo.userId));
      }
    }

    return NextResponse.json({ message: '审核成功' });
  } catch {
    return NextResponse.json({ error: '审核失败' }, { status: 500 });
  }
}
