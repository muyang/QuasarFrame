import exifr from 'exifr';
import sharp from 'sharp';
import { normalizePhotoExif, type PhotoEvidence } from '@/lib/photo-evidence';

export async function analyzePhotoBuffer(buffer: Buffer): Promise<{ evidence: PhotoEvidence; width: number; height: number }> {
  const metadata = await sharp(buffer, { limitInputPixels: 100_000_000 }).metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || !metadata.width || !metadata.height) {
    throw new Error('不支持的图片内容');
  }
  let raw: unknown = null;
  try { raw = await exifr.parse(buffer, { tiff: true, exif: true, gps: true, reviveValues: false }); }
  catch { /* A valid image can contain damaged or unsupported EXIF. */ }
  return { evidence: normalizePhotoExif(raw), width: metadata.width, height: metadata.height };
}
