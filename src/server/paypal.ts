export const PUBLIC_PAYPAL_CLIENT_ID =
  'BAAX2U_UunOALXjCFc5_ByUQ-Z41HINtiJNFrJYiIZImn34v7OtTrwFlPGw7Zrb1oJ4uy5n5KX0Qq73UxU';

export const PAYPAL_PLAN_ID_PRO = 'P-7T529484K52614831NL4C7WQ';
export const PAYPAL_PLAN_ID_ULTIMATE = 'P-41V408833G792383GNL4DSEY';

export interface PayPalSubscriptionDetails {
  subscriptionId: string;
  planId: string;
  tier: 'pro' | 'ultimate' | null;
  status: 'APPROVAL_PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED' | string;
  inTrial: boolean;
  startTimeMs: number | null;
  nextBillingTimeMs: number | null;
  customId: string;
  subscriberEmail: string;
  raw?: any;
}

export function getPayPalApiBase(): string {
  const mode = String(process.env.PAYPAL_MODE || 'live').trim().toLowerCase();
  return mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}

export function getPayPalClientId(): string {
  return String(process.env.PAYPAL_CLIENT_ID || PUBLIC_PAYPAL_CLIENT_ID).trim();
}

export function isPayPalRestConfigured(): boolean {
  return Boolean(String(process.env.PAYPAL_CLIENT_SECRET || '').trim());
}

export function resolveTierFromPayPalPlanId(planId?: string | null): 'pro' | 'ultimate' | null {
  const clean = String(planId || '').trim();
  if (clean === PAYPAL_PLAN_ID_ULTIMATE) return 'ultimate';
  if (clean === PAYPAL_PLAN_ID_PRO) return 'pro';
  return null;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string | null> {
  const clientId = getPayPalClientId();
  const secret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();
  if (!clientId || !secret) return null;

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 30_000 > now) {
    return cachedToken.token;
  }

  const auth = Buffer.from(`${clientId}:${secret}`, 'utf8').toString('base64');
  const res = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`PayPal OAuth failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  const json: any = await res.json();
  if (!json?.access_token) throw new Error('PayPal OAuth response missing access_token');
  cachedToken = {
    token: String(json.access_token),
    expiresAt: now + Math.max(60, Number(json.expires_in) || 3000) * 1000,
  };
  return cachedToken.token;
}

export function detectPayPalTrialActive(subJson: any): boolean {
  const cycles: any[] = Array.isArray(subJson?.billing_info?.cycle_executions)
    ? subJson.billing_info.cycle_executions
    : [];
  const trialCycle = cycles.find((c) => String(c?.tenure_type || '').toUpperCase() === 'TRIAL');
  const regularCycle = cycles.find((c) => String(c?.tenure_type || '').toUpperCase() === 'REGULAR');
  if (trialCycle) {
    const regularCompleted = Number(regularCycle?.cycles_completed || 0);
    const trialRemaining = Number(trialCycle?.cycles_remaining ?? 0);
    const trialTotal = Number(trialCycle?.total_cycles ?? 0);
    if (regularCompleted === 0 && (trialRemaining > 0 || (trialTotal > 0 && Number(trialCycle?.cycles_completed || 0) <= trialTotal))) {
      return true;
    }
  }
  // PayPal Ultimate subscription plan includes 3-day free trial from start_time if within 3 days
  const tier = resolveTierFromPayPalPlanId(subJson?.plan_id);
  if (tier === 'ultimate' && subJson?.start_time) {
    const startMs = Date.parse(subJson.start_time);
    const nextMs = subJson?.billing_info?.next_billing_time ? Date.parse(subJson.billing_info.next_billing_time) : NaN;
    if (!Number.isNaN(startMs) && !Number.isNaN(nextMs)) {
      const spanDays = (nextMs - startMs) / (24 * 3600 * 1000);
      if (spanDays > 0 && spanDays <= 4.5 && Date.now() < nextMs) {
        return true;
      }
    }
  }
  return false;
}

export async function fetchPayPalSubscription(subscriptionId: string): Promise<PayPalSubscriptionDetails> {
  const cleanId = String(subscriptionId || '').trim();
  if (!cleanId) throw new Error('Missing PayPal subscription ID');
  const token = await getPayPalAccessToken();
  if (!token) throw new Error('PAYPAL_CLIENT_SECRET is not configured on the server.');

  const res = await fetch(`${getPayPalApiBase()}/v1/billing/subscriptions/${encodeURIComponent(cleanId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`PayPal subscription lookup failed (${res.status}): ${errText.slice(0, 220)}`);
  }

  const data: any = await res.json();
  const planId = String(data?.plan_id || '').trim();
  const startMs = data?.start_time ? Date.parse(data.start_time) : NaN;
  const nextMs = data?.billing_info?.next_billing_time ? Date.parse(data.billing_info.next_billing_time) : NaN;

  return {
    subscriptionId: String(data?.id || cleanId),
    planId,
    tier: resolveTierFromPayPalPlanId(planId),
    status: String(data?.status || '').toUpperCase(),
    inTrial: detectPayPalTrialActive(data),
    startTimeMs: Number.isFinite(startMs) ? startMs : null,
    nextBillingTimeMs: Number.isFinite(nextMs) ? nextMs : null,
    customId: String(data?.custom_id || '').trim(),
    subscriberEmail: String(data?.subscriber?.email_address || '').trim(),
    raw: data,
  };
}

