import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getReasoningConfig,
  mergeResearchSources,
  resolveAppLanguage,
  clampMascotPosition,
  computeMascotLiveKinematics,
  isUsageUnlimited,
  detectSpokenLanguage,
  CALL_VOICE_PROFILES,
  getLokiBotGrokConfig,
} from './lokizenCore.ts';

test('Ultra mode (level 4) is 4x faster while preserving all 4 reasoning passes', () => {
  const cfg = getReasoningConfig(4);
  assert.equal(cfg.level, 4);
  assert.deepEqual(cfg.passes, ['Plan', 'Draft', 'Critique', 'Perfect']);
  assert.equal(cfg.speedupFactor, 4);
  assert.ok(cfg.estimatedMs <= 2500);
});

test('isUsageUnlimited returns true permanently', () => {
  assert.equal(isUsageUnlimited(), true);
});

test('CALL_VOICE_PROFILES contains 3 male voices and 3 female voices with faster base rates', () => {
  const males = CALL_VOICE_PROFILES.filter((v) => v.gender === 'male');
  const females = CALL_VOICE_PROFILES.filter((v) => v.gender === 'female');
  assert.equal(males.length, 3);
  assert.equal(females.length, 3);
  assert.ok(CALL_VOICE_PROFILES.every((v) => v.baseRate >= 1.2));
});

test('detectSpokenLanguage accurately detects Hebrew, Arabic, English, and Spanish', () => {
  assert.equal(detectSpokenLanguage('שלום מה שלומך היום').code, 'he');
  assert.equal(detectSpokenLanguage('مرحبا كيف حالك اليوم').code, 'ar');
  assert.equal(detectSpokenLanguage('Hello how are you doing today').code, 'en');
  assert.equal(detectSpokenLanguage('Hola cómo estás gracias').code, 'es');
});

test('mergeResearchSources interleaves and deduplicates results from multiple research engines', () => {
  const ddg = [
    { title: 'A', url: 'https://example.com/a/', snippet: 's1', engine: 'DuckDuckGo' },
    { title: 'B', url: 'https://example.com/b', snippet: 's2', engine: 'DuckDuckGo' },
  ];
  const arxiv = [
    { title: 'A dup', url: 'https://example.com/a', snippet: 's1', engine: 'ArXiv' },
    { title: 'C', url: 'https://arxiv.org/abs/1234', snippet: 's3', engine: 'ArXiv' },
  ];
  const merged = mergeResearchSources([ddg, arxiv], 5);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].url, 'https://example.com/a/');
  assert.equal(merged[1].url, 'https://example.com/b');
  assert.equal(merged[2].url, 'https://arxiv.org/abs/1234');
});

test('resolveAppLanguage normalizes en, he, ar accurately', () => {
  assert.equal(resolveAppLanguage('en'), 'en');
  assert.equal(resolveAppLanguage('he'), 'he');
  assert.equal(resolveAppLanguage('ar'), 'ar');
});

test('clampMascotPosition allows horizontal and vertical movement across entire screen within bounds', () => {
  const posMid = clampMascotPosition(640, 360, 1280, 720, 56);
  assert.equal(posMid.x, 640);
  assert.equal(posMid.y, 360);
  const posEdges = clampMascotPosition(-40, 900, 1280, 720, 56);
  assert.equal(posEdges.x, 6);
  assert.equal(posEdges.y, 720 - 56 - 6);
});

test('computeMascotLiveKinematics animates hands and mouth during speaking and coding', () => {
  const speakFrame = computeMascotLiveKinematics('speaking', 1250, 0.85);
  assert.equal(speakFrame.isTalking, true);
  assert.ok(speakFrame.mouthOpen >= 0.18 && speakFrame.mouthOpen <= 1);
});

test('getLokiBotGrokConfig returns Cursor + Grok 4.7 configuration and workspace modes', () => {
  const cfg = getLokiBotGrokConfig();
  assert.equal(cfg.engineId, 'grok-4.7-cursor');
  assert.equal(cfg.displayName, 'Cursor + Grok 4.7');
  assert.equal(cfg.apiPrefix, 'grok_42ddf32035d87e2645a5178bb1bcfe65');
  assert.deepEqual(cfg.workspaceModes, ['chat', 'composer', 'linux', 'studio']);
  assert.equal(cfg.supportsMultiFileComposer, true);
  assert.equal(cfg.supportsSwarmDebate, true);
});

