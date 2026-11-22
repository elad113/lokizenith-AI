import crypto from 'crypto';

export const GUEST_TOKEN_LIMIT = 7500;

export type AnswerLengthMode = 'short' | 'medium' | 'detailed' | 'long';

export interface GuestQuotaState {
  guest: true;
  limit: number;
  used: number;
  remaining: number;
}

const guestUsageByKey = new Map<string, { used: number; updatedAt: number }>();

export function normalizeAnswerLength(raw: unknown): AnswerLengthMode {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'short' || v === 'brief' || v === 'concise') return 'short';
  if (v === 'detailed' || v === 'detail') return 'detailed';
  if (v === 'long' || v === 'extensive' || v === 'deep') return 'long';
  return 'medium';
}

export function buildAnswerLengthInstruction(raw: unknown): string {
  const mode = normalizeAnswerLength(raw);
  switch (mode) {
    case 'short':
      return 'ANSWER LENGTH: SHORT. Keep the response ultra-concise (1 to 3 crisp sentences or a tiny high-signal list). No filler or repetition.';
    case 'detailed':
      return 'ANSWER LENGTH: DETAILED. Provide a thorough, well-structured explanation with context, nuance, clear headings, and worked examples where helpful.';
    case 'long':
      return 'ANSWER LENGTH: LONG. Provide a comprehensive, in-depth guide covering background, step-by-step details, concrete examples, edge cases, comparisons, and a clear conclusion.';
    case 'medium':
    default:
      return 'ANSWER LENGTH: MEDIUM. Give a balanced, clear, well-paced answer covering the key points with helpful detail without unnecessary bloat.';
  }
}

export function getGuestQuota(key: string): GuestQuotaState {
  const cleanKey = String(key || 'anon').trim() || 'anon';
  const entry = guestUsageByKey.get(cleanKey);
  const used = entry ? Math.min(GUEST_TOKEN_LIMIT, Math.max(0, Math.floor(entry.used))) : 0;
  return {
    guest: true,
    limit: GUEST_TOKEN_LIMIT,
    used,
    remaining: Math.max(0, GUEST_TOKEN_LIMIT - used),
  };
}

export function consumeGuestQuota(key: string, amount: number): GuestQuotaState {
  const cleanKey = String(key || 'anon').trim() || 'anon';
  const add = Math.max(1, Math.floor(Number(amount) || 0));
  const cur = guestUsageByKey.get(cleanKey) || { used: 0, updatedAt: Date.now() };
  cur.used = Math.min(GUEST_TOKEN_LIMIT, cur.used + add);
  cur.updatedAt = Date.now();
  guestUsageByKey.set(cleanKey, cur);
  if (guestUsageByKey.size > 5000) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [k, v] of guestUsageByKey.entries()) {
      if (v.updatedAt < cutoff) guestUsageByKey.delete(k);
    }
  }
  return getGuestQuota(cleanKey);
}

export function resetGuestQuotaForTest(key?: string): void {
  if (key) guestUsageByKey.delete(key);
  else guestUsageByKey.clear();
}

export function isSafePublicHttpUrl(rawUrl: string): boolean {
  try {
    const u = new URL(String(rawUrl || '').trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (
      !host ||
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === 'metadata.google.internal' ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function createTicketId(): string {
  return 'tkt_' + crypto.randomBytes(12).toString('hex');
}
