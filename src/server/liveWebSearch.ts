import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { RawSourceInput, VerifiedSource } from '../utils/sourceCredibility.ts';
import { collectProviderKeys, chainCooldowns } from './aiKeyChain.ts';
import {
  extractGeminiGroundingSources,
  mergeAndDiversifyWebResults,
  parseDuckDuckGoHtml,
  parseRssSearchItems,
} from '../utils/webSearchAndAiUpgrades.ts';

export interface LiveWebSearchOptions {
  query: string;
  limit?: number;
  fast?: boolean;
  deep?: boolean;
  includeGrounding?: boolean;
}

export interface LiveWebSearchResult {
  results: VerifiedSource[];
  sources: VerifiedSource[];
  groundedAnswer: string;
  queriesUsed: string[];
  enginesUsed: string[];
  scannedCount: number;
  uniqueCount: number;
  distinctDomains: number;
  avgTrust: number;
  trustBreakdown: {
    trustable: number;
    reliable: number;
    verify: number;
    low: number;
  };
  elapsedMs: number;
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function fetchTextSafe(url: string, timeoutMs: number, accept = 'text/html,application/xml,text/xml,*/*;q=0.8'): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: accept,
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
      signal: ctl.signal,
    });
    if (!r.ok) return '';
    return await r.text();
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonSafe(url: string, timeoutMs: number): Promise<any> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'LokizenithResearchBot/5.0 (+https://lokizenith.ai)',
        Accept: 'application/json',
      },
      signal: ctl.signal,
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function runGeminiGoogleSearchGrounding(
  query: string,
  isHeb: boolean,
  deep: boolean,
  timeoutMs: number,
): Promise<{ groundedAnswer: string; sources: RawSourceInput[]; queriesUsed: string[] }> {
  const geminiKeys = collectProviderKeys('gemini');
  if (!geminiKeys.length) return { groundedAnswer: '', sources: [], queriesUsed: [] };
  const orderedSlots = chainCooldowns.orderHotSlots('gemini', geminiKeys, 'Google Gemini');
  if (!orderedSlots.length) return { groundedAnswer: '', sources: [], queriesUsed: [] };
  const activeSlot = orderedSlots[0];
  const activeKey = activeSlot.apiKey;

  const ai = new GoogleGenAI({
    apiKey: activeKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const prompt = isHeb
    ? `חפש באינטרנט בזמן אמת (תאריך היום: ${todayStr}) במספר רב של אתרים אמינים ומעודכנים עבור השאילתה הבאה וסכם את הממצאים העדכניים והמדויקים ביותר עם עובדות, מספרים, תאריכים ושמות אתרים/מקורות:\n\n"${query}"`
    : `Search the live web (today's date: ${todayStr}) across multiple authoritative and up-to-date websites for the following query, and summarize the most accurate current findings with concrete facts, dates, figures, and sources:\n\n"${query}"`;

  const candidates: Array<{ model: string; useThinking: boolean }> = [
    { model: 'gemini-3-flash-preview', useThinking: true },
    { model: 'gemini-3.1-flash-lite', useThinking: false },
  ];

  const start = Date.now();
  for (const cand of candidates) {
    const remaining = timeoutMs - (Date.now() - start);
    if (remaining < 1200) break;
    try {
      const cfg: any = {
        tools: [{ googleSearch: {} }],
        maxOutputTokens: deep ? 1800 : 1200,
      };
      if (cand.useThinking) {
        cfg.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
      }
      const callPromise = ai.models.generateContent({
        model: cand.model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: cfg,
      });
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), remaining));
      const response = await Promise.race([callPromise, timeoutPromise]);
      if (!response) continue;

      const groundedAnswer = String(response.text || '').trim();
      const { sources, queriesUsed } = extractGeminiGroundingSources(response);
      if (groundedAnswer || sources.length > 0) {
        return { groundedAnswer, sources, queriesUsed };
      }
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (/\b(401|402|403)\b/.test(msg)) {
        chainCooldowns.coolForHttpStatus(activeSlot.slotId, 402);
        break;
      }
      console.warn(`[liveWebSearch] googleSearch grounding on ${cand.model} failed:`, err?.message || err);
    }
  }
  return { groundedAnswer: '', sources: [], queriesUsed: [] };
}

