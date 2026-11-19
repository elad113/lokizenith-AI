import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_TOKEN_LIMIT,
  REFERRAL_BONUS,
  RESET_INTERVAL_MS,
  ADMIN_USERNAME,
  DEV_CODE,
  DEV_ULTIMATE_FOREVER_CODE,
  DEV_CODES,
  DEV_CODE_BONUS,
  GIFT_CODES,
  normalizeUsername,
  hashPassword,
  verifyPassword,
  isAdminUsername,
  isUnlimitedUsername,
  refreshQuotaIfDue,
  applyTokenConsumption,
  redeemTokenCode,
  applyReferralBonus,
  resetAllAccountsUsage,
  resetUsersUsage,
  computeBanDurationMs,
  isAccountBanned,
  getBanInfo,
  sanitizeAccount,
  sanitizeAdminAccount,
  parseDeviceMetadata,
  generateInviteCode,
  canAccessRoom,
  type AccountRecord,
} from './authQuota.ts';

function makeAccount(username = 'Alice', tokens = DAILY_TOKEN_LIMIT, lastResetAt = 1_000_000): AccountRecord {
  const { hash, salt } = hashPassword('secret123');
  const norm = normalizeUsername(username);
  return {
    id: 'u_' + norm.usernameLower,
    username: norm.username,
    usernameLower: norm.usernameLower,
    passwordHash: hash,
    salt,
    tokensRemaining: tokens,
    tokenLimitBase: DAILY_TOKEN_LIMIT,
    bonusTokens: 0,
    lastResetAt,
    usedGiftCodes: [],
    totalTokensUsed: 0,
    createdAt: lastResetAt,
    inviteCode: 'TEST-1234',
    referralCount: 0,
    referralTokensEarned: 0,
  };
}

test('Username normalization enforces uniqueness case-insensitively and validates length', () => {
  const a = normalizeUsername('  Lokizenith  ');
  const b = normalizeUsername('lokizenith');
  assert.equal(a.valid, true);
  assert.equal(a.username, 'Lokizenith');
  assert.equal(a.usernameLower, b.usernameLower);

  assert.equal(normalizeUsername('A').valid, false);
  assert.equal(normalizeUsername('x'.repeat(30)).valid, false);
});

test('Password hashing and verification works reliably', () => {
  const { hash, salt } = hashPassword('MyPass99!');
  assert.equal(verifyPassword('MyPass99!', hash, salt), true);
  assert.equal(verifyPassword('WrongPass', hash, salt), false);
});

test('25k daily token limit consumption and zero-token block', () => {
  assert.equal(DAILY_TOKEN_LIMIT, 25000);
  const now = 1_000_000;
  const acc = makeAccount('Bob', DAILY_TOKEN_LIMIT, now);
  const c1 = applyTokenConsumption(acc, 10000, now + 1000);
  assert.equal(c1.allowed, true);
  assert.equal(c1.remaining, 15000);
  assert.equal(c1.exhausted, false);

  const c2 = applyTokenConsumption(acc, 20000, now + 2000);
  assert.equal(c2.allowed, true);
  assert.equal(c2.consumed, 15000);
  assert.equal(c2.remaining, 0);
  assert.equal(c2.exhausted, true);

  const c3 = applyTokenConsumption(acc, 500, now + 3000);
  assert.equal(c3.allowed, false);
  assert.equal(c3.remaining, 0);
  assert.equal(c3.exhausted, true);
});

test('Account named oron always has unlimited usage and persists across resets', () => {
  assert.equal(isUnlimitedUsername('oron'), true);
  assert.equal(isUnlimitedUsername('Oron'), true);
  assert.equal(isUnlimitedUsername('Bob'), false);

  const now = 1_000_000;
  const oron = makeAccount('oron', 0, now);
  const c1 = applyTokenConsumption(oron, 999999, now + 1000);
  assert.equal(c1.allowed, true);
  assert.equal(c1.isUnlimited, true);
  assert.equal(c1.exhausted, false);

  const s1 = sanitizeAccount(oron, now + 1000);
  assert.equal(s1.isUnlimited, true);
  assert.equal(s1.percentRemaining, 100);

  resetAllAccountsUsage([oron], now + 2000);
  const s2 = sanitizeAccount(oron, now + 2000);
  assert.equal(s2.isUnlimited, true);
  assert.equal(s2.percentRemaining, 100);
});

