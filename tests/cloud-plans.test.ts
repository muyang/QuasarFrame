import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { cloudPlanInputSchema } from '../src/lib/cloud-plan';

test('cloud plans isolate owners, keep independent point provenance, and import legacy plans safely', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'quasarframe-plans-'));
  process.env.DATABASE_URL = join(directory, 'plans.db');
  try {
    const { db } = await import('../src/db');
    const { users } = await import('../src/db/schema');
    const { getPlan, listPlans, savePlan, deletePlan, importLegacyPlans } = await import('../src/server/plans');
    migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
    db.insert(users).values([
      { id: 'alice', email: 'alice@example.test', passwordHash: 'test', name: 'Alice' },
      { id: 'bob', email: 'bob@example.test', passwordHash: 'test', name: 'Bob' },
    ]).run();

    const input = cloudPlanInputSchema.parse({
      plan: {
        version: 1, locationId: 'niubei', name: '日出机位', coordinates: [102.3, 29.88],
        coordinateSource: 'user', coordinateSystem: 'WGS84-assumed', dateKey: '2026-10-20',
        minutes: 420, timeZone: 'Asia/Shanghai', focalLength: 70, sensor: 'fullFrame',
        portrait: false, azimuth: 95, elevation: 5, travelMinutes: 60, setupMinutes: 30, notes: 'test',
      },
      workspace: { version: 1, intent: 'astro', projection: 'globe', viewport: { center: [102.3, 29.88], zoom: 7, bearing: 75, pitch: 20 } },
      vantage: { name: '山顶 GPS', source: 'gps', horizontalAccuracyM: 12, elevationM: 3660,
        verticalDatum: 'EGM96', cameraHeightM: 1.6 },
      subject: { name: '雪峰', coordinates: [101.9, 29.6], source: 'user_input',
        horizontalAccuracyM: 250, elevationM: null, verticalDatum: 'unknown', heightAboveGroundM: null },
    });
    const created = savePlan('alice', input);
    assert.ok(created);
    assert.deepEqual(created.workspace, input.workspace);
    assert.equal(created.place.status, 'illustrative');
    assert.equal(created.vantage.source, 'gps');
    assert.equal(created.vantage.horizontalAccuracyM, 12);
    assert.equal(created.vantage.verticalDatum, 'EGM96');
    assert.equal(created.vantage.verifiedAt, null);
    assert.equal(created.subject?.horizontalAccuracyM, 250);
    assert.equal(created.subject?.verifiedAt, null);
    assert.equal(getPlan('bob', created.id), null);
    assert.deepEqual(listPlans('bob', 'niubei'), []);
    assert.equal(savePlan('bob', input, created.id), null);
    assert.equal(deletePlan('bob', created.id), false);

    const changed = savePlan('alice', { ...input, plan: { ...input.plan, name: '已更新' }, subject: null }, created.id);
    assert.deepEqual(changed?.workspace, input.workspace);
    const { workspace: omitted, ...legacyClientInput } = input;
    assert.ok(omitted);
    assert.deepEqual(savePlan('alice', legacyClientInput, created.id)?.workspace, input.workspace, 'older planner must preserve workspace metadata');
    assert.equal(savePlan('alice', { ...input, workspace: null }, created.id)?.workspace, null);
    assert.equal(changed?.plan.name, '已更新');
    assert.equal(changed?.subject, null);
    assert.equal(listPlans('alice', 'niubei').length, 1);

    assert.equal(savePlan('alice', { ...input, plan: { ...input.plan, coordinateSource: 'catalogue', coordinates: [102.31, 29.88] } }), null);
    const legacy = { ...input.plan, coordinateSource: 'catalogue' as const, coordinates: [102.31, 29.88] as [number, number] };
    assert.deepEqual(importLegacyPlans('alice', [legacy, legacy]), { imported: 1, skipped: 1 });
    const imported = listPlans('alice', 'niubei').find((item) => item.dataVersion === 'local-v1-import');
    assert.ok(imported);
    assert.equal(imported.vantage.source, 'legacy_import');
    assert.equal(imported.plan.coordinateSource, 'catalogue');
    assert.deepEqual(imported.plan.coordinates, [102.31, 29.88]);
    assert.equal(imported.vantage.horizontalAccuracyM, null);
    assert.equal(imported.vantage.verifiedAt, null);
    assert.deepEqual(importLegacyPlans('alice', [legacy]), { imported: 0, skipped: 1 });
    assert.equal(deletePlan('alice', created.id), true);
    assert.equal(getPlan('alice', created.id), null);
  } finally {
    delete process.env.DATABASE_URL;
    rmSync(directory, { recursive: true, force: true });
  }
});
