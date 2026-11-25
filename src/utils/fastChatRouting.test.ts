import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFastSpeedDirective,
  detectCodeOrUiRequest,
  planFastChatRoute,
} from './fastChatRouting.ts';

test('planFastChatRoute uses fast hedged Flash Lite + Gemini 4 Hydrogen within 1-5s budget for Turbo and Ultra', () => {
  const turbo = planFastChatRoute({ level: 0, mode: 'fast', answerLength: 'medium', maxTokens: 4096 });
  assert.equal(turbo.isTurbo, true);
  assert.equal(turbo.isFastMode, true);
  assert.equal(turbo.primaryModel, 'gemini-3.1-flash-lite');
  assert.equal(turbo.primaryThinking, 'MINIMAL');
  assert.equal(turbo.secondaryModel, 'gemini-4-hydrogen');
  assert.ok(turbo.hedgeDelayMs <= 1200, 'must hedge early within 1-5s budget');
  assert.ok(turbo.firstTokenTimeoutMs <= 3000, 'must fail over before 5s budget expires');
  assert.ok(turbo.errorCooldownMs <= 10000, 'must not ban fast model for 45s on transient error');
  assert.equal(turbo.maxOutputTokens, 1100);

  const ultra = planFastChatRoute({ level: 4, mode: 'ultra', answerLength: 'detailed', maxTokens: 4600 });
  assert.equal(ultra.isUltra, true);
  assert.equal(ultra.isFastMode, true);
  assert.equal(ultra.primaryModel, 'gemini-3.1-flash-lite');
  assert.equal(ultra.primaryThinking, 'LOW');
  assert.ok(ultra.hedgeDelayMs <= 900);
  assert.ok(ultra.firstTokenTimeoutMs <= 3000);
  assert.equal(ultra.maxOutputTokens, 1600);
});

test('planFastChatRoute keeps generous token budget for code/UI builds even in Turbo & Ultra', () => {
  const uiReq = planFastChatRoute({
    level: 4,
    mode: 'ultra',
    answerLength: 'medium',
    maxTokens: 4600,
    userText: 'Build me an interactive HTML calculator app',
  });
  assert.equal(uiReq.isCodeOrUi, true);
  assert.ok(uiReq.maxOutputTokens >= 3600);

  const hebrewCode = detectCodeOrUiRequest('תבנה לי מחשבון יפה עם ממשק');
  assert.equal(hebrewCode, true);
});

test('planFastChatRoute preserves quality-first Gemini 4 Hydrogen for LSL scripts and Deep modes', () => {
  const lsl = planFastChatRoute({ level: 0, mode: 'fast', isLslChat: true, maxTokens: 1400 });
  assert.equal(lsl.preferQuality, true);
  assert.equal(lsl.primaryModel, 'gemini-4-hydrogen');
  assert.equal(lsl.primaryThinking, 'MEDIUM');
  assert.equal(lsl.maxOutputTokens, 8192);

  const xhigh = planFastChatRoute({ level: 3, mode: 'auto', maxTokens: 4600 });
  assert.equal(xhigh.isFastMode, false);
  assert.equal(xhigh.primaryModel, 'gemini-4-hydrogen');
  assert.equal(xhigh.primaryThinking, 'MEDIUM');
  assert.equal(xhigh.maxOutputTokens, 4600);
});

test('buildFastSpeedDirective returns concise speed directives for Turbo and Ultra only', () => {
  const turboDir = buildFastSpeedDirective({ level: 0, userText: 'Why is the sky blue?' });
  assert.match(turboDir, /TURBO SPEED MODE/i);
  assert.match(turboDir, /Do NOT emit heavy JSON loki-\*/i);

  const ultraDir = buildFastSpeedDirective({ level: 4, userText: 'Explain black holes' });
  assert.match(ultraDir, /ULTRA SPEED \+ PRECISION MODE/i);

  const uiUltraDir = buildFastSpeedDirective({ level: 4, userText: 'Create an interactive HTML calculator' });
  assert.ok(!/Do NOT emit heavy JSON/i.test(uiUltraDir));

  assert.equal(buildFastSpeedDirective({ level: 2, userText: 'Explain black holes' }), '');
  assert.equal(buildFastSpeedDirective({ level: 0, isLslChat: true, userText: 'Write LSL door script' }), '');
});
