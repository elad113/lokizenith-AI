import type { AccountRecord } from './authQuota.ts';

export const CURRENT_STORE_SCHEMA_VERSION = 3;

export interface StoreCandidateReport {
  source: string;
  valid: boolean;
  error?: string;
  schemaVersion: number;
  lastSavedAt: number;
  mtimeMs: number;
  usersCount: number;
  convsCount: number;
  messagesCount: number;
  teamsCount: number;
  codesCount: number;
  eventsCount: number;
  richnessScore: number;
  parsed?: Record<string, any>;
}

export interface StoreMergeSummary {
  mode: 'merge' | 'replace';
  usersAdded: number;
  usersUpdated: number;
  convsMerged: number;
  codesMerged: number;
  eventsMerged: number;
  teamsMerged: number;
  totalUsersAfter: number;
}

function countUserDataStats(userData: Record<string, any> | undefined): { convsCount: number; messagesCount: number } {
  if (!userData || typeof userData !== 'object') return { convsCount: 0, messagesCount: 0 };
  let convsCount = 0;
  let messagesCount = 0;
  for (const entry of Object.values(userData)) {
    const convs = Array.isArray((entry as any)?.convs) ? (entry as any).convs : [];
    convsCount += convs.length;
    for (const c of convs) {
      if (Array.isArray(c?.messages)) {
        messagesCount += c.messages.length;
      }
    }
  }
  return { convsCount, messagesCount };
}

export function inspectStoreCandidate(
  rawJson: string,
  source: string,
  mtimeMs: number = 0
): StoreCandidateReport {
  try {
    const clean = String(rawJson || '').trim();
    if (!clean) {
      return {
        source,
        valid: false,
        error: 'Empty store payload',
        schemaVersion: 0,
        lastSavedAt: 0,
        mtimeMs,
        usersCount: 0,
        convsCount: 0,
        messagesCount: 0,
        teamsCount: 0,
        codesCount: 0,
        eventsCount: 0,
        richnessScore: -1,
      };
    }
    const parsed = JSON.parse(clean);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        source,
        valid: false,
        error: 'Store root is not a JSON object',
        schemaVersion: 0,
        lastSavedAt: 0,
        mtimeMs,
        usersCount: 0,
        convsCount: 0,
        messagesCount: 0,
        teamsCount: 0,
        codesCount: 0,
        eventsCount: 0,
        richnessScore: -1,
      };
    }

    const usersObj = parsed.users && typeof parsed.users === 'object' ? parsed.users : {};
    const usersCount = Object.keys(usersObj).length;
    const { convsCount, messagesCount } = countUserDataStats(parsed.userData);
    const teamsCount =
      (parsed.teamChats && typeof parsed.teamChats === 'object' ? Object.keys(parsed.teamChats).length : 0) +
      (parsed.lokiTeams && typeof parsed.lokiTeams === 'object' ? Object.keys(parsed.lokiTeams).length : 0);
    const codesCount =
      parsed.customCodes && typeof parsed.customCodes === 'object' ? Object.keys(parsed.customCodes).length : 0;
    const eventsCount =
      parsed.communityEvents && typeof parsed.communityEvents === 'object'
        ? Object.keys(parsed.communityEvents).length
        : 0;
    const schemaVersion = Math.max(1, Math.floor(Number(parsed.schemaVersion) || 1));
    const lastSavedAt = Math.max(0, Number(parsed.lastSavedAt) || 0);

    // Weight actual persisted accounts and user conversations heavily so an update
    // never accidentally overwrites rich data with an empty fresh seed.
    const richnessScore =
      usersCount * 10000 +
      convsCount * 200 +
      messagesCount * 20 +
      teamsCount * 100 +
      eventsCount * 80 +
      codesCount * 40;

    return {
      source,
      valid: true,
      schemaVersion,
      lastSavedAt,
      mtimeMs,
      usersCount,
      convsCount,
      messagesCount,
      teamsCount,
      codesCount,
      eventsCount,
      richnessScore,
      parsed,
    };
  } catch (err: any) {
    return {
      source,
      valid: false,
      error: err?.message || 'Invalid JSON',
      schemaVersion: 0,
      lastSavedAt: 0,
      mtimeMs,
      usersCount: 0,
      convsCount: 0,
      messagesCount: 0,
      teamsCount: 0,
      codesCount: 0,
      eventsCount: 0,
      richnessScore: -1,
    };
  }
}

