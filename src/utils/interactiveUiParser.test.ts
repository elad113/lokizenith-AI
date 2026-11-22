import test from 'node:test';
import assert from 'node:assert/strict';
import {
  repairPartialJson,
  inferUiBlockFromData,
  splitMarkdownWithLiveUi,
} from './interactiveUiParser';

test('repairPartialJson recovers mid-stream incomplete Comparison Cards JSON', () => {
  const streamingChunk = `{
    "title": "iPhone 16 Pro vs. Galaxy S25 Ultra",
    "items": [
      {
        "name": "iPhone 16 Pro",
        "icon": "🍎",
        "badge": "Performance King",
        "recommended": true,
        "tagline": "Refined Power",
        "features": {
          "Processor": "A18 Pro",
          "OS": "iOS 18",
          "Display": "6.3\\" Super Retin`;

  const parsed = repairPartialJson(streamingChunk) as Record<string, any>;
  assert.ok(parsed, 'should parse incomplete streaming JSON');
  assert.equal(parsed.title, 'iPhone 16 Pro vs. Galaxy S25 Ultra');
  assert.equal(Array.isArray(parsed.items), true);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].name, 'iPhone 16 Pro');
  assert.equal(parsed.items[0].features.Processor, 'A18 Pro');
});

test('inferUiBlockFromData auto-detects UI type even when fenced as plain json', () => {
  const cmpData = {
    title: 'iPhone 16 Pro vs Galaxy S25 Ultra',
    items: [
      { name: 'iPhone 16 Pro', recommended: true, features: { Chip: 'A18 Pro' } },
      { name: 'Galaxy S25 Ultra', features: { Chip: 'Snapdragon 8 Elite' } },
    ],
  };
  assert.equal(inferUiBlockFromData(cmpData), 'loki-compare');

  const calcData = {
    title: 'SaaS ROI Calculator',
    inputs: [{ id: 'users', label: 'Users', min: 1, max: 100, default: 10 }],
    outputs: [{ label: 'Annual Value', formula: 'users * 1200' }],
  };
  assert.equal(inferUiBlockFromData(calcData), 'loki-calc');

  const verdictData = {
    title: 'Verdict',
    score: 9.2,
    maxScore: 10,
    summary: 'Outstanding performance',
    dimensions: [{ label: 'Camera', score: 9.5 }],
  };
  assert.equal(inferUiBlockFromData(verdictData), 'loki-verdict');

  const regularJson = { userId: 42, active: true, token: 'abc' };
  assert.equal(inferUiBlockFromData(regularJson), null);
});

test('splitMarkdownWithLiveUi hides raw JSON while streaming and emits live UI segment', () => {
  const liveMd = `Here is the comparison:\n\nComparison Cards\n\`\`\`json\n{"title":"Phone Matchup","items":[{"name":"iPhone 16 Pro","recommended":true,"features":{"Chip":"A18 Pro"`;
  const segs = splitMarkdownWithLiveUi(liveMd);
  const uiSeg = segs.find((s) => s.kind === 'ui');
  assert.ok(uiSeg, 'should detect live UI segment');
  assert.equal(uiSeg?.uiType, 'loki-compare');
  assert.equal(uiSeg?.isStreaming, true);
  assert.ok(uiSeg?.parsedData && (uiSeg.parsedData as any).items?.[0]?.name === 'iPhone 16 Pro');
});

test('splitMarkdownWithLiveUi leaves regular non-UI code blocks untouched', () => {
  const codeMd = 'Example:\n```python\ndef hello():\n    return "world"\n```';
  const segs = splitMarkdownWithLiveUi(codeMd);
  assert.equal(segs.length, 1);
  assert.equal(segs[0].kind, 'text');
});
