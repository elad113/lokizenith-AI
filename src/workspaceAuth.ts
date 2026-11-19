import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

const accountProvider = new GoogleAuthProvider();
accountProvider.addScope('email');
accountProvider.addScope('profile');
accountProvider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let currentUser: User | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    currentUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogleAccount = async (): Promise<{
  firebaseIdToken: string;
  googleIdToken: string | null;
  googleAccessToken: string | null;
  profile: {
    sub: string;
    email: string;
    name: string;
    picture: string;
  };
}> => {
  const result = await signInWithPopup(auth, accountProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const firebaseIdToken = await result.user.getIdToken(true);
  const providerProfile = result.user.providerData?.find((p) => p.providerId === 'google.com') || result.user.providerData?.[0];
  return {
    firebaseIdToken,
    googleIdToken: credential?.idToken || null,
    googleAccessToken: credential?.accessToken || null,
    profile: {
      sub: providerProfile?.uid || result.user.uid,
      email: result.user.email || providerProfile?.email || '',
      name: result.user.displayName || providerProfile?.displayName || '',
      picture: result.user.photoURL || providerProfile?.photoURL || '',
    },
  };
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    currentUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return currentUser;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  currentUser = null;
};

export async function listGmailMessages(maxResults = 8): Promise<any[]> {
  if (!cachedAccessToken) throw new Error('Not authenticated with Gmail');
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`, {
    headers: { Authorization: `Bearer ${cachedAccessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
  const data = await res.json();
  const messages = data.messages || [];
  const details = await Promise.all(
    messages.slice(0, 6).map(async (m: any) => {
      const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
        headers: { Authorization: `Bearer ${cachedAccessToken}` },
      });
      return r.ok ? r.json() : m;
    })
  );
  return details;
}

export async function sendGmailMessage(to: string, subject: string, bodyText: string): Promise<any> {
  if (!cachedAccessToken) throw new Error('Not authenticated with Gmail');
  const rawMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    bodyText,
  ].join('\r\n');

  const encoded = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!res.ok) throw new Error(`Failed to send email: ${res.status}`);
  return res.json();
}
