import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface TerrainMetadata {
  schemaVersion: 1;
  locationId: string;
  dataVersion: string;
  dataset: string;
  datasetUrl: string;
  attribution: string;
  rasterType: 'DSM';
  horizontalDatum: 'EPSG:4326';
  verticalDatum: 'EGM2008';
  bounds: [number, number, number, number];
  transform: [number, number, number, number, number, number];
  width: number;
  height: number;
  nativeResolutionArcsec: number;
  validCells: number;
  noDataCells: number;
  fillMaskStatus: string;
  heightErrorMaskStatus: string;
  elevationSha256: string;
  validMaskSha256: string;
}

export interface TerrainDataset {
  metadata: TerrainMetadata;
  sample(lng: number, lat: number): number | null;
}

let cached: TerrainDataset | null = null;

function checkedBuffer(file: string, expectedHash: string, size: number): Buffer {
  const data = readFileSync(file);
  if (data.length !== size || createHash('sha256').update(data).digest('hex') !== expectedHash) {
    throw new Error(`Terrain data failed validation: ${path.basename(file)}`);
  }
  return data;
}

/** Public pilot artifact is built offline; runtime never fetches remote terrain. */
export function getTerrain(locationId: string): TerrainDataset | null {
  if (locationId !== 'niubei') return null;
  if (cached) return cached;
  const directory = path.join(process.env.TERRAIN_DATA_DIR || path.join(process.cwd(), 'terrain-data'), locationId);
  let metadata: TerrainMetadata;
  try {
    metadata = JSON.parse(readFileSync(path.join(directory, 'metadata.json'), 'utf8')) as TerrainMetadata;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  const { width, height, transform } = metadata;
  if (metadata.schemaVersion !== 1 || metadata.locationId !== locationId || metadata.horizontalDatum !== 'EPSG:4326'
      || metadata.verticalDatum !== 'EGM2008' || !Number.isInteger(width) || !Number.isInteger(height)
      || width < 2 || height < 2 || width * height > 20_000_000 || transform.length !== 6
      || transform[0] <= 0 || transform[4] >= 0) throw new Error('Invalid terrain metadata');
  const elevations = checkedBuffer(path.join(directory, 'elevation.f32'), metadata.elevationSha256, width * height * 4);
  const valid = checkedBuffer(path.join(directory, 'valid.u8'), metadata.validMaskSha256, width * height);
  const values = new DataView(elevations.buffer, elevations.byteOffset, elevations.byteLength);
  cached = {
    metadata,
    sample(lng, lat) {
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
      const x = (lng - transform[2]) / transform[0] - 0.5;
      const y = (lat - transform[5]) / transform[4] - 0.5;
      if (x < -1e-7 || y < -1e-7 || x > width - 1 + 1e-7 || y > height - 1 + 1e-7) return null;
      const col = Math.min(width - 2, Math.max(0, Math.floor(x)));
      const row = Math.min(height - 2, Math.max(0, Math.floor(y)));
      const indices = [row * width + col, row * width + col + 1, (row + 1) * width + col, (row + 1) * width + col + 1];
      if (indices.some((index) => valid[index] !== 1)) return null;
      const dx = Math.min(1, Math.max(0, x - col));
      const dy = Math.min(1, Math.max(0, y - row));
      const a = values.getFloat32(indices[0] * 4, true) * (1 - dx) + values.getFloat32(indices[1] * 4, true) * dx;
      const b = values.getFloat32(indices[2] * 4, true) * (1 - dx) + values.getFloat32(indices[3] * 4, true) * dx;
      return a * (1 - dy) + b * dy;
    },
  };
  return cached;
}

export function getDisplayGrid(dataset: TerrainDataset, size = 257) {
  const [west, south, east, north] = dataset.metadata.bounds;
  const values: Array<number | null> = [];
  for (let row = 0; row < size; row++) {
    const lat = north - (row + 0.5) * (north - south) / size;
    for (let col = 0; col < size; col++) {
      const lng = west + (col + 0.5) * (east - west) / size;
      const value = dataset.sample(lng, lat);
      values.push(value === null ? null : Math.round(value * 10) / 10);
    }
  }
  return { bounds: dataset.metadata.bounds, width: size, height: size, values };
}
