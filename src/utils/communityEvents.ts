import {
  PLAN_CONFIGS,
  computePlanDurationMs,
  formatPlanDurationLabel,
  refreshAndGetFeatureQuotas,
  resolveEffectivePlan,
  type PlanDurationUnit,
  type PlanTier,
} from './subscriptionPlans.ts';
import type { AccountRecord } from './authQuota.ts';

export type CommunityEventMetric =
  | 'messages_sent'
  | 'images_created'
  | 'lokicode_runs'
  | 'combined_activity';

export type EventRewardType = 'plan' | 'tokens' | 'custom';
export type EventThemeAccent = 'emerald' | 'gold' | 'violet' | 'cyber' | 'crimson';

export interface CommunityEventTier {
  id: string;
  title: string;
  description: string;
  targetProgress: number;
  rewardType: EventRewardType;
  rewardPlan?: 'pro' | 'ultimate';
  durationMode?: 'permanent' | 'timed';
  durationAmount?: number;
  durationUnit?: PlanDurationUnit;
  bonusTokens?: number;
  customRewardText?: string;
  badgeEmoji?: string;
}

export interface CommunityEvent {
  id: string;
  name: string;
  buttonLabel: string;
  icon: string;
  themeAccent: EventThemeAccent;
  headline: string;
  subtitle: string;
  storyMarkdown: string;
  highlights: string[];
  metric: CommunityEventMetric;
  goalTarget: number;
  progress: number;
  participantIds: string[];
  tiers: CommunityEventTier[];
  claimedTierByUser: Record<string, string[]>;
  active: boolean;
  startsAt: number;
  endsAt: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  aiPrompt?: string;
}

export interface SanitizedCommunityEventTier extends CommunityEventTier {
  unlocked: boolean;
  claimed: boolean;
  claimable: boolean;
  rewardSummary: string;
  progressPct: number;
}

export interface SanitizedCommunityEvent {
  id: string;
  name: string;
  buttonLabel: string;
  icon: string;
  themeAccent: EventThemeAccent;
  headline: string;
  subtitle: string;
  storyMarkdown: string;
  highlights: string[];
  metric: CommunityEventMetric;
  metricLabel: string;
  goalTarget: number;
  progress: number;
  progressPct: number;
  participantsCount: number;
  tiers: SanitizedCommunityEventTier[];
  active: boolean;
  ended: boolean;
  startsAt: number;
  endsAt: number;
  timeRemainingMs: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  aiPrompt?: string;
}

export const METRIC_LABELS: Record<CommunityEventMetric, string> = {
  messages_sent: 'AI Messages Sent',
  images_created: 'AI Images Created',
  lokicode_runs: 'LokiCode Programs Built',
  combined_activity: 'Total Community AI Actions',
};

const VALID_METRICS = new Set<CommunityEventMetric>([
  'messages_sent',
  'images_created',
  'lokicode_runs',
  'combined_activity',
]);

const VALID_ACCENTS = new Set<EventThemeAccent>([
  'emerald',
  'gold',
  'violet',
  'cyber',
  'crimson',
]);

const VALID_UNITS = new Set<PlanDurationUnit>(['days', 'weeks', 'months', 'years']);

const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  ultimate: 2,
};

export function summarizeTierReward(tier: CommunityEventTier): string {
  if (tier.rewardType === 'plan') {
    const planName = tier.rewardPlan === 'ultimate' ? 'Loki Ultimate' : 'Loki Pro';
    if (tier.durationMode === 'permanent') {
      return `${planName} (Permanent)`;
    }
    const amt = Math.max(1, Math.floor(Number(tier.durationAmount) || 3));
    const unit: PlanDurationUnit = VALID_UNITS.has(tier.durationUnit as PlanDurationUnit)
      ? (tier.durationUnit as PlanDurationUnit)
      : 'days';
    return `${planName} (${formatPlanDurationLabel(amt, unit)})`;
  }
  if (tier.rewardType === 'tokens') {
    const toks = Math.max(1000, Math.floor(Number(tier.bonusTokens) || 25000));
    return `+${toks.toLocaleString()} Bonus Tokens`;
  }
  return String(tier.customRewardText || tier.title || 'Community Event Reward').trim();
}

