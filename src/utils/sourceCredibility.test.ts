import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSourceUrl,
  deduplicateSources,
  classifyTrustTier,
  evaluateSourceCredibility,
  verifyAndRankSources,
  buildVerifiedSourcesPromptContext,
} from './sourceCredibility.ts';

describe('Source Credibility & Deduplication Engine', () => {
  it('normalizes URLs by stripping www, protocol variance, hash, tracking params, and trailing slashes', () => {
    const a = normalizeSourceUrl('http://www.Nature.com/articles/s41586-024-001/?utm_source=twitter&ref=home#sec2');
    const b = normalizeSourceUrl('https://nature.com/articles/s41586-024-001');
    assert.equal(a, b);
    assert.equal(a, 'https://nature.com/articles/s41586-024-001');
  });

  it('deduplicates repeated resources across tracking variants and identical domain+title pairs and drops WebIndex placeholders', () => {
    const raw = [
      { title: 'Quantum Error Correction', url: 'https://www.nature.com/articles/qec-1?utm_medium=email', snippet: 'Short', engine: 'OpenAlex' },
      { title: 'Quantum Error Correction', url: 'http://nature.com/articles/qec-1/', snippet: 'Detailed peer-reviewed paper abstract on quantum error correction', engine: 'Crossref' },
      { title: 'Quantum Error Correction', url: 'https://nature.com/articles/qec-1#top', snippet: 'Dup', engine: 'DuckDuckGo' },
      { title: 'Google Index #1', url: 'https://www.google.com/search?q=site:nature.com+quantum', snippet: 'Index', engine: 'WebIndex' },
      { title: 'Quantum Computing Overview', url: 'https://en.wikipedia.org/wiki/Quantum_computing', snippet: 'Encyclopedia entry', engine: 'Wikipedia' },
    ];
    const unique = deduplicateSources(raw);
    assert.equal(unique.length, 2);
    assert.ok(unique[0].snippet && unique[0].snippet.includes('Detailed peer-reviewed'));
    assert.ok(unique.every((u) => u.engine !== 'WebIndex'));
  });

  it('classifies all 4 credibility tiers with exact labels', () => {
    assert.equal(classifyTrustTier(95).label, 'Trustable');
    assert.equal(classifyTrustTier(90).label, 'Trustable');
    assert.equal(classifyTrustTier(82).label, 'Reliable');
    assert.equal(classifyTrustTier(70).label, 'Reliable');
    assert.equal(classifyTrustTier(58).label, 'Verify Carefully');
    assert.equal(classifyTrustTier(45).label, 'Verify Carefully');
    assert.equal(classifyTrustTier(30).label, 'Low Trust');
  });

  it('ranks authoritative peer-reviewed/gov sources as Trustable (90%+) and suspicious/clickbait sources as Low Trust (<45%)', () => {
    const pool = [
      {
        title: 'SHOCKING MIRACLE CURE YOU WONT BELIEVE',
        url: 'http://rumor-health.xyz/secret-cure',
        snippet: '100% GUARANTEED secret they hide from doctors!',
        engine: 'Web',
      },
      {
        title: 'Climate Data Assessment Report',
        url: 'https://www.nasa.gov/climate/assessment-2025',
        snippet: 'Peer-reviewed NASA satellite climate telemetry and global warming analysis.',
        text: 'A'.repeat(400),
        engine: 'DuckDuckGo',
      },
      {
        title: 'Climate Assessment Discussion (r/science)',
        url: 'https://www.reddit.com/r/science/comments/xyz/climate_assessment/',
        snippet: 'Community discussion of recent NASA climate data.',
        engine: 'Reddit',
      },
      {
        title: 'Global Climate Assessment',
        url: 'https://en.wikipedia.org/wiki/Climate_change',
        snippet: 'Comprehensive overview of climate change data and observations.',
        engine: 'Wikipedia',
      },
    ];

    const summary = verifyAndRankSources(pool, 'climate assessment report');
    assert.equal(summary.totalUnique, 4);
    assert.equal(summary.sources[0].domain, 'nasa.gov');
    assert.ok(summary.sources[0].trustScore >= 90);
    assert.equal(summary.sources[0].trustLabel, 'Trustable');

    const wiki = summary.sources.find((s) => s.domain.includes('wikipedia.org'))!;
    assert.equal(wiki.trustLabel, 'Reliable');

    const reddit = summary.sources.find((s) => s.domain === 'reddit.com')!;
    assert.equal(reddit.trustLabel, 'Verify Carefully');

    const spam = summary.sources[summary.sources.length - 1];
    assert.ok(spam.trustScore < 45);
    assert.equal(spam.trustLabel, 'Low Trust');
  });

  it('builds verified prompt context with trust percentages and labels', () => {
    const evaluated = evaluateSourceCredibility(
      { title: 'MDN Fetch API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API', snippet: 'Official web standard documentation for Fetch API.', engine: 'DuckDuckGo' },
      [],
      'fetch api'
    );
    const ctx = buildVerifiedSourcesPromptContext([evaluated]);
    assert.ok(ctx.includes('Trustable'));
    assert.ok(ctx.includes(`${evaluated.trustScore}%`));
    assert.ok(ctx.includes('developer.mozilla.org'));
  });
});
