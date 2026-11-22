import crypto from 'crypto';
import { DISPLAY_NAME_COOLDOWN_MS, formatCooldownRemaining } from './profileAndFormulaUtils.ts';
import {
  PLAN_CONFIGS,
  resolveEffectivePlan,
  getPlanPurchaseOptions,
  refreshAndGetFeatureQuotas,
  type PlanTier,
  type PlanStatus,
  type FeatureQuotaStatus,
  type QuotaFeatureType,
} from './subscriptionPlans.ts';

export const DAILY_TOKEN_LIMIT = 25000;
export const PRO_TOKEN_LIMIT = 125000; // 5x more usage than Free
export const REFERRAL_BONUS = 25000;
export const RESET_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const ADMIN_USERNAME = 'EladBenczel';
export const ADMIN_USERNAME_LOWER = 'eladbenczel';
export const ADMIN_EMAIL_LOWER = 'benczelelad@gmail.com';
export const UNLIMITED_USERNAME_LOWER = 'oron';

export type AdminAccessLevel = 'none' | 'partial' | 'full';
export type AdminModuleId =
  | 'directory'
  | 'access'
  | 'xray'
  | 'reports'
  | 'knowledge'
  | 'soundboard'
  | 'broadcast'
  | 'leaderboards'
  | 'codes'
  | 'security'
  | 'platform'
  | 'maintenance'
  | 'vault';

export const ALL_ADMIN_MODULES: AdminModuleId[] = [
  'directory',
  'access',
  'xray',
  'reports',
  'knowledge',
  'soundboard',
  'broadcast',
  'leaderboards',
  'codes',
  'security',
  'platform',
  'maintenance',
  'vault',
];

export const GIFT_CODES: Record<string, number> = {
  Lokizen4: 20000,
  LokizenAI: 25000,
  Stark4: 40000,
};

export const DEV_CODE = 'fckron';
export const DEV_ULTIMATE_FOREVER_CODE = 'Ronmagniv';
export const DEV_CODES = ['fckron', 'oron2008', 'Ronmagniv'] as const;
export const DEV_CODE_BONUS = 200000;

export interface DeviceMetadata {
  deviceType?: string;
  os?: string;
  browser?: string;
  platform?: string;
  screen?: string;
  timezone?: string;
  language?: string;
  ip?: string;
  userAgent?: string;
  updatedAt?: number;
}

export interface AccountRecord {
  id: string;
  username: string;
  usernameLower: string;
  displayName?: string;
  displayNameChangeCount?: number;
  lastDisplayNameChangeAt?: number;
  avatarUrl?: string;
  bannerUrl?: string;
  bannerVideoUrl?: string;
  bio?: string;
  customStatus?: string;
  pronouns?: string;
  profileBg?: string;
  profileOverlay?: string;
  profileAccent?: string;
  profileBadges?: string[];
  passwordHash: string;
  salt: string;
  adminPlainPassword?: string;
  authProvider?: 'password' | 'google';
  googleId?: string;
  googleEmail?: string;
  googleAvatar?: string;
  unlimitedOverride?: boolean;
  adminPlanTestMode?: boolean;
  adminAccessLevel?: AdminAccessLevel;
  adminPermissions?: string[];
  // Subscription Plan & Feature Quotas
  plan?: PlanTier;
  planStatus?: PlanStatus;
  planStartedAt?: number | null;
  planExpiresAt?: number | null;
  planDurationLabel?: string | null;
  planCanceledAt?: number | null;
  usedUltimateTrial?: boolean;
  paypalSubscriptionId?: string | null;
  paypalPlanId?: string | null;
  paypalStatus?: string | null;
  paypalNextBillingAt?: number | null;
  paypalLastSyncedAt?: number | null;
  planSource?: 'free' | 'paypal' | 'admin' | 'event';
  starkAuthorized?: boolean;
  imagesUsed?: number;
  imagesResetAt?: number;
  lokiCodeUsed?: number;
  lokiCodeResetAt?: number;
  starkUsed?: number;
  starkResetAt?: number;
  attachmentsUsed?: number;
  attachmentsResetAt?: number;
  weeklySharesUsed?: number;
  weeklySharesResetAt?: number;
  // Token Quota
  tokensRemaining: number;
  tokenLimitBase: number;
  bonusTokens?: number;
  lastResetAt: number;
  usedGiftCodes: string[];
  totalTokensUsed: number;
  createdAt: number;
  inviteCode?: string;
  invitedBy?: string;
  referralCount?: number;
  referralTokensEarned?: number;
  lastSeenAt?: number;
  totalTimeSeconds?: number;
  loginCount?: number;
  deviceInfo?: DeviceMetadata;
  deviceHistory?: DeviceMetadata[];
  banned?: boolean;
  bannedPermanent?: boolean;
  bannedUntil?: number | null;
  banReason?: string;
  bannedBy?: string;
  bannedAt?: number;
}

