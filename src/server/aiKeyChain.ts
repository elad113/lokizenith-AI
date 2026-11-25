/**
 * Multi-Key & Multi-Provider AI Chain
 * Reads all API keys exclusively from process.env (single, numbered _2.._10, and *_KEYS pools).
 * Never hardcodes or exposes secret keys in source code, logs, or API responses.
 */

export type ChainProviderId =
  | 'gemini'
  | 'groq'
  | 'codestral'
  | 'cerebras'
  | 'sambanova'
  | 'mistral'
  | 'openrouter'
  | 'together'
  | 'fireworks'
  | 'openai'
  | 'deepseek'
  | 'xai'
  | 'nvidia'
  | 'anthropic';

export interface ProviderChainSpec {
  id: ChainProviderId;
  name: string;
  protocol: 'gemini' | 'openai' | 'anthropic';
  chatUrl: string;
  envPrefixes: string[];
  fastModel: string;
  qualityModel: string;
  codeModel: string;
  visionModel?: string;
  fallbackModels?: string[];
  supportsJsonMode: boolean;
  extraHeaders?: Record<string, string>;
}

export interface KeySlot {
  slotId: string;
  providerId: ChainProviderId;
  providerName: string;
  index: number;
  apiKey: string;
}

export const PROVIDER_CHAIN_SPECS: ProviderChainSpec[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    protocol: 'gemini',
    chatUrl: 'https://generativelanguage.googleapis.com',
    envPrefixes: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    fastModel: 'gemini-3-flash-preview',
    qualityModel: 'gemini-3-flash-preview',
    codeModel: 'gemini-3-flash-preview',
    visionModel: 'gemini-3-flash-preview',
    fallbackModels: ['gemini-3.1-flash-lite'],
    supportsJsonMode: true,
  },
  {
    id: 'groq',
    name: 'Groq',
    protocol: 'openai',
    chatUrl: 'https://api.groq.com/openai/v1/chat/completions',
    envPrefixes: ['GROQ_API_KEY'],
    fastModel: 'openai/gpt-oss-120b',
    qualityModel: 'openai/gpt-oss-120b',
    codeModel: 'openai/gpt-oss-120b',
    visionModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
    fallbackModels: ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b'],
    supportsJsonMode: true,
  },
  {
    id: 'codestral',
    name: 'Mistral Codestral',
    protocol: 'openai',
    chatUrl: 'https://codestral.mistral.ai/v1/chat/completions',
    envPrefixes: ['CODESTRAL_API_KEY'],
    fastModel: 'codestral-latest',
    qualityModel: 'codestral-latest',
    codeModel: 'codestral-latest',
    fallbackModels: ['codestral-latest'],
    supportsJsonMode: true,
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    protocol: 'openai',
    chatUrl: 'https://api.cerebras.ai/v1/chat/completions',
    envPrefixes: ['CEREBRAS_API_KEY'],
    fastModel: 'gpt-oss-120b',
    qualityModel: 'gpt-oss-120b',
    codeModel: 'gpt-oss-120b',
    fallbackModels: ['qwen-3.8-27b'],
    supportsJsonMode: true,
  },
  {
    id: 'sambanova',
    name: 'SambaNova',
    protocol: 'openai',
    chatUrl: 'https://api.sambanova.ai/v1/chat/completions',
    envPrefixes: ['SAMBANOVA_API_KEY'],
    fastModel: 'gpt-oss-120b',
    qualityModel: 'gpt-oss-120b',
    codeModel: 'gpt-oss-120b',
    fallbackModels: ['gemma-4-31B-it', 'Meta-Llama-3.3-70B-Instruct', 'Meta-Llama-3.1-8B-Instruct'],
    supportsJsonMode: false,
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    protocol: 'openai',
    chatUrl: 'https://api.mistral.ai/v1/chat/completions',
    envPrefixes: ['MISTRAL_API_KEY'],
    fastModel: 'ministral-8b-latest',
    qualityModel: 'codestral-latest',
    codeModel: 'codestral-latest',
    fallbackModels: ['codestral-latest', 'mistral-code-latest', 'ministral-8b-latest', 'mistral-small-latest'],
    supportsJsonMode: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    protocol: 'openai',
    chatUrl: 'https://openrouter.ai/api/v1/chat/completions',
    envPrefixes: ['OPENROUTER_API_KEY'],
    fastModel: 'openrouter/free',
    qualityModel: 'google/gemma-4-31b-it:free',
    codeModel: 'google/gemma-4-31b-it:free',
    visionModel: 'google/gemini-2.5-flash',
    fallbackModels: ['baidu/ernie-5.5-flash-preview:free', 'openrouter/free', 'google/gemini-2.5-flash', 'openai/gpt-4o-mini'],
    supportsJsonMode: true,
    extraHeaders: {
      'HTTP-Referer': 'https://lokizenith.com',
      'X-Title': 'LokiCode',
    },
  },
  {
    id: 'together',
    name: 'Together.ai',
    protocol: 'openai',
    chatUrl: 'https://api.together.xyz/v1/chat/completions',
    envPrefixes: ['TOGETHER_API_KEY'],
    fastModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    qualityModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    codeModel: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    fallbackModels: ['Qwen/Qwen2.5-72B-Instruct-Turbo'],
    supportsJsonMode: true,
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    protocol: 'openai',
    chatUrl: 'https://api.fireworks.ai/inference/v1/chat/completions',
    envPrefixes: ['FIREWORKS_API_KEY'],
    fastModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    qualityModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    codeModel: 'accounts/fireworks/models/qwen2p5-coder-32b-instruct',
    supportsJsonMode: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    protocol: 'openai',
    chatUrl: 'https://api.openai.com/v1/chat/completions',
    envPrefixes: ['OPENAI_API_KEY'],
    fastModel: 'gpt-4o-mini',
    qualityModel: 'gpt-4.1-mini',
    codeModel: 'gpt-4.1-mini',
    visionModel: 'gpt-4o-mini',
    fallbackModels: ['gpt-4o-mini'],
    supportsJsonMode: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    protocol: 'openai',
    chatUrl: 'https://api.deepseek.com/chat/completions',
    envPrefixes: ['DEEPSEEK_API_KEY'],
    fastModel: 'deepseek-chat',
    qualityModel: 'deepseek-chat',
    codeModel: 'deepseek-chat',
    supportsJsonMode: true,
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    protocol: 'openai',
    chatUrl: 'https://api.x.ai/v1/chat/completions',
    envPrefixes: ['XAI_API_KEY', 'GROK_API_KEY'],
    fastModel: 'grok-3-mini-fast',
    qualityModel: 'grok-3-fast',
    codeModel: 'grok-3-fast',
    fallbackModels: ['grok-3-mini-fast'],
    supportsJsonMode: true,
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    protocol: 'openai',
    chatUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    envPrefixes: ['NVIDIA_API_KEY'],
    fastModel: 'meta/llama-3.3-70b-instruct',
    qualityModel: 'meta/llama-3.3-70b-instruct',
    codeModel: 'qwen/qwen2.5-coder-32b-instruct',
    supportsJsonMode: false,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    protocol: 'anthropic',
    chatUrl: 'https://api.anthropic.com/v1/messages',
    envPrefixes: ['ANTHROPIC_API_KEY'],
    fastModel: 'claude-3-5-haiku-latest',
    qualityModel: 'claude-3-7-sonnet-latest',
    codeModel: 'claude-3-7-sonnet-latest',
    visionModel: 'claude-3-7-sonnet-latest',
    fallbackModels: ['claude-3-5-haiku-latest'],
    supportsJsonMode: false,
  },
];

