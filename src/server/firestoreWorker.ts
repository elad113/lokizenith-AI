import fs from 'fs';
import { parentPort } from 'node:worker_threads';
import { LZ_COLLECTIONS } from './firestoreCodec.ts';
import { applyFlush, getFirestoreDb, loadEntireStore, lookupSession, type FlushPayload } from './firestoreIo.ts';

if (!parentPort) {
  throw new Error('Firestore worker must be started as a worker thread.');
}

const port = parentPort;
let mirrorsStarted = false;

function finish(msg: any, err: unknown, result?: unknown): void {
  const body = err
    ? {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      }
    : { ok: true, result };
  const tmp = `${msg.resultFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(body));
  fs.renameSync(tmp, msg.resultFile);
  if (msg.sab) {
    const view = new Int32Array(msg.sab);
    Atomics.store(view, 0, 1);
    Atomics.notify(view, 0);
  }
  port.postMessage({ id: msg.id, done: true });
}

function startMirrors(): void {
  if (mirrorsStarted) return;
  mirrorsStarted = true;
  const db = getFirestoreDb();

  db.collection(LZ_COLLECTIONS.users).onSnapshot(
    (snap) => {
      try {
        for (const change of snap.docChanges()) {
          const data = change.doc.data() || {};
          if (Number(data.parts || 1) !== 1) continue;
          const id = String(data.recordKey || '');
          if (!id) continue;
          port.postMessage({
            type: 'remote',
            coll: 'users',
            change: change.type,
            id,
            json: String(data.json || ''),
          });
        }
      } catch (err) {
        console.error('[Store] User mirror callback failed:', err instanceof Error ? err.message : err);
      }
    },
    (err) => {
      console.error('[Store] User mirror stream failed:', err.message);
    }
  );

  db.collection(LZ_COLLECTIONS.sessions).onSnapshot(
    (snap) => {
      try {
        for (const change of snap.docChanges()) {
          const data = change.doc.data() || {};
          const token = String(data.token || '');
          if (!token && change.type !== 'removed') continue;
          port.postMessage({
            type: 'remote',
            coll: 'sessions',
            change: change.type,
            id: token || String(data.token || ''),
            json: JSON.stringify({
              token,
              userId: String(data.userId || ''),
              createdAt: Number(data.createdAt || 0),
            }),
          });
        }
      } catch (err) {
        console.error('[Store] Session mirror callback failed:', err instanceof Error ? err.message : err);
      }
    },
    (err) => {
      console.error('[Store] Session mirror stream failed:', err.message);
    }
  );
}

let chain: Promise<void> = Promise.resolve();

port.on('message', (msg) => {
  chain = chain.then(() => handle(msg)).catch((err) => {
    try {
      finish(msg, err);
    } catch (nested) {
      console.error('[Store] Firestore worker failed to report an error:', nested);
    }
  });
});

async function handle(msg: any): Promise<void> {
  try {
    let result: unknown = null;
    if (msg.op === 'ping') {
      result = { ok: true };
    } else if (msg.op === 'load') {
      result = await loadEntireStore();
      if (msg.payload?.mirror !== false) startMirrors();
    } else if (msg.op === 'flush') {
      result = await applyFlush((msg.payload || {}) as FlushPayload);
    } else if (msg.op === 'lookup') {
      result = await lookupSession(String(msg.payload?.token || ''));
    } else {
      throw new Error(`Unknown Firestore worker op "${msg.op}"`);
    }
    finish(msg, null, result);
  } catch (err) {
    finish(msg, err);
  }
}

port.postMessage({ type: 'ready' });