export interface BanInfo {
  banned: boolean;
  permanent: boolean;
  bannedUntil: number | null;
  reason?: string;
  remainingText: string;
}

export interface SanitizedAccount {
  id: string;
  username: string;
  displayName: string;
  displayNameChangeCount: number;
  lastDisplayNameChangeAt: number | null;
  displayNameCooldownMs: number;
  displayNameCooldownText: string;
  displayNameFreeAvailable: boolean;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bannerVideoUrl: string | null;
  bio: string;
  customStatus: string;
  pronouns: string;
  profileBg: string;
  profileOverlay: string;
  profileAccent: string;
  profileBadges: string[];
  isAdmin: boolean;
  isRootAdmin: boolean;
  adminAccessLevel: AdminAccessLevel;
  adminPermissions: string[];
  isUnlimited: boolean;
  unlimitedOverride?: boolean;
  adminPlanTestMode?: boolean;
  // Subscription Plan & Quotas
  plan: PlanTier;
  effectivePlan: PlanTier;
  planTier: PlanTier;
  planName: string;
  planTag: 'FREE' | 'PRO' | 'ULTIMATE';
  planStatus: PlanStatus;
  planSource: 'free' | 'paypal' | 'admin' | 'event';
  planStartedAt: number | null;
  planExpiresAt: number | null;
  planDurationLabel?: string | null;
  planCanceledAt: number | null;
  isCanceledButActive: boolean;
  isTrialing: boolean;
  usedUltimateTrial: boolean;
  paypalSubscriptionId: string | null;
  paypalPlanId: string | null;
  paypalStatus: string | null;
  paypalNextBillingAt: number | null;
  paypalLastSyncedAt: number | null;
  starkAuthorized: boolean;
  purchaseOptions: ReturnType<typeof getPlanPurchaseOptions>;
  featureQuotas: Record<QuotaFeatureType, FeatureQuotaStatus>;
  planBenefits: {
    animatedBackgrounds: boolean;
    animatedVideoBanner: boolean;
    ultraThinkingUnlocked: boolean;
    aiDesignUnlocked: boolean;
  };
  authProvider?: 'password' | 'google';
  googleEmail?: string | null;
  googleAvatar?: string | null;
  googlePicture?: string | null;
  tokensRemaining: number;
  tokenLimitBase: number;
  bonusTokens: number;
  tokenLimitEffective: number;
  percentRemaining: number;
  lastResetAt: number;
  nextResetAt: number;
  usedGiftCodes: string[];
  totalTokensUsed: number;
  createdAt: number;
  inviteCode: string;
  referralCount: number;
  referralTokensEarned: number;
  lastSeenAt: number;
  totalTimeSeconds: number;
  banInfo: BanInfo | null;
}

export interface AdminSanitizedAccount extends SanitizedAccount {
  adminPassword: string | null;
  invitedBy: string | null;
  loginCount: number;
  deviceInfo: DeviceMetadata | null;
  deviceHistory: DeviceMetadata[];
}

