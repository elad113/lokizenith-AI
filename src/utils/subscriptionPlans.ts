export type PlanTier = 'free' | 'pro' | 'ultimate';
export type PlanStatus = 'active' | 'trialing' | 'canceled';
export type PlanDurationUnit = 'days' | 'weeks' | 'months' | 'years';

export function computePlanDurationMs(amount: number, unit: PlanDurationUnit): number {
  const n = Math.max(1, Math.min(1000, Math.floor(Number(amount) || 1)));
  const dayMs = 24 * 60 * 60 * 1000;
  if (unit === 'weeks') return n * 7 * dayMs;
  if (unit === 'months') return n * 30 * dayMs;
  if (unit === 'years') return n * 365 * dayMs;
  return n * dayMs;
}

export function formatPlanDurationLabel(amount: number, unit: PlanDurationUnit): string {
  const n = Math.max(1, Math.min(1000, Math.floor(Number(amount) || 1)));
  const singular = unit.replace(/s$/, '');
  return `${n} ${n === 1 ? singular : unit}`;
}

export const PLAN_PRICES: Record<PlanTier, number> = {
  free: 0,
  pro: 7.99,
  ultimate: 12.99,
};

export const PAYPAL_PLAN_IDS = {
  pro: 'P-7T529484K52614831NL4C7WQ',
  ultimate: 'P-41V408833G792383GNL4DSEY',
} as const;

export const BILLING_CYCLE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const ULTIMATE_TRIAL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// Quota reset intervals
export const TOKEN_RESET_MS = 6 * 60 * 60 * 1000; // 6 hours
export const IMAGE_DAILY_RESET_MS = 16 * 60 * 60 * 1000; // Daily = 16 hours per spec
export const LOKICODE_FREE_RESET_MS = 8 * 60 * 60 * 1000; // 8 hours for Free
export const LOKICODE_PRO_RESET_MS = 4 * 60 * 60 * 1000; // 4 hours for Pro
export const STARK_RESET_MS = 6 * 60 * 60 * 1000; // 6 hours
export const ATTACHMENT_RESET_MS = 4 * 60 * 60 * 1000; // 4 hours
export const VIDEO_BANNER_MAX_SECONDS = 4;

export interface PlanQuotaConfig {
  tier: PlanTier;
  name: string;
  shortTag: 'FREE' | 'PRO' | 'ULTIMATE';
  monthlyPrice: number;
  tokenLimitBase: number; // Infinity represented as Number.MAX_SAFE_INTEGER or unlimited flag
  unlimitedTokens: boolean;
  dailyImagesLimit: number | null; // null = unlimited
  dailyImagesResetMs: number;
  lokiCodeLimit: number | null; // null = unlimited
  lokiCodeResetMs: number;
  starkMessagesLimit: number | null; // null = unlimited
  starkResetMs: number;
  attachmentsLimit: number | null; // null = unlimited
  attachmentsResetMs: number;
  weeklySharesLimit: number | null; // null = unlimited
  animatedBackgrounds: boolean;
  animatedVideoBanner: boolean;
  ultraThinkingUnlocked: boolean;
  aiDesignUnlocked: boolean;
}

