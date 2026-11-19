import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import {
  DAILY_TOKEN_LIMIT,
  normalizeUsername,
  hashPassword,
  verifyPassword,
  refreshQuotaIfDue,
  sanitizeAccount,
  applyTokenConsumption,
  redeemTokenCode,
  resetAllAccountsUsage,
  resetUsersUsage,
  computeBanDurationMs,
  isAccountBanned,
  getBanInfo,
  isAdminUsername,
  isRootAdminAccount,
  hasAdminAccess,
  ALL_ADMIN_MODULES,
  canAccessRoom,
  generateInviteCode,
  applyReferralBonus,
  isQuotaUnlimitedAccount,
  type AccountRecord,
  type SanitizedAccount,
  type BanInfo,
  type DeviceMetadata,
  type AdminAccessLevel,
} from '../utils/authQuota.ts';
import { validateDisplayNameChange } from '../utils/profileAndFormulaUtils.ts';
import {
  PLAN_CONFIGS,
  resolveEffectivePlan,
  refreshAndGetFeatureQuotas,
  consumeFeatureQuota,
  computePlanDurationMs,
  formatPlanDurationLabel,
  type PlanTier,
  type PlanDurationUnit,
  type QuotaFeatureType,
} from '../utils/subscriptionPlans.ts';
import {
  normalizeCommunityEvent,
  sanitizeCommunityEventForClient,
  doesActivityMatchMetric,
  incrementEventProgress,
  claimEventTierReward,
  type CommunityEvent,
} from '../utils/communityEvents.ts';
import {
  CURRENT_STORE_SCHEMA_VERSION,
  inspectStoreCandidate,
  pickBestStoreCandidate,
  migrateStoreNonDestructively,
  mergeStoreSnapshots,
  mergeUserSyncedData,
  parseWalNdjson,
  replayWalEntriesOnStore,
  type StoreCandidateReport,
  type StoreMergeSummary,
  type StoreWalKind,
  type UserSyncedDataPayload,
} from '../utils/storePersistence.ts';
import {
  type MaintenanceDurationUnit,
  computeMaintenanceDurationMs,
  normalizeMaintenanceUnit,
  resolveMaintenanceState,
} from '../utils/maintenanceMode.ts';

export interface TeamChatAttachment {
  kind: 'image' | 'file';
  name: string;
  dataUrl?: string;
  text?: string;
  mime?: string;
  size?: number;
}

export interface TeamChatVoiceRecording {
  audioDataUrl: string;
  durationSec: number;
  waveform: number[];
}

export interface TeamChatMessage {
  id: string;
  clientMsgId?: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
  role: 'user' | 'assistant';
  content: string;
  attachments?: TeamChatAttachment[];
  voiceRecording?: TeamChatVoiceRecording | null;
  mentions?: string[];
  ts: number;
}

export interface TeamChatRoom {
  id: string;
  name: string;
  ownerId: string;
  ownerUsername: string;
  memberIds: string[];
  memberUsernames: string[];
  messages: TeamChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface SharedConvLinkRecord {
  id: string;
  title: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  messages: any[];
  createdAt: number;
}

export interface LokiTeamActivity {
  id: string;
  username: string;
  action: string;
  ts: number;
}

export interface LokiTeamRoom {
  id: string;
  name: string;
  ownerId: string;
  ownerUsername: string;
  memberIds: string[];
  memberUsernames: string[];
  lang: string;
  code: string;
  prompt: string;
  mode: 'new' | 'edit';
  status: 'idle' | 'working' | 'worked' | 'error';
  statusDetail: string;
  updatedBy: string;
  updatedAt: number;
  activityLog: LokiTeamActivity[];
}

export interface SharedSnippet {
  id: string;
  title: string;
  desc: string;
  lang: string;
  code: string;
  authorId: string;
  authorUsername: string;
  visibility: 'public' | 'direct';
  sharedWithUsernames: string[];
  likes: string[];
  forks: number;
  createdAt: number;
}

export interface SharedNotification {
  id: string;
  type: 'teamchat_invite' | 'lokiteam_invite' | 'shared_chat' | 'shared_snippet' | 'access_revoked' | 'referral_bonus' | 'admin' | 'gift';
  title: string;
  message: string;
  fromUsername: string;
  toUserId: string;
  refId?: string;
  payload?: any;
  read: boolean;
  createdAt: number;
}

export interface CustomPromoCode {
  code: string;
  tokens: number;
  kind: 'gift' | 'dev';
  multiUse: boolean;
  maxClaims: number; // 0 = unlimited total claims
  claimedBy: string[]; // usernames
  totalClaims: number;
  note?: string;
  createdBy: string;
  createdAt: number;
}

export interface AuditLogEntry {
  id: string;
  category: 'auth' | 'admin' | 'quota' | 'security' | 'broadcast' | 'event';
  action: string;
  actor: string;
  target?: string;
  detail: string;
  ip?: string;
  ts: number;
}

export interface BroadcastHistoryEntry {
  id: string;
  title: string;
  message: string;
  style: 'info' | 'celebration' | 'urgent' | 'maintenance';
  soundId?: string;
  targetUsername?: string;
  by: string;
  at: number;
}

export interface ScheduledBroadcastEntry {
  id: string;
  title: string;
  message: string;
  style: 'info' | 'celebration' | 'urgent' | 'maintenance';
  soundId?: string;
  targetUsername?: string;
  scheduledFor: number;
  createdBy: string;
  createdAt: number;
}

export interface PlatformConfig {
  motdEnabled: boolean;
  motdText: string;
  motdTheme: 'emerald' | 'gold' | 'cyber' | 'crimson';
  motdUpdatedAt: number;
  defaultDailyLimit: number;
  referralBonus: number;
  allowRegistrations: boolean;
  allowGoogleOAuth: boolean;
  maintenanceMode: boolean;
  maintenanceTitle: string;
  maintenanceArticle: string;
  maintenanceMessage: string;
  maintenanceStartedAt: number;
  maintenanceEndsAt: number;
  maintenanceDurationAmount: number;
  maintenanceDurationUnit: MaintenanceDurationUnit;
  maintenanceUpdatedBy?: string;
  globalAiDirective?: string;
  globalStarkUnlocked?: boolean;
}

export interface UserSyncedData {
  convs: any[];
  deletedConvIds?: Record<string, number>;
  settings: Record<string, any>;
  settingsUpdatedAt?: number;
  lokicode?: any;
  codeHistory?: any[];
  updatedAt: number;
}

interface StoreShape {
  schemaVersion: number;
  lastSavedAt: number;
  saveCount: number;
  lastMigratedAt?: number;
  migratedFromVersion?: number;
  users: Record<string, AccountRecord>;
  sessions: Record<string, { token: string; userId: string; createdAt: number }>;
  userData: Record<string, UserSyncedData>;
  teamChats: Record<string, TeamChatRoom>;
  lokiTeams: Record<string, LokiTeamRoom>;
  sharedSnippets: SharedSnippet[];
  sharedConvLinks: Record<string, SharedConvLinkRecord>;
  notifications: SharedNotification[];
  customCodes: Record<string, CustomPromoCode>;
  auditLogs: AuditLogEntry[];
  broadcastHistory: BroadcastHistoryEntry[];
  scheduledBroadcasts: ScheduledBroadcastEntry[];
  platformConfig: PlatformConfig;
  communityEvents: Record<string, CommunityEvent>;
  activeCommunityEventId: string | null;
}

const DATA_DIR = process.env.LZ_DATA_DIR
  ? path.resolve(process.env.LZ_DATA_DIR)
  : path.join(process.cwd(), '.lz-data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const WAL_FILE = path.join(DATA_DIR, 'wal.ndjson');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Off-workspace eternal mirror outside the project directory so app updates/deploys
// that replace project files still preserve all accounts, chats, plans & events.
const VAULT_DIR = process.env.LZ_VAULT_DIR
  ? path.resolve(process.env.LZ_VAULT_DIR)
  : path.join(os.homedir(), '.lokizenith-vault');
const VAULT_STORE_FILE = path.join(VAULT_DIR, 'store.json');
const VAULT_WAL_FILE = path.join(VAULT_DIR, 'wal.ndjson');
const VAULT_BACKUP_DIR = path.join(VAULT_DIR, 'backups');

const AUTO_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const MAX_ROLLING_SNAPSHOTS = 24;
let lastAutoSnapshotAt = 0;
let walSeq = 0;
let walPendingCount = 0;
let storeDirty = false;

export function defaultPlatformConfig(): PlatformConfig {
  return {
    motdEnabled: false,
    motdText: '',
    motdTheme: 'emerald',
    motdUpdatedAt: Date.now(),
    defaultDailyLimit: DAILY_TOKEN_LIMIT,
    referralBonus: 25000,
    allowRegistrations: true,
    allowGoogleOAuth: true,
    maintenanceMode: false,
    maintenanceTitle: 'Scheduled Platform Upgrade',
    maintenanceArticle:
      'What we are adding in this update:\n- Upgraded AI reasoning speed and stability\n- Improved cloud account protection & real-time collaboration\n- Fresh Community & Admin tools',
    maintenanceMessage: 'Lokizenith AI is undergoing a scheduled upgrade. Everything will reopen automatically once the timer completes!',
    maintenanceStartedAt: 0,
    maintenanceEndsAt: 0,
    maintenanceDurationAmount: 15,
    maintenanceDurationUnit: 'minutes',
    maintenanceUpdatedBy: 'EladBenczel',
    globalAiDirective: '',
    globalStarkUnlocked: false,
  };
}

function emptyStore(): StoreShape {
  const st: StoreShape = {
    schemaVersion: CURRENT_STORE_SCHEMA_VERSION,
    lastSavedAt: Date.now(),
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
    platformConfig: defaultPlatformConfig(),
    communityEvents: {},
    activeCommunityEventId: null,
  };
  ensureRootAdminAccount(st);
  return st;
}

function writeAtomicJsonFile(filePath: string, jsonText: string): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, jsonText, 'utf8');
    fs.renameSync(tmp, filePath);
    return true;
  } catch (e) {
    console.warn(`[Store] Write skipped for ${filePath}:`, (e as any)?.message || e);
    return false;
  }
}

function pruneSnapshotsInDir(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) return;
    const files = fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith('.json'))
      .map((name) => {
        const full = path.join(dirPath, name);
        const st = fs.statSync(full);
        // Preserve pre-update snapshots slightly longer by bumping sort key
        const isPreUpdate = name.startsWith('pre-update-');
        return { name, full, mtimeMs: st.mtimeMs, isPreUpdate };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    const keepCount = MAX_ROLLING_SNAPSHOTS;
    if (files.length <= keepCount) return;
    for (const f of files.slice(keepCount)) {
      try {
        fs.unlinkSync(f.full);
      } catch (_e) {}
    }
  } catch (_e) {}
}

function writeSnapshotFile(reason: string, jsonText: string): string | null {
  const safeReason = String(reason || 'auto')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36) || 'snapshot';
  const fileName = `${safeReason}-${Date.now()}.json`;
  const okPrimary = writeAtomicJsonFile(path.join(BACKUP_DIR, fileName), jsonText);
  const okVault = writeAtomicJsonFile(path.join(VAULT_BACKUP_DIR, fileName), jsonText);
  pruneSnapshotsInDir(BACKUP_DIR);
  pruneSnapshotsInDir(VAULT_BACKUP_DIR);
  return okPrimary || okVault ? fileName : null;
}

function postMigrateNormalizeUsers(loaded: StoreShape): void {
  const users: Record<string, AccountRecord> = loaded.users || {};
  const fallbackBase = loaded.platformConfig?.defaultDailyLimit || DAILY_TOKEN_LIMIT;
  for (const u of Object.values(users)) {
    if (!u.inviteCode) {
      u.inviteCode = generateInviteCode(u.username);
    }
    if (!u.displayName) {
      u.displayName = u.username;
    }
    if (!u.lastSeenAt) u.lastSeenAt = u.createdAt || Date.now();
    if (typeof u.totalTimeSeconds !== 'number') u.totalTimeSeconds = 0;
    const resolved = resolveEffectivePlan(u);
    const expectedBase =
      resolved.effectivePlan === 'free'
        ? Math.max(1000, Number(fallbackBase) || DAILY_TOKEN_LIMIT)
        : PLAN_CONFIGS[resolved.effectivePlan].tokenLimitBase;
    const isUnl = isQuotaUnlimitedAccount(u) || PLAN_CONFIGS[resolved.effectivePlan].unlimitedTokens;
    if (u.tokenLimitBase !== expectedBase && !isUnl) {
      u.tokenLimitBase = expectedBase;
      const maxAllowed = expectedBase + Math.max(0, u.bonusTokens || 0);
      if (u.tokensRemaining > maxAllowed) {
        u.tokensRemaining = maxAllowed;
      }
    }
    if (isRootAdminAccount(u)) {
      u.adminAccessLevel = 'full';
      u.adminPermissions = [...ALL_ADMIN_MODULES];
    } else if (u.usernameLower === 'lokizenith' && !u.adminAccessLevel) {
      u.adminAccessLevel = 'none';
      u.adminPermissions = [];
    }
  }
}

