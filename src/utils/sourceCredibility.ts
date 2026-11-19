export type TrustTier = 'trustable' | 'reliable' | 'verify' | 'low';

export interface RawResource {
  title?: string;
  url?: string;
  snippet?: string;
  text?: string;
  engine?: string;
  trustScore?: number;
  trustTier?: TrustTier;
  trustLabel?: string;
  trustReason?: string;
  verified?: boolean;
}

export interface VerifiedResource {
  title: string;
  url: string;
  canonicalUrl: string;
  domain: string;
  snippet: string;
  text?: string;
  engine: string;
  trustScore: number;
  trustTier: TrustTier;
  trustLabel: 'Trustable' | 'Reliable' | 'Verify Carefully' | 'Low Trust';
  trustColor: string;
  trustReason: string;
  verified: boolean;
  corroboratedBy: number;
}

export interface VerifiedSourcesSummary {
  sources: VerifiedResource[];
  totalUnique: number;
  avgTrust: number;
  trustableCount: number;
  reliableCount: number;
  verifyCount: number;
  lowCount: number;
}

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'dclid', 'msclkid', 'ref', 'ref_src', 'ref_url',
  'mc_cid', 'mc_eid', 'si', 's', 'share', 'source', 'yclid',
]);

const TIER_A_DOMAINS = [
  'nature.com', 'science.org', 'ieee.org', 'acm.org', 'arxiv.org',
  'pubmed.ncbi.nlm.nih.gov', 'ncbi.nlm.nih.gov', 'nih.gov', 'who.int',
  'nasa.gov', 'cdc.gov', 'cern.ch', 'esa.int', 'nist.gov',
  'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'britannica.com',
  'developer.mozilla.org', 'docs.python.org', 'doc.rust-lang.org', 'rust-lang.org',
  'go.dev', 'golang.org', 'learn.microsoft.com', 'docs.oracle.com',
  'wiki.secondlife.com', 'w3.org', 'ietf.org', 'rfc-editor.org',
  'doi.org', 'openalex.org', 'crossref.org', 'worldbank.org',
  'ourworldindata.org', 'imf.org', 'un.org', 'oecd.org',
  'mit.edu', 'stanford.edu', 'harvard.edu', 'berkeley.edu', 'ox.ac.uk', 'cam.ac.uk',
];

const TIER_B_DOMAINS = [
  'wikipedia.org', 'wikidata.org', 'github.com', 'stackoverflow.com', 'stackexchange.com',
  'nytimes.com', 'theguardian.com', 'washingtonpost.com', 'economist.com', 'bloomberg.com',
  'ft.com', 'wsj.com', 'npr.org', 'pbs.org', 'arstechnica.com', 'wired.com',
  'techcrunch.com', 'theverge.com', 'springer.com', 'sciencedirect.com',
  'wiley.com', 'tandfonline.com', 'jstor.org', 'semanticscholar.org',
  'openlibrary.org', 'npmjs.com', 'crates.io', 'pkg.go.dev', 'pypi.org',
  'typescriptlang.org', 'nodejs.org', 'mathworks.com', 'cppreference.com',
];

const COMMUNITY_DOMAINS = [
  'reddit.com', 'news.ycombinator.com', 'medium.com', 'dev.to', 'substack.com',
  'quora.com', 'youtube.com', 'youtu.be', 'x.com', 'twitter.com', 'linkedin.com',
  'facebook.com', 'instagram.com', 'tiktok.com', 'tumblr.com', 'pinterest.com',
  'blogspot.com', 'wordpress.com', 'wikia.com', 'fandom.com',
];

const LOW_TRUST_DOMAINS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
  'clickbait', 'spam', 'fake-news', 'rumor', 'tabloid',
];

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.click', '.loan', '.buzz', '.gq', '.tk', '.ml', '.cf', '.work'];

export function extractDomain(rawUrl: string): string {
  try {
    const parsed = new URL(String(rawUrl || '').trim());
    return parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  } catch {
    return String(rawUrl || '')
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .trim();
  }
}