export const PLAN_CONFIGS: Record<PlanTier, PlanQuotaConfig> = {
  free: {
    tier: 'free',
    name: 'Loki Free',
    shortTag: 'FREE',
    monthlyPrice: 0,
    tokenLimitBase: 25000,
    unlimitedTokens: false,
    dailyImagesLimit: 8,
    dailyImagesResetMs: IMAGE_DAILY_RESET_MS,
    lokiCodeLimit: 12,
    lokiCodeResetMs: LOKICODE_FREE_RESET_MS,
    starkMessagesLimit: 10,
    starkResetMs: STARK_RESET_MS,
    attachmentsLimit: 8,
    attachmentsResetMs: ATTACHMENT_RESET_MS,
    weeklySharesLimit: 4,
    animatedBackgrounds: false,
    animatedVideoBanner: false,
    ultraThinkingUnlocked: false,
    aiDesignUnlocked: false,
  },
  pro: {
    tier: 'pro',
    name: 'Loki Pro',
    shortTag: 'PRO',
    monthlyPrice: 7.99,
    tokenLimitBase: 125000, // 5x more usage compared to Free (25k -> 125k)
    unlimitedTokens: false,
    dailyImagesLimit: 15,
    dailyImagesResetMs: IMAGE_DAILY_RESET_MS,
    lokiCodeLimit: 52,
    lokiCodeResetMs: LOKICODE_PRO_RESET_MS,
    starkMessagesLimit: 85,
    starkResetMs: STARK_RESET_MS,
    attachmentsLimit: 25,
    attachmentsResetMs: ATTACHMENT_RESET_MS,
    weeklySharesLimit: 12,
    animatedBackgrounds: true,
    animatedVideoBanner: true,
    ultraThinkingUnlocked: false,
    aiDesignUnlocked: false,
  },
  ultimate: {
    tier: 'ultimate',
    name: 'Loki Ultimate',
    shortTag: 'ULTIMATE',
    monthlyPrice: 12.99,
    tokenLimitBase: 125000,
    unlimitedTokens: true,
    dailyImagesLimit: null,
    dailyImagesResetMs: IMAGE_DAILY_RESET_MS,
    lokiCodeLimit: null,
    lokiCodeResetMs: LOKICODE_PRO_RESET_MS,
    starkMessagesLimit: null,
    starkResetMs: STARK_RESET_MS,
    attachmentsLimit: null,
    attachmentsResetMs: ATTACHMENT_RESET_MS,
    weeklySharesLimit: null,
    animatedBackgrounds: true,
    animatedVideoBanner: true,
    ultraThinkingUnlocked: true,
    aiDesignUnlocked: true,
  },
};

export interface UserSubscriptionState {
  plan?: PlanTier;
  planStatus?: PlanStatus;
  planStartedAt?: number | null;
  planExpiresAt?: number | null;
  planCanceledAt?: number | null;
  usedUltimateTrial?: boolean;
  paypalSubscriptionId?: string | null;
  starkAuthorized?: boolean;
  // Feature quota counters & reset timestamps
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
}

/**
 * Resolves the effective active plan for a user at timestamp `now`.
 * If a user canceled their plan or is on a 3-day trial, they retain their plan benefits
 * until `planExpiresAt`, after which they revert to `'free'`.
 */
export function resolveEffectivePlan(state: UserSubscriptionState, now: number = Date.now()): {
  effectivePlan: PlanTier;
  status: PlanStatus;
  expired: boolean;
  expiresAt: number | null;
  isCanceledButActive: boolean;
  isTrialing: boolean;
} {
  const rawPlan: PlanTier =
    state.plan === 'ultimate' ? 'ultimate' : state.plan === 'pro' ? 'pro' : 'free';

  if (rawPlan === 'free') {
    return {
      effectivePlan: 'free',
      status: 'active',
      expired: false,
      expiresAt: null,
      isCanceledButActive: false,
      isTrialing: false,
    };
  }

  const expiresAt = typeof state.planExpiresAt === 'number' ? state.planExpiresAt : null;
  const rawStatus: PlanStatus = state.planStatus || 'active';

  // Any timed, canceled, or trialing plan past expiration timestamp -> revert to free
  if (expiresAt !== null && now >= expiresAt) {
    return {
      effectivePlan: 'free',
      status: 'active',
      expired: true,
      expiresAt: null,
      isCanceledButActive: false,
      isTrialing: false,
    };
  }

  return {
    effectivePlan: rawPlan,
    status: rawStatus,
    expired: false,
    expiresAt,
    isCanceledButActive: rawStatus === 'canceled',
    isTrialing: rawStatus === 'trialing',
  };
}

/**
 * Calculates the upgrade price and obtainability for each tier based on the user's current effective plan.
 * - Free user -> Pro costs $7.99/mo, Ultimate costs $12.99/mo (with 3-day free trial if not yet used).
 * - Pro user -> Free is unobtainable, Pro is current, Ultimate costs $5.00/mo ($12.99 - $7.99).
 * - Ultimate user -> Free and Pro are unobtainable, Ultimate is current.
 */
