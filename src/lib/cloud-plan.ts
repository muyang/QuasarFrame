import { z } from 'zod';
import { shootingPlanSchema } from './shooting-plan';

const coordinate = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const optionalMeters = z.number().finite().min(0).max(100000).nullable();
const elevationMeters = z.number().finite().min(-500).max(9000).nullable();
const verticalDatum = z.enum(['unknown', 'WGS84_ellipsoid', 'EGM96']);

export const vantageInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  source: z.enum(['user_input', 'gps']).default('user_input'),
  horizontalAccuracyM: optionalMeters.default(null),
  elevationM: elevationMeters.default(null),
  verticalDatum: verticalDatum.default('unknown'),
  cameraHeightM: z.number().finite().min(0).max(100).nullable().default(null),
}).strict();

export const subjectInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  coordinates: coordinate,
  source: z.enum(['user_input', 'gps']).default('user_input'),
  horizontalAccuracyM: optionalMeters.default(null),
  elevationM: elevationMeters.default(null),
  verticalDatum: verticalDatum.default('unknown'),
  heightAboveGroundM: z.number().finite().min(0).max(1000).nullable().default(null),
}).strict();

export const cloudPlanInputSchema = z.object({
  plan: shootingPlanSchema,
  vantage: vantageInputSchema,
  subject: subjectInputSchema.nullable().default(null),
}).strict();

export const legacyImportSchema = z.object({ plans: z.array(shootingPlanSchema).max(50) }).strict();
export type CloudPlanInput = z.infer<typeof cloudPlanInputSchema>;

export interface CloudPlanRecord {
  id: string;
  place: { id: string; catalogueId: string; name: string; status: 'illustrative' };
  plan: z.infer<typeof shootingPlanSchema>;
  vantage: {
    id: string; name: string; source: 'catalogue_estimate' | 'user_input' | 'gps' | 'legacy_import';
    horizontalAccuracyM: number | null; elevationM: number | null;
    verticalDatum: 'unknown' | 'WGS84_ellipsoid' | 'EGM96'; cameraHeightM: number | null;
    verifiedAt: string | null;
  };
  subject: ({
    id: string; name: string; coordinates: [number, number]; source: 'user_input' | 'gps' | 'legacy_import';
    horizontalAccuracyM: number | null; elevationM: number | null;
    verticalDatum: 'unknown' | 'WGS84_ellipsoid' | 'EGM96'; heightAboveGroundM: number | null;
    verifiedAt: string | null;
  }) | null;
  dataVersion: string;
  createdAt: string;
  updatedAt: string;
}