const PLACEHOLDER_KEY_RE =
  /^(my[_-]|your[_-]|replace[_-]|changeme|placeholder|example|test[_-]?key|xxx+|<.+>|\$\{.+\})/i;

export function isUsableApiKey(raw: unknown): boolean {
  const s = String(raw || '').trim();
  if (s.length < 8) return false;
  if (PLACEHOLDER_KEY_RE.test(s)) return false;
  return true;
}

function splitPoolValue(raw: unknown): string[] {
  const s = String(raw || '').trim();
  if (!s) return [];
  return s
    .split(/[\s,;]+/)
    .map((x) => x.trim())
    .filter(isUsableApiKey);
}

/**
 * Collects all configured API keys for a provider from:
 *   PREFIX, PREFIX_1..PREFIX_10, and PREFIXS / <BASE>_KEYS pools.
 */
export function collectProviderKeys(
  providerId: ChainProviderId,
  env: Record<string, string | undefined> = process.env
): string[] {
  const spec = PROVIDER_CHAIN_SPECS.find((p) => p.id === providerId);
  if (!spec) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  const addKey = (candidate: string) => {
    const clean = candidate.trim();
    if (!isUsableApiKey(clean) || seen.has(clean)) return;
    seen.add(clean);
    out.push(clean);
  };

  for (const prefix of spec.envPrefixes) {
    // 1. Primary key e.g. GROQ_API_KEY
    for (const k of splitPoolValue(env[prefix])) addKey(k);

    // 2. Pool variable e.g. GROQ_API_KEYS (or GROQ_API_KEYS_POOL)
    const poolVar = prefix.endsWith('KEY') ? `${prefix}S` : `${prefix}_KEYS`;
    for (const k of splitPoolValue(env[poolVar])) addKey(k);

    // 3. Numbered keys _1 .. _10
    for (let i = 1; i <= 10; i++) {
      for (const k of splitPoolValue(env[`${prefix}_${i}`])) addKey(k);
    }
  }

  return out;
}

