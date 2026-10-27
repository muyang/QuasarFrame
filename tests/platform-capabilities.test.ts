import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import { normalizePhotoExif, provenanceForSubmission } from '../src/lib/photo-evidence';
import { photoEvidenceRecords, photoLocationRecords } from '../src/lib/photo-records';
import { noDistribution, permitsDelivery } from '../src/lib/license';
import { availableChannels } from '../src/lib/entitlement';
import { buildPhotoMediaCard, photoMediaCardJsonSchema } from '../src/lib/media-card';
import { knowledgeNodeInputSchema, knowledgeEdgeInputSchema } from '../src/lib/knowledge';

const scope = { ...noDistribution, web: true, mobile: true, frame: true, paid: true };

test('EXIF 与人工位置分别保留，未核验候选不会被升级为实测坐标', () => {
  const evidence = normalizePhotoExif({ longitude: 102.2, latitude: 29.8, GPSHPositioningError: 15,
    GPSImgDirection: 90, GPSImgDirectionRef: 'T', FocalLength: 70 });
  const submitted = { coordinatesLng: 102.3, coordinatesLat: 29.9, azimuth: 95, focalLength: 85 };
  const provenance = provenanceForSubmission(submitted, evidence);
  const items = photoEvidenceRecords(evidence, submitted, provenance);
  const candidates = photoLocationRecords(evidence, submitted, provenance);
  assert.equal(items.filter((item) => item.field === 'coordinates').length, 2);
  assert.deepEqual(candidates.map((candidate) => [candidate.method, candidate.radiusM, candidate.status]),
    [['exif', 15, 'proposed'], ['manual', null, 'proposed']]);
  assert.equal(photoLocationRecords(normalizePhotoExif({}), {}, provenance).length, 0);
});

test('照片 Card 对公众隐藏私有机位，许可与权益分两道门禁', () => {
  const photo = { id: '123e4567-e89b-12d3-a456-426614174000', userId: 'owner', title: '山峰',
    status: 'approved' as const, priceType: 'paid' as const, shotAt: '2026-10-22T07:00', coordinatesLng: 102.2,
    coordinatesLat: 29.8, shareCoordinates: false,
    metadataProvenance: JSON.stringify({ coordinates: 'exif' }), createdAt: '2026-10-22' };
  const license = { status: 'approved' as const, version: 1, scope };
  const publicCard = buildPhotoMediaCard(photo, license, 'public');
  assert.equal(publicCard.status, 'published');
  assert.equal(publicCard.capture.coordinates, null);
  assert.deepEqual(buildPhotoMediaCard(photo, license, 'owner').capture.coordinates, [102.2, 29.8]);
  assert.equal(buildPhotoMediaCard(photo, { ...license, status: 'revoked' }, 'public').status, 'withdrawn');
  assert.equal(buildPhotoMediaCard(photo, { ...license, scope: { ...scope, paid: false } }, 'public').status, 'private');
  assert.equal(permitsDelivery({ status: 'pending', scope }, 'web', 'paid'), false);
  assert.deepEqual(availableChannels('["web","frame"]', null, { status: 'approved', scope }), ['web', 'frame']);
  assert.deepEqual(availableChannels('["web","frame"]', '2026-10-23', { status: 'approved', scope }), []);
  assert.deepEqual(availableChannels('["web","frame"]', null, { status: 'revoked', scope }), []);
  const actual = JSON.parse(readFileSync(join(process.cwd(), 'contracts/media-card.v1.schema.json'), 'utf8'));
  assert.deepEqual(actual, photoMediaCardJsonSchema());
});

