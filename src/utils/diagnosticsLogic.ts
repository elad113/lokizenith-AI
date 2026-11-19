export const DIAGNOSTIC_MODELS = [
  'lokizen-4.0-stark',
  'lokizenith-3.5-fera',
  'rewind-1.0',
] as const;

export type DiagnosticModelId = (typeof DIAGNOSTIC_MODELS)[number];

export const GATEWAY_CLOUD_RUN_URL =
  'https://ais-dev-yfgctzjufolvqag6zyfmx2-895326589665.europe-west2.run.app/api/v1/chat/completions';

export const GATEWAY_RELATIVE_URL = '/api/v1/chat/completions';

export interface DiagnosticChatPayload {
  model: string;
  messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }>;
}

export interface ParsedDiagnosticResult {
  connectionStatus: 'CONNECTED' | 'AUTH_ERROR' | 'REQUEST_ERROR' | 'NETWORK_ERROR' | 'UNTESTED';
  httpStatusCode: number;
  httpStatusText: string;
  responseTimeMs: number;
  modelResponse: string;
  authError: string | null;
  detailedErrorMessage: string | null;
  verifiedWorking: boolean;
}

/**
 * Redacts an API key so it is never exposed in frontend logs or inspector headers.
 */
export function redactApiKey(rawKey: string): string {
  const trimmed = String(rawKey || '').trim();
  if (!trimmed) return '[MISSING_KEY]';
  if (trimmed.length <= 12) return '••••••••[REDACTED]';
  return `${trimmed.slice(0, 10)}••••••••••••${trimmed.slice(-4)}`;
}

/**
 * Builds the exact JSON payload required for the Real Chat Test and Model Tests.
 */
export function buildRealChatTestPayload(
  model: string = 'lokizen-4.0-stark',
  content: string = 'Hello! Reply with a short greeting.'
): DiagnosticChatPayload {
  return {
    model,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  };
}

/**
 * Evaluates a real HTTP response from the Lokizen API Gateway.
 * Never claims a model works unless HTTP status is 200 OK and a non-empty model reply is present.
 */
export function parseGatewayResponse(
  httpStatus: number,
  httpStatusText: string,
  responseTimeMs: number,
  body: any
): ParsedDiagnosticResult {
  const safeLatency = Math.max(1, Math.round(Number(responseTimeMs) || 0));

  if (httpStatus === 401 || httpStatus === 403) {
    const errObj = body?.error;
    const msg =
      typeof errObj === 'object' && errObj?.message
        ? String(errObj.message)
        : typeof errObj === 'string'
        ? errObj
        : 'Authentication failed (HTTP ' + httpStatus + '). Verify Authorization: Bearer USER_API_KEY.';
    const code = typeof errObj === 'object' && errObj?.code ? String(errObj.code) : 'invalid_api_key';
    return {
      connectionStatus: 'AUTH_ERROR',
      httpStatusCode: httpStatus,
      httpStatusText: httpStatusText || 'Unauthorized',
      responseTimeMs: safeLatency,
      modelResponse: '',
      authError: `[${code}] ${msg}`,
      detailedErrorMessage: `HTTP ${httpStatus} ${httpStatusText || 'Unauthorized'} — ${msg}`,
      verifiedWorking: false,
    };
  }

  if (httpStatus < 200 || httpStatus >= 300) {
    const errObj = body?.error;
    const msg =
      typeof errObj === 'object' && errObj?.message
        ? String(errObj.message)
        : typeof errObj === 'string'
        ? errObj
        : `Gateway returned HTTP ${httpStatus}`;
    return {
      connectionStatus: 'REQUEST_ERROR',
      httpStatusCode: httpStatus,
      httpStatusText: httpStatusText || 'Error',
      responseTimeMs: safeLatency,
      modelResponse: '',
      authError: null,
      detailedErrorMessage: `HTTP ${httpStatus} ${httpStatusText || 'Error'} — ${msg}`,
      verifiedWorking: false,
    };
  }

  const reply =
    body?.choices?.[0]?.message?.content ||
    body?.reply ||
    body?.text ||
    (body?.status === 'online' ? body?.message || 'Gateway Online' : '');

  const cleanReply = String(reply || '').trim();
  const isHealthCheck = Boolean(body?.status === 'online' && body?.gateway);

  if (!cleanReply && !isHealthCheck) {
    return {
      connectionStatus: 'REQUEST_ERROR',
      httpStatusCode: httpStatus,
      httpStatusText: httpStatusText || 'OK',
      responseTimeMs: safeLatency,
      modelResponse: '',
      authError: null,
      detailedErrorMessage: 'HTTP 200 received, but model response content was empty.',
      verifiedWorking: false,
    };
  }

  return {
    connectionStatus: 'CONNECTED',
    httpStatusCode: httpStatus,
    httpStatusText: httpStatusText || 'OK',
    responseTimeMs: safeLatency,
    modelResponse: cleanReply,
    authError: null,
    detailedErrorMessage: null,
    verifiedWorking: true,
  };
}
