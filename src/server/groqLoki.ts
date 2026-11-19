/**
 * Groq OpenAI-compatible client for LokiCode.
 * The API key is read only from GROQ_API_KEY and is never written into source.
 */

export const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_LOKICODE_MODEL = 'openai/gpt-oss-120b';
export const DEFAULT_FALLBACK_MODEL = 'openai/gpt-oss-20b';
/** Observed Groq free-tier caps for openai/gpt-oss-120b. */
export const PRIMARY_REQUESTS_PER_DAY = 1000;
export const PRIMARY_TOKENS_PER_MINUTE = 8000;
export const FAST_MODEL_NOTICE = 'Busy, using fast model';

const NEAR_DAY_REQUESTS = 950;
const NEAR_TOKENS_PER_MINUTE = 7200;

export interface ChatMessage {
  role: string;
  content: string;
}

export function resolveLokiCodeModel(env: NodeJS.ProcessEnv = process.env): string {
  const picked = String(env.LOKICODE_MODEL || '').trim();
  return picked || DEFAULT_LOKICODE_MODEL;
}

/** Official endpoint unless GROQ_BASE_URL points at another OpenAI-compatible host. */
export function resolveGroqChatUrl(env: NodeJS.ProcessEnv = process.env): string {
  const base = String(env.GROQ_BASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) return GROQ_CHAT_URL;
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
}

export function resolveFallbackModel(env: NodeJS.ProcessEnv = process.env): string {
  const picked = String(env.LOKICODE_FALLBACK_MODEL || '').trim();
  return picked || DEFAULT_FALLBACK_MODEL;
}

export function modelUsesObservedFreeTier(model: string): boolean {
  return model.includes('gpt-oss-120b');
}

export function planGroqAttempt(
  env: NodeJS.ProcessEnv = process.env
): { action: 'skip'; reason: 'missing_key' } | { action: 'request'; model: string } {
  if (!String(env.GROQ_API_KEY || '').trim()) return { action: 'skip', reason: 'missing_key' };
  return { action: 'request', model: resolveLokiCodeModel(env) };
}

export function groqFallbackNotice(status?: number, reason?: string): string {
  if (reason === 'missing_key') return 'GROQ_API_KEY is not set. Using the Gemini path.';
  if (status === 429) return 'Groq rate-limited (429). Switched to the Gemini path.';
  return 'Groq request failed. Switched to the Gemini path.';
}

export function buildGroqCompletionBody(args: {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  stream?: boolean;
}) {
  return {
    model: args.model,
    messages: args.messages,
    max_tokens: args.maxTokens ?? 8000,
    temperature: 0.2,
    reasoning_effort: 'low' as const,
    stream: args.stream !== false,
  };
}

export function extractGroqDelta(payload: unknown): string {
  const choice = (payload as { choices?: Array<{ delta?: { content?: unknown } }> })?.choices?.[0];
  const content = choice?.delta?.content;
  return typeof content === 'string' ? content : '';
}

/** Pull complete SSE events out of a chunk buffer. Returns the unparsed tail. */
export function consumeGroqSseBuffer(buffer: string, onDelta: (text: string) => void): string {
  let buf = buffer;
  let nl = buf.indexOf('\n');
  while (nl >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (line.startsWith('data:')) {
      const data = line.slice(5).trim();
      if (data && data !== '[DONE]') {
        try {
          const text = extractGroqDelta(JSON.parse(data));
          if (text) onDelta(text);
        } catch {
          /* ignore partial or non-JSON keepalives */
        }
      }
    }
    nl = buf.indexOf('\n');
  }
  return buf;
}

export interface LslRepairLine {
  line?: number;
  message: string;
  text?: string;
}

export function buildLslRepairMessages(errors: LslRepairLine[]): ChatMessage[] {
  const body = errors
    .slice(0, 40)
    .map((e) => {
      const where = e.line ? `L${e.line}` : 'L?';
      const src = e.text ? `\n    ${e.text}` : '';
      return `${where}: ${e.message}${src}`;
    })
    .join('\n');
  return [
    {
      role: 'system',
      content:
        'You repair Second Life LSL. You are given only the broken lines and compiler messages, not the whole script. Reply with ONLY lines of the form LINE <number>: <one corrected source line>. No markdown and no explanation.',
    },
    {
      role: 'user',
      content: `ERRORS:\n${body}`,
    },
  ];
}

