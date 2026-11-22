import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTrustTier, verifyAndRankSources } from './sourceCredibility';
import {
  analyzeAndFixMatlabScript,
  buildMatlabSystemPrompt,
  generateOfflineProfessionalMatlab,
} from './matlabSpecialist';

test('classifyTrustTier maps scores to all 4 credibility tiers', () => {
  assert.equal(classifyTrustTier(95).tier, 'trustable');
  assert.equal(classifyTrustTier(78).tier, 'reliable');
  assert.equal(classifyTrustTier(55).tier, 'verify');
  assert.equal(classifyTrustTier(25).tier, 'low');
});

test('verifyAndRankSources deduplicates URLs and ranks authoritative domains first', () => {
  const summary = verifyAndRankSources(
    [
      {
        title: 'Random blog post',
        url: 'http://example.blogspot.com/post?utm_source=test',
        snippet: 'Short note',
        engine: 'Web',
      },
      {
        title: 'Quantum Mechanics — Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Quantum_mechanics/',
        snippet: 'Quantum mechanics is a fundamental theory in physics describing nature at atomic scales.',
        engine: 'Wikipedia',
      },
      {
        title: 'Duplicate Wikipedia entry',
        url: 'https://en.wikipedia.org/wiki/Quantum_mechanics?utm_medium=cpc',
        snippet: 'Duplicate link should be removed',
        engine: 'DuckDuckGo',
      },
    ],
    'quantum mechanics physics'
  );

  assert.equal(summary.totalUnique, 2);
  assert.equal(summary.sources[0].domain, 'en.wikipedia.org');
  assert.equal(summary.sources[0].trustTier, 'trustable');
  assert.equal(summary.sources[0].verified, true);
  assert.ok(summary.sources[0].trustScore > summary.sources[1].trustScore);
  assert.equal(summary.trustableCount, 1);
});

test('analyzeAndFixMatlabScript fixes C-style comments, !=, and missing end blocks', () => {
  const raw = `\`\`\`matlab
// Compute sum
x = 0;
for i = 1:5
  if i != 3
    x = x + i;
  end
disp(x);
\`\`\``;

  const audit = analyzeAndFixMatlabScript(raw);
  assert.equal(audit.valid, true);
  assert.equal(audit.errors.length, 0);
  assert.ok(audit.code.includes('% Compute sum'));
  assert.ok(audit.code.includes('~='));
  assert.ok(audit.fixes.length >= 3);
  assert.equal(audit.stats.loops, 1);
  assert.equal(audit.stats.conditionals, 1);
  assert.equal(audit.stats.dispCalls, 1);
});

test('buildMatlabSystemPrompt and generateOfflineProfessionalMatlab return fenced MATLAB output', () => {
  const prompt = buildMatlabSystemPrompt({ mode: 'new', comments: true });
  assert.ok(prompt.includes('MATLAB'));

  const generated = generateOfflineProfessionalMatlab('solve linear matrix system');
  assert.ok(generated.startsWith('```matlab'));
  assert.ok(generated.endsWith('```'));
  assert.ok(generated.includes('det(A)'));
});