test('Bonus tokens update effective cycle ceiling (x / newMax) and revert on 6h reset', () => {
  const start = 1_000_000;
  const acc = makeAccount('Carol', DAILY_TOKEN_LIMIT, start);

  // Add +20k gift bonus while at 25k -> becomes 45,000 / 45,000
  const r = redeemTokenCode(acc, 'Lokizen4', 'gift', start + 500);
  assert.equal(r.ok, true);
  let s = sanitizeAccount(acc, start + 500);
  assert.equal(s.tokensRemaining, 45000);
  assert.equal(s.tokenLimitEffective, 45000);
  assert.equal(s.percentRemaining, 100);

  // Spend 15k -> becomes 30,000 / 45,000
  applyTokenConsumption(acc, 15000, start + 1000);
  s = sanitizeAccount(acc, start + 1000);
  assert.equal(s.tokensRemaining, 30000);
  assert.equal(s.tokenLimitEffective, 45000);
  assert.equal(s.percentRemaining, 67);

  // Before 6 hours: still carries bonus limit
  const before = refreshQuotaIfDue(acc, start + RESET_INTERVAL_MS - 1000);
  assert.equal(before, false);
  assert.equal(acc.tokensRemaining, 30000);

  // At 6 hours: resets back to standard 25,000 / 25,000
  const resetAt = start + RESET_INTERVAL_MS;
  const after = refreshQuotaIfDue(acc, resetAt);
  assert.equal(after, true);
  s = sanitizeAccount(acc, resetAt);
  assert.equal(s.tokensRemaining, DAILY_TOKEN_LIMIT);
  assert.equal(s.tokenLimitEffective, DAILY_TOKEN_LIMIT);
  assert.equal(s.bonusTokens, 0);
});

test('Gift codes work once per account and invalid errors never leak valid codes', () => {
  const now = 5_000_000;
  const acc = makeAccount('Dave', 0, now);

  assert.equal(GIFT_CODES.Lokizen4, 20000);
  assert.equal(GIFT_CODES.LokizenAI, 25000);
  assert.equal(GIFT_CODES.Stark4, 40000);

  const wrong = redeemTokenCode(acc, 'wrong_guess', 'gift', now);
  assert.equal(wrong.ok, false);
  assert.ok(!wrong.error?.includes('Lokizen4'));
  assert.ok(!wrong.error?.includes('LokizenAI'));
  assert.ok(!wrong.error?.includes('Stark4'));

  const r1 = redeemTokenCode(acc, 'Lokizen4', 'gift', now);
  assert.equal(r1.ok, true);
  assert.equal(r1.addedTokens, 20000);
  assert.equal(acc.tokensRemaining, 20000);

  // Second attempt on same account fails
  const r1Dup = redeemTokenCode(acc, 'Lokizen4', 'gift', now);
  assert.equal(r1Dup.ok, false);

  const r2 = redeemTokenCode(acc, 'LokizenAI', 'gift', now);
  assert.equal(r2.ok, true);
  assert.equal(acc.tokensRemaining, 45000);

  const r3 = redeemTokenCode(acc, 'Stark4', 'gift', now);
  assert.equal(r3.ok, true);
  assert.equal(acc.tokensRemaining, 85000);

  // Separate account CAN use Lokizen4 once
  const acc2 = makeAccount('Eve', 0, now);
  const otherAccRes = redeemTokenCode(acc2, 'Lokizen4', 'gift', now);
  assert.equal(otherAccRes.ok, true);
  assert.equal(acc2.tokensRemaining, 20000);
});

test('DEV CODE supports both fckron and oron2008 with unlimited redemptions', () => {
  assert.ok(DEV_CODES.includes('fckron'));
  assert.ok(DEV_CODES.includes('oron2008'));
  const now = 5_000_000;
  const acc = makeAccount('DevUser', 0, now);

  const d1 = redeemTokenCode(acc, DEV_CODE, 'dev', now);
  assert.equal(d1.ok, true);
  assert.equal(d1.addedTokens, DEV_CODE_BONUS);
  assert.equal(acc.tokensRemaining, 200000);

  const d2 = redeemTokenCode(acc, 'oron2008', 'dev', now);
  assert.equal(d2.ok, true);
  assert.equal(d2.addedTokens, DEV_CODE_BONUS);
  assert.equal(acc.tokensRemaining, 400000);
  assert.equal(sanitizeAccount(acc, now).tokenLimitEffective, DAILY_TOKEN_LIMIT + 400000);

  const wrong = redeemTokenCode(acc, 'badcode', 'dev', now);
  assert.equal(wrong.ok, false);
});

test('Referral bonus awards +25k tokens to inviter and updates effective ceiling', () => {
  const now = 5_000_000;
  const inviter = makeAccount('Referrer', DAILY_TOKEN_LIMIT, now);
  const res = applyReferralBonus(inviter, now + 100);
  assert.equal(res.bonus, REFERRAL_BONUS);
  assert.equal(inviter.tokensRemaining, 50000);
  assert.equal(inviter.referralCount, 1);
  assert.equal(sanitizeAccount(inviter, now + 100).tokenLimitEffective, 50000);
});

