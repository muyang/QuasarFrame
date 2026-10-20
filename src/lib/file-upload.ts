import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
export const PRIVATE_IMAGE_DIR = path.join(process.cwd(), 'data', 'originals');
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_QUALITY = 80;

export async function processAndSaveImage(
  fileBuffer: Buffer,
  photoId: string
): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await mkdir(PRIVATE_IMAGE_DIR, { recursive: true });

  const fileName = `${photoId}.jpg`;
  const thumbFileName = `${photoId}_thumb.jpg`;

  // Both derivatives strip EXIF, including embedded GPS. The full-size image
  // lives outside public and is served only by the photo authorization route.
  const originalPath = path.join(PRIVATE_IMAGE_DIR, fileName);
  await sharp(fileBuffer)
    .rotate()
    .jpeg({ quality: 95 })
    .toFile(originalPath);

  const thumbPath = path.join(UPLOAD_DIR, thumbFileName);
  await sharp(fileBuffer)
    .rotate()
    .resize(THUMBNAIL_WIDTH, null, { withoutEnlargement: true })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toFile(thumbPath);

  return {
    imageUrl: `/api/photos/${photoId}/image`,
    thumbnailUrl: `/uploads/${thumbFileName}`,
  };
}
