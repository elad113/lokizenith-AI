import test from 'node:test';
import assert from 'node:assert/strict';
import {
  unwrapDuckDuckGoUrl,
  parseDuckDuckGoHtml,
  parseRssSearchItems,
  extractGeminiGroundingSources,
  mergeAndDiversifyWebResults,
  buildGameChatMessages,
} from './webSearchAndAiUpgrades.ts';
import { detectPlayGameIntent, generateGameChatReply } from './gameEngine.ts';

test('unwrapDuckDuckGoUrl decodes uddg redirect links and rejects ddg internal links', () => {
  const decoded = unwrapDuckDuckGoUrl(
    '//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.ynet.co.il%2Fnews%2Farticle%2F123&rut=abc',
  );
  assert.equal(decoded, 'https://www.ynet.co.il/news/article/123');
  assert.equal(unwrapDuckDuckGoUrl('https://duckduckgo.com/y.js?ad=1'), '');
  assert.equal(unwrapDuckDuckGoUrl('https://www.bbc.com/news/world'), 'https://www.bbc.com/news/world');
});

test('parseDuckDuckGoHtml extracts real web results with titles, decoded URLs, and snippets', () => {
  const sampleHtml = `
    <div class="result">
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.reuters.com%2Ftech%2Fai">Reuters AI Report</a>
      <a class="result__snippet">Latest breakthroughs in artificial intelligence &amp; cloud computing.</a>
    </div>
    <div class="result">
      <a class="result__a" href="https://www.ynet.co.il/news/live">חדשות היום - ynet</a>
      <a class="result__snippet">עדכונים שוטפים מהארץ ומהעולם.</a>
    </div>
  `;
  const parsed = parseDuckDuckGoHtml(sampleHtml);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].url, 'https://www.reuters.com/tech/ai');
  assert.equal(parsed[0].title, 'Reuters AI Report');
  assert.ok(parsed[0].snippet?.includes('artificial intelligence & cloud'));
  assert.equal(parsed[1].url, 'https://www.ynet.co.il/news/live');
  assert.equal(parsed[1].engine, 'DuckDuckGo');
});

test('parseRssSearchItems parses Bing RSS and Google News RSS XML cleanly', () => {
  const rss = `<?xml version="1.0" encoding="utf-8"?>
    <rss version="2.0"><channel>
      <item>
        <title><![CDATA[Breaking Tech Update &amp; Market News]]></title>
        <link>https://techcrunch.com/2026/11/ai-launch</link>
        <description><![CDATA[<p>Major release announced today across <b>global</b> markets.</p>]]></description>
        <pubDate>Mon, 23 Nov 2026 08:00:00 GMT</pubDate>
      </item>
      <item>
        <title>עדכון חדשות מישראל</title>
        <link>https://www.mako.co.il/news-israel/article</link>
        <description>דיווח מיוחד מהשטח</description>
      </item>
    </channel></rss>`;
  const items = parseRssSearchItems(rss, 'GoogleNews');
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Breaking Tech Update & Market News');
  assert.equal(items[0].url, 'https://techcrunch.com/2026/11/ai-launch');
  assert.ok(items[0].snippet?.includes('Major release announced today'));
  assert.equal(items[1].url, 'https://www.mako.co.il/news-israel/article');
});

test('extractGeminiGroundingSources extracts groundingChunks URLs, snippets, and queries', () => {
  const mockResponse = {
    candidates: [
      {
        groundingMetadata: {
          webSearchQueries: ['israel news today', 'חדשות היום'],
          groundingChunks: [
            { web: { uri: 'https://www.ynet.co.il/news/article/abc', title: 'ynet.co.il' } },
            { web: { uri: 'https://www.bbc.com/news/articles/xyz', title: 'BBC News' } },
          ],
          groundingSupports: [
            {
              segment: { text: 'Key headline confirmed by multiple outlets.' },
              groundingChunkIndices: [0, 1],
            },
          ],
        },
      },
    ],
  };
  const out = extractGeminiGroundingSources(mockResponse);
  assert.equal(out.queriesUsed.length, 2);
  assert.equal(out.sources.length, 2);
  assert.equal(out.sources[0].engine, 'GoogleSearch');
  assert.ok(out.sources[0].snippet?.includes('Key headline confirmed'));
});

