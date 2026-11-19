import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMaintenanceDurationMs,
  formatMaintenanceCountdown,
  getMaintenanceCountdownSegments,
  resolveMaintenanceState,
  shouldShowMaintenanceOverlay,
} from './maintenanceMode.ts';

test('computeMaintenanceDurationMs supports minutes, hours, days, and weeks', () => {
  assert.equal(computeMaintenanceDurationMs(15, 'minutes'), 15 * 60_000);
  assert.equal(computeMaintenanceDurationMs(3, 'hours'), 3 * 3_600_000);
  assert.equal(computeMaintenanceDurationMs(2, 'days'), 2 * 86_400_000);
  assert.equal(computeMaintenanceDurationMs(1, 'weeks'), 7 * 86_400_000);
  assert.equal(computeMaintenanceDurationMs(0, 'minutes'), 0);
});

test('formatMaintenanceCountdown & segments render clean countdown strings', () => {
  assert.equal(formatMaintenanceCountdown(45_000), '45s');
  assert.equal(formatMaintenanceCountdown(5 * 60_000 + 9_000), '05m 09s');
  assert.equal(formatMaintenanceCountdown(2 * 3_600_000 + 4 * 60_000 + 3_000), '02h 04m 03s');
  const seg = getMaintenanceCountdownSegments(
    1 * 7 * 86_400_000 + 2 * 86_400_000 + 3 * 3_600_000 + 12 * 60_000 + 5_000
  );
  assert.deepEqual(seg, { weeks: 1, days: 2, hours: 3, minutes: 12, seconds: 5 });
});

test('resolveMaintenanceState auto-expires immediately once maintenanceEndsAt has passed', () => {
  const start = 1_700_000_000_000;
  const ends = start + 10 * 60_000;
  const cfg = {
    maintenanceMode: true,
    maintenanceTitle: 'Lokizenith v4.8 Rollout',
    maintenanceArticle: 'Adding brand-new voice tools and speed boosts.',
    maintenanceStartedAt: start,
    maintenanceEndsAt: ends,
    maintenanceDurationAmount: 10,
    maintenanceDurationUnit: 'minutes',
  };

  const mid = resolveMaintenanceState(cfg, start + 5 * 60_000);
  assert.equal(mid.active, true);
  assert.equal(mid.expired, false);
  assert.equal(mid.progressPct, 50);
  assert.equal(mid.remainingLabel, '05m 00s');

  const after = resolveMaintenanceState(cfg, ends);
  assert.equal(after.active, false);
  assert.equal(after.expired, true);
  assert.equal(after.remainingMs, 0);
});

test('shouldShowMaintenanceOverlay blocks non-admins and lets offline-returning accounts see it while admins bypass', () => {
  const now = 1_700_000_000_000;
  const cfg = {
    maintenanceMode: true,
    maintenanceTitle: 'Database & Engine Upgrade',
    maintenanceArticle: 'What we are adding:\n• Faster streaming\n• New Admin Power Tools',
    maintenanceStartedAt: now - 30_000,
    maintenanceEndsAt: now + 120_000,
    maintenanceDurationAmount: 2,
    maintenanceDurationUnit: 'minutes',
  };

  assert.equal(shouldShowMaintenanceOverlay(cfg, { username: 'alice', isAdmin: false }, now), true);
  assert.equal(shouldShowMaintenanceOverlay(cfg, null, now), true);
  assert.equal(shouldShowMaintenanceOverlay(cfg, { username: 'EladBenczel', isAdmin: true }, now), false);
  assert.equal(shouldShowMaintenanceOverlay(cfg, { username: 'mod', adminAccessLevel: 'partial' }, now), false);
  assert.equal(shouldShowMaintenanceOverlay(cfg, { username: 'alice', isAdmin: false }, now + 130_000), false);
});
