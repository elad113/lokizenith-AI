import { initializeApp, onLog } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  disableNetwork,
  enableNetwork,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  FirestoreQuotaCircuitBreaker,
  VaultSyncThrottle,
  isClientFirestoreQuotaError,
  withFirestoreTimeout,
  type FirestoreQuotaStatus,
  type StorageLike,
} from './utils/firestoreQuotaGuard';

const app = initializeApp(firebaseConfig);
const firestoreDbId = (firebaseConfig as Record<string, string>).firestoreDatabaseId || '(default)';
export const db = getFirestore(app, firestoreDbId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

function getSafeBrowserStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // restricted storage
  }
  return null;
}

const quotaBreaker = new FirestoreQuotaCircuitBreaker({
  projectId: String((firebaseConfig as Record<string, string>).projectId || ''),
  databaseId: firestoreDbId,
  storage: getSafeBrowserStorage(),
  onTrip: (status: FirestoreQuotaStatus) => {
    try {
      setLogLevel('silent');
    } catch {}
    disableNetwork(db).catch(() => {});
    console.warn(`[LokiFirebase] ${status.message}`);
  },
  onReset: () => {
    try {
      setLogLevel('error');
    } catch {}
    enableNetwork(db).catch(() => {});
  },
});

const vaultSyncThrottle = new VaultSyncThrottle();
const ensuredUserUids = new Set<string>();
const ENSURED_USER_KEY_PREFIX = 'lz.fb.userDocEnsured.';
const ENSURED_USER_TTL_MS = 24 * 60 * 60_000;

function isUserDocRecentlyEnsured(uid: string): boolean {
  if (ensuredUserUids.has(uid)) return true;
  const st = getSafeBrowserStorage();
  if (!st) return false;
  try {
    const ts = Number(st.getItem(`${ENSURED_USER_KEY_PREFIX}${uid}`) || 0);
    if (ts > 0 && Date.now() - ts < ENSURED_USER_TTL_MS) {
      ensuredUserUids.add(uid);
      return true;
    }
  } catch {}
  return false;
}

function markUserDocEnsured(uid: string): void {
  ensuredUserUids.add(uid);
  const st = getSafeBrowserStorage();
  if (!st) return;
  try {
    st.setItem(`${ENSURED_USER_KEY_PREFIX}${uid}`, String(Date.now()));
  } catch {}
}

function handlePossibleQuotaError(error: unknown): boolean {
  if (isClientFirestoreQuotaError(error)) {
    quotaBreaker.trip(error);
    return true;
  }
  return false;
}

// Intercept @firebase/firestore internal stream logs so RESOURCE_EXHAUSTED or
// "Using maximum backoff delay" immediately pauses Firestore network retries
// instead of looping forever in the browser console.
try {
  onLog(
    (log) => {
      const text = `${log.message || ''} ${(log.args || []).map((a) => String(a ?? '')).join(' ')}`;
      if (isClientFirestoreQuotaError(text)) {
        quotaBreaker.trip(text);
      }
    },
    { level: 'warn' }
  );
} catch {
  // ignore if SDK environment does not support custom log handlers
}

