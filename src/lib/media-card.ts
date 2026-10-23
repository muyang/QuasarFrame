import { createHash } from 'node:crypto';
import { z } from 'zod';
import { distributionScopeSchema, noDistribution, type DistributionScope } from './license';

export const photoMediaCardSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().startsWith('media.photo.'),
  kind: z.literal('media'),
  version: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['private', 'published', 'withdrawn']),
  ownerId: z.string(),
  capture: z.object({
    localTime: z.string().nullable(),
    timeZoneStatus: z.literal('unknown'),
    coordinates: z.tuple([z.number(), z.number()]).nullable(),
    coordinateSource: z.enum(['exif', 'manual', 'unknown']),
    precisionStatus: z.literal('unverified'),
  }).strict(),
  provenance: z.object({ source: z.literal('user_submission'), createdAt: z.string() }).strict(),
  rights: z.object({
    licenseStatus: z.enum(['missing', 'pending', 'approved', 'rejected', 'revoked']),
    licenseVersion: z.number().int().nullable(),
    scope: distributionScopeSchema,
  }).strict(),
  contract: z.object({
    imageEndpoint: z.string(),
    evidenceEndpoint: z.string(),
  }).strict(),
}).strict();

export type PhotoMediaCard = z.infer<typeof photoMediaCardSchema>;
export function photoMediaCardJsonSchema() {
  const schema = z.toJSONSchema(photoMediaCardSchema, { target: 'draft-2020-12' });
  const capture = schema.properties?.capture as { properties?: Record<string, unknown> };
  const coordinates = capture.properties?.coordinates as { anyOf?: Array<Record<string, unknown>> };
  const tuple = coordinates.anyOf?.find((item) => item.type === 'array');
  if (tuple) { tuple.minItems = 2; tuple.maxItems = 2; }
  return { ...schema,
    $id: 'https://raw.githubusercontent.com/muyang/QuasarFrame/main/contracts/media-card.v1.schema.json' };
}
export type PhotoCardInput = {
  id: string; userId: string; title: string; status: 'draft' | 'pending' | 'approved' | 'rejected';
  priceType: 'free' | 'paid';
  shotAt: string | null; coordinatesLng: number | null; coordinatesLat: number | null;
  shareCoordinates: boolean; metadataProvenance: string; createdAt: string;
};

export function buildPhotoMediaCard(
  photo: PhotoCardInput,
  license: { status: 'pending' | 'approved' | 'rejected' | 'revoked'; version: number; scope: DistributionScope } | null,
  viewer: 'public' | 'owner',
): PhotoMediaCard {
  let coordinateSource: 'exif' | 'manual' | 'unknown' = 'unknown';
  try {
    const parsed = JSON.parse(photo.metadataProvenance) as { coordinates?: string };
    if (parsed.coordinates === 'exif' || parsed.coordinates === 'manual') coordinateSource = parsed.coordinates;
  } catch { /* Legacy rows remain unknown. */ }
  const publicAllowed = photo.status === 'approved' && license?.status === 'approved'
    && license.scope.web && (photo.priceType === 'free' || license.scope.paid);
  const coordinates = photo.coordinatesLng !== null && photo.coordinatesLat !== null
    && (viewer === 'owner' || (publicAllowed && photo.shareCoordinates))
    ? [photo.coordinatesLng, photo.coordinatesLat] as [number, number] : null;
  const scope = viewer === 'owner' ? license?.scope ?? noDistribution
    : publicAllowed ? license.scope : noDistribution;
  const fingerprint = createHash('sha256').update(JSON.stringify({
    title: photo.title, status: photo.status, shotAt: photo.shotAt,
    coordinates: viewer === 'owner' ? coordinates : photo.shareCoordinates ? coordinates : null,
    licenseVersion: license?.version ?? 0, licenseStatus: license?.status ?? 'missing', scope,
  })).digest('hex').slice(0, 16);
  return photoMediaCardSchema.parse({
    schemaVersion: 1, id: `media.photo.${photo.id}`, kind: 'media', version: `photo-${fingerprint}`,
    title: photo.title,
    status: photo.status === 'rejected' || license?.status === 'revoked' ? 'withdrawn'
      : publicAllowed ? 'published' : 'private',
    ownerId: photo.userId,
    capture: { localTime: viewer === 'owner' || publicAllowed ? photo.shotAt : null,
      timeZoneStatus: 'unknown', coordinates, coordinateSource: coordinates ? coordinateSource : 'unknown',
      precisionStatus: 'unverified' },
    provenance: { source: 'user_submission', createdAt: photo.createdAt },
    rights: { licenseStatus: license?.status ?? 'missing', licenseVersion: license?.version ?? null, scope },
    contract: { imageEndpoint: `/api/photos/${photo.id}/image`, evidenceEndpoint: `/api/photos/${photo.id}/evidence` },
  });
}
