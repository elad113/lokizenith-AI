import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import path from 'path';

/** Server-only Firestore collections. Clients are denied in firestore.rules. */
export const LZ_COLLECTIONS = {
  users: 'lz_users',
  sessions: 'lz_sessions',
  userData: 'lz_user_data',
  sections: 'lz_sections',
} as const;

export const OBJECT_SECTION_KEYS = [
  'teamChats',
  'lokiTeams',
  'sharedConvLinks',
  'customCodes',
  'communityEvents',
  'platformConfig',
] as const;

export const ARRAY_SECTION_KEYS = [
  'sharedSnippets',
  'notifications',
  'auditLogs',
  'broadcastHistory',
  'scheduledBroadcasts',
] as const;

export const SECTION_KEYS = [...OBJECT_SECTION_KEYS, ...ARRAY_SECTION_KEYS] as const;

/** Stay under Firestore's 1 MiB document limit, including field-name overhead. */
export const MAX_CHUNK_BYTES = 700_000;

export interface RecordDiff {
  upserts: { id: string; json: string }[];
  deletes: string[];
  next: Map<string, string>;
}

export function probeFirestoreEmulator(timeoutMs: number = 2000): Promise<void> {
  const hostEnv = String(process.env.FIRESTORE_EMULATOR_HOST || '').trim();
  if (!hostEnv) return Promise.resolve();
  const colon = hostEnv.lastIndexOf(':');
  const host = colon > 0 ? hostEnv.slice(0, colon) : hostEnv;
  const port = colon > 0 ? Number(hostEnv.slice(colon + 1)) : NaN;
  if (!host || !Number.isFinite(port) || port <= 0) {
    return Promise.reject(new Error(`Invalid FIRESTORE_EMULATOR_HOST "${hostEnv}".`));
  }
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const finish = (err?: Error) => {
      socket.removeAllListeners();
      socket.destroy();
      if (err) reject(err);
      else resolve();
    };
    const timer = setTimeout(() => {
      finish(new Error(`Firestore emulator at ${hostEnv} did not accept a connection.`));
    }, timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      finish();
    });
    socket.once('error', (err) => {
      clearTimeout(timer);
      finish(new Error(`Firestore emulator at ${hostEnv} is unreachable (${err.message}).`));
    });
  });
}

export function resolveStorageMode(env: NodeJS.ProcessEnv = process.env): 'disk' | 'firestore' {
  const raw = String(env.LZ_STORAGE || '').trim().toLowerCase();
  if (raw === 'disk' || raw === 'file' || raw === 'local') return 'disk';
  if (raw === 'firestore' || raw === 'cloud') return 'firestore';
  if (raw) {
    throw new Error(`Unknown LZ_STORAGE="${raw}". Use "firestore" or "disk".`);
  }
  if (String(env.FIRESTORE_EMULATOR_HOST || '').trim()) return 'firestore';
  if (String(env.GOOGLE_APPLICATION_CREDENTIALS || '').trim()) return 'firestore';
  if (String(env.K_SERVICE || '').trim() || String(env.K_REVISION || '').trim()) return 'firestore';
  return 'disk';
}

export function resolveFirebaseTarget(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd()
): { projectId: string; databaseId: string } {
  let fileProject = '';
  let fileDb = '';
  try {
    const raw = fs.readFileSync(path.join(cwd, 'firebase-applet-config.json'), 'utf8');
    const parsed = JSON.parse(raw);
    fileProject = String(parsed?.projectId || '').trim();
    fileDb = String(parsed?.firestoreDatabaseId || '').trim();
  } catch {
    // Env vars can supply both ids when the config file is absent.
  }
  const projectId = String(env.FIRESTORE_PROJECT_ID || fileProject || '').trim();
  const databaseId = String(env.FIRESTORE_DATABASE_ID || fileDb || '(default)').trim() || '(default)';
  if (!projectId) {
    throw new Error(
      'Firestore project id is missing. Set FIRESTORE_PROJECT_ID or provide firebase-applet-config.json.'
    );
  }
  return { projectId, databaseId };
}

export function sectionDefault(key: string): unknown {
  return (ARRAY_SECTION_KEYS as readonly string[]).includes(key) ? [] : {};
}

/**
 * Split a string on UTF-8 boundaries so each piece fits in a Firestore document.
 * Pieces concatenate back to the original string.
 */
export function splitUtf8(text: string, maxBytes: number = MAX_CHUNK_BYTES): string[] {
  if (maxBytes < 16) throw new Error('Firestore chunk size is too small.');
  const buf = Buffer.from(text, 'utf8');
  if (buf.length <= maxBytes) return [text];
  const parts: string[] = [];
  let offset = 0;
  while (offset < buf.length) {
    let end = Math.min(offset + maxBytes, buf.length);
    if (end < buf.length) {
      while (end > offset && (buf[end]! & 0xc0) === 0x80) end--;
      if (end === offset) end = Math.min(offset + maxBytes, buf.length);
    }
    parts.push(buf.subarray(offset, end).toString('utf8'));
    offset = end;
  }
  return parts;
}

export function sanitizeDocId(id: string): string {
  const raw = String(id || '').trim();
  if (!raw) throw new Error('Empty Firestore document id.');
  const cleaned = raw.replace(/\//g, '_');
  const safe =
    cleaned !== '.' &&
    cleaned !== '..' &&
    cleaned.length <= 700 &&
    !cleaned.includes('__p') &&
    /^[A-Za-z0-9_-]+$/.test(cleaned) &&
    !/^__.*__$/.test(cleaned);
  if (!safe) return 'h_' + crypto.createHash('sha256').update(raw).digest('hex');
  return cleaned;
}

export function chunkDocId(recordKey: string, part: number): string {
  const base = sanitizeDocId(recordKey);
  return part <= 0 ? base : `${base}__p${part}`;
}

export function sessionDocId(token: string): string {
  return sanitizeDocId(token);
}

export function diffStringMap(baseline: Map<string, string>, current: Record<string, unknown> | undefined): RecordDiff {
  const next = new Map<string, string>();
  const upserts: { id: string; json: string }[] = [];
  for (const [id, value] of Object.entries(current || {})) {
    if (!id) continue;
    const json = JSON.stringify(value);
    next.set(id, json);
    if (baseline.get(id) !== json) upserts.push({ id, json });
  }
  const deletes: string[] = [];
  for (const id of baseline.keys()) {
    if (!next.has(id)) deletes.push(id);
  }
  return { upserts, deletes, next };
}

/**
 * A process must not delete every user it previously loaded when memory no longer
 * has any of them and nothing was written in their place. That is how an empty
 * boot used to wipe accounts. Explicit single deletes and imports that upsert
 * replacement records still go through.
 */
export function suppressAccidentalUserWipe(
  userDiff: { upserts: { id: string; json: string }[]; deletes: string[] },
  previousUserCount: number
): { deletes: string[]; blocked: boolean } {
  const blocked =
    userDiff.deletes.length > 1 &&
    userDiff.upserts.length === 0 &&
    userDiff.deletes.length >= previousUserCount &&
    previousUserCount > 1;
  return { deletes: blocked ? [] : userDiff.deletes, blocked };
}