export function normalizeEventTier(raw: any, idx: number, fallbackGoal: number): CommunityEventTier {
  const rewardType: EventRewardType =
    raw?.rewardType === 'tokens' || raw?.rewardType === 'custom' ? raw.rewardType : 'plan';
  const rewardPlan: 'pro' | 'ultimate' = raw?.rewardPlan === 'ultimate' ? 'ultimate' : 'pro';
  const durationMode: 'permanent' | 'timed' =
    raw?.durationMode === 'permanent' ? 'permanent' : 'timed';
  const durationAmount = Math.max(1, Math.min(365, Math.floor(Number(raw?.durationAmount) || (rewardPlan === 'ultimate' ? 3 : 7))));
  const durationUnit: PlanDurationUnit = VALID_UNITS.has(raw?.durationUnit) ? raw.durationUnit : 'days';
  const bonusTokens = Math.max(1000, Math.min(5_000_000, Math.floor(Number(raw?.bonusTokens) || 25000)));
  const rawTarget = Number(raw?.targetProgress);
  const defaultTarget = Math.max(1, Math.round((fallbackGoal * (idx + 1)) / 3));

  return {
    id: String(raw?.id || `tier_${idx + 1}`).trim().slice(0, 48),
    title: String(raw?.title || `Milestone Tier ${idx + 1}`).trim().slice(0, 72),
    description: String(raw?.description || '').trim().slice(0, 200),
    targetProgress: Math.max(1, Math.floor(Number.isFinite(rawTarget) && rawTarget > 0 ? rawTarget : defaultTarget)),
    rewardType,
    rewardPlan: rewardType === 'plan' ? rewardPlan : undefined,
    durationMode: rewardType === 'plan' ? durationMode : undefined,
    durationAmount: rewardType === 'plan' && durationMode === 'timed' ? durationAmount : undefined,
    durationUnit: rewardType === 'plan' && durationMode === 'timed' ? durationUnit : undefined,
    bonusTokens: rewardType === 'tokens' ? bonusTokens : undefined,
    customRewardText:
      rewardType === 'custom'
        ? String(raw?.customRewardText || raw?.title || 'Exclusive Event Perk').trim().slice(0, 120)
        : undefined,
    badgeEmoji: String(raw?.badgeEmoji || (rewardType === 'plan' ? (rewardPlan === 'ultimate' ? '👑' : '⚡') : rewardType === 'tokens' ? '🎁' : '🏆')).slice(0, 8),
  };
}

