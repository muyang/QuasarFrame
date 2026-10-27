import type { PhotoEvidence, PhotoProvenance } from './photo-evidence';

export interface PhotoSubmissionCoordinates {
  coordinatesLng?: number | null;
  coordinatesLat?: number | null;
  azimuth?: number | null;
  shotAt?: string | null;
  focalLength?: number | null;
}

export function photoEvidenceRecords(
  evidence: PhotoEvidence, submitted: PhotoSubmissionCoordinates, provenance: PhotoProvenance,
) {
  const records: Array<{ field: string; source: 'exif' | 'manual'; valueJson: string; confidence: 'reported' }> = [];
  const add = (field: string, value: unknown, source: 'exif' | 'manual') => {
    if (value !== null && value !== undefined) records.push({ field, source, valueJson: JSON.stringify(value), confidence: 'reported' });
  };
  if (evidence.coordinates) add('coordinates', evidence.coordinates, 'exif');
  if (submitted.coordinatesLng != null && submitted.coordinatesLat != null
    && provenance.coordinates === 'manual') add('coordinates', [submitted.coordinatesLng, submitted.coordinatesLat], 'manual');
  if (evidence.azimuthDeg !== null) add('azimuthDeg', evidence.azimuthDeg, 'exif');
  if (submitted.azimuth != null && provenance.direction === 'manual') add('azimuthDeg', submitted.azimuth, 'manual');
  if (evidence.shotAtLocal) add('shotAtLocal', { local: evidence.shotAtLocal, offset: evidence.timeOffset }, 'exif');
  if (submitted.shotAt && provenance.captureTime === 'manual') add('shotAtLocal', submitted.shotAt, 'manual');
  if (evidence.focalLengthMm !== null) add('focalLengthMm', evidence.focalLengthMm, 'exif');
  if (submitted.focalLength != null && provenance.settings === 'manual') add('focalLengthMm', submitted.focalLength, 'manual');
  return records;
}

export function photoLocationRecords(
  evidence: PhotoEvidence, submitted: PhotoSubmissionCoordinates, provenance: PhotoProvenance,
) {
  const candidates: Array<{
    longitude: number; latitude: number; radiusM: number | null; azimuthDeg: number | null;
    method: 'exif' | 'manual'; score: number | null; status: 'proposed'; evidenceJson: string;
  }> = [];
  if (evidence.coordinates) candidates.push({
    longitude: evidence.coordinates[0], latitude: evidence.coordinates[1],
    radiusM: evidence.gpsAccuracyM, azimuthDeg: evidence.azimuthDeg,
    method: 'exif', score: null, status: 'proposed',
    evidenceJson: JSON.stringify({ coordinateSource: 'exif', accuracySource: evidence.gpsAccuracyM === null ? 'unknown' : 'exif' }),
  });
  if (submitted.coordinatesLng != null && submitted.coordinatesLat != null && provenance.coordinates === 'manual') {
    candidates.push({
      longitude: submitted.coordinatesLng, latitude: submitted.coordinatesLat,
      radiusM: null, azimuthDeg: submitted.azimuth ?? null,
      method: 'manual', score: null, status: 'proposed',
      evidenceJson: JSON.stringify({ coordinateSource: 'manual', accuracySource: 'unknown' }),
    });
  }
  return candidates;
}