export function normalizeUsername(raw: string): { valid: boolean; username: string; usernameLower: string; error?: string } {
  const trimmed = String(raw || '').trim();
  if (trimmed.length < 2) {
    return { valid: false, username: trimmed, usernameLower: trimmed.toLowerCase(), error: 'Username must be at least 2 characters.' };
  }
  if (trimmed.length > 28) {
    return { valid: false, username: trimmed, usernameLower: trimmed.toLowerCase(), error: 'Username must be at most 28 characters.' };
  }
  if (!/^[a-zA-Z0-9_.\-\u0590-\u05FF\u0600-\u06FF ]+$/.test(trimmed)) {
    return { valid: false, username: trimmed, usernameLower: trimmed.toLowerCase(), error: 'Username contains invalid characters.' };
  }
  return { valid: true, username: trimmed, usernameLower: trimmed.toLowerCase() };
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash: derived, salt: actualSalt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  if (!password || !storedHash || !salt) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const target = Buffer.from(storedHash, 'hex');
  if (derived.length !== target.length) return false;
  return crypto.timingSafeEqual(derived, target);
}

export function isAdminUsername(username: string, email?: string | null): boolean {
  const u = String(username || '').trim().toLowerCase();
  const e = String(email || '').trim().toLowerCase();
  return u === ADMIN_USERNAME_LOWER || e === ADMIN_EMAIL_LOWER;
}

export function isRootAdminAccount(account?: Partial<AccountRecord> | null): boolean {
  if (!account) return false;
  return isAdminUsername(account.username || '', account.googleEmail);
}

export function getAccountAdminAccess(account?: Partial<AccountRecord> | null): {
  isAdmin: boolean;
  isRootAdmin: boolean;
  accessLevel: AdminAccessLevel;
  permissions: string[];
} {
  if (!account) {
    return { isAdmin: false, isRootAdmin: false, accessLevel: 'none', permissions: [] };
  }
  if (isRootAdminAccount(account)) {
    return {
      isAdmin: true,
      isRootAdmin: true,
      accessLevel: 'full',
      permissions: [...ALL_ADMIN_MODULES],
    };
  }
  const level = account.adminAccessLevel;
  if (level === 'full') {
    return {
      isAdmin: true,
      isRootAdmin: false,
      accessLevel: 'full',
      permissions: [...ALL_ADMIN_MODULES],
    };
  }
  if (level === 'partial') {
    const validSet = new Set<string>(ALL_ADMIN_MODULES);
    const perms = (Array.isArray(account.adminPermissions) ? account.adminPermissions : [])
      .map((p) => String(p || '').trim())
      .filter((p) => validSet.has(p));
    const finalPerms = perms.length > 0 ? perms : ['directory', 'leaderboards'];
    return {
      isAdmin: true,
      isRootAdmin: false,
      accessLevel: 'partial',
      permissions: finalPerms,
    };
  }
  return { isAdmin: false, isRootAdmin: false, accessLevel: 'none', permissions: [] };
}

export function hasAdminAccess(account?: Partial<AccountRecord> | null): boolean {
  return getAccountAdminAccess(account).isAdmin;
}

export function hasAdminModulePermission(
  account: Partial<AccountRecord> | null | undefined,
  moduleId: AdminModuleId
): boolean {
  const access = getAccountAdminAccess(account);
  if (!access.isAdmin) return false;
  if (access.isRootAdmin || access.accessLevel === 'full') return true;
  return access.permissions.includes(moduleId);
}

export function isUnlimitedUsername(username: string, email?: string | null): boolean {
  const u = String(username || '').trim().toLowerCase();
  return u === UNLIMITED_USERNAME_LOWER || isAdminUsername(u, email);
}

export function isQuotaUnlimitedAccount(account?: Partial<AccountRecord> | null): boolean {
  if (!account) return false;
  if (account.adminPlanTestMode) return false;
  if (account.unlimitedOverride) return true;
  return isUnlimitedUsername(account.username || '', account.googleEmail);
}

export function generateInviteCode(_seed?: string): string {
  return String(crypto.randomInt(10000000, 99999999));
}

