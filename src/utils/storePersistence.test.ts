import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENT_STORE_SCHEMA_VERSION,
  inspectStoreCandidate,
  pickBestStoreCandidate,
  migrateStoreNonDestructively,
  mergeStoreSnapshots,
  mergeUserSyncedData,
  parseWalNdjson,
  replayWalEntriesOnStore,
} from './storePersistence.ts';

function makeEmptyStore() {
  return {
    schemaVersion: CURRENT_STORE_SCHEMA_VERSION,
    lastSavedAt: 0,
    saveCount: 0,
    users: {},
    sessions: {},
    userData: {},
    teamChats: {},
    lokiTeams: {},
    sharedSnippets: [],
    sharedConvLinks: {},
    notifications: [],
    customCodes: {},
    auditLogs: [],
    broadcastHistory: [],
    scheduledBroadcasts: [],
    platformConfig: { motdEnabled: false, allowRegistrations: true },
    communityEvents: {},
    activeCommunityEventId: null,
  };
}

test('pickBestStoreCandidate recovers populated survivor mirror over wiped empty primary store', () => {
  const emptyPrimary = inspectStoreCandidate(JSON.stringify(makeEmptyStore()), 'primary', 2000);
  const corruptPrimary = inspectStoreCandidate('{bad-json', 'corrupt', 3000);
  const populatedMirror = inspectStoreCandidate(
    JSON.stringify({
      schemaVersion: 1,
      lastSavedAt: 1000,
      users: {
        usr_1: { id: 'usr_1', username: 'EladBenczel', usernameLower: 'eladbenczel', plan: 'ultimate' },
        usr_2: { id: 'usr_2', username: 'Alice', usernameLower: 'alice', plan: 'pro' },
      },
      userData: {
        usr_2: { convs: [{ id: 'c1', messages: [{ role: 'user', content: 'hi' }] }], settings: {} },
      },
    }),
    'external-vault-mirror',
    1000
  );

  const chosen = pickBestStoreCandidate([emptyPrimary, corruptPrimary, populatedMirror]);
  assert.ok(chosen);
  assert.equal(chosen.source, 'external-vault-mirror');
  assert.equal(chosen.usersCount, 2);
  assert.equal(chosen.convsCount, 1);
});

test('migrateStoreNonDestructively upgrades v1 stores to v3 while keeping all existing account fields', () => {
  const legacyRaw = {
    users: {
      usr_legacy: {
        id: 'usr_legacy',
        username: 'VeteranUser',
        passwordHash: 'abc123hash',
        salt: 'salt123',
        tokensRemaining: 120000,
        bonusTokens: 50000,
        customLegacyTag: 'keep-me-forever',
      },
    },
    userData: {
      usr_legacy: {
        convs: [{ id: 'conv_old', title: 'Old Chat', messages: [{ role: 'user', content: 'saved forever' }] }],
        settings: { theme: 'emerald' },
      },
    },
  };

  const migrated = migrateStoreNonDestructively(
    legacyRaw,
    makeEmptyStore,
    { motdEnabled: false, allowRegistrations: true },
    999999
  );
  const store: any = migrated.store;

  assert.equal(migrated.migratedFromVersion, 1);
  assert.equal(store.schemaVersion, CURRENT_STORE_SCHEMA_VERSION);
  assert.equal(store.users.usr_legacy.passwordHash, 'abc123hash');
  assert.equal(store.users.usr_legacy.bonusTokens, 50000);
  assert.equal(store.users.usr_legacy.customLegacyTag, 'keep-me-forever');
  assert.equal(store.userData.usr_legacy.convs.length, 1);
  assert.equal(store.userData.usr_legacy.convs[0].title, 'Old Chat');
});

test('mergeStoreSnapshots combines users and chats non-destructively in merge mode', () => {
  const current = {
    ...makeEmptyStore(),
    users: {
      usr_a: { id: 'usr_a', username: 'Admin', usernameLower: 'admin', totalTokensUsed: 500, totalTimeSeconds: 200 },
    },
    sessions: { admin_tok: { token: 'admin_tok', userId: 'usr_a', createdAt: 100 } },
    userData: {
      usr_a: { convs: [{ id: 'c_current', title: 'Current Chat', messages: [{ role: 'user', content: '1' }] }], settings: {} },
    },
  };

  const incoming = {
    users: {
      usr_b: { id: 'usr_b', username: 'RestoredUser', usernameLower: 'restoreduser', plan: 'pro', totalTokensUsed: 900 },
    },
    userData: {
      usr_b: { convs: [{ id: 'c_old', title: 'Old Backup Chat', messages: [{ role: 'user', content: '2' }] }], settings: {} },
      usr_a: { convs: [{ id: 'c_missing', title: 'Missing Chat', messages: [{ role: 'user', content: '3' }] }], settings: {} },
    },
    customCodes: { SAVE2025: { code: 'SAVE2025', tokens: 25000 } },
  };

  const mergeRes = mergeStoreSnapshots(
    current,
    incoming,
    'merge',
    makeEmptyStore,
    { motdEnabled: false, allowRegistrations: true },
    50000
  );
  const merged: any = mergeRes.store;
  const summary = mergeRes.summary;

  assert.equal(summary.usersAdded, 1);
  assert.equal(summary.convsMerged, 2);
  assert.equal(Object.keys(merged.users).length, 2);
  assert.ok(merged.users.usr_a);
  assert.ok(merged.users.usr_b);
  assert.equal(merged.userData.usr_a.convs.length, 2);
  assert.equal(merged.userData.usr_b.convs.length, 1);
  assert.ok(merged.customCodes.SAVE2025);
  assert.ok(merged.sessions.admin_tok);
});

