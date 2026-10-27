import { z } from 'zod';

const coordinate = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const datum = z.enum(['unknown', 'WGS84_ellipsoid', 'EGM96', 'EGM2008']);
const measuredElevation = z.object({
  elevationM: z.number().finite().min(-500).max(9000).nullable().default(null),
  verticalDatum: datum.default('unknown'),
}).strict();

export const terrainAnalysisInputSchema = z.object({
  vantage: measuredElevation.extend({
    coordinates: coordinate,
    cameraHeightM: z.number().finite().min(0).max(100).default(1.6),
    coordinateSource: z.enum(['catalogue', 'user']).default('catalogue'),
  }),
  subject: measuredElevation.extend({
    coordinates: coordinate,
    heightAboveGroundM: z.number().finite().min(0).max(1000).default(0),
  }).nullable().default(null),
  azimuthDeg: z.number().finite().min(0).max(360),
  at: z.iso.datetime({ offset: true }),
  maxDistanceM: z.number().int().min(2000).max(50000).default(35000),
  stepM: z.number().int().min(30).max(200).default(30),
}).strict();

export type TerrainAnalysisInput = z.infer<typeof terrainAnalysisInputSchema>;

export interface TerrainAnalysisResult {
  status: 'theoretical_only' | 'partial_coverage' | 'outside_coverage' | 'datum_mismatch' | 'illustrative_coordinate_mismatch';
  dataVersion: string;
  dataset: string;
  verticalDatum: string;
  resource?: {
    cardId: string;
    cardVersion: string;
    sourceUrl: string;
    attribution: string;
    contentSha256: string | null;
    qualityStatus: 'theoretical' | 'unverified_accuracy';
  };
  coordinateStatus: 'illustrative' | 'unverified';
  sampledElevationM?: number;
  catalogueDifferenceM?: number | null;
  profile?: Array<{ distanceM: number; elevationM: number | null; angleDeg: number | null }>;
  horizon?: { status: string; angleDeg: number | null; distanceM: number | null };
  distantRidge?: { status: string; angleDeg: number | null; distanceM: number | null };
  sun?: { altitudeDeg: number; azimuthDeg: number; visibility: { status: string; clear?: boolean; marginDeg?: number } };
  moon?: { altitudeDeg: number; azimuthDeg: number; visibility: { status: string; clear?: boolean; marginDeg?: number } };
  subject?: { status: string; clear?: boolean; clearanceDeg?: number; distanceM?: number } | null;
}