/**
 * Selects the best store snapshot among multiple disk/mirror/backup candidates.
 * Strongly prefers non-empty populated stores over empty initialized files, and among
 * equally rich candidates prefers the most recently saved snapshot.
 */
export function pickBestStoreCandidate(candidates: StoreCandidateReport[]): StoreCandidateReport | null {
  const valid = candidates.filter((c) => c.valid && c.parsed);
  if (!valid.length) return null;

  const sorted = [...valid].sort((a, b) => {
    const aHasUsers = a.usersCount > 0 ? 1 : 0;
    const bHasUsers = b.usersCount > 0 ? 1 : 0;
    if (bHasUsers !== aHasUsers) return bHasUsers - aHasUsers;

    // Prefer whichever copy has significantly more recent state when both have users,
    // UNLESS one copy clearly has more preserved accounts (avoid losing users after partial reset).
    if (b.usersCount !== a.usersCount) {
      return b.usersCount - a.usersCount;
    }
    const timeA = Math.max(a.lastSavedAt, a.mtimeMs);
    const timeB = Math.max(b.lastSavedAt, b.mtimeMs);
    if (timeB !== timeA) return timeB - timeA;
    if (b.richnessScore !== a.richnessScore) return b.richnessScore - a.richnessScore;
    return b.schemaVersion - a.schemaVersion;
  });

  return sorted[0];
}

/**
 * Non-destructively upgrades any older persisted store snapshot to CURRENT_STORE_SCHEMA_VERSION
 * without ever stripping user accounts, passwords, balances, plans, chats, codes, or events.
 */
export function migrateStoreNonDestructively<T extends Record<string, any>>(
  raw: Record<string, any>,
  emptyFactory: () => T,
  defaultPlatformConfig: Record<string, any>,
  now: number = Date.now()
): { store: T; migratedFromVersion: number | null } {
  const base = emptyFactory();
  const prevVersion = Math.max(1, Math.floor(Number(raw?.schemaVersion) || 1));
  const users: Record<string, AccountRecord> =
    raw?.users && typeof raw.users === 'object' ? { ...raw.users } : {};

  // Repair legacy missing user identity keys cleanly without wiping existing data
  for (const [key, acc] of Object.entries(users)) {
    if (!acc || typeof acc !== 'object') continue;
    if (!acc.id) acc.id = key;
    if (!acc.username) acc.username = key;
    if (!acc.usernameLower) acc.usernameLower = String(acc.username).toLowerCase();
    if (!acc.displayName) acc.displayName = acc.username;
    if (!Array.isArray(acc.usedGiftCodes)) acc.usedGiftCodes = [];
    if (typeof acc.createdAt !== 'number') acc.createdAt = now;
    if (typeof acc.lastSeenAt !== 'number') acc.lastSeenAt = acc.createdAt;
    if (typeof acc.totalTimeSeconds !== 'number') acc.totalTimeSeconds = 0;
    if (typeof acc.bonusTokens !== 'number') acc.bonusTokens = 0;
    if (typeof acc.totalTokensUsed !== 'number') acc.totalTokensUsed = 0;
    if (!acc.plan) acc.plan = 'free';
  }

  const migrated: any = {
    ...base,
    ...raw,
    schemaVersion: CURRENT_STORE_SCHEMA_VERSION,
    lastSavedAt: Math.max(0, Number(raw?.lastSavedAt) || now),
    saveCount: Math.max(0, Number(raw?.saveCount) || 0),
    users,
    sessions: raw?.sessions && typeof raw.sessions === 'object' ? { ...raw.sessions } : {},
    userData: raw?.userData && typeof raw.userData === 'object' ? { ...raw.userData } : {},
    teamChats: raw?.teamChats && typeof raw.teamChats === 'object' ? { ...raw.teamChats } : {},
    lokiTeams: raw?.lokiTeams && typeof raw.lokiTeams === 'object' ? { ...raw.lokiTeams } : {},
    sharedSnippets: Array.isArray(raw?.sharedSnippets) ? [...raw.sharedSnippets] : [],
    sharedConvLinks:
      raw?.sharedConvLinks && typeof raw.sharedConvLinks === 'object' ? { ...raw.sharedConvLinks } : {},
    notifications: Array.isArray(raw?.notifications) ? [...raw.notifications] : [],
    customCodes: raw?.customCodes && typeof raw.customCodes === 'object' ? { ...raw.customCodes } : {},
    auditLogs: Array.isArray(raw?.auditLogs) ? [...raw.auditLogs] : [],
    broadcastHistory: Array.isArray(raw?.broadcastHistory) ? [...raw.broadcastHistory] : [],
    scheduledBroadcasts: Array.isArray(raw?.scheduledBroadcasts) ? [...raw.scheduledBroadcasts] : [],
    platformConfig: {
      ...defaultPlatformConfig,
      ...(raw?.platformConfig && typeof raw.platformConfig === 'object' ? raw.platformConfig : {}),
    },
    communityEvents:
      raw?.communityEvents && typeof raw.communityEvents === 'object' ? { ...raw.communityEvents } : {},
    activeCommunityEventId:
      typeof raw?.activeCommunityEventId === 'string' ? raw.activeCommunityEventId : null,
  };

  if (prevVersion < CURRENT_STORE_SCHEMA_VERSION) {
    migrated.lastMigratedAt = now;
    migrated.migratedFromVersion = prevVersion;
  }

  return {
    store: migrated as T,
    migratedFromVersion: prevVersion < CURRENT_STORE_SCHEMA_VERSION ? prevVersion : null,
  };
}

