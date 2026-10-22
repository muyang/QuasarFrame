import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { apparentElevationDeg, bodyAgainstHorizon, distanceMeters, horizonFromProfile,
  pointAtDistance, terrainProfile, theoreticalLineOfSight } from '../src/lib/geo';
import { terrainAnalysisInputSchema } from '../src/lib/terrain-analysis';
import { getTerrain } from '../src/server/terrain';
import { analyzeTerrain } from '../src/server/terrain-analysis';

const origin: [number, number] = [102.3, 29.88];
const distanceFromOrigin = (lng: number, lat: number) => distanceMeters(origin, [lng, lat]);

test('球面视角包含曲率，正北与正东方向保持 WGS84 坐标顺序', () => {
  const north = pointAtDistance(origin, 0, 1000);
  const east = pointAtDistance(origin, 90, 1000);
  assert.ok(north[1] > origin[1] && Math.abs(north[0] - origin[0]) < 0.00001);
  assert.ok(east[0] > origin[0] && Math.abs(east[1] - origin[1]) < 0.00001);
  assert.ok(Math.abs(distanceMeters(origin, north) - 1000) < 0.01);
  assert.ok(apparentElevationDeg(100, 100, 10_000) < -0.04);
});

test('合成山脊遮挡主体，缺样本时不报告无遮挡', () => {
  const target = pointAtDistance(origin, 90, 5000);
  const ridge = (lng: number, lat: number) => {
    const d = distanceFromOrigin(lng, lat);
    return d > 2300 && d < 2700 ? 400 : 100;
  };
  const blocked = theoreticalLineOfSight({ origin, target, cameraHeightM: 2,
    targetHeightM: 2, sample: ridge, stepM: 100 });
  assert.equal(blocked.status, 'theoretical');
  if (blocked.status === 'theoretical') assert.equal(blocked.clear, false);

  const gap = (lng: number, lat: number) => distanceFromOrigin(lng, lat) > 2400 && distanceFromOrigin(lng, lat) < 2600 ? null : 100;
  const unknown = theoreticalLineOfSight({ origin, target, cameraHeightM: 2,
    targetHeightM: 2, sample: gap, stepM: 100 });
  assert.equal(unknown.status, 'insufficient_data');
  const profile = terrainProfile({ origin, azimuthDeg: 90, maxDistanceM: 5000,
    stepM: 100, cameraHeightM: 2, sample: gap });
  assert.equal(profile.complete, false);
  const horizon = horizonFromProfile(profile.points, 2000);
  assert.equal(horizon.status, 'insufficient_data');
  assert.equal(bodyAgainstHorizon(5, horizon).status, 'insufficient_data');
});

test('采样 API 校验高程基准、坐标和分析范围', () => {
  const request = { vantage: { coordinates: origin, coordinateSource: 'user',
    cameraHeightM: 1.6, elevationM: null, verticalDatum: 'unknown' },
  azimuthDeg: 90, at: '2026-10-20T08:00:00.000Z' };
  assert.equal(terrainAnalysisInputSchema.safeParse(request).success, true);
  assert.equal(terrainAnalysisInputSchema.safeParse({ ...request, vantage: { ...request.vantage, coordinates: [200, 30] } }).success, false);
  assert.equal(terrainAnalysisInputSchema.safeParse({ ...request, maxDistanceM: 200_000 }).success, false);
});

test('固定小 DEM 的双线性采样、缺失掩膜和校验和失败', () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'quasar-terrain-'));
  const previous = process.env.TERRAIN_DATA_DIR;
  try {
    const directory = path.join(temporary, 'niubei');
    mkdirSync(directory);
    const elevation = Buffer.alloc(3 * 3 * 4);
    for (let index = 0; index < 9; index++) elevation.writeFloatLE(100 + index * 10, index * 4);
    const valid = Buffer.from([1, 1, 1, 1, 1, 1, 1, 1, 0]);
    const hash = (value: Buffer) => createHash('sha256').update(value).digest('hex');
    writeFileSync(path.join(directory, 'elevation.f32'), elevation);
    writeFileSync(path.join(directory, 'valid.u8'), valid);
    const metadata = { schemaVersion: 1, locationId: 'niubei', dataVersion: 'test-fixture-v1',
      dataset: 'synthetic fixture', datasetUrl: 'https://example.com/dem', attribution: 'Synthetic test fixture', rasterType: 'DSM',
      horizontalDatum: 'EPSG:4326', verticalDatum: 'EGM2008',
      bounds: [origin[0] - 1 / 7200, origin[1] - 2.5 / 3600,
        origin[0] + 2.5 / 3600, origin[1] + 1 / 7200],
      transform: [1 / 3600, 0, origin[0] - 1 / 7200,
        0, -1 / 3600, origin[1] + 1 / 7200], width: 3, height: 3,
      nativeResolutionArcsec: 1, validCells: 8, noDataCells: 1,
      fillMaskStatus: 'fixture', heightErrorMaskStatus: 'fixture',
      elevationSha256: 'incorrect', validMaskSha256: hash(valid) };
    const metadataPath = path.join(directory, 'metadata.json');
    writeFileSync(metadataPath, JSON.stringify(metadata));
    process.env.TERRAIN_DATA_DIR = temporary;
    assert.throws(() => getTerrain('niubei'), /failed validation/);
    writeFileSync(metadataPath, JSON.stringify({ ...metadata, elevationSha256: hash(elevation) }));
    const terrain = getTerrain('niubei')!;
    assert.ok(Math.abs(terrain.sample(...origin)! - 100) < 1e-6);
    assert.ok(Math.abs(terrain.sample(origin[0] + 0.5 / 3600, origin[1] - 0.5 / 3600)! - 120) < 1e-6);
    assert.equal(terrain.sample(origin[0] + 1.5 / 3600, origin[1] - 1.5 / 3600), null);
    assert.equal(terrain.sample(100, 30), null);
    const request = terrainAnalysisInputSchema.parse({
      vantage: { coordinates: origin, coordinateSource: 'catalogue', cameraHeightM: 1.6,
        elevationM: null, verticalDatum: 'unknown' },
      azimuthDeg: 90, at: '2026-10-20T08:00:00.000Z', maxDistanceM: 2000,
    });
    const illustrative = analyzeTerrain('niubei', request)!;
    assert.equal(illustrative.status, 'illustrative_coordinate_mismatch');
    assert.equal(illustrative.resource.cardId, 'terrain.dem.niubei');
    assert.equal(illustrative.resource.cardVersion, 'test-fixture-v1');
    assert.equal(illustrative.resource.sourceUrl, 'https://example.com/dem');
    assert.equal('sun' in illustrative, false);
    const wrongDatum = analyzeTerrain('niubei', {
      ...request, vantage: { ...request.vantage, coordinateSource: 'user',
        elevationM: 100, verticalDatum: 'EGM96' },
    })!;
    assert.equal(wrongDatum.status, 'datum_mismatch');
    const outside = analyzeTerrain('niubei', {
      ...request, vantage: { ...request.vantage, coordinates: [103, 30], coordinateSource: 'user' },
    })!;
    assert.equal(outside.status, 'outside_coverage');
  } finally {
    if (previous === undefined) delete process.env.TERRAIN_DATA_DIR;
    else process.env.TERRAIN_DATA_DIR = previous;
    rmSync(temporary, { recursive: true, force: true });
  }
});