export class KeyCooldownTracker {
  private cooledUntil = new Map<string, number>();
  private rrCursor = new Map<string, number>();
  private now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  isHot(slotId: string): boolean {
    return (this.cooledUntil.get(slotId) || 0) <= this.now();
  }

  cool(slotId: string, ms: number) {
    const duration = Math.max(1000, ms);
    this.cooledUntil.set(slotId, this.now() + duration);
  }

  coolForHttpStatus(slotId: string, status: number, retryAfterHeader?: string | null) {
    if (status === 401 || status === 403 || status === 402) {
      this.cool(slotId, 15 * 60_000);
      return;
    }
    if (status === 429) {
      const retrySec = Number(retryAfterHeader);
      const waitMs = Number.isFinite(retrySec) && retrySec > 0 ? Math.min(retrySec * 1000, 120_000) : 45_000;
      this.cool(slotId, waitMs);
      return;
    }
    this.cool(slotId, 15_000);
  }

  orderHotSlots(providerId: ChainProviderId, keys: string[], providerName: string): KeySlot[] {
    const all: KeySlot[] = keys.map((apiKey, index) => ({
      slotId: `${providerId}:${index}`,
      providerId,
      providerName,
      index,
      apiKey,
    }));
    if (all.length === 0) return [];
    const cursor = (this.rrCursor.get(providerId) || 0) % all.length;
    this.rrCursor.set(providerId, (cursor + 1) % all.length);
    const rotated = [...all.slice(cursor), ...all.slice(0, cursor)];
    return rotated.filter((slot) => this.isHot(slot.slotId));
  }
}

export const chainCooldowns = new KeyCooldownTracker();

export function getHotProviderSlots(
  providerId: ChainProviderId,
  env: Record<string, string | undefined> = process.env,
  tracker: KeyCooldownTracker = chainCooldowns
): KeySlot[] {
  const spec = PROVIDER_CHAIN_SPECS.find((p) => p.id === providerId);
  if (!spec) return [];
  const keys = collectProviderKeys(providerId, env);
  if (!keys.length) return [];
  return tracker.orderHotSlots(providerId, keys, spec.name);
}

export interface ChainCandidate {
  spec: ProviderChainSpec;
  slot: KeySlot;
  model: string;
}

export function buildProviderChainCandidates(opts: {
  purpose?: 'fast' | 'quality' | 'code' | 'vision';
  includeProtocols?: Array<'gemini' | 'openai' | 'anthropic'>;
  onlyProviders?: ChainProviderId[];
  excludeProviders?: ChainProviderId[];
  env?: Record<string, string | undefined>;
  tracker?: KeyCooldownTracker;
} = {}): ChainCandidate[] {
  const purpose = opts.purpose || 'quality';
  const env = opts.env || process.env;
  const tracker = opts.tracker || chainCooldowns;
  const protocols = opts.includeProtocols || ['openai', 'anthropic'];

  const specs = PROVIDER_CHAIN_SPECS.filter((s) => {
    if (!protocols.includes(s.protocol)) return false;
    if (opts.onlyProviders && !opts.onlyProviders.includes(s.id)) return false;
    if (opts.excludeProviders && opts.excludeProviders.includes(s.id)) return false;
    if (purpose === 'vision' && !s.visionModel) return false;
    return true;
  });

  const out: ChainCandidate[] = [];
  for (const spec of specs) {
    const keys = collectProviderKeys(spec.id, env);
    if (!keys.length) continue;
    const slots = tracker.orderHotSlots(spec.id, keys, spec.name);
    const model =
      purpose === 'vision'
        ? spec.visionModel || spec.qualityModel
        : purpose === 'code'
          ? spec.codeModel
          : purpose === 'fast'
            ? spec.fastModel
            : spec.qualityModel;
    for (const slot of slots) {
      out.push({ spec, slot, model });
    }
  }
  return out;
}

