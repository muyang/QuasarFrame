import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { eq, desc, and, like } from 'drizzle-orm';
import { requireAuth, getUserId } from '@/auth/middleware';
import { db } from '@/db';
import { photos } from '@/db/schema';
import { photoUploadSchema } from '@/lib/validators';
import { processAndSaveImage } from '@/lib/file-upload';
import { provenanceForSubmission } from '@/lib/photo-evidence';
import { analyzePhotoBuffer } from '@/server/photo-evidence';

// POST — Upload new photo (multipart/form-data)
export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userId = getUserId(session)!;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const metadataJson = formData.get('metadata') as string | null;

    if (!file) {
      return NextResponse.json({ error: '请上传图片文件' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG、PNG、WebP 格式' }, { status: 400 });
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过 20MB' }, { status: 400 });
    }

    // Parse metadata
    let metadata: Partial<typeof photos.$inferInsert> = {};
    if (metadataJson) {
      const parsed = photoUploadSchema.safeParse(JSON.parse(metadataJson));
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0].message },
          { status: 400 }
        );
      }
      metadata = parsed.data;
    }
    if ((metadata.coordinatesLng == null) !== (metadata.coordinatesLat == null)) {
      return NextResponse.json({ error: '经度和纬度需同时填写' }, { status: 400 });
    }

    // Process and save image
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { evidence } = await analyzePhotoBuffer(fileBuffer);
    const provenance = provenanceForSubmission(metadata, evidence);
    const photoId = uuid();
    const { imageUrl, thumbnailUrl } = await processAndSaveImage(fileBuffer, photoId);

    // Create photo record
    await db.insert(photos).values({
      id: photoId,
      userId,
      title: metadata.title || '未命名作品',
      description: metadata.description || null,
      imageUrl,
      thumbnailUrl,
      locationId: metadata.locationId || null,
      coordinatesLng: metadata.coordinatesLng ?? null,
      coordinatesLat: metadata.coordinatesLat ?? null,
      shotAt: metadata.shotAt || null,
      weather: metadata.weather || null,
      cameraMake: metadata.cameraMake || null,
      cameraModel: metadata.cameraModel || null,
      lens: metadata.lens || null,
      aperture: metadata.aperture || null,
      shutterSpeed: metadata.shutterSpeed || null,
      iso: metadata.iso ?? null,
      focalLength: metadata.focalLength ?? null,
      sensorFormat: metadata.sensorFormat || 'unknown',
      azimuth: metadata.azimuth ?? null,
      elevation: metadata.elevation ?? null,
      gpsAccuracy: provenance.coordinates === 'exif' ? evidence.gpsAccuracyM : metadata.gpsAccuracy ?? null,
      metadataProvenance: JSON.stringify(provenance),
      shareCoordinates: metadata.shareCoordinates ?? false,
      priceType: metadata.priceType || 'free',
      price: metadata.price || 0,
      status: 'pending',
    });

    return NextResponse.json({ id: photoId, imageUrl, thumbnailUrl }, { status: 201 });
  } catch (err) {
    console.error('Photo upload error:', err);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}

// GET — List photos with filtering and pagination
export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const locationId = url.searchParams.get('locationId');
  const priceType = url.searchParams.get('priceType');
  const userId = url.searchParams.get('userId');
  const search = url.searchParams.get('q');
  const offset = (page - 1) * limit;

  const conditions = [eq(photos.status, 'approved')];

  if (locationId) conditions.push(eq(photos.locationId, locationId));
  if (priceType) conditions.push(eq(photos.priceType, priceType as 'free' | 'paid'));
  if (userId) conditions.push(eq(photos.userId, userId));
  if (search) conditions.push(like(photos.title, `%${search}%`));

  const results = await db
    .select({
      id: photos.id,
      userId: photos.userId,
      title: photos.title,
      description: photos.description,
      thumbnailUrl: photos.thumbnailUrl,
      imageUrl: photos.imageUrl,
      locationId: photos.locationId,
      coordinatesLng: photos.coordinatesLng,
      coordinatesLat: photos.coordinatesLat,
      shotAt: photos.shotAt,
      weather: photos.weather,
      cameraMake: photos.cameraMake,
      cameraModel: photos.cameraModel,
      aperture: photos.aperture,
      shutterSpeed: photos.shutterSpeed,
      iso: photos.iso,
      focalLength: photos.focalLength,
      priceType: photos.priceType,
      price: photos.price,
      downloadCount: photos.downloadCount,
      viewCount: photos.viewCount,
      createdAt: photos.createdAt,
    })
    .from(photos)
    .where(and(...conditions))
    .orderBy(desc(photos.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    photos: results.map((photo) => ({
      ...photo,
      imageUrl: photo.priceType === 'free'
        ? `/api/photos/${photo.id}/image`
        : photo.thumbnailUrl,
      coordinatesLng: null,
      coordinatesLat: null,
      cameraMake: photo.priceType === 'free' ? photo.cameraMake : null,
      cameraModel: photo.priceType === 'free' ? photo.cameraModel : null,
      aperture: photo.priceType === 'free' ? photo.aperture : null,
      shutterSpeed: photo.priceType === 'free' ? photo.shutterSpeed : null,
      iso: photo.priceType === 'free' ? photo.iso : null,
      focalLength: photo.priceType === 'free' ? photo.focalLength : null,
    })),
    page,
    limit,
  });
}
