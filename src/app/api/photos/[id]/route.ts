import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { photos, users, unlocks } from '@/db/schema';
import { requireAuth, getUserId } from '@/auth/middleware';
import { photoUpdateSchema } from '@/lib/validators';
import { photoProvenanceSchema } from '@/lib/photo-evidence';
import { redactPhotoPosition } from '@/lib/photo-privacy';

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
      sensorFormat: photos.sensorFormat,
      azimuth: photos.azimuth,
      elevation: photos.elevation,
      gpsAccuracy: photos.gpsAccuracy,
      metadataProvenance: photos.metadataProvenance,
      shareCoordinates: photos.shareCoordinates,
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
  let provenance = photoProvenanceSchema.parse({});
  try { provenance = photoProvenanceSchema.parse(JSON.parse(photo.metadataProvenance)); }
  catch { /* Pre-migration records have no source evidence. */ }
  if (!isUnlocked) {
    responsePhoto.imageUrl = photo.thumbnailUrl; // show thumbnail only
    responsePhoto.aperture = null;
    responsePhoto.shutterSpeed = null;
    responsePhoto.iso = null;
    responsePhoto.focalLength = null;
  }
  // Payment does not imply consent to disclose a precise shooting position.
  const positionVisible = isOwner || isAdmin || (isUnlocked && photo.shareCoordinates);
  if (!positionVisible) {
    provenance = { ...provenance, coordinates: 'unknown', direction: 'unknown' };
  }
  if (isUnlocked) responsePhoto.imageUrl = `/api/photos/${id}/image`;
  const safePhoto = redactPhotoPosition(responsePhoto, { ownsPhoto: isOwner,
    isAdmin, isUnlocked, shareCoordinates: photo.shareCoordinates });

  return NextResponse.json({
    ...safePhoto,
    metadataProvenance: undefined,
    author,
    provenance,
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
    const changedPosition = parsed.data.coordinatesLng !== undefined || parsed.data.coordinatesLat !== undefined;
    if (changedPosition && (parsed.data.coordinatesLng === undefined || parsed.data.coordinatesLat === undefined)) {
      return NextResponse.json({ error: '经度和纬度需同时更新' }, { status: 400 });
    }
    let provenance = photoProvenanceSchema.parse({});
    try { provenance = photoProvenanceSchema.parse(JSON.parse(existing.metadataProvenance)); }
    catch { /* Legacy record. */ }
    if (changedPosition) {
      provenance.coordinates = 'manual';
      if (parsed.data.shareCoordinates === undefined) updateData.shareCoordinates = false;
    }
    if (parsed.data.azimuth !== undefined || parsed.data.elevation !== undefined) provenance.direction = 'manual';
    if (parsed.data.shotAt !== undefined) provenance.captureTime = 'manual';
    if (['cameraMake', 'cameraModel', 'lens', 'aperture', 'shutterSpeed', 'iso', 'focalLength', 'sensorFormat']
      .some((field) => field in parsed.data)) provenance.settings = 'manual';
    updateData.metadataProvenance = JSON.stringify(provenance);

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