export function parseDeviceMetadata(
  userAgent: string = '',
  clientDevice?: Record<string, any>,
  ip: string = ''
): DeviceMetadata {
  const ua = String(userAgent || '').trim().slice(0, 320);
  let deviceType = 'Desktop';
  if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(ua)) deviceType = 'Tablet';
  else if (/mobile|iphone|ipod|android.*mobi|blackberry|iemobile|opera mini/i.test(ua)) deviceType = 'Mobile';

  let os = 'Unknown OS';
  if (/windows nt 10\.0|windows nt 11/i.test(ua)) os = 'Windows 10/11';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS';
  else if (/cros/i.test(ua)) os = 'ChromeOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/chrome\/|crios\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/safari\//i.test(ua) && !/chrome|crios|android/i.test(ua)) browser = 'Safari';

  const cleanStr = (v: any, max = 80) => String(v || '').trim().slice(0, max);
  return {
    deviceType,
    os,
    browser,
    platform: cleanStr(clientDevice?.platform) || os,
    screen: cleanStr(clientDevice?.screen, 40) || undefined,
    timezone: cleanStr(clientDevice?.timezone, 64) || undefined,
    language: cleanStr(clientDevice?.language, 24) || undefined,
    ip: cleanStr(ip, 64) || undefined,
    userAgent: ua || undefined,
    updatedAt: Date.now(),
  };
}

export function getAccountPlanBaseTokens(account: Partial<AccountRecord>, now: number = Date.now()): number {
  const resolved = resolveEffectivePlan(account, now);
  return PLAN_CONFIGS[resolved.effectivePlan].tokenLimitBase;
}

export function getEffectiveTokenLimit(account: Partial<AccountRecord>, now: number = Date.now()): number {
  const base = getAccountPlanBaseTokens(account, now);
  const bonus = Math.max(0, Math.floor(account.bonusTokens || 0));
  return base + bonus;
}

/**
 * Checks whether 6 hours have passed since `lastResetAt` and refreshes feature quotas.
 * - Free plan base: 25,000 tokens
 * - Pro plan base: 125,000 tokens (5x more usage)
 * - Ultimate plan: Unlimited tokens
 */
export function refreshQuotaIfDue(account: AccountRecord, now: number = Date.now()): boolean {
  let changed = false;
  const resolved = resolveEffectivePlan(account, now);
  if (resolved.expired && account.plan && account.plan !== 'free') {
    account.plan = 'free';
    account.planStatus = 'active';
    account.planSource = 'free';
    account.planExpiresAt = null;
    account.planDurationLabel = null;
    changed = true;
  }
  const isUnlUser = isQuotaUnlimitedAccount(account);
  const featQuotas = refreshAndGetFeatureQuotas(account, now, isUnlUser);
  if (featQuotas.changed) changed = true;
  const targetBase = PLAN_CONFIGS[resolved.effectivePlan].tokenLimitBase;

  if (account.tokenLimitBase !== targetBase) {
    const prevBase = account.tokenLimitBase || DAILY_TOKEN_LIMIT;
    account.tokenLimitBase = targetBase;
    if (targetBase > prevBase) {
      // Upgraded to Pro/Ultimate: boost remaining tokens by the difference
      account.tokensRemaining = Math.max(0, account.tokensRemaining || 0) + (targetBase - prevBase);
    } else if (!isUnlUser && account.tokensRemaining > targetBase + (account.bonusTokens || 0)) {
      account.tokensRemaining = targetBase + (account.bonusTokens || 0);
    }
    changed = true;
  }

  if (!account.lastResetAt || now - account.lastResetAt >= RESET_INTERVAL_MS) {
    account.tokenLimitBase = targetBase;
    account.bonusTokens = 0;
    account.tokensRemaining = targetBase;
    account.lastResetAt = now;
    changed = true;
  }
  return changed;
}

export function computePercentRemaining(tokensRemaining: number, effectiveLimit: number = DAILY_TOKEN_LIMIT): number {
  const limit = Math.max(1, effectiveLimit || DAILY_TOKEN_LIMIT);
  const rem = Math.max(0, tokensRemaining);
  return Math.min(100, Math.round((rem / limit) * 100));
}