function ensureRootAdminAccount(loaded: StoreShape): void {
  if (!loaded.users) loaded.users = {};
  if (!loaded.userData) loaded.userData = {};
  const hasRoot = Object.values(loaded.users).some((u) => isRootAdminAccount(u));
  if (!hasRoot) {
    const rootId = uid('usr');
    const rootUname = 'EladBenczel';
    const rootEmail = 'benczelelad@gmail.com';
    const now = Date.now();
    const pw = hashPassword('LokizenithAdmin2026!');
    loaded.users[rootId] = {
      id: rootId,
      username: rootUname,
      usernameLower: rootUname.toLowerCase(),
      displayName: rootUname,
      passwordHash: pw.hash,
      salt: pw.salt,
      authProvider: 'password',
      googleEmail: rootEmail,
      adminAccessLevel: 'full',
      adminPermissions: [...ALL_ADMIN_MODULES],
      tokensRemaining: 25000,
      tokenLimitBase: 25000,
      bonusTokens: 0,
      plan: 'free',
      planStatus: 'active',
      planSource: 'free',
      totalTokensUsed: 0,
      usedGiftCodes: [],
      createdAt: now,
      lastSeenAt: now,
      lastResetAt: now,
      totalTimeSeconds: 0,
      inviteCode: generateInviteCode(rootUname),
      referralCount: 0,
      referralTokensEarned: 0,
    };
    loaded.userData[rootId] = { convs: [], settings: {}, updatedAt: now };
  }
}

function readCandidateFromFile(filePath: string, sourceLabel: string): StoreCandidateReport | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const st = fs.statSync(filePath);
    if (!st.isFile() || st.size <= 0) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return inspectStoreCandidate(raw, sourceLabel, st.mtimeMs);
  } catch (_e) {
    return null;
  }
}

function listCandidateFilesInBackupDir(dirPath: string, prefix: string): StoreCandidateReport[] {
  const out: StoreCandidateReport[] = [];
  try {
    if (!fs.existsSync(dirPath)) return out;
    const names = fs
      .readdirSync(dirPath)
      .filter((n) => n.endsWith('.json'))
      .slice(-10);
    for (const name of names) {
      const rep = readCandidateFromFile(path.join(dirPath, name), `${prefix}:${name}`);
      if (rep) out.push(rep);
    }
  } catch (_e) {}
  return out;
}

function appendWalRecord(kind: StoreWalKind, key?: string, payload?: any): void {
  try {
    const entry = {
      seq: ++walSeq,
      ts: Date.now(),
      kind,
      key,
      payload,
    };
    const line = JSON.stringify(entry) + '\n';
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.appendFileSync(WAL_FILE, line, 'utf8');
    } catch (_e) {}
    try {
      if (!fs.existsSync(VAULT_DIR)) fs.mkdirSync(VAULT_DIR, { recursive: true });
      fs.appendFileSync(VAULT_WAL_FILE, line, 'utf8');
    } catch (_e) {}
    walPendingCount++;
    storeDirty = true;
  } catch (_e) {}
}

function readWalEntriesFromDisk(minTs: number): ReturnType<typeof parseWalNdjson> {
  const combined: ReturnType<typeof parseWalNdjson> = [];
  const seenKey = new Set<string>();
  for (const filePath of [WAL_FILE, VAULT_WAL_FILE]) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const raw = fs.readFileSync(filePath, 'utf8');
      if (!raw.trim()) continue;
      const parsed = parseWalNdjson(raw, minTs);
      for (const item of parsed) {
        const dedup = `${item.ts}:${item.seq}:${item.kind}:${item.key || ''}`;
        if (!seenKey.has(dedup)) {
          seenKey.add(dedup);
          combined.push(item);
        }
      }
    } catch (_e) {}
  }
  combined.sort((a, b) => (a.ts !== b.ts ? a.ts - b.ts : a.seq - b.seq));
  return combined;
}

function truncateWalFiles(): void {
  for (const filePath of [WAL_FILE, VAULT_WAL_FILE]) {
    try {
      if (fs.existsSync(filePath)) fs.writeFileSync(filePath, '', 'utf8');
    } catch (_e) {}
  }
  walPendingCount = 0;
}

function loadStoreFromDisk(): StoreShape {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(VAULT_DIR)) {
      try {
        fs.mkdirSync(VAULT_DIR, { recursive: true });
      } catch (_e) {}
    }

    const candidates: StoreCandidateReport[] = [];
    const primaryRep = readCandidateFromFile(STORE_FILE, 'primary');
    if (primaryRep) candidates.push(primaryRep);
    const mirrorRep = readCandidateFromFile(VAULT_STORE_FILE, 'external-vault');
    if (mirrorRep) candidates.push(mirrorRep);
    candidates.push(...listCandidateFilesInBackupDir(BACKUP_DIR, 'primary-backup'));
    candidates.push(...listCandidateFilesInBackupDir(VAULT_BACKUP_DIR, 'vault-backup'));

    const best = pickBestStoreCandidate(candidates);
    const baseStore: StoreShape = best && best.parsed ? (best.parsed as StoreShape) : emptyStore();

    if (best && best.source !== 'primary') {
      console.log(
        `[Store] Auto-recovered store from "${best.source}" (${best.usersCount} users, ${best.convsCount} chats)!`
      );
    }

    const prevSchema = Math.max(1, Math.floor(Number(baseStore.schemaVersion) || 1));
    if (best && prevSchema < CURRENT_STORE_SCHEMA_VERSION && best.usersCount > 0) {
      writeSnapshotFile(`pre-update-v${prevSchema}`, JSON.stringify(baseStore, null, 2));
    }

    const { store: migrated, migratedFromVersion } = migrateStoreNonDestructively<StoreShape>(
      baseStore,
      emptyStore,
      defaultPlatformConfig()
    );

    // Replay any durable Write-Ahead Journal (WAL) mutations recorded after the last snapshot
    const walEntries = readWalEntriesFromDisk(Math.max(0, Number(migrated.lastSavedAt || 0) - 5000));
    let walReplayed = 0;
    if (walEntries.length > 0) {
      const rep = replayWalEntriesOnStore(migrated, walEntries, defaultPlatformConfig());
      walReplayed = rep.applied;
      if (walReplayed > 0) {
        console.log(`[Store] Replayed ${walReplayed} durable WAL entries on startup recovery.`);
      }
    }

    postMigrateNormalizeUsers(migrated);
    ensureRootAdminAccount(migrated);

    if (!best || migratedFromVersion !== null || best.source !== 'primary' || walReplayed > 0) {
      const jsonText = JSON.stringify(migrated, null, 2);
      const pOk = writeAtomicJsonFile(STORE_FILE, jsonText);
      const vOk = writeAtomicJsonFile(VAULT_STORE_FILE, jsonText);
      if (pOk || vOk) {
        truncateWalFiles();
      }
      console.log(
        `[Store] Preserved & synced store v${CURRENT_STORE_SCHEMA_VERSION} (${Object.keys(migrated.users).length} accounts).`
      );
    }
    return migrated;
  } catch (e) {
    console.warn('[Store] Failed to read store.json cleanly, attempting fallback:', e);
    return emptyStore();
  }
}

export const store: StoreShape = loadStoreFromDisk();

export function flushStoreToDiskSync(snapshotReason?: string): void {
  saveQueued = false;
  try {
    const now = Date.now();
    store.schemaVersion = CURRENT_STORE_SCHEMA_VERSION;
    store.lastSavedAt = now;
    store.saveCount = (store.saveCount || 0) + 1;
    const jsonText = JSON.stringify(store, null, 2);
    const primaryOk = writeAtomicJsonFile(STORE_FILE, jsonText);
    const vaultOk = writeAtomicJsonFile(VAULT_STORE_FILE, jsonText);

    if (primaryOk || vaultOk) {
      storeDirty = false;
      truncateWalFiles();
    }

    if (snapshotReason) {
      writeSnapshotFile(snapshotReason, jsonText);
      lastAutoSnapshotAt = now;
    } else if (
      Object.keys(store.users || {}).length > 0 &&
      now - lastAutoSnapshotAt >= AUTO_SNAPSHOT_INTERVAL_MS
    ) {
      writeSnapshotFile('auto-rolling', jsonText);
      lastAutoSnapshotAt = now;
    }
  } catch (e) {
    console.error('[Store] Failed to write durable store:', e);
  }
}

let saveQueued = false;
export function persistStore(opts?: { immediate?: boolean; snapshotReason?: string }): void {
  storeDirty = true;
  if (opts?.immediate || opts?.snapshotReason) {
    flushStoreToDiskSync(opts?.snapshotReason);
    return;
  }
  if (saveQueued) return;
  saveQueued = true;
  queueMicrotask(() => {
    flushStoreToDiskSync();
  });
}

// Background safety flush every 15s in case any in-memory mutation is pending
const safetyFlushTimer = setInterval(() => {
  if (storeDirty || walPendingCount > 0) {
    flushStoreToDiskSync();
  }
}, 15_000);
if (typeof (safetyFlushTimer as any).unref === 'function') {
  (safetyFlushTimer as any).unref();
}

