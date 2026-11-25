import type { RawSourceInput } from './sourceCredibility.ts';
import { verifyAndRankSources, type VerifiedSource } from './sourceCredibility.ts';

export interface GroundingMetadataResult {
  sources: RawSourceInput[];
  queriesUsed: string[];
}

export interface GameChatHistoryItem {
  who: 'user' | 'ai';
  text: string;
}

export interface GameChatPromptPayload {
  systemInstruction: string;
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

function decodeHtmlEntities(input: string): string {
  return String(input || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function unwrapDuckDuckGoUrl(rawHref: string): string {
  const href = String(rawHref || '').trim().replace(/&amp;/g, '&');
  if (!href) return '';
  try {
    const normalized = href.startsWith('//') ? `https:${href}` : href.startsWith('/') ? `https://duckduckgo.com${href}` : href;
    const u = new URL(normalized);
    const uddg = u.searchParams.get('uddg');
    if (uddg && /^https?:\/\//i.test(uddg)) {
      return uddg;
    }
    if (/^https?:\/\//i.test(normalized) && !/duckduckgo\.com\/(?:l\/|y\.js)/i.test(normalized)) {
      return normalized;
    }
  } catch {
    // Ignore malformed href
  }
  return '';
}

export function parseDuckDuckGoHtml(html: string, maxItems = 25): RawSourceInput[] {
  const src = String(html || '');
  if (!src) return [];
  const results: RawSourceInput[] = [];
  const seen = new Set<string>();

  // Match result blocks or anchor tags with class="result__a"
  const anchorRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const matches: Array<{ url: string; title: string; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(src)) && matches.length < maxItems * 2) {
    const url = unwrapDuckDuckGoUrl(m[1]);
    const title = decodeHtmlEntities(m[2]);
    if (url && title && !seen.has(url)) {
      seen.add(url);
      matches.push({ url, title, index: m.index });
    }
  }

  for (let i = 0; i < matches.length && results.length < maxItems; i++) {
    const cur = matches[i];
    const nextIdx = i + 1 < matches.length ? matches[i + 1].index : cur.index + 1600;
    const windowSlice = src.slice(cur.index, Math.min(nextIdx, cur.index + 1800));
    const snipMatch = windowSlice.match(/<(?:a|div|span)[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div|span)>/i);
    const snippet = snipMatch ? decodeHtmlEntities(snipMatch[1]).slice(0, 280) : '';
    results.push({
      title: cur.title.slice(0, 180),
      url: cur.url,
      snippet: snippet || `Live web result from ${safeDomain(cur.url)}`,
      engine: 'DuckDuckGo',
    });
  }
  return results;
}

export function parseRssSearchItems(xml: string, engine: string, maxItems = 25): RawSourceInput[] {
  const src = String(xml || '');
  if (!src) return [];
  const results: RawSourceInput[] = [];
  const seen = new Set<string>();
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(src)) && results.length < maxItems) {
    const block = m[1];
    const titleM = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const linkM = block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
    const descM = block.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i);
    const pubM = block.match(/<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i);
    const sourceM = block.match(/<source\b[^>]*>([\s\S]*?)<\/source>/i);

    const title = titleM ? decodeHtmlEntities(titleM[1]) : '';
    let url = linkM ? decodeHtmlEntities(linkM[1]).trim() : '';
    // Bing RSS sometimes wraps URL inside <link> with &amp;
    url = url.replace(/&amp;/g, '&').trim();
    if (!title || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);

    const desc = descM ? decodeHtmlEntities(descM[1]) : '';
    const pub = pubM ? decodeHtmlEntities(pubM[1]) : '';
    const outlet = sourceM ? decodeHtmlEntities(sourceM[1]) : '';
    const snippetParts = [desc || outlet, pub ? `(${pub.slice(0, 22)})` : ''].filter(Boolean);

    results.push({
      title: title.slice(0, 200),
      url,
      snippet: snippetParts.join(' · ').slice(0, 280) || `${engine} live result`,
      engine,
    });
  }
  return results;
}

function safeDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