export function formatBanRemaining(
  bannedUntil: number | null | undefined,
  permanent: boolean,
  now: number = Date.now()
): string {
  if (permanent) return 'Permanent (Forever)';
  if (!bannedUntil || bannedUntil <= now) return 'Expired';
  const diffSec = Math.max(1, Math.floor((bannedUntil - now) / 1000));
  const years = Math.floor(diffSec / (365 * 86400));
  const remAfterYears = diffSec % (365 * 86400);
  const months = Math.floor(remAfterYears / (30 * 86400));
  const remAfterMonths = remAfterYears % (30 * 86400);
  const days = Math.floor(remAfterMonths / 86400);
  const remAfterDays = remAfterMonths % 86400;
  const hours = Math.floor(remAfterDays / 3600);
  const mins = Math.floor((remAfterDays % 3600) / 60);
  const secs = remAfterDays % 60;
  const parts: string[] = [];
  if (years) parts.push(`${years}y`);
  if (months) parts.push(`${months}mo`);
  if (days) parts.push(`${days}d`);
  if (hours || parts.length) parts.push(`${hours}h`);
  if (mins || parts.length) parts.push(`${mins}m`);
  if (!parts.length) parts.push(`${secs}s`);
  return parts.slice(0, 4).join(' ');
}

export function isAccountBanned(account: AccountRecord, now: number = Date.now()): boolean {
  if (!account.banned) return false;
  if (account.bannedPermanent) return true;
  if (account.bannedUntil && now >= account.bannedUntil) {
    account.banned = false;
    account.bannedPermanent = false;
    account.bannedUntil = null;
    account.banReason = undefined;
    account.bannedBy = undefined;
    account.bannedAt = undefined;
    return false;
  }
  return true;
}

export function getBanInfo(account: AccountRecord, now: number = Date.now()): BanInfo | null {
  if (!isAccountBanned(account, now)) return null;
  const permanent = !!account.bannedPermanent;
  const bannedUntil = permanent ? null : (account.bannedUntil ?? null);
  return {
    banned: true,
    permanent,
    bannedUntil,
    reason: account.banReason || undefined,
    remainingText: formatBanRemaining(bannedUntil, permanent, now),
  };
}