export async function cancelPayPalSubscription(
  subscriptionId: string,
  reason: string = 'User canceled subscription via Lokizenith Plans'
): Promise<{ ok: boolean; error?: string }> {
  const cleanId = String(subscriptionId || '').trim();
  if (!cleanId) return { ok: false, error: 'Missing PayPal subscription ID.' };
  if (!isPayPalRestConfigured()) {
    return {
      ok: false,
      error: 'Live PayPal credentials (PAYPAL_CLIENT_SECRET) are required to cancel a PayPal subscription.',
    };
  }

  try {
    const token = await getPayPalAccessToken();
    if (!token) {
      return { ok: false, error: 'Unable to authenticate with PayPal REST API.' };
    }
    const res = await fetch(`${getPayPalApiBase()}/v1/billing/subscriptions/${encodeURIComponent(cleanId)}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: reason.slice(0, 125) }),
    });
    if (res.status === 204 || res.ok) return { ok: true };
    const text = await res.text().catch(() => '');
    return { ok: false, error: `PayPal cancel returned ${res.status}: ${text.slice(0, 180)}` };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'PayPal cancel request failed' };
  }
}

export async function verifyPayPalWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  webhookEventBody: any
): Promise<boolean> {
  const webhookId = String(process.env.PAYPAL_WEBHOOK_ID || '').trim();
  // Strict fail-closed verification: never accept unsigned or unconfigured PayPal webhooks
  if (!webhookId || !isPayPalRestConfigured()) {
    return false;
  }

  try {
    const token = await getPayPalAccessToken();
    if (!token) return false;
    const h = (k: string) => {
      const val = headers[k] ?? headers[k.toLowerCase()];
      return Array.isArray(val) ? val[0] : String(val || '');
    };
    const payload = {
      auth_algo: h('paypal-auth-algo'),
      cert_url: h('paypal-cert-url'),
      transmission_id: h('paypal-transmission-id'),
      transmission_sig: h('paypal-transmission-sig'),
      transmission_time: h('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: webhookEventBody,
    };
    if (!payload.transmission_id || !payload.transmission_sig) return false;
    const res = await fetch(`${getPayPalApiBase()}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    const json: any = await res.json();
    return String(json?.verification_status || '').toUpperCase() === 'SUCCESS';
  } catch {
    return false;
  }
}