export function normalizeSourceUrl(rawUrl: string): string {
  const input = String(rawUrl || '').trim();
  if (!input) return '';
  try {
    const u = new URL(input);
    const host = u.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    // Strip hash and tracking params, keep meaningful params sorted
    const kept: Array<[string, string]> = [];
    u.searchParams.forEach((val, key) => {
      const k = key.toLowerCase();
      if (!TRACKING_PARAMS.has(k) && !k.startsWith('utm_')) {
        kept.push([k, val]);
      }
    });
    kept.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    const qs = kept.length
      ? '?' + kept.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
      : '';
    const pathname = (u.pathname || '/').replace(/\/+$/, '') || '/';
    return `https://${host}${pathname}${qs}`;
  } catch {
    return input
      .toLowerCase()
      .replace(/^http:\/\//, 'https://')
      .replace(/^https:\/\/www\./, 'https://')
      .replace(/#.*$/, '')
      .replace(/\/+$/, '');
  }
}

export function isSyntheticSearchPlaceholder(src: RawResource): boolean {
  const eng = String(src?.engine || '').toLowerCase();
  const url = String(src?.url || '').toLowerCase();
  if (eng === 'webindex') return true;
  if (/^https?:\/\/(www\.)?google\.com\/search\?q=site:/i.test(url)) return true;
  return false;
}

function normalizeTitleKey(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\u0590-\u05ff\u0600-\u06ff]+/g, ' ')
    .trim()
    .slice(0, 90);
}

export function deduplicateSources<T extends RawResource>(sources: T[]): T[] {
  if (!Array.isArray(sources) || !sources.length) return [];
  const realOnly = sources.filter((s) => s && s.url && !isSyntheticSearchPlaceholder(s));
  const pool = realOnly.length ? realOnly : sources.filter((s) => s && s.url);

  const byCanonical = new Map<string, T>();
  const seenDomainTitle = new Map<string, string>();

  for (const raw of pool) {
    const urlStr = String(raw.url || '').trim();
    if (!urlStr || !/^https?:\/\//i.test(urlStr)) continue;
    const canonical = normalizeSourceUrl(urlStr);
    const domain = extractDomain(urlStr);
    const titleKey = normalizeTitleKey(raw.title || '');
    const dtKey = titleKey.length >= 12 ? `${domain}::${titleKey}` : '';

    const existingKey = byCanonical.has(canonical)
      ? canonical
      : dtKey && seenDomainTitle.has(dtKey)
        ? seenDomainTitle.get(dtKey)!
        : '';

    if (existingKey) {
      const prev = byCanonical.get(existingKey)!;
      const merged: T = {
        ...prev,
        title: (prev.title && prev.title.length >= (raw.title || '').length) ? prev.title : (raw.title || prev.title),
        snippet: (prev.snippet && prev.snippet.length >= (raw.snippet || '').length) ? prev.snippet : (raw.snippet || prev.snippet),
        text: (prev.text && prev.text.length >= (raw.text || '').length) ? prev.text : (raw.text || prev.text),
      };
      byCanonical.set(existingKey, merged);
      continue;
    }

    byCanonical.set(canonical, { ...raw });
    if (dtKey) seenDomainTitle.set(dtKey, canonical);
  }

  return Array.from(byCanonical.values());
}

export function classifyTrustTier(score: number): {
  tier: TrustTier;
  label: 'Trustable' | 'Reliable' | 'Verify Carefully' | 'Low Trust';
  color: string;
} {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s >= 90) {
    return { tier: 'trustable', label: 'Trustable', color: '#10b981' };
  }
  if (s >= 70) {
    return { tier: 'reliable', label: 'Reliable', color: '#06b6d4' };
  }
  if (s >= 45) {
    return { tier: 'verify', label: 'Verify Carefully', color: '#f59e0b' };
  }
  return { tier: 'low', label: 'Low Trust', color: '#ef4444' };
}

function matchesDomainList(domain: string, list: string[]): boolean {
  return list.some((d) => domain === d || domain.endsWith('.' + d));
}

