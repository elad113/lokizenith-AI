import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  safeEvalFormula,
  classifyConversationIntent,
  formatRelativeAge,
} from './interactiveBlocks.ts';

describe('safeEvalFormula', () => {
  it('evaluates basic arithmetic with operator precedence', () => {
    assert.equal(safeEvalFormula('2 + 3 * 4'), 14);
    assert.equal(safeEvalFormula('(2 + 3) * 4'), 20);
    assert.equal(safeEvalFormula('10 - 4 / 2'), 8);
    assert.equal(safeEvalFormula('2 ^ 3 ^ 2'), 512);
    assert.equal(safeEvalFormula('-5 + 12'), 7);
  });

  it('substitutes variables and supports compound financial formulas', () => {
    const res = safeEvalFormula('principal * (1 + rate / 100) ^ years', {
      principal: 10000,
      rate: 8,
      years: 10,
    });
    assert.ok(res !== null);
    assert.equal(Math.round(res!), 21589);
  });

  it('supports safe math functions', () => {
    assert.equal(safeEvalFormula('round(sqrt(2), 3)'), 1.414);
    assert.equal(safeEvalFormula('max(a, b) + min(a, b)', { a: 12, b: 5 }), 17);
    assert.equal(safeEvalFormula('Math.floor(x / 3)', { x: 10 }), 3);
  });

  it('rejects unsafe code injection, division by zero, and unknown identifiers', () => {
    assert.equal(safeEvalFormula('process.exit(1)'), null);
    assert.equal(safeEvalFormula('alert(1)'), null);
    assert.equal(safeEvalFormula('10 / 0'), null);
    assert.equal(safeEvalFormula('x + unknownVar', { x: 5 }), null);
    assert.equal(safeEvalFormula('(1 + 2'), null);
  });
});

describe('classifyConversationIntent', () => {
  it('detects code, image, video, interactive visual, search, and general chats', () => {
    assert.equal(classifyConversationIntent([{ content: '```ts\nconst x = 1;\n```' }]).kind, 'code');
    assert.equal(classifyConversationIntent([{ type: 'image', content: 'A neon fox' }]).kind, 'image');
    assert.equal(classifyConversationIntent([{ type: 'video', content: 'Ocean waves' }]).kind, 'video');
    assert.equal(classifyConversationIntent([{ content: '```loki-compare\n{}\n```' }]).kind, 'visual');
    assert.equal(classifyConversationIntent([{ content: 'Search the web for fusion news' }]).kind, 'search');
    assert.equal(classifyConversationIntent([{ content: 'Hello there!' }]).kind, 'chat');
  });
});

describe('formatRelativeAge', () => {
  it('formats minutes, hours, and days cleanly', () => {
    const base = 1_700_000_000_000;
    assert.equal(formatRelativeAge(base - 20_000, base), 'now');
    assert.equal(formatRelativeAge(base - 5 * 60_000, base), '5m');
    assert.equal(formatRelativeAge(base - 3 * 3600_000, base), '3h');
    assert.equal(formatRelativeAge(base - 2 * 86400_000, base), '2d');
  });
});
