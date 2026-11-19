import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashApiKey,
  createHashedUserKey,
  maskProviderSecret,
  sanitizeProviderForAdmin,
  checkKeyRateLimitAndQuota,
  selectProvidersForModel,
  buildOpenAICompatibleResponse,
  type CentralProvider,
} from './openrouterRouter';

test('createHashedUserKey returns rawKeyOnce and stores ONLY 64-char SHA-256 keyHash in metadata', () => {
  const { rawKeyOnce, metadata } = createHashedUserKey({
    ownerId: 'user_123',
    name: 'Production App',
    quotaTokens: 50000,
    rateLimitRpm: 60,
  });

  assert.ok(rawKeyOnce.startsWith('lkz-stark-'));
  assert.equal(rawKeyOnce.length, 58);
  assert.equal(metadata.keyHash.length, 64);
  assert.match(metadata.keyHash, /^[a-f0-9]{64}$/);
  assert.equal(metadata.keyHash, hashApiKey(rawKeyOnce));
  // Ensure raw key is NOT present as a property in metadata
  assert.equal((metadata as any).key, undefined);
  assert.equal((metadata as any).fullKey, undefined);
  assert.equal(JSON.stringify(metadata).includes(rawKeyOnce), false);
});

test('checkKeyRateLimitAndQuota enforces revoked status, token quota, and RPM rate limit', () => {
  const { metadata } = createHashedUserKey({
    ownerId: 'user_123',
    quotaTokens: 1000,
    rateLimitRpm: 3,
  });

  const now = 1_700_000_000_000;
  // Normal request allowed
  assert.equal(checkKeyRateLimitAndQuota(metadata, [now - 10_000], now).allowed, true);

  // Rate limit exceeded (3 requests in last 60s)
  const rateLimited = checkKeyRateLimitAndQuota(
    metadata,
    [now - 5_000, now - 10_000, now - 20_000],
    now
  );
  assert.equal(rateLimited.allowed, false);
  assert.equal(rateLimited.statusCode, 429);
  assert.equal(rateLimited.errorCode, 'rate_limit_exceeded');

  // Quota exceeded
  metadata.usedTokens = 1000;
  const quotaExceeded = checkKeyRateLimitAndQuota(metadata, [], now);
  assert.equal(quotaExceeded.allowed, false);
  assert.equal(quotaExceeded.statusCode, 429);
  assert.equal(quotaExceeded.errorCode, 'quota_exceeded');

  // Revoked key
  metadata.status = 'revoked';
  const revoked = checkKeyRateLimitAndQuota(metadata, [], now);
  assert.equal(revoked.allowed, false);
  assert.equal(revoked.statusCode, 403);
  assert.equal(revoked.errorCode, 'revoked_api_key');
});

test('selectProvidersForModel orders enabled providers by priority and strips disabled providers', () => {
  const providers: CentralProvider[] = [
    {
      id: 'prov_disabled',
      name: 'Disabled Provider',
      type: 'openai-compatible',
      baseUrl: 'https://api.disabled.example/v1',
      enabled: false,
      priority: 1,
      models: ['lokizen-4.0-stark'],
      costPer1kInputUsd: 0.001,
      costPer1kOutputUsd: 0.002,
      credentials: [],
      healthStatus: 'down',
      lastLatencyMs: 0,
      successCount: 0,
      errorCount: 1,
      lastCheckedAt: null,
      createdBy: 'admin',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'prov_secondary',
      name: 'Secondary Fallback',
      type: 'lokizen-edge',
      baseUrl: 'internal://edge',
      enabled: true,
      priority: 10,
      models: ['*'],
      costPer1kInputUsd: 0.0005,
      costPer1kOutputUsd: 0.001,
      credentials: [],
      healthStatus: 'healthy',
      lastLatencyMs: 25,
      successCount: 10,
      errorCount: 0,
      lastCheckedAt: null,
      createdBy: 'admin',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'prov_primary',
      name: 'Primary Cluster',
      type: 'lokizen-cluster',
      baseUrl: 'https://primary.example/v1',
      enabled: true,
      priority: 2,
      models: ['lokizen-4.0-stark', 'rewind-1.0'],
      costPer1kInputUsd: 0.001,
      costPer1kOutputUsd: 0.002,
      credentials: [
        {
          id: 'cred_1',
          label: 'Primary Secret',
          encryptedOrSecretKey: 'sk-super-secret-value-123456',
          maskedPreview: maskProviderSecret('sk-super-secret-value-123456'),
          enabled: true,
          usageCount: 5,
          failureCount: 0,
          lastUsedAt: null,
        },
      ],
      healthStatus: 'healthy',
      lastLatencyMs: 120,
      successCount: 5,
      errorCount: 0,
      lastCheckedAt: null,
      createdBy: 'admin',
      createdAt: '',
      updatedAt: '',
    },
  ];

  const routeChain = selectProvidersForModel(providers, 'lokizen-4.0-stark');
  assert.equal(routeChain.length, 2);
  assert.equal(routeChain[0].id, 'prov_primary');
  assert.equal(routeChain[1].id, 'prov_secondary');

  // Verify sanitizeProviderForAdmin never leaks encryptedOrSecretKey
  const sanitized = sanitizeProviderForAdmin(routeChain[0]);
  assert.equal(JSON.stringify(sanitized).includes('sk-super-secret-value-123456'), false);
  assert.equal(sanitized.credentials[0].maskedPreview, 'sk-s••••••••3456');
});

test('buildOpenAICompatibleResponse normalizes output with usage and routing metadata', () => {
  const res = buildOpenAICompatibleResponse({
    completionId: 'chatcmpl-test123',
    model: 'lokizen-4.0-stark',
    content: 'Hello from Lokizen Central Router!',
    promptTokens: 12,
    completionTokens: 8,
    providerId: 'lokizen-central-cluster',
    providerName: 'Lokizen Central Stark Cluster',
    fallbackUsed: true,
    attemptedProviders: ['custom-upstream', 'lokizen-central-cluster'],
    latencyMs: 184,
    costUsd: 0.000042,
  });

  assert.equal(res.object, 'chat.completion');
  assert.equal(res.choices[0].message.content, 'Hello from Lokizen Central Router!');
  assert.equal(res.usage.total_tokens, 20);
  assert.equal(res.routing.fallbackUsed, true);
  assert.deepEqual(res.routing.attemptedProviders, ['custom-upstream', 'lokizen-central-cluster']);
});