test('mergeUserSyncedData never deletes existing chats when stale tab syncs empty and merges concurrent messages', () => {
  const existing = {
    convs: [
      {
        id: 'c_1',
        title: 'Main Chat',
        created: 1000,
        updated: 2000,
        messages: [{ id: 'm1', role: 'user', text: 'hello', ts: 1000 }],
      },
      {
        id: 'c_2',
        title: 'Important History',
        created: 1500,
        updated: 1500,
        messages: [{ id: 'm2', role: 'user', text: 'keep forever', ts: 1500 }],
      },
    ],
    settings: { accent: '#00ff9c', lang: 'en' },
    settingsUpdatedAt: 2000,
    updatedAt: 2000,
  };

  // Case A: Stale tab sends only c_1 (missing c_2) and adds m_tab2 -> c_2 MUST NOT be deleted!
  const resA = mergeUserSyncedData(
    existing,
    {
      convs: [
        {
          id: 'c_1',
          title: 'Main Chat',
          created: 1000,
          updated: 3000,
          messages: [{ id: 'm3', role: 'assistant', text: 'reply from tab 2', ts: 3000 }],
        },
      ],
      settings: { compact: true },
      settingsUpdatedAt: 3000,
      updatedAt: 3000,
    },
    3000
  );
  assert.equal(resA.data.convs.length, 2);
  const c1 = resA.data.convs.find((c) => c.id === 'c_1');
  assert.equal(c1.messages.length, 2);
  assert.equal(resA.data.settings.accent, '#00ff9c');
  assert.equal(resA.data.settings.compact, true);

  // Case B: Explicit tombstone deletion removes only targeted chat cleanly
  const resB = mergeUserSyncedData(
    resA.data,
    {
      deletedConvIds: { c_2: 4000 },
      updatedAt: 4000,
    },
    4000
  );
  assert.equal(resB.data.convs.length, 1);
  assert.equal(resB.data.convs[0].id, 'c_1');
});

test('parseWalNdjson tolerates partial crash tail lines and replayWalEntriesOnStore recovers mutations', () => {
  const walText = [
    JSON.stringify({
      seq: 1,
      ts: 5000,
      kind: 'user_upsert',
      key: 'usr_99',
      payload: { id: 'usr_99', username: 'CrashSurvivor', usernameLower: 'crashsurvivor', plan: 'ultimate', unlimitedOverride: true },
    }),
    JSON.stringify({
      seq: 2,
      ts: 5100,
      kind: 'user_data_merge',
      key: 'usr_99',
      payload: { convs: [{ id: 'c_wal', title: 'WAL Recovered Chat', updated: 5100, messages: [{ id: 'm1', role: 'user', text: 'never lost', ts: 5100 }] }] },
    }),
    JSON.stringify({
      seq: 3,
      ts: 5200,
      kind: 'session_upsert',
      key: 'tok_wal',
      payload: { token: 'tok_wal', userId: 'usr_99', createdAt: 5200 },
    }),
    '{"seq":4,"ts":5300,"kind":"torn_unterminated_crash_line',
  ].join('\n');

  const entries = parseWalNdjson(walText);
  assert.equal(entries.length, 3);

  const recovered: any = makeEmptyStore();
  const res = replayWalEntriesOnStore(recovered, entries, { motdEnabled: false });
  assert.equal(res.applied, 3);
  assert.equal(recovered.users.usr_99.plan, 'ultimate');
  assert.equal(recovered.users.usr_99.unlimitedOverride, true);
  assert.equal(recovered.userData.usr_99.convs.length, 1);
  assert.equal(recovered.userData.usr_99.convs[0].title, 'WAL Recovered Chat');
  assert.equal(recovered.sessions.tok_wal.userId, 'usr_99');
});