export function getConfiguredKeyChainSummary(
  env: Record<string, string | undefined> = process.env,
  tracker: KeyCooldownTracker = chainCooldowns
) {
  const providers = PROVIDER_CHAIN_SPECS.map((spec) => {
    const keys = collectProviderKeys(spec.id, env);
    const hotKeys = keys.filter((_, idx) => tracker.isHot(`${spec.id}:${idx}`)).length;
    return {
      id: spec.id,
      name: spec.name,
      protocol: spec.protocol,
      configuredKeys: keys.length,
      hotKeys,
      models: {
        fast: spec.fastModel,
        quality: spec.qualityModel,
        code: spec.codeModel,
        ...(spec.visionModel ? { vision: spec.visionModel } : {}),
      },
    };
  });

  const configured = providers.filter((p) => p.configuredKeys > 0);
  return {
    totalProvidersConfigured: configured.length,
    totalKeysConfigured: configured.reduce((sum, p) => sum + p.configuredKeys, 0),
    providers,
  };
}

function stripThinkTags(text: string): string {
  return String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '');
}

function normalizeMessagesForOpenAI(messages: any[], systemInstruction?: string) {
  const out: any[] = [];
  if (systemInstruction && systemInstruction.trim()) {
    out.push({ role: 'system', content: systemInstruction.trim() });
  }
  for (const m of messages || []) {
    const role = m?.role === 'assistant' || m?.role === 'model' ? 'assistant' : m?.role === 'system' ? 'system' : 'user';
    if (Array.isArray(m?.content)) {
      out.push({ role, content: m.content });
    } else {
      out.push({ role, content: String(m?.content || '') });
    }
  }
  return out;
}

function normalizeMessagesForAnthropic(messages: any[], systemInstruction?: string) {
  let sys = String(systemInstruction || '').trim();
  const out: any[] = [];
  for (const m of messages || []) {
    if (m?.role === 'system') {
      const t = Array.isArray(m.content)
        ? m.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n')
        : String(m.content || '');
      if (t.trim()) sys = sys ? `${sys}\n\n${t.trim()}` : t.trim();
      continue;
    }
    const role = m?.role === 'assistant' || m?.role === 'model' ? 'assistant' : 'user';
    if (Array.isArray(m?.content)) {
      const parts: any[] = [];
      for (const p of m.content) {
        if (p?.type === 'text') parts.push({ type: 'text', text: String(p.text || '') });
        else if (p?.type === 'image_url' && p.image_url?.url) {
          const match = String(p.image_url.url).match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
          if (match) {
            parts.push({
              type: 'image',
              source: { type: 'base64', media_type: match[1], data: match[2] },
            });
          }
        }
      }
      if (parts.length) out.push({ role, content: parts });
    } else {
      out.push({ role, content: String(m?.content || '') });
    }
  }
  if (!out.length) out.push({ role: 'user', content: 'Hello' });
  return { system: sys, messages: out };
}

function getModelsForCandidate(candidate: ChainCandidate, purpose: 'fast' | 'quality' | 'code' | 'vision'): string[] {
  const list = [candidate.model];
  if (purpose !== 'vision' && Array.isArray(candidate.spec.fallbackModels)) {
    for (const m of candidate.spec.fallbackModels) {
      if (m && !list.includes(m)) list.push(m);
    }
  }
  return list;
}

function applyReasoningSettings(
  providerId: ChainProviderId,
  modelName: string,
  body: Record<string, any>,
  requestedMaxTokens: number
) {
  const isReasoningFastHost = (providerId === 'groq' || providerId === 'cerebras') && /gpt-oss|qwen/i.test(modelName);
  if (isReasoningFastHost) {
    body.reasoning_effort = 'low';
    body.max_tokens = Math.min(Math.max(requestedMaxTokens, 512), 8192);
  }
}