export interface UserSyncedDataPayload {
  convs?: any[];
  deletedConvIds?: Record<string, number> | string[];
  settings?: Record<string, any>;
  settingsUpdatedAt?: number;
  lokicode?: any;
  codeHistory?: any[];
  updatedAt?: number;
}

export interface NormalizedUserSyncedData {
  convs: any[];
  deletedConvIds: Record<string, number>;
  settings: Record<string, any>;
  settingsUpdatedAt?: number;
  lokicode?: any;
  codeHistory?: any[];
  updatedAt: number;
}

function mergeMessageLists(existingMsgs: any[], incomingMsgs: any[]): any[] {
  const cleanExisting = Array.isArray(existingMsgs) ? existingMsgs.filter((m) => m && typeof m === 'object' && !m.pending) : [];
  const cleanIncoming = Array.isArray(incomingMsgs) ? incomingMsgs.filter((m) => m && typeof m === 'object' && !m.pending) : [];
  if (!cleanExisting.length) return cleanIncoming;
  if (!cleanIncoming.length) return cleanExisting;

  const seen = new Map<string, any>();
  const makeKey = (m: any, idx: number) => {
    if (m.id) return `id:${String(m.id)}`;
    const role = String(m.role || '');
    const ts = Number(m.ts || m.createdAt || 0);
    const snippet = String(m.text ?? m.content ?? '').slice(0, 80);
    return ts ? `rt:${role}:${ts}:${snippet}` : `rc:${idx}:${role}:${snippet}`;
  };

  cleanExisting.forEach((m, i) => {
    seen.set(makeKey(m, i), m);
  });
  cleanIncoming.forEach((m, i) => {
    const k = makeKey(m, i);
    const prev = seen.get(k);
    if (!prev) {
      seen.set(k, m);
    } else {
      const prevLen = String(prev.text ?? prev.content ?? '').length;
      const nextLen = String(m.text ?? m.content ?? '').length;
      if (nextLen >= prevLen) {
        seen.set(k, { ...prev, ...m });
      }
    }
  });

  const out = Array.from(seen.values());
  out.sort((a, b) => Number(a.ts || a.createdAt || 0) - Number(b.ts || b.createdAt || 0));
  return out;
}

function normalizeConvTimestamp(c: any): number {
  return Number(c?.updated || c?.updatedAt || c?.created || c?.createdAt || 0);
}

function mergeSingleConversation(existingConv: any, incomingConv: any): any {
  const curUpd = normalizeConvTimestamp(existingConv);
  const incUpd = normalizeConvTimestamp(incomingConv);
  const newerIsIncoming = incUpd >= curUpd;
  const base = newerIsIncoming ? { ...existingConv, ...incomingConv } : { ...incomingConv, ...existingConv };
  const mergedMessages = mergeMessageLists(existingConv.messages, incomingConv.messages);
  return {
    ...base,
    id: String(incomingConv.id || existingConv.id),
    title: newerIsIncoming
      ? incomingConv.title || existingConv.title || 'New chat'
      : existingConv.title || incomingConv.title || 'New chat',
    created: Math.min(
      Number(existingConv.created || existingConv.createdAt || incUpd || Date.now()),
      Number(incomingConv.created || incomingConv.createdAt || curUpd || Date.now())
    ),
    updated: Math.max(curUpd, incUpd),
    messages: mergedMessages,
  };
}

