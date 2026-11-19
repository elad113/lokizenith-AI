import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISPLAY_NAME_COOLDOWN_MS,
  validateDisplayNameChange,
  evaluateUniversalFormula,
  extractTeamChatMentions,
  upsertSameDayChangelog,
} from './profileAndFormulaUtils.ts';

test('display name: defaults to username and first change is free', () => {
  const now = 1_700_000_000_000;
  const res = validateDisplayNameChange({
    username: 'EladBenczel',
    currentDisplayName: 'EladBenczel',
    requestedDisplayName: 'Nova',
    displayNameChangeCount: 0,
    now,
  });
  assert.equal(res.allowed, true);
  assert.equal(res.changed, true);
  assert.equal(res.displayName, 'Nova');
  assert.equal(res.nextChangeCount, 1);
  assert.equal(res.nextLastChangedAt, now);
  assert.equal(res.firstChangeFreeAvailable, false);
});

test('display name: blocks second change before 14 days have elapsed', () => {
  const firstChangeAt = 1_700_000_000_000;
  const fiveDaysLater = firstChangeAt + 5 * 24 * 60 * 60 * 1000;
  const res = validateDisplayNameChange({
    username: 'EladBenczel',
    currentDisplayName: 'Nova',
    requestedDisplayName: 'NovaPrime',
    displayNameChangeCount: 1,
    lastDisplayNameChangeAt: firstChangeAt,
    now: fiveDaysLater,
  });
  assert.equal(res.allowed, false);
  assert.equal(res.changed, false);
  assert.equal(res.displayName, 'Nova');
  assert.ok(res.cooldownRemainingMs > 0);
  assert.match(res.error || '', /14-day cooldown/i);
});

test('display name: allows second change once 14 days have passed', () => {
  const firstChangeAt = 1_700_000_000_000;
  const fourteenDaysLater = firstChangeAt + DISPLAY_NAME_COOLDOWN_MS + 1000;
  const res = validateDisplayNameChange({
    username: 'EladBenczel',
    currentDisplayName: 'Nova',
    requestedDisplayName: 'NovaPrime',
    displayNameChangeCount: 1,
    lastDisplayNameChangeAt: firstChangeAt,
    now: fourteenDaysLater,
  });
  assert.equal(res.allowed, true);
  assert.equal(res.changed, true);
  assert.equal(res.displayName, 'NovaPrime');
  assert.equal(res.nextChangeCount, 2);
});

test('universal formula evaluator: evaluates standard expressions and never returns N/A on vector/gradient formulas', () => {
  const kinetic = evaluateUniversalFormula(
    '0.5 * m * v^2',
    [
      { symbol: 'm', defaultVal: 10 },
      { symbol: 'v', defaultVal: 4 },
    ],
    { m: 10, v: 4 }
  );
  assert.equal(kinetic.ok, true);
  assert.equal(kinetic.value, 80);
  assert.equal(kinetic.formatted, '80');

  // Vector gradient formula like the user's screenshot: \nabla \phi = \frac{\partial \phi}{\partial x}\hat{x} + ...
  const phaseGrad = evaluateUniversalFormula(
    '\\nabla \\phi = \\frac{\\partial \\phi}{\\partial x}\\hat{x} + \\frac{\\partial \\phi}{\\partial y}\\hat{y} + \\frac{\\partial \\phi}{\\partial z}\\hat{z}',
    [
      { symbol: 'phi', defaultVal: 4 },
      { symbol: 'x', defaultVal: 1.7 },
      { symbol: 'y', defaultVal: 1 },
      { symbol: 'z', defaultVal: 1 },
    ],
    { phi: 4, x: 1.7, y: 1, z: 1 }
  );
  assert.equal(phaseGrad.ok, true);
  assert.ok(Number.isFinite(phaseGrad.value));
  assert.notEqual(phaseGrad.formatted, 'N/A');
  assert.ok(phaseGrad.value > 0);
});

test('extractTeamChatMentions: detects @AI and @member by username or displayName', () => {
  const members = [
    { username: 'EladBenczel', displayName: 'Nova' },
    { username: 'AppleJuice', displayName: 'AppleJuice' },
  ];
  const r1 = extractTeamChatMentions('Hey @Nova and @AppleJuice check this out @AI', members);
  assert.equal(r1.askAi, true);
  assert.deepEqual(r1.mentionedUsernames, ['EladBenczel', 'AppleJuice']);
  const r2 = extractTeamChatMentions('@Loki what is 2+2?', members);
  assert.equal(r2.askAi, true);
  assert.deepEqual(r2.mentionedUsernames, []);
});

test('upsertSameDayChangelog: merges new items into today entry instead of duplicating', () => {
  const initial = [
    {
      version: '25.5',
      date: 'March 2026',
      title: 'Initial Update',
      items: [{ icon: '📐', type: 'new', text: 'Added MATLAB to LokiCode' }],
    },
  ];
  const merged = upsertSameDayChangelog(initial, {
    version: '26.0',
    date: 'March 2026',
    title: 'Profile Studio & Voice Call Update',
    items: [
      { icon: '👤', type: 'new', text: 'Added Profile Studio with avatar & banner cropper' },
      { icon: '📐', type: 'new', text: 'Added MATLAB to LokiCode' },
    ],
  });
  assert.equal(merged.length, 1);
  assert.equal(merged[0].version, '26.0');
  assert.equal(merged[0].items.length, 2);
});