test('EladBenczel (benczelelad@gmail.com) is root admin, Lokizenith is not admin, and partial/full access works', () => {
  assert.equal(isAdminUsername(ADMIN_USERNAME), true);
  assert.equal(isAdminUsername('eladbenczel'), true);
  assert.equal(isAdminUsername('someuser', 'benczelelad@gmail.com'), true);
  assert.equal(isAdminUsername('lokizenith'), false);
  assert.equal(isAdminUsername('OtherUser'), false);

  const u1 = makeAccount('EladBenczel', 500, 1000);
  const u2 = makeAccount('Lokizenith', 0, 1000);
  redeemTokenCode(u2, 'fckron', 'dev', 2000);
  const resetNow = 200_000;

  const count = resetAllAccountsUsage([u1, u2], resetNow);
  assert.equal(count, 2);
  assert.equal(u1.tokensRemaining, DAILY_TOKEN_LIMIT);
  assert.equal(u2.tokensRemaining, DAILY_TOKEN_LIMIT);
  assert.equal(u2.bonusTokens, 0);
  assert.equal(u2.lastResetAt, resetNow);
  assert.equal(sanitizeAccount(u1, resetNow).isAdmin, true);
  assert.equal(sanitizeAccount(u1, resetNow).isRootAdmin, true);
  assert.equal(sanitizeAccount(u1, resetNow).adminAccessLevel, 'full');
  assert.equal(sanitizeAccount(u2, resetNow).isAdmin, false);
  assert.equal(sanitizeAccount(u2, resetNow).adminAccessLevel, 'none');

  // Grant partial admin access to u2
  u2.adminAccessLevel = 'partial';
  u2.adminPermissions = ['directory', 'soundboard'];
  const sPartial = sanitizeAccount(u2, resetNow);
  assert.equal(sPartial.isAdmin, true);
  assert.equal(sPartial.isRootAdmin, false);
  assert.equal(sPartial.adminAccessLevel, 'partial');
  assert.deepEqual(sPartial.adminPermissions, ['directory', 'soundboard']);
});

test('Room access check verifies owner and active members after revocation', () => {
  const room = { ownerId: 'u_owner', memberIds: ['u_owner', 'u_guest'] };
  assert.equal(canAccessRoom(room, 'u_owner'), true);
  assert.equal(canAccessRoom(room, 'u_guest'), true);
  room.memberIds = room.memberIds.filter((id) => id !== 'u_guest');
  assert.equal(canAccessRoom(room, 'u_guest'), false);
});

test('Targeted resetUsersUsage resets only specified users and preserves others', () => {
  const now = 10_000_000;
  const u1 = makeAccount('Alice', 100, 1000);
  const u2 = makeAccount('Bob', 200, 1000);
  const u3 = makeAccount('Charlie', 300, 1000);
  const affected = resetUsersUsage([u1, u2, u3], ['alice', 'charlie'], now);
  assert.equal(affected.length, 2);
  assert.equal(u1.tokensRemaining, DAILY_TOKEN_LIMIT);
  assert.equal(u2.tokensRemaining, 200);
  assert.equal(u3.tokensRemaining, DAILY_TOKEN_LIMIT);
});

test('Account ban supports timed durations, permanent bans, and auto-expires cleanly', () => {
  const now = 1_000_000_000;
  const acc = makeAccount('BannedUser', DAILY_TOKEN_LIMIT, now);
  acc.banned = true;
  acc.bannedPermanent = false;
  acc.bannedUntil = now + computeBanDurationMs(2, 'days');
  acc.banReason = 'Abuse';

  assert.equal(isAccountBanned(acc, now + 1000), true);
  const info = getBanInfo(acc, now + 1000);
  assert.equal(info?.permanent, false);
  assert.ok(info?.remainingText.includes('d'));

  // Past expiry automatically lifts ban
  assert.equal(isAccountBanned(acc, now + computeBanDurationMs(3, 'days')), false);
  assert.equal(acc.banned, false);

  // Permanent ban never expires
  acc.banned = true;
  acc.bannedPermanent = true;
  acc.bannedUntil = null;
  assert.equal(isAccountBanned(acc, now + computeBanDurationMs(50, 'years')), true);
  assert.equal(getBanInfo(acc, now)?.permanent, true);
});

