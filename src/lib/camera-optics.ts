import { SENSOR_SIZE_MM } from './constants';

export const SENSOR_PRESETS = {
  fullFrame: { name: '全画幅', width: 36, height: 24 },
  apsc: { name: 'APS-C (23.5 × 15.6)', width: 23.5, height: 15.6 },
  m43: { name: 'M4/3', width: 17.3, height: 13 },
};
export type SensorPreset = keyof typeof SENSOR_PRESETS;

/** Rectilinear field of view for the specified active sensor dimension. */
export function focalLengthToFov(focalLength: number, sensorDimension = 24): number {
  if (!Number.isFinite(focalLength) || !Number.isFinite(sensorDimension) || focalLength <= 0 || sensorDimension <= 0) throw new Error('焦距和传感器尺寸必须为正数');
  return 2 * Math.atan(sensorDimension / (2 * focalLength)) * (180 / Math.PI);
}

export function getCameraView(focalLength: number, sensor: SensorPreset, portrait: boolean) {
  const { width, height } = SENSOR_PRESETS[sensor];
  const activeWidth = portrait ? height : width;
  const activeHeight = portrait ? width : height;
  return {
    horizontalFov: focalLengthToFov(focalLength, activeWidth),
    verticalFov: focalLengthToFov(focalLength, activeHeight),
    aspect: activeWidth / activeHeight,
    equivalentFocalLength: focalLength * Math.hypot(36, 24) / Math.hypot(width, height),
  };
}

/** Depth of field approximation (meters) */
export function calculateDof(
  focalLength: number,
  aperture: number,
  focusDistance: number,
  sensorSize: number = SENSOR_SIZE_MM
): { near: number; far: number; total: number } {
  const distanceMm = focusDistance * 1000;
  const circleOfConfusion = sensorSize / 1500;
  const hyperfocal =
    (focalLength * focalLength) / (aperture * circleOfConfusion) + focalLength;

  const near =
    (distanceMm * hyperfocal) /
    (hyperfocal + distanceMm - focalLength);
  const far =
    distanceMm >= hyperfocal
      ? Infinity
      : (distanceMm * hyperfocal) /
        (hyperfocal - distanceMm + focalLength);

  return {
    near: Math.max(0, near / 1000),
    far: far === Infinity ? Infinity : far / 1000,
    total: far === Infinity ? Infinity : (far - near) / 1000,
  };
}

/** Get lens type description from focal length */
export function getLensType(focalLength: number): string {
  if (focalLength <= 24) return '超广角';
  if (focalLength <= 35) return '广角';
  if (focalLength <= 55) return '标准';
  if (focalLength <= 100) return '中长焦';
  if (focalLength <= 200) return '长焦';
  return '超长焦';
}