export function sanitizeAccount(account: AccountRecord, now: number = Date.now()): SanitizedAccount {
  refreshQuotaIfDue(account, now);
  const banInfo = getBanInfo(account, now);
  const adminAccess = getAccountAdminAccess(account);
  const resolvedPlan = resolveEffectivePlan(account, now);
  const effectivePlan = resolvedPlan.effectivePlan;
  const planCfg = PLAN_CONFIGS[effectivePlan];
  const isRootOrVip = isQuotaUnlimitedAccount(account);
  const unlimited = isRootOrVip || planCfg.unlimitedTokens;
  const base = planCfg.tokenLimitBase;
  const bonusTokens = unlimited ? 0 : Math.max(0, Math.floor(account.bonusTokens || 0));
  const tokenLimitEffective = base + bonusTokens;
  const remaining = unlimited ? base : Math.max(0, Math.floor(account.tokensRemaining));

  const featQuotas = refreshAndGetFeatureQuotas(account, now, isRootOrVip);
  const purchaseOptions = getPlanPurchaseOptions(account, now);

  const changeCount = Math.max(0, Math.floor(account.displayNameChangeCount || 0));
  const lastChangeAt = account.lastDisplayNameChangeAt || null;
  const cooldownMs =
    changeCount >= 1 && lastChangeAt
      ? Math.max(0, DISPLAY_NAME_COOLDOWN_MS - Math.max(0, now - lastChangeAt))
      : 0;
  const effectiveAvatar = account.avatarUrl || account.googleAvatar || null;

  return {
    id: account.id,
    username: account.username,
    displayName: String(account.displayName || account.username).trim() || account.username,
    displayNameChangeCount: changeCount,
    lastDisplayNameChangeAt: lastChangeAt,
    displayNameCooldownMs: cooldownMs,
    displayNameCooldownText: formatCooldownRemaining(cooldownMs),
    displayNameFreeAvailable: changeCount === 0,
    avatarUrl: effectiveAvatar,
    bannerUrl: account.bannerUrl || null,
    bannerVideoUrl: account.bannerVideoUrl || null,
    bio: String(account.bio || ''),
    customStatus: String(account.customStatus || ''),
    pronouns: String(account.pronouns || ''),
    profileBg: String(account.profileBg || 'nebula'),
    profileOverlay: String(account.profileOverlay || 'sparks'),
    profileAccent: String(account.profileAccent || '#00ff9c'),
    profileBadges: Array.isArray(account.profileBadges) ? [...account.profileBadges] : [],
    isAdmin: adminAccess.isAdmin,
    isRootAdmin: adminAccess.isRootAdmin,
    adminAccessLevel: adminAccess.accessLevel,
    adminPermissions: adminAccess.permissions,
    isUnlimited: unlimited,
    unlimitedOverride: !!account.unlimitedOverride,
    adminPlanTestMode: !!account.adminPlanTestMode,
    plan: effectivePlan,
    effectivePlan,
    planTier: effectivePlan,
    planName: planCfg.name,
    planTag: planCfg.shortTag,
    planStatus: resolvedPlan.status,
    planSource: account.planSource || (effectivePlan === 'free' ? 'free' : account.paypalSubscriptionId ? 'paypal' : 'admin'),
    planStartedAt: account.planStartedAt || null,
    planExpiresAt: resolvedPlan.expiresAt,
    planDurationLabel: effectivePlan === 'free' ? null : (account.planDurationLabel || null),
    planCanceledAt: account.planCanceledAt || null,
    isCanceledButActive: resolvedPlan.isCanceledButActive,
    isTrialing: resolvedPlan.isTrialing,
    usedUltimateTrial: !!account.usedUltimateTrial,
    paypalSubscriptionId: account.paypalSubscriptionId || null,
    paypalPlanId: account.paypalPlanId || null,
    paypalStatus: account.paypalStatus || null,
    paypalNextBillingAt: account.paypalNextBillingAt || null,
    paypalLastSyncedAt: account.paypalLastSyncedAt || null,
    starkAuthorized: !!account.starkAuthorized || isRootOrVip || effectivePlan === 'ultimate',
    purchaseOptions,
    featureQuotas: {
      image: featQuotas.image,
      lokicode: featQuotas.lokicode,
      stark: featQuotas.stark,
      attachment: featQuotas.attachment,
      share_chat: featQuotas.share_chat,
    },
    planBenefits: {
      animatedBackgrounds: planCfg.animatedBackgrounds || isRootOrVip,
      animatedVideoBanner: planCfg.animatedVideoBanner || isRootOrVip,
      ultraThinkingUnlocked: planCfg.ultraThinkingUnlocked || isRootOrVip,
      aiDesignUnlocked: planCfg.aiDesignUnlocked || isRootOrVip,
    },
    authProvider: account.authProvider || (account.googleEmail ? 'google' : 'password'),
    googleEmail: account.googleEmail || null,
    googleAvatar: account.googleAvatar || null,
    googlePicture: effectiveAvatar,
    tokensRemaining: remaining,
    tokenLimitBase: base,
    bonusTokens,
    tokenLimitEffective,
    percentRemaining: unlimited ? 100 : computePercentRemaining(remaining, tokenLimitEffective),
    lastResetAt: account.lastResetAt,
    nextResetAt: account.lastResetAt + RESET_INTERVAL_MS,
    usedGiftCodes: Array.isArray(account.usedGiftCodes) ? [...account.usedGiftCodes] : [],
    totalTokensUsed: account.totalTokensUsed || 0,
    createdAt: account.createdAt,
    inviteCode: account.inviteCode || '',
    referralCount: account.referralCount || 0,
    referralTokensEarned: account.referralTokensEarned || 0,
    lastSeenAt: account.lastSeenAt || account.createdAt || now,
    totalTimeSeconds: Math.max(0, Math.floor(account.totalTimeSeconds || 0)),
    banInfo,
  };
}

export function sanitizeAdminAccount(account: AccountRecord, now: number = Date.now()): AdminSanitizedAccount {
  return {
    ...sanitizeAccount(account, now),
    adminPassword: account.adminPlainPassword || null,
    invitedBy: account.invitedBy || null,
    loginCount: Math.max(1, Math.floor(account.loginCount || 1)),
    deviceInfo: account.deviceInfo || null,
    deviceHistory: Array.isArray(account.deviceHistory) ? account.deviceHistory : [],
  };
}

