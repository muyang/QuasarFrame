import { z } from 'zod';

export type EvidenceSource = 'exif' | 'manual' | 'unknown';
export interface PhotoEvidence {
  coordinates: [number, number] | null;
  gpsAccuracyM: number | null;
  azimuthDeg: number | null;
  shotAtLocal: string | null;
  timeOffset: string | null;
  cameraMake: string | null;
  cameraModel: string | null;
  lens: string | null;
  aperture: string | null;
  shutterSpeed: string | null;
  iso: number | null;
  focalLengthMm: number | null;
  equivalentFocalLengthMm: number | null;
  sensorSuggestion: 'fullFrame' | 'apsc' | 'm43' | null;
  warnings: string[];
}

export const photoProvenanceSchema = z.object({
  coordinates: z.enum(['exif', 'manual', 'unknown']).default('unknown'),
  direction: z.enum(['exif', 'manual', 'unknown']).default('unknown'),
  captureTime: z.enum(['exif', 'manual', 'unknown']).default('unknown'),
  settings: z.enum(['exif', 'manual', 'unknown']).default('unknown'),
}).strict();
export type PhotoProvenance = z.infer<typeof photoProvenanceSchema>;

function text(value: unknown, limit = 200): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : null;
}

function number(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function localDateTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const normalized = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
  const date = new Date(`${normalized}:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === normalized ? normalized : null;
}

function shutter(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  return seconds >= 0.5 ? `${Number(seconds.toFixed(2))}s` : `1/${Math.round(1 / seconds)}s`;
}

/** Convert already decoded EXIF tags into bounded evidence; never infer a GPS fix from pixels. */
export function normalizePhotoExif(raw: unknown): PhotoEvidence {
  const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const longitude = number(data.longitude, -180, 180);
  const latitude = number(data.latitude, -90, 90);
  const gpsAccuracyM = number(data.GPSHPositioningError, 0, 100000);
  const heading = number(data.GPSImgDirection, 0, 360);
  const headingRef = text(data.GPSImgDirectionRef, 20);
  const trueNorth = headingRef === 'T' || headingRef?.toLowerCase() === 'true north';
  const focalLengthMm = number(data.FocalLength, 1, 2000);
  const equivalentFocalLengthMm = number(data.FocalLengthIn35mmFormat, 1, 4000);
  const crop = focalLengthMm && equivalentFocalLengthMm ? equivalentFocalLengthMm / focalLengthMm : null;
  const sensorSuggestion = crop !== null && crop > 0.9 && crop < 1.1 ? 'fullFrame'
    : crop !== null && crop > 1.4 && crop < 1.7 ? 'apsc'
      : crop !== null && crop > 1.85 && crop < 2.15 ? 'm43' : null;
  const shotAtLocal = localDateTime(data.DateTimeOriginal);
  const timeOffset = text(data.OffsetTimeOriginal, 6);
  const warnings: string[] = [];
  if (heading !== null && !trueNorth) {
    warnings.push(headingRef ? 'EXIF 朝向使用磁北，未换算真北；不用于地形方位计算。'
      : 'EXIF 朝向未注明真北或磁北；不用于地形方位计算。');
  }
  if (shotAtLocal && !timeOffset) warnings.push('EXIF 仅有相机本地时间，没有时区；请核对拍摄地点的实际时间。');
  if (longitude === null || latitude === null) warnings.push('照片没有可用 GPS；不能仅凭这张照片给出精确机位。');
  return {
    coordinates: longitude !== null && latitude !== null ? [longitude, latitude] : null,
    gpsAccuracyM,
    azimuthDeg: heading !== null && trueNorth ? heading : null,
    shotAtLocal, timeOffset,
    cameraMake: text(data.Make, 100), cameraModel: text(data.Model, 100),
    lens: text(data.LensModel, 200),
    aperture: number(data.FNumber, 0.5, 64) !== null ? `f/${data.FNumber}` : null,
    shutterSpeed: shutter(number(data.ExposureTime, 0, 3600)),
    iso: number(data.ISO, 1, 1000000), focalLengthMm,
    equivalentFocalLengthMm, sensorSuggestion, warnings,
  };
}

export function sourceForValue(value: unknown, exifValue: unknown, tolerance = 0): EvidenceSource {
  if (value === null || value === undefined || value === '') return 'unknown';
  if (typeof value === 'number' && typeof exifValue === 'number' && Math.abs(value - exifValue) <= tolerance) return 'exif';
  if (typeof value === 'string' && value === exifValue) return 'exif';
  return 'manual';
}

export function provenanceForSubmission(submitted: {
  coordinatesLng?: number | null; coordinatesLat?: number | null; azimuth?: number | null; shotAt?: string | null;
  cameraMake?: string | null; cameraModel?: string | null; lens?: string | null; aperture?: string | null;
  shutterSpeed?: string | null; iso?: number | null; focalLength?: number | null;
}, evidence: PhotoEvidence): PhotoProvenance {
  const hasCoordinates = submitted.coordinatesLng != null && submitted.coordinatesLat != null;
  const coordinateMatch = evidence.coordinates && hasCoordinates
    && Math.abs(submitted.coordinatesLng! - evidence.coordinates[0]) <= 0.00001
    && Math.abs(submitted.coordinatesLat! - evidence.coordinates[1]) <= 0.00001;
  const settings: Array<[unknown, unknown, number?]> = [
    [submitted.cameraMake, evidence.cameraMake], [submitted.cameraModel, evidence.cameraModel],
    [submitted.lens, evidence.lens], [submitted.aperture, evidence.aperture],
    [submitted.shutterSpeed, evidence.shutterSpeed], [submitted.iso, evidence.iso],
    [submitted.focalLength, evidence.focalLengthMm, 1],
  ];
  const supplied = settings.filter(([value]) => value !== undefined && value !== null && value !== '');
  return {
    coordinates: !hasCoordinates ? 'unknown' : coordinateMatch ? 'exif' : 'manual',
    direction: sourceForValue(submitted.azimuth, evidence.azimuthDeg, 0.5),
    captureTime: sourceForValue(submitted.shotAt, evidence.shotAtLocal),
    settings: !supplied.length ? 'unknown'
      : supplied.every(([value, exifValue, tolerance]) => sourceForValue(value, exifValue, tolerance) === 'exif') ? 'exif' : 'manual',
  };
}

export function shootingGuidance(evidence: Pick<PhotoEvidence,
  'coordinates' | 'azimuthDeg' | 'focalLengthMm' | 'shutterSpeed' | 'iso'>): string[] {
  const guidance: string[] = [];
  if (!evidence.coordinates) guidance.push('请补充实测 GPS 或从地图选择大致区域；当前无法计算这张照片的真实地形机位。');
  if (evidence.azimuthDeg === null) guidance.push('请在地图或照片中确认朝向；缺少真北方位角时不能对齐山脊与日月。');
  if (evidence.focalLengthMm === null) guidance.push('请填写实际焦距和传感器尺寸，才能估算视场与构图。');
  const shutterMatch = evidence.shutterSpeed?.match(/^1\/(\d+)s$/);
  const shutterSeconds = shutterMatch ? 1 / Number(shutterMatch[1]) : evidence.shutterSpeed?.endsWith('s') ? Number(evidence.shutterSpeed.slice(0, -1)) : null;
  if (shutterSeconds !== null && shutterSeconds !== undefined && shutterSeconds >= 0.25) guidance.push('慢快门可能需要三脚架或稳定支撑；请根据主体运动与防抖能力试拍。');
  if (evidence.iso !== null && evidence.iso >= 3200) guidance.push('高 ISO 可保住快门速度，但噪声取决于机型；可试拍并比较更低 ISO 与支撑方案。');
  return guidance;
}