test('迁移后的来源许可控制公开列表与跨屏权益，知识查询只返回有来源的已发布关系', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'quasar-platform-'));
  process.env.DATABASE_URL = join(directory, 'platform.db');
  process.env.AUTH_SECRET = 'test-only-secret-at-least-32-characters-long';
  try {
    const { db } = await import('../src/db');
    const { users, photos, sourceLicenses, entitlementGrants, knowledgeNodes, knowledgeEdges } = await import('../src/db/schema');
    const { licensedFor } = await import('../src/server/licenses');
    const { hasEntitlement } = await import('../src/server/entitlements');
    const { GET: listPhotos } = await import('../src/app/api/photos/route');
    const { GET: queryKnowledge } = await import('../src/app/api/knowledge/route');
    migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
    db.insert(users).values([
      { id: 'author', email: 'author@example.test', passwordHash: 'test', name: 'Author' },
      { id: 'buyer', email: 'buyer@example.test', passwordHash: 'test', name: 'Buyer' },
    ]).run();
    const photoId = '123e4567-e89b-12d3-a456-426614174000';
    db.insert(photos).values({ id: photoId, userId: 'author', title: '测试照片',
      imageUrl: `/api/photos/${photoId}/image`, thumbnailUrl: `/api/photos/${photoId}/thumbnail`,
      status: 'approved', priceType: 'paid', price: 5 }).run();
    const listed = async () => (await (await listPhotos(new Request('http://test/api/photos'))).json()).photos.length;
    assert.equal(await listed(), 0);
    db.insert(sourceLicenses).values({ id: 'license-1', resourceType: 'photo', resourceId: photoId,
      ownerId: 'author', version: 1, status: 'pending', scopeJson: JSON.stringify(scope) }).run();
    assert.equal(await listed(), 0);
    db.update(sourceLicenses).set({ status: 'approved' }).where(eq(sourceLicenses.id, 'license-1')).run();
    assert.equal(licensedFor('photo', photoId, 'web', 'paid'), true);
    assert.equal(await listed(), 1);
    db.insert(entitlementGrants).values({ id: 'grant-1', userId: 'buyer', resourceType: 'photo',
      resourceId: photoId, licenseId: 'license-1', channelsJson: '["frame"]' }).run();
    assert.equal(hasEntitlement('buyer', 'photo', photoId, 'frame'), true);
    assert.equal(hasEntitlement('buyer', 'photo', photoId, 'web'), false);
    db.update(sourceLicenses).set({ status: 'revoked' }).where(eq(sourceLicenses.id, 'license-1')).run();
    assert.equal(await listed(), 0);
    assert.equal(hasEntitlement('buyer', 'photo', photoId, 'frame'), false);
    db.insert(sourceLicenses).values({ id: 'license-2', resourceType: 'photo', resourceId: photoId,
      ownerId: 'author', version: 2, status: 'approved', scopeJson: JSON.stringify(scope) }).run();
    assert.equal(await listed(), 1);
    assert.equal(hasEntitlement('buyer', 'photo', photoId, 'frame'), false);

    const sourceUrl = 'https://example.org/editorial';
    db.insert(knowledgeNodes).values([
      knowledgeNodeInputSchema.parse({ id: 'style.landscape', kind: 'style', label: '风光', description: '试点建议',
        claimType: 'recommendation', sourceUrl, sourceLicense: 'editorial', status: 'published' }),
      knowledgeNodeInputSchema.parse({ id: 'color.cool', kind: 'color', label: '冷色', description: '待审建议',
        claimType: 'recommendation', sourceUrl, sourceLicense: 'editorial', status: 'draft' }),
    ]).run();
    assert.equal(knowledgeEdgeInputSchema.safeParse({ id: 'bad', fromId: 'style.landscape', toId: 'color.cool',
      relation: 'uses', claimType: 'fact', sourceUrl: 'http://invalid', status: 'published' }).success, false);
    db.insert(knowledgeEdges).values({ id: 'edge-1', fromId: 'style.landscape', toId: 'color.cool',
      relation: 'uses', claimType: 'recommendation', sourceUrl, status: 'published' }).run();
    const graph = await (await queryKnowledge(new Request('http://test/api/knowledge?q='))).json();
    assert.deepEqual(graph.nodes.map((node: { id: string }) => node.id), ['style.landscape']);
    assert.equal(graph.edges.length, 0);
  } finally {
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    rmSync(directory, { recursive: true, force: true });
  }
});
