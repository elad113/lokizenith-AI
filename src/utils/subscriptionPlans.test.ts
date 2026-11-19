import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAN_CONFIGS,
  resolveEffectivePlan,
  getPlanPurchaseOptions,
  getWeeklyFriday3pmEstWindow,
  refreshAndGetFeatureQuotas,
  consumeFeatureQuota,
  clampVideoBannerPlaybackTime,
  type UserSubscriptionState,
} from './subscriptionPlans.ts';
import { sanitizeAccount, type AccountRecord } from './authQuota.ts';
import {
  PAYPAL_PLAN_ID_PRO,
  PAYPAL_PLAN_ID_ULTIMATE,
  resolveTierFromPayPalPlanId,
  detectPayPalTrialActive,
} from '../server/paypal.ts';

test('Plan configurations match exact specification', () => {
  assert.equal(PLAN_CONFIGS.free.monthlyPrice, 0);
  assert.equal(PLAN_CONFIGS.free.tokenLimitBase, 25000);
  assert.equal(PLAN_CONFIGS.free.dailyImagesLimit, 8);
  assert.equal(PLAN_CONFIGS.free.lokiCodeLimit, 12);
  assert.equal(PLAN_CONFIGS.free.starkMessagesLimit, 10);
  assert.equal(PLAN_CONFIGS.free.attachmentsLimit, 8);
  assert.equal(PLAN_CONFIGS.free.weeklySharesLimit, 4);

  assert.equal(PLAN_CONFIGS.pro.monthlyPrice, 7.99);
  assert.equal(PLAN_CONFIGS.pro.tokenLimitBase, 125000); // 5x more usage
  assert.equal(PLAN_CONFIGS.pro.dailyImagesLimit, 15);
  assert.equal(PLAN_CONFIGS.pro.lokiCodeLimit, 52);
  assert.equal(PLAN_CONFIGS.pro.starkMessagesLimit, 85);
  assert.equal(PLAN_CONFIGS.pro.attachmentsLimit, 25);
  assert.equal(PLAN_CONFIGS.pro.weeklySharesLimit, 12);
  assert.equal(PLAN_CONFIGS.pro.animatedBackgrounds, true);
  assert.equal(PLAN_CONFIGS.pro.animatedVideoBanner, true);
  assert.equal(PLAN_CONFIGS.pro.ultraThinkingUnlocked, false);

  assert.equal(PLAN_CONFIGS.ultimate.monthlyPrice, 12.99);
  assert.equal(PLAN_CONFIGS.ultimate.unlimitedTokens, true);
  assert.equal(PLAN_CONFIGS.ultimate.dailyImagesLimit, null);
  assert.equal(PLAN_CONFIGS.ultimate.lokiCodeLimit, null);
  assert.equal(PLAN_CONFIGS.ultimate.starkMessagesLimit, null);
  assert.equal(PLAN_CONFIGS.ultimate.attachmentsLimit, null);
  assert.equal(PLAN_CONFIGS.ultimate.weeklySharesLimit, null);
  assert.equal(PLAN_CONFIGS.ultimate.ultraThinkingUnlocked, true);
  assert.equal(PLAN_CONFIGS.ultimate.aiDesignUnlocked, true);
});

test('Upgrade proration ($5.00 from Pro to Ultimate), obtainability, and one-time 3-day trial', () => {
  const now = 1_700_000_000_000;
  const freeUser: UserSubscriptionState = { plan: 'free', usedUltimateTrial: false };
  const freeOpts = getPlanPurchaseOptions(freeUser, now);
  assert.equal(freeOpts.tiers.pro.obtainable, true);
  assert.equal(freeOpts.tiers.pro.displayPrice, 7.99);
  assert.equal(freeOpts.tiers.ultimate.obtainable, true);
  assert.equal(freeOpts.tiers.ultimate.displayPrice, 12.99);
  assert.equal(freeOpts.tiers.ultimate.trialAvailable, true);
  assert.equal(freeOpts.canCancel, false);

  // Pro user -> Free is unobtainable, Ultimate costs $5.00 ($12.99 - $7.99)
  const proUser: UserSubscriptionState = {
    plan: 'pro',
    planStatus: 'active',
    planExpiresAt: now + 30 * 86400 * 1000,
    usedUltimateTrial: true,
  };
  const proOpts = getPlanPurchaseOptions(proUser, now);
  assert.equal(proOpts.tiers.free.obtainable, false);
  assert.equal(proOpts.tiers.pro.obtainable, false);
  assert.equal(proOpts.tiers.pro.isCurrent, true);
  assert.equal(proOpts.tiers.ultimate.obtainable, true);
  assert.equal(proOpts.tiers.ultimate.displayPrice, 5.0);
  assert.equal(proOpts.tiers.ultimate.isProratedFromPro, true);
  assert.equal(proOpts.tiers.ultimate.priceText, '$5.00/Month');
  assert.equal(proOpts.tiers.ultimate.trialAvailable, false); // already used trial
  assert.equal(proOpts.canCancel, true);

  // Ultimate user -> Free and Pro are unobtainable
  const ultUser: UserSubscriptionState = {
    plan: 'ultimate',
    planStatus: 'active',
    planExpiresAt: now + 30 * 86400 * 1000,
  };
  const ultOpts = getPlanPurchaseOptions(ultUser, now);
  assert.equal(ultOpts.tiers.free.obtainable, false);
  assert.equal(ultOpts.tiers.pro.obtainable, false);
  assert.equal(ultOpts.tiers.ultimate.obtainable, false);
  assert.equal(ultOpts.tiers.ultimate.isCurrent, true);
});