const CHAIN_USER_AGENT = 'Mozilla/5.0 (compatible; LokizenithAI/1.0; +https://lokizenith.com)';

export async function streamKeyedProviderOnce(opts: {
  candidate: ChainCandidate;
  modelOverride?: string;
  messages: any[];
  systemInstruction?: string;
  maxTokens: number;
  temperature?: number;
  firstTokenTimeoutMs?: number;
  totalTimeoutMs?: number;
  onDelta: (delta: string) => void;
}): Promise<{ ok: boolean; status?: number; retryAfter?: string | null; text: string; providerId: ChainProviderId; slotId: string; model?: string }> {
  const { candidate } = opts;
  const { spec, slot } = candidate;
  const model = opts.modelOverride || candidate.model;
  const ctl = new AbortController();
  let gotFirstToken = false;
  let fullText = '';

  const ttftMs = opts.firstTokenTimeoutMs ?? 4200;
  const totalMs = opts.totalTimeoutMs ?? 25_000;

  const ttftTimer = setTimeout(() => {
    if (!gotFirstToken) ctl.abort();
  }, ttftMs);
  const totalTimer = setTimeout(() => {
    ctl.abort();
  }, totalMs);

  try {
    if (spec.protocol === 'anthropic') {
      const norm = normalizeMessagesForAnthropic(opts.messages, opts.systemInstruction);
      const res = await fetch(spec.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': slot.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: Math.min(Math.max(opts.maxTokens, 128), 8192),
          temperature: opts.temperature ?? 0.3,
          ...(norm.system ? { system: norm.system } : {}),
          messages: norm.messages,
          stream: true,
        }),
        signal: ctl.signal,
      });

      if (!res.ok || !res.body) {
        return {
          ok: false,
          status: res.status,
          retryAfter: res.headers.get('retry-after'),
          text: '',
          providerId: spec.id,
          slotId: slot.slotId,
        };
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl = buf.indexOf('\n');
        while (nl >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line.startsWith('data:')) {
            const raw = line.slice(5).trim();
            if (raw && raw !== '[DONE]') {
              try {
                const j = JSON.parse(raw);
                const delta = j?.delta?.text || '';
                if (delta) {
                  if (!gotFirstToken) {
                    gotFirstToken = true;
                    clearTimeout(ttftTimer);
                  }
                  fullText += delta;
                  opts.onDelta(delta);
                }
              } catch {}
            }
          }
          nl = buf.indexOf('\n');
        }
      }
      return { ok: fullText.trim().length > 0, status: res.status, text: fullText, providerId: spec.id, slotId: slot.slotId };
    }

    // OpenAI-compatible protocol (Groq, Codestral, Cerebras, SambaNova, Mistral, OpenRouter, Together, Fireworks, OpenAI, DeepSeek, xAI, NVIDIA)
    const oaiMsgs = normalizeMessagesForOpenAI(opts.messages, opts.systemInstruction);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': CHAIN_USER_AGENT,
      Authorization: `Bearer ${slot.apiKey}`,
      ...(spec.extraHeaders || {}),
    };
    const streamBody: Record<string, any> = {
      model,
      messages: oaiMsgs,
      max_tokens: Math.min(Math.max(opts.maxTokens, 128), 8192),
      temperature: opts.temperature ?? 0.3,
      stream: true,
    };
    applyReasoningSettings(spec.id, model, streamBody, opts.maxTokens);

    const res = await fetch(spec.chatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(streamBody),
      signal: ctl.signal,
    });

    if (!res.ok || !res.body) {
      return {
        ok: false,
        status: res.status,
        retryAfter: res.headers.get('retry-after'),
        text: '',
        providerId: spec.id,
        slotId: slot.slotId,
      };
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let rawAcc = '';
    let inThink = false;

    const handleDelta = (rawDelta: string) => {
      if (!rawDelta) return;
      rawAcc += rawDelta;
      if (rawAcc.includes('<think>') && !rawAcc.includes('</think>')) {
        inThink = true;
        return;
      }
      let emit = rawDelta;
      if (inThink) {
        inThink = false;
        emit = stripThinkTags(rawAcc).trim();
      }
      if (!emit) return;
      if (!gotFirstToken) {
        gotFirstToken = true;
        clearTimeout(ttftTimer);
      }
      fullText += emit;
      opts.onDelta(emit);
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl = buf.indexOf('\n');
      while (nl >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (data && data !== '[DONE]') {
            try {
              const j = JSON.parse(data);
              const content = j?.choices?.[0]?.delta?.content;
              if (typeof content === 'string' && content) {
                handleDelta(content);
              }
            } catch {}
          }
        }
        nl = buf.indexOf('\n');
      }
    }

    return { ok: fullText.trim().length > 0, status: res.status, text: fullText, providerId: spec.id, slotId: slot.slotId, model };
  } catch {
    if (!gotFirstToken) {
      return { ok: false, status: 0, text: '', providerId: spec.id, slotId: slot.slotId, model };
    }
    return { ok: fullText.trim().length > 0, text: fullText, providerId: spec.id, slotId: slot.slotId, model };
  } finally {
    clearTimeout(ttftTimer);
    clearTimeout(totalTimer);
  }
}

