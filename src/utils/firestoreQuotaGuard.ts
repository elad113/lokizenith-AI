export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type FirestoreQuotaMetric = 'read' | 'write' | 'unknown';

export interface FirestoreQuotaStatus {
  exhausted: boolean;
  exhaustedUntil: number;
  remainingMs: number;
  metric: FirestoreQuotaMetric;
  upgradeUrl: string;
  message: string;
}

export const DEFAULT_QUOTA_COOLDOWN_MS = 15 * 60_000; // 15 minutes
export const DEFAULT_VAULT_SYNC_MIN_INTERVAL_MS = 5 * 60_000; // 5 minutes
export const DEFAULT_QUOTA_STORAGE_KEY = 'lz.firestore.quota.cooldown.v1';

export function extractErrorMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return `${code ? `[${String(code)}] ` : ''}${error.message || ''}`.trim();
  }
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    const code = obj.code ? `[${String(obj.code)}] ` : '';
    const msg = obj.message ? String(obj.message) : '';
    if (code || msg) return `${code}${msg}`.trim();
    try {
      return JSON.stringify(obj);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

export function isClientFirestoreQuotaError(error: unknown): boolean {
  const msg = extractErrorMessage(error).toLowerCase();
  if (!msg) return false;
  return (
    msg.includes('resource-exhausted') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('free daily write units') ||
    msg.includes('free daily read units') ||
    msg.includes('using maximum backoff delay')
  );
}

export function detectQuotaMetric(error: unknown): FirestoreQuotaMetric {
  const msg = extractErrorMessage(error).toLowerCase();
  if (msg.includes('write unit') || msg.includes('write_unit')) return 'write';
  if (msg.includes('read unit') || msg.includes('read_unit')) return 'read';
  return 'unknown';
}

export function buildClientFirestoreUpgradeUrl(projectId: string, databaseId: string): string {
  const p = String(projectId || '').trim();
  const d = String(databaseId || '(default)').trim() || '(default)';
  if (!p) return 'https://firebase.google.com/pricing#cloud-firestore';
  return `https://console.firebase.google.com/project/${encodeURIComponent(p)}/firestore/databases/${encodeURIComponent(d)}/data?openUpgradeDialog=true`;
}

export function formatQuotaFriendlyMessage(metric: FirestoreQuotaMetric, upgradeUrl: string): string {
  const kind = metric === 'write' ? 'daily write' : metric === 'read' ? 'daily read' : 'daily free-tier';
  return `Firebase Firestore ${kind} quota was reached. Cloud mirroring is paused temporarily while local/server sync continues normally. Daily quota resets automatically, or upgrade your Firestore database at: ${upgradeUrl}`;
}

interface PersistedCooldownState {
  exhaustedUntil: number;
  metric: FirestoreQuotaMetric;
  trippedAt: number;
}

export class FirestoreQuotaCircuitBreaker {
  private readonly storageKey: string;
  private readonly cooldownMs: number;
  private readonly upgradeUrl: string;
  private readonly storage: StorageLike | null;
  private readonly now: () => number;
  private readonly onTrip?: (status: FirestoreQuotaStatus) => void;
  private readonly onReset?: () => void;

  private exhaustedUntil = 0;
  private metric: FirestoreQuotaMetric = 'unknown';
  private notifiedThisSession = false;

  constructor(opts: {
    projectId: string;
    databaseId: string;
    storage?: StorageLike | null;
    storageKey?: string;
    cooldownMs?: number;
    now?: () => number;
    onTrip?: (status: FirestoreQuotaStatus) => void;
    onReset?: () => void;
  }) {
    this.upgradeUrl = buildClientFirestoreUpgradeUrl(opts.projectId, opts.databaseId);
    this.storage = opts.storage ?? null;
    this.storageKey = opts.storageKey || DEFAULT_QUOTA_STORAGE_KEY;
    this.cooldownMs = Math.max(5_000, opts.cooldownMs ?? DEFAULT_QUOTA_COOLDOWN_MS);
    this.now = opts.now || Date.now;
    this.onTrip = opts.onTrip;
    this.onReset = opts.onReset;
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedCooldownState>;
      const until = Number(parsed?.exhaustedUntil || 0);
      if (Number.isFinite(until) && until > this.now()) {
        this.exhaustedUntil = until;
        this.metric = parsed?.metric === 'read' || parsed?.metric === 'write' ? parsed.metric : 'unknown';
      } else {
        this.storage.removeItem(this.storageKey);
      }
    } catch {
      // ignore corrupted storage
    }
  }

  private persistToStorage(): void {
    if (!this.storage) return;
    try {
      if (this.exhaustedUntil > this.now()) {
        const payload: PersistedCooldownState = {
          exhaustedUntil: this.exhaustedUntil,
          metric: this.metric,
          trippedAt: this.now(),
        };
        this.storage.setItem(this.storageKey, JSON.stringify(payload));
      } else {
        this.storage.removeItem(this.storageKey);
      }
    } catch {
      // ignore restricted storage
    }
  }

  isPaused(): boolean {
    const t = this.now();
    if (this.exhaustedUntil > t) return true;
    if (this.exhaustedUntil !== 0) {
      this.exhaustedUntil = 0;
      this.persistToStorage();
    }
    return false;
  }

  getStatus(): FirestoreQuotaStatus {
    const t = this.now();
    const paused = this.isPaused();
    return {
      exhausted: paused,
      exhaustedUntil: paused ? this.exhaustedUntil : 0,
      remainingMs: paused ? Math.max(0, this.exhaustedUntil - t) : 0,
      metric: this.metric,
      upgradeUrl: this.upgradeUrl,
      message: formatQuotaFriendlyMessage(this.metric, this.upgradeUrl),
    };
  }

  trip(error: unknown): { trippedNow: boolean; status: FirestoreQuotaStatus } {
    const wasPaused = this.isPaused();
    const detected = detectQuotaMetric(error);
    if (detected !== 'unknown' || this.metric === 'unknown') {
      this.metric = detected;
    }
    this.exhaustedUntil = this.now() + this.cooldownMs;
    this.persistToStorage();
    const status = this.getStatus();
    const trippedNow = !wasPaused || !this.notifiedThisSession;
    this.notifiedThisSession = true;
    if (trippedNow) {
      try {
        this.onTrip?.(status);
      } catch {
        // never throw inside circuit breaker callback
      }
    }
    return { trippedNow, status };
  }

  reset(): void {
    this.exhaustedUntil = 0;
    this.metric = 'unknown';
    this.notifiedThisSession = false;
    this.persistToStorage();
    try {
      this.onReset?.();
    } catch {
      // ignore
    }
  }
}

