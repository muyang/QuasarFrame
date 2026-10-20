import { z } from 'zod';
import { SENSOR_PRESETS } from './camera-optics';
import { horizonFromProfile, pointAtDistance, terrainProfile, type Coordinate, type HeightSampler } from './geo';

const marker = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict();
export const skylineMatchSchema = z.object({
  searchCenter: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  radiusM: z.number().int().min(100).max(2000),
  gridSide: z.union([z.literal(5), z.literal(7)]).default(5),
  azimuthDeg: z.number().min(0).max(360),
  focalLengthMm: z.number().min(1).max(2000),
  sensor: z.enum(['fullFrame', 'apsc', 'm43']),
  portrait: z.boolean(),
  imageAspect: z.number().positive().max(10),
  cameraHeightM: z.number().min(0).max(100).default(1.6),
  maxDistanceM: z.number().int().min(2000).max(35000).default(25000),
  markers: z.array(marker).min(5).max(12),
}).strict().refine((value) => {
  const xs = value.markers.map((item) => item.x);
  return Math.max(...xs) - Math.min(...xs) >= 0.5;
}, '请在照片左右两侧合计标记至少 5 个远处山脊点');
export type SkylineMatchInput = z.infer<typeof skylineMatchSchema>;

function fitPose(points: Array<{ x: number; tiltDeg: number }>) {
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanTilt = points.reduce((sum, point) => sum + point.tiltDeg, 0) / points.length;
  const varianceX = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (varianceX <= 0) return null;
  const slope = points.reduce((sum, point) => sum + (point.x - meanX) * (point.tiltDeg - meanTilt), 0) / varianceX;
  const tiltDeg = meanTilt + slope * (0.5 - meanX);
  const rmsDeg = Math.sqrt(points.reduce((sum, point) =>
    sum + (point.tiltDeg - (tiltDeg + slope * (point.x - 0.5))) ** 2, 0) / points.length);
  return { tiltDeg, rollSlopeDeg: slope, rmsDeg };
}

export function matchSkyline(input: SkylineMatchInput, sample: HeightSampler) {
  const dimensions = SENSOR_PRESETS[input.sensor];
  const activeWidth = input.portrait ? dimensions.height : dimensions.width;
  const activeHeight = input.portrait ? dimensions.width : dimensions.height;
  if (Math.abs(input.imageAspect / (activeWidth / activeHeight) - 1) > 0.08) {
    return { status: 'aspect_mismatch' as const, candidates: [] };
  }
  const stepM = 2 * input.radiusM / (input.gridSide - 1);
  const results: Array<{ coordinates: Coordinate; rmsDeg: number; tiltDeg: number; rollSlopeDeg: number }> = [];
  for (let row = 0; row < input.gridSide; row++) for (let col = 0; col < input.gridSide; col++) {
    const northM = input.radiusM - row * stepM;
    const eastM = -input.radiusM + col * stepM;
    const shifted = pointAtDistance(input.searchCenter, northM >= 0 ? 0 : 180, Math.abs(northM));
    const candidate = pointAtDistance(shifted, eastM >= 0 ? 90 : 270, Math.abs(eastM));
    if (sample(...candidate) === null) continue;
    const points: Array<{ x: number; tiltDeg: number }> = [];
    for (const mark of input.markers) {
      // Rectilinear photo projection. Heading is supplied; tilt and roll are fitted.
      const horizontalOffsetDeg = Math.atan((mark.x - 0.5) * activeWidth / input.focalLengthMm) * 180 / Math.PI;
      const photoVerticalDeg = Math.atan((0.5 - mark.y) * activeHeight / input.focalLengthMm) * 180 / Math.PI;
      const profile = terrainProfile({ origin: candidate, azimuthDeg: (input.azimuthDeg + horizontalOffsetDeg + 360) % 360,
        maxDistanceM: input.maxDistanceM, stepM: 60, cameraHeightM: input.cameraHeightM, sample });
      const ridge = horizonFromProfile(profile.points, 2000);
      if (ridge.status !== 'sampled' || ridge.angleDeg === null) break;
      points.push({ x: mark.x, tiltDeg: ridge.angleDeg - photoVerticalDeg });
    }
    if (points.length !== input.markers.length) continue;
    const pose = fitPose(points);
    if (pose && Math.abs(pose.rollSlopeDeg) <= 10 && pose.tiltDeg >= -20 && pose.tiltDeg <= 85) {
      results.push({ coordinates: candidate, ...pose });
    }
  }
  results.sort((a, b) => a.rmsDeg - b.rmsDeg);
  return { status: results.length ? 'candidates' as const : 'insufficient_data' as const,
    candidates: results.slice(0, 5), evaluatedCount: results.length,
    gridStepM: stepM, minimumUncertaintyRadiusM: Math.SQRT2 * stepM / 2,
    confidence: 'low' as const,
    note: '仅在指定区域内搜索；人工标记与 DEM 山脊拟合不能证明机位，分数不等于定位精度' };
}
