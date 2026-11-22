export type TrustTier = 'trustable' | 'reliable' | 'verify' | 'low';

export interface TrustTierMeta {
  tier: TrustTier;
  label: string;
  color: string;
}

export interface RawSourceInput {
  title?: string;
  url?: string;
  snippet?: string;
  text?: string;
  engine?: string;
  [key: string]: unknown;
}

export interface VerifiedSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  text?: string;
  engine: string;
  trustScore: number;
  trustTier: TrustTier;
  trustLabel: string;
  trustColor: string;
  verified: boolean;
  trustReason: string;
}

export interface VerifiedSourceSummary {
  sources: VerifiedSource[];
  totalUnique: number;
  avgTrust: number;
  trustableCount: number;
  reliableCount: number;
  verifyCount: number;
  lowCount: number;
}

const TIER1_DOMAINS = [
  'wikipedia.org',
  'wikidata.org',
  'arxiv.org',
  'nature.com',
  'science.org',
  'nih.gov',
  'ncbi.nlm.nih.gov',
  'pubmed.ncbi.nlm.nih.gov',
  'who.int',
  'nasa.gov',
  'ieee.org',
  'acm.org',
  'mit.edu',
  'stanford.edu',
  'harvard.edu',
  'ox.ac.uk',
  'cam.ac.uk',
  'developer.mozilla.org',
  'w3.org',
  'rfc-editor.org',
  'docs.python.org',
  'nodejs.org',
  'reuters.com',
  'apnews.com',
  'bbc.com',
  'bbc.co.uk',
  'openlibrary.org',
  'openalex.org',
  'crossref.org',
  'doi.org',
];

const TIER2_DOMAINS = [
  'github.com',
  'gitlab.com',
  'stackoverflow.com',
  'stackexchange.com',
  'docs.microsoft.com',
  'learn.microsoft.com',
  'cloud.google.com',
  'ai.google.dev',
  'aws.amazon.com',
  'nytimes.com',
  'theguardian.com',
  'economist.com',
  'bloomberg.com',
  'techcrunch.com',
  'arstechnica.com',
  'wired.com',
  'npmjs.com',
  'pypi.org',
  'crates.io',
  'mathworks.com',
];

const COMMUNITY_DOMAINS = [
  'reddit.com',
  'news.ycombinator.com',
  'medium.com',
  'dev.to',
  'quora.com',
  'substack.com',
  'x.com',
  'twitter.com',
  'youtube.com',
];

const LOW_TRUST_SIGNALS = [
  'blogspot.',
  'wordpress.com',
  'wixsite.com',
  'tumblr.com',
  'pastebin.com',
];

export function classifyTrustTier(score: number): TrustTierMeta {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  if (s >= 90) {
    return { tier: 'trustable', label: 'Trustable', color: '#22c55e' };
  }
  if (s >= 70) {
    return { tier: 'reliable', label: 'Reliable', color: '#38bdf8' };
  }
  if (s >= 45) {
    return { tier: 'verify', label: 'Verify Carefully', color: '#f59e0b' };
  }
  return { tier: 'low', label: 'Low Trust', color: '#ef4444' };
}

function normalizeUrlKey(rawUrl: string): { cleanUrl: string; domain: string; isHttps: boolean } | null {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const isHttps = u.protocol === 'https:';
    const domain = u.hostname.toLowerCase().replace(/^www\./, '');
    // Remove common tracking query parameters for deduplication
    const removeKeys: string[] = [];
    u.searchParams.forEach((_, k) => {
      if (/^(?:utm_[a-z0-9_]+|fbclid|gclid|ref|source)$/i.test(k)) removeKeys.push(k);
    });
    for (const k of removeKeys) u.searchParams.delete(k);
    if (u.pathname.length > 1) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    const cleanUrl = u.toString().replace(/\/+$/, '');
    return { cleanUrl, domain, isHttps };
  } catch {
    return null;
  }
}

function domainMatches(domain: string, list: string[]): boolean {
  return list.some((entry) => domain === entry || domain.endsWith(`.${entry}`));
}