export async function streamKeyedAiChain(opts: {
  messages: any[];
  systemInstruction?: string;
  maxTokens: number;
  temperature?: number;
  purpose?: 'fast' | 'quality' | 'code' | 'vision';
  onlyProviders?: ChainProviderId[];
  excludeProviders?: ChainProviderId[];
  firstTokenTimeoutMs?: number;
  totalTimeoutMs?: number;
  onDelta: (delta: string) => void;
  env?: Record<string, string | undefined>;
  tracker?: KeyCooldownTracker;
}): Promise<{ ok: boolean; text: string; providerId?: ChainProviderId; slotId?: string; model?: string }> {
  const purpose = opts.purpose || 'quality';
  const tracker = opts.tracker || chainCooldowns;
  const candidates = buildProviderChainCandidates({
    purpose,
    includeProtocols: ['openai', 'anthropic'],
    onlyProviders: opts.onlyProviders,
    excludeProviders: opts.excludeProviders,
    env: opts.env,
    tracker,
  });

  for (const candidate of candidates) {
    const modelsToTry = getModelsForCandidate(candidate, purpose);
    let lastStatus = 0;
    let lastRetryAfter: string | null | undefined;
    for (const modelName of modelsToTry) {
      let emitted = false;
      const res = await streamKeyedProviderOnce({
        candidate,
        modelOverride: modelName,
        messages: opts.messages,
        systemInstruction: opts.systemInstruction,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
        firstTokenTimeoutMs: opts.firstTokenTimeoutMs ?? 4000,
        totalTimeoutMs: opts.totalTimeoutMs ?? 25_000,
        onDelta: (d) => {
          emitted = true;
          opts.onDelta(d);
        },
      });
      if (res.ok || emitted) {
        return res;
      }
      lastStatus = res.status || 0;
      lastRetryAfter = res.retryAfter;
      // Terminal auth/billing error or network timeout/unreachable on this key -> immediately skip remaining models and move to next key/provider
      if (lastStatus === 0 || lastStatus === 401 || lastStatus === 403 || lastStatus === 402) {
        break;
      }
    }
    const ttftUsed = opts.firstTokenTimeoutMs ?? 4000;
    if (lastStatus !== 0 || ttftUsed >= 2600 || candidate.spec.id === 'openrouter' || candidate.spec.id === 'sambanova') {
      tracker.coolForHttpStatus(candidate.slot.slotId, lastStatus || 500, lastRetryAfter);
    }
  }
  return { ok: false, text: '' };
}