test('Canceled plan keeps active benefits until planExpiresAt then reverts to free', () => {
  const now = 1_700_000_000_000;
  const expiresAt = now + 5 * 86400 * 1000;
  const user: UserSubscriptionState = {
    plan: 'pro',
    planStatus: 'canceled',
    planExpiresAt: expiresAt,
  };

  // Before expiration: still Pro
  const before = resolveEffectivePlan(user, now + 1000);
  assert.equal(before.effectivePlan, 'pro');
  assert.equal(before.isCanceledButActive, true);

  // After expiration: reverts to Free
  const after = resolveEffectivePlan(user, expiresAt + 1);
  assert.equal(after.effectivePlan, 'free');
  assert.equal(after.expired, true);
});

test('Feature quotas enforce limits and reset on their respective cycles', () => {
  const now = 1_700_000_000_000;
  const state: UserSubscriptionState = { plan: 'free' };

  // Consume 8 images on Free plan
  for (let i = 0; i < 8; i++) {
    const r = consumeFeatureQuota(state, 'image', 1, now);
    assert.equal(r.allowed, true);
  }
  const ninth = consumeFeatureQuota(state, 'image', 1, now);
  assert.equal(ninth.allowed, false);
  assert.equal(ninth.status.exhausted, true);

  // 16 hours later -> resets!
  const after16h = now + 16 * 3600 * 1000 + 1;
  const resetImg = consumeFeatureQuota(state, 'image', 1, after16h);
  assert.equal(resetImg.allowed, true);
  assert.equal(resetImg.status.used, 1);

  // Stark messages: Free has 10 unless starkAuthorized
  for (let i = 0; i < 10; i++) {
    assert.equal(consumeFeatureQuota(state, 'stark', 1, now).allowed, true);
  }
  assert.equal(consumeFeatureQuota(state, 'stark', 1, now).allowed, false);

  // Admin grants starkAuthorized -> unlimited Stark even on Free
  state.starkAuthorized = true;
  assert.equal(consumeFeatureQuota(state, 'stark', 1, now).allowed, true);
});

test('Weekly Friday 3:00 PM EST reset window and 4-second video banner loop clamp', () => {
  const now = Date.UTC(2026, 10, 14, 12, 0, 0); // Saturday Nov 14, 2026 12:00 UTC
  const win = getWeeklyFriday3pmEstWindow(now);
  // Previous Friday Nov 13, 2026 at 20:00 UTC (3:00 PM EST)
  assert.equal(win.lastFridayResetAt, Date.UTC(2026, 10, 13, 20, 0, 0));
  assert.equal(win.nextFridayResetAt, Date.UTC(2026, 10, 20, 20, 0, 0));

  assert.deepEqual(clampVideoBannerPlaybackTime(2.5), { shouldReset: false, nextTimeSec: 2.5 });
  assert.deepEqual(clampVideoBannerPlaybackTime(4.0), { shouldReset: true, nextTimeSec: 0 });
  assert.deepEqual(clampVideoBannerPlaybackTime(6.2), { shouldReset: true, nextTimeSec: 0 });
});

test('PayPal plan ID resolution and built-in 3-day trial detection', () => {
  assert.equal(resolveTierFromPayPalPlanId(PAYPAL_PLAN_ID_PRO), 'pro');
  assert.equal(resolveTierFromPayPalPlanId(PAYPAL_PLAN_ID_ULTIMATE), 'ultimate');
  assert.equal(resolveTierFromPayPalPlanId('P-UNKNOWN'), null);

  // Explicit PayPal TRIAL cycle execution on Ultimate
  assert.equal(
    detectPayPalTrialActive({
      plan_id: PAYPAL_PLAN_ID_ULTIMATE,
      billing_info: {
        cycle_executions: [
          { tenure_type: 'TRIAL', cycles_completed: 0, cycles_remaining: 1, total_cycles: 1 },
          { tenure_type: 'REGULAR', cycles_completed: 0, cycles_remaining: 0, total_cycles: 0 },
        ],
      },
    }),
    true
  );

  // Regular cycle already completed -> not in trial
  assert.equal(
    detectPayPalTrialActive({
      plan_id: PAYPAL_PLAN_ID_ULTIMATE,
      billing_info: {
        cycle_executions: [
          { tenure_type: 'TRIAL', cycles_completed: 1, cycles_remaining: 0, total_cycles: 1 },
          { tenure_type: 'REGULAR', cycles_completed: 1, cycles_remaining: 0, total_cycles: 0 },
        ],
      },
    }),
    false
  );
});