export function getPlanPurchaseOptions(state: UserSubscriptionState, now: number = Date.now()) {
  const resolved = resolveEffectivePlan(state, now);
  const cur = resolved.effectivePlan;
  const canUseUltimateTrial = !state.usedUltimateTrial && cur !== 'ultimate';

  const proDifference = Number((PLAN_PRICES.ultimate - PLAN_PRICES.pro).toFixed(2)); // 5.00

  return {
    currentPlan: cur,
    currentStatus: resolved.status,
    expiresAt: resolved.expiresAt,
    isCanceledButActive: resolved.isCanceledButActive,
    isTrialing: resolved.isTrialing,
    canCancel: cur === 'pro' || cur === 'ultimate',
    tiers: {
      free: {
        tier: 'free' as const,
        obtainable: false,
        isCurrent: cur === 'free',
        displayPrice: 0,
        priceText: '$0/Month',
        reason: cur === 'free' ? 'Current Plan' : 'Unobtainable — Higher Plan Active',
      },
      pro: {
        tier: 'pro' as const,
        obtainable: cur === 'free',
        isCurrent: cur === 'pro',
        displayPrice: PLAN_PRICES.pro,
        priceText: '$7.99/Month',
        reason:
          cur === 'pro'
            ? 'Current Plan'
            : cur === 'ultimate'
            ? 'Unobtainable — Loki Ultimate Active'
            : 'Available',
      },
      ultimate: {
        tier: 'ultimate' as const,
        obtainable: cur !== 'ultimate',
        isCurrent: cur === 'ultimate',
        displayPrice: cur === 'pro' ? proDifference : PLAN_PRICES.ultimate,
        originalPrice: PLAN_PRICES.ultimate,
        isProratedFromPro: cur === 'pro',
        priceText: cur === 'pro' ? `$${proDifference.toFixed(2)}/Month` : '$12.99/Month',
        trialAvailable: canUseUltimateTrial,
        reason: cur === 'ultimate' ? 'Current Plan' : 'Available',
      },
    },
  };
}

/**
 * Computes the most recent Friday 3:00 PM EST (20:00 UTC) and the next Friday 3:00 PM EST (20:00 UTC)
 * so weekly shared chats reset every 7 days on Friday at 3:00 PM EST.
 */
export function getWeeklyFriday3pmEstWindow(now: number = Date.now()): {
  lastFridayResetAt: number;
  nextFridayResetAt: number;
} {
  // 3:00 PM EST is 15:00 UTC-5 = 20:00 UTC
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const d = new Date(now);
  const utcDay = d.getUTCDay(); // 0=Sun, 5=Fri
  const candidate = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    20, // 20:00 UTC = 15:00 EST (3:00 PM EST)
    0,
    0,
    0
  );
  // Shift candidate to Friday of the current UTC week
  const dayDiffToFriday = 5 - utcDay;
  let fridayThisWeek = candidate + dayDiffToFriday * 24 * 60 * 60 * 1000;
  if (fridayThisWeek > now) {
    fridayThisWeek -= WEEK_MS;
  }
  return {
    lastFridayResetAt: fridayThisWeek,
    nextFridayResetAt: fridayThisWeek + WEEK_MS,
  };
}

export type QuotaFeatureType = 'image' | 'lokicode' | 'stark' | 'attachment' | 'share_chat';

export interface FeatureQuotaStatus {
  feature: QuotaFeatureType;
  used: number;
  limit: number | null; // null = unlimited
  remaining: number | null; // null = unlimited
  unlimited: boolean;
  exhausted: boolean;
  resetAt: number;
  resetInMs: number;
}

/**
 * Refreshes any expired feature quota windows on `state` in-place and returns the current status for all features.
 */
