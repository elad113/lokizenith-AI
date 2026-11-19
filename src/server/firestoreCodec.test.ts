import test from 'node:test';
import assert from 'node:assert/strict';
import {
  diffStringMap,
  resolveFirebaseTarget,
  resolveStorageMode,
  sessionDocId,
  splitUtf8,
  suppressAccidentalUserWipe,
} from './firestoreCodec.ts';

function withEnv(patch: Record<string, string | undefined>, fn: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(patch)) {
    previous[key] = process.env[key];
    if (patch[key] === undefined) delete process.env[key];
    else process.env[key] = patch[key];
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test('splitUtf8 round-trips unicode without splitting a code point', () => {
  const text = 'שלום 🔥 '.repeat(80) + 'end';
  const parts = splitUtf8(text, 50);
  assert.ok(parts.length > 1);
  for (const part of parts) {
    assert.ok(Buffer.byteLength(part, 'utf8') <= 50);
  }
  assert.equal(parts.join(''), text);
});

test('session document ids stay stable and Firestore-safe', () => {
  const hex = 'a'.repeat(48);
  assert.equal(sessionDocId(hex), hex);
  const messy = 'tok/with spaces';
  const id = sessionDocId(messy);
  assert.match(id, /^h_[a-f0-9]{64}$/);
  assert.equal(sessionDocId(messy), id);
});

test('diffStringMap writes changed records and deletes only records this process previously had', () => {
  const baseline = new Map<string, string>([
    ['a', JSON.stringify({ n: 1 })],
    ['b', JSON.stringify({ n: 2 })],
  ]);
  const diff = diffStringMap(baseline, {
    b: { n: 2 },
    c: { n: 3 },
  });
  assert.deepEqual(diff.upserts.map((row) => row.id), ['c']);
  assert.deepEqual(diff.deletes, ['a']);
  assert.equal(diff.next.has('remote-only-user'), false);
});

test('suppressAccidentalUserWipe blocks deleting every loaded account when memory is empty', () => {
  const blocked = suppressAccidentalUserWipe(
    { upserts: [], deletes: ['u1', 'u2', 'u3'] },
    3
  );
  assert.equal(blocked.blocked, true);
  assert.deepEqual(blocked.deletes, []);

  const explicit = suppressAccidentalUserWipe(
    { upserts: [], deletes: ['u2'] },
    3
  );
  assert.equal(explicit.blocked, false);
  assert.deepEqual(explicit.deletes, ['u2']);

  const replaced = suppressAccidentalUserWipe(
    { upserts: [{ id: 'new', json: '{}' }], deletes: ['u1', 'u2'] },
    2
  );
  assert.equal(replaced.blocked, false);
});

test('storage mode defaults to disk locally and Firestore when credentials or Cloud Run exist', () => {
  withEnv(
    {
      LZ_STORAGE: undefined,
      FIRESTORE_EMULATOR_HOST: undefined,
      GOOGLE_APPLICATION_CREDENTIALS: undefined,
      K_SERVICE: undefined,
      K_REVISION: undefined,
    },
    () => {
      assert.equal(resolveStorageMode(), 'disk');
    }
  );
  withEnv({ LZ_STORAGE: 'disk', K_SERVICE: 'lokizen', FIRESTORE_EMULATOR_HOST: undefined, GOOGLE_APPLICATION_CREDENTIALS: undefined, K_REVISION: undefined }, () => {
    assert.equal(resolveStorageMode(), 'disk');
  });
  withEnv({ LZ_STORAGE: undefined, K_SERVICE: 'lokizen', FIRESTORE_EMULATOR_HOST: undefined, GOOGLE_APPLICATION_CREDENTIALS: undefined, K_REVISION: undefined }, () => {
    assert.equal(resolveStorageMode(), 'firestore');
  });
  withEnv({ LZ_STORAGE: undefined, K_SERVICE: undefined, K_REVISION: undefined, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8086', GOOGLE_APPLICATION_CREDENTIALS: undefined }, () => {
    assert.equal(resolveStorageMode(), 'firestore');
  });
});

test('Firebase target comes from the applet config and env overrides it', () => {
  withEnv({ FIRESTORE_PROJECT_ID: undefined, FIRESTORE_DATABASE_ID: undefined }, () => {
    const target = resolveFirebaseTarget();
    assert.equal(target.projectId, 'gen-lang-client-0681505509');
    assert.equal(target.databaseId, 'ai-studio-lokizenithai-d6782e3f-e427-4669-9fc7-3d14ae212597');
  });
  withEnv({ FIRESTORE_PROJECT_ID: 'demo-project', FIRESTORE_DATABASE_ID: '(default)' }, () => {
    const target = resolveFirebaseTarget();
    assert.equal(target.projectId, 'demo-project');
    assert.equal(target.databaseId, '(default)');
  });
});
