import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resourceCardJsonSchema, resourceCardSchema, validateResourceRequest } from '../src/lib/resource-card';
import { astronomyCard, getResourceCard, listResourceCatalog, terrainCardFromMetadata } from '../src/server/resource-catalog';
import type { TerrainMetadata } from '../src/server/terrain';

const metadata: TerrainMetadata = {
  schemaVersion: 1, locationId: 'niubei', dataVersion: 'fixture-v1', dataset: 'Fixture DEM',
  datasetUrl: 'https://example.com/dem', attribution: 'Fixture source attribution', rasterType: 'DSM',
  horizontalDatum: 'EPSG:4326', verticalDatum: 'EGM2008', bounds: [101, 29, 103, 31],
  transform: [1 / 3600, 0, 101, 0, -1 / 3600, 31], width: 3, height: 3,
  nativeResolutionArcsec: 1, validCells: 9, noDataCells: 0,
  fillMaskStatus: 'unavailable', heightErrorMaskStatus: 'unavailable',
  elevationSha256: 'a'.repeat(64), validMaskSha256: 'b'.repeat(64),
};

test('资源卡有可复核的版本、覆盖范围、来源与权限，拒绝不完整或非 HTTPS 来源', () => {
  const card = terrainCardFromMetadata(metadata);
  assert.equal(card.id, 'terrain.dem.niubei');
  assert.equal(card.version, 'fixture-v1');
  assert.deepEqual(card.coverage.bbox, [101, 29, 103, 31]);
  assert.equal(card.provenance.contentSha256, metadata.elevationSha256);
  assert.equal(card.rights.rawRedistribution, 'not_evaluated');
  assert.equal(resourceCardSchema.safeParse({ ...card, provenance: { ...card.provenance, sourceUrl: 'http://example.com/dem' } }).success, false);
  assert.equal(resourceCardSchema.safeParse({ ...card, rights: undefined }).success, false);
  assert.throws(() => terrainCardFromMetadata({ ...metadata, bounds: [103, 29, 101, 31] }), /coverage/);
});

test('契约在计算前拦截未覆盖机位、错误高程基准和未登记操作', () => {
  const card = terrainCardFromMetadata(metadata);
  const request = { operation: 'terrain.analyze.v1', access: 'public' as const, coordinates: [102, 30] as const,
    horizontalCrs: 'EPSG:4326', verticalDatum: 'EGM2008', at: '2026-10-23T00:00:00Z' };
  assert.deepEqual(validateResourceRequest(card, request), { ok: true });
  assert.deepEqual(validateResourceRequest(card, { ...request, coordinates: [104, 30] }),
    { ok: false, reason: 'outside_coverage' });
  assert.deepEqual(validateResourceRequest(card, { ...request, verticalDatum: 'EGM96' }),
    { ok: false, reason: 'vertical_datum_mismatch' });
  assert.deepEqual(validateResourceRequest(card, { ...request, horizontalCrs: 'GCJ-02' }),
    { ok: false, reason: 'horizontal_crs_mismatch' });
  assert.deepEqual(validateResourceRequest(card, { ...request, operation: 'terrain.delete' }),
    { ok: false, reason: 'operation_not_allowed' });
  assert.deepEqual(validateResourceRequest({ ...card, rights: { ...card.rights, access: 'internal_only' } }, request),
    { ok: false, reason: 'access_denied' });
});

test('目录只发布已安装资源，未知资源不成为公开能力', () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'quasar-resource-'));
  const previous = process.env.TERRAIN_DATA_DIR;
  try {
    process.env.TERRAIN_DATA_DIR = temporary;
    const catalog = listResourceCatalog();
    assert.deepEqual(catalog.cards.map((card) => card.id), ['astronomy.sun-moon']);
    assert.deepEqual(catalog.unavailable, [{ id: 'terrain.dem.niubei', reason: 'data_not_installed' }]);
    assert.equal(getResourceCard('user.photo.private'), null);
    assert.equal(astronomyCard().quality.status, 'theoretical');
  } finally {
    if (previous === undefined) delete process.env.TERRAIN_DATA_DIR;
    else process.env.TERRAIN_DATA_DIR = previous;
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('公开 JSON Schema 与 Zod 契约同步', () => {
  const file = path.join(process.cwd(), 'contracts/resource-card.v1.schema.json');
  const actual = JSON.parse(readFileSync(file, 'utf8')) as {
    properties: { coverage: { properties: { bbox: { minItems: number; maxItems: number } } } };
  };
  assert.equal(actual.properties.coverage.properties.bbox.minItems, 4);
  assert.equal(actual.properties.coverage.properties.bbox.maxItems, 4);
  assert.deepEqual(actual, resourceCardJsonSchema());
});