test('mergeAndDiversifyWebResults deduplicates and ensures multi-domain diversity across sites', () => {
  const raw = [
    { title: 'Wiki 1', url: 'https://en.wikipedia.org/wiki/AI_1', snippet: 'a', engine: 'Wikipedia' },
    { title: 'Wiki 2', url: 'https://en.wikipedia.org/wiki/AI_2', snippet: 'b', engine: 'Wikipedia' },
    { title: 'Wiki 3', url: 'https://en.wikipedia.org/wiki/AI_3', snippet: 'c', engine: 'Wikipedia' },
    { title: 'Reuters News', url: 'https://www.reuters.com/ai', snippet: 'live', engine: 'GoogleSearch' },
    { title: 'BBC Report', url: 'https://www.bbc.com/news/ai', snippet: 'live', engine: 'GoogleNews' },
    { title: 'TechCrunch', url: 'https://techcrunch.com/ai', snippet: 'live', engine: 'DuckDuckGo' },
  ];
  const merged = mergeAndDiversifyWebResults(raw, 'AI news', 10);
  assert.ok(merged.distinctDomains >= 4);
  // First 4 items should all be distinct domains (no single site dominating)
  const first4Domains = new Set(merged.sources.slice(0, 4).map((s) => s.domain));
  assert.equal(first4Domains.size, 4);
});

test('detectPlayGameIntent matches broad Hebrew & English play prompts and avoids code/history false positives', () => {
  // General game requests
  for (const prompt of [
    'משחק',
    'תפתח לי משחק',
    'בא לי לשחק',
    'אפשר משחק?',
    'בוא נעשה משחק',
    'תביא לי איזה משחק',
    'משעמם לי בוא נשחק',
    'open a game',
    'start a game',
    'let\'s play',
    'play',
    'games',
  ]) {
    const res = detectPlayGameIntent(prompt);
    assert.equal(res.isPlayRequest, true, `Expected play intent for: "${prompt}"`);
  }

  // Specific named games (even standalone!)
  assert.equal(detectPlayGameIntent('שחמט').suggestedGameId, 'chess');
  assert.equal(detectPlayGameIntent('דמקה').suggestedGameId, 'checkers');
  assert.equal(detectPlayGameIntent('ארבע בשורה').suggestedGameId, 'connect4');
  assert.equal(detectPlayGameIntent('צוללות').suggestedGameId, 'battleship');
  assert.equal(detectPlayGameIntent('איקס עיגול').suggestedGameId, 'tictactoe');
  assert.equal(detectPlayGameIntent('connect 4').suggestedGameId, 'connect4');
  assert.equal(detectPlayGameIntent('play chess').suggestedGameId, 'chess');

  // Non-game prompts (coding / rules / history)
  for (const nonGame of [
    'כתוב קוד למשחק שחמט בפייתון',
    'מה ההיסטוריה של שחמט?',
    'הסבר את החוקים של דמקה',
    'build a chess game in React',
    'history of checkers',
  ]) {
    const res = detectPlayGameIntent(nonGame);
    assert.equal(res.isPlayRequest, false, `Expected NON-play intent for: "${nonGame}"`);
  }
});

test('buildGameChatMessages includes live board context, history, and anti-parroting rules', () => {
  const built = buildGameChatMessages({
    gameTitle: 'שחמט',
    lang: 'he',
    boardSummary: 'Moves=4, White ahead +1',
    lastMove: 'Player moved Knight g1->f3',
    difficulty: 'medium',
    scoreSummary: 'You 1 - AI 0',
    history: [
      { who: 'ai', text: 'יאללה שחמט!' },
      { who: 'user', text: 'מה המהלך הכי טוב עכשיו?' },
    ],
    userMessage: 'מה המהלך הכי טוב עכשיו?',
  });

  assert.ok(built.systemInstruction.includes('שחמט'));
  assert.ok(built.systemInstruction.includes('Moves=4'));
  assert.ok(built.systemInstruction.includes('לעולם אל תחזור כמו תוכי'));
  // Should not duplicate the final user turn
  assert.equal(built.contents.length, 2);
  assert.equal(built.contents[1].role, 'user');
  assert.equal(built.contents[1].parts[0].text, 'מה המהלך הכי טוב עכשיו?');

  // Also ensure local fallback never parrots the user prompt
  const fb = generateGameChatReply({ gameId: 'chess', userMessage: 'איך מנצחים פה?', lang: 'he' });
  assert.ok(!fb.includes('שמעתי אותך'));
  assert.ok(!fb.includes('איך מנצחים פה'));
});
