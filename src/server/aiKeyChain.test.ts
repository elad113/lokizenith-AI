import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProviderChainCandidates,
  callKeyedAiChain,
  collectProviderKeys,
  getConfiguredKeyChainSummary,
  isUsableApiKey,
  KeyCooldownTracker,
  streamKeyedAiChain,
} from './aiKeyChain';

test('isUsableApiKey rejects empty strings and placeholder tokens', () => {
  assert.equal(isUsableApiKey(''), false);
  assert.equal(isUsableApiKey('MY_GROQ_API_KEY'), false);
  assert.equal(isUsableApiKey('your_api_key_here'), false);
  assert.equal(isUsableApiKey('short'), false);
  assert.equal(isUsableApiKey('gsk_real_looking_token_123456'), true);
});

test('collectProviderKeys merges primary, numbered _2.._10, and *_KEYS pools without duplicates', () => {
  const env = {
    GROQ_API_KEY: 'gsk_primary_1111',
    GROQ_API_KEYS: 'gsk_pool_2222, gsk_primary_1111 ; gsk_pool_3333',
    GROQ_API_KEY_2: 'gsk_numbered_4444',
    GROQ_API_KEY_3: 'MY_GROQ_API_KEY',
    GEMINI_API_KEY: 'AIza_gem_1111',
    GEMINI_API_KEY_2: 'AIza_gem_2222',
    XAI_API_KEY: 'xai-key-1111',
    GROK_API_KEY: 'xai-key-2222',
  };

  assert.deepEqual(collectProviderKeys('groq', env), [
    'gsk_primary_1111',
    'gsk_pool_2222',
    'gsk_pool_3333',
    'gsk_numbered_4444',
  ]);
  assert.deepEqual(collectProviderKeys('gemini', env), ['AIza_gem_1111', 'AIza_gem_2222']);
  assert.deepEqual(collectProviderKeys('xai', env), ['xai-key-1111', 'xai-key-2222']);
});

test('KeyCooldownTracker rotates hot keys and skips cooled keys', () => {
  let now = 1_000_000;
  const tracker = new KeyCooldownTracker(() => now);
  const keys = ['gsk_key_a_1234', 'gsk_key_b_5678', 'gsk_key_c_9012'];

  const first = tracker.orderHotSlots('groq', keys, 'Groq');
  assert.equal(first.length, 3);
  assert.equal(first[0].slotId, 'groq:0');

  tracker.coolForHttpStatus('groq:1', 429, '30');
  const second = tracker.orderHotSlots('groq', keys, 'Groq');
  assert.deepEqual(
    second.map((s) => s.slotId),
    ['groq:2', 'groq:0']
  );

  now += 31_000;
  const recovered = tracker.orderHotSlots('groq', keys, 'Groq');
  assert.equal(recovered.length, 3);
});

test('buildProviderChainCandidates orders Groq, Codestral, Cerebras, Mistral, OpenRouter, Together, OpenAI, Anthropic', () => {
  const env = {
    GROQ_API_KEY: 'gsk_test_1111111',
    CODESTRAL_API_KEY: 'mstrl_test_000000',
    MISTRAL_API_KEY: 'mstrl_test_999999',
    OPENROUTER_API_KEY: 'sk-or-test-222222',
    CEREBRAS_API_KEY: 'csk-test-3333333',
    OPENAI_API_KEY: 'sk-openai-444444',
    ANTHROPIC_API_KEY: 'sk-ant-55555555',
    TOGETHER_API_KEY: 'tog-test-666666',
  };
  const tracker = new KeyCooldownTracker();
  const candidates = buildProviderChainCandidates({ purpose: 'quality', env, tracker });

  assert.deepEqual(
    candidates.map((c) => c.spec.id),
    ['groq', 'codestral', 'cerebras', 'mistral', 'openrouter', 'together', 'openai', 'anthropic']
  );
  const mistral = candidates.find((c) => c.spec.id === 'mistral');
  assert.equal(mistral?.model, 'codestral-latest');
  assert.equal(mistral?.spec.fallbackModels?.includes('mistral-large-latest'), false);
});

