/** Deterministic WGS84-like spherical sight-line geometry; no atmospheric refraction. */
const EARTH_RADIUS_M = 6_371_000;
const RAD = Math.PI / 180;

export type Coordinate = [longitude: number, latitude: number];
export type HeightSampler = (longitude: number, latitude: number) => number | null;

export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const deltaLat = (b[1] - a[1]) * RAD;
  const deltaLon = (b[0] - a[0]) * RAD;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function initialBearingDeg(a: Coordinate, b: Coordinate): number {
  const deltaLon = (b[0] - a[0]) * RAD;
  const y = Math.sin(deltaLon) * Math.cos(b[1] * RAD);
  const x = Math.cos(a[1] * RAD) * Math.sin(b[1] * RAD)
    - Math.sin(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.cos(deltaLon);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

export function pointAtDistance(origin: Coordinate, azimuthDeg: number, distanceM: number): Coordinate {
  const lat = origin[1] * RAD, lng = origin[0] * RAD, bearing = azimuthDeg * RAD;
  const angular = distanceM / EARTH_RADIUS_M;
  const latitude = Math.asin(Math.sin(lat) * Math.cos(angular) + Math.cos(lat) * Math.sin(angular) * Math.cos(bearing));
  const longitude = lng + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(lat),
    Math.cos(angular) - Math.sin(lat) * Math.sin(latitude));
  return [((longitude / RAD + 540) % 360) - 180, latitude / RAD];
}

/** Angle relative to observer's local horizontal, including Earth curvature. */
export function apparentElevationDeg(observerM: number, targetM: number, distanceM: number): number {
  if (distanceM <= 0) return 0;
  const theta = distanceM / EARTH_RADIUS_M;
  const vertical = (EARTH_RADIUS_M + targetM) * Math.cos(theta) - (EARTH_RADIUS_M + observerM);
  const horizontal = (EARTH_RADIUS_M + targetM) * Math.sin(theta);
  return Math.atan2(vertical, horizontal) / RAD;
}

export interface ProfilePoint { distanceM: number; elevationM: number | null; angleDeg: number | null; }

export function terrainProfile(options: {
  origin: Coordinate; azimuthDeg: number; maxDistanceM: number; stepM: number;
  cameraHeightM: number; observerElevationM?: number; sample: HeightSampler;
}): { observerHeightM: number | null; points: ProfilePoint[]; complete: boolean } {
  const { origin, azimuthDeg, maxDistanceM, stepM, cameraHeightM, sample } = options;
  if (!(maxDistanceM > 0 && maxDistanceM <= 100_000 && stepM >= 20 && stepM <= 1000 && cameraHeightM >= 0 && cameraHeightM <= 100)) {
    throw new Error('Invalid terrain profile parameters');
  }
  const surface = options.observerElevationM ?? sample(...origin);
  if (surface === null) return { observerHeightM: null, points: [], complete: false };
  const observerHeightM = surface + cameraHeightM;
  const points: ProfilePoint[] = [];
  let complete = true;
  for (let distanceM = stepM; distanceM <= maxDistanceM; distanceM += stepM) {
    const elevationM = sample(...pointAtDistance(origin, azimuthDeg, distanceM));
    if (elevationM === null) complete = false;
    points.push({ distanceM, elevationM, angleDeg: elevationM === null ? null : apparentElevationDeg(observerHeightM, elevationM, distanceM) });
  }
  return { observerHeightM, points, complete };
}

export function horizonFromProfile(points: ProfilePoint[], minDistanceM = 0) {
  const eligible = points.filter((point) => point.distanceM >= minDistanceM);
  const unknown = eligible.some((point) => point.angleDeg === null);
  const highest = eligible.reduce<ProfilePoint | null>((best, point) =>
    point.angleDeg !== null && (!best || point.angleDeg > best.angleDeg!) ? point : best, null);
  return {
    status: !highest || unknown ? 'insufficient_data' as const : 'sampled' as const,
    angleDeg: highest?.angleDeg ?? null,
    distanceM: highest?.distanceM ?? null,
  };
}

export function theoreticalLineOfSight(options: {
  origin: Coordinate; target: Coordinate; cameraHeightM: number; targetHeightM: number;
  observerElevationM?: number; targetElevationM?: number; sample: HeightSampler; stepM?: number;
}) {
  const distanceM = distanceMeters(options.origin, options.target);
  const stepM = options.stepM ?? 60;
  if (distanceM <= stepM * 2 || distanceM > 100_000) return { status: 'outside_supported_range' as const, distanceM };
  const sourceGround = options.observerElevationM ?? options.sample(...options.origin);
  const targetGround = options.targetElevationM ?? options.sample(...options.target);
  if (sourceGround === null || targetGround === null) return { status: 'insufficient_data' as const, distanceM };
  const targetAngleDeg = apparentElevationDeg(sourceGround + options.cameraHeightM, targetGround + options.targetHeightM, distanceM);
  const bearing = initialBearingDeg(options.origin, options.target);
  const profile = terrainProfile({ origin: options.origin, azimuthDeg: bearing,
    maxDistanceM: distanceM - stepM, stepM, cameraHeightM: options.cameraHeightM,
    observerElevationM: options.observerElevationM, sample: options.sample });
  const horizon = horizonFromProfile(profile.points);
  if (horizon.status !== 'sampled') return { status: 'insufficient_data' as const, distanceM, targetAngleDeg };
  return {
    status: 'theoretical' as const, distanceM, targetAngleDeg,
    terrainAngleDeg: horizon.angleDeg!, clear: targetAngleDeg > horizon.angleDeg!,
    clearanceDeg: targetAngleDeg - horizon.angleDeg!,
  };
}

export function bodyAgainstHorizon(bodyAltitudeDeg: number, horizon: ReturnType<typeof horizonFromProfile>) {
  if (horizon.status !== 'sampled' || horizon.angleDeg === null) return { status: 'insufficient_data' as const };
  return { status: 'theoretical' as const, clear: bodyAltitudeDeg > horizon.angleDeg,
    marginDeg: bodyAltitudeDeg - horizon.angleDeg };
}