export function mergeConversationLists(
  existingConvs: any[],
  incomingConvs: any[],
  deletedTombstones: Record<string, number> = {}
): { merged: any[]; added: number } {
  const map = new Map<string, any>();
  for (const c of Array.isArray(existingConvs) ? existingConvs : []) {
    if (c && typeof c === 'object') {
      const k = String(c.id || `idx_${map.size}`);
      map.set(k, c);
    }
  }
  let added = 0;
  for (const c of Array.isArray(incomingConvs) ? incomingConvs : []) {
    if (!c || typeof c !== 'object') continue;
    const k = String(c.id || `imp_${map.size}`);
    const delAt = Number(deletedTombstones[k] || 0);
    const cUpd = normalizeConvTimestamp(c);
    if (delAt > 0 && delAt >= cUpd) {
      map.delete(k);
      continue;
    }
    const cur = map.get(k);
    if (!cur) {
      map.set(k, c);
      added++;
    } else {
      map.set(k, mergeSingleConversation(cur, c));
    }
  }
  // Enforce tombstones on remaining existing items as well
  for (const [k, c] of map.entries()) {
    const delAt = Number(deletedTombstones[k] || 0);
    if (delAt > 0 && delAt >= normalizeConvTimestamp(c)) {
      map.delete(k);
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => normalizeConvTimestamp(b) - normalizeConvTimestamp(a));
  return { merged, added };
}

function normalizeTombstones(
  existing: Record<string, number> | string[] | undefined,
  incoming: Record<string, number> | string[] | undefined,
  now: number
): Record<string, number> {
  const out: Record<string, number> = {};
  const ingest = (src: Record<string, number> | string[] | undefined, fallbackTs: number) => {
    if (!src) return;
    if (Array.isArray(src)) {
      for (const id of src) {
        const clean = String(id || '').trim();
        if (clean) out[clean] = Math.max(out[clean] || 0, fallbackTs);
      }
    } else if (typeof src === 'object') {
      for (const [id, ts] of Object.entries(src)) {
        const clean = String(id || '').trim();
        if (!clean) continue;
        const n = Number(ts) || fallbackTs;
        out[clean] = Math.max(out[clean] || 0, n);
      }
    }
  };
  ingest(existing, now - 1);
  ingest(incoming, now);

  // Keep most recent 300 tombstones cleanly
  const entries = Object.entries(out)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 300);
  const capped: Record<string, number> = {};
  for (const [k, v] of entries) capped[k] = v;
  return capped;
}

/**
 * Conflict-free, non-destructive user data merge used by /api/user/sync, WS user:sync,
 * and client IndexedDB reconciliation. Guarantees opening another tab or sending partial
 * updates NEVER wipes existing conversations, messages, codeHistory, or settings.
 */
