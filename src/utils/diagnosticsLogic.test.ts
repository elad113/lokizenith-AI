import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIAGNOSTIC_MODELS,
  GATEWAY_CLOUD_RUN_URL,
  redactApiKey,
  buildRealChatTestPayload,
  parseGatewayResponse,
} from './diagnosticsLogic';

test('DIAGNOSTIC_MODELS includes all 3 required models', () => {
  assert.deepEqual(DIAGNOSTIC_MODELS, [
    'lokizen-4.0-stark',
    'lokizenith-3.5-fera',
    'rewind-1.0',
  ]);
});

test('redactApiKey never exposes raw API keys', () => {
  const sampleRuntimeKey = 'lkz-stark-' + 'a'.repeat(48);
  const masked = redactApiKey(sampleRuntimeKey);
  assert.equal(masked.includes('aaaaaaaaaaaaaaaaaaaa'), false);
  assert.ok(masked.startsWith('lkz-stark-••••••••••••'));
  assert.equal(redactApiKey(''), '[MISSING_KEY]');
});

test('buildRealChatTestPayload constructs exact Real Chat Test JSON body', () => {
  const payload = buildRealChatTestPayload();
  assert.deepEqual(payload, {
    model: 'lokizen-4.0-stark',
    messages: [
      {
        role: 'user',
        content: 'Hello! Reply with a short greeting.',
      },
    ],
  });
  assert.equal(
    GATEWAY_CLOUD_RUN_URL,
    'https://ais-dev-yfgctzjufolvqag6zyfmx2-895326589665.europe-west2.run.app/api/v1/chat/completions'
  );
});

test('parseGatewayResponse marks verifiedWorking true only on HTTP 200 with non-empty model reply', () => {
  const okResult = parseGatewayResponse(200, 'OK', 145, {
    choices: [{ message: { role: 'assistant', content: 'Hello! Ready to assist.' } }],
  });
  assert.equal(okResult.verifiedWorking, true);
  assert.equal(okResult.connectionStatus, 'CONNECTED');
  assert.equal(okResult.httpStatusCode, 200);
  assert.equal(okResult.responseTimeMs, 145);
  assert.equal(okResult.modelResponse, 'Hello! Ready to assist.');
  assert.equal(okResult.authError, null);

  const emptyResult = parseGatewayResponse(200, 'OK', 95, {
    choices: [{ message: { role: 'assistant', content: '' } }],
  });
  assert.equal(emptyResult.verifiedWorking, false);
  assert.equal(emptyResult.connectionStatus, 'REQUEST_ERROR');
});

test('parseGatewayResponse surfaces 401 authentication errors accurately', () => {
  const authFail = parseGatewayResponse(401, 'Unauthorized', 32, {
    error: {
      message: 'Authentication failed: Invalid API key provided.',
      type: 'authentication_error',
      code: 'invalid_api_key',
    },
  });
  assert.equal(authFail.verifiedWorking, false);
  assert.equal(authFail.connectionStatus, 'AUTH_ERROR');
  assert.equal(authFail.httpStatusCode, 401);
  assert.ok(authFail.authError?.includes('invalid_api_key'));
  assert.ok(authFail.detailedErrorMessage?.includes('HTTP 401'));
});
