import fs from 'fs';
import os from 'os';
import path from 'path';
import { Worker } from 'node:worker_threads';

export interface RemoteChange {
  type: 'remote';
  coll: 'users' | 'sessions';
  change: 'added' | 'modified' | 'removed';
  id: string;
  json: string;
}

type PendingAsync = {
  resolve: (value: any) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
  resultFile: string;
};

let worker: Worker | null = null;
let starting: Promise<void> | null = null;
let seq = 0;
let onRemote: (msg: RemoteChange) => void = () => {};
const pendingAsync = new Map<number, PendingAsync>();

export function setFirestoreRemoteHandler(handler: (msg: RemoteChange) => void): void {
  onRemote = handler;
}

function workerExecArgv(): string[] {
  const inherited = process.execArgv.filter((arg) => arg.includes('strip-types') || arg.includes('experimental-transform-types'));
  if (inherited.length) return inherited;
  return ['--experimental-strip-types'];
}

function readResultFile(resultFile: string): any {
  const raw = fs.readFileSync(resultFile, 'utf8');
  const parsed = JSON.parse(raw);
  try {
    fs.unlinkSync(resultFile);
  } catch {
    // already removed
  }
  if (!parsed?.ok) {
    const error = new Error(parsed?.error || 'Firestore worker request failed');
    if (parsed?.stack) error.stack = parsed.stack;
    throw error;
  }
  return parsed.result;
}

export function startFirestoreWorker(): Promise<void> {
  if (worker) return Promise.resolve();
  if (starting) return starting;
  starting = new Promise<void>((resolve, reject) => {
    const workerUrl = new URL('./firestoreWorker.ts', import.meta.url);
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Firestore worker did not start within 20s.'));
    }, 20_000);
    const instance = new Worker(workerUrl, {
      execArgv: workerExecArgv(),
      env: process.env,
    });
    worker = instance;
    instance.on('message', (msg) => {
      if (msg?.type === 'ready') {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve();
        }
        return;
      }
      if (msg?.type === 'remote') {
        try {
          onRemote(msg as RemoteChange);
        } catch (err) {
          console.error('[Store] Remote Firestore apply failed:', err instanceof Error ? err.message : err);
        }
        return;
      }
      if (msg?.done && pendingAsync.has(msg.id)) {
        const pending = pendingAsync.get(msg.id)!;
        pendingAsync.delete(msg.id);
        clearTimeout(pending.timer);
        try {
          pending.resolve(readResultFile(pending.resultFile));
        } catch (err) {
          pending.reject(err instanceof Error ? err : new Error(String(err)));
        }
      }
    });
    instance.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
      for (const [id, pending] of pendingAsync) {
        pendingAsync.delete(id);
        clearTimeout(pending.timer);
        pending.reject(err instanceof Error ? err : new Error(String(err)));
      }
      console.error('[Store] Firestore worker error:', err instanceof Error ? err.message : err);
    });
    instance.on('exit', (code) => {
      if (worker === instance) worker = null;
      if (code !== 0) {
        const error = new Error(`Firestore worker exited with code ${code}.`);
        for (const [id, pending] of pendingAsync) {
          pendingAsync.delete(id);
          clearTimeout(pending.timer);
          pending.reject(error);
        }
      }
    });
  });
  return starting;
}

function resultPath(id: number): string {
  return path.join(os.tmpdir(), `lz-fs-${process.pid}-${id}.json`);
}

export function firestoreRequestAsync<T>(op: string, payload: unknown, timeoutMs: number): Promise<T> {
  if (!worker) return Promise.reject(new Error('Firestore worker is not running.'));
  const id = ++seq;
  const file = resultPath(id);
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingAsync.delete(id);
      reject(new Error(`Firestore ${op} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
    pendingAsync.set(id, {
      resolve: resolve as (value: any) => void,
      reject,
      timer,
      resultFile: file,
    });
    worker!.postMessage({ id, op, payload, resultFile: file });
  });
}

export function firestoreRequestSync<T>(op: string, payload: unknown, timeoutMs: number): T {
  if (!worker) throw new Error('Firestore worker is not running.');
  const id = ++seq;
  const file = resultPath(id);
  const sab = new SharedArrayBuffer(4);
  const view = new Int32Array(sab);
  Atomics.store(view, 0, 0);
  worker.postMessage({ id, op, payload, resultFile: file, sab });
  const status = Atomics.wait(view, 0, 0, timeoutMs);
  if (Atomics.load(view, 0) === 0) {
    throw new Error(`Firestore ${op} timed out after ${timeoutMs}ms (${status}).`);
  }
  return readResultFile(file) as T;
}

export async function stopFirestoreWorker(): Promise<void> {
  const instance = worker;
  worker = null;
  starting = null;
  if (!instance) return;
  await instance.terminate();
}