export function refreshAndGetFeatureQuotas(
  state: UserSubscriptionState,
  now: number = Date.now(),
  isRootOrUnlimitedUser: boolean = false
): Record<QuotaFeatureType, FeatureQuotaStatus> & { changed: boolean; effectivePlan: PlanTier } {
  let changed = false;
  const resolved = resolveEffectivePlan(state, now);
  if (resolved.expired && state.plan !== 'free') {
    state.plan = 'free';
    state.planStatus = 'active';
    state.planExpiresAt = null;
    changed = true;
  }

  const effPlan: PlanTier = isRootOrUnlimitedUser ? 'ultimate' : resolved.effectivePlan;
  const cfg = PLAN_CONFIGS[effPlan];

  // 1. Daily Images (16-hour cycle)
  if (!state.imagesResetAt || now >= state.imagesResetAt) {
    if ((state.imagesUsed || 0) > 0) changed = true;
    state.imagesUsed = 0;
    state.imagesResetAt = now + cfg.dailyImagesResetMs;
  }

  // 2. LokiCode (8h for Free, 4h for Pro)
  if (!state.lokiCodeResetAt || now >= state.lokiCodeResetAt) {
    if ((state.lokiCodeUsed || 0) > 0) changed = true;
    state.lokiCodeUsed = 0;
    state.lokiCodeResetAt = now + cfg.lokiCodeResetMs;
  } else if (state.lokiCodeResetAt - now > cfg.lokiCodeResetMs) {
    // Upgraded from Free (8h) to Pro (4h): clamp window
    state.lokiCodeResetAt = now + cfg.lokiCodeResetMs;
    changed = true;
  }

  // 3. Lokizen 4.0 Stark (6h cycle)
  if (!state.starkResetAt || now >= state.starkResetAt) {
    if ((state.starkUsed || 0) > 0) changed = true;
    state.starkUsed = 0;
    state.starkResetAt = now + cfg.starkResetMs;
  }

  // 4. Attachments (4h cycle)
  if (!state.attachmentsResetAt || now >= state.attachmentsResetAt) {
    if ((state.attachmentsUsed || 0) > 0) changed = true;
    state.attachmentsUsed = 0;
    state.attachmentsResetAt = now + cfg.attachmentsResetMs;
  }

  // 5. Weekly Shared Chats (resets every 7 days on Friday 3:00 PM EST)
  const fridayWin = getWeeklyFriday3pmEstWindow(now);
  if (!state.weeklySharesResetAt || now >= state.weeklySharesResetAt) {
    if ((state.weeklySharesUsed || 0) > 0) changed = true;
    state.weeklySharesUsed = 0;
    state.weeklySharesResetAt = fridayWin.nextFridayResetAt;
  }

  const makeStatus = (
    feature: QuotaFeatureType,
    usedVal: number | undefined,
    limitVal: number | null,
    resetAtVal: number,
    forceUnlimited: boolean = false
  ): FeatureQuotaStatus => {
    const used = Math.max(0, Math.floor(usedVal || 0));
    const isUnl = forceUnlimited || isRootOrUnlimitedUser || limitVal === null;
    const rem = isUnl ? null : Math.max(0, limitVal - used);
    return {
      feature,
      used,
      limit: isUnl ? null : limitVal,
      remaining: rem,
      unlimited: isUnl,
      exhausted: !isUnl && rem !== null && rem <= 0,
      resetAt: resetAtVal,
      resetInMs: Math.max(0, resetAtVal - now),
    };
  };

  return {
    changed,
    effectivePlan: effPlan,
    image: makeStatus('image', state.imagesUsed, cfg.dailyImagesLimit, state.imagesResetAt!),
    lokicode: makeStatus('lokicode', state.lokiCodeUsed, cfg.lokiCodeLimit, state.lokiCodeResetAt!),
    stark: makeStatus(
      'stark',
      state.starkUsed,
      cfg.starkMessagesLimit,
      state.starkResetAt!,
      Boolean(state.starkAuthorized)
    ),
    attachment: makeStatus(
      'attachment',
      state.attachmentsUsed,
      cfg.attachmentsLimit,
      state.attachmentsResetAt!
    ),
    share_chat: makeStatus(
      'share_chat',
      state.weeklySharesUsed,
      cfg.weeklySharesLimit,
      state.weeklySharesResetAt!
    ),
  };
}

