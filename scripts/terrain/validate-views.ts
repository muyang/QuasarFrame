/** Compare field-measured distant ridge angles with the pinned pilot DEM. */
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { horizonFromProfile, terrainProfile } from '../../src/lib/geo';
import { getTerrain } from '../../src/server/terrain';

const view = z.object({
  id: z.string().min(1),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  coordinateMethod: z.enum(['gps', 'survey']),
  azimuthDeg: z.number().min(0).max(360),
  cameraHeightM: z.number().min(0).max(100),
  observedRidgeAngleDeg: z.number().min(-90).max(90),
  ridgeDistanceM: z.number().min(2000).max(50000),
  photoReference: z.string().min(1),
  angleMethod: z.string().min(1),
}).strict();

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: npm run terrain:validate -- <field-views.json>');
const views = z.array(view).max(100).parse(JSON.parse(readFileSync(inputPath, 'utf8')));
const terrain = getTerrain('niubei');
if (!terrain) throw new Error('Missing local Niubei DEM; build it with scripts/terrain/build_niubei.py');

const results = views.map((item) => {
  const profile = terrainProfile({ origin: item.coordinates, azimuthDeg: item.azimuthDeg,
    maxDistanceM: item.ridgeDistanceM, stepM: 30, cameraHeightM: item.cameraHeightM,
    sample: terrain.sample });
  const horizon = horizonFromProfile(profile.points, 2000);
  const predictedDeg = horizon.status === 'sampled' ? horizon.angleDeg : null;
  return { id: item.id, photoReference: item.photoReference,
    observedDeg: item.observedRidgeAngleDeg, predictedDeg,
    absoluteErrorDeg: predictedDeg === null ? null : Math.abs(predictedDeg - item.observedRidgeAngleDeg),
    status: horizon.status };
});
const errors = results.flatMap((row) => row.absoluteErrorDeg === null ? [] : [row.absoluteErrorDeg]).sort((a, b) => a - b);
const median = errors.length ? (errors[Math.floor((errors.length - 1) / 2)] + errors[Math.floor(errors.length / 2)]) / 2 : null;
const accepted = views.length >= 5 && views.length <= 10 && errors.length === views.length && median !== null && median <= 1;
const status = accepted ? 'passed' : views.length < 5 ? 'pending' : 'failed';
process.stdout.write(JSON.stringify({ dataVersion: terrain.metadata.dataVersion,
  sampleCount: views.length, completeCount: errors.length, medianAbsoluteErrorDeg: median,
  pilotThresholdDeg: 1, status, results }, null, 2) + '\n');
if (!accepted) process.exitCode = 1;
