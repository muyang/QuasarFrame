import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { workspaceSchema, trustedMapEvent, NASA_TILE_URL } from '../src/lib/shooting-workspace';
import { nasaMapCard } from '../src/server/resource-catalog';
import { validateResourceRequest } from '../src/lib/resource-card';

test('workspace validates saved views and rejects arbitrary URLs, unsupported versions and invalid coordinates', () => {
  const input = { version: 1, intent: 'astro', projection: 'globe', viewport: { center: [102, 29], zoom: 8, bearing: 75, pitch: 30 } };
  assert.deepEqual(workspaceSchema.parse(input), input);
  for (const invalid of [{ ...input, version: 2 }, { ...input, mapUrl: 'https://attacker.example' },
    { ...input, viewport: { ...input.viewport, center: [190, 95] } }, { ...input, viewport: { ...input.viewport, zoom: NaN } }]) {
    assert.equal(workspaceSchema.safeParse(invalid).success, false);
  }
});

test('map messages require exact origin, frame identity and version, and reject malformed envelopes', () => {
  const target = {} as Window;
  const event = { origin: 'https://qf.test', source: target, data: { v: 2, source: 'geolibre', type: 'ready', payload: { version: '2.5.0' } } };
  assert.ok(trustedMapEvent(event, 'https://qf.test', target));
  for (const invalid of [{ ...event, origin: 'https://other.test' }, { ...event, source: {} as Window },
    { ...event, data: { ...event.data, v: 1 } }, { ...event, data: { ...event.data, payload: null } }, { ...event, data: null }]) {
    assert.equal(trustedMapEvent(invalid, 'https://qf.test', target), null);
  }
});

test('NASA overview is a bounded imagery capability, never a terrain analysis input', () => {
  const card = nasaMapCard();
  assert.deepEqual(validateResourceRequest(card, { operation: 'terrain.analyze.v1', access: 'public', coordinates: [102, 29], horizontalCrs: 'EPSG:4326' }), { ok: false, reason: 'operation_not_allowed' });
  for (const projection of ['globe', 'mercator']) {
    const project = JSON.parse(readFileSync(`public/maps/nasa-${projection}.geolibre.json`, 'utf8'));
    assert.equal(project.preferences.map.projection, projection);
    assert.equal(project.preferences.map.showPointerElevation, false);
    assert.deepEqual(project.layers[0].source.tiles, [NASA_TILE_URL]);
    assert.equal(project.layers[0].source.maxzoom, 8);
    assert.equal(project.basemapStyleUrl, '');
  }
});
