import { initializeApp } from 'firebase/app';
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
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as Record<string, string>).firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

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
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

const BOOTSTRAPPED_ADMIN_EMAIL = 'benczelelad@gmail.com';
const authListeners: Array<(user: any) => void> = [];

async function ensureUserDocument(user: User) {
  const userPath = `users/${user.uid}`;
  const isBootstrappedAdmin =
    Boolean(user.emailVerified) &&
    String(user.email || '').toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;

  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const displayName = String(user.displayName || user.email?.split('@')[0] || 'Lokizen User')
        .trim()
        .slice(0, 100);
      await setDoc(ref, {
        uid: user.uid,
        displayName: displayName || 'Lokizen User',
        role: isBootstrappedAdmin ? 'admin' : 'user',
        quotaTokens: isBootstrappedAdmin ? 100_000_000 : 1_000_000,
        usedTokens: 0,
        rateLimitRpm: isBootstrappedAdmin ? 1000 : 120,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (user.email) {
        const privRef = doc(db, 'users', user.uid, 'private', 'info');
        await setDoc(privRef, {
          uid: user.uid,
          email: String(user.email).slice(0, 254),
          createdAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
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
  async signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDocument(result.user);
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
    if (!auth.currentUser) return false;
    const path = `apiKeys/${keyMeta.id}`;
    try {
      await setDoc(doc(db, 'apiKeys', keyMeta.id), {
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
      });
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
      return false;
    }
  },
  async revokeKeyInFirestore(keyId: string) {
    if (!auth.currentUser) return false;
    const path = `apiKeys/${keyId}`;
    try {
      const ref = doc(db, 'apiKeys', keyId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, {
          name: snap.data().name,
          status: 'revoked',
          updatedAt: serverTimestamp(),
        });
      }
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
      return false;
    }
  },
  async deleteKeyInFirestore(keyId: string) {
    if (!auth.currentUser) return false;
    const path = `apiKeys/${keyId}`;
    try {
      await deleteDoc(doc(db, 'apiKeys', keyId));
      return true;
    } catch (error) {
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
    if (!auth.currentUser) return false;
    const path = `providers/${prov.id}`;
    try {
      await setDoc(doc(db, 'providers', prov.id), {
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
      });
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
      return false;
    }
  },
  async listUserKeysFromFirestore() {
    if (!auth.currentUser) return [];
    const path = 'apiKeys';
    try {
      const q = query(collection(db, 'apiKeys'), where('ownerId', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
      return [];
    }
  },
  subscribeUserKeys(cb: (keys: any[]) => void) {
    if (!auth.currentUser) return () => {};
    const path = 'apiKeys';
    const q = query(collection(db, 'apiKeys'), where('ownerId', '==', auth.currentUser.uid));
    return onSnapshot(
      q,
      snap => {
        cb(snap.docs.map(d => d.data()));
      },
      error => {
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
    if (!auth.currentUser) return false;
    const uid = auth.currentUser.uid;
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
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid,
          username: String(summary.username || 'User').slice(0, 64),
          plan,
          convsCount: Math.max(0, Math.floor(Number(summary.convsCount) || 0)),
          schemaVersion: Math.max(1, Math.floor(Number(summary.schemaVersion) || 3)),
          settings: settingsObj,
          recentTitles,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, {
          username: String(summary.username || 'User').slice(0, 64),
          convsCount: Math.max(0, Math.floor(Number(summary.convsCount) || 0)),
          schemaVersion: Math.max(1, Math.floor(Number(summary.schemaVersion) || 3)),
          settings: settingsObj,
          recentTitles,
          updatedAt: serverTimestamp(),
        });
      }
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.WRITE, docPath);
      }
      return false;
    }
  },
  async loadPersonalVaultFromCloud() {
    if (!auth.currentUser) return null;
    const uid = auth.currentUser.uid;
    const docPath = `accountVaults/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'accountVaults', uid));
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.GET, docPath);
      }
      return null;
    }
  },
  subscribePersonalVault(cb: (vaultData: any) => void) {
    if (!auth.currentUser) return () => {};
    const uid = auth.currentUser.uid;
    const docPath = `accountVaults/${uid}`;
    return onSnapshot(
      doc(db, 'accountVaults', uid),
      snap => {
        if (snap.exists()) cb(snap.data());
      },
      error => {
        if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
          handleFirestoreError(error, OperationType.GET, docPath);
        }
      }
    );
  },
  async syncAdminVaultToCloud(payload: { schemaVersion: number; accounts: any[] }) {
    if (!auth.currentUser) throw new Error('Sign in with Google Admin (@EladBenczel) to sync to Firebase Cloud.');
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
          await setDoc(ref, { ...recordPayload, createdAt: serverTimestamp() });
        } else {
          await updateDoc(ref, recordPayload);
        }
        synced++;
      } catch (error) {
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
    const path = 'platformVaultAccounts';
    try {
      const snap = await getDocs(collection(db, path));
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
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
      throw error;
    }
  },
};

(window as any).LokiFirebase = LokiFirebaseBridge;