test('Invite numbers are 8 digits and admin sanitization exposes password/device only to admin view', () => {
  const code1 = generateInviteCode('Alice');
  const code2 = generateInviteCode('Bob');
  assert.match(code1, /^\d{8}$/);
  assert.match(code2, /^\d{8}$/);

  const now = 1_500_000_000;
  const acc = makeAccount('Regular', DAILY_TOKEN_LIMIT, now);
  acc.adminPlainPassword = 'MyVisiblePass!1';
  acc.invitedBy = 'Lokizenith';
  acc.loginCount = 4;
  acc.deviceInfo = parseDeviceMetadata(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36',
    { screen: '1920x1080', timezone: 'Asia/Jerusalem', language: 'he-IL' },
    '1.2.3.4'
  );
  assert.equal(acc.deviceInfo.os, 'Windows 10/11');
  assert.equal(acc.deviceInfo.browser, 'Chrome');
  assert.equal(acc.deviceInfo.deviceType, 'Desktop');
  assert.equal(acc.deviceInfo.screen, '1920x1080');
  assert.equal(acc.deviceInfo.ip, '1.2.3.4');

  const normalView = sanitizeAccount(acc, now) as any;
  assert.equal(normalView.adminPassword, undefined);
  assert.equal(normalView.deviceInfo, undefined);
  assert.equal(normalView.loginCount, undefined);

  const adminView = sanitizeAdminAccount(acc, now);
  assert.equal(adminView.adminPassword, 'MyVisiblePass!1');
  assert.equal(adminView.invitedBy, 'Lokizenith');
  assert.equal(adminView.loginCount, 4);
  assert.equal(adminView.deviceInfo?.browser, 'Chrome');
  assert.equal(adminView.deviceInfo?.ip, '1.2.3.4');
});

test('DEV CODE Ronmagniv grants Loki Ultimate Forever and infinite access for everything', () => {
  assert.equal(DEV_ULTIMATE_FOREVER_CODE, 'Ronmagniv');
  assert.ok(DEV_CODES.includes('Ronmagniv'));

  const now = 2_000_000_000;
  const acc = makeAccount('LuckyDev', 1200, now);

  // Reject if mistakenly entered in gift code tab
  const wrongTab = redeemTokenCode(acc, 'ronmagniv', 'gift', now);
  assert.equal(wrongTab.ok, false);
  assert.match(String(wrongTab.error || ''), /DEV CODE/i);

  // Redeem case-insensitively in dev tab
  const okRes = redeemTokenCode(acc, 'rOnMaGnIv', 'dev', now);
  assert.equal(okRes.ok, true);
  assert.equal(okRes.grantedUltimateForever, true);
  assert.equal(okRes.plan, 'ultimate');
  assert.equal(okRes.isUnlimited, true);
  assert.equal(acc.plan, 'ultimate');
  assert.equal(acc.planExpiresAt, null);
  assert.equal(acc.unlimitedOverride, true);
  assert.equal(acc.starkAuthorized, true);

  // Sanitized view exposes unlimited everything
  const san = sanitizeAccount(acc, now + 1000);
  assert.equal(san.plan, 'ultimate');
  assert.equal(san.effectivePlan, 'ultimate');
  assert.equal(san.isUnlimited, true);
  assert.equal(san.starkAuthorized, true);
  assert.equal(san.planExpiresAt, null);
  assert.equal(san.planBenefits.animatedBackgrounds, true);
  assert.equal(san.planBenefits.animatedVideoBanner, true);
  assert.equal(san.planBenefits.ultraThinkingUnlocked, true);
  assert.equal(san.planBenefits.aiDesignUnlocked, true);
  for (const feat of ['image', 'lokicode', 'stark', 'attachment', 'share_chat'] as const) {
    assert.equal(san.featureQuotas[feat].unlimited, true);
    assert.equal(san.featureQuotas[feat].exhausted, false);
    assert.equal(san.featureQuotas[feat].limit, null);
  }

  // Advance 10 years + trigger usage reset: NEVER expires!
  const tenYearsLater = now + 10 * 365 * 86400 * 1000;
  refreshQuotaIfDue(acc, tenYearsLater);
  resetAllAccountsUsage([acc], tenYearsLater);
  const sanFuture = sanitizeAccount(acc, tenYearsLater);
  assert.equal(sanFuture.effectivePlan, 'ultimate');
  assert.equal(sanFuture.isUnlimited, true);
  assert.equal(sanFuture.starkAuthorized, true);

  // Token consumption never exhausts quota
  const spend = applyTokenConsumption(acc, 50_000_000, tenYearsLater + 1000);
  assert.equal(spend.allowed, true);
  assert.equal(spend.isUnlimited, true);
  assert.equal(spend.exhausted, false);
});
