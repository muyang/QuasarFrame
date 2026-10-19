import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { photos, users, unlocks } from '@/db/schema';
import { requireAuth, getUserId } from '@/auth/middleware';
import { photoUpdateSchema } from '@/lib/validators';

// GET photo detail
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await import('@/auth/config').then((m) => m.auth());
  const currentUserId = session?.user?.id ?? null;

  const [photo] = await db
    .select({
      id: photos.id,
      userId: photos.userId,
      title: photos.title,
      description: photos.description,
      imageUrl: photos.imageUrl,
      thumbnailUrl: photos.thumbnailUrl,
      locationId: photos.locationId,
      coordinatesLng: photos.coordinatesLng,
      coordinatesLat: photos.coordinatesLat,
      shotAt: photos.shotAt,
      weather: photos.weather,
      cameraMake: photos.cameraMake,
      cameraModel: photos.cameraModel,
      lens: photos.lens,
      aperture: photos.aperture,
      shutterSpeed: photos.shutterSpeed,
      iso: photos.iso,
      focalLength: photos.focalLength,
      azimuth: photos.azimuth,
      elevation: photos.elevation,
      gpsAccuracy: photos.gpsAccuracy,
      priceType: photos.priceType,
      price: photos.price,
      downloadCount: photos.downloadCount,
      viewCount: photos.viewCount,
      status: photos.status,
      rejectReason: photos.rejectReason,
      createdAt: photos.createdAt,
    })
    .from(photos)
    .where(eq(photos.id, id))
    .limit(1);

  if (!photo) {
    return NextResponse.json({ error: '作品不存在' }, { status: 404 });
  }
  const isOwner = currentUserId === photo.userId;
  const isAdmin = session?.user?.role === 'admin';
  if (photo.status !== 'approved' && !isOwner && !isAdmin) {
    return NextResponse.json({ error: '作品不存在' }, { status: 404 });
  }

  // Get author info
  const [author] = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      role: users.role,
      isCreator: users.isCreator,
    })
    .from(users)
    .where(eq(users.id, photo.userId))
    .limit(1);

  // Check if current user has unlocked this photo
  let isUnlocked = photo.priceType === 'free' || isOwner || isAdmin;

  if (currentUserId) {
    if (!isUnlocked) {
      const [unlock] = await db
        .select()
        .from(unlocks)
        .where(and(eq(unlocks.userId, currentUserId), eq(unlocks.resourceId, id)))
        .limit(1);
      if (unlock) isUnlocked = true;
    }
  }

  // Increment view count
  await db
    .update(photos)
    .set({ viewCount: photo.viewCount + 1 })
    .where(eq(photos.id, id));

  // For paid content, hide full-res URL and shooting params unless unlocked
  const responsePhoto = { ...photo };
  if (!isUnlocked) {
    responsePhoto.imageUrl = photo.thumbnailUrl; // show thumbnail only
    responsePhoto.coordinatesLng = null;
    responsePhoto.coordinatesLat = null;
    responsePhoto.azimuth = null;
    responsePhoto.elevation = null;
    responsePhoto.aperture = null;
    responsePhoto.shutterSpeed = null;
    responsePhoto.iso = null;
    responsePhoto.focalLength = null;
  }
  // Free publishing does not imply consent to disclose a precise shooting position.
  if (photo.priceType === 'free' && !isOwner && !isAdmin) {
    responsePhoto.coordinatesLng = null;
    responsePhoto.coordinatesLat = null;
    responsePhoto.azimuth = null;
    responsePhoto.elevation = null;
  }
  if (isUnlocked) responsePhoto.imageUrl = `/api/photos/${id}/image`;

  return NextResponse.json({
    ...responsePhoto,
    author,
    isUnlocked,
    isOwner,
  });
}

// PATCH update photo
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const userId = getUserId(session);

  const [existing] = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: '作品不存在' }, { status: 404 });
  }
  if (existing.userId !== userId) {
    return NextResponse.json({ error: '无权修改' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = photoUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updateData: Partial<typeof photos.$inferInsert> = parsed.data;

    if (Object.keys(updateData).length > 0) {
      await db.update(photos).set(updateData).where(eq(photos.id, id));
    }

    return NextResponse.json({ message: '更新成功' });
  } catch {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE photo
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const userId = getUserId(session);
  const userRole = session!.user.role;

  const [existing] = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: '作品不存在' }, { status: 404 });
  }
  if (existing.userId !== userId && userRole !== 'admin') {
    return NextResponse.json({ error: '无权删除' }, { status: 403 });
  }

  await db.delete(photos).where(eq(photos.id, id));
  return NextResponse.json({ message: '已删除' });
}