test('sanitizeAccount exposes consistent plan, effectivePlan, planTier, and PayPal metadata', () => {
  const now = 1_700_000_000_000;
  const baseAcc: AccountRecord = {
    id: 'usr_test_1',
    username: 'Tester',
    usernameLower: 'tester',
    passwordHash: 'h',
    salt: 's',
    plan: 'pro',
    planStatus: 'active',
    planSource: 'admin',
    planStartedAt: now,
    planExpiresAt: now + 30 * 86400 * 1000,
    tokensRemaining: 125000,
    tokenLimitBase: 125000,
    lastResetAt: now,
    usedGiftCodes: [],
    totalTokensUsed: 0,
    createdAt: now,
  };

  const sanPro = sanitizeAccount(baseAcc, now);
  assert.equal(sanPro.plan, 'pro');
  assert.equal(sanPro.effectivePlan, 'pro');
  assert.equal(sanPro.planTier, 'pro');
  assert.equal(sanPro.planTag, 'PRO');
  assert.equal(sanPro.planSource, 'admin');
  assert.equal(sanPro.tokenLimitBase, 125000);

  baseAcc.plan = 'ultimate';
  baseAcc.planStatus = 'trialing';
  baseAcc.planSource = 'paypal';
  baseAcc.paypalSubscriptionId = 'I-TEST12345';
  const sanUlt = sanitizeAccount(baseAcc, now);
  assert.equal(sanUlt.plan, 'ultimate');
  assert.equal(sanUlt.effectivePlan, 'ultimate');
  assert.equal(sanUlt.planTier, 'ultimate');
  assert.equal(sanUlt.planTag, 'ULTIMATE');
  assert.equal(sanUlt.isTrialing, true);
  assert.equal(sanUlt.isUnlimited, true);
  assert.equal(sanUlt.paypalSubscriptionId, 'I-TEST12345');
});

import { computePlanDurationMs, formatPlanDurationLabel } from './subscriptionPlans.ts';
import { isQuotaUnlimitedAccount } from './authQuota.ts';

test('Timed Admin plan duration helpers and Root Admin test mode enforcement', () => {
  const now = 1_700_000_000_000;
  assert.equal(computePlanDurationMs(5, 'days'), 5 * 24 * 60 * 60 * 1000);
  assert.equal(computePlanDurationMs(2, 'weeks'), 14 * 24 * 60 * 60 * 1000);
  assert.equal(computePlanDurationMs(1, 'months'), 30 * 24 * 60 * 60 * 1000);
  assert.equal(computePlanDurationMs(1, 'years'), 365 * 24 * 60 * 60 * 1000);
  assert.equal(formatPlanDurationLabel(1, 'weeks'), '1 week');
  assert.equal(formatPlanDurationLabel(5, 'days'), '5 days');

  const rootAdminTestingFree: AccountRecord = {
    id: 'usr_root',
    username: 'EladBenczel',
    usernameLower: 'eladbenczel',
    passwordHash: 'h',
    salt: 's',
    adminAccessLevel: 'full',
    unlimitedOverride: true,
    adminPlanTestMode: true,
    plan: 'free',
    planStatus: 'active',
    planSource: 'admin',
    planExpiresAt: null,
    tokensRemaining: 25000,
    tokenLimitBase: 25000,
    lastResetAt: now,
    usedGiftCodes: [],
    totalTokensUsed: 0,
    createdAt: now,
  };

  assert.equal(isQuotaUnlimitedAccount(rootAdminTestingFree), false);
  const sanFreeRoot = sanitizeAccount(rootAdminTestingFree, now);
  assert.equal(sanFreeRoot.effectivePlan, 'free');
  assert.equal(sanFreeRoot.isUnlimited, false);
  assert.equal(sanFreeRoot.featureQuotas.stark.limit, 10);

  // Timed 5-day Pro grant expires cleanly at boundary and reverts to free
  rootAdminTestingFree.plan = 'pro';
  rootAdminTestingFree.planExpiresAt = now + computePlanDurationMs(5, 'days');
  const sanTimedPro = sanitizeAccount(rootAdminTestingFree, now + 1000);
  assert.equal(sanTimedPro.effectivePlan, 'pro');
  assert.equal(sanTimedPro.featureQuotas.stark.limit, 85);

  const sanAfterExpiry = sanitizeAccount(rootAdminTestingFree, (rootAdminTestingFree.planExpiresAt || now) + 1);
  assert.equal(sanAfterExpiry.effectivePlan, 'free');
  assert.equal(sanAfterExpiry.featureQuotas.stark.limit, 10);

  // Permanent Ultimate restores unlimited status for Root Admin
  rootAdminTestingFree.plan = 'ultimate';
  rootAdminTestingFree.planExpiresAt = null;
  rootAdminTestingFree.adminPlanTestMode = false;
  assert.equal(isQuotaUnlimitedAccount(rootAdminTestingFree), true);
  assert.equal(sanitizeAccount(rootAdminTestingFree, now).isUnlimited, true);
});

