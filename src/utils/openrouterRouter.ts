import crypto from 'crypto';

export interface HashedApiKeyMetadata {
  id: string;
  ownerId: string;
  ownerEmail?: string;
  name: string;
  keyHash: string; // 64-char hex SHA-256 digest ONLY (plaintext key is NEVER stored)
  keyPrefix: string; // e.g. "lkz-stark-a1b2c3"
  keyLast4: string; // e.g. "9f0e"
  status: 'active' | 'revoked';
  requestsCount: number;
  usedTokens: number;
  promptTokens: number;
  completionTokens: number;
  quotaTokens: number;
  rateLimitRpm: number;
  lastUsedAt: string | null;
  lastLatencyMs: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderCredential {
  id: string;
  label: string;
  encryptedOrSecretKey: string; // Server-side ONLY — never serialized to clients
  maskedPreview: string;
  enabled: boolean;
  usageCount: number;
  failureCount: number;
  lastUsedAt: string | null;
}

export interface CentralProvider {
  id: string;
  name: string;
  type: 'lokizen-cluster' | 'gemini-central' | 'openai-compatible' | 'lokizen-edge';
  baseUrl: string;
  enabled: boolean;
  priority: number;
  models: string[];
  costPer1kInputUsd: number;
  costPer1kOutputUsd: number;
  credentials: ProviderCredential[]; // Kept strictly server-side
  healthStatus: 'healthy' | 'degraded' | 'down' | 'untested';
  lastLatencyMs: number;
  successCount: number;
  errorCount: number;
  lastCheckedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformModelSpec {
  id: string;
  name: string;
  family: string;
  contextWindow: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
  description: string;
  capabilities: string[];
  providers: string[];
}

export interface PlatformRequestLog {
  id: string;
  ownerId: string;
  ownerName?: string;
  keyId: string;
  keyPrefix: string;
  model: string;
  providerId: string;
  providerName: string;
  attemptedProviders: string[];
  fallbackUsed: boolean;
  statusCode: number;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  stream: boolean;
  errorMessage?: string;
  createdAt: string;
}

export interface PlatformUserAccount {
  uid: string;
  displayName: string;
  email?: string;
  role: 'user' | 'admin';
  quotaTokens: number;
  usedTokens: number;
  rateLimitRpm: number;
  requestsCount: number;
  totalCostUsd: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Computes the SHA-256 64-character lowercase hex hash of a raw Lokizen API key.
 * Plaintext keys are never stored in memory maps or Firestore.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(String(rawKey || '').trim()).digest('hex');
}

/**
 * Generates a unique cryptographic Lokizen API key, returning the raw key ONCE
 * and the hashed metadata record for storage.
 */
export function createHashedUserKey(params: {
  ownerId: string;
  ownerEmail?: string;
  name?: string;
  quotaTokens?: number;
  rateLimitRpm?: number;
}): { rawKeyOnce: string; metadata: HashedApiKeyMetadata } {
  const cleanName = String(params.name || 'Lokizen API Key').trim().slice(0, 80) || 'Lokizen API Key';
  const randHex = crypto.randomBytes(24).toString('hex');
  const rawKeyOnce = `lkz-stark-${randHex}`;
  const keyHash = hashApiKey(rawKeyOnce);
  const keyPrefix = rawKeyOnce.slice(0, 16);
  const keyLast4 = rawKeyOnce.slice(-4);
  const nowIso = new Date().toISOString();

  const metadata: HashedApiKeyMetadata = {
    id: `key_${crypto.randomBytes(8).toString('hex')}`,
    ownerId: String(params.ownerId || 'usr_anonymous').replace(/[^a-zA-Z0-9_-]/g, '_'),
    ownerEmail: params.ownerEmail,
    name: cleanName,
    keyHash,
    keyPrefix,
    keyLast4,
    status: 'active',
    requestsCount: 0,
    usedTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    quotaTokens: Number(params.quotaTokens ?? 1_000_000),
    rateLimitRpm: Number(params.rateLimitRpm ?? 120),
    lastUsedAt: null,
    lastLatencyMs: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return { rawKeyOnce, metadata };
}

/**
 * Masks a provider secret credential so only a safe fingerprint is shown to Admins.
 */
export function maskProviderSecret(secret: string): string {
  const s = String(secret || '').trim();
  if (!s) return 'managed-env-credential';
  if (s.length <= 8) return '••••••••';
  return `${s.slice(0, 4)}••••••••${s.slice(-4)}`;
}

/**
 * Sanitizes a CentralProvider before sending to the Admin UI so raw provider API secrets
 * never leave the server.
 */
export function sanitizeProviderForAdmin(provider: CentralProvider) {
  return {
    id: provider.id,
    name: provider.name,
    type: provider.type,
    baseUrl: provider.baseUrl,
    enabled: provider.enabled,
    priority: provider.priority,
    models: provider.models,
    costPer1kInputUsd: provider.costPer1kInputUsd,
    costPer1kOutputUsd: provider.costPer1kOutputUsd,
    credentialCount: provider.credentials.length,
    credentials: provider.credentials.map(c => ({
      id: c.id,
      label: c.label,
      maskedPreview: c.maskedPreview,
      enabled: c.enabled,
      usageCount: c.usageCount,
      failureCount: c.failureCount,
      lastUsedAt: c.lastUsedAt,
    })),
    healthStatus: provider.healthStatus,
    lastLatencyMs: provider.lastLatencyMs,
    successCount: provider.successCount,
    errorCount: provider.errorCount,
    lastCheckedAt: provider.lastCheckedAt,
    createdBy: provider.createdBy,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

/**
 * Checks per-key RPM rate limits and token quotas.
 */
export function checkKeyRateLimitAndQuota(
  keyMeta: HashedApiKeyMetadata,
  recentTimestampsMs: number[],
  nowMs: number = Date.now()
): { allowed: boolean; statusCode: number; errorCode?: string; errorMessage?: string } {
  if (keyMeta.status !== 'active') {
    return {
      allowed: false,
      statusCode: 403,
      errorCode: 'revoked_api_key',
      errorMessage: 'This Lokizen API key has been revoked. Generate a new key in your dashboard.',
    };
  }

  if (keyMeta.quotaTokens > 0 && keyMeta.usedTokens >= keyMeta.quotaTokens) {
    return {
      allowed: false,
      statusCode: 429,
      errorCode: 'quota_exceeded',
      errorMessage: `Token quota exceeded (${keyMeta.usedTokens}/${keyMeta.quotaTokens} tokens used).`,
    };
  }

  const windowStart = nowMs - 60_000;
  const requestsInLastMinute = recentTimestampsMs.filter(ts => ts >= windowStart).length;
  if (requestsInLastMinute >= keyMeta.rateLimitRpm) {
    return {
      allowed: false,
      statusCode: 429,
      errorCode: 'rate_limit_exceeded',
      errorMessage: `Rate limit exceeded (${keyMeta.rateLimitRpm} requests per minute). Please slow down.`,
    };
  }

  return { allowed: true, statusCode: 200 };
}

/**
 * Selects ordered candidate providers for a requested model ID.
 * Supports exact model match or wildcard/default fallback across enabled providers.
 */
export function selectProvidersForModel(
  providers: CentralProvider[],
  requestedModel: string
): CentralProvider[] {
  const normModel = String(requestedModel || 'lokizen-4.0-stark').trim().toLowerCase();
  const enabledProviders = providers
    .filter(p => p.enabled)
    .sort((a, b) => a.priority - b.priority);

  const matching = enabledProviders.filter(p =>
    p.models.some(m => m.toLowerCase() === normModel || m === '*')
  );

  if (matching.length > 0) {
    // Also append any other enabled fallback providers at the end if not already in matching
    const rest = enabledProviders.filter(p => !matching.some(m => m.id === p.id));
    return [...matching, ...rest];
  }

  return enabledProviders;
}

/**
 * Normalizes any provider output into a strict OpenAI-compatible chat.completion object.
 */
export function buildOpenAICompatibleResponse(params: {
  completionId: string;
  model: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
  providerId: string;
  providerName: string;
  fallbackUsed: boolean;
  attemptedProviders: string[];
  latencyMs: number;
  costUsd: number;
}) {
  const totalTokens = params.promptTokens + params.completionTokens;
  return {
    id: params.completionId,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: params.model,
    provider: params.providerName,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: params.content,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: totalTokens,
      cost_usd: Number(params.costUsd.toFixed(6)),
    },
    routing: {
      providerId: params.providerId,
      providerName: params.providerName,
      fallbackUsed: params.fallbackUsed,
      attemptedProviders: params.attemptedProviders,
      latencyMs: params.latencyMs,
      costUsd: Number(params.costUsd.toFixed(6)),
    },
    reply: params.content,
    text: params.content,
    latencyMs: params.latencyMs,
  };
}