export interface VaultSyncSummaryInput {
  username: string;
  plan?: string;
  convsCount?: number;
  schemaVersion?: number;
  settings?: Record<string, unknown>;
  recentTitles?: string[];
}

export function buildVaultSyncSignature(uid: string, summary: VaultSyncSummaryInput): string {
  const plan = summary.plan === 'ultimate' ? 'ultimate' : summary.plan === 'pro' ? 'pro' : 'free';
  const titles = (Array.isArray(summary.recentTitles) ? summary.recentTitles : [])
    .map((t) => String(t || '').slice(0, 120))
    .filter(Boolean)
    .slice(0, 25);
  const settingsEntries: Array<[string, string | number | boolean]> = [];
  if (summary.settings && typeof summary.settings === 'object') {
    for (const [k, v] of Object.entries(summary.settings).slice(0, 25)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        settingsEntries.push([String(k).slice(0, 48), typeof v === 'string' ? v.slice(0, 500) : v]);
      }
    }
    settingsEntries.sort((a, b) => a[0].localeCompare(b[0]));
  }
  return JSON.stringify({
    uid,
    username: String(summary.username || 'User').slice(0, 64),
    plan,
    convsCount: Math.max(0, Math.floor(Number(summary.convsCount) || 0)),
    schemaVersion: Math.max(1, Math.floor(Number(summary.schemaVersion) || 3)),
    settings: settingsEntries,
    recentTitles: titles,
  });
}

/**
 * Prevents redundant client-side Firestore vault mirror writes by skipping unchanged payloads
 * and enforcing a minimum cooldown interval per user (cutting daily write units by >95%).
 */
export class VaultSyncThrottle {
  private readonly minIntervalMs: number;
  private readonly now: () => number;
  private readonly lastByUid = new Map<string, { sig: string; at: number }>();

  constructor(opts: { minIntervalMs?: number; now?: () => number } = {}) {
    this.minIntervalMs = Math.max(0, opts.minIntervalMs ?? DEFAULT_VAULT_SYNC_MIN_INTERVAL_MS);
    this.now = opts.now || Date.now;
  }

  shouldSync(uid: string, summary: VaultSyncSummaryInput): boolean {
    if (!uid) return false;
    const sig = buildVaultSyncSignature(uid, summary);
    const prev = this.lastByUid.get(uid);
    if (!prev) return true;
    if (prev.sig === sig) return false;
    return this.now() - prev.at >= this.minIntervalMs;
  }

  markSynced(uid: string, summary: VaultSyncSummaryInput): void {
    if (!uid) return;
    this.lastByUid.set(uid, {
      sig: buildVaultSyncSignature(uid, summary),
      at: this.now(),
    });
  }

  clear(uid?: string): void {
    if (uid) this.lastByUid.delete(uid);
    else this.lastByUid.clear();
  }
}

export async function withFirestoreTimeout<T>(promise: Promise<T>, timeoutMs = 7000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error('Firestore operation timed out');
          (err as { code?: string }).code = 'deadline-exceeded';
          reject(err);
        }, Math.max(100, timeoutMs));
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