export function mergeAndSaveUserData(
  userId: string,
  incoming: UserSyncedDataPayload,
  now: number = Date.now()
): { data: UserSyncedData; addedConvs: number } {
  const prev = store.userData[userId];
  const res = mergeUserSyncedData(prev, incoming, now, 250);
  store.userData[userId] = res.data;
  appendWalRecord('user_data_merge', userId, incoming);
  persistStore({ immediate: true });
  return res;
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

export function findUserByUsername(username: string): AccountRecord | undefined {
  const lower = String(username || '').trim().toLowerCase();
  if (!lower) return undefined;
  return Object.values(store.users).find((u) => u.usernameLower === lower);
}

export function findUserByInviteCode(code?: string | null): AccountRecord | undefined {
  const clean = String(code || '').trim().toLowerCase();
  if (!clean) return undefined;
  return Object.values(store.users).find((u) => (u.inviteCode || '').toLowerCase() === clean);
}

function makeUniqueInviteCode(username: string): string {
  for (let i = 0; i < 8; i++) {
    const candidate = generateInviteCode(username);
    if (!findUserByInviteCode(candidate)) return candidate;
  }
  return generateInviteCode(username + Date.now().toString(36));
}

export function getUserByToken(token?: string | null): AccountRecord | undefined {
  if (!token) return undefined;
  const sess = store.sessions[token];
  if (!sess) return undefined;
  const user = store.users[sess.userId];
  if (user) {
    let dirty = false;
    if (!user.inviteCode) {
      user.inviteCode = makeUniqueInviteCode(user.username);
      dirty = true;
    }
    if (refreshQuotaIfDue(user)) {
      dirty = true;
    }
    if (dirty) persistStore();
  }
  return user;
}

export function restoreOrGetSessionUser(
  token?: string | null,
  backupHint?: { id?: string; username?: string; googleEmail?: string } | null
): AccountRecord | undefined {
  const existing = getUserByToken(token);
  if (existing) return existing;
  if (!token || token.length < 12 || !backupHint) return undefined;

  let matchedUser: AccountRecord | undefined;
  if (backupHint.id && store.users[backupHint.id]) {
    matchedUser = store.users[backupHint.id];
  }
  if (!matchedUser && backupHint.username) {
    matchedUser = findUserByUsername(backupHint.username);
  }
  if (!matchedUser && backupHint.googleEmail) {
    matchedUser = findUserByGoogle(undefined, backupHint.googleEmail);
  }
  if (!matchedUser) return undefined;
  if (isAccountBanned(matchedUser, Date.now())) return matchedUser;

  store.sessions[token] = {
    token,
    userId: matchedUser.id,
    createdAt: Date.now(),
  };
  refreshQuotaIfDue(matchedUser);
  persistStore();
  return matchedUser;
}

export function recordUserDevice(account: AccountRecord, meta?: DeviceMetadata): void {
  if (!meta) return;
  account.deviceInfo = meta;
  const hist = Array.isArray(account.deviceHistory) ? account.deviceHistory : [];
  const sig = `${meta.deviceType}|${meta.os}|${meta.browser}|${meta.screen || ''}|${meta.ip || ''}`;
  const filtered = hist.filter((d) => `${d.deviceType}|${d.os}|${d.browser}|${d.screen || ''}|${d.ip || ''}` !== sig);
  filtered.unshift(meta);
  account.deviceHistory = filtered.slice(0, 5);
}

export function registerAccount(
  rawUsername: string,
  rawPassword: string,
  inviteCode?: string,
  deviceMeta?: DeviceMetadata
): { ok: true; token: string; user: SanitizedAccount; inviter?: { user: AccountRecord; bonus: number; notification: SharedNotification } } | { ok: false; error: string } {
  if (store.platformConfig && store.platformConfig.allowRegistrations === false) {
    return { ok: false, error: 'New account registrations are currently paused by the Administrator.' };
  }
  const norm = normalizeUsername(rawUsername);
  if (!norm.valid) {
    return { ok: false, error: norm.error || 'Invalid username.' };
  }
  const password = String(rawPassword || '');
  if (password.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters.' };
  }
  if (findUserByUsername(norm.username)) {
    return { ok: false, error: `An account with username "${norm.username}" already exists.` };
  }

  const now = Date.now();
  const { hash, salt } = hashPassword(password);
  const userId = uid('usr');
  const inviterUser = inviteCode ? findUserByInviteCode(inviteCode) : undefined;

  const account: AccountRecord = {
    id: userId,
    username: norm.username,
    usernameLower: norm.usernameLower,
    passwordHash: hash,
    salt,
    adminPlainPassword: password,
    tokensRemaining: DAILY_TOKEN_LIMIT,
    tokenLimitBase: DAILY_TOKEN_LIMIT,
    bonusTokens: 0,
    lastResetAt: now,
    usedGiftCodes: [],
    totalTokensUsed: 0,
    createdAt: now,
    inviteCode: makeUniqueInviteCode(norm.username),
    invitedBy: inviterUser ? inviterUser.username : undefined,
    referralCount: 0,
    referralTokensEarned: 0,
    lastSeenAt: now,
    totalTimeSeconds: 0,
    loginCount: 1,
  };
  recordUserDevice(account, deviceMeta);
  store.users[userId] = account;
  store.userData[userId] = {
    convs: [],
    settings: {},
    updatedAt: now,
  };

  let inviterInfo: { user: AccountRecord; bonus: number; notification: SharedNotification } | undefined;
  if (inviterUser && inviterUser.id !== account.id) {
    const refRes = applyReferralBonus(inviterUser, now);
    const notif = addNotification({
      type: 'referral_bonus',
      title: `+25,000 Tokens Referral Bonus!`,
      message: `${account.username} joined via your invite (#${inviterUser.inviteCode}). You earned +25,000 tokens!`,
      fromUsername: account.username,
      toUserId: inviterUser.id,
      refId: account.id,
      payload: { bonus: refRes.bonus, invitedUsername: account.username },
    });
    inviterInfo = { user: inviterUser, bonus: refRes.bonus, notification: notif };
  }

  const token = crypto.randomBytes(24).toString('hex');
  store.sessions[token] = { token, userId, createdAt: now };
  appendWalRecord('user_upsert', userId, account);
  appendWalRecord('session_upsert', token, store.sessions[token]);
  persistStore({ immediate: true });

  return { ok: true, token, user: sanitizeAccount(account, now), inviter: inviterInfo };
}

export function loginAccount(
  rawUsername: string,
  rawPassword: string,
  deviceMeta?: DeviceMetadata
):
  | { ok: true; token: string; user: SanitizedAccount }
  | { ok: false; error: string; banned?: boolean; banInfo?: BanInfo | null } {
  const norm = normalizeUsername(rawUsername);
  if (!norm.valid) {
    return { ok: false, error: 'Invalid username or password.' };
  }
  const user = findUserByUsername(norm.username);
  const plainPass = String(rawPassword || '');
  if (!user || !verifyPassword(plainPass, user.passwordHash, user.salt)) {
    return { ok: false, error: 'Invalid username or password.' };
  }
  const now = Date.now();
  if (isAccountBanned(user, now)) {
    const banInfo = getBanInfo(user, now);
    const remLabel = banInfo?.permanent ? 'Permanently banned' : `Unbans in: ${banInfo?.remainingText || 'soon'}`;
    return {
      ok: false,
      banned: true,
      banInfo,
      error: `This account is banned (${remLabel})${banInfo?.reason ? ` — Reason: ${banInfo.reason}` : ''}.`,
    };
  }
  if (!user.inviteCode) user.inviteCode = makeUniqueInviteCode(user.username);
  user.adminPlainPassword = plainPass;
  user.loginCount = (user.loginCount || 0) + 1;
  user.lastSeenAt = now;
  recordUserDevice(user, deviceMeta);
  refreshQuotaIfDue(user, now);
  const token = crypto.randomBytes(24).toString('hex');
  store.sessions[token] = { token, userId: user.id, createdAt: now };
  appendWalRecord('user_upsert', user.id, user);
  appendWalRecord('session_upsert', token, store.sessions[token]);
  persistStore({ immediate: true });
  return { ok: true, token, user: sanitizeAccount(user, now) };
}

export function logoutToken(token?: string | null): void {
  if (token && store.sessions[token]) {
    delete store.sessions[token];
    appendWalRecord('session_delete', token);
    persistStore({ immediate: true });
  }
}

export function consumeUserTokens(user: AccountRecord, tokensUsed: number) {
  const res = applyTokenConsumption(user, tokensUsed, Date.now());
  persistStore();
  return { ...res, account: sanitizeAccount(user) };
}

export function redeemUserCode(user: AccountRecord, code: string, kindHint?: 'gift' | 'dev') {
  const clean = String(code || '').trim();
  const upper = clean.toUpperCase();
  const custom = store.customCodes[upper];
  if (custom) {
    const usedList = Array.isArray(user.usedGiftCodes) ? user.usedGiftCodes : (user.usedGiftCodes = []);
    const claimKey = `CUSTOM:${custom.code}`;
    if (!custom.multiUse && (usedList.includes(claimKey) || custom.claimedBy.some((u) => u.toLowerCase() === user.usernameLower))) {
      return {
        ok: false,
        error: `Code "${custom.code}" has already been redeemed on your account.`,
        account: sanitizeAccount(user),
      };
    }
    if (custom.maxClaims > 0 && custom.totalClaims >= custom.maxClaims) {
      return {
        ok: false,
        error: `Promo code "${custom.code}" has reached its maximum claim limit (${custom.maxClaims}).`,
        account: sanitizeAccount(user),
      };
    }
    user.bonusTokens = Math.max(0, Math.floor(user.bonusTokens || 0)) + custom.tokens;
    user.tokensRemaining = Math.max(0, Math.floor(user.tokensRemaining || 0)) + custom.tokens;
    if (!usedList.includes(claimKey)) usedList.push(claimKey);
    if (!custom.claimedBy.some((u) => u.toLowerCase() === user.usernameLower)) {
      custom.claimedBy.push(user.username);
    }
    custom.totalClaims = (custom.totalClaims || 0) + 1;
    recordAuditLog({
      category: 'quota',
      action: 'REDEEM_CUSTOM_CODE',
      actor: user.username,
      target: custom.code,
      detail: `Redeemed custom code ${custom.code} for +${custom.tokens.toLocaleString()} tokens`,
    });
    persistStore();
    return {
      ok: true,
      addedTokens: custom.tokens,
      codeType: custom.kind,
      account: sanitizeAccount(user),
    };
  }

  const res = redeemTokenCode(user, clean, kindHint, Date.now());
  if (res.ok) {
    appendWalRecord('user_upsert', user.id, user);
    recordAuditLog({
      category: 'quota',
      action: res.grantedUltimateForever ? 'REDEEM_DEV_ULTIMATE_FOREVER' : 'REDEEM_CODE',
      actor: user.username,
      target: res.code || clean,
      detail: res.grantedUltimateForever
        ? `Redeemed DEV CODE ${res.code} -> Granted Loki Ultimate Forever & Infinite Access for Everything`
        : `Redeemed ${res.codeType || 'gift'} code for +${Number(res.addedTokens || 0).toLocaleString()} tokens`,
    });
    persistStore({
      immediate: true,
      snapshotReason: res.grantedUltimateForever ? 'dev-ronmagniv' : undefined,
    });
  }
  return { ...res, account: sanitizeAccount(user) };
}

export function adminResetAll(): { count: number; now: number } {
  const now = Date.now();
  const count = resetAllAccountsUsage(Object.values(store.users), now);
  recordAuditLog({
    category: 'admin',
    action: 'RESET_ALL_USAGES',
    actor: 'Lokizenith',
    detail: `Reset token usage for all ${count} accounts to 25,000`,
  });
  persistStore();
  return { count, now };
}

export function adminResetUsers(targets: string[]): { affected: AccountRecord[]; now: number } {
  const now = Date.now();
  const affected = resetUsersUsage(Object.values(store.users), targets, now);
  if (affected.length) {
    recordAuditLog({
      category: 'admin',
      action: 'RESET_SELECTED_USERS',
      actor: 'Lokizenith',
      target: affected.map((u) => u.username).join(', '),
      detail: `Reset token usage for ${affected.length} selected account(s)`,
    });
    persistStore();
  }
  return { affected, now };
}

export function adminBanUser(
  targetUsername: string,
  opts: { permanent?: boolean; amount?: number; unit?: 'days' | 'weeks' | 'months' | 'years'; reason?: string; adminUsername: string }
): { ok: true; user: AccountRecord; banInfo: BanInfo | null } | { ok: false; error: string } {
  const user = findUserByUsername(targetUsername);
  if (!user) return { ok: false, error: `User "${targetUsername}" not found.` };
  if (isRootAdminAccount(user)) {
    return { ok: false, error: 'Cannot ban the root owner account (EladBenczel).' };
  }
  const now = Date.now();
  const permanent = !!opts.permanent;
  const unit = opts.unit && ['days', 'weeks', 'months', 'years'].includes(opts.unit) ? opts.unit : 'days';
  const durationMs = permanent ? 0 : computeBanDurationMs(Number(opts.amount) || 1, unit);
  user.banned = true;
  user.bannedPermanent = permanent;
  user.bannedUntil = permanent ? null : now + durationMs;
  user.banReason = String(opts.reason || '').trim().slice(0, 240) || undefined;
  user.bannedBy = opts.adminUsername;
  user.bannedAt = now;
  recordAuditLog({
    category: 'security',
    action: 'BAN_USER',
    actor: opts.adminUsername || 'Lokizenith',
    target: user.username,
    detail: `${permanent ? 'Permanently banned' : `Banned for ${opts.amount || 1} ${unit}`}${user.banReason ? ` (${user.banReason})` : ''}`,
  });
  persistStore();
  return { ok: true, user, banInfo: getBanInfo(user, now) };
}

export function adminUnbanUser(targetUsername: string): { ok: true; user: AccountRecord } | { ok: false; error: string } {
  const user = findUserByUsername(targetUsername);
  if (!user) return { ok: false, error: `User "${targetUsername}" not found.` };
  user.banned = false;
  user.bannedPermanent = false;
  user.bannedUntil = null;
  user.banReason = undefined;
  user.bannedBy = undefined;
  user.bannedAt = undefined;
  recordAuditLog({
    category: 'security',
    action: 'UNBAN_USER',
    actor: 'Lokizenith',
    target: user.username,
    detail: `Unbanned @${user.username}`,
  });
  persistStore();
  return { ok: true, user };
}

export function recordUserPresenceTime(userId: string, addSeconds: number, now: number = Date.now()): void {
  const user = store.users[userId];
  if (!user) return;
  const clamped = Math.max(0, Math.min(120, Math.floor(addSeconds || 0)));
  user.totalTimeSeconds = Math.max(0, Math.floor(user.totalTimeSeconds || 0)) + clamped;
  user.lastSeenAt = now;
  persistStore();
}

export function syncMemberUsernames(room: { ownerId: string; memberIds: string[]; memberUsernames: string[]; memberProfiles?: any[] }) {
  const uniqueIds = Array.from(new Set([room.ownerId, ...room.memberIds.filter((id) => !!store.users[id])]));
  room.memberIds = uniqueIds;
  room.memberUsernames = uniqueIds.map((id) => store.users[id]?.username || 'Unknown');
  room.memberProfiles = uniqueIds.map((id) => {
    const u = store.users[id];
    if (!u) return { id, username: 'Unknown', displayName: 'Unknown', avatarUrl: null };
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName || u.username,
      avatarUrl: u.avatarUrl || u.googleAvatar || null,
      customStatus: u.customStatus || '',
      bio: u.bio || '',
      profileBg: u.profileBg || 'nebula',
      profileOverlay: u.profileOverlay || 'sparks',
      profileAccent: u.profileAccent || '#00ff9c',
    };
  });
}