export function mergeUserSyncedData(
  existingRaw: UserSyncedDataPayload | undefined | null,
  incomingRaw: UserSyncedDataPayload | undefined | null,
  now: number = Date.now(),
  maxConvs: number = 250
): { data: NormalizedUserSyncedData; addedConvs: number } {
  const existing = existingRaw && typeof existingRaw === 'object' ? existingRaw : {};
  const incoming = incomingRaw && typeof incomingRaw === 'object' ? incomingRaw : {};

  const deletedConvIds = normalizeTombstones(existing.deletedConvIds, incoming.deletedConvIds, now);
  const { merged: mergedConvs, added } = mergeConversationLists(
    Array.isArray(existing.convs) ? existing.convs : [],
    Array.isArray(incoming.convs) ? incoming.convs : [],
    deletedConvIds
  );

  const curHist = Array.isArray(existing.codeHistory) ? existing.codeHistory : [];
  const incHist = Array.isArray(incoming.codeHistory) ? incoming.codeHistory : [];
  const histMap = new Map<string, any>();
  for (const h of [...curHist, ...incHist]) {
    if (h && typeof h === 'object') {
      const hk = String(h.id || h.ts || `h_${histMap.size}`);
      histMap.set(hk, h);
    }
  }
  const mergedHistory = Array.from(histMap.values())
    .sort((a, b) => Number(b?.ts || 0) - Number(a?.ts || 0))
    .slice(0, 100);

  const curSettings = existing.settings && typeof existing.settings === 'object' ? existing.settings : {};
  const incSettings = incoming.settings && typeof incoming.settings === 'object' ? incoming.settings : {};
  const curSettingsTs = Number(existing.settingsUpdatedAt || existing.updatedAt || 0);
  const incSettingsTs = Number(incoming.settingsUpdatedAt || incoming.updatedAt || now);
  const mergedSettings =
    Object.keys(incSettings).length === 0
      ? { ...curSettings }
      : incSettingsTs >= curSettingsTs
      ? { ...curSettings, ...incSettings }
      : { ...incSettings, ...curSettings };

  let mergedLokicode = existing.lokicode;
  if (incoming.lokicode !== undefined) {
    const curLokiTs = Number((existing.lokicode as any)?.updatedAt || existing.updatedAt || 0);
    const incLokiTs = Number((incoming.lokicode as any)?.updatedAt || incoming.updatedAt || now);
    if (existing.lokicode === undefined || incLokiTs >= curLokiTs) {
      mergedLokicode = incoming.lokicode;
    }
  }

  return {
    data: {
      convs: mergedConvs.slice(0, maxConvs),
      deletedConvIds,
      settings: mergedSettings,
      settingsUpdatedAt: Math.max(curSettingsTs, Object.keys(incSettings).length ? incSettingsTs : 0) || now,
      lokicode: mergedLokicode,
      codeHistory: mergedHistory,
      updatedAt: Math.max(Number(existing.updatedAt || 0), Number(incoming.updatedAt || 0), now),
    },
    addedConvs: added,
  };
}

export type StoreWalKind =
  | 'user_upsert'
  | 'user_data_merge'
  | 'platform_config'
  | 'custom_code'
  | 'session_upsert'
  | 'session_delete';

export interface StoreWalEntry {
  seq: number;
  ts: number;
  kind: StoreWalKind;
  key?: string;
  payload?: any;
}

/**
 * Safely parses NDJSON lines from a Write-Ahead Log file, skipping any torn/truncated tail line.
 */
export function parseWalNdjson(rawWal: string, minTs: number = 0): StoreWalEntry[] {
  const out: StoreWalEntry[] = [];
  if (!rawWal || typeof rawWal !== 'string') return out;
  const lines = rawWal.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== 'object' || !parsed.kind) continue;
      const ts = Number(parsed.ts || 0);
      if (minTs > 0 && ts > 0 && ts < minTs) continue;
      out.push({
        seq: Number(parsed.seq || 0),
        ts: ts || Date.now(),
        kind: parsed.kind,
        key: parsed.key ? String(parsed.key) : undefined,
        payload: parsed.payload,
      });
    } catch {
      // Ignore partial/torn line at tail after unclean shutdown
    }
  }
  out.sort((a, b) => (a.ts !== b.ts ? a.ts - b.ts : a.seq - b.seq));
  return out;
}

/**
 * Replays WAL journal entries idempotently on top of a loaded store snapshot so
 * mutations recorded right before a crash or unclean termination are never lost.
 */