test('getConfiguredKeyChainSummary never exposes raw API keys or key prefixes', () => {
  const secretGroq = 'gsk_super_secret_value_99887766';
  const secretGem = 'AIzaSySecretValueABCDEF12345';
  const summary = getConfiguredKeyChainSummary({
    GROQ_API_KEY: secretGroq,
    GEMINI_API_KEY: secretGem,
  });

  const serialized = JSON.stringify(summary);
  assert.equal(serialized.includes(secretGroq), false);
  assert.equal(serialized.includes(secretGem), false);
  assert.equal(serialized.includes('gsk_super'), false);
  assert.equal(summary.totalProvidersConfigured, 2);
  assert.equal(summary.totalKeysConfigured, 2);
});

test('callKeyedAiChain rotates past 429 Groq key to next Groq key in chain', async () => {
  const originalFetch = globalThis.fetch;
  const tracker = new KeyCooldownTracker();
  const calls: Array<{ url: string; auth: string }> = [];

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const auth = String((init?.headers as Record<string, string>)?.Authorization || '');
    calls.push({ url: String(url), auth });
    if (auth.includes('gsk_key_1')) {
      return new Response('rate limited', { status: 429, headers: { 'retry-after': '20' } });
    }
    return new Response(
      JSON.stringify({ choices: [{ message: { content: 'Hello from fallback key!' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const out = await callKeyedAiChain({
      messages: [{ role: 'user', content: 'hi' }],
      purpose: 'fast',
      env: {
        GROQ_API_KEY: 'gsk_key_1_aaaaaaaa',
        GROQ_API_KEY_2: 'gsk_key_2_bbbbbbbb',
        OPENROUTER_API_KEY: 'sk-or-key-3_cccccc',
      },
      tracker,
    });
    assert.equal(out.ok, true);
    assert.equal(out.providerId, 'groq');
    assert.equal(out.text, 'Hello from fallback key!');
    assert.equal(calls.length >= 2, true);
    assert.equal(tracker.isHot('groq:0'), false);
    assert.equal(tracker.isHot('groq:1'), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('callKeyedAiChain skips backup models on 401 and jumps straight to next provider', async () => {
  const originalFetch = globalThis.fetch;
  const tracker = new KeyCooldownTracker();
  const urlsTried: string[] = [];

  globalThis.fetch = (async (url: string | URL | Request) => {
    const u = String(url);
    urlsTried.push(u);
    if (u.includes('api.groq.com')) {
      return new Response('unauthorized', { status: 401 });
    }
    if (u.includes('api.cerebras.ai')) {
      return new Response('unauthorized', { status: 403 });
    }
    return new Response(
      JSON.stringify({ content: [{ text: 'Answered by Anthropic backup!' }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const out = await callKeyedAiChain({
      messages: [{ role: 'user', content: 'היי' }],
      purpose: 'quality',
      env: {
        GROQ_API_KEY: 'gsk_invalid_11111111',
        CEREBRAS_API_KEY: 'csk_invalid_22222222',
        ANTHROPIC_API_KEY: 'sk-ant-valid-33333333',
      },
      tracker,
    });
    assert.equal(out.ok, true);
    assert.equal(out.providerId, 'anthropic');
    assert.equal(out.text, 'Answered by Anthropic backup!');
    // Exactly 1 attempt per 401/403 key slot without retrying backup models
    assert.equal(urlsTried.length, 3);
    assert.equal(tracker.isHot('groq:0'), false);
    assert.equal(tracker.isHot('cerebras:0'), false);
    assert.equal(tracker.isHot('anthropic:0'), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('streamKeyedAiChain fails over across models and providers without dropping SSE response', async () => {
  const originalFetch = globalThis.fetch;
  const tracker = new KeyCooldownTracker();
  const attemptedModels: string[] = [];

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    attemptedModels.push(`${u.includes('groq') ? 'groq' : 'openrouter'}:${body.model}`);

    if (u.includes('groq')) {
      return new Response('upstream error', { status: 503 });
    }

    const ssePayload = [
      'data: {"choices":[{"delta":{"content":"היי! "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"מה נשמע?"}}]}\n\n',
      'data: [DONE]\n\n',
    ].join('');
    return new Response(ssePayload, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }) as typeof fetch;

  try {
    const deltas: string[] = [];
    const out = await streamKeyedAiChain({
      messages: [{ role: 'user', content: 'היי' }],
      maxTokens: 512,
      purpose: 'fast',
      env: {
        GROQ_API_KEY: 'gsk_flaky_11111111',
        OPENROUTER_API_KEY: 'sk-or-healthy-222222',
      },
      tracker,
      onDelta: (d) => deltas.push(d),
    });

    assert.equal(out.ok, true);
    assert.equal(out.providerId, 'openrouter');
    assert.equal(deltas.join(''), 'היי! מה נשמע?');
    assert.equal(attemptedModels.some((m) => m.startsWith('groq:')), true);
    assert.equal(attemptedModels.some((m) => m.startsWith('openrouter:')), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('callKeyedAiChain and streamKeyedAiChain attach reasoning_effort low for Groq and Cerebras reasoning models', async () => {
  const originalFetch = globalThis.fetch;
  const tracker = new KeyCooldownTracker();
  const seenPayloads: Array<{ url: string; model: string; reasoning_effort?: string; max_tokens: number }> = [];

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    seenPayloads.push({
      url: u,
      model: body.model,
      reasoning_effort: body.reasoning_effort,
      max_tokens: body.max_tokens,
    });
    if (u.includes('api.groq.com')) {
      return new Response('rate limit', { status: 429 });
    }
    if (body.stream) {
      return new Response('data: {"choices":[{"delta":{"content":"OK from Cerebras"}}]}\n\ndata: [DONE]\n\n', {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }
    return new Response(
      JSON.stringify({ choices: [{ message: { content: 'Non-stream OK from Cerebras' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const out = await callKeyedAiChain({
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 128,
      purpose: 'fast',
      env: {
        GROQ_API_KEY: 'gsk_test_groq_12345678',
        CEREBRAS_API_KEY: 'csk_test_cerebras_12345678',
      },
      tracker,
    });
    assert.equal(out.ok, true);
    assert.equal(out.providerId, 'cerebras');
    assert.equal(out.model, 'gpt-oss-120b');
    const ossOrQwen = seenPayloads.filter((p) => /gpt-oss|qwen/i.test(p.model));
    const llamaPayloads = seenPayloads.filter((p) => /llama/i.test(p.model));
    assert.equal(ossOrQwen.length >= 2, true);
    assert.equal(ossOrQwen.every((p) => p.reasoning_effort === 'low' && p.max_tokens >= 512), true);
    assert.equal(llamaPayloads.every((p) => p.reasoning_effort === undefined), true);

    const streamed: string[] = [];
    const streamOut = await streamKeyedAiChain({
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 200,
      purpose: 'quality',
      env: {
        CEREBRAS_API_KEY: 'csk_test_cerebras_12345678',
      },
      tracker: new KeyCooldownTracker(),
      onDelta: (d) => streamed.push(d),
    });
    assert.equal(streamOut.ok, true);
    assert.equal(streamed.join(''), 'OK from Cerebras');
    assert.equal(seenPayloads[seenPayloads.length - 1].reasoning_effort, 'low');
    assert.equal(seenPayloads[seenPayloads.length - 1].max_tokens >= 512, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Codestral and OpenRouter use dedicated hosts and required attribution headers', async () => {
  const originalFetch = globalThis.fetch;
  const seenCalls: Array<{ url: string; headers: Record<string, string>; model: string }> = [];

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const headers = (init?.headers || {}) as Record<string, string>;
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    seenCalls.push({ url: u, headers, model: body.model });
    if (u.includes('codestral.mistral.ai')) {
      return new Response('payment required', { status: 402 });
    }
    return new Response(
      JSON.stringify({ choices: [{ message: { content: 'Answered via OpenRouter' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const tracker = new KeyCooldownTracker();
    const out = await callKeyedAiChain({
      messages: [{ role: 'user', content: 'write python hello' }],
      purpose: 'code',
      env: {
        CODESTRAL_API_KEY: 'mstrl_codestral_test_1',
        OPENROUTER_API_KEY: 'sk-or-test-key_22222',
      },
      tracker,
    });
    assert.equal(out.ok, true);
    assert.equal(out.providerId, 'openrouter');
    assert.equal(seenCalls[0].url, 'https://codestral.mistral.ai/v1/chat/completions');
    assert.equal(seenCalls[0].model, 'codestral-latest');
    assert.equal(tracker.isHot('codestral:0'), false);
    assert.equal(seenCalls[1].headers['HTTP-Referer'], 'https://lokizenith.com');
    assert.equal(seenCalls[1].headers['X-Title'], 'LokiCode');
    assert.ok(seenCalls[1].headers['User-Agent']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
