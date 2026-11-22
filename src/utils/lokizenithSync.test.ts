import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUEST_TOKEN_LIMIT,
  buildAnswerLengthInstruction,
  consumeGuestQuota,
  getGuestQuota,
  isSafePublicHttpUrl,
  normalizeAnswerLength,
  resetGuestQuotaForTest,
} from './guestAndLength';
import { PLUGIN_CATALOG, buildPluginCatalogForUser } from '../server/pluginsEngine';

test('Guest quota starts at 7,500 tokens and decrements cleanly without going negative', () => {
  resetGuestQuotaForTest('test-guest-1');
  const initial = getGuestQuota('test-guest-1');
  assert.equal(initial.guest, true);
  assert.equal(initial.limit, GUEST_TOKEN_LIMIT);
  assert.equal(initial.remaining, 7500);

  const after1 = consumeGuestQuota('test-guest-1', 1200);
  assert.equal(after1.used, 1200);
  assert.equal(after1.remaining, 6300);

  const afterOverflow = consumeGuestQuota('test-guest-1', 50000);
  assert.equal(afterOverflow.used, 7500);
  assert.equal(afterOverflow.remaining, 0);
  resetGuestQuotaForTest('test-guest-1');
});

test('Answer length normalizer & instruction builder map Short, Medium, Detailed, and Long accurately', () => {
  assert.equal(normalizeAnswerLength('short'), 'short');
  assert.equal(normalizeAnswerLength('Detailed'), 'detailed');
  assert.equal(normalizeAnswerLength('LONG'), 'long');
  assert.equal(normalizeAnswerLength('unknown'), 'medium');

  assert.ok(buildAnswerLengthInstruction('short').includes('SHORT'));
  assert.ok(buildAnswerLengthInstruction('detailed').includes('DETAILED'));
  assert.ok(buildAnswerLengthInstruction('long').includes('LONG'));
});

test('isSafePublicHttpUrl allows public HTTPS sites and blocks localhost, private IPs, and metadata hosts', () => {
  assert.equal(isSafePublicHttpUrl('https://en.wikipedia.org/wiki/MATLAB'), true);
  assert.equal(isSafePublicHttpUrl('http://localhost:3000/api/secret'), false);
  assert.equal(isSafePublicHttpUrl('http://127.0.0.1:8080/'), false);
  assert.equal(isSafePublicHttpUrl('http://169.254.169.254/latest/meta-data'), false);
  assert.equal(isSafePublicHttpUrl('http://metadata.google.internal/computeMetadata/v1'), false);
  assert.equal(isSafePublicHttpUrl('file:///etc/passwd'), false);
});

test('Plugin catalog exposes all 12 plugins with Weather and Wikipedia immediately connected', () => {
  assert.equal(PLUGIN_CATALOG.length, 12);
  const items = buildPluginCatalogForUser(undefined);
  const weather = items.find((p) => p.id === 'weather');
  const wiki = items.find((p) => p.id === 'wikipedia');
  const gmail = items.find((p) => p.id === 'gmail');

  assert.ok(weather && weather.connected && weather.configured);
  assert.ok(wiki && wiki.connected && wiki.configured);
  assert.ok(gmail && gmail.logo === '/plugin-logos/gmail.svg');
});