export function replayWalEntriesOnStore<T extends Record<string, any>>(
  targetStore: T,
  entries: StoreWalEntry[],
  defaultPlatformConfig: Record<string, any>
): { applied: number; latestWalTs: number } {
  let applied = 0;
  let latestWalTs = 0;
  if (!Array.isArray(entries) || !entries.length) return { applied, latestWalTs };
  if (!targetStore.users) (targetStore as any).users = {};
  if (!targetStore.userData) (targetStore as any).userData = {};
  if (!targetStore.sessions) (targetStore as any).sessions = {};
  if (!targetStore.customCodes) (targetStore as any).customCodes = {};

  for (const entry of entries) {
    if (entry.ts > latestWalTs) latestWalTs = entry.ts;
    if (entry.kind === 'user_upsert' && entry.key && entry.payload && typeof entry.payload === 'object') {
      const existing = targetStore.users[entry.key];
      if (!existing) {
        targetStore.users[entry.key] = { ...entry.payload };
      } else {
        targetStore.users[entry.key] = {
          ...existing,
          ...entry.payload,
          usedGiftCodes: Array.from(
            new Set([...(existing.usedGiftCodes || []), ...(entry.payload.usedGiftCodes || [])])
          ),
          totalTokensUsed: Math.max(
            Number(existing.totalTokensUsed || 0),
            Number(entry.payload.totalTokensUsed || 0)
          ),
          totalTimeSeconds: Math.max(
            Number(existing.totalTimeSeconds || 0),
            Number(entry.payload.totalTimeSeconds || 0)
          ),
        };
      }
      applied++;
    } else if (entry.kind === 'user_data_merge' && entry.key && entry.payload) {
      const merged = mergeUserSyncedData(targetStore.userData[entry.key], entry.payload, entry.ts);
      targetStore.userData[entry.key] = merged.data;
      applied++;
    } else if (entry.kind === 'platform_config' && entry.payload && typeof entry.payload === 'object') {
      (targetStore as any).platformConfig = {
        ...defaultPlatformConfig,
        ...(targetStore.platformConfig || {}),
        ...entry.payload,
      };
      applied++;
    } else if (entry.kind === 'custom_code' && entry.key && entry.payload) {
      targetStore.customCodes[entry.key] = entry.payload;
      applied++;
    } else if (entry.kind === 'session_upsert' && entry.key && entry.payload) {
      targetStore.sessions[entry.key] = entry.payload;
      applied++;
    } else if (entry.kind === 'session_delete' && entry.key) {
      delete targetStore.sessions[entry.key];
      applied++;
    }
  }
  return { applied, latestWalTs };
}

/**
 * Merges or replaces store contents from an imported backup or Cloud Vault snapshot.
 * Preserves existing admin session tokens so an admin performing a restore stays logged in.
 */
