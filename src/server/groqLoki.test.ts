import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FALLBACK_MODEL,
  DEFAULT_LOKICODE_MODEL,
  FAST_MODEL_NOTICE,
  GROQ_CHAT_URL,
  GroqRateLimiter,
  GroqRequestQueue,
  buildGroqCompletionBody,
  buildLslRepairMessages,
  consumeGroqSseBuffer,
  groqFallbackNotice,
  parseGroqRateHeaders,
  parseResetDelayMs,
  planGroqAttempt,
  resolveFallbackModel,
  resolveGroqChatUrl,
  resolveLokiCodeModel,
  streamGroqGuarded,
} from './groqLoki.ts';

test('Groq plan reads the key only from the environment and defaults the model', () => {
  assert.deepEqual(planGroqAttempt({} as NodeJS.ProcessEnv), { action: 'skip', reason: 'missing_key' });
  assert.equal(resolveLokiCodeModel({} as NodeJS.ProcessEnv), DEFAULT_LOKICODE_MODEL);
  assert.equal(resolveLokiCodeModel({ LOKICODE_MODEL: 'openai/gpt-oss-20b' } as NodeJS.ProcessEnv), 'openai/gpt-oss-20b');
  const planned = planGroqAttempt({ GROQ_API_KEY: 'test-key', LOKICODE_MODEL: '' } as NodeJS.ProcessEnv);
  assert.equal(planned.action, 'request');
  if (planned.action === 'request') assert.equal(planned.model, DEFAULT_LOKICODE_MODEL);
  assert.equal(groqFallbackNotice(429), 'Groq rate-limited (429). Switched to the Gemini path.');
  assert.match(groqFallbackNotice(undefined, 'missing_key'), /GROQ_API_KEY/);
  assert.equal(GROQ_CHAT_URL, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(resolveGroqChatUrl({} as NodeJS.ProcessEnv), GROQ_CHAT_URL);
  assert.equal(
    resolveGroqChatUrl({ GROQ_BASE_URL: 'http://127.0.0.1:9/v1' } as NodeJS.ProcessEnv),
    'http://127.0.0.1:9/v1/chat/completions'
  );
});

test('Groq request body matches the measured low-reasoning shape and never embeds the key', () => {
  const body = buildGroqCompletionBody({
    model: 'openai/gpt-oss-120b',
    messages: [
      { role: 'system', content: 'You are an expert LSL scripter.' },
      { role: 'user', content: 'Write a door.' },
    ],
    maxTokens: 8000,
    stream: true,
  });
  assert.equal(body.model, 'openai/gpt-oss-120b');
  assert.equal(body.reasoning_effort, 'low');
  assert.equal(body.temperature, 0.2);
  assert.equal(body.stream, true);
  assert.equal(body.max_tokens, 8000);
  assert.equal(JSON.stringify(body).includes('gsk_'), false);
  assert.equal('apiKey' in body, false);
});

test('Groq SSE parser emits content deltas and ignores the done marker', () => {
  const chunks: string[] = [];
  const sample =
    'data: {"choices":[{"delta":{"content":"default"}}]}\n' +
    'data: {"choices":[{"delta":{"reasoning":"think"}}]}\n' +
    'data: {"choices":[{"delta":{"content":"\\n{\\n"}}]}\n' +
    'data: [DONE]\n';
  const tail = consumeGroqSseBuffer(sample, (t) => chunks.push(t));
  assert.equal(tail, '');
  assert.deepEqual(chunks, ['default', '\n{\n']);
});

test('LSL repair prompt sends only the broken lines', () => {
  const msgs = buildLslRepairMessages([
    { line: 4, message: 'missing semicolon', text: 'llSay(0, "hi")' },
    { line: 9, message: 'llSay expects 2 arguments', text: 'llSay("hi");' },
  ]);
  assert.equal(msgs[0].role, 'system');
  assert.match(msgs[1].content, /L4: missing semicolon/);
  assert.match(msgs[1].content, /llSay\(0, "hi"\)/);
  assert.equal(msgs[1].content.includes('state_entry'), false);
  assert.equal(msgs[1].content.includes('default'), false);
});

test('fallback model defaults to gpt-oss-20b and can be overridden', () => {
  assert.equal(resolveFallbackModel({} as NodeJS.ProcessEnv), DEFAULT_FALLBACK_MODEL);
  assert.equal(
    resolveFallbackModel({ LOKICODE_FALLBACK_MODEL: 'openai/gpt-oss-20b' } as NodeJS.ProcessEnv),
    'openai/gpt-oss-20b'
  );
  assert.equal(FAST_MODEL_NOTICE, 'Busy, using fast model');
});

test('Groq rate-limit headers parse remaining budget and reset durations', () => {
  const now = 1_700_000_000_000;
  assert.equal(parseResetDelayMs('2s'), 2000);
  assert.equal(parseResetDelayMs('7m59.56s'), 7 * 60_000 + 59_560);
  const snap = parseGroqRateHeaders(
    {
      get(name: string) {
        const headers: Record<string, string> = {
          'x-ratelimit-limit-requests': '30',
          'x-ratelimit-remaining-requests': '1',
          'x-ratelimit-limit-tokens': '8000',
          'x-ratelimit-remaining-tokens': '400',
          'x-ratelimit-reset-requests': '2s',
          'x-ratelimit-reset-tokens': '30s',
        };
        return headers[name] ?? null;
      },
    },
    now
  );
  assert.equal(snap.limitRequests, 30);
  assert.equal(snap.remainingRequests, 1);
  assert.equal(snap.remainingTokens, 400);
  assert.equal(snap.resetRequestsAt, now + 2000);
  assert.equal(snap.resetTokensAt, now + 30_000);
});

test('limiter steps down near the 120b free-tier caps and after 429', () => {
  const now = 1_700_000_000_000;
  const limiter = new GroqRateLimiter(() => now);
  const primary = 'openai/gpt-oss-120b';
  const fallback = 'openai/gpt-oss-20b';

  assert.equal(limiter.decide(primary, fallback, 200).model, primary);

  limiter.noteTokens(primary, 7500);
  const nearTokens = limiter.decide(primary, fallback, 200);
  assert.equal(nearTokens.model, fallback);
  assert.equal(nearTokens.fast, true);

  const daily = new GroqRateLimiter(() => now);
  for (let i = 0; i < 950; i++) daily.noteAttempt(primary, 0);
  const nearDay = daily.decide(primary, fallback, 100);
  assert.equal(nearDay.model, fallback);

  const cooled = new GroqRateLimiter(() => now);
  cooled.note429(primary, 60_000);
  assert.equal(cooled.decide(primary, fallback, 100).model, fallback);
  cooled.note429(fallback, 60_000);
  assert.equal(cooled.decide(primary, fallback, 100).model, null);

  const fromHeaders = new GroqRateLimiter(() => now);
  fromHeaders.noteHeaders(primary, parseGroqRateHeaders(
    {
      get(name: string) {
        return name === 'x-ratelimit-remaining-tokens' ? '100' : name === 'x-ratelimit-limit-tokens' ? '8000' : null;
      },
    },
    now
  ));
  assert.equal(fromHeaders.decide(primary, fallback, 500).model, fallback);
});

test('Groq queue runs one request at a time', async () => {
  const queue = new GroqRequestQueue();
  const order: number[] = [];
  await Promise.all([
    queue.enqueue(async () => {
      order.push(1);
      await new Promise((r) => setTimeout(r, 20));
      order.push(2);
    }),
    queue.enqueue(async () => {
      order.push(3);
    }),
  ]);
  assert.deepEqual(order, [1, 2, 3]);
});

test('a 429 on the large model retries the fast model once', async () => {
  const limiter = new GroqRateLimiter(() => 1_700_000_000_000);
  const queue = new GroqRequestQueue();
  const seen: string[] = [];
  const notices: string[] = [];
  const result = await streamGroqGuarded(
    {
      apiKey: 'test-key',
      messages: [{ role: 'user', content: 'write a door' }],
      model: 'openai/gpt-oss-120b',
      fallbackModel: 'openai/gpt-oss-20b',
      maxTokens: 400,
      onDelta: () => {},
      onModel: (model, notice) => {
        seen.push(model);
        if (notice) notices.push(notice);
      },
    },
    {
      limiter,
      queue,
      send: async (opts) => {
        if (opts.model?.includes('120b')) {
          return { ok: false, status: 429, text: '', error: 'rate_limit', retryAfterMs: 1000 };
        }
        return { ok: true, status: 200, text: 'default{}', rate: { remainingTokens: 7000, limitTokens: 8000 } };
      },
    }
  );
  assert.deepEqual(seen, ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);
  assert.deepEqual(notices, [FAST_MODEL_NOTICE]);
  assert.equal(result.ok, true);
  assert.equal(result.model, 'openai/gpt-oss-20b');
  assert.equal(result.notice, FAST_MODEL_NOTICE);
});
