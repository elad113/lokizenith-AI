import type express from 'express';
import { isSafePublicHttpUrl } from '../utils/guestAndLength.ts';
import { runLiveMultiSiteWebSearch } from './liveWebSearch.ts';

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
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html, text/plain, application/json;q=0.9',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
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
        urls.map(async (u: string) => [u, await fetchPageTextSafe(u, maxChars, timeoutMs)] as const),
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

  // Streaming Deep Search (Google Search Grounding + Live Web/News/Research Engines + Full Page Reading)
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

    const t0 = Date.now();
    try {
      sendEvent('progress', {
        stage: 'searching',
        message: `Searching live internet, news & research engines for "${query}"…`,
        scanned: 0,
      });

      const searchData = await runLiveMultiSiteWebSearch({
        query,
        limit: 160,
        deep: true,
        fast: false,
        includeGrounding: true,
      });

      sendEvent('progress', {
        stage: 'reading',
        message: `Found ${searchData.uniqueCount} unique websites across ${searchData.distinctDomains} domains (${searchData.enginesUsed.join(', ')}) — reading top pages…`,
        found: searchData.scannedCount,
        unique: searchData.uniqueCount,
        read: 0,
      });

      // Read top 6 distinct non-redirect websites in parallel under a 3.2s cap
      const topToRead = searchData.sources.slice(0, 6);
      let readCount = 0;
      const extracts = await Promise.all(
        topToRead.map(async (s) => {
          const text = await fetchPageTextSafe(s.url, 2600, 3200);
          if (text && text.length > 80) readCount++;
          return { ...s, text: text || s.snippet };
        }),
      );

      const finalSources = [...extracts, ...searchData.sources.slice(topToRead.length)];

      sendEvent('result', {
        ok: true,
        query,
        scannedCount: searchData.scannedCount,
        uniqueCount: searchData.uniqueCount,
        distinctDomains: searchData.distinctDomains,
        readCount,
        enginesUsed: searchData.enginesUsed,
        queriesUsed: searchData.queriesUsed,
        avgTrust: searchData.avgTrust,
        overallTrust: searchData.avgTrust,
        trustBreakdown: searchData.trustBreakdown,
        conclusion: searchData.groundedAnswer,
        groundedAnswer: searchData.groundedAnswer,
        sources: finalSources,
        results: finalSources,
        elapsedMs: Date.now() - t0,
      });
    } catch (e: any) {
      sendEvent('result', {
        ok: false,
        query,
        scannedCount: 0,
        uniqueCount: 0,
        readCount: 0,
        avgTrust: 0,
        sources: [],
        results: [],
        conclusion: '',
        error: e?.message || 'Deep search error',
      });
    } finally {
      if (!res.writableEnded) res.end();
    }
  });
}