/**
 * Attempts to consume `amount` units of a feature quota.
 */
export function consumeFeatureQuota(
  state: UserSubscriptionState,
  feature: QuotaFeatureType,
  amount: number = 1,
  now: number = Date.now(),
  isRootOrUnlimitedUser: boolean = false
): {
  allowed: boolean;
  status: FeatureQuotaStatus;
  effectivePlan: PlanTier;
  error?: string;
} {
  const cleanAmount = Math.max(1, Math.floor(amount || 1));
  const quotas = refreshAndGetFeatureQuotas(state, now, isRootOrUnlimitedUser);
  const current = quotas[feature];

  if (current.unlimited) {
    if (feature === 'image') state.imagesUsed = (state.imagesUsed || 0) + cleanAmount;
    else if (feature === 'lokicode') state.lokiCodeUsed = (state.lokiCodeUsed || 0) + cleanAmount;
    else if (feature === 'stark') state.starkUsed = (state.starkUsed || 0) + cleanAmount;
    else if (feature === 'attachment') state.attachmentsUsed = (state.attachmentsUsed || 0) + cleanAmount;
    else if (feature === 'share_chat') state.weeklySharesUsed = (state.weeklySharesUsed || 0) + cleanAmount;
    const updated = refreshAndGetFeatureQuotas(state, now, isRootOrUnlimitedUser);
    return { allowed: true, status: updated[feature], effectivePlan: updated.effectivePlan };
  }

  if (current.remaining !== null && current.remaining < cleanAmount) {
    const labels: Record<QuotaFeatureType, string> = {
      image: `You have reached your daily limit of ${current.limit} images (resets every 16 hours). Upgrade your plan for more daily images!`,
      lokicode: `You have reached your LokiCode limit of ${current.limit} code generations. Upgrade to Loki Pro (52 codes / 4h) or Loki Ultimate (Unlimited)!`,
      stark: `You have reached your Lokizen 4.0 Stark limit of ${current.limit} messages (resets every 6 hours). Switched to Lokizenith 3.5 Fera — upgrade your plan to unlock more Stark access!`,
      attachment: `You have reached your attachment limit of ${current.limit} files/photos (resets every 4 hours). Upgrade to Loki Pro (25 files) or Ultimate (Unlimited)!`,
      share_chat: `You have reached your weekly limit of ${current.limit} shared chats (resets Friday at 3:00 PM EST). Upgrade your plan to share more chats!`,
    };
    return {
      allowed: false,
      status: current,
      effectivePlan: quotas.effectivePlan,
      error: labels[feature],
    };
  }

  if (feature === 'image') state.imagesUsed = (state.imagesUsed || 0) + cleanAmount;
  else if (feature === 'lokicode') state.lokiCodeUsed = (state.lokiCodeUsed || 0) + cleanAmount;
  else if (feature === 'stark') state.starkUsed = (state.starkUsed || 0) + cleanAmount;
  else if (feature === 'attachment') state.attachmentsUsed = (state.attachmentsUsed || 0) + cleanAmount;
  else if (feature === 'share_chat') state.weeklySharesUsed = (state.weeklySharesUsed || 0) + cleanAmount;

  const updated = refreshAndGetFeatureQuotas(state, now, isRootOrUnlimitedUser);
  return { allowed: true, status: updated[feature], effectivePlan: updated.effectivePlan };
}

/**
 * Clamps video banner playback time so videos longer than 4 seconds loop only the first 4 seconds.
 */
export function clampVideoBannerPlaybackTime(currentTimeSec: number, maxDurationSec: number = VIDEO_BANNER_MAX_SECONDS): {
  shouldReset: boolean;
  nextTimeSec: number;
} {
  const t = Number(currentTimeSec) || 0;
  if (t >= maxDurationSec) {
    return { shouldReset: true, nextTimeSec: 0 };
  }
  return { shouldReset: false, nextTimeSec: Math.max(0, t) };
}