export function normalizeCommunityEvent(
  draft: any,
  actorUsername: string,
  now: number = Date.now(),
  existing?: CommunityEvent | null
): CommunityEvent {
  const goalTarget = Math.max(1, Math.min(10_000_000, Math.floor(Number(draft?.goalTarget) || 100)));
  const endsInDays = Math.max(1, Math.min(365, Number(draft?.endsInDays) || 7));
  const metric: CommunityEventMetric = VALID_METRICS.has(draft?.metric)
    ? draft.metric
    : 'combined_activity';
  const themeAccent: EventThemeAccent = VALID_ACCENTS.has(draft?.themeAccent)
    ? draft.themeAccent
    : 'emerald';

  const rawTiers = Array.isArray(draft?.tiers) && draft.tiers.length > 0
    ? draft.tiers
    : [
        {
          id: 'tier_1',
          title: 'Spark Milestone',
          description: 'First community wave unlocked!',
          targetProgress: Math.max(1, Math.round(goalTarget * 0.25)),
          rewardType: 'tokens',
          bonusTokens: 25000,
          badgeEmoji: '🎁',
        },
        {
          id: 'tier_2',
          title: 'Loki Pro Wave',
          description: 'Everyone unlocks Loki Pro for 3 Days!',
          targetProgress: Math.max(2, Math.round(goalTarget * 0.6)),
          rewardType: 'plan',
          rewardPlan: 'pro',
          durationMode: 'timed',
          durationAmount: 3,
          durationUnit: 'days',
          badgeEmoji: '⚡',
        },
        {
          id: 'tier_3',
          title: 'Grand Ultimate Goal',
          description: 'Community goal complete — claim Loki Ultimate!',
          targetProgress: goalTarget,
          rewardType: 'plan',
          rewardPlan: 'ultimate',
          durationMode: 'timed',
          durationAmount: 5,
          durationUnit: 'days',
          badgeEmoji: '👑',
        },
      ];

  const tiers = rawTiers
    .slice(0, 8)
    .map((t: any, idx: number) => normalizeEventTier(t, idx, goalTarget))
    .sort((a: CommunityEventTier, b: CommunityEventTier) => a.targetProgress - b.targetProgress);

  const maxTierTarget = tiers.reduce((mx: number, t: CommunityEventTier) => Math.max(mx, t.targetProgress), 1);
  const finalGoalTarget = Math.max(goalTarget, maxTierTarget);
  const rawName = String(draft?.name || 'Community Power Sprint').trim().slice(0, 64);
  const rawBtnLabel = String(draft?.buttonLabel || rawName).trim().slice(0, 32);

  const endsAt =
    typeof draft?.endsAt === 'number' && draft.endsAt > now
      ? draft.endsAt
      : now + Math.round(endsInDays * 24 * 60 * 60 * 1000);

  return {
    id: String(draft?.id || existing?.id || `evt_${now.toString(36)}`).trim(),
    name: rawName,
    buttonLabel: rawBtnLabel || rawName.slice(0, 26),
    icon: String(draft?.icon || '🎉').trim().slice(0, 8) || '🎉',
    themeAccent,
    headline: String(draft?.headline || `${rawName} — Live Community Challenge`).trim().slice(0, 120),
    subtitle: String(
      draft?.subtitle ||
        'Team up across Lokizenith AI! Every prompt, creation, and session powers the live community bar.'
    )
      .trim()
      .slice(0, 240),
    storyMarkdown: String(
      draft?.storyMarkdown ||
        'Participate together with the entire Lokizenith community to fill the progression meter and claim timed Pro & Ultimate rewards for your account.'
    )
      .trim()
      .slice(0, 2400),
    highlights: Array.isArray(draft?.highlights)
      ? draft.highlights.map((h: any) => String(h || '').trim().slice(0, 140)).filter(Boolean).slice(0, 6)
      : ['Real-time global community progression counter', 'Instant one-click reward claiming per milestone'],
    metric,
    goalTarget: finalGoalTarget,
    progress: existing && existing.id === draft?.id ? existing.progress : Math.max(0, Math.floor(Number(draft?.progress) || 0)),
    participantIds: existing && existing.id === draft?.id ? [...existing.participantIds] : [],
    tiers,
    claimedTierByUser: existing && existing.id === draft?.id ? { ...existing.claimedTierByUser } : {},
    active: draft?.active !== false,
    startsAt: existing && existing.id === draft?.id ? existing.startsAt : now,
    endsAt,
    createdBy: existing?.createdBy || actorUsername,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    aiPrompt: draft?.aiPrompt ? String(draft.aiPrompt).slice(0, 500) : existing?.aiPrompt,
  };
}