export interface GroqRateSnapshot {
  limitRequests?: number;
  limitTokens?: number;
  remainingRequests?: number;
  remainingTokens?: number;
  resetRequestsAt?: number;
  resetTokensAt?: number;
}

type HeaderBag = { get(name: string): string | null };

/** Groq reset headers are durations such as "2s" or "7m59.56s". */
export function parseResetDelayMs(raw: string | null | undefined): number | undefined {
  const text = String(raw || '').trim();
  if (!text) return undefined;
  if (/^\d+(\.\d+)?$/.test(text)) {
    const n = Number(text);
    if (!Number.isFinite(n)) return undefined;
    if (n > 1e12) return n;
    if (n > 1e9) return n * 1000;
    return n * 1000;
  }
  const re = /(\d+(?:\.\d+)?)(ms|s|m|h)/g;
  let total = 0;
  let any = false;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    any = true;
    const value = Number(match[1]);
    const unit = match[2];
    if (unit === 'ms') total += value;
    else if (unit === 's') total += value * 1000;
    else if (unit === 'm') total += value * 60_000;
    else total += value * 3_600_000;
  }
  return any ? total : undefined;
}

function headerNumber(headers: HeaderBag, name: string): number | undefined {
  const raw = headers.get(name);
  if (raw == null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function parseGroqRateHeaders(headers: HeaderBag, now = Date.now()): GroqRateSnapshot {
  const requestsDelay = parseResetDelayMs(headers.get('x-ratelimit-reset-requests'));
  const tokensDelay = parseResetDelayMs(headers.get('x-ratelimit-reset-tokens'));
  const retryDelay = parseResetDelayMs(headers.get('retry-after'));
  return {
    limitRequests: headerNumber(headers, 'x-ratelimit-limit-requests'),
    limitTokens: headerNumber(headers, 'x-ratelimit-limit-tokens'),
    remainingRequests: headerNumber(headers, 'x-ratelimit-remaining-requests'),
    remainingTokens: headerNumber(headers, 'x-ratelimit-remaining-tokens'),
    resetRequestsAt: requestsDelay == null ? undefined : requestsDelay > 1e11 ? requestsDelay : now + requestsDelay,
    resetTokensAt:
      tokensDelay != null
        ? tokensDelay > 1e11
          ? tokensDelay
          : now + tokensDelay
        : retryDelay != null
          ? now + retryDelay
          : undefined,
  };
}

function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

interface TokenEvent {
  at: number;
  tokens: number;
}

/**
 * Process-local Groq budget. Serialised by GroqRequestQueue so one response's
 * headers are visible to the next LokiCode call.
 */
export class GroqRateLimiter {
  private requestsByDay = new Map<string, { day: string; count: number }>();
  private tokens = new Map<string, TokenEvent[]>();
  private snapshots = new Map<string, GroqRateSnapshot>();
  private cooledUntil = new Map<string, number>();

  constructor(private now: () => number = Date.now) {}

  decide(primary: string, fallback: string, estimatedTokens: number): { model: string; fast: boolean } | { model: null } {
    if (!this.blocked(primary, estimatedTokens)) return { model: primary, fast: false };
    if (fallback && fallback !== primary && !this.blocked(fallback, estimatedTokens)) {
      return { model: fallback, fast: true };
    }
    return { model: null };
  }

  noteAttempt(model: string, estimatedTokens: number) {
    const now = this.now();
    const day = dayKey(now);
    const bucket = this.requestsByDay.get(model);
    if (!bucket || bucket.day !== day) this.requestsByDay.set(model, { day, count: 1 });
    else bucket.count += 1;
    this.noteTokens(model, estimatedTokens, now);
  }

  noteTokens(model: string, tokens: number, at = this.now()) {
    if (tokens <= 0) return;
    const list = this.tokens.get(model) || [];
    list.push({ at, tokens });
    this.tokens.set(model, list.filter((ev) => at - ev.at < 60_000));
  }

  replaceReservedTokens(model: string, reserved: number, actual: number) {
    const now = this.now();
    const list = (this.tokens.get(model) || []).filter((ev) => now - ev.at < 60_000);
    const idx = [...list].reverse().findIndex((ev) => ev.tokens === reserved);
    if (idx >= 0) {
      const real = list.length - 1 - idx;
      list[real] = { at: list[real].at, tokens: Math.max(1, actual) };
    } else if (actual > 0) {
      list.push({ at: now, tokens: actual });
    }
    this.tokens.set(model, list);
  }

  noteHeaders(model: string, snapshot: GroqRateSnapshot) {
    this.snapshots.set(model, snapshot);
    if ((snapshot.remainingRequests === 0 || snapshot.remainingTokens === 0) && snapshot.resetTokensAt) {
      this.cooledUntil.set(model, snapshot.resetTokensAt);
    }
  }

  note429(model: string, retryAfterMs?: number) {
    const wait = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : 60_000;
    this.cooledUntil.set(model, this.now() + wait);
  }

  private requestsToday(model: string): number {
    const bucket = this.requestsByDay.get(model);
    if (!bucket || bucket.day !== dayKey(this.now())) return 0;
    return bucket.count;
  }

  private tokensThisMinute(model: string): number {
    const now = this.now();
    const list = (this.tokens.get(model) || []).filter((ev) => now - ev.at < 60_000);
    this.tokens.set(model, list);
    return list.reduce((sum, ev) => sum + ev.tokens, 0);
  }

  private blocked(model: string, estimatedTokens: number): boolean {
    const now = this.now();
    const cooled = this.cooledUntil.get(model) || 0;
    if (cooled > now) return true;

    const snap = this.snapshots.get(model);
    if (snap) {
      const requestsFresh = !snap.resetRequestsAt || snap.resetRequestsAt > now;
      const tokensFresh = !snap.resetTokensAt || snap.resetTokensAt > now;
      if (requestsFresh && snap.remainingRequests === 0) return true;
      if (
        requestsFresh &&
        snap.remainingRequests != null &&
        snap.limitRequests &&
        snap.limitRequests > 0 &&
        snap.remainingRequests / snap.limitRequests <= 0.05
      ) {
        return true;
      }
      if (tokensFresh && snap.remainingTokens === 0) return true;
      if (tokensFresh && snap.remainingTokens != null && snap.remainingTokens < estimatedTokens) return true;
      if (
        tokensFresh &&
        snap.remainingTokens != null &&
        snap.limitTokens &&
        snap.limitTokens > 0 &&
        snap.remainingTokens / snap.limitTokens <= 0.1
      ) {
        return true;
      }
    }

    if (modelUsesObservedFreeTier(model)) {
      const sent = this.requestsToday(model);
      if (sent >= NEAR_DAY_REQUESTS || sent >= PRIMARY_REQUESTS_PER_DAY) return true;
      const used = this.tokensThisMinute(model);
      if (used >= NEAR_TOKENS_PER_MINUTE || used >= PRIMARY_TOKENS_PER_MINUTE) return true;
      if (used > 0 && used + estimatedTokens > PRIMARY_TOKENS_PER_MINUTE) return true;
    }
    return false;
  }
}

/** One Groq call at a time so a response's rate-limit headers apply to the next call. */
export class GroqRequestQueue {
  private tail: Promise<void> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.tail.then(task, task);
    this.tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }
}

export const groqQueue = new GroqRequestQueue();
export const groqLimiter = new GroqRateLimiter();

export function estimateGroqTokens(messages: ChatMessage[], maxTokens = 1500): number {
  const prompt = messages.reduce((sum, msg) => sum + Math.ceil(String(msg.content || '').length / 4), 0);
  return prompt + Math.min(Math.max(1, maxTokens), 1500);
}

export interface GroqStreamResult {
  ok: boolean;
  status?: number;
  text: string;
  error?: string;
  rate?: GroqRateSnapshot;
  retryAfterMs?: number;
}

export async function streamGroqCompletion(opts: {
  apiKey: string;
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}): Promise<GroqStreamResult> {
  const model = opts.model || resolveLokiCodeModel();
  const body = buildGroqCompletionBody({
    model,
    messages: opts.messages,
    maxTokens: opts.maxTokens,
    stream: true,
  });
  let res: Response;
  try {
    res = await fetch(resolveGroqChatUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch {
    return { ok: false, text: '', error: 'network' };
  }
  const rate = parseGroqRateHeaders(res.headers);
  const retryAfterMs = parseResetDelayMs(res.headers.get('retry-after'));
  if (res.status === 429) return { ok: false, status: 429, text: '', error: 'rate_limit', rate, retryAfterMs };
  if (!res.ok || !res.body) return { ok: false, status: res.status, text: '', error: 'http', rate, retryAfterMs };

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let text = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    buf = consumeGroqSseBuffer(buf, (delta) => {
      text += delta;
      opts.onDelta(delta);
    });
  }
  if (buf.trim()) {
    buf = consumeGroqSseBuffer(buf + '\n', (delta) => {
      text += delta;
      opts.onDelta(delta);
    });
  }
  return { ok: text.trim().length > 0, status: res.status, text, rate };
}

export interface GuardedGroqResult extends GroqStreamResult {
  model?: string;
  notice?: string;
}

/**
 * Queue the call, prefer the primary model, and step down to the fast Groq
 * model when the free-tier budget is near, exhausted, or returns 429.
 */
export async function streamGroqGuarded(
  opts: {
    apiKey: string;
    messages: ChatMessage[];
    model?: string;
    fallbackModel?: string;
    maxTokens?: number;
    onDelta: (text: string) => void;
    onModel?: (model: string, notice?: string) => void;
    signal?: AbortSignal;
  },
  deps: {
    send?: typeof streamGroqCompletion;
    limiter?: GroqRateLimiter;
    queue?: GroqRequestQueue;
  } = {}
): Promise<GuardedGroqResult> {
  const send = deps.send || streamGroqCompletion;
  const limiter = deps.limiter || groqLimiter;
  const queue = deps.queue || groqQueue;
  const primary = opts.model || resolveLokiCodeModel();
  const fallback = opts.fallbackModel || resolveFallbackModel();
  const estimate = estimateGroqTokens(opts.messages, Math.min(opts.maxTokens ?? 1500, 1500));

  return queue.enqueue(async () => {
    const first = limiter.decide(primary, fallback, estimate);
    if (!first.model) return { ok: false, status: 429, text: '', error: 'rate_limit' };

    const attempt = async (model: string, fast: boolean): Promise<GuardedGroqResult> => {
      limiter.noteAttempt(model, estimate);
      opts.onModel?.(model, fast ? FAST_MODEL_NOTICE : undefined);
      const result = await send({
        apiKey: opts.apiKey,
        messages: opts.messages,
        model,
        maxTokens: opts.maxTokens,
        onDelta: opts.onDelta,
        signal: opts.signal,
      });
      if (result.rate) limiter.noteHeaders(model, result.rate);
      if (result.ok) {
        const actual = Math.max(1, Math.ceil(result.text.length / 4) + Math.ceil(opts.messages.reduce((n, m) => n + m.content.length, 0) / 4));
        limiter.replaceReservedTokens(model, estimate, actual);
      }
      return {
        ...result,
        model,
        notice: fast ? FAST_MODEL_NOTICE : undefined,
      };
    };

    const primaryResult = await attempt(first.model, first.fast);
    if (primaryResult.ok || primaryResult.text) return primaryResult;
    if (primaryResult.status !== 429 || first.fast || fallback === first.model) {
      if (primaryResult.status === 429) limiter.note429(first.model, primaryResult.retryAfterMs);
      return primaryResult;
    }

    limiter.note429(first.model, primaryResult.retryAfterMs);
    const second = limiter.decide(primary, fallback, estimate);
    if (!second.model || !second.fast) return primaryResult;
    const fallbackResult = await attempt(second.model, true);
    if (fallbackResult.status === 429) limiter.note429(second.model, fallbackResult.retryAfterMs);
    return fallbackResult;
  });
}
