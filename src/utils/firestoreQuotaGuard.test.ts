import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClientFirestoreUpgradeUrl,
  FirestoreQuotaCircuitBreaker,
  isClientFirestoreQuotaError,
  detectQuotaMetric,
  VaultSyncThrottle,
  withFirestoreTimeout,
  type StorageLike,
} from './firestoreQuotaGuard';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

test('isClientFirestoreQuotaError detects write/read quota exhaustion and backoff messages', () => {
  assert.equal(
    isClientFirestoreQuotaError(
      new Error(
        "FirebaseError: [code=resource-exhausted]: Quota limit exceeded. Cause - Quota exceeded for quota metric 'Free daily write units per project (free tier database)'"
      )
    ),
    true
  );
  assert.equal(
    isClientFirestoreQuotaError('Using maximum backoff delay to prevent overloading the backend.'),
    true
  );
  assert.equal(detectQuotaMetric("Free daily write units per project"), 'write');
  assert.equal(detectQuotaMetric("Free daily read units per project"), 'read');
  assert.equal(isClientFirestoreQuotaError(new Error('Missing or insufficient permissions.')), false);
});

test('FirestoreQuotaCircuitBreaker persists cooldown, triggers onTrip once, and auto-recovers after expiry', () => {
  let now = 1_000_000;
  const storage = createMemoryStorage();
  let tripCalls = 0;
  let resetCalls = 0;

  const breaker = new FirestoreQuotaCircuitBreaker({
    projectId: 'gen-lang-client-0681505509',
    databaseId: 'ai-studio-lokizenithai-d6782e3f-e427-4669-9fc7-3d14ae212597',
    storage,
    cooldownMs: 60_000,
    now: () => now,
    onTrip: () => {
      tripCalls++;
    },
    onReset: () => {
      resetCalls++;
    },
  });

  assert.equal(breaker.isPaused(), false);
  const first = breaker.trip(new Error('[code=resource-exhausted]: Free daily write units per project'));
  assert.equal(first.trippedNow, true);
  assert.equal(first.status.exhausted, true);
  assert.equal(first.status.metric, 'write');
  assert.equal(
    first.status.upgradeUrl,
    buildClientFirestoreUpgradeUrl(
      'gen-lang-client-0681505509',
      'ai-studio-lokizenithai-d6782e3f-e427-4669-9fc7-3d14ae212597'
    )
  );
  assert.equal(tripCalls, 1);

  // Subsequent error within cooldown doesn't spam onTrip
  const second = breaker.trip(new Error('Using maximum backoff delay'));
  assert.equal(second.trippedNow, false);
  assert.equal(tripCalls, 1);

  // Reloading in a new instance sees persisted cooldown immediately
  const reloaded = new FirestoreQuotaCircuitBreaker({
    projectId: 'gen-lang-client-0681505509',
    databaseId: 'ai-studio-lokizenithai-d6782e3f-e427-4669-9fc7-3d14ae212597',
    storage,
    cooldownMs: 60_000,
    now: () => now,
  });
  assert.equal(reloaded.isPaused(), true);

  // After cooldown elapses, breaker recovers automatically
  now += 61_000;
  assert.equal(breaker.isPaused(), false);
  assert.equal(reloaded.isPaused(), false);

  // Explicit reset invokes onReset
  breaker.trip(new Error('Quota limit exceeded'));
  breaker.reset();
  assert.equal(breaker.isPaused(), false);
  assert.equal(resetCalls, 1);
});

test('VaultSyncThrottle deduplicates unchanged payloads and enforces minimum interval', () => {
  let now = 500_000;
  const throttle = new VaultSyncThrottle({ minIntervalMs: 300_000, now: () => now });
  const baseSummary = {
    username: 'Elad',
    plan: 'ultimate',
    convsCount: 5,
    schemaVersion: 3,
    settings: { theme: 'dark', sound: true },
    recentTitles: ['Chat A', 'Chat B'],
  };

  assert.equal(throttle.shouldSync('uid-1', baseSummary), true);
  throttle.markSynced('uid-1', baseSummary);

  // Identical payload (even with reordered settings keys) is skipped forever
  assert.equal(
    throttle.shouldSync('uid-1', { ...baseSummary, settings: { sound: true, theme: 'dark' } }),
    false
  );

  // Changed payload inside cooldown window is throttled
  now += 30_000;
  assert.equal(throttle.shouldSync('uid-1', { ...baseSummary, convsCount: 6 }), false);

  // Changed payload after cooldown window is allowed
  now += 280_000;
  assert.equal(throttle.shouldSync('uid-1', { ...baseSummary, convsCount: 6 }), true);
});

test('withFirestoreTimeout resolves fast promises and rejects hung write streams', async () => {
  const val = await withFirestoreTimeout(Promise.resolve('ok'), 500);
  assert.equal(val, 'ok');

  await assert.rejects(
    withFirestoreTimeout(new Promise(() => {}), 120),
    /timed out/i
  );
});