export function sanitizeCommunityEventForClient(
  event: CommunityEvent,
  userId?: string | null,
  now: number = Date.now()
): SanitizedCommunityEvent {
  const ended = !event.active || now >= event.endsAt;
  const userClaims = new Set(userId ? event.claimedTierByUser[userId] || [] : []);
  const tiers: SanitizedCommunityEventTier[] = (event.tiers || []).map((t) => {
    const unlocked = event.progress >= t.targetProgress;
    const claimed = userClaims.has(t.id);
    const claimable = unlocked && !claimed && event.active && !ended;
    return {
      ...t,
      unlocked,
      claimed,
      claimable,
      rewardSummary: summarizeTierReward(t),
      progressPct: Math.min(100, Math.round((event.progress / Math.max(1, t.targetProgress)) * 100)),
    };
  });

  return {
    id: event.id,
    name: event.name,
    buttonLabel: event.buttonLabel,
    icon: event.icon,
    themeAccent: event.themeAccent,
    headline: event.headline,
    subtitle: event.subtitle,
    storyMarkdown: event.storyMarkdown,
    highlights: [...(event.highlights || [])],
    metric: event.metric,
    metricLabel: METRIC_LABELS[event.metric] || METRIC_LABELS.combined_activity,
    goalTarget: event.goalTarget,
    progress: event.progress,
    progressPct: Math.min(100, Math.round((event.progress / Math.max(1, event.goalTarget)) * 100)),
    participantsCount: (event.participantIds || []).length,
    tiers,
    active: event.active,
    ended,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timeRemainingMs: Math.max(0, event.endsAt - now),
    createdBy: event.createdBy,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    aiPrompt: event.aiPrompt,
  };
}

export function doesActivityMatchMetric(
  metric: CommunityEventMetric,
  activityKind: 'messages_sent' | 'images_created' | 'lokicode_runs'
): boolean {
  if (metric === 'combined_activity') return true;
  return metric === activityKind;
}

export function incrementEventProgress(
  event: CommunityEvent,
  userId: string | null | undefined,
  delta: number = 1,
  now: number = Date.now()
): boolean {
  if (!event.active || now >= event.endsAt) return false;
  const cleanDelta = Math.max(1, Math.floor(Number(delta) || 1));
  event.progress = Math.max(0, Math.floor(event.progress || 0) + cleanDelta);
  if (userId && !event.participantIds.includes(userId)) {
    event.participantIds.push(userId);
  }
  event.updatedAt = now;
  return true;
}

