import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackGeneratedEvent,
  claimEventTierReward,
  doesActivityMatchMetric,
  incrementEventProgress,
  normalizeCommunityEvent,
  sanitizeCommunityEventForClient,
} from './communityEvents.ts';
import type { AccountRecord } from './authQuota.ts';

function makeUser(overrides: Partial<AccountRecord> = {}): AccountRecord {
  const now = 1_700_000_000_000;
  return {
    id: 'usr_ev_1',
    username: 'PlayerOne',
    usernameLower: 'playerone',
    passwordHash: 'h',
    salt: 's',
    plan: 'free',
    planStatus: 'active',
    planSource: 'free',
    tokensRemaining: 25000,
    tokenLimitBase: 25000,
    lastResetAt: now,
    usedGiftCodes: [],
    totalTokensUsed: 0,
    createdAt: now,
    ...overrides,
  };
}

test('Community Event AI fallback generator, metric matching & progression increments', () => {
  const now = 1_700_000_000_000;
  const ev = buildFallbackGeneratedEvent('Gold Rush images 200 goal for 5 days', 'EladBenczel', now);
  assert.equal(ev.metric, 'images_created');
  assert.equal(ev.themeAccent, 'gold');
  assert.equal(ev.goalTarget, 200);
  assert.equal(ev.tiers.length, 3);
  assert.ok(ev.endsAt > now + 4 * 86400 * 1000);

  assert.equal(doesActivityMatchMetric('images_created', 'images_created'), true);
  assert.equal(doesActivityMatchMetric('images_created', 'messages_sent'), false);
  assert.equal(doesActivityMatchMetric('combined_activity', 'lokicode_runs'), true);

  assert.equal(incrementEventProgress(ev, 'usr_ev_1', 25, now), true);
  assert.equal(incrementEventProgress(ev, 'usr_ev_2', 30, now), true);
  assert.equal(ev.progress, 55);
  assert.equal(ev.participantIds.length, 2);

  // Ended event rejects progress increments
  assert.equal(incrementEventProgress(ev, 'usr_ev_3', 10, ev.endsAt + 1), false);
});

test('Community Event tier reward claims upgrade user plan/tokens and enforce gates & idempotency', () => {
  const now = 1_700_000_000_000;
  const ev = normalizeCommunityEvent(
    {
      name: 'Laser Weekend',
      buttonLabel: 'Laser Event',
      goalTarget: 100,
      endsInDays: 7,
      tiers: [
        {
          id: 't1',
          title: 'Token Fuel',
          targetProgress: 20,
          rewardType: 'tokens',
          bonusTokens: 30000,
          badgeEmoji: '🎁',
        },
        {
          id: 't2',
          title: 'Pro Pass',
          targetProgress: 50,
          rewardType: 'plan',
          rewardPlan: 'pro',
          durationMode: 'timed',
          durationAmount: 5,
          durationUnit: 'days',
          badgeEmoji: '⚡',
        },
        {
          id: 't3',
          title: 'Ultimate Surge',
          targetProgress: 100,
          rewardType: 'plan',
          rewardPlan: 'ultimate',
          durationMode: 'timed',
          durationAmount: 3,
          durationUnit: 'days',
          badgeEmoji: '👑',
        },
      ],
    },
    'EladBenczel',
    now
  );

  const freeUser = makeUser();
  // Progress 0 -> cannot claim Tier 1 yet
  const tooEarly = claimEventTierReward(ev, freeUser, 't1', now);
  assert.equal(tooEarly.ok, false);

  // Reach progress 55 -> Tier 1 & Tier 2 unlocked, Tier 3 still locked
  incrementEventProgress(ev, freeUser.id, 55, now);
  const sanBefore = sanitizeCommunityEventForClient(ev, freeUser.id, now);
  assert.equal(sanBefore.tiers[0].claimable, true);
  assert.equal(sanBefore.tiers[1].claimable, true);
  assert.equal(sanBefore.tiers[2].claimable, false);

  // Claim Tier 1 -> +30,000 bonus tokens
  const c1 = claimEventTierReward(ev, freeUser, 't1', now);
  assert.equal(c1.ok, true);
  assert.equal(freeUser.bonusTokens, 30000);
  assert.equal(freeUser.tokensRemaining, 55000);

  // Cannot double-claim Tier 1
  const dup = claimEventTierReward(ev, freeUser, 't1', now);
  assert.equal(dup.ok, false);

  // Claim Tier 2 -> Upgrades to Timed Loki Pro (5 Days)
  const c2 = claimEventTierReward(ev, freeUser, 't2', now);
  assert.equal(c2.ok, true);
  assert.equal(freeUser.plan, 'pro');
  assert.equal(freeUser.planSource, 'event');
  assert.equal(freeUser.planDurationLabel, '5 days');
  assert.ok((freeUser.planExpiresAt || 0) >= now + 5 * 86400 * 1000);

  // Reach 100 & claim Tier 3 -> Upgrades Pro to Timed Loki Ultimate (3 days)
  incrementEventProgress(ev, 'usr_ev_2', 45, now);
  const c3 = claimEventTierReward(ev, freeUser, 't3', now);
  assert.equal(c3.ok, true);
  assert.equal(freeUser.plan, 'ultimate');
  assert.equal(freeUser.planDurationLabel, '3 days');

  // Non-downgrade protection: an existing permanent Ultimate user claiming a Pro tier keeps Ultimate + receives bonus tokens
  const permUlt = makeUser({
    id: 'usr_ult_perm',
    username: 'UltVip',
    usernameLower: 'ultvip',
    plan: 'ultimate',
    planExpiresAt: null,
    bonusTokens: 0,
  });
  const cNonDowngrade = claimEventTierReward(ev, permUlt, 't2', now);
  assert.equal(cNonDowngrade.ok, true);
  assert.equal(permUlt.plan, 'ultimate');
  assert.equal(permUlt.planExpiresAt, null);
  assert.equal(permUlt.bonusTokens, 50000);
});