export async function runLiveMultiSiteWebSearch(opts: LiveWebSearchOptions): Promise<LiveWebSearchResult> {
  const t0 = Date.now();
  const query = String(opts.query || '').trim();
  const limit = Math.max(20, Math.min(Number(opts.limit) || 120, 300));
  const fast = Boolean(opts.fast);
  const deep = Boolean(opts.deep);
  const includeGrounding = opts.includeGrounding !== false;

  if (!query) {
    return {
      results: [],
      sources: [],
      groundedAnswer: '',
      queriesUsed: [],
      enginesUsed: [],
      scannedCount: 0,
      uniqueCount: 0,
      distinctDomains: 0,
      avgTrust: 0,
      trustBreakdown: { trustable: 0, reliable: 0, verify: 0, low: 0 },
      elapsedMs: 0,
    };
  }

  const isHeb = /[\u0590-\u05FF]/.test(query);
  const isAr = /[\u0600-\u06FF]/.test(query);
  const wikiLang = isHeb ? 'he' : isAr ? 'ar' : 'en';
  const qEnc = encodeURIComponent(query);

  const webTimeout = fast ? 3800 : deep ? 8000 : 6200;
  const groundingTimeout = fast ? 5500 : deep ? 11500 : 8500;

  const googleNewsUrl = isHeb
    ? `https://news.google.com/rss/search?q=${qEnc}&hl=he&gl=IL&ceid=IL:he`
    : `https://news.google.com/rss/search?q=${qEnc}&hl=en-US&gl=US&ceid=US:en`;

  const bingRssUrl = isHeb
    ? `https://www.bing.com/search?q=${qEnc}&format=rss&count=25&setlang=he&cc=IL`
    : `https://www.bing.com/search?q=${qEnc}&format=rss&count=25`;

  const ddgHtmlUrl = `https://html.duckduckgo.com/html/?q=${qEnc}`;

  // Launch Google Search Grounding + live multi-engine web/news/knowledge crawlers ALL in parallel
  const [
    groundingRes,
    ddgHtml,
    bingRss,
    gNewsRss,
    wikiMain,
    wikiEn,
    hn,
    reddit,
    openAlex,
    crossref,
    so,
    gh,
    wikidata,
  ] = await Promise.all([
    includeGrounding
      ? runGeminiGoogleSearchGrounding(query, isHeb, deep, groundingTimeout)
      : Promise.resolve({ groundedAnswer: '', sources: [] as RawSourceInput[], queriesUsed: [] as string[] }),
    fetchTextSafe(ddgHtmlUrl, webTimeout),
    fetchTextSafe(bingRssUrl, webTimeout, 'application/rss+xml,application/xml,text/xml,*/*'),
    fetchTextSafe(googleNewsUrl, webTimeout, 'application/rss+xml,application/xml,text/xml,*/*'),
    fetchJsonSafe(
      `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=${fast ? 12 : 25}&srsearch=${qEnc}`,
      webTimeout,
    ),
    wikiLang !== 'en'
      ? fetchJsonSafe(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=${fast ? 8 : 20}&srsearch=${qEnc}`,
          webTimeout,
        )
      : Promise.resolve(null),
    fetchJsonSafe(`https://hn.algolia.com/api/v1/search?hitsPerPage=${fast ? 12 : 30}&query=${qEnc}`, webTimeout),
    fast
      ? Promise.resolve(null)
      : fetchJsonSafe(`https://www.reddit.com/search.json?limit=25&sort=relevance&q=${qEnc}`, webTimeout),
    fast
      ? Promise.resolve(null)
      : fetchJsonSafe(`https://api.openalex.org/works?per-page=25&search=${qEnc}`, webTimeout),
    deep
      ? fetchJsonSafe(`https://api.crossref.org/works?rows=25&query=${qEnc}`, webTimeout)
      : Promise.resolve(null),
    fast
      ? Promise.resolve(null)
      : fetchJsonSafe(
          `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&site=stackoverflow&pagesize=20&q=${qEnc}`,
          webTimeout,
        ),
    fast
      ? Promise.resolve(null)
      : fetchJsonSafe(`https://api.github.com/search/repositories?sort=stars&order=desc&per_page=20&q=${qEnc}`, webTimeout),
    fast
      ? Promise.resolve(null)
      : fetchJsonSafe(
          `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=${wikiLang}&limit=15&search=${qEnc}`,
          webTimeout,
        ),
  ]);

  const rawResults: RawSourceInput[] = [];
  const enginesSet = new Set<string>();

  const pushAll = (items: RawSourceInput[], engineName: string) => {
    if (!items.length) return;
    enginesSet.add(engineName);
    for (const it of items) rawResults.push(it);
  };

  // 1. Google Search Grounding (highest priority live web sources across the entire internet)
  pushAll(groundingRes.sources, 'GoogleSearch');

  // 2. Live Bing Web Search RSS
  pushAll(parseRssSearchItems(bingRss, 'Bing', 25), 'Bing');

  // 3. Live DuckDuckGo Web Search HTML
  pushAll(parseDuckDuckGoHtml(ddgHtml, 25), 'DuckDuckGo');

  // 4. Live Google News RSS (Hebrew + English news outlets)
  pushAll(parseRssSearchItems(gNewsRss, 'GoogleNews', 25), 'GoogleNews');

  // 5. Wikipedia (User Language + English)
  const wikiItems: RawSourceInput[] = [];
  for (const it of wikiMain?.query?.search || []) {
    if (!it?.title) continue;
    wikiItems.push({
      title: `${it.title} — Wikipedia`,
      url: `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(String(it.title).replace(/ /g, '_'))}`,
      snippet: String(it.snippet || '').replace(/<[^>]+>/g, ''),
      engine: 'Wikipedia',
    });
  }
  for (const it of wikiEn?.query?.search || []) {
    if (!it?.title) continue;
    wikiItems.push({
      title: `${it.title} — Wikipedia`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(it.title).replace(/ /g, '_'))}`,
      snippet: String(it.snippet || '').replace(/<[^>]+>/g, ''),
      engine: 'Wikipedia',
    });
  }
  pushAll(wikiItems, 'Wikipedia');

  // 6. Hacker News
  const hnItems: RawSourceInput[] = [];
  for (const hit of hn?.hits || []) {
    const title = hit?.title || hit?.story_title;
    const url = hit?.url || (hit?.objectID ? `https://news.ycombinator.com/item?id=${hit.objectID}` : '');
    if (title && url) {
      hnItems.push({
        title: String(title),
        url: String(url),
        snippet: String(hit.story_text || hit.comment_text || `Hacker News · ${hit.points || 0} points · ${hit.num_comments || 0} comments`)
          .replace(/<[^>]+>/g, ' ')
          .slice(0, 220),
        engine: 'HackerNews',
      });
    }
  }
  pushAll(hnItems, 'HackerNews');

  // 7. Reddit
  const redditItems: RawSourceInput[] = [];
  for (const c of reddit?.data?.children || []) {
    const d = c?.data;
    if (d?.title) {
      redditItems.push({
        title: `${d.title} (r/${d.subreddit || 'all'})`,
        url: d.permalink ? `https://www.reddit.com${d.permalink}` : d.url,
        snippet: d.selftext
          ? String(d.selftext).replace(/\s+/g, ' ').slice(0, 220)
          : `r/${d.subreddit || 'all'} · ↑${d.score || 0} · ${d.num_comments || 0} comments`,
        engine: 'Reddit',
      });
    }
  }
  pushAll(redditItems, 'Reddit');

  // 8. OpenAlex & Crossref (academic papers)
  const openAlexItems: RawSourceInput[] = [];
  for (const w of openAlex?.results || []) {
    const title = w?.title || w?.display_name;
    const url = w?.primary_location?.landing_page_url || w?.doi || w?.id;
    if (title && url) {
      openAlexItems.push({
        title: `${title}${w.publication_year ? ` (${w.publication_year})` : ''}`,
        url: String(url),
        snippet: `${w.primary_location?.source?.display_name || 'OpenAlex Research'} · Cited by ${w.cited_by_count ?? 0}`,
        engine: 'OpenAlex',
      });
    }
  }
  pushAll(openAlexItems, 'OpenAlex');

  const crossrefItems: RawSourceInput[] = [];
  for (const it of crossref?.message?.items || []) {
    const title = Array.isArray(it?.title) ? it.title[0] : it?.title;
    const url = it?.URL || (it?.DOI ? `https://doi.org/${it.DOI}` : '');
    if (title && url) {
      const yr = it.issued?.['date-parts']?.[0]?.[0] || '';
      crossrefItems.push({
        title: `${title}${yr ? ` (${yr})` : ''}`,
        url: String(url),
        snippet: String(it.abstract || `${it.publisher || 'Crossref'} · ${it['container-title']?.[0] || 'Study'}`)
          .replace(/<[^>]+>/g, ' ')
          .slice(0, 220),
        engine: 'Crossref',
      });
    }
  }
  pushAll(crossrefItems, 'Crossref');

  // 9. StackOverflow, GitHub, Wikidata
  const soItems: RawSourceInput[] = [];
  for (const it of so?.items || []) {
    if (it?.link && it?.title) {
      soItems.push({
        title: String(it.title),
        url: String(it.link),
        snippet: `StackOverflow (${it.score || 0} votes, ${it.answer_count || 0} answers) · ${(it.tags || []).slice(0, 4).join(', ')}`,
        engine: 'StackOverflow',
      });
    }
  }
  pushAll(soItems, 'StackOverflow');

  const ghItems: RawSourceInput[] = [];
  for (const repo of gh?.items || []) {
    if (repo?.html_url && repo?.full_name) {
      ghItems.push({
        title: String(repo.full_name),
        url: String(repo.html_url),
        snippet: `${repo.description || 'Repository'} · ★ ${repo.stargazers_count || 0}`,
        engine: 'GitHub',
      });
    }
  }
  pushAll(ghItems, 'GitHub');

  const wdItems: RawSourceInput[] = [];
  for (const it of wikidata?.search || []) {
    const url = it?.concepturi || (it?.url ? `https:${it.url}` : '');
    if (url) {
      wdItems.push({
        title: `${it.label || it.id} — Wikidata`,
        url: String(url),
        snippet: String(it.description || 'Structured Knowledge Entity'),
        engine: 'Wikidata',
      });
    }
  }
  pushAll(wdItems, 'Wikidata');

  const merged = mergeAndDiversifyWebResults(rawResults, query, limit);
  const elapsedMs = Date.now() - t0;

  return {
    results: merged.sources,
    sources: merged.sources,
    groundedAnswer: groundingRes.groundedAnswer,
    queriesUsed: groundingRes.queriesUsed.length ? groundingRes.queriesUsed : [query],
    enginesUsed: Array.from(enginesSet),
    scannedCount: rawResults.length,
    uniqueCount: merged.totalUnique,
    distinctDomains: merged.distinctDomains,
    avgTrust: merged.avgTrust,
    trustBreakdown: merged.trustBreakdown,
    elapsedMs,
  };
}
