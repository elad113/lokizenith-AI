import type express from 'express';
import { isSafePublicHttpUrl } from '../utils/guestAndLength.ts';
import { verifyAndRankSources, type RawSourceInput } from '../utils/sourceCredibility.ts';

function stripHtmlToText(html: string, maxChars: number = 6000): string {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

export async function fetchPageTextSafe(url: string, maxChars: number = 4500, timeoutMs: number = 3500): Promise<string> {
  if (!isSafePublicHttpUrl(url)) return '';
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(Math.min(5000, Math.max(1000, timeoutMs))),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LokizenithBot/2.7; +https://lokizenith.com)',
        Accept: 'text/html, text/plain, application/json;q=0.9',
      },
    });
    if (!res.ok) return '';
    const ct = String(res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('text/') && !ct.includes('html') && !ct.includes('json') && !ct.includes('xml')) return '';
    const raw = await res.text();
    return stripHtmlToText(raw, maxChars);
  } catch {
    return '';
  }
}

async function safeJson(url: string, timeoutMs: number = 4500): Promise<any> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'LokizenithAI/2.7 (+https://lokizenith.com)' },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function gatherDeepSources(query: string): Promise<RawSourceInput[]> {
  const q = encodeURIComponent(query);
  const [wiki, hn, openalex, wikidata, openlib, so, gh] = await Promise.all([
    safeJson(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&srlimit=25&format=json`),
    safeJson(`https://hn.algolia.com/api/v1/search?query=${q}&hitsPerPage=25`),
    safeJson(`https://api.openalex.org/works?search=${q}&per-page=25`),
    safeJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${q}&language=en&limit=15&format=json`),
    safeJson(`https://openlibrary.org/search.json?q=${q}&limit=15`),
    safeJson(`https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${q}&site=stackoverflow&pagesize=20`),
    safeJson(`https://api.github.com/search/repositories?q=${q}&per_page=15`),
  ]);

  const raw: RawSourceInput[] = [];
  for (const item of wiki?.query?.search || []) {
    if (item?.title) {
      raw.push({
        title: `${item.title} — Wikipedia`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(item.title).replace(/\s+/g, '_'))}`,
        snippet: stripHtmlToText(String(item.snippet || ''), 320),
        engine: 'Wikipedia',
      });
    }
  }
  for (const hit of hn?.hits || []) {
    const u = hit?.url || (hit?.objectID ? `https://news.ycombinator.com/item?id=${hit.objectID}` : '');
    if (u && hit?.title) {
      raw.push({
        title: String(hit.title),
        url: String(u),
        snippet: `Hacker News · ${hit.points || 0} points · ${hit.num_comments || 0} comments`,
        engine: 'HackerNews',
      });
    }
  }
  for (const w of openalex?.results || []) {
    const u = w?.doi || w?.primary_location?.landing_page_url || w?.id;
    if (u && w?.title) {
      raw.push({
        title: String(w.title),
        url: String(u),
        snippet: `Academic Paper (${w.publication_year || 'n/d'}) · ${w.cited_by_count || 0} citations`,
        engine: 'OpenAlex',
      });
    }
  }
  for (const it of wikidata?.search || []) {
    if (it?.id) {
      raw.push({
        title: `${it.label || it.id} — Wikidata`,
        url: `https://www.wikidata.org/wiki/${it.id}`,
        snippet: String(it.description || 'Structured knowledge graph entity'),
        engine: 'Wikidata',
      });
    }
  }
  for (const d of openlib?.docs || []) {
    if (d?.key && d?.title) {
      raw.push({
        title: `${d.title}${d.first_publish_year ? ` (${d.first_publish_year})` : ''}`,
        url: `https://openlibrary.org${d.key}`,
        snippet: `Book Archive · ${Array.isArray(d.author_name) ? d.author_name.slice(0, 2).join(', ') : 'Reference'}`,
        engine: 'OpenLibrary',
      });
    }
  }
  for (const qItem of so?.items || []) {
    if (qItem?.link && qItem?.title) {
      raw.push({
        title: stripHtmlToText(String(qItem.title), 180),
        url: String(qItem.link),
        snippet: `StackOverflow · Score ${qItem.score || 0} · ${qItem.answer_count || 0} answers`,
        engine: 'StackOverflow',
      });
    }
  }
  for (const repo of gh?.items || []) {
    if (repo?.html_url && repo?.full_name) {
      raw.push({
        title: `${repo.full_name} — GitHub`,
        url: String(repo.html_url),
        snippet: `${repo.description || 'Open-source repository'} · ★ ${repo.stargazers_count || 0}`,
        engine: 'GitHub',
      });
    }
  }
  return raw;
}

export function registerDeepSearchRoutes(app: express.Express): void {
  // Batch safe webpage reader used by engine.js
  app.post('/api/read', async (req, res) => {
    try {
      const urls = Array.isArray(req.body?.urls)
        ? req.body.urls.map((u: unknown) => String(u || '').trim()).filter(isSafePublicHttpUrl).slice(0, 12)
        : [];
      const maxChars = Math.min(8000, Math.max(400, Number(req.body?.max) || 4000));
      const timeoutMs = Math.min(4500, Math.max(1000, Number(req.body?.timeoutMs) || 3200));

      const entries = await Promise.all(
        urls.map(async (u: string) => [u, await fetchPageTextSafe(u, maxChars, timeoutMs)] as const)
      );
      const pages: Record<string, string> = {};
      for (const [u, txt] of entries) {
        if (txt) pages[u] = txt;
      }
      return res.json({ ok: true, pages });
    } catch (e: any) {
      return res.status(500).json({ ok: false, pages: {}, error: e?.message || 'Read failed' });
    }
  });

  // Streaming Deep Search (100+ sites, multi-engine scan, reading top sources, per-source trust meter)
  app.post('/api/search/deep', async (req, res) => {
    const query = String(req.body?.query || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: unknown) => {
      if (res.writableEnded) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      sendEvent('progress', { stage: 'searching', message: `Scanning research & web indexes for "${query}"…`, scanned: 0 });
      const raw = await gatherDeepSources(query);
      const summary = verifyAndRankSources(raw, query);

      sendEvent('progress', {
        stage: 'reading',
        message: `Scanned ${raw.length} sources (${summary.totalUnique} unique) — reading top authoritative pages…`,
        scanned: raw.length,
        unique: summary.totalUnique,
      });

      const topToRead = summary.sources.slice(0, 6);
      const extracts = await Promise.all(
        topToRead.map(async (s) => {
          const text = await fetchPageTextSafe(s.url, 2600, 3200);
          return { ...s, text: text || s.snippet };
        })
      );

      const finalSources = [...extracts, ...summary.sources.slice(topToRead.length)];

      sendEvent('result', {
        ok: true,
        query,
        scannedCount: raw.length,
        uniqueCount: summary.totalUnique,
        avgTrust: summary.avgTrust,
        trustBreakdown: {
          trustable: summary.trustableCount,
          reliable: summary.reliableCount,
          verify: summary.verifyCount,
          low: summary.lowCount,
        },
        sources: finalSources,
        results: finalSources,
      });
    } catch (e: any) {
      sendEvent('result', {
        ok: false,
        query,
        scannedCount: 0,
        uniqueCount: 0,
        avgTrust: 0,
        sources: [],
        results: [],
        error: e?.message || 'Deep search error',
      });
    } finally {
      if (!res.writableEnded) res.end();
    }
  });
}