export async function callKeyedAiChain(opts: {
  messages: any[];
  systemInstruction?: string;
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
  purpose?: 'fast' | 'quality' | 'code' | 'vision';
  onlyProviders?: ChainProviderId[];
  excludeProviders?: ChainProviderId[];
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
  tracker?: KeyCooldownTracker;
}): Promise<{ ok: boolean; text: string; providerId?: ChainProviderId; model?: string }> {
  const purpose = opts.purpose || 'quality';
  const candidates = buildProviderChainCandidates({
    purpose,
    includeProtocols: ['openai', 'anthropic'],
    onlyProviders: opts.onlyProviders,
    excludeProviders: opts.excludeProviders,
    env: opts.env,
    tracker: opts.tracker,
  });

  const tracker = opts.tracker || chainCooldowns;
  const maxTok = Math.min(Math.max(Number(opts.maxTokens) || 2048, 128), 8192);
  const timeoutMs = opts.timeoutMs ?? 5500;

  for (const candidate of candidates) {
    const { spec, slot } = candidate;
    const modelsToTry = getModelsForCandidate(candidate, purpose);
    let lastStatus = 0;
    let lastRetryAfter: string | null | undefined;

    for (const modelName of modelsToTry) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        if (spec.protocol === 'anthropic') {
          const norm = normalizeMessagesForAnthropic(opts.messages, opts.systemInstruction);
          const res = await fetch(spec.chatUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': slot.apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: modelName,
              max_tokens: maxTok,
              temperature: opts.temperature ?? 0.5,
              ...(norm.system ? { system: norm.system } : {}),
              messages: norm.messages,
            }),
            signal: ctl.signal,
          });
          if (!res.ok) {
            lastStatus = res.status;
            lastRetryAfter = res.headers.get('retry-after');
            if (res.status === 401 || res.status === 403 || res.status === 402) break;
            continue;
          }
          const j: any = await res.json();
          const text = String(j?.content?.[0]?.text || '').trim();
          if (text) return { ok: true, text, providerId: spec.id, model: modelName };
          continue;
        }

        const oaiMsgs = normalizeMessagesForOpenAI(opts.messages, opts.systemInstruction);
        const body: any = {
          model: modelName,
          messages: oaiMsgs,
          max_tokens: maxTok,
          temperature: opts.temperature ?? 0.5,
        };
        applyReasoningSettings(spec.id, modelName, body, maxTok);
        if (opts.json && spec.supportsJsonMode) {
          body.response_format = { type: 'json_object' };
        }

        const res = await fetch(spec.chatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': CHAIN_USER_AGENT,
            Authorization: `Bearer ${slot.apiKey}`,
            ...(spec.extraHeaders || {}),
          },
          body: JSON.stringify(body),
          signal: ctl.signal,
        });
        if (!res.ok) {
          lastStatus = res.status;
          lastRetryAfter = res.headers.get('retry-after');
          if (res.status === 401 || res.status === 403 || res.status === 402) break;
          continue;
        }
        const j: any = await res.json();
        const rawContent = j?.choices?.[0]?.message?.content;
        const text = stripThinkTags(typeof rawContent === 'string' ? rawContent : '').trim();
        if (text) return { ok: true, text, providerId: spec.id, model: modelName };
      } catch {
        lastStatus = 0;
        break;
      } finally {
        clearTimeout(timer);
      }
    }
    if (lastStatus !== 0 || timeoutMs >= 3600 || spec.id === 'openrouter' || spec.id === 'sambanova') {
      tracker.coolForHttpStatus(slot.slotId, lastStatus || 500, lastRetryAfter);
    }
  }

  return { ok: false, text: '' };
}

export async function transcribeWithGroqWhisper(opts: {
  audioB64: string;
  mime?: string;
  lang?: string;
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
  tracker?: KeyCooldownTracker;
}): Promise<{ ok: boolean; text: string; provider?: string }> {
  const tracker = opts.tracker || chainCooldowns;
  const slots = getHotProviderSlots('groq', opts.env, tracker);
  if (!slots.length) return { ok: false, text: '' };

  const mime = String(opts.mime || 'audio/webm').split(';')[0].trim() || 'audio/webm';
  const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'mp4' : mime.includes('wav') ? 'wav' : 'webm';
  const buf = Buffer.from(opts.audioB64, 'base64');
  const timeoutMs = opts.timeoutMs ?? 12_000;

  for (const slot of slots) {
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type: mime }), `speech.${ext}`);
    fd.append('model', 'whisper-large-v3-turbo');
    if (opts.lang) fd.append('language', opts.lang.slice(0, 2));
    fd.append('response_format', 'json');

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${slot.apiKey}` },
        body: fd,
        signal: ctl.signal,
      });
      if (!r.ok) {
        tracker.coolForHttpStatus(slot.slotId, r.status, r.headers.get('retry-after'));
        continue;
      }
      const j: any = await r.json();
      const text = String(j?.text || '').trim();
      if (text) return { ok: true, text, provider: 'groq-whisper-large-v3-turbo' };
    } catch {
      tracker.coolForHttpStatus(slot.slotId, 500);
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, text: '' };
}
