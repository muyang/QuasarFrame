// Run only against an isolated migrated test database and a locally started server.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const origin = process.env.SMOKE_BASE_URL || 'http://localhost:3003';
const suffix = randomUUID().slice(0, 8);
const password = `P1-test-${randomUUID()}`;

function browser() {
  const cookies = new Map();
  async function request(path, init = {}) {
    const response = await fetch(`${origin}${path}`, {
      ...init, redirect: 'manual',
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers, Cookie: [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; ') },
    });
    for (const header of response.headers.getSetCookie()) {
      const [key, value] = header.split(';')[0].split('=');
      if (value) cookies.set(key, value);
      else cookies.delete(key);
    }
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  }
  return { request };
}

async function registerAndLogin(client, email) {
  const registered = await client.request('/api/auth/register', {
    method: 'POST', body: JSON.stringify({ email, password, name: 'P1 Test' }),
  });
  assert.equal(registered.status, 201, JSON.stringify(registered.body));
  await login(client, email);
}

async function login(client, email) {
  const csrf = await client.request('/api/auth/csrf');
  assert.equal(csrf.status, 200, JSON.stringify(csrf.body));
  const form = new URLSearchParams({ csrfToken: csrf.body.csrfToken, email, password, callbackUrl: origin });
  const signedIn = await client.request('/api/auth/callback/credentials', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form,
  });
  assert.ok([200, 302, 303].includes(signedIn.status), JSON.stringify(signedIn));
  const session = await client.request('/api/auth/session');
  assert.equal(session.body?.user?.email, email, JSON.stringify(session));
}

const aliceEmail = `p1-alice-${suffix}@example.test`;
const bobEmail = `p1-bob-${suffix}@example.test`;
const anonymous = browser();
assert.equal((await anonymous.request('/api/plans')).status, 401);
assert.equal((await anonymous.request('/api/plans/import', { method: 'POST', body: '{}' })).status, 401);

const alice = browser();
await registerAndLogin(alice, aliceEmail);
const bob = browser();
await registerAndLogin(bob, bobEmail);

const plan = {
  version: 1, locationId: 'niubei', name: 'P1 HTTP smoke', coordinates: [102.3, 29.88],
  coordinateSource: 'user', coordinateSystem: 'WGS84-assumed', dateKey: '2026-10-20',
  minutes: 420, timeZone: 'Asia/Shanghai', focalLength: 70, sensor: 'fullFrame',
  portrait: false, azimuth: 95, elevation: 5, travelMinutes: 60, setupMinutes: 30, notes: 'test',
};
const payload = {
  plan,
  vantage: { name: 'test vantage', source: 'gps', horizontalAccuracyM: 12, elevationM: 3660,
    verticalDatum: 'EGM96', cameraHeightM: 1.6 },
  subject: { name: 'test subject', coordinates: [101.9, 29.6], source: 'user_input',
    horizontalAccuracyM: 200, elevationM: null, verticalDatum: 'unknown', heightAboveGroundM: null },
};
const created = await alice.request('/api/plans', { method: 'POST', body: JSON.stringify(payload) });
assert.equal(created.status, 201, JSON.stringify(created.body));
const id = created.body.plan.id;
assert.equal(created.body.plan.vantage.verifiedAt, null);
assert.equal(created.body.plan.subject.horizontalAccuracyM, 200);

const secondBrowser = browser();
await login(secondBrowser, aliceEmail);
const crossBrowser = await secondBrowser.request('/api/plans?locationId=niubei');
assert.equal(crossBrowser.status, 200);
assert.ok(crossBrowser.body.plans.some((item) => item.id === id));

assert.equal((await bob.request(`/api/plans/${id}`)).status, 404);
assert.equal((await bob.request(`/api/plans/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })).status, 404);
assert.equal((await bob.request(`/api/plans/${id}`, { method: 'DELETE' })).status, 404);

const imported = await alice.request('/api/plans/import', { method: 'POST', body: JSON.stringify({ plans: [plan] }) });
assert.equal(imported.status, 200, JSON.stringify(imported.body));
assert.equal(imported.body.imported, 1);
const repeated = await alice.request('/api/plans/import', { method: 'POST', body: JSON.stringify({ plans: [plan] }) });
assert.equal(repeated.body.imported, 0);
const legacy = (await alice.request('/api/plans?locationId=niubei')).body.plans.find((item) => item.dataVersion === 'local-v1-import');
assert.equal(legacy.vantage.verifiedAt, null);
assert.equal(legacy.vantage.horizontalAccuracyM, null);

console.log('Cloud plan HTTP smoke passed: auth, cross-browser read, owner isolation, import.');