export function applyTokenConsumption(
  account: AccountRecord,
  tokensUsed: number,
  now: number = Date.now()
): { allowed: boolean; consumed: number; remaining: number; exhausted: boolean; isUnlimited?: boolean } {
  refreshQuotaIfDue(account, now);
  const amount = Math.max(1, Math.floor(tokensUsed || 0));
  const resolved = resolveEffectivePlan(account, now);
  const planUnl = PLAN_CONFIGS[resolved.effectivePlan].unlimitedTokens;
  if (isQuotaUnlimitedAccount(account) || planUnl) {
    account.totalTokensUsed = (account.totalTokensUsed || 0) + amount;
    return {
      allowed: true,
      consumed: 0,
      remaining: account.tokensRemaining,
      exhausted: false,
      isUnlimited: true,
    };
  }
  if (account.tokensRemaining <= 0) {
    account.tokensRemaining = 0;
    return { allowed: false, consumed: 0, remaining: 0, exhausted: true };
  }
  const actualConsumed = Math.min(account.tokensRemaining, amount);
  account.tokensRemaining = Math.max(0, account.tokensRemaining - actualConsumed);
  account.totalTokensUsed = (account.totalTokensUsed || 0) + actualConsumed;
  return {
    allowed: true,
    consumed: actualConsumed,
    remaining: account.tokensRemaining,
    exhausted: account.tokensRemaining <= 0,
  };
}

export interface RedeemResult {
  ok: boolean;
  kind?: 'gift' | 'dev';
  codeType?: 'gift' | 'dev';
  code?: string;
  addedTokens?: number;
  tokensRemaining?: number;
  tokenLimitEffective?: number;
  grantedUltimateForever?: boolean;
  plan?: PlanTier;
  isUnlimited?: boolean;
  message?: string;
  error?: string;
}

export function redeemTokenCode(
  account: AccountRecord,
  rawCode: string,
  kindHint?: 'gift' | 'dev',
  now: number = Date.now()
): RedeemResult {
  refreshQuotaIfDue(account, now);
  const code = String(rawCode || '').trim();
  if (!code) {
    return { ok: false, error: 'Please enter a code.' };
  }

  const matchedDev = DEV_CODES.find((d) => d.toLowerCase() === code.toLowerCase());
  if (matchedDev) {
    if (kindHint === 'gift') {
      return { ok: false, error: 'That is a DEV CODE. Please submit it in the DEV CODE section.' };
    }
    if (matchedDev.toLowerCase() === DEV_ULTIMATE_FOREVER_CODE.toLowerCase()) {
      account.plan = 'ultimate';
      account.planStatus = 'active';
      account.planSource = 'admin';
      account.planStartedAt = account.planStartedAt || now;
      account.planExpiresAt = null;
      account.planDurationLabel = 'Forever (Dev Ultimate)';
      account.planCanceledAt = null;
      account.unlimitedOverride = true;
      account.adminPlanTestMode = false;
      account.starkAuthorized = true;
      account.tokenLimitBase = PLAN_CONFIGS.ultimate.tokenLimitBase;
      account.bonusTokens = Math.max(0, account.bonusTokens || 0) + DEV_CODE_BONUS;
      account.tokensRemaining = Math.max(0, account.tokensRemaining || 0) + DEV_CODE_BONUS;
      refreshQuotaIfDue(account, now);
      return {
        ok: true,
        kind: 'dev',
        codeType: 'dev',
        code: matchedDev,
        addedTokens: DEV_CODE_BONUS,
        grantedUltimateForever: true,
        plan: 'ultimate',
        isUnlimited: true,
        tokensRemaining: account.tokensRemaining,
        tokenLimitEffective: getEffectiveTokenLimit(account, now),
        message: 'Loki Ultimate Forever & Infinite Access unlocked for everything!',
      };
    }
    account.bonusTokens = Math.max(0, account.bonusTokens || 0) + DEV_CODE_BONUS;
    account.tokensRemaining = Math.max(0, account.tokensRemaining) + DEV_CODE_BONUS;
    return {
      ok: true,
      kind: 'dev',
      codeType: 'dev',
      code: matchedDev,
      addedTokens: DEV_CODE_BONUS,
      tokensRemaining: account.tokensRemaining,
      tokenLimitEffective: getEffectiveTokenLimit(account, now),
    };
  }

  if (kindHint === 'dev') {
    return { ok: false, error: 'Invalid DEV CODE.' };
  }

  const giftEntry = Object.entries(GIFT_CODES).find(([k]) => k.toLowerCase() === code.toLowerCase());
  if (giftEntry) {
    const [canonicalCode, giftBonus] = giftEntry;
    account.usedGiftCodes = Array.isArray(account.usedGiftCodes) ? account.usedGiftCodes : [];
    if (account.usedGiftCodes.some((u) => u.toLowerCase() === canonicalCode.toLowerCase())) {
      return { ok: false, error: 'This gift code has already been redeemed on this account.' };
    }
    account.usedGiftCodes.push(canonicalCode);
    account.bonusTokens = Math.max(0, account.bonusTokens || 0) + giftBonus;
    account.tokensRemaining = Math.max(0, account.tokensRemaining) + giftBonus;
    return {
      ok: true,
      kind: 'gift',
      code: canonicalCode,
      addedTokens: giftBonus,
      tokensRemaining: account.tokensRemaining,
      tokenLimitEffective: getEffectiveTokenLimit(account, now),
    };
  }

  // Keep valid gift codes completely secret in errors
  return { ok: false, error: 'Invalid gift code.' };
}