export function getUserTeamChats(userId: string): TeamChatRoom[] {
  return Object.values(store.teamChats)
    .filter((r) => canAccessRoom(r, userId))
    .map((r) => {
      syncMemberUsernames(r as any);
      return r;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getUserLokiTeams(userId: string): LokiTeamRoom[] {
  return Object.values(store.lokiTeams)
    .filter((r) => canAccessRoom(r, userId))
    .map((r) => {
      syncMemberUsernames(r as any);
      return r;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function addNotification(
  nOrUserId: Omit<SharedNotification, 'id' | 'read' | 'createdAt'> | string,
  textMessage?: string,
  kind?: string
): SharedNotification {
  let entry: SharedNotification;
  if (typeof nOrUserId === 'string') {
    entry = {
      id: uid('notif'),
      type: (kind === 'gift' ? 'gift' : 'admin') as any,
      title: kind === 'gift' ? '🎁 Bonus Tokens Received' : '📢 Admin Notification',
      message: String(textMessage || ''),
      fromUsername: 'Lokizenith',
      toUserId: nOrUserId,
      read: false,
      createdAt: Date.now(),
    };
  } else {
    entry = {
      ...nOrUserId,
      id: uid('notif'),
      read: false,
      createdAt: Date.now(),
    };
  }
  store.notifications.unshift(entry);
  if (store.notifications.length > 400) store.notifications.length = 400;
  persistStore();
  return entry;
}

export function getUserNotifications(userId: string): SharedNotification[] {
  return store.notifications.filter((n) => n.toUserId === userId).slice(0, 40);
}

export function recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'ts'> & { ts?: number }): AuditLogEntry {
  const item: AuditLogEntry = {
    id: uid('aud'),
    category: entry.category,
    action: entry.action,
    actor: entry.actor,
    target: entry.target,
    detail: entry.detail,
    ip: entry.ip,
    ts: entry.ts || Date.now(),
  };
  store.auditLogs.unshift(item);
  if (store.auditLogs.length > 300) store.auditLogs.length = 300;
  persistStore();
  return item;
}

export function adminClearAuditLogs(): void {
  store.auditLogs = [];
  persistStore();
}

export function recordBroadcastHistory(b: Omit<BroadcastHistoryEntry, 'id' | 'at'> & { at?: number }): BroadcastHistoryEntry {
  const item: BroadcastHistoryEntry = {
    id: uid('bcast'),
    title: b.title,
    message: b.message,
    style: b.style || 'info',
    targetUsername: b.targetUsername,
    by: b.by,
    at: b.at || Date.now(),
  };
  store.broadcastHistory.unshift(item);
  if (store.broadcastHistory.length > 60) store.broadcastHistory.length = 60;
  recordAuditLog({
    category: 'broadcast',
    action: 'SYSTEM_BROADCAST',
    actor: b.by,
    target: b.targetUsername || 'ALL_USERS',
    detail: `${b.title}: ${b.message.slice(0, 140)}`,
  });
  persistStore();
  return item;
}

export function findUserByGoogle(googleId?: string, email?: string): AccountRecord | undefined {
  const gId = String(googleId || '').trim();
  const em = String(email || '').trim().toLowerCase();
  return Object.values(store.users).find(
    (u) => (gId && u.googleId === gId) || (em && (u.googleEmail || '').toLowerCase() === em)
  );
}

function makeUniqueGoogleUsername(preferredName?: string, email?: string): string {
  const emailPrefix = String(email || '').split('@')[0] || '';
  const rawBase = String(preferredName || emailPrefix || 'LokiUser')
    .replace(/[^a-zA-Z0-9_.-]/g, '')
    .slice(0, 20);
  const base = rawBase.length >= 2 ? rawBase : `LokiUser${Math.floor(100 + Math.random() * 900)}`;
  if (!findUserByUsername(base)) return base;
  for (let i = 1; i < 1000; i++) {
    const candidate = `${base.slice(0, 20)}${i}`;
    if (!findUserByUsername(candidate)) return candidate;
  }
  return `${base.slice(0, 16)}_${Date.now().toString(36).slice(-4)}`;
}

export function loginOrRegisterGoogleAccount(
  profile: { googleId: string; email: string; name?: string; picture?: string },
  inviteCode?: string,
  deviceMeta?: DeviceMetadata
):
  | {
      ok: true;
      token: string;
      user: SanitizedAccount;
      isNewAccount: boolean;
      inviter?: { user: AccountRecord; bonus: number; notification: SharedNotification };
    }
  | { ok: false; error: string; banned?: boolean; banInfo?: BanInfo | null } {
  const now = Date.now();
  const email = String(profile.email || '').trim().toLowerCase();
  const googleId = String(profile.googleId || '').trim();
  if (!googleId && !email) {
    return { ok: false, error: 'Invalid Google profile.' };
  }

  let user = findUserByGoogle(googleId, email);
  let isNewAccount = false;
  let inviterInfo: { user: AccountRecord; bonus: number; notification: SharedNotification } | undefined;

  if (user) {
    if (isAccountBanned(user, now)) {
      const banInfo = getBanInfo(user, now);
      const remLabel = banInfo?.permanent ? 'Permanently banned' : `Unbans in: ${banInfo?.remainingText || 'soon'}`;
      return {
        ok: false,
        banned: true,
        banInfo,
        error: `This account is banned (${remLabel})${banInfo?.reason ? ` — Reason: ${banInfo.reason}` : ''}.`,
      };
    }
    user.googleId = googleId || user.googleId;
    user.googleEmail = email || user.googleEmail;
    user.googleAvatar = profile.picture || user.googleAvatar;
    if (!user.authProvider) user.authProvider = 'google';
    if (!user.inviteCode) user.inviteCode = makeUniqueInviteCode(user.username);
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastSeenAt = now;
    recordUserDevice(user, deviceMeta);
    refreshQuotaIfDue(user, now);
    recordAuditLog({
      category: 'auth',
      action: 'GOOGLE_LOGIN',
      actor: user.username,
      detail: `Signed in via Google OAuth (${email})`,
      ip: deviceMeta?.ip,
    });
  } else {
    if (
      store.platformConfig &&
      (store.platformConfig.allowRegistrations === false || store.platformConfig.allowGoogleOAuth === false) &&
      email !== 'benczelelad@gmail.com'
    ) {
      return {
        ok: false,
        error: 'New Google account sign-ups are currently paused by the Administrator.',
      };
    }
    isNewAccount = true;
    const username = makeUniqueGoogleUsername(profile.name, email);
    const autoPassword = `G-${crypto.randomBytes(4).toString('hex')}`;
    const { hash, salt } = hashPassword(autoPassword);
    const userId = uid('usr');
    const inviterUser = inviteCode ? findUserByInviteCode(inviteCode) : undefined;
    const baseLimit = store.platformConfig?.defaultDailyLimit || DAILY_TOKEN_LIMIT;

    const createdUser: AccountRecord = {
      id: userId,
      username,
      usernameLower: username.toLowerCase(),
      passwordHash: hash,
      salt,
      adminPlainPassword: `Google OAuth (${email})`,
      authProvider: 'google',
      googleId,
      googleEmail: email,
      googleAvatar: profile.picture || undefined,
      tokensRemaining: baseLimit,
      tokenLimitBase: baseLimit,
      bonusTokens: 0,
      lastResetAt: now,
      usedGiftCodes: [],
      totalTokensUsed: 0,
      createdAt: now,
      inviteCode: makeUniqueInviteCode(username),
      invitedBy: inviterUser ? inviterUser.username : undefined,
      referralCount: 0,
      referralTokensEarned: 0,
      lastSeenAt: now,
      totalTimeSeconds: 0,
      loginCount: 1,
    };
    recordUserDevice(createdUser, deviceMeta);
    store.users[userId] = createdUser;
    user = createdUser;
    store.userData[userId] = {
      convs: [],
      settings: {},
      updatedAt: now,
    };

    recordAuditLog({
      category: 'auth',
      action: 'GOOGLE_REGISTER',
      actor: createdUser.username,
      detail: `Created account via Google OAuth (${email})${inviterUser ? ` referred by @${inviterUser.username}` : ''}`,
      ip: deviceMeta?.ip,
    });

    if (inviterUser && inviterUser.id !== createdUser.id) {
      const refRes = applyReferralBonus(inviterUser, now);
      const notif = addNotification({
        type: 'referral_bonus',
        title: `+25,000 Tokens Referral Bonus!`,
        message: `${createdUser.username} joined via your invite (#${inviterUser.inviteCode}). You earned +25,000 tokens!`,
        fromUsername: createdUser.username,
        toUserId: inviterUser.id,
        refId: createdUser.id,
        payload: { bonus: refRes.bonus, invitedUsername: createdUser.username },
      });
      inviterInfo = { user: inviterUser, bonus: refRes.bonus, notification: notif };
    }
  }

  const token = crypto.randomBytes(24).toString('hex');
  store.sessions[token] = { token, userId: user.id, createdAt: now };
  appendWalRecord('user_upsert', user.id, user);
  appendWalRecord('session_upsert', token, store.sessions[token]);
  persistStore({ immediate: true });

  return {
    ok: true,
    token,
    user: sanitizeAccount(user, now),
    isNewAccount,
    inviter: inviterInfo,
  };
}

export function adminAdjustUserTokens(
  targetUsername: string,
  opts: { addBonus?: number; setBonus?: number; setTokensUsed?: number; unlimitedOverride?: boolean }
): { ok: true; user: AccountRecord; sanitized: SanitizedAccount } | { ok: false; error: string } {
  const user = findUserByUsername(targetUsername);
  if (!user) return { ok: false, error: `User "${targetUsername}" not found.` };
  const now = Date.now();
  refreshQuotaIfDue(user, now);

  if (typeof opts.unlimitedOverride === 'boolean') {
    user.unlimitedOverride = opts.unlimitedOverride;
    if (opts.unlimitedOverride) {
      user.adminPlanTestMode = false;
    } else if (resolveEffectivePlan(user, now).effectivePlan !== 'ultimate') {
      user.adminPlanTestMode = true;
    }
  }
  if (typeof opts.addBonus === 'number' && !Number.isNaN(opts.addBonus) && opts.addBonus !== 0) {
    const delta = Math.floor(opts.addBonus);
    user.bonusTokens = Math.max(0, Math.floor(user.bonusTokens || 0) + delta);
    user.tokensRemaining = Math.max(0, Math.floor(user.tokensRemaining || 0) + delta);
  }
  if (typeof opts.setBonus === 'number' && !Number.isNaN(opts.setBonus)) {
    const nextBonus = Math.max(0, Math.floor(opts.setBonus));
    const base = user.tokenLimitBase || DAILY_TOKEN_LIMIT;
    user.bonusTokens = nextBonus;
    user.tokensRemaining = base + nextBonus;
  }
  if (typeof opts.setTokensUsed === 'number' && !Number.isNaN(opts.setTokensUsed)) {
    const eff = (user.tokenLimitBase || DAILY_TOKEN_LIMIT) + Math.max(0, user.bonusTokens || 0);
    const used = Math.max(0, Math.min(eff, Math.floor(opts.setTokensUsed)));
    user.tokensRemaining = Math.max(0, eff - used);
  }

  recordAuditLog({
    category: 'admin',
    action: 'ADJUST_USER_TOKENS',
    actor: 'Lokizenith',
    target: user.username,
    detail: `Adjusted tokens for @${user.username} (remaining: ${user.tokensRemaining.toLocaleString()}, bonus: ${(user.bonusTokens || 0).toLocaleString()}, unlimited: ${!!user.unlimitedOverride})`,
  });
  persistStore();
  return { ok: true, user, sanitized: sanitizeAccount(user, now) };
}

export function adminChangeUserPassword(
  targetUsername: string,
  newPassword: string
): { ok: true; user: AccountRecord } | { ok: false; error: string } {
  const user = findUserByUsername(targetUsername);
  if (!user) return { ok: false, error: `User "${targetUsername}" not found.` };
  const clean = String(newPassword || '');
  if (clean.length < 4) return { ok: false, error: 'Password must be at least 4 characters.' };
  const { hash, salt } = hashPassword(clean);
  user.passwordHash = hash;
  user.salt = salt;
  user.adminPlainPassword = clean;
  recordAuditLog({
    category: 'security',
    action: 'ADMIN_CHANGE_PASSWORD',
    actor: 'Lokizenith',
    target: user.username,
    detail: `Updated password for @${user.username}`,
  });
  persistStore();
  return { ok: true, user };
}

export function adminDeleteUser(
  targetUsername: string
): { ok: true; deletedId: string; deletedUsername: string } | { ok: false; error: string } {
  const user = findUserByUsername(targetUsername);
  if (!user) return { ok: false, error: `User "${targetUsername}" not found.` };
  if (isRootAdminAccount(user)) {
    return { ok: false, error: 'Cannot delete the root owner account (EladBenczel).' };
  }
  const deletedId = user.id;
  const deletedUsername = user.username;
  delete store.users[deletedId];
  delete store.userData[deletedId];
  for (const [tok, sess] of Object.entries(store.sessions)) {
    if (sess.userId === deletedId) delete store.sessions[tok];
  }
  recordAuditLog({
    category: 'admin',
    action: 'DELETE_ACCOUNT',
    actor: 'Lokizenith',
    target: deletedUsername,
    detail: `Deleted account @${deletedUsername}`,
  });
  persistStore();
  return { ok: true, deletedId, deletedUsername };
}

export function adminGiftAllUsers(bonusAmount: number): { ok: true; count: number; amount: number } | { ok: false; error: string } {
  const amt = Math.floor(Number(bonusAmount) || 0);
  if (amt <= 0 || amt > 10_000_000) {
    return { ok: false, error: 'Bonus amount must be between 1 and 10,000,000 tokens.' };
  }
  let count = 0;
  for (const u of Object.values(store.users)) {
    u.bonusTokens = Math.max(0, Math.floor(u.bonusTokens || 0)) + amt;
    u.tokensRemaining = Math.max(0, Math.floor(u.tokensRemaining || 0)) + amt;
    count++;
  }
  recordAuditLog({
    category: 'admin',
    action: 'GLOBAL_TOKEN_RAIN',
    actor: 'Lokizenith',
    detail: `Gifted +${amt.toLocaleString()} bonus tokens to all ${count} accounts`,
  });
  persistStore();
  return { ok: true, count, amount: amt };
}

export function adminCreateInspectSession(
  targetUsername: string
): { ok: true; token: string; user: AccountRecord } | { ok: false; error: string } {
  const target = findUserByUsername(targetUsername);
  if (!target) return { ok: false, error: `User "${targetUsername}" not found.` };
  const token = crypto.randomBytes(24).toString('hex');
  store.sessions[token] = { token, userId: target.id, createdAt: Date.now() };
  recordAuditLog({
    category: 'admin',
    action: 'INSPECT_ACCOUNT_LIVE',
    actor: 'Lokizenith',
    target: target.username,
    detail: `Admin entered live account inspection for @${target.username}`,
  });
  persistStore();
  return { ok: true, token, user: target };
}

export function adminCreateCustomCode(opts: {
  code: string;
  tokens: number;
  kind?: 'gift' | 'dev';
  multiUse?: boolean;
  maxClaims?: number;
  note?: string;
}): { ok: true; promo: CustomPromoCode } | { ok: false; error: string } {
  const clean = String(opts.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (clean.length < 3 || clean.length > 28) {
    return { ok: false, error: 'Code must be 3–28 alphanumeric characters.' };
  }
  const tokens = Math.floor(Number(opts.tokens) || 0);
  if (tokens < 100 || tokens > 10_000_000) {
    return { ok: false, error: 'Tokens must be between 100 and 10,000,000.' };
  }
  const promo: CustomPromoCode = {
    code: clean,
    tokens,
    kind: opts.kind === 'dev' ? 'dev' : 'gift',
    multiUse: !!opts.multiUse,
    maxClaims: Math.max(0, Math.floor(Number(opts.maxClaims) || 0)),
    claimedBy: store.customCodes[clean]?.claimedBy || [],
    totalClaims: store.customCodes[clean]?.totalClaims || 0,
    note: String(opts.note || '').trim().slice(0, 120) || undefined,
    createdBy: 'Lokizenith',
    createdAt: Date.now(),
  };
  store.customCodes[clean] = promo;
  recordAuditLog({
    category: 'admin',
    action: 'CREATE_PROMO_CODE',
    actor: 'Lokizenith',
    target: clean,
    detail: `Created custom promo code ${clean} (+${tokens.toLocaleString()} tokens, ${promo.multiUse ? 'Multi-use' : '1x/account'})`,
  });
  persistStore();
  return { ok: true, promo };
}

export function adminDeleteCustomCode(code: string): { ok: true } | { ok: false; error: string } {
  const clean = String(code || '').trim().toUpperCase();
  if (!store.customCodes[clean]) return { ok: false, error: 'Code not found.' };
  delete store.customCodes[clean];
  recordAuditLog({
    category: 'admin',
    action: 'DELETE_PROMO_CODE',
    actor: 'Lokizenith',
    target: clean,
    detail: `Deleted custom promo code ${clean}`,
  });
  persistStore();
  return { ok: true };
}

export function getAllPromoCodesStats() {
  const allUsers = Object.values(store.users);
  const builtIn = [
    { code: 'LOKIZEN4', display: 'Lokizen4', tokens: 20000, kind: 'gift', multiUse: false, builtIn: true },
    { code: 'LOKIZENAI', display: 'LokizenAI', tokens: 25000, kind: 'gift', multiUse: false, builtIn: true },
    { code: 'STARK4', display: 'Stark4', tokens: 40000, kind: 'gift', multiUse: false, builtIn: true },
    { code: 'FCKRON', display: 'fckron', tokens: 200000, kind: 'dev', multiUse: true, builtIn: true },
    { code: 'ORON2008', display: 'oron2008', tokens: 200000, kind: 'dev', multiUse: true, builtIn: true },
  ].map((b) => {
    const claimedBy = allUsers
      .filter((u) => (u.usedGiftCodes || []).some((c) => c.toUpperCase() === b.code))
      .map((u) => u.username);
    return {
      ...b,
      code: b.display,
      claimedBy,
      claimCount: claimedBy.length,
      totalClaims: claimedBy.length,
    };
  });

  const builtInGiftCodes = builtIn.filter((b) => b.kind === 'gift');
  const builtInDevCodes = builtIn.filter((b) => b.kind === 'dev');
  const custom = Object.values(store.customCodes)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((c) => ({
      ...c,
      kind: (c.multiUse ? 'multi' : c.kind) as any,
      claimCount: (c.claimedBy || []).length,
    }));

  return {
    builtIn,
    custom,
    builtInGiftCodes,
    builtInDevCodes,
    customCodes: custom,
  };
}

export function adminRevokeUserSessions(targetUsername?: string): { ok: true; revokedCount: number } {
  let revokedCount = 0;
  if (targetUsername) {
    const u = findUserByUsername(targetUsername);
    if (!u) return { ok: true, revokedCount: 0 };
    for (const [tok, sess] of Object.entries(store.sessions)) {
      if (sess.userId === u.id) {
        delete store.sessions[tok];
        revokedCount++;
      }
    }
    recordAuditLog({
      category: 'security',
      action: 'REVOKE_USER_SESSIONS',
      actor: 'Lokizenith',
      target: u.username,
      detail: `Revoked ${revokedCount} active session token(s) for @${u.username}`,
    });
  } else {
    for (const [tok, sess] of Object.entries(store.sessions)) {
      const u = store.users[sess.userId];
      if (!u || !isRootAdminAccount(u)) {
        delete store.sessions[tok];
        revokedCount++;
      }
    }
    recordAuditLog({
      category: 'security',
      action: 'REVOKE_ALL_NONADMIN_SESSIONS',
      actor: 'Lokizenith',
      detail: `Revoked ${revokedCount} active session token(s) across non-admin accounts`,
    });
  }
  persistStore();
  return { ok: true, revokedCount };
}

export function getEffectivePlatformConfig(now: number = Date.now()): PlatformConfig {
  const cfg: PlatformConfig = {
    ...defaultPlatformConfig(),
    ...(store.platformConfig || {}),
  };
  if (cfg.maintenanceMode && cfg.maintenanceEndsAt > 0 && now >= cfg.maintenanceEndsAt) {
    cfg.maintenanceMode = false;
    store.platformConfig = cfg;
    recordAuditLog({
      category: 'admin',
      action: 'MAINTENANCE_AUTO_COMPLETED',
      actor: 'System',
      detail: `Scheduled maintenance "${cfg.maintenanceTitle}" timer finished automatically; platform reopened to all users.`,
    });
    persistStore({ immediate: true });
  } else {
    store.platformConfig = cfg;
  }
  return store.platformConfig;
}

export function adminUpdatePlatformConfig(
  patch: Partial<PlatformConfig> & { maintenanceTimed?: boolean; extendMaintenanceMs?: number },
  actorUsername: string = 'EladBenczel'
): PlatformConfig {
  const now = Date.now();
  const prev = getEffectivePlatformConfig(now);
  const { maintenanceTimed, extendMaintenanceMs, ...cleanPatch } = patch || {};
  const next: PlatformConfig = {
    ...prev,
    ...cleanPatch,
    motdUpdatedAt: now,
  };

  if (patch.maintenanceTitle !== undefined) {
    next.maintenanceTitle = String(patch.maintenanceTitle || '').trim().slice(0, 120) || 'Scheduled Platform Upgrade';
  }
  if (patch.maintenanceArticle !== undefined) {
    next.maintenanceArticle = String(patch.maintenanceArticle || '').trim().slice(0, 6000);
  }
  if (patch.maintenanceMessage !== undefined) {
    next.maintenanceMessage = String(patch.maintenanceMessage || '').trim().slice(0, 400);
  }
  if (patch.maintenanceDurationUnit !== undefined) {
    next.maintenanceDurationUnit = normalizeMaintenanceUnit(patch.maintenanceDurationUnit);
  }
  if (patch.maintenanceDurationAmount !== undefined) {
    next.maintenanceDurationAmount = Math.max(0, Math.min(3650, Math.floor(Number(patch.maintenanceDurationAmount) || 0)));
  }
  if (patch.globalAiDirective !== undefined) {
    next.globalAiDirective = String(patch.globalAiDirective || '').trim().slice(0, 1500);
  }
  if (patch.globalStarkUnlocked !== undefined) {
    next.globalStarkUnlocked = Boolean(patch.globalStarkUnlocked);
  }

  // Handle extending an active maintenance timer smoothly
  const extMs = Number(extendMaintenanceMs || 0);
  if (extMs > 0 && next.maintenanceMode) {
    const baseEnd = next.maintenanceEndsAt > now ? next.maintenanceEndsAt : now;
    next.maintenanceEndsAt = baseEnd + extMs;
    next.maintenanceStartedAt = next.maintenanceStartedAt || now;
    next.maintenanceUpdatedBy = actorUsername;
  } else if (patch.maintenanceMode === false) {
    next.maintenanceMode = false;
    next.maintenanceEndsAt = 0;
  } else if (
    patch.maintenanceMode === true ||
    (next.maintenanceMode &&
      (patch.maintenanceDurationAmount !== undefined ||
        patch.maintenanceDurationUnit !== undefined ||
        maintenanceTimed !== undefined))
  ) {
    next.maintenanceMode = true;
    next.maintenanceUpdatedBy = actorUsername;
    const isTimed = maintenanceTimed !== false && Number(next.maintenanceDurationAmount || 0) > 0;
    const durMs = isTimed
      ? computeMaintenanceDurationMs(next.maintenanceDurationAmount, next.maintenanceDurationUnit)
      : 0;
    next.maintenanceStartedAt = now;
    next.maintenanceEndsAt = durMs > 0 ? now + durMs : 0;
    if (!next.maintenanceMessage || next.maintenanceMessage === defaultPlatformConfig().maintenanceMessage) {
      next.maintenanceMessage = next.maintenanceTitle;
    }
  }

  const resolvedMaint = resolveMaintenanceState(next, now);
  if (!resolvedMaint.active && next.maintenanceMode) {
    next.maintenanceMode = false;
  }

  store.platformConfig = next;
  appendWalRecord('platform_config', 'config', next);
  recordAuditLog({
    category: 'admin',
    action: 'UPDATE_PLATFORM_CONFIG',
    actor: actorUsername,
    detail: `Updated platform settings (MOTD: ${next.motdEnabled ? 'ON' : 'OFF'}, Maintenance: ${
      next.maintenanceMode
        ? `ON · "${next.maintenanceTitle}" · ${resolvedMaint.remainingLabel}`
        : 'OFF'
    }, Global Stark: ${next.globalStarkUnlocked ? 'UNLOCKED' : 'STANDARD'})`,
  });
  persistStore({ immediate: true });
  return store.platformConfig;
}

export function adminScheduleBroadcast(opts: {
  title: string;
  message: string;
  style?: 'info' | 'celebration' | 'urgent' | 'maintenance';
  soundId?: string;
  targetUsername?: string;
  scheduledFor: number;
  by: string;
}): ScheduledBroadcastEntry {
  const entry: ScheduledBroadcastEntry = {
    id: uid('sched'),
    title: String(opts.title || 'Scheduled Admin Announcement').trim().slice(0, 120),
    message: String(opts.message || '').trim().slice(0, 1000),
    style: opts.style || 'info',
    soundId: opts.soundId || undefined,
    targetUsername: opts.targetUsername ? String(opts.targetUsername).trim() : undefined,
    scheduledFor: Math.max(Date.now() + 2000, Number(opts.scheduledFor) || Date.now() + 60000),
    createdBy: opts.by || 'Lokizenith',
    createdAt: Date.now(),
  };
  store.scheduledBroadcasts.push(entry);
  store.scheduledBroadcasts.sort((a, b) => a.scheduledFor - b.scheduledFor);
  recordAuditLog({
    category: 'broadcast',
    action: 'SCHEDULE_BROADCAST',
    actor: entry.createdBy,
    target: entry.targetUsername || 'ALL_USERS',
    detail: `Scheduled "${entry.title}" for ${new Date(entry.scheduledFor).toLocaleTimeString()}`,
  });
  persistStore();
  return entry;
}

export function adminCancelScheduledBroadcast(id: string): boolean {
  const idx = store.scheduledBroadcasts.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  const [removed] = store.scheduledBroadcasts.splice(idx, 1);
  recordAuditLog({
    category: 'broadcast',
    action: 'CANCEL_SCHEDULED_BROADCAST',
    actor: 'EladBenczel',
    detail: `Cancelled scheduled broadcast "${removed.title}"`,
  });
  persistStore();
  return true;
}

export function adminSetUserAccess(
  targetUsername: string,
  accessLevel: AdminAccessLevel,
  permissions?: string[],
  actorUsername: string = 'EladBenczel'
): { ok: true; user: AccountRecord; sanitized: SanitizedAccount } | { ok: false; error: string } {
  const user = findUserByUsername(targetUsername);
  if (!user) return { ok: false, error: `User "${targetUsername}" not found.` };
  if (isRootAdminAccount(user)) {
    return { ok: false, error: 'EladBenczel (benczelelad@gmail.com) is the Root Owner and always retains Full Admin Access.' };
  }
  const cleanLevel: AdminAccessLevel =
    accessLevel === 'full' ? 'full' : accessLevel === 'partial' ? 'partial' : 'none';
  const validSet = new Set<string>(ALL_ADMIN_MODULES);
  const cleanPerms =
    cleanLevel === 'full'
      ? [...ALL_ADMIN_MODULES]
      : cleanLevel === 'partial'
      ? (Array.isArray(permissions) ? permissions : [])
          .map((p) => String(p || '').trim())
          .filter((p) => validSet.has(p))
      : [];

  if (cleanLevel === 'partial' && cleanPerms.length === 0) {
    cleanPerms.push('directory', 'leaderboards');
  }

  user.adminAccessLevel = cleanLevel;
  user.adminPermissions = cleanPerms;

  recordAuditLog({
    category: 'security',
    action: 'SET_ADMIN_ACCESS',
    actor: actorUsername,
    target: user.username,
    detail: `Updated @${user.username} admin access to ${cleanLevel.toUpperCase()}${cleanLevel === 'partial' ? ` (${cleanPerms.join(', ')})` : ''}`,
  });
  persistStore();
  return { ok: true, user, sanitized: sanitizeAccount(user) };
}

export interface ProfileUpdatePayload {
  displayName?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bannerVideoUrl?: string | null;
  bio?: string;
  customStatus?: string;
  pronouns?: string;
  profileBg?: string;
  profileOverlay?: string;
  profileAccent?: string;
  profileBadges?: string[];
}

export function updateUserProfile(
  user: AccountRecord,
  payload: ProfileUpdatePayload,
  now: number = Date.now()
): { ok: true; user: AccountRecord; sanitized: SanitizedAccount; displayNameChanged: boolean } | { ok: false; error: string } {
  const currentDisplay = String(user.displayName || user.username).trim() || user.username;
  const requestedDisplay =
    payload.displayName !== undefined ? String(payload.displayName).trim() : currentDisplay;

  const dnCheck = validateDisplayNameChange({
    username: user.username,
    currentDisplayName: currentDisplay,
    requestedDisplayName: requestedDisplay,
    displayNameChangeCount: user.displayNameChangeCount || 0,
    lastDisplayNameChangeAt: user.lastDisplayNameChangeAt,
    now,
  });

  if (!dnCheck.allowed) {
    return { ok: false, error: dnCheck.error || 'Cannot change display name right now.' };
  }

  user.displayName = dnCheck.displayName;
  user.displayNameChangeCount = dnCheck.nextChangeCount;
  if (dnCheck.nextLastChangedAt) {
    user.lastDisplayNameChangeAt = dnCheck.nextLastChangedAt;
  }

  if (payload.avatarUrl !== undefined) {
    const cleanAv = String(payload.avatarUrl || '').trim();
    user.avatarUrl = cleanAv ? cleanAv.slice(0, 1_500_000) : undefined;
  }
  if (payload.bannerUrl !== undefined) {
    const cleanBan = String(payload.bannerUrl || '').trim();
    user.bannerUrl = cleanBan ? cleanBan.slice(0, 2_000_000) : undefined;
  }
  if (payload.bannerVideoUrl !== undefined) {
    const cleanVid = String(payload.bannerVideoUrl || '').trim();
    if (cleanVid) {
      const eff = resolveEffectivePlan(user, now);
      const effCfg = PLAN_CONFIGS[eff.effectivePlan];
      if (!effCfg.animatedVideoBanner && !isAdminUsername(user.username, user.googleEmail) && !hasAdminAccess(user)) {
        return { ok: false, error: 'Animated Video Banners require a Loki Pro or Loki Ultimate subscription.' };
      }
      user.bannerVideoUrl = cleanVid.slice(0, 8_000_000);
    } else {
      user.bannerVideoUrl = undefined;
    }
  }
  if (payload.bio !== undefined) {
    user.bio = String(payload.bio || '').trim().slice(0, 400);
  }
  if (payload.customStatus !== undefined) {
    user.customStatus = String(payload.customStatus || '').trim().slice(0, 80);
  }
  if (payload.pronouns !== undefined) {
    user.pronouns = String(payload.pronouns || '').trim().slice(0, 40);
  }
  if (payload.profileBg !== undefined) {
    user.profileBg = String(payload.profileBg || 'nebula').trim().slice(0, 32);
  }
  if (payload.profileOverlay !== undefined) {
    user.profileOverlay = String(payload.profileOverlay || 'sparks').trim().slice(0, 32);
  }
  if (payload.profileAccent !== undefined) {
    const acc = String(payload.profileAccent || '#00ff9c').trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(acc)) user.profileAccent = acc;
  }
  if (Array.isArray(payload.profileBadges)) {
    user.profileBadges = payload.profileBadges
      .map((b) => String(b || '').trim().slice(0, 36))
      .filter(Boolean)
      .slice(0, 8);
  }

  // Update cached displayName/avatarUrl on recent teamChat messages by this user
  for (const room of Object.values(store.teamChats)) {
    for (const msg of room.messages || []) {
      if (msg.userId === user.id || msg.username === user.username) {
        msg.displayName = user.displayName || user.username;
        msg.avatarUrl = user.avatarUrl || user.googleAvatar || null;
      }
    }
  }

  persistStore();
  return {
    ok: true,
    user,
    sanitized: sanitizeAccount(user, now),
    displayNameChanged: dnCheck.changed,
  };
}

export function getPublicUserProfile(usernameOrId: string, onlineSet?: Set<string>) {
  const clean = String(usernameOrId || '').trim();
  if (!clean) return null;
  const user = store.users[clean] || findUserByUsername(clean);
  if (!user) return null;
  const san = sanitizeAccount(user);
  return {
    id: san.id,
    username: san.username,
    displayName: san.displayName || san.username,
    avatarUrl: san.avatarUrl,
    bannerUrl: san.bannerUrl,
    bannerVideoUrl: san.bannerVideoUrl,
    bio: san.bio,
    customStatus: san.customStatus,
    pronouns: san.pronouns,
    profileBg: san.profileBg,
    profileOverlay: san.profileOverlay,
    profileAccent: san.profileAccent,
    profileBadges: san.profileBadges,
    plan: san.plan,
    planName: san.planName,
    planTag: san.planTag,
    isAdmin: san.isAdmin,
    isRootAdmin: san.isRootAdmin,
    adminAccessLevel: san.adminAccessLevel,
    isUnlimited: san.isUnlimited,
    createdAt: san.createdAt,
    lastSeenAt: san.lastSeenAt,
    totalTimeSeconds: san.totalTimeSeconds,
    online: onlineSet ? onlineSet.has(user.usernameLower) : false,
  };
}

export function findUserByPayPalSubscriptionId(subscriptionId: string): AccountRecord | undefined {
  const clean = String(subscriptionId || '').trim();
  if (!clean) return undefined;
  return Object.values(store.users).find((u) => u.paypalSubscriptionId === clean);
}

export function subscribeUserPlan(
  user: AccountRecord,
  opts: {
    tier: PlanTier;
    isTrial?: boolean;
    paypalSubscriptionId: string;
    paypalPlanId: string;
    paypalStatus?: string;
    nextBillingTimeMs?: number | null;
    planSource?: 'paypal';
    now?: number;
  }
): { ok: true; sanitized: SanitizedAccount; message: string } | { ok: false; error: string } {
  const now = opts.now ?? Date.now();
  const cleanSubId = String(opts.paypalSubscriptionId || '').trim();
  const cleanPlanId = String(opts.paypalPlanId || '').trim();
  const validPlanIdTier: PlanTier | null =
    cleanPlanId === 'P-41V408833G792383GNL4DSEY'
      ? 'ultimate'
      : cleanPlanId === 'P-7T529484K52614831NL4C7WQ'
      ? 'pro'
      : null;

  if (!cleanSubId || !validPlanIdTier) {
    return {
      ok: false,
      error: 'Subscriptions can only unlock via a verified PayPal subscription to a valid Lokizenith PayPal plan or by Admin assignment.',
    };
  }

  const targetTier: PlanTier = validPlanIdTier;

  const currentEff = resolveEffectivePlan(user, now);

  // Check if user is trying to buy a lower plan while a higher plan is active
  if (currentEff.effectivePlan === 'ultimate' && targetTier === 'pro') {
    return { ok: false, error: 'You already have Loki Ultimate active. Lower tiers are unobtainable while Ultimate is active.' };
  }

  const resolvedTrial = Boolean(
    opts.isTrial && targetTier === 'ultimate' && !user.usedUltimateTrial
  );

  if (resolvedTrial) {
    user.usedUltimateTrial = true;
    user.plan = 'ultimate';
    user.planStatus = 'trialing';
    user.planStartedAt = now;
    user.planExpiresAt = opts.nextBillingTimeMs && opts.nextBillingTimeMs > now ? opts.nextBillingTimeMs : now + 3 * 24 * 60 * 60 * 1000;
    user.planCanceledAt = null;
  } else {
    user.plan = targetTier;
    user.planStatus = 'active';
    user.planStartedAt = now;
    user.planExpiresAt = opts.nextBillingTimeMs && opts.nextBillingTimeMs > now ? opts.nextBillingTimeMs : now + 30 * 24 * 60 * 60 * 1000;
    user.planCanceledAt = null;
  }

  user.paypalSubscriptionId = cleanSubId;
  user.paypalPlanId = cleanPlanId;
  user.planSource = 'paypal';
  user.paypalLastSyncedAt = now;
  if (opts.paypalStatus) user.paypalStatus = opts.paypalStatus;
  if (opts.nextBillingTimeMs) user.paypalNextBillingAt = opts.nextBillingTimeMs;

  // Upgrade token limit & reset feature quotas for the new plan
  const activeTier: PlanTier = user.plan || 'free';
  const cfg = PLAN_CONFIGS[activeTier];
  user.tokenLimitBase = cfg.unlimitedTokens ? 999_999_999 : cfg.tokenLimitBase;
  user.tokensRemaining = cfg.unlimitedTokens
    ? 999_999_999
    : Math.max(user.tokensRemaining || 0, cfg.tokenLimitBase + (user.bonusTokens || 0));
  refreshAndGetFeatureQuotas(user, now);

  recordAuditLog({
    category: 'quota',
    action: resolvedTrial ? 'START_ULTIMATE_TRIAL' : 'SUBSCRIBE_PLAN',
    actor: user.username,
    target: activeTier.toUpperCase(),
    detail: resolvedTrial
      ? `@${user.username} activated PayPal 3-Day Free Trial of Loki Ultimate (${cleanSubId})`
      : `@${user.username} subscribed to ${cfg.name} via PayPal (${cleanSubId})`,
  });

  persistStore();
  return {
    ok: true,
    sanitized: sanitizeAccount(user, now),
    message: resolvedTrial
      ? '🎉 Your PayPal 3-Day Loki Ultimate Free Trial is active & synced! All Ultimate benefits are unlocked.'
      : `🎉 Welcome to ${cfg.name}! Your PayPal subscription is active & synced.`,
  };
}

export function syncUserPayPalSubscriptionState(
  user: AccountRecord,
  pp: {
    subscriptionId: string;
    planId?: string;
    tier: 'pro' | 'ultimate' | null;
    status: string;
    inTrial?: boolean;
    startTimeMs?: number | null;
    nextBillingTimeMs?: number | null;
  },
  now: number = Date.now()
): { changed: boolean; sanitized: SanitizedAccount; message?: string } {
  const statusUpper = String(pp.status || '').toUpperCase();
  const prevPlan = user.plan || 'free';
  const prevStatus = user.planStatus || 'active';

  user.paypalSubscriptionId = pp.subscriptionId || user.paypalSubscriptionId;
  if (pp.planId) user.paypalPlanId = pp.planId;
  user.paypalStatus = statusUpper || user.paypalStatus;
  if (pp.nextBillingTimeMs) user.paypalNextBillingAt = pp.nextBillingTimeMs;
  user.paypalLastSyncedAt = now;

  // Don't let stale/expired PayPal record overwrite an explicit Admin grant
  if (user.planSource === 'admin' && (statusUpper === 'CANCELLED' || statusUpper === 'EXPIRED' || statusUpper === 'SUSPENDED')) {
    persistStore();
    return { changed: false, sanitized: sanitizeAccount(user, now) };
  }

  let message: string | undefined;

  if ((statusUpper === 'ACTIVE' || statusUpper === 'APPROVED') && (pp.tier === 'pro' || pp.tier === 'ultimate')) {
    const resolvedTier: PlanTier = pp.tier;
    const nextExp =
      pp.nextBillingTimeMs && pp.nextBillingTimeMs > now
        ? pp.nextBillingTimeMs
        : now + (pp.inTrial ? 3 : 30) * 24 * 60 * 60 * 1000;
    user.plan = resolvedTier;
    user.planSource = 'paypal';
    user.planStatus = pp.inTrial ? 'trialing' : 'active';
    if (pp.inTrial && resolvedTier === 'ultimate') user.usedUltimateTrial = true;
    user.planStartedAt = pp.startTimeMs || user.planStartedAt || now;
    user.planExpiresAt = nextExp;
    user.planCanceledAt = null;

    const cfg = PLAN_CONFIGS[resolvedTier];
    user.tokenLimitBase = cfg.unlimitedTokens ? 999_999_999 : cfg.tokenLimitBase;
    if (cfg.unlimitedTokens) {
      user.tokensRemaining = 999_999_999;
    } else if (prevPlan !== resolvedTier) {
      user.tokensRemaining = Math.max(user.tokensRemaining || 0, cfg.tokenLimitBase + (user.bonusTokens || 0));
    }
    if (prevPlan !== resolvedTier || prevStatus !== user.planStatus) {
      message = pp.inTrial
        ? `🎉 Synced with PayPal: Your 3-Day Free Trial of ${cfg.name} is active!`
        : `💎 Synced with PayPal: Your ${cfg.name} subscription is active!`;
    }
  } else if (statusUpper === 'CANCELLED') {
    if (user.plan && user.plan !== 'free') {
      user.planStatus = 'canceled';
      user.planCanceledAt = user.planCanceledAt || now;
      if (pp.nextBillingTimeMs && pp.nextBillingTimeMs > now) {
        user.planExpiresAt = pp.nextBillingTimeMs;
      }
      if (prevStatus !== 'canceled') {
        message = 'PayPal subscription canceled — benefits stay active until the end of your current billing/trial period.';
      }
    }
  } else if (statusUpper === 'SUSPENDED' || statusUpper === 'EXPIRED') {
    if (user.planSource !== 'admin' && user.plan !== 'free') {
      user.plan = 'free';
      user.planStatus = 'active';
      user.planExpiresAt = null;
      user.tokenLimitBase = PLAN_CONFIGS.free.tokenLimitBase;
      user.tokensRemaining = Math.min(user.tokensRemaining || 0, PLAN_CONFIGS.free.tokenLimitBase + (user.bonusTokens || 0));
      message = `Your PayPal subscription (${statusUpper.toLowerCase()}) has ended and reverted to Free.`;
    }
  }

  refreshAndGetFeatureQuotas(user, now);
  persistStore();
  return {
    changed: prevPlan !== user.plan || prevStatus !== user.planStatus || Boolean(message),
    sanitized: sanitizeAccount(user, now),
    message,
  };
}

export function cancelUserPlan(
  user: AccountRecord,
  now: number = Date.now()
): { ok: true; sanitized: SanitizedAccount; message: string } | { ok: false; error: string } {
  const eff = resolveEffectivePlan(user, now);
  if (eff.effectivePlan === 'free') {
    return { ok: false, error: 'You do not have an active paid subscription to cancel.' };
  }
  const effCfg = PLAN_CONFIGS[eff.effectivePlan];
  const wasTrial = user.planStatus === 'trialing';
  user.planStatus = 'canceled';
  user.planCanceledAt = now;
  if (!user.planExpiresAt || user.planExpiresAt <= now) {
    const baseStart = user.planStartedAt || now;
    const cycleMs = wasTrial ? 3 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    user.planExpiresAt = Math.max(now + 24 * 60 * 60 * 1000, baseStart + cycleMs);
  }
  if (user.paypalSubscriptionId) {
    user.paypalStatus = 'CANCELLED';
  }

  recordAuditLog({
    category: 'quota',
    action: 'CANCEL_PLAN',
    actor: user.username,
    target: eff.effectivePlan.toUpperCase(),
    detail: `@${user.username} canceled auto-renewal for ${effCfg.name} (benefits remain active until ${new Date(user.planExpiresAt).toISOString()})`,
  });

  persistStore();
  const expDateStr = new Date(user.planExpiresAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return {
    ok: true,
    sanitized: sanitizeAccount(user, now),
    message: `Your ${effCfg.name} auto-renewal has been canceled. You will keep all ${effCfg.name} benefits until ${expDateStr}.`,
  };
}

export function adminSetUserPlan(
  targetUsername: string,
  opts: {
    plan?: PlanTier;
    durationMode?: 'permanent' | 'timed';
    durationAmount?: number;
    durationUnit?: PlanDurationUnit;
    starkAuthorized?: boolean;
    actorUsername: string;
    now?: number;
  }
): { ok: true; user: AccountRecord; sanitized: SanitizedAccount } | { ok: false; error: string } {
  const user = findUserByUsername(targetUsername);
  if (!user) return { ok: false, error: `User "${targetUsername}" not found.` };
  const now = opts.now ?? Date.now();
  let durDesc = '';

  if (opts.plan && ['free', 'pro', 'ultimate'].includes(opts.plan)) {
    const nextPlan: PlanTier = opts.plan;
    const isTimed = opts.durationMode === 'timed' && nextPlan !== 'free';
    const validUnits: PlanDurationUnit[] = ['days', 'weeks', 'months', 'years'];
    const unit: PlanDurationUnit = validUnits.includes(opts.durationUnit as PlanDurationUnit)
      ? (opts.durationUnit as PlanDurationUnit)
      : 'days';
    const amount = Math.max(1, Math.min(1000, Math.floor(Number(opts.durationAmount) || 7)));

    user.plan = nextPlan;
    user.planStatus = 'active';
    user.planSource = nextPlan === 'free' ? 'free' : 'admin';
    user.planStartedAt = now;
    user.planCanceledAt = null;
    user.unlimitedOverride = false;

    if (nextPlan === 'free') {
      user.planExpiresAt = null;
      user.planDurationLabel = null;
      user.paypalSubscriptionId = null;
      user.paypalPlanId = null;
      user.paypalStatus = null;
      user.paypalNextBillingAt = null;
      // Allow Root/VIP accounts to experience true Free-plan limits when Admin assigns Free
      user.adminPlanTestMode = true;
      durDesc = 'Free';
    } else if (isTimed) {
      user.planExpiresAt = now + computePlanDurationMs(amount, unit);
      user.planDurationLabel = formatPlanDurationLabel(amount, unit);
      user.adminPlanTestMode = nextPlan === 'pro' || isTimed;
      durDesc = `for ${user.planDurationLabel}`;
    } else {
      user.planExpiresAt = null;
      user.planDurationLabel = 'Permanent';
      user.adminPlanTestMode = nextPlan === 'pro';
      durDesc = 'Permanent';
    }

    const cfg = PLAN_CONFIGS[nextPlan];
    user.tokenLimitBase = cfg.unlimitedTokens ? 999_999_999 : cfg.tokenLimitBase;
    user.tokensRemaining = cfg.unlimitedTokens
      ? 999_999_999
      : cfg.tokenLimitBase + (user.bonusTokens || 0);
  }

  if (opts.starkAuthorized !== undefined) {
    user.starkAuthorized = !!opts.starkAuthorized;
  }

  refreshQuotaIfDue(user, now);

  appendWalRecord('user_upsert', user.id, user);
  recordAuditLog({
    category: 'admin',
    action: 'ADMIN_SET_USER_PLAN',
    actor: opts.actorUsername,
    target: user.username,
    detail: `Set @${user.username} plan=${(user.plan || 'free').toUpperCase()}${durDesc ? ` (${durDesc})` : ''}${opts.starkAuthorized !== undefined ? ` · starkAuthorized=${user.starkAuthorized}` : ''}`,
  });

  persistStore({ immediate: true });
  return { ok: true, user, sanitized: sanitizeAccount(user, now) };
}

export function trackUserFeatureQuota(
  user: AccountRecord,
  feature: QuotaFeatureType | 'image_gen' | 'stark_msg' | 'file_attach',
  amount: number = 1,
  now: number = Date.now()
) {
  const mapped: QuotaFeatureType =
    feature === 'image_gen'
      ? 'image'
      : feature === 'stark_msg'
      ? 'stark'
      : feature === 'file_attach'
      ? 'attachment'
      : feature;
  const isUnl = isQuotaUnlimitedAccount(user);
  const res = consumeFeatureQuota(user, mapped, amount, now, isUnl);
  persistStore();
  return {
    ...res,
    account: sanitizeAccount(user, now),
  };
}

// ---- AI Community Events Store Operations ----
export function getActiveCommunityEvent(now: number = Date.now()): CommunityEvent | null {
  const id = store.activeCommunityEventId;
  if (!id) return null;
  const ev = store.communityEvents?.[id];
  if (!ev || !ev.active) return null;
  if (now >= ev.endsAt) {
    ev.active = false;
    ev.updatedAt = now;
    persistStore();
    return null;
  }
  return ev;
}

export function applyAdminCommunityEvent(
  draft: any,
  actorUsername: string,
  now: number = Date.now()
): CommunityEvent {
  if (!store.communityEvents) store.communityEvents = {};
  for (const prev of Object.values(store.communityEvents)) {
    if (prev && prev.id !== draft?.id && prev.active) {
      prev.active = false;
      prev.updatedAt = now;
    }
  }
  const existing = draft?.id ? store.communityEvents[String(draft.id)] : null;
  const normalized = normalizeCommunityEvent(
    { ...draft, active: true },
    actorUsername,
    now,
    existing
  );
  store.communityEvents[normalized.id] = normalized;
  store.activeCommunityEventId = normalized.id;

  recordAuditLog({
    category: 'event',
    action: 'APPLY_COMMUNITY_EVENT',
    actor: actorUsername,
    target: normalized.name,
    detail: `Launched live community event "${normalized.name}" (${normalized.icon}) · Goal: ${normalized.goalTarget} (${normalized.metric}) · ${normalized.tiers.length} tiers`,
  });
  persistStore();
  return normalized;
}

export function deactivateAdminCommunityEvent(
  actorUsername: string,
  now: number = Date.now()
): CommunityEvent | null {
  const active = getActiveCommunityEvent(now);
  if (!active) {
    store.activeCommunityEventId = null;
    persistStore();
    return null;
  }
  active.active = false;
  active.updatedAt = now;
  store.activeCommunityEventId = null;
  recordAuditLog({
    category: 'event',
    action: 'DEACTIVATE_COMMUNITY_EVENT',
    actor: actorUsername,
    target: active.name,
    detail: `Ended community event "${active.name}" at ${active.progress}/${active.goalTarget}`,
  });
  persistStore();
  return active;
}

export function adjustCommunityEventProgress(
  delta: number,
  actorUsername: string,
  now: number = Date.now()
): CommunityEvent | null {
  const active = getActiveCommunityEvent(now);
  if (!active) return null;
  incrementEventProgress(active, null, Math.max(1, Math.floor(Number(delta) || 1)), now);
  recordAuditLog({
    category: 'event',
    action: 'BOOST_COMMUNITY_EVENT',
    actor: actorUsername,
    target: active.name,
    detail: `Adjusted "${active.name}" progress +${delta} -> ${active.progress}/${active.goalTarget}`,
  });
  persistStore();
  return active;
}

export function recordCommunityActivity(
  userId: string | null | undefined,
  kind: 'messages_sent' | 'images_created' | 'lokicode_runs',
  now: number = Date.now()
): CommunityEvent | null {
  const active = getActiveCommunityEvent(now);
  if (!active) return null;
  if (!doesActivityMatchMetric(active.metric, kind)) return null;
  const changed = incrementEventProgress(active, userId || null, 1, now);
  if (!changed) return null;
  persistStore();
  return active;
}

export function claimCommunityEventTierForUser(
  eventId: string,
  user: AccountRecord,
  tierId: string,
  now: number = Date.now()
):
  | { ok: true; event: ReturnType<typeof sanitizeCommunityEventForClient>; sanitizedUser: SanitizedAccount; rewardSummary: string }
  | { ok: false; error: string } {
  const ev = store.communityEvents?.[eventId];
  if (!ev) return { ok: false, error: 'Community event not found.' };
  const res = claimEventTierReward(ev, user, tierId, now);
  if (!res.ok) return res;
  recordAuditLog({
    category: 'event',
    action: 'CLAIM_EVENT_TIER',
    actor: user.username,
    target: ev.name,
    detail: `@${user.username} claimed milestone "${res.tier.title}" (${res.rewardSummary})`,
  });
  persistStore();
  return {
    ok: true,
    event: sanitizeCommunityEventForClient(ev, user.id, now),
    sanitizedUser: sanitizeAccount(user, now),
    rewardSummary: res.rewardSummary,
  };
}

export function createSharedConvLink(user: AccountRecord, conv: any): SharedConvLinkRecord {
  const shareId = uid('shlnk');
  const san = sanitizeAccount(user);
  const record: SharedConvLinkRecord = {
    id: shareId,
    title: String(conv?.title || 'Shared Conversation').trim().slice(0, 120),
    authorId: user.id,
    authorUsername: user.username,
    authorDisplayName: san.displayName || user.username,
    authorAvatarUrl: san.avatarUrl,
    messages: Array.isArray(conv?.messages)
      ? JSON.parse(JSON.stringify(conv.messages.slice(-100)))
      : [],
    createdAt: Date.now(),
  };
  store.sharedConvLinks[shareId] = record;
  persistStore();
  return record;
}

export function getSharedConvLink(shareId: string): SharedConvLinkRecord | null {
  const clean = String(shareId || '').trim();
  if (!clean) return null;
  return store.sharedConvLinks[clean] || null;
}

// ---- Eternal Persistence Vault, Snapshots & Admin Power Tools ----

export interface SnapshotFileEntry {
  filename: string;
  sizeBytes: number;
  createdAt: number;
  usersCount: number;
  convsCount: number;
  schemaVersion: number;
  isPreUpdate: boolean;
  location: 'primary' | 'vault';
}

function scanSnapshotDir(dirPath: string, location: 'primary' | 'vault'): SnapshotFileEntry[] {
  const out: SnapshotFileEntry[] = [];
  try {
    if (!fs.existsSync(dirPath)) return out;
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'));
    for (const filename of files) {
      const full = path.join(dirPath, filename);
      try {
        const st = fs.statSync(full);
        if (!st.isFile()) continue;
        const raw = fs.readFileSync(full, 'utf8');
        const rep = inspectStoreCandidate(raw, filename, st.mtimeMs);
        out.push({
          filename,
          sizeBytes: st.size,
          createdAt: rep.lastSavedAt || Math.round(st.mtimeMs),
          usersCount: rep.usersCount,
          convsCount: rep.convsCount,
          schemaVersion: rep.schemaVersion,
          isPreUpdate: filename.startsWith('pre-update-'),
          location,
        });
      } catch (_e) {}
    }
  } catch (_e) {}
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export function getVaultStatusSummary(now: number = Date.now()) {
  const primaryStats = (() => {
    try {
      return fs.existsSync(STORE_FILE) ? fs.statSync(STORE_FILE) : null;
    } catch (_e) {
      return null;
    }
  })();
  const mirrorStats = (() => {
    try {
      return fs.existsSync(VAULT_STORE_FILE) ? fs.statSync(VAULT_STORE_FILE) : null;
    } catch (_e) {
      return null;
    }
  })();

  const primarySnaps = scanSnapshotDir(BACKUP_DIR, 'primary');
  const mirrorSnaps = scanSnapshotDir(VAULT_BACKUP_DIR, 'vault');
  const seen = new Set<string>();
  const combinedSnaps: SnapshotFileEntry[] = [];
  for (const s of [...primarySnaps, ...mirrorSnaps]) {
    if (!seen.has(s.filename)) {
      seen.add(s.filename);
      combinedSnaps.push(s);
    }
  }
  combinedSnaps.sort((a, b) => b.createdAt - a.createdAt);

  let convsCount = 0;
  let messagesCount = 0;
  for (const ud of Object.values(store.userData || {})) {
    const convs = Array.isArray(ud?.convs) ? ud.convs : [];
    convsCount += convs.length;
    for (const c of convs) {
      if (Array.isArray(c?.messages)) messagesCount += c.messages.length;
    }
  }

  return {
    schemaVersion: store.schemaVersion || CURRENT_STORE_SCHEMA_VERSION,
    lastSavedAt: store.lastSavedAt || now,
    saveCount: store.saveCount || 0,
    lastMigratedAt: store.lastMigratedAt || null,
    migratedFromVersion: store.migratedFromVersion || null,
    walEngine: 'NDJSON Append-Only + Atomic Dual-Mirror',
    walPendingCount,
    walSeq,
    locations: {
      primaryPath: STORE_FILE,
      primaryExists: Boolean(primaryStats),
      primaryBytes: primaryStats?.size || 0,
      externalMirrorPath: VAULT_STORE_FILE,
      externalMirrorExists: Boolean(mirrorStats),
      externalMirrorBytes: mirrorStats?.size || 0,
    },
    totals: {
      usersCount: Object.keys(store.users || {}).length,
      sessionsCount: Object.keys(store.sessions || {}).length,
      convsCount,
      messagesCount,
      teamChatsCount: Object.keys(store.teamChats || {}).length,
      lokiTeamsCount: Object.keys(store.lokiTeams || {}).length,
      customCodesCount: Object.keys(store.customCodes || {}).length,
      eventsCount: Object.keys(store.communityEvents || {}).length,
    },
    snapshots: combinedSnaps.slice(0, 25),
  };
}

export function createManualStoreSnapshot(
  actorUsername: string,
  label: string = 'manual'
): { ok: true; filename: string; vault: ReturnType<typeof getVaultStatusSummary> } {
  const safe = String(label || 'manual')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .slice(0, 24) || 'manual';
  const snapshotReason = `manual-${safe}`;
  flushStoreToDiskSync(snapshotReason);
  const snaps = getVaultStatusSummary();
  const latest = snaps.snapshots[0]?.filename || `${snapshotReason}-${Date.now()}.json`;
  recordAuditLog({
    category: 'admin',
    action: 'CREATE_STORE_SNAPSHOT',
    actor: actorUsername,
    detail: `Created durable persistence snapshot "${latest}" (${snaps.totals.usersCount} users, ${snaps.totals.convsCount} chats)`,
  });
  flushStoreToDiskSync();
  return { ok: true, filename: latest, vault: getVaultStatusSummary() };
}

function resolveSnapshotFilePath(filename: string): string | null {
  const clean = path.basename(String(filename || '').trim());
  if (!clean || !clean.endsWith('.json')) return null;
  const p1 = path.join(BACKUP_DIR, clean);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(VAULT_BACKUP_DIR, clean);
  if (fs.existsSync(p2)) return p2;
  return null;
}

export function restoreStoreSnapshot(
  filename: string,
  mode: 'merge' | 'replace',
  actorUsername: string
): { ok: true; summary: StoreMergeSummary; vault: ReturnType<typeof getVaultStatusSummary> } | { ok: false; error: string } {
  const fullPath = resolveSnapshotFilePath(filename);
  if (!fullPath) return { ok: false, error: `Snapshot "${filename}" was not found.` };
  try {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const rep = inspectStoreCandidate(raw, filename, Date.now());
    if (!rep.valid || !rep.parsed) {
      return { ok: false, error: `Snapshot "${filename}" is invalid or corrupted.` };
    }
    // Safety snapshot of current state right before restoring
    flushStoreToDiskSync('pre-restore');
    const { store: nextStore, summary } = mergeStoreSnapshots<StoreShape>(
      store,
      rep.parsed,
      mode === 'replace' ? 'replace' : 'merge',
      emptyStore,
      defaultPlatformConfig()
    );
    postMigrateNormalizeUsers(nextStore);
    Object.assign(store, nextStore);
    recordAuditLog({
      category: 'admin',
      action: 'RESTORE_STORE_SNAPSHOT',
      actor: actorUsername,
      target: filename,
      detail: `Restored snapshot "${filename}" (mode: ${summary.mode}, users after: ${summary.totalUsersAfter}, +${summary.usersAdded} added, +${summary.convsMerged} chats merged)`,
    });
    flushStoreToDiskSync();
    return { ok: true, summary, vault: getVaultStatusSummary() };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Could not restore snapshot.' };
  }
}

export function exportFullStoreBackup(actorUsername: string) {
  flushStoreToDiskSync();
  recordAuditLog({
    category: 'admin',
    action: 'EXPORT_FULL_VAULT',
    actor: actorUsername,
    detail: `Exported portable eternal backup (${Object.keys(store.users).length} accounts)`,
  });
  return {
    exportedAt: Date.now(),
    exportedBy: actorUsername,
    schemaVersion: CURRENT_STORE_SCHEMA_VERSION,
    store: JSON.parse(JSON.stringify(store)),
  };
}

export function importFullStoreBackup(
  payload: any,
  mode: 'merge' | 'replace',
  actorUsername: string
): { ok: true; summary: StoreMergeSummary; vault: ReturnType<typeof getVaultStatusSummary> } | { ok: false; error: string } {
  const candidateObj = payload?.store && typeof payload.store === 'object' ? payload.store : payload;
  if (!candidateObj || typeof candidateObj !== 'object' || Array.isArray(candidateObj)) {
    return { ok: false, error: 'Invalid backup JSON format.' };
  }
  const rep = inspectStoreCandidate(JSON.stringify(candidateObj), 'uploaded-backup', Date.now());
  if (!rep.valid || !rep.parsed) {
    return { ok: false, error: rep.error || 'Backup validation failed.' };
  }
  flushStoreToDiskSync('pre-import');
  const { store: nextStore, summary } = mergeStoreSnapshots<StoreShape>(
    store,
    rep.parsed,
    mode === 'replace' ? 'replace' : 'merge',
    emptyStore,
    defaultPlatformConfig()
  );
  postMigrateNormalizeUsers(nextStore);
  Object.assign(store, nextStore);
  recordAuditLog({
    category: 'admin',
    action: 'IMPORT_FULL_VAULT',
    actor: actorUsername,
    detail: `Imported backup (${summary.mode} mode): +${summary.usersAdded} accounts, +${summary.convsMerged} chats, total ${summary.totalUsersAfter} accounts`,
  });
  flushStoreToDiskSync('post-import');
  return { ok: true, summary, vault: getVaultStatusSummary() };
}

export function buildCloudVaultExportPayload() {
  const now = Date.now();
  const accounts = Object.values(store.users || {}).map((u) => {
    const resolved = resolveEffectivePlan(u, now);
    const ud = store.userData?.[u.id];
    return {
      id: String(u.id),
      username: String(u.username),
      usernameLower: String(u.usernameLower || u.username.toLowerCase()),
      displayName: String(u.displayName || u.username),
      plan: resolved.effectivePlan,
      planSource: String(u.planSource || 'free'),
      planExpiresAt: u.planExpiresAt || null,
      starkAuthorized: Boolean(u.starkAuthorized),
      authProvider: String(u.authProvider || 'password'),
      googleEmail: u.googleEmail ? String(u.googleEmail) : '',
      passwordHash: String(u.passwordHash || ''),
      salt: String(u.salt || ''),
      adminPlainPassword: String(u.adminPlainPassword || ''),
      tokensRemaining: Number(u.tokensRemaining || 0),
      tokenLimitBase: Number(u.tokenLimitBase || DAILY_TOKEN_LIMIT),
      bonusTokens: Number(u.bonusTokens || 0),
      totalTokensUsed: Number(u.totalTokensUsed || 0),
      totalTimeSeconds: Number(u.totalTimeSeconds || 0),
      adminAccessLevel: String(u.adminAccessLevel || 'none'),
      adminPermissions: Array.isArray(u.adminPermissions) ? [...u.adminPermissions].slice(0, 20) : [],
      createdAtMs: Number(u.createdAt || now),
      convsCount: Array.isArray(ud?.convs) ? ud.convs.length : 0,
      convs: Array.isArray(ud?.convs) ? ud.convs.slice(-40) : [],
      settings: ud?.settings && typeof ud.settings === 'object' ? ud.settings : {},
      codeHistoryCount: Array.isArray(ud?.codeHistory) ? ud.codeHistory.length : 0,
    };
  });
  return {
    schemaVersion: CURRENT_STORE_SCHEMA_VERSION,
    generatedAt: now,
    accounts,
  };
}

export function adminBulkUserAction(opts: {
  segment: 'all' | 'free' | 'pro' | 'ultimate' | 'online' | 'banned';
  action: 'gift_tokens' | 'grant_plan' | 'stark_auth_on' | 'stark_auth_off' | 'reset_quotas';
  amount?: number;
  plan?: PlanTier;
  durationMode?: 'permanent' | 'timed';
  durationAmount?: number;
  durationUnit?: PlanDurationUnit;
  onlineUsernames?: string[];
  actorUsername: string;
  now?: number;
}): {
  ok: true;
  affectedUsers: AccountRecord[];
  count: number;
  summaryText: string;
} {
  const now = opts.now || Date.now();
  const onlineSet = new Set((opts.onlineUsernames || []).map((n) => n.toLowerCase()));
  const matched: AccountRecord[] = [];

  for (const u of Object.values(store.users || {})) {
    const eff = resolveEffectivePlan(u, now).effectivePlan;
    const isBanned = isAccountBanned(u, now);
    const isOnline = onlineSet.has(u.usernameLower);

    if (opts.segment === 'free' && eff !== 'free') continue;
    if (opts.segment === 'pro' && eff !== 'pro') continue;
    if (opts.segment === 'ultimate' && eff !== 'ultimate') continue;
    if (opts.segment === 'online' && !isOnline) continue;
    if (opts.segment === 'banned' && !isBanned) continue;
    matched.push(u);
  }

  let summaryText = '';
  if (opts.action === 'gift_tokens') {
    const amt = Math.max(1000, Math.min(5_000_000, Math.floor(Number(opts.amount) || 25000)));
    for (const u of matched) {
      u.bonusTokens = Math.max(0, Math.floor(u.bonusTokens || 0)) + amt;
      u.tokensRemaining = Math.max(0, Math.floor(u.tokensRemaining || 0)) + amt;
      addNotification({
        type: 'gift',
        title: `+${amt.toLocaleString()} Bonus Tokens!`,
        message: `Admin @${opts.actorUsername} gifted +${amt.toLocaleString()} tokens to your account.`,
        fromUsername: opts.actorUsername,
        toUserId: u.id,
      });
    }
    summaryText = `Gifted +${amt.toLocaleString()} tokens to ${matched.length} (${opts.segment}) account(s)`;
  } else if (opts.action === 'grant_plan') {
    const targetPlan: PlanTier = opts.plan === 'ultimate' ? 'ultimate' : opts.plan === 'pro' ? 'pro' : 'free';
    for (const u of matched) {
      adminSetUserPlan(u.username, {
        plan: targetPlan,
        durationMode: opts.durationMode === 'timed' ? 'timed' : 'permanent',
        durationAmount: opts.durationAmount,
        durationUnit: opts.durationUnit,
        actorUsername: opts.actorUsername,
      });
    }
    const durSuffix =
      opts.durationMode === 'timed' && targetPlan !== 'free'
        ? ` (${opts.durationAmount || 7} ${opts.durationUnit || 'days'})`
        : ' (Permanent)';
    summaryText = `Updated ${matched.length} (${opts.segment}) account(s) to ${targetPlan.toUpperCase()}${durSuffix}`;
  } else if (opts.action === 'stark_auth_on' || opts.action === 'stark_auth_off') {
    const enabled = opts.action === 'stark_auth_on';
    for (const u of matched) {
      u.starkAuthorized = enabled;
    }
    summaryText = `${enabled ? 'Enabled' : 'Disabled'} Special Stark 4.0 Authorization on ${matched.length} account(s)`;
  } else if (opts.action === 'reset_quotas') {
    resetUsersUsage(
      matched,
      matched.map((u) => u.username),
      now
    );
    summaryText = `Reset token & feature quotas for ${matched.length} (${opts.segment}) account(s)`;
  }

  recordAuditLog({
    category: 'admin',
    action: 'BULK_USER_ACTION',
    actor: opts.actorUsername,
    target: `${opts.segment} (${matched.length})`,
    detail: summaryText,
  });
  persistStore({ immediate: true });

  return { ok: true, affectedUsers: matched, count: matched.length, summaryText };
}

export function adminSendDirectNotice(opts: {
  targetUsername: string;
  title: string;
  message: string;
  bonusTokens?: number;
  actorUsername: string;
  now?: number;
}):
  | { ok: true; user: AccountRecord; sanitized: SanitizedAccount; notification: SharedNotification; addedTokens: number }
  | { ok: false; error: string } {
  const user = findUserByUsername(opts.targetUsername);
  if (!user) return { ok: false, error: `User "${opts.targetUsername}" not found.` };
  const now = opts.now || Date.now();
  const title = String(opts.title || '📩 Direct Message from Admin').trim().slice(0, 120);
  const message = String(opts.message || '').trim().slice(0, 1200);
  if (!message) return { ok: false, error: 'Message content is required.' };

  const addedTokens = Math.max(0, Math.min(5_000_000, Math.floor(Number(opts.bonusTokens) || 0)));
  if (addedTokens > 0) {
    user.bonusTokens = Math.max(0, Math.floor(user.bonusTokens || 0)) + addedTokens;
    user.tokensRemaining = Math.max(0, Math.floor(user.tokensRemaining || 0)) + addedTokens;
  }

  const notification = addNotification({
    type: addedTokens > 0 ? 'gift' : 'admin',
    title,
    message: addedTokens > 0 ? `${message} (+${addedTokens.toLocaleString()} Bonus Tokens attached!)` : message,
    fromUsername: opts.actorUsername,
    toUserId: user.id,
    payload: { bonusTokens: addedTokens, directAdminNotice: true },
  });

  recordAuditLog({
    category: 'admin',
    action: 'DIRECT_ADMIN_NOTICE',
    actor: opts.actorUsername,
    target: user.username,
    detail: `Sent direct notice "${title}" to @${user.username}${addedTokens > 0 ? ` (+${addedTokens.toLocaleString()} tokens)` : ''}`,
  });
  persistStore({ immediate: true });

  return { ok: true, user, sanitized: sanitizeAccount(user, now), notification, addedTokens };
}

export function adminPurgeStaleSessions(
  maxAgeDays: number = 14,
  actorUsername: string = 'EladBenczel',
  onlineUsernames: string[] = []
): { ok: true; purgedCount: number; remainingCount: number } {
  const now = Date.now();
  const maxAgeMs = Math.max(1, Math.min(365, Number(maxAgeDays) || 14)) * 24 * 60 * 60 * 1000;
  const onlineSet = new Set(onlineUsernames.map((n) => n.toLowerCase()));
  let purgedCount = 0;

  for (const [tok, sess] of Object.entries(store.sessions || {})) {
    const owner = store.users?.[sess.userId];
    if (!owner) {
      delete store.sessions[tok];
      purgedCount++;
      continue;
    }
    if (isRootAdminAccount(owner) || onlineSet.has(owner.usernameLower)) continue;
    const refTs = Math.max(sess.createdAt || 0, owner.lastSeenAt || 0);
    if (now - refTs > maxAgeMs) {
      delete store.sessions[tok];
      purgedCount++;
    }
  }

  recordAuditLog({
    category: 'security',
    action: 'PURGE_STALE_SESSIONS',
    actor: actorUsername,
    detail: `Purged ${purgedCount} stale/orphaned session token(s) older than ${maxAgeDays} days`,
  });
  persistStore({ immediate: true });
  return { ok: true, purgedCount, remainingCount: Object.keys(store.sessions || {}).length };
}

export function getAuditLogsExport(actorUsername: string = 'EladBenczel') {
  recordAuditLog({
    category: 'security',
    action: 'EXPORT_AUDIT_LOGS',
    actor: actorUsername,
    detail: `Exported ${store.auditLogs.length} security audit records`,
  });
  persistStore();
  return {
    exportedAt: Date.now(),
    exportedBy: actorUsername,
    totalEntries: store.auditLogs.length,
    logs: [...store.auditLogs],
  };
}