export function extractGeminiGroundingSources(response: any): GroundingMetadataResult {
  const meta = response?.candidates?.[0]?.groundingMetadata || response?.groundingMetadata || null;
  if (!meta || typeof meta !== 'object') {
    return { sources: [], queriesUsed: [] };
  }

  const queriesUsed: string[] = Array.isArray(meta.webSearchQueries)
    ? meta.webSearchQueries.map((q: unknown) => String(q || '').trim()).filter(Boolean)
    : [];

  const chunks = Array.isArray(meta.groundingChunks) ? meta.groundingChunks : [];
  const supports = Array.isArray(meta.groundingSupports) ? meta.groundingSupports : [];

  // Map chunk index -> supporting text excerpt from Google Search Grounding
  const chunkSnippets = new Map<number, string>();
  for (const sup of supports) {
    const segText = String(sup?.segment?.text || '').trim();
    const indices = Array.isArray(sup?.groundingChunkIndices) ? sup.groundingChunkIndices : [];
    if (!segText) continue;
    for (const idx of indices) {
      if (typeof idx === 'number' && !chunkSnippets.has(idx)) {
        chunkSnippets.set(idx, segText.slice(0, 260));
      }
    }
  }

  const sources: RawSourceInput[] = [];
  const seen = new Set<string>();
  chunks.forEach((ch: any, idx: number) => {
    const web = ch?.web;
    const uri = String(web?.uri || '').trim();
    if (!uri || !/^https?:\/\//i.test(uri) || seen.has(uri)) return;
    seen.add(uri);
    const domain = safeDomain(uri);
    const title = String(web?.title || domain || 'Web Source').trim();
    const snippet = chunkSnippets.get(idx) || `Verified via Google Search · ${title}`;
    sources.push({
      title: title.slice(0, 180),
      url: uri,
      snippet,
      engine: 'GoogleSearch',
    });
  });

  return { sources, queriesUsed };
}

/**
 * Merges multi-engine web sources (Google Search Grounding + Bing + DuckDuckGo + Google News + Wiki/Tech/Academic),
 * scores credibility via verifyAndRankSources, and applies domain diversity so the top results span many distinct
 * real websites rather than letting a single domain dominate.
 */
export function mergeAndDiversifyWebResults(
  rawSources: RawSourceInput[],
  query: string,
  limit = 60,
): {
  sources: VerifiedSource[];
  totalUnique: number;
  avgTrust: number;
  trustBreakdown: { trustable: number; reliable: number; verify: number; low: number };
  distinctDomains: number;
} {
  const verified = verifyAndRankSources(rawSources, query);
  const scored = verified.sources.map((s) => {
    // Boost real live web & news engines slightly for general/current queries so general web sites appear first
    let priorityBonus = 0;
    const eng = String(s.engine || '').toLowerCase();
    if (eng === 'googlesearch') priorityBonus = 18;
    else if (eng === 'googlenews' || eng === 'bing' || eng === 'duckduckgo') priorityBonus = 10;
    else if (eng === 'wikipedia') priorityBonus = 4;
    return { item: s, rankScore: s.trustScore + priorityBonus };
  });

  scored.sort((a, b) => b.rankScore - a.rankScore);

  // Domain diversity round-robin: pass 1 takes up to 1 per domain (top diverse websites), pass 2 fills up to 3 per domain, pass 3 fills remainder
  const picked: VerifiedSource[] = [];
  const pickedUrls = new Set<string>();
  const domainCounts = new Map<string, number>();

  for (const cap of [1, 3, 99]) {
    for (const entry of scored) {
      if (picked.length >= limit) break;
      const url = entry.item.url;
      if (pickedUrls.has(url)) continue;
      const dom = (entry.item.domain || safeDomain(url) || 'other').toLowerCase();
      const count = domainCounts.get(dom) || 0;
      if (count >= cap) continue;
      domainCounts.set(dom, count + 1);
      pickedUrls.add(url);
      picked.push(entry.item);
    }
  }

  return {
    sources: picked,
    totalUnique: verified.totalUnique,
    avgTrust: verified.avgTrust,
    trustBreakdown: {
      trustable: verified.trustableCount,
      reliable: verified.reliableCount,
      verify: verified.verifyCount,
      low: verified.lowCount,
    },
    distinctDomains: domainCounts.size,
  };
}

/**
 * Builds natural, context-aware multi-turn prompts for in-game AI chat.
 * Ensures the AI genuinely converses and answers ANY question the user asks mid-game
 * (strategy, hints, rules, jokes, or general questions) without ever parroting the prompt.
 */
export function buildGameChatMessages(params: {
  gameTitle: string;
  lang: 'he' | 'en';
  boardSummary?: string;
  lastMove?: string;
  difficulty?: string;
  scoreSummary?: string;
  history?: GameChatHistoryItem[];
  userMessage: string;
}): GameChatPromptPayload {
  const isHe = params.lang === 'he';
  const gameTitle = String(params.gameTitle || 'Game').trim();
  const boardSummary = String(params.boardSummary || '').trim();
  const lastMove = String(params.lastMove || '').trim();
  const difficulty = String(params.difficulty || 'medium').trim();
  const scoreSummary = String(params.scoreSummary || '').trim();
  const userMessage = String(params.userMessage || '').trim();

  const systemInstruction = isHe
    ? `אתה Lokizenith AI — יריב חכם, שנון, חברותי ואנושי שמשחק עכשיו "${gameTitle}" מול המשתמש בצ׳אט חי תוך כדי המשחק.
מצב המשחק הנוכחי:
- משחק: ${gameTitle} (רמת קושי: ${difficulty})
- ניקוד: ${scoreSummary || 'משחק פעיל'}
- מצב לוח חי: ${boardSummary || 'באמצע המשחק'}
- מהלך אחרון: ${lastMove || 'עדיין אין'}

כללי שיחה קריטיים:
1. ענה באמת ובאופן ישיר על מה שהמשתמש כתב או שאל! אם הוא שואל שאלה על המשחק, על אסטרטגיה, על חוקים, מבקש רמז אמיתי לפי מצב הלוח, או אפילו שואל שאלה כללית/סתם מפטפט — תן תשובה אמיתית, מועילה, טבעית ומעניינת.
2. לעולם אל תחזור כמו תוכי על ההודעה של המשתמש (אסור לכתוב "שמעתי אותך (...)" או לצטט סתם את השאלה שלו).
3. דבר בעברית טבעית, זורמת וכיפית (2–4 משפטים תמציתיים, או יותר אם הוא שאל שאלה שדורשת הסבר).
4. שלב בחוכמה מודעות למצב הלוח כשזה רלוונטי, ושמור על אווירה ספורטיבית ומהנה.`
    : `You are Lokizenith AI — a sharp, witty, friendly, genuinely conversational opponent playing "${gameTitle}" live with the user.
Live Game State:
- Game: ${gameTitle} (Difficulty: ${difficulty})
- Score: ${scoreSummary || 'Active match'}
- Live Board State: ${boardSummary || 'Mid-game'}
- Last Move: ${lastMove || 'None yet'}

Critical Conversation Rules:
1. ACTUALLY answer whatever the user asked or said! Whether they ask for a real tactical hint based on the board, ask about rules, chat casually, banter, or ask a general knowledge question mid-game, give a genuine, helpful, natural response.
2. NEVER parrot or echo the user's message back (never say "Heard you (...)" or repeat their question verbatim).
3. Speak in natural, lively English (2–4 crisp sentences, or a bit longer if their question needs a clear explanation).
4. Reference the live board/game context naturally when relevant and keep the match fun.`;

  const cleanHistory = Array.isArray(params.history)
    ? params.history
        .filter((h) => h && (h.who === 'user' || h.who === 'ai') && String(h.text || '').trim().length > 0)
        .slice(-10)
    : [];

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemInstruction },
  ];

  for (const h of cleanHistory) {
    const txt = String(h.text).trim().slice(0, 500);
    // Avoid duplicating the latest userMessage if the client already appended it to history
    if (h.who === 'user' && txt === userMessage && h === cleanHistory[cleanHistory.length - 1]) {
      continue;
    }
    contents.push({
      role: h.who === 'user' ? 'user' : 'model',
      parts: [{ text: txt }],
    });
    openaiMessages.push({
      role: h.who === 'user' ? 'user' : 'assistant',
      content: txt,
    });
  }

  const finalUserTurn = userMessage || (isHe ? 'תן הערה קצרה ושנונה על מצב המשחק עכשיו' : 'Give a short witty comment on the current game state');
  contents.push({ role: 'user', parts: [{ text: finalUserTurn }] });
  openaiMessages.push({ role: 'user', content: finalUserTurn });

  return { systemInstruction, contents, openaiMessages };
}