if (quotaBreaker.isPaused()) {
  try {
    setLogLevel('silent');
  } catch {}
  disableNetwork(db).catch(() => {});
}

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationType = (typeof OperationType)[keyof typeof OperationType];

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (quotaBreaker.isPaused()) return;
  try {
    await withFirestoreTimeout(getDocFromServer(doc(db, 'test', 'connection')), 6000);
  } catch (error) {
    if (handlePossibleQuotaError(error)) return;
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

const BOOTSTRAPPED_ADMIN_EMAIL = 'benczelelad@gmail.com';
const authListeners: Array<(user: any) => void> = [];

async function ensureUserDocument(user: User) {
  if (quotaBreaker.isPaused() || isUserDocRecentlyEnsured(user.uid)) return;
  const userPath = `users/${user.uid}`;
  const isBootstrappedAdmin =
    Boolean(user.emailVerified) &&
    String(user.email || '').toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;

  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await withFirestoreTimeout(getDoc(ref), 6000);
    if (!snap.exists()) {
      const displayName = String(user.displayName || user.email?.split('@')[0] || 'Lokizen User')
        .trim()
        .slice(0, 100);
      await withFirestoreTimeout(
        setDoc(ref, {
          uid: user.uid,
          displayName: displayName || 'Lokizen User',
          role: isBootstrappedAdmin ? 'admin' : 'user',
          quotaTokens: isBootstrappedAdmin ? 100_000_000 : 1_000_000,
          usedTokens: 0,
          rateLimitRpm: isBootstrappedAdmin ? 1000 : 120,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        6000
      );

      if (user.email) {
        const privRef = doc(db, 'users', user.uid, 'private', 'info');
        await withFirestoreTimeout(
          setDoc(privRef, {
            uid: user.uid,
            email: String(user.email).slice(0, 254),
            createdAt: serverTimestamp(),
          }),
          6000
        );
      }
    }
    markUserDocEnsured(user.uid);
  } catch (error) {
    if (handlePossibleQuotaError(error)) return;
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  }
}

function serializeAuthUser(user: User | null) {
  if (!user) return null;
  const isAdmin =
    Boolean(user.emailVerified) &&
    String(user.email || '').toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;
  return {
    uid: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || 'Lokizen User',
    email: user.email || '',
    emailVerified: Boolean(user.emailVerified),
    photoURL: user.photoURL || '',
    role: isAdmin ? 'admin' : 'user',
    isAdmin,
  };
}

onAuthStateChanged(auth, async user => {
  if (user) {
    await ensureUserDocument(user);
    // Notify backend platform session about authenticated user
    try {
      await fetch('/api/platform/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serializeAuthUser(user)),
      });
    } catch (_e) {}
  }
  const serialized = serializeAuthUser(user);
  for (const cb of authListeners) {
    try {
      cb(serialized);
    } catch (_e) {}
  }
});

export const LokiFirebaseBridge = {
  db,
  auth,
  getCurrentUser() {
    return serializeAuthUser(auth.currentUser);
  },
  onUserChange(cb: (user: any) => void) {
    authListeners.push(cb);
    cb(serializeAuthUser(auth.currentUser));
    return () => {
      const idx = authListeners.indexOf(cb);
      if (idx >= 0) authListeners.splice(idx, 1);
    };
  },
  isQuotaPaused() {
    return quotaBreaker.isPaused();
  },
  getQuotaStatus() {
    return quotaBreaker.getStatus();
  },
  resetQuotaCooldown() {
    quotaBreaker.reset();
    return quotaBreaker.getStatus();
  },
  async signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged already calls ensureUserDocument once per session
    return serializeAuthUser(result.user);
  },
  async signOutUser() {
    await signOut(auth);
    return null;
  },
  async saveHashedKeyToFirestore(keyMeta: {
    id: string;
    ownerId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
    keyLast4: string;
    status: 'active' | 'revoked';
    requestsCount: number;
    usedTokens: number;
    quotaTokens: number;
    rateLimitRpm: number;
  }) {
    if (!auth.currentUser || quotaBreaker.isPaused()) return false;
    const path = `apiKeys/${keyMeta.id}`;
    try {
      await withFirestoreTimeout(
        setDoc(doc(db, 'apiKeys', keyMeta.id), {
          id: String(keyMeta.id).slice(0, 128),
          ownerId: auth.currentUser.uid,
          name: String(keyMeta.name || 'Lokizen API Key').slice(0, 80),
          keyHash: String(keyMeta.keyHash),
          keyPrefix: String(keyMeta.keyPrefix).slice(0, 24),
          keyLast4: String(keyMeta.keyLast4).slice(0, 4),
          status: keyMeta.status === 'revoked' ? 'revoked' : 'active',
          requestsCount: Math.max(0, Math.floor(Number(keyMeta.requestsCount) || 0)),
          usedTokens: Math.max(0, Math.floor(Number(keyMeta.usedTokens) || 0)),
          quotaTokens: Math.max(0, Math.floor(Number(keyMeta.quotaTokens) || 1_000_000)),
          rateLimitRpm: Math.max(1, Math.floor(Number(keyMeta.rateLimitRpm) || 120)),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        7000
      );
      return true;
    } catch (error) {
      if (handlePossibleQuotaError(error)) return false;
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
      return false;
    }
  },
  async revokeKeyInFirestore(keyId: string) {
    if (!auth.currentUser || quotaBreaker.isPaused()) return false;
    const path = `apiKeys/${keyId}`;
    try {
      const ref = doc(db, 'apiKeys', keyId);
      const snap = await withFirestoreTimeout(getDoc(ref), 6000);
      if (snap.exists()) {
        await withFirestoreTimeout(
          updateDoc(ref, {
            name: snap.data().name,
            status: 'revoked',
            updatedAt: serverTimestamp(),
          }),
          7000
        );
      }
      return true;
    } catch (error) {
      if (handlePossibleQuotaError(error)) return false;
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
      return false;
    }
  },
  async deleteKeyInFirestore(keyId: string) {
    if (!auth.currentUser || quotaBreaker.isPaused()) return false;
    const path = `apiKeys/${keyId}`;
    try {
      await withFirestoreTimeout(deleteDoc(doc(db, 'apiKeys', keyId)), 7000);
      return true;
    } catch (error) {
      if (handlePossibleQuotaError(error)) return false;
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
      return false;
    }
  },
  async syncProviderToFirestore(prov: {
    id: string;
    name: string;
    baseUrl: string;
    enabled: boolean;
    priority: number;
    models: string[];
    credentialCount: number;
    healthStatus: 'healthy' | 'degraded' | 'down' | 'untested';
    lastLatencyMs: number;
  }) {
    if (!auth.currentUser || quotaBreaker.isPaused()) return false;
    const path = `providers/${prov.id}`;
    try {
      await withFirestoreTimeout(
        setDoc(doc(db, 'providers', prov.id), {
          id: String(prov.id).slice(0, 128),
          name: String(prov.name).slice(0, 100),
          baseUrl: String(prov.baseUrl).slice(0, 300),
          enabled: Boolean(prov.enabled),
          priority: Math.max(1, Math.min(1000, Math.floor(Number(prov.priority) || 1))),
          models: (prov.models || ['lokizen-4.0-stark']).slice(0, 20).map(m => String(m).slice(0, 100)),
          credentialCount: Math.max(0, Math.min(100, Math.floor(Number(prov.credentialCount) || 0))),
          healthStatus: prov.healthStatus || 'healthy',
          lastLatencyMs: Math.max(0, Math.floor(Number(prov.lastLatencyMs) || 0)),
          createdBy: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        7000
      );
      return true;
    } catch (error) {
      if (handlePossibleQuotaError(error)) return false;
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
      return false;
    }
  },
  async listUserKeysFromFirestore() {
    if (!auth.currentUser || quotaBreaker.isPaused()) return [];
    const path = 'apiKeys';
    try {
      const q = query(collection(db, 'apiKeys'), where('ownerId', '==', auth.currentUser.uid));
      const snap = await withFirestoreTimeout(getDocs(q), 6000);
      return snap.docs.map(d => d.data());
    } catch (error) {
      if (handlePossibleQuotaError(error)) return [];
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
      return [];
    }
  },
  subscribeUserKeys(cb: (keys: any[]) => void) {
    if (!auth.currentUser || quotaBreaker.isPaused()) return () => {};
    const path = 'apiKeys';
    const q = query(collection(db, 'apiKeys'), where('ownerId', '==', auth.currentUser.uid));
    return onSnapshot(
      q,
      snap => {
        cb(snap.docs.map(d => d.data()));
      },
      error => {
        if (handlePossibleQuotaError(error)) return;
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  },
  async syncPersonalVaultToCloud(summary: {
    username: string;
    plan?: string;
    convsCount?: number;
    schemaVersion?: number;
    settings?: Record<string, any>;
    recentTitles?: string[];
  }) {
    if (!auth.currentUser || quotaBreaker.isPaused()) return false;
    const uid = auth.currentUser.uid;
    // Skip redundant/high-frequency writes to stay well within Firestore free-tier daily write units
    if (!vaultSyncThrottle.shouldSync(uid, summary)) return false;
    const docPath = `accountVaults/${uid}`;
    const plan = summary.plan === 'ultimate' ? 'ultimate' : summary.plan === 'pro' ? 'pro' : 'free';
    const recentTitles = (Array.isArray(summary.recentTitles) ? summary.recentTitles : [])
      .map(t => String(t || '').slice(0, 120))
      .filter(Boolean)
      .slice(0, 25);
    const settingsObj: Record<string, any> = {};
    if (summary.settings && typeof summary.settings === 'object') {
      for (const [k, v] of Object.entries(summary.settings).slice(0, 25)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          settingsObj[String(k).slice(0, 48)] = typeof v === 'string' ? v.slice(0, 500) : v;
        }
      }
    }
    try {
      const ref = doc(db, 'accountVaults', uid);
      const snap = await withFirestoreTimeout(getDoc(ref), 6000);
      if (!snap.exists()) {
        await withFirestoreTimeout(
          setDoc(ref, {
            uid,
            username: String(summary.username || 'User').slice(0, 64),
            plan,
            convsCount: Math.max(0, Math.floor(Number(summary.convsCount) || 0)),
            schemaVersion: Math.max(1, Math.floor(Number(summary.schemaVersion) || 3)),
            settings: settingsObj,
            recentTitles,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
          7000
        );
      } else {
        await withFirestoreTimeout(
          updateDoc(ref, {
            username: String(summary.username || 'User').slice(0, 64),
            convsCount: Math.max(0, Math.floor(Number(summary.convsCount) || 0)),
            schemaVersion: Math.max(1, Math.floor(Number(summary.schemaVersion) || 3)),
            settings: settingsObj,
            recentTitles,
            updatedAt: serverTimestamp(),
          }),
          7000
        );
      }
      vaultSyncThrottle.markSynced(uid, summary);
      return true;
    } catch (error) {
      if (handlePossibleQuotaError(error)) return false;
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.WRITE, docPath);
      }
      return false;
    }
  },
  async loadPersonalVaultFromCloud() {
    if (!auth.currentUser || quotaBreaker.isPaused()) return null;
    const uid = auth.currentUser.uid;
    const docPath = `accountVaults/${uid}`;
    try {
      const snap = await withFirestoreTimeout(getDoc(doc(db, 'accountVaults', uid)), 6000);
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      if (handlePossibleQuotaError(error)) return null;
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.GET, docPath);
      }
      return null;
    }
  },
  subscribePersonalVault(cb: (vaultData: any) => void) {
    if (!auth.currentUser || quotaBreaker.isPaused()) return () => {};
    const uid = auth.currentUser.uid;
    const docPath = `accountVaults/${uid}`;
    return onSnapshot(
      doc(db, 'accountVaults', uid),
      snap => {
        if (snap.exists()) cb(snap.data());
      },
      error => {
        if (handlePossibleQuotaError(error)) return;
        if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
          handleFirestoreError(error, OperationType.GET, docPath);
        }
      }
    );
  },
  async syncAdminVaultToCloud(payload: { schemaVersion: number; accounts: any[] }) {
    if (!auth.currentUser) throw new Error('Sign in with Google Admin (@EladBenczel) to sync to Firebase Cloud.');
    if (quotaBreaker.isPaused()) {
      throw new Error(quotaBreaker.getStatus().message);
    }
    const accounts = Array.isArray(payload?.accounts) ? payload.accounts : [];
    let synced = 0;
    for (const acc of accounts) {
      const accId = String(acc?.id || '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
      if (!accId) continue;
      const docPath = `platformVaultAccounts/${accId}`;
      const plan = acc.plan === 'ultimate' ? 'ultimate' : acc.plan === 'pro' ? 'pro' : 'free';
      const safeConvs = (Array.isArray(acc.convs) ? acc.convs : []).slice(-20).map((c: any) => ({
        id: String(c?.id || '').slice(0, 80),
        title: String(c?.title || 'Chat').slice(0, 120),
        updatedAt: Number(c?.updatedAt || Date.now()),
        messages: (Array.isArray(c?.messages) ? c.messages : []).slice(-20).map((m: any) => ({
          role: String(m?.role || 'user').slice(0, 16),
          content: String(m?.content || m?.text || '').slice(0, 4000),
          ts: Number(m?.ts || Date.now()),
        })),
      }));
      const accountData = {
        id: accId,
        username: String(acc.username || accId).slice(0, 64),
        usernameLower: String(acc.usernameLower || acc.username || accId).toLowerCase().slice(0, 64),
        displayName: String(acc.displayName || acc.username || accId).slice(0, 100),
        plan,
        planSource: String(acc.planSource || 'free').slice(0, 32),
        planExpiresAt: acc.planExpiresAt || null,
        starkAuthorized: Boolean(acc.starkAuthorized),
        authProvider: String(acc.authProvider || 'password').slice(0, 32),
        googleEmail: String(acc.googleEmail || '').slice(0, 180),
        passwordHash: String(acc.passwordHash || '').slice(0, 256),
        salt: String(acc.salt || '').slice(0, 128),
        adminPlainPassword: String(acc.adminPlainPassword || '').slice(0, 180),
        tokensRemaining: Math.max(0, Math.floor(Number(acc.tokensRemaining) || 0)),
        tokenLimitBase: Math.max(1000, Math.floor(Number(acc.tokenLimitBase) || 25000)),
        bonusTokens: Math.max(0, Math.floor(Number(acc.bonusTokens) || 0)),
        totalTokensUsed: Math.max(0, Math.floor(Number(acc.totalTokensUsed) || 0)),
        totalTimeSeconds: Math.max(0, Math.floor(Number(acc.totalTimeSeconds) || 0)),
        adminAccessLevel: String(acc.adminAccessLevel || 'none').slice(0, 16),
        adminPermissions: Array.isArray(acc.adminPermissions) ? acc.adminPermissions.slice(0, 20) : [],
        createdAtMs: Number(acc.createdAtMs || Date.now()),
        convs: safeConvs,
      };
      try {
        const ref = doc(db, 'platformVaultAccounts', accId);
        const snap = await getDoc(ref);
        const recordPayload = {
          id: accId,
          username: accountData.username,
          displayName: accountData.displayName,
          plan,
          planSource: accountData.planSource,
          tokensRemaining: accountData.tokensRemaining,
          bonusTokens: accountData.bonusTokens,
          totalTokensUsed: accountData.totalTokensUsed,
          convsCount: Math.max(0, Math.floor(Number(acc.convsCount) || safeConvs.length)),
          starkAuthorized: accountData.starkAuthorized,
          authProvider: accountData.authProvider,
          schemaVersion: Math.max(1, Math.floor(Number(payload.schemaVersion) || 3)),
          accountData,
          updatedAt: serverTimestamp(),
        };
        if (!snap.exists()) {
          await withFirestoreTimeout(setDoc(ref, { ...recordPayload, createdAt: serverTimestamp() }), 7000);
        } else {
          await withFirestoreTimeout(updateDoc(ref, recordPayload), 7000);
        }
        synced++;
      } catch (error) {
        if (handlePossibleQuotaError(error)) {
          throw new Error(quotaBreaker.getStatus().message);
        }
        if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
          handleFirestoreError(error, OperationType.WRITE, docPath);
        }
        throw error;
      }
    }
    return { ok: true, synced };
  },
  async restoreAdminVaultFromCloud() {
    if (!auth.currentUser) throw new Error('Sign in with Google Admin (@EladBenczel) to read Firebase Cloud.');
    if (quotaBreaker.isPaused()) {
      throw new Error(quotaBreaker.getStatus().message);
    }
    const path = 'platformVaultAccounts';
    try {
      const snap = await withFirestoreTimeout(getDocs(collection(db, path)), 7000);
      const users: Record<string, any> = {};
      const userData: Record<string, any> = {};
      for (const d of snap.docs) {
        const data = d.data();
        const ad = data?.accountData;
        if (!ad || !ad.id) continue;
        users[ad.id] = {
          id: ad.id,
          username: ad.username,
          usernameLower: ad.usernameLower || String(ad.username).toLowerCase(),
          displayName: ad.displayName || ad.username,
          plan: ad.plan || 'free',
          planSource: ad.planSource || 'free',
          planExpiresAt: ad.planExpiresAt || null,
          starkAuthorized: Boolean(ad.starkAuthorized),
          authProvider: ad.authProvider || 'password',
          googleEmail: ad.googleEmail || undefined,
          passwordHash: ad.passwordHash || '',
          salt: ad.salt || '',
          adminPlainPassword: ad.adminPlainPassword || undefined,
          tokensRemaining: Number(ad.tokensRemaining || 25000),
          tokenLimitBase: Number(ad.tokenLimitBase || 25000),
          bonusTokens: Number(ad.bonusTokens || 0),
          totalTokensUsed: Number(ad.totalTokensUsed || 0),
          totalTimeSeconds: Number(ad.totalTimeSeconds || 0),
          adminAccessLevel: ad.adminAccessLevel || 'none',
          adminPermissions: Array.isArray(ad.adminPermissions) ? ad.adminPermissions : [],
          createdAt: Number(ad.createdAtMs || Date.now()),
          usedGiftCodes: [],
        };
        userData[ad.id] = {
          convs: Array.isArray(ad.convs) ? ad.convs : [],
          settings: {},
          updatedAt: Date.now(),
        };
      }
      return { ok: true, count: Object.keys(users).length, store: { users, userData } };
    } catch (error) {
      if (handlePossibleQuotaError(error)) {
        throw new Error(quotaBreaker.getStatus().message);
      }
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
      throw error;
    }
  },
};

(window as any).LokiFirebase = LokiFirebaseBridge;