export function claimEventTierReward(
  event: CommunityEvent,
  user: AccountRecord,
  tierId: string,
  now: number = Date.now()
): { ok: true; rewardSummary: string; tier: CommunityEventTier } | { ok: false; error: string } {
  if (!event.active || now >= event.endsAt) {
    return { ok: false, error: 'This community event has ended.' };
  }
  const tier = (event.tiers || []).find((t) => t.id === tierId);
  if (!tier) {
    return { ok: false, error: 'Milestone tier not found.' };
  }
  if (event.progress < tier.targetProgress) {
    return {
      ok: false,
      error: `Community goal has not reached ${tier.targetProgress.toLocaleString()} yet (${event.progress.toLocaleString()} / ${tier.targetProgress.toLocaleString()}).`,
    };
  }
  const existingClaims = event.claimedTierByUser[user.id] || [];
  if (existingClaims.includes(tier.id)) {
    return { ok: false, error: 'You have already claimed this milestone reward.' };
  }

  event.claimedTierByUser[user.id] = [...existingClaims, tier.id];
  if (!event.participantIds.includes(user.id)) {
    event.participantIds.push(user.id);
  }

  if (tier.rewardType === 'plan') {
    const rewardPlan: PlanTier = tier.rewardPlan === 'ultimate' ? 'ultimate' : 'pro';
    const curEff = resolveEffectivePlan(user, now);
    const curRank = PLAN_RANK[curEff.effectivePlan];
    const rewardRank = PLAN_RANK[rewardPlan];

    const isPermanentReward = tier.durationMode === 'permanent';
    const durationMs = isPermanentReward
      ? null
      : computePlanDurationMs(tier.durationAmount || 3, tier.durationUnit || 'days');
    const newExpiresAt = durationMs !== null ? now + durationMs : null;

    if (rewardRank >= curRank) {
      user.plan = rewardPlan;
      user.planStatus = 'active';
      user.planSource = 'event';
      user.planStartedAt = now;
      user.planCanceledAt = null;
      if (isPermanentReward) {
        user.planExpiresAt = null;
        user.planDurationLabel = 'Permanent';
      } else if (
        rewardRank === curRank &&
        curEff.expiresAt === null &&
        curEff.effectivePlan !== 'free'
      ) {
        // Keep existing permanent expiry intact rather than shortening it
        user.planExpiresAt = null;
      } else {
        const baseUntil =
          rewardRank === curRank && curEff.expiresAt && curEff.expiresAt > now
            ? curEff.expiresAt
            : now;
        user.planExpiresAt = baseUntil + (durationMs || 0);
        user.planDurationLabel = formatPlanDurationLabel(
          tier.durationAmount || 3,
          tier.durationUnit || 'days'
        );
      }

      if (rewardPlan === 'ultimate') {
        user.adminPlanTestMode = false;
      } else if (curEff.effectivePlan === 'free' && user.adminPlanTestMode === undefined) {
        // leave regular users' testMode undefined; if root admin is testing plans, reflect pro
        if (user.adminPlanTestMode) user.adminPlanTestMode = true;
      }

      const cfg = PLAN_CONFIGS[rewardPlan];
      user.tokenLimitBase = cfg.unlimitedTokens ? 999_999_999 : cfg.tokenLimitBase;
      user.tokensRemaining = cfg.unlimitedTokens
        ? 999_999_999
        : Math.max(user.tokensRemaining || 0, cfg.tokenLimitBase + (user.bonusTokens || 0));
    } else {
      // User already holds Ultimate while claiming a Pro milestone: award bonus tokens as fallback perk
      user.bonusTokens = Math.max(0, Math.floor(user.bonusTokens || 0)) + 50000;
    }
    refreshAndGetFeatureQuotas(user, now);
  } else if (tier.rewardType === 'tokens') {
    const bonus = Math.max(1000, Math.floor(Number(tier.bonusTokens) || 25000));
    user.bonusTokens = Math.max(0, Math.floor(user.bonusTokens || 0)) + bonus;
    user.tokensRemaining = Math.max(0, Math.floor(user.tokensRemaining || 0)) + bonus;
  } else if (tier.rewardType === 'custom') {
    const badge = `${tier.badgeEmoji || '🏆'} ${tier.title}`.slice(0, 34);
    const badges = Array.isArray(user.profileBadges) ? [...user.profileBadges] : [];
    if (!badges.includes(badge)) {
      badges.unshift(badge);
      user.profileBadges = badges.slice(0, 8);
    }
  }

  return {
    ok: true,
    rewardSummary: summarizeTierReward(tier),
    tier,
  };
}