export function applyReferralBonus(
  inviter: AccountRecord,
  now: number = Date.now()
): { bonus: number; tokensRemaining: number; tokenLimitEffective: number } {
  refreshQuotaIfDue(inviter, now);
  inviter.bonusTokens = Math.max(0, inviter.bonusTokens || 0) + REFERRAL_BONUS;
  inviter.tokensRemaining = Math.max(0, inviter.tokensRemaining) + REFERRAL_BONUS;
  inviter.referralCount = (inviter.referralCount || 0) + 1;
  inviter.referralTokensEarned = (inviter.referralTokensEarned || 0) + REFERRAL_BONUS;
  return {
    bonus: REFERRAL_BONUS,
    tokensRemaining: inviter.tokensRemaining,
    tokenLimitEffective: getEffectiveTokenLimit(inviter, now),
  };
}

export function resetAllAccountsUsage(accounts: AccountRecord[], now: number = Date.now()): number {
  let count = 0;
  for (const acc of accounts) {
    const base = getAccountPlanBaseTokens(acc, now);
    acc.tokenLimitBase = base;
    acc.bonusTokens = 0;
    acc.tokensRemaining = base;
    acc.lastResetAt = now;
    acc.imagesUsed = 0;
    acc.lokiCodeUsed = 0;
    acc.starkUsed = 0;
    acc.attachmentsUsed = 0;
    count++;
  }
  return count;
}

export function resetUsersUsage(
  accounts: AccountRecord[],
  targetUsernamesOrIds: string[],
  now: number = Date.now()
): AccountRecord[] {
  const targets = new Set(
    (Array.isArray(targetUsernamesOrIds) ? targetUsernamesOrIds : [])
      .map((t) => String(t || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const affected: AccountRecord[] = [];
  for (const acc of accounts) {
    if (targets.has(acc.usernameLower) || targets.has(acc.id.toLowerCase())) {
      const base = getAccountPlanBaseTokens(acc, now);
      acc.tokenLimitBase = base;
      acc.bonusTokens = 0;
      acc.tokensRemaining = base;
      acc.lastResetAt = now;
      acc.imagesUsed = 0;
      acc.lokiCodeUsed = 0;
      acc.starkUsed = 0;
      acc.attachmentsUsed = 0;
      affected.push(acc);
    }
  }
  return affected;
}

export function computeBanDurationMs(
  amount: number,
  unit: 'days' | 'weeks' | 'months' | 'years'
): number {
  const cleanAmount = Math.max(1, Math.min(1000, Math.floor(amount || 1)));
  const mult: Record<string, number> = {
    days: 86400 * 1000,
    weeks: 7 * 86400 * 1000,
    months: 30 * 86400 * 1000,
    years: 365 * 86400 * 1000,
  };
  return cleanAmount * (mult[unit] || mult.days);
}

export function canAccessRoom(room: { ownerId: string; memberIds: string[] }, userId: string): boolean {
  return room.ownerId === userId || room.memberIds.includes(userId);
}
