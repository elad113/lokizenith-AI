import test from 'node:test';
import assert from 'node:assert/strict';
import { getLslSnippets } from './lslSnippets.ts';
import { analyzeAndFixLslScript } from './lslSpecialist.ts';

test('LSL snippet library inserts five tested scripts', () => {
  const snippets = getLslSnippets();
  assert.deepEqual(
    snippets.map((s) => s.id),
    ['door', 'hud', 'vendor', 'teleporter', 'particles']
  );
  for (const snippet of snippets) {
    assert.ok(snippet.code.includes('default'));
    assert.equal(snippet.code.includes('```'), false);
    const audit = analyzeAndFixLslScript(snippet.code);
    assert.equal(audit.valid, true, `${snippet.id}: ${audit.errors.join(' | ')}`);
  }
});