export function buildFallbackGeneratedEvent(
  prompt: string,
  actorUsername: string,
  now: number = Date.now()
): CommunityEvent {
  const raw = String(prompt || '').trim();
  const low = raw.toLowerCase();

  let metric: CommunityEventMetric = 'combined_activity';
  if (/image|art|draw|paint|photo|תמונ/.test(low)) metric = 'images_created';
  else if (/code|lokicode|program|script|dev|קוד/.test(low)) metric = 'lokicode_runs';
  else if (/message|chat|talk|ask|הודע/.test(low)) metric = 'messages_sent';

  let themeAccent: EventThemeAccent = 'emerald';
  if (/gold|royal|king|legend|champion|זהב/.test(low)) themeAccent = 'gold';
  else if (/cosmic|galaxy|space|neon|purple|violet|night/.test(low)) themeAccent = 'violet';
  else if (/cyber|frost|ice|blue|tech|code/.test(low)) themeAccent = 'cyber';
  else if (/fire|inferno|dragon|boss|crimson|red/.test(low)) themeAccent = 'crimson';

  const goalMatch = raw.match(/\b(\d{2,6})\s*(?:goal|target|msgs?|messages|images?|runs?|actions?)/i);
  const goalTarget = goalMatch ? Math.max(10, Math.min(100000, Number(goalMatch[1]))) : 120;

  const daysMatch = raw.match(/\b(\d{1,2})\s*(?:days?|d)\b/i);
  const endsInDays = daysMatch ? Math.max(1, Math.min(30, Number(daysMatch[1]))) : 7;

  const isUltMention = /ultimate|אולטימייט/.test(low);
  const icon =
    metric === 'images_created'
      ? '🎨'
      : metric === 'lokicode_runs'
      ? '💻'
      : themeAccent === 'gold'
      ? '👑'
      : themeAccent === 'crimson'
      ? '🔥'
      : '🚀';

  const cleanTopic = raw
    .replace(/make an? event( about| for)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const titleWords = cleanTopic
    ? cleanTopic.split(' ').slice(0, 4).join(' ').replace(/[^\w\u0590-\u05FF\s-]/g, '')
    : 'Loki Power Rush';
  const name = (titleWords.charAt(0).toUpperCase() + titleWords.slice(1)).slice(0, 40) || 'Loki Power Rush';

  return normalizeCommunityEvent(
    {
      name,
      buttonLabel: name.slice(0, 22),
      icon,
      themeAccent,
      headline: `${icon} ${name} — Community Goal & Tier Rewards`,
      subtitle: `Every ${METRIC_LABELS[metric].toLowerCase()} pushes the live meter forward for the entire community!`,
      storyMarkdown:
        `### How It Works\n` +
        `Admin **@${actorUsername}** launched **${name}**! Work together as a community to unlock tiered rewards as the shared milestone bar fills up.\n\n` +
        `- Reach each milestone threshold to unlock its reward card.\n` +
        `- Click **Claim Reward** directly inside this Event Page to upgrade your account immediately!`,
      highlights: [
        `Target Goal: ${goalTarget.toLocaleString()} ${METRIC_LABELS[metric]}`,
        'Tier 1: +25,000 Bonus Tokens · Tier 2: Timed Loki Pro · Tier 3: Timed Loki Ultimate',
        'Live community progression synced in real time across all connected users',
      ],
      metric,
      goalTarget,
      endsInDays,
      aiPrompt: raw,
      tiers: [
        {
          id: 'tier_1',
          title: 'Wave 1 · Community Spark',
          description: 'Bonus fuel for every participating account.',
          targetProgress: Math.max(1, Math.round(goalTarget * 0.25)),
          rewardType: 'tokens',
          bonusTokens: 25000,
          badgeEmoji: '🎁',
        },
        {
          id: 'tier_2',
          title: 'Wave 2 · Loki Pro Surge',
          description: 'All claimers unlock Loki Pro benefits (5× usage, 15 daily images, 85 Stark msgs)!',
          targetProgress: Math.max(2, Math.round(goalTarget * 0.6)),
          rewardType: 'plan',
          rewardPlan: 'pro',
          durationMode: 'timed',
          durationAmount: 5,
          durationUnit: 'days',
          badgeEmoji: '⚡',
        },
        {
          id: 'tier_3',
          title: isUltMention ? 'Grand Finale · Ultimate Ascension' : 'Tier 3 · Loki Ultimate Unlocked',
          description: 'Community hit 100%! Everyone claims unlimited Loki Ultimate access!',
          targetProgress: goalTarget,
          rewardType: 'plan',
          rewardPlan: 'ultimate',
          durationMode: 'timed',
          durationAmount: 7,
          durationUnit: 'days',
          badgeEmoji: '👑',
        },
      ],
    },
    actorUsername,
    now
  );
}
