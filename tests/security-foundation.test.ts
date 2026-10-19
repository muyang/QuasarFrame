import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedUpstreamUrl, potentialUpstreamUrl } from '../src/lib/feed-upstream';
import { acquireStreamSlot } from '../src/lib/feed-stream-cap';

test('camera submissions reject local targets and embedded credentials', () => {
  assert.equal(potentialUpstreamUrl('http://127.0.0.1/stream'), false);
  assert.equal(potentialUpstreamUrl('http://192.168.1.10/stream'), false);
  assert.equal(potentialUpstreamUrl('http://metadata.google.internal/'), false);
  assert.equal(potentialUpstreamUrl('https://user:secret@example.com/stream'), false);
  assert.equal(potentialUpstreamUrl('file:///etc/passwd'), false);
  assert.equal(potentialUpstreamUrl('https://example.com/stream'), true);
});

test('stream cap releases cancelled viewers exactly once', () => {
  const first = acquireStreamSlot('test-viewer');
  const second = acquireStreamSlot('test-viewer');
  assert.ok(first);
  assert.ok(second);
  assert.equal(acquireStreamSlot('test-viewer'), null);
  first();
  first();
  const third = acquireStreamSlot('test-viewer');
  assert.ok(third);
  second();
  third();
});

test('camera fetches fail closed without an approved origin', async () => {
  const previous = process.env.FEED_UPSTREAM_ORIGINS;
  process.env.FEED_UPSTREAM_ORIGINS = '';
  try {
    assert.equal(await allowedUpstreamUrl('https://example.com/stream'), null);
    process.env.FEED_UPSTREAM_ORIGINS = 'http://127.0.0.1';
    assert.equal(await allowedUpstreamUrl('http://127.0.0.1/stream'), null);
  } finally {
    if (previous === undefined) delete process.env.FEED_UPSTREAM_ORIGINS;
    else process.env.FEED_UPSTREAM_ORIGINS = previous;
  }
});
