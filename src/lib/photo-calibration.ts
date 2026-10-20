import { z } from 'zod';
import { SENSOR_PRESETS } from './camera-optics';
import { horizonFromProfile, terrainProfile, type HeightSampler } from './geo';

export const ridgeCalibrationSchema = z.object({
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  coordinateSource: z.enum(['catalogue', 'user']),
  azimuthDeg: z.number().min(0).max(360),
  focalLengthMm: z.number().min(1).max(2000),
  sensor: z.enum(['fullFrame', 'apsc', 'm43']),
  portrait: z.boolean(),
  imageAspect: z.number().positive().max(10),
  markerX: z.number().min(0.45).max(0.55),
  markerY: z.number().min(0).max(1),
  cameraHeightM: z.number().min(0).max(100).default(1.6),
  maxDistanceM: z.number().int().min(2000).max(50000).default(35000),
}).strict();
export type RidgeCalibrationInput = z.infer<typeof ridgeCalibrationSchema>;

export function calibrateRidge(input: RidgeCalibrationInput, sample: HeightSampler) {
  const dimensions = SENSOR_PRESETS[input.sensor];
  const activeWidth = input.portrait ? dimensions.height : dimensions.width;
  const activeHeight = input.portrait ? dimensions.width : dimensions.height;
  if (Math.abs(input.imageAspect / (activeWidth / activeHeight) - 1) > 0.08) {
    return { status: 'aspect_mismatch' as const };
  }
  const profile = terrainProfile({ origin: input.coordinates, azimuthDeg: input.azimuthDeg,
    maxDistanceM: input.maxDistanceM, stepM: 30, cameraHeightM: input.cameraHeightM,
    sample });
  const ridge = horizonFromProfile(profile.points, 2000);
  if (ridge.status !== 'sampled' || ridge.angleDeg === null) return { status: 'insufficient_data' as const };
  const pixelOffsetDeg = Math.atan((0.5 - input.markerY) * activeHeight / input.focalLengthMm) * 180 / Math.PI;
  const suggestedTiltDeg = ridge.angleDeg - pixelOffsetDeg;
  return { status: 'theoretical' as const, suggestedTiltDeg, ridgeAngleDeg: ridge.angleDeg,
    ridgeDistanceM: ridge.distanceM, pixelOffsetDeg,
    uncertainty: '单点远山脊匹配；未解算横滚、镜头畸变、近景遮挡和拍摄坐标误差' };
}
