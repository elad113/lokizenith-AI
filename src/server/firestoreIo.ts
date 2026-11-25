import { applicationDefault, getApps, initializeApp, type App } from 'firebase-admin/app';
import { FieldPath, getFirestore, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import {
  LZ_COLLECTIONS,
  chunkDocId,
  resolveFirebaseTarget,
  sessionDocId,
  splitUtf8,
} from './firestoreCodec.ts';

let cachedDb: Firestore | null = null;
const knownPartCounts = new Map<string, number>();
let fullStoreLoaded = false;

function partCacheKey(collectionName: string, recordKey: string): string {
  return `${collectionName}:${recordKey}`;
}

export function getFirestoreDb(): Firestore {
  if (cachedDb) return cachedDb;
  const { projectId, databaseId } = resolveFirebaseTarget();
  const emulator = Boolean(String(process.env.FIRESTORE_EMULATOR_HOST || '').trim());
  let app: App;
  if (getApps().length) {
    app = getApps()[0]!;
  } else if (emulator) {
    app = initializeApp({ projectId });
  } else {
    app = initializeApp({ projectId, credential: applicationDefault() });
  }
  cachedDb = !databaseId || databaseId === '(default)' ? getFirestore(app) : getFirestore(app, databaseId);
  return cachedDb;
}

async function listDocs(db: Firestore, name: string): Promise<QueryDocumentSnapshot[]> {
  const docs: QueryDocumentSnapshot[] = [];
  const pageSize = 300;
  let cursor: QueryDocumentSnapshot | undefined;
  while (true) {
    let query = db.collection(name).orderBy(FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const snap = await query.get();
    if (snap.empty) break;
    docs.push(...snap.docs);
    if (snap.size < pageSize) break;
    cursor = snap.docs[snap.docs.length - 1];
  }
  return docs;
}

function groupChunkDocs(docs: QueryDocumentSnapshot[], collectionName?: string): Record<string, any> {
  const groups = new Map<string, { part: number; json: string }[]>();
  for (const doc of docs) {
    const data = doc.data() || {};
    const key = String(data.recordKey || String(doc.id).replace(/__p\d+$/, ''));
    const list = groups.get(key) || [];
    list.push({ part: Number(data.part || 0), json: String(data.json ?? '') });
    groups.set(key, list);
  }
  const out: Record<string, any> = {};
  for (const [key, parts] of groups) {
    parts.sort((a, b) => a.part - b.part);
    if (collectionName) {
      knownPartCounts.set(partCacheKey(collectionName, key), Math.max(1, parts.length));
    }
    const joined = parts.map((p) => p.json).join('');
    try {
      out[key] = joined ? JSON.parse(joined) : null;
    } catch (err) {
      throw new Error(`Corrupt Firestore record "${key}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return out;
}

async function readPartCount(db: Firestore, collectionName: string, recordKey: string): Promise<number> {
  const cacheKey = partCacheKey(collectionName, recordKey);
  if (knownPartCounts.has(cacheKey)) {
    return knownPartCounts.get(cacheKey)!;
  }
  // If we already loaded the entire store from Firestore, any record not in knownPartCounts has 0 existing parts.
  if (fullStoreLoaded) {
    return 0;
  }
  const snap = await db.collection(collectionName).doc(chunkDocId(recordKey, 0)).get();
  if (!snap.exists) {
    knownPartCounts.set(cacheKey, 0);
    return 0;
  }
  const count = Math.max(1, Number(snap.data()?.parts || 1));
  knownPartCounts.set(cacheKey, count);
  return count;
}

async function commitOps(
  db: Firestore,
  ops: { kind: 'set' | 'delete'; refPath: [string, string]; data?: Record<string, unknown> }[]
): Promise<void> {
  const chunkSize = 400;
  for (let i = 0; i < ops.length; i += chunkSize) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + chunkSize)) {
      const ref = db.collection(op.refPath[0]).doc(op.refPath[1]);
      if (op.kind === 'delete') batch.delete(ref);
      else batch.set(ref, op.data || {});
    }
    await batch.commit();
  }
}

async function writeChunkedRecord(db: Firestore, collectionName: string, recordKey: string, json: string): Promise<number> {
  const parts = splitUtf8(json);
  const previous = await readPartCount(db, collectionName, recordKey);
  const ops: { kind: 'set' | 'delete'; refPath: [string, string]; data?: Record<string, unknown> }[] = [];
  for (let part = 0; part < parts.length; part++) {
    ops.push({
      kind: 'set',
      refPath: [collectionName, chunkDocId(recordKey, part)],
      data: {
        recordKey,
        part,
        parts: parts.length,
        json: parts[part],
        updatedAt: Date.now(),
      },
    });
  }
  for (let part = parts.length; part < previous; part++) {
    ops.push({ kind: 'delete', refPath: [collectionName, chunkDocId(recordKey, part)] });
  }
  await commitOps(db, ops);
  knownPartCounts.set(partCacheKey(collectionName, recordKey), parts.length);
  return ops.length;
}

async function deleteChunkedRecord(db: Firestore, collectionName: string, recordKey: string): Promise<number> {
  const previous = await readPartCount(db, collectionName, recordKey);
  const count = Math.max(previous, 1);
  const ops: { kind: 'set' | 'delete'; refPath: [string, string] }[] = [];
  for (let part = 0; part < count; part++) {
    ops.push({ kind: 'delete', refPath: [collectionName, chunkDocId(recordKey, part)] });
  }
  await commitOps(db, ops);
  knownPartCounts.delete(partCacheKey(collectionName, recordKey));
  return ops.length;
}

export interface FlushPayload {
  users?: { upserts: { id: string; json: string }[]; deletes: string[] };
  userData?: { upserts: { id: string; json: string }[]; deletes: string[] };
  sessions?: { upserts: { id: string; json: string }[]; deletes: string[] };
  sections?: { id: string; json: string }[];
}

export async function applyFlush(payload: FlushPayload): Promise<{ writes: number }> {
  const db = getFirestoreDb();
  let writes = 0;
  for (const row of payload.users?.upserts || []) {
    writes += await writeChunkedRecord(db, LZ_COLLECTIONS.users, row.id, row.json);
  }
  for (const id of payload.users?.deletes || []) {
    writes += await deleteChunkedRecord(db, LZ_COLLECTIONS.users, id);
  }
  for (const row of payload.userData?.upserts || []) {
    writes += await writeChunkedRecord(db, LZ_COLLECTIONS.userData, row.id, row.json);
  }
  for (const id of payload.userData?.deletes || []) {
    writes += await deleteChunkedRecord(db, LZ_COLLECTIONS.userData, id);
  }
  const sessionSets: { kind: 'set' | 'delete'; refPath: [string, string]; data?: Record<string, unknown> }[] = [];
  for (const row of payload.sessions?.upserts || []) {
    const parsed = JSON.parse(row.json);
    const token = String(parsed?.token || row.id);
    sessionSets.push({
      kind: 'set',
      refPath: [LZ_COLLECTIONS.sessions, sessionDocId(token)],
      data: {
        token,
        userId: String(parsed?.userId || ''),
        createdAt: Number(parsed?.createdAt || 0),
      },
    });
  }
  for (const token of payload.sessions?.deletes || []) {
    sessionSets.push({ kind: 'delete', refPath: [LZ_COLLECTIONS.sessions, sessionDocId(token)] });
  }
  if (sessionSets.length) {
    await commitOps(db, sessionSets);
    writes += sessionSets.length;
  }
  for (const row of payload.sections || []) {
    writes += await writeChunkedRecord(db, LZ_COLLECTIONS.sections, row.id, row.json);
  }
  return { writes };
}

export async function loadEntireStore(): Promise<{ store: Record<string, any> }> {
  const db = getFirestoreDb();
  const [userDocs, sessionDocs, userDataDocs, sectionDocs] = await Promise.all([
    listDocs(db, LZ_COLLECTIONS.users),
    listDocs(db, LZ_COLLECTIONS.sessions),
    listDocs(db, LZ_COLLECTIONS.userData),
    listDocs(db, LZ_COLLECTIONS.sections),
  ]);
  knownPartCounts.clear();
  const users = groupChunkDocs(userDocs, LZ_COLLECTIONS.users);
  const userData = groupChunkDocs(userDataDocs, LZ_COLLECTIONS.userData);
  const sectionRecords = groupChunkDocs(sectionDocs, LZ_COLLECTIONS.sections);
  fullStoreLoaded = true;
  const meta =
    sectionRecords.meta && typeof sectionRecords.meta === 'object' && !Array.isArray(sectionRecords.meta)
      ? sectionRecords.meta
      : {};
  delete sectionRecords.meta;
  const sessions: Record<string, { token: string; userId: string; createdAt: number }> = {};
  for (const doc of sessionDocs) {
    const data = doc.data() || {};
    const token = String(data.token || '');
    if (!token) continue;
    sessions[token] = {
      token,
      userId: String(data.userId || ''),
      createdAt: Number(data.createdAt || 0),
    };
  }
  return {
    store: {
      schemaVersion: meta.schemaVersion,
      lastSavedAt: meta.lastSavedAt,
      saveCount: meta.saveCount,
      lastMigratedAt: meta.lastMigratedAt ?? undefined,
      migratedFromVersion: meta.migratedFromVersion ?? undefined,
      activeCommunityEventId: meta.activeCommunityEventId ?? null,
      users,
      sessions,
      userData,
      teamChats: sectionRecords.teamChats ?? {},
      lokiTeams: sectionRecords.lokiTeams ?? {},
      sharedSnippets: sectionRecords.sharedSnippets ?? [],
      sharedConvLinks: sectionRecords.sharedConvLinks ?? {},
      notifications: sectionRecords.notifications ?? [],
      customCodes: sectionRecords.customCodes ?? {},
      auditLogs: sectionRecords.auditLogs ?? [],
      broadcastHistory: sectionRecords.broadcastHistory ?? [],
      scheduledBroadcasts: sectionRecords.scheduledBroadcasts ?? [],
      platformConfig: sectionRecords.platformConfig,
      communityEvents: sectionRecords.communityEvents ?? {},
    },
  };
}

export async function lookupSession(token: string): Promise<{
  session: { token: string; userId: string; createdAt: number } | null;
  user: any;
  userData: any;
} | null> {
  const clean = String(token || '');
  if (!clean) return null;
  const db = getFirestoreDb();
  const snap = await db.collection(LZ_COLLECTIONS.sessions).doc(sessionDocId(clean)).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (String(data.token || '') !== clean) return null;
  const session = {
    token: clean,
    userId: String(data.userId || ''),
    createdAt: Number(data.createdAt || 0),
  };
  if (!session.userId) return { session, user: null, userData: null };
  const [user, userData] = await Promise.all([
    readSingleRecord(db, LZ_COLLECTIONS.users, session.userId),
    readSingleRecord(db, LZ_COLLECTIONS.userData, session.userId),
  ]);
  return { session, user, userData };
}

async function readSingleRecord(db: Firestore, collectionName: string, recordKey: string): Promise<any> {
  const first = await db.collection(collectionName).doc(chunkDocId(recordKey, 0)).get();
  if (!first.exists) return null;
  const parts = Math.max(1, Number(first.data()?.parts || 1));
  knownPartCounts.set(partCacheKey(collectionName, recordKey), parts);
  const chunks: string[] = new Array(parts);
  chunks[0] = String(first.data()?.json ?? '');
  if (parts > 1) {
    const rest = await Promise.all(
      Array.from({ length: parts - 1 }, (_, index) =>
        db.collection(collectionName).doc(chunkDocId(recordKey, index + 1)).get()
      )
    );
    rest.forEach((snap, index) => {
      if (!snap.exists) {
        throw new Error(`Missing Firestore chunk ${index + 1} for ${collectionName}/${recordKey}`);
      }
      chunks[index + 1] = String(snap.data()?.json ?? '');
    });
  }
  const joined = chunks.join('');
  return joined ? JSON.parse(joined) : null;
}

async function deleteAllDocs(db: Firestore, name: string): Promise<void> {
  while (true) {
    const snap = await db.collection(name).limit(400).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < 400) return;
  }
}

export async function wipeServerCollections(): Promise<void> {
  const db = getFirestoreDb();
  for (const name of Object.values(LZ_COLLECTIONS)) {
    await deleteAllDocs(db, name);
  }
  knownPartCounts.clear();
  fullStoreLoaded = false;
}
