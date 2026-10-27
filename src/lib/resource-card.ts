import { z } from 'zod';

const bboxSchema = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);
const httpsUrl = z.url().startsWith('https://');

/** Public, machine-readable contract for a data source or an executable capability. */
export const resourceCardSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  kind: z.enum(['data', 'capability']),
  version: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  status: z.literal('ready'),
  provider: z.object({ name: z.string().min(1), url: httpsUrl }).strict(),
  coverage: z.object({
    bbox: bboxSchema,
    horizontalCrs: z.literal('EPSG:4326'),
    verticalDatum: z.enum(['EGM2008', 'not_applicable']),
    temporal: z.object({
      mode: z.enum(['static', 'computed']),
      validFrom: z.iso.datetime({ offset: true }).nullable(),
      validUntil: z.iso.datetime({ offset: true }).nullable(),
    }).strict(),
  }).strict(),
  contract: z.object({
    operations: z.array(z.string().min(1)).min(1),
    inputSchema: z.string().min(1),
    outputSchema: z.string().min(1),
  }).strict(),
  provenance: z.object({
    sourceUrl: httpsUrl,
    attribution: z.string().min(1),
    contentSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    retrievedAt: z.iso.datetime({ offset: true }).nullable(),
  }).strict(),
  rights: z.object({
    access: z.enum(['public_derived', 'internal_only']),
    rawRedistribution: z.enum(['not_evaluated', 'permitted', 'prohibited']),
    termsUrl: httpsUrl,
  }).strict(),
  quality: z.object({
    status: z.enum(['theoretical', 'unverified_accuracy']),
    resolutionArcsec: z.number().finite().positive().nullable(),
    limitations: z.array(z.string().min(1)).min(1),
  }).strict(),
}).strict();

export type ResourceCard = z.infer<typeof resourceCardSchema>;
export type ResourceRequest = {
  operation: string;
  access: 'public' | 'internal';
  coordinates: readonly [number, number];
  horizontalCrs: string;
  verticalDatum?: string | null;
  at?: string;
};
export type ResourceContractReason = 'access_denied' | 'operation_not_allowed' | 'outside_coverage'
  | 'horizontal_crs_mismatch' | 'vertical_datum_mismatch' | 'outside_time_range';

export function resourceCardJsonSchema() {
  const schema = z.toJSONSchema(resourceCardSchema, { target: 'draft-2020-12' });
  const coverage = schema.properties?.coverage as { properties?: Record<string, unknown> };
  const bbox = coverage.properties?.bbox as Record<string, unknown>;
  // Zod's tuple export omits tuple length; JSON Schema consumers need it explicitly.
  bbox.minItems = 4;
  bbox.maxItems = 4;
  return {
    ...schema,
    $id: 'https://raw.githubusercontent.com/muyang/QuasarFrame/main/contracts/resource-card.v1.schema.json',
  };
}

export function isValidBbox(bbox: readonly [number, number, number, number]): boolean {
  return bbox[0] < bbox[2] && bbox[1] < bbox[3];
}

export function validateResourceRequest(card: ResourceCard, request: ResourceRequest):
  { ok: true } | { ok: false; reason: ResourceContractReason } {
  if (request.access === 'public' && card.rights.access !== 'public_derived') return { ok: false, reason: 'access_denied' };
  if (!card.contract.operations.includes(request.operation)) return { ok: false, reason: 'operation_not_allowed' };
  if (request.horizontalCrs !== card.coverage.horizontalCrs) return { ok: false, reason: 'horizontal_crs_mismatch' };
  const [west, south, east, north] = card.coverage.bbox;
  const [longitude, latitude] = request.coordinates;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)
    || longitude < west || longitude > east || latitude < south || latitude > north) {
    return { ok: false, reason: 'outside_coverage' };
  }
  if (request.verticalDatum && card.coverage.verticalDatum !== 'not_applicable'
    && request.verticalDatum !== card.coverage.verticalDatum) {
    return { ok: false, reason: 'vertical_datum_mismatch' };
  }
  if (request.at) {
    const instant = Date.parse(request.at);
    const from = card.coverage.temporal.validFrom, until = card.coverage.temporal.validUntil;
    if (!Number.isFinite(instant) || (from && instant < Date.parse(from)) || (until && instant > Date.parse(until))) {
      return { ok: false, reason: 'outside_time_range' };
    }
  }
  return { ok: true };
}