function extractQueryTokens(query: string): string[] {
  return String(query || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff\u0600-\u06ff\s]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length >= 3)
    .slice(0, 12);
}

export function verifyAndRankSources(
  rawSources: RawSourceInput[],
  query: string = ''
): VerifiedSourceSummary {
  const list = Array.isArray(rawSources) ? rawSources : [];
  const queryTokens = extractQueryTokens(query);
  const seen = new Set<string>();
  const verifiedList: VerifiedSource[] = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const parsed = normalizeUrlKey(String(item.url || ''));
    if (!parsed) continue;
    const dedupeKey = parsed.cleanUrl.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const domain = parsed.domain;
    const title = String(item.title || domain).trim() || domain;
    const snippet = String(item.snippet || item.text || '').trim();
    const text = typeof item.text === 'string' ? item.text : undefined;
    const engine = String(item.engine || 'Web').trim() || 'Web';

    let score = 62;
    let reason = 'General web reference';

    if (
      domain.endsWith('.gov') ||
      domain.endsWith('.edu') ||
      domain.endsWith('.mil') ||
      /\.gov\.[a-z]{2}$/.test(domain) ||
      /\.ac\.[a-z]{2}$/.test(domain) ||
      /\.edu\.[a-z]{2}$/.test(domain)
    ) {
      score = 93;
      reason = 'Official institutional or academic domain';
    } else if (domainMatches(domain, TIER1_DOMAINS)) {
      score = 91;
      reason = 'High-authority encyclopedia, research, or standards source';
    } else if (domainMatches(domain, TIER2_DOMAINS)) {
      score = 81;
      reason = 'Established technical documentation or major publication';
    } else if (domainMatches(domain, COMMUNITY_DOMAINS)) {
      score = 60;
      reason = 'Community discussion or user-contributed post — cross-check facts';
    } else if (LOW_TRUST_SIGNALS.some((sig) => domain.includes(sig))) {
      score = 42;
      reason = 'Unverified personal blog or paste host';
    }

    // Engine trust adjustment
    const engLow = engine.toLowerCase();
    if (['arxiv', 'openalex', 'crossref', 'wikidata', 'wikipedia', 'openlibrary'].includes(engLow)) {
      score = Math.max(score, 88);
    }

    // Protocol adjustment
    if (parsed.isHttps) {
      score += 2;
    } else {
      score -= 8;
      reason = `${reason} (non-HTTPS)`;
    }

    // Query relevance signal
    if (queryTokens.length > 0) {
      const hay = `${title} ${snippet}`.toLowerCase();
      let hits = 0;
      for (const tok of queryTokens) {
        if (hay.includes(tok)) hits++;
      }
      const ratio = hits / queryTokens.length;
      if (ratio >= 0.5) score += 4;
      else if (ratio > 0) score += 2;
      else score -= 3;
    }

    // Snippet quality signal
    if (snippet.length >= 60) {
      score += 1;
    } else if (snippet.length === 0) {
      score -= 4;
    }

    const trustScore = Math.max(5, Math.min(99, Math.round(score)));
    const meta = classifyTrustTier(trustScore);

    verifiedList.push({
      title,
      url: parsed.cleanUrl,
      domain,
      snippet,
      ...(text !== undefined ? { text } : {}),
      engine,
      trustScore,
      trustTier: meta.tier,
      trustLabel: meta.label,
      trustColor: meta.color,
      verified: trustScore >= 70,
      trustReason: reason,
    });
  }

  verifiedList.sort((a, b) => b.trustScore - a.trustScore);

  const totalUnique = verifiedList.length;
  const avgTrust = totalUnique
    ? Math.round(verifiedList.reduce((acc, s) => acc + s.trustScore, 0) / totalUnique)
    : 0;

  return {
    sources: verifiedList,
    totalUnique,
    avgTrust,
    trustableCount: verifiedList.filter((s) => s.trustTier === 'trustable').length,
    reliableCount: verifiedList.filter((s) => s.trustTier === 'reliable').length,
    verifyCount: verifiedList.filter((s) => s.trustTier === 'verify').length,
    lowCount: verifiedList.filter((s) => s.trustTier === 'low').length,
  };
}
