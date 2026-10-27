import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locations } from '../src/data/locations';

test('every displayed catalogue photo is unique, linked to a file page, and has a reviewed license', () => {
  assert.equal(locations.length, 10);
  const imageUrls = new Set<string>();
  for (const location of locations) {
    assert.ok(location.photos.length <= 1, `${location.id}: gallery must contain only reviewed images`);
    for (const photo of location.photos) {
      assert.equal(location.heroImage, photo.imageUrl);
      assert.match(photo.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      assert.match(photo.imageUrl, /^https:\/\/thumb\.wikimedia\.org\/wikipedia\/commons\/thumb\//);
      assert.match(photo.licenseUrl, /^https:\/\/creativecommons\.org\/licenses\//);
      assert.ok(photo.author && photo.caption && photo.placeEvidence && photo.reviewedAt);
      assert.equal(photo.aiReferenceAllowed, false);
      assert.equal(imageUrls.has(photo.imageUrl), false, `${location.id}: duplicate place photo`);
      imageUrls.add(photo.imageUrl);
    }
    if (location.photos.length === 0) assert.equal(location.heroImage, '');
  }
  assert.equal(imageUrls.size, 10);
});