function extractKeyTerms(text: string): string[] {
  const stop = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'when', 'where',
    'which', 'about', 'into', 'your', 'have', 'been', 'will', 'were', 'they',
    'their', 'there', 'here', 'more', 'most', 'some', 'very', 'just', 'like',
    'also', 'how', 'why', 'who', 'are', 'was', 'can', 'not', 'but', 'all', 'out',
  ]);
  const tokens = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff\u0600-\u06ff]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stop.has(w));
  return Array.from(new Set(tokens)).slice(0, 14);
}

export function evaluateSourceCredibility(
  source: RawResource,
  allSources: RawResource[] = [],
  query = ''
): VerifiedResource {
  const url = String(source.url || '').trim();
  const canonicalUrl = normalizeSourceUrl(url);
  const domain = extractDomain(url);
  const engine = String(source.engine || 'Web').trim() || 'Web';
  const title = String(source.title || domain || url).trim();
  const snippet = String(source.snippet || '').trim();
  const text = source.text ? String(source.text).trim() : undefined;

  let score = 62;
  const reasons: string[] = [];

  const isGovOrEdu =
    /\.(gov|edu|mil)$/.test(domain) ||
    /\.gov\.[a-z]{2}$/.test(domain) ||
    /\.edu\.[a-z]{2}$/.test(domain) ||
    /\.ac\.[a-z]{2}$/.test(domain);
  const isIpHost = /^\d{1,3}(\.\d{1,3}){3}$/.test(domain);
  const isSuspiciousTld = SUSPICIOUS_TLDS.some((tld) => domain.endsWith(tld));
  const isLowTrustDomain =
    matchesDomainList(domain, LOW_TRUST_DOMAINS) ||
    isSyntheticSearchPlaceholder(source);

  if (isLowTrustDomain || isIpHost) {
    score = 26;
    reasons.push('Unverified or redirect/low-reputation host');
  } else if (isGovOrEdu) {
    score = 93;
    reasons.push('Official government or academic institution');
  } else if (matchesDomainList(domain, TIER_A_DOMAINS)) {
    score = 91;
    reasons.push('Primary peer-reviewed, official docs, or wire agency');
  } else if (matchesDomainList(domain, TIER_B_DOMAINS)) {
    score = 81;
    reasons.push('Established reference, engineering, or major publication');
  } else if (matchesDomainList(domain, COMMUNITY_DOMAINS)) {
    score = 56;
    reasons.push('Community/social discussion — verify claims independently');
  } else if (isSuspiciousTld) {
    score = 34;
    reasons.push('Low-reputation top-level domain');
  } else if (domain.endsWith('.org')) {
    score = 72;
    reasons.push('Established organization domain');
  } else {
    score = 62;
    reasons.push('General web source');
  }

  // Academic engine bonus (OpenAlex, Crossref, ArXiv)
  if (/^(arxiv|openalex|crossref)$/i.test(engine) && !isLowTrustDomain) {
    score = Math.max(score, 88);
    if (!reasons.some((r) => /academic|peer-reviewed/i.test(r))) {
      reasons.unshift('Indexed scholarly research record');
    }
    if (/cited by\s+([1-9]\d+)/i.test(snippet)) {
      score += 4;
      reasons.push('Peer-cited publication');
    }
  }

  // Protocol check
  if (/^https:\/\//i.test(url)) {
    score += 2;
  } else if (/^http:\/\//i.test(url)) {
    score -= 14;
    reasons.push('Unencrypted HTTP link');
  }

  // Content verification bonus
  if (text && text.length >= 200) {
    score += 4;
    reasons.push('Full page content verified');
  } else if (snippet.length >= 60) {
    score += 1;
  } else if (!snippet && title === domain) {
    score -= 8;
    reasons.push('Sparse metadata');
  }

  // Clickbait / sensationalism penalty
  const combinedTitle = `${title} ${snippet}`;
  if (/(?:SHOCKING|YOU WON'T BELIEVE|100% GUARANTEED|MIRACLE CURE|CLICK HERE|SECRET THEY HIDE)/i.test(combinedTitle)) {
    score -= 22;
    reasons.push('Sensationalist wording detected');
  }

  // Cross-source corroboration across independent domains
  const terms = extractKeyTerms(`${query} ${title}`);
  let corroboratedBy = 0;
  if (terms.length >= 2 && allSources.length > 1) {
    const seenDomains = new Set<string>([domain]);
    for (const other of allSources) {
      if (!other?.url) continue;
      const otherDom = extractDomain(other.url);
      if (!otherDom || seenDomains.has(otherDom)) continue;
      const hay = `${other.title || ''} ${other.snippet || ''}`.toLowerCase();
      let overlap = 0;
      for (const term of terms) {
        if (hay.includes(term)) overlap++;
      }
      if (overlap >= 2) {
        seenDomains.add(otherDom);
        corroboratedBy++;
      }
    }
    if (corroboratedBy >= 2 && !isLowTrustDomain && !isSuspiciousTld) {
      score += 4;
      reasons.push(`Corroborated by ${corroboratedBy} independent domains`);
    } else if (corroboratedBy === 1 && !isLowTrustDomain && !isSuspiciousTld) {
      score += 2;
    }
  }

  // Respect optional AI cross-check adjustment if caller pre-verified
  if (typeof source.trustScore === 'number' && Number.isFinite(source.trustScore)) {
    score = Math.round(score * 0.45 + source.trustScore * 0.55);
  }

  const finalScore = Math.max(5, Math.min(99, Math.round(score)));
  const meta = classifyTrustTier(finalScore);

  return {
    title,
    url,
    canonicalUrl,
    domain,
    snippet,
    text,
    engine,
    trustScore: finalScore,
    trustTier: meta.tier,
    trustLabel: meta.label,
    trustColor: meta.color,
    trustReason: source.trustReason || reasons.slice(0, 2).join(' · '),
    verified: finalScore >= 70,
    corroboratedBy,
  };
}

export function verifyAndRankSources(sources: RawResource[], query = ''): VerifiedSourcesSummary {
  const unique = deduplicateSources(sources);
  const evaluated = unique.map((src) => evaluateSourceCredibility(src, unique, query));

  evaluated.sort((a, b) => {
    if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
    const aRead = a.text && a.text.length > 150 ? 1 : 0;
    const bRead = b.text && b.text.length > 150 ? 1 : 0;
    if (bRead !== aRead) return bRead - aRead;
    return b.corroboratedBy - a.corroboratedBy;
  });

  let trustableCount = 0;
  let reliableCount = 0;
  let verifyCount = 0;
  let lowCount = 0;
  let sum = 0;

  for (const s of evaluated) {
    sum += s.trustScore;
    if (s.trustTier === 'trustable') trustableCount++;
    else if (s.trustTier === 'reliable') reliableCount++;
    else if (s.trustTier === 'verify') verifyCount++;
    else lowCount++;
  }

  return {
    sources: evaluated,
    totalUnique: evaluated.length,
    avgTrust: evaluated.length ? Math.round(sum / evaluated.length) : 0,
    trustableCount,
    reliableCount,
    verifyCount,
    lowCount,
  };
}

export function buildVerifiedSourcesPromptContext(sources: VerifiedResource[], limit = 10): string {
  const chosen = (sources || []).slice(0, limit);
  if (!chosen.length) return '';
  const lines = chosen.map(
    (s, i) =>
      `[${i + 1}] [Trust: ${s.trustScore}% · ${s.trustLabel}] (${s.engine}) ${s.title} — ${s.url}\nVerification: ${s.trustReason}\n${(s.text || s.snippet || '').slice(0, 620)}`
  );
  return (
    `VERIFIED WEB & ACADEMIC RESOURCES (Credibility-Checked):\n` +
    `RULES:\n` +
    `1. Prioritize facts from "Trustable (90%+)" and "Reliable (70–89%)" sources and cite them inline with [n].\n` +
    `2. Cross-check claims against multiple sources; if a fact comes ONLY from a "Verify Carefully" or "Low Trust" source, explicitly note that it is unverified or from community discussion.\n` +
    `3. Never invent facts not supported by reliable sources.\n\n` +
    lines.join('\n\n---\n\n')
  );
}