export function mergeStoreSnapshots<T extends Record<string, any>>(
  current: T,
  incomingRaw: Record<string, any>,
  mode: 'merge' | 'replace',
  emptyFactory: () => T,
  defaultPlatformConfig: Record<string, any>,
  now: number = Date.now()
): { store: T; summary: StoreMergeSummary } {
  const { store: normalizedIncoming } = migrateStoreNonDestructively(
    incomingRaw,
    emptyFactory,
    defaultPlatformConfig,
    now
  );

  if (mode === 'replace') {
    const mergedSessions = {
      ...(current.sessions || {}),
      ...(normalizedIncoming.sessions || {}),
    };
    const nextStore: any = {
      ...normalizedIncoming,
      sessions: mergedSessions,
      schemaVersion: CURRENT_STORE_SCHEMA_VERSION,
      lastSavedAt: now,
    };
    return {
      store: nextStore as T,
      summary: {
        mode: 'replace',
        usersAdded: Object.keys(nextStore.users || {}).length,
        usersUpdated: 0,
        convsMerged: countUserDataStats(nextStore.userData).convsCount,
        codesMerged: Object.keys(nextStore.customCodes || {}).length,
        eventsMerged: Object.keys(nextStore.communityEvents || {}).length,
        teamsMerged:
          Object.keys(nextStore.teamChats || {}).length + Object.keys(nextStore.lokiTeams || {}).length,
        totalUsersAfter: Object.keys(nextStore.users || {}).length,
      },
    };
  }

  // Non-destructive MERGE mode: never delete existing accounts, conversations, or promo codes
  const mergedUsers: Record<string, any> = { ...(current.users || {}) };
  const idByUsernameLower = new Map<string, string>();
  for (const [id, u] of Object.entries(mergedUsers)) {
    const lower = String((u as any)?.usernameLower || (u as any)?.username || '').toLowerCase();
    if (lower) idByUsernameLower.set(lower, id);
  }

  let usersAdded = 0;
  let usersUpdated = 0;
  const incomingIdToTargetId = new Map<string, string>();

  for (const [incId, incUser] of Object.entries(normalizedIncoming.users || {})) {
    if (!incUser || typeof incUser !== 'object') continue;
    const lower = String((incUser as any).usernameLower || (incUser as any).username || '').toLowerCase();
    const existingId = mergedUsers[incId] ? incId : lower ? idByUsernameLower.get(lower) : undefined;
    if (!existingId) {
      mergedUsers[incId] = incUser;
      if (lower) idByUsernameLower.set(lower, incId);
      incomingIdToTargetId.set(incId, incId);
      usersAdded++;
    } else {
      incomingIdToTargetId.set(incId, existingId);
      const curU = mergedUsers[existingId];
      // Merge beneficial progression cleanly without regressing tokens/stats
      const incUsage = Number((incUser as any).totalTokensUsed || 0) + Number((incUser as any).totalTimeSeconds || 0);
      const curUsage = Number(curU.totalTokensUsed || 0) + Number(curU.totalTimeSeconds || 0);
      if (incUsage > curUsage) {
        mergedUsers[existingId] = {
          ...curU,
          totalTokensUsed: Math.max(Number(curU.totalTokensUsed || 0), Number((incUser as any).totalTokensUsed || 0)),
          totalTimeSeconds: Math.max(Number(curU.totalTimeSeconds || 0), Number((incUser as any).totalTimeSeconds || 0)),
          usedGiftCodes: Array.from(
            new Set([...(curU.usedGiftCodes || []), ...((incUser as any).usedGiftCodes || [])])
          ),
        };
        usersUpdated++;
      }
    }
  }

  const mergedUserData: Record<string, any> = { ...(current.userData || {}) };
  let convsMerged = 0;
  for (const [incUid, incData] of Object.entries(normalizedIncoming.userData || {})) {
    if (!incData || typeof incData !== 'object') continue;
    const targetUid = incomingIdToTargetId.get(incUid) || incUid;
    const existingData = mergedUserData[targetUid] || { convs: [], settings: {}, updatedAt: 0 };
    const mergedRes = mergeUserSyncedData(existingData, incData as any, now);
    convsMerged += mergedRes.addedConvs;
    mergedUserData[targetUid] = mergedRes.data;
  }

  const mergedCodes = { ...(normalizedIncoming.customCodes || {}), ...(current.customCodes || {}) };
  const mergedEvents = { ...(normalizedIncoming.communityEvents || {}), ...(current.communityEvents || {}) };
  const mergedTeamChats = { ...(normalizedIncoming.teamChats || {}), ...(current.teamChats || {}) };
  const mergedLokiTeams = { ...(normalizedIncoming.lokiTeams || {}), ...(current.lokiTeams || {}) };

  const snipMap = new Map<string, any>();
  for (const s of [...(current.sharedSnippets || []), ...(normalizedIncoming.sharedSnippets || [])]) {
    if (s && s.id && !snipMap.has(s.id)) snipMap.set(s.id, s);
  }

  const notifMap = new Map<string, any>();
  for (const n of [...(current.notifications || []), ...(normalizedIncoming.notifications || [])]) {
    if (n && n.id && !notifMap.has(n.id)) notifMap.set(n.id, n);
  }

  const nextStore: any = {
    ...current,
    schemaVersion: CURRENT_STORE_SCHEMA_VERSION,
    lastSavedAt: now,
    users: mergedUsers,
    sessions: { ...(normalizedIncoming.sessions || {}), ...(current.sessions || {}) },
    userData: mergedUserData,
    teamChats: mergedTeamChats,
    lokiTeams: mergedLokiTeams,
    sharedSnippets: Array.from(snipMap.values()),
    sharedConvLinks: { ...(normalizedIncoming.sharedConvLinks || {}), ...(current.sharedConvLinks || {}) },
    notifications: Array.from(notifMap.values()),
    customCodes: mergedCodes,
    communityEvents: mergedEvents,
    activeCommunityEventId: current.activeCommunityEventId || normalizedIncoming.activeCommunityEventId || null,
  };

  return {
    store: nextStore as T,
    summary: {
      mode: 'merge',
      usersAdded,
      usersUpdated,
      convsMerged,
      codesMerged: Object.keys(normalizedIncoming.customCodes || {}).length,
      eventsMerged: Object.keys(normalizedIncoming.communityEvents || {}).length,
      teamsMerged:
        Object.keys(normalizedIncoming.teamChats || {}).length +
        Object.keys(normalizedIncoming.lokiTeams || {}).length,
      totalUsersAfter: Object.keys(mergedUsers).length,
    },
  };
}
