/**
 * Pure anti-disappear reconciliation logic for Lokizenith AI chat conversations.
 * Guarantees that a completed AI assistant reply is NEVER dropped or wiped by a
 * stale server sync response, clock skew, or overlapping async IndexedDB write.
 */

export interface ChatMsgLike {
  id?: string;
  role?: string;
  content?: string;
  text?: string;
  ts?: number;
  pending?: boolean;
  bg?: boolean;
  error?: string;
  images?: any[];
  video?: any;
  widget?: any;
  cards?: any[];
  files?: any[];
  candyButton?: boolean;
  gamePicker?: boolean;
  upgradePlanCard?: any;
}

export interface ChatConvLike {
  id: string;
  title?: string;
  updated?: number;
  created?: number;
  messages: ChatMsgLike[];
}

export function hasRenderableMessagePayload(m: ChatMsgLike | null | undefined): boolean {
  if (!m || typeof m !== 'object') return false;
  if (typeof m.content === 'string' && m.content.trim().length > 0) return true;
  if (typeof m.text === 'string' && m.text.trim().length > 0) return true;
  if (m.error) return true;
  if (Array.isArray(m.images) && m.images.length > 0) return true;
  if (m.video || m.widget || m.candyButton || m.gamePicker || m.upgradePlanCard) return true;
  if (Array.isArray(m.cards) && m.cards.length > 0) return true;
  if (Array.isArray(m.files) && m.files.length > 0) return true;
  return false;
}

/**
 * Reconciles local + incoming messages for a conversation without ever losing
 * any completed local or session-cached AI reply.
 */
export function reconcileConversationMessages(
  localMsgs: ChatMsgLike[],
  incomingMsgs: ChatMsgLike[],
  completedCache: Map<string, ChatMsgLike> = new Map()
): ChatMsgLike[] {
  const seen = new Map<string, ChatMsgLike>();

  const absorb = (list: ChatMsgLike[], preferNonBg: boolean) => {
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m || typeof m !== 'object') continue;
      // Keep any non-pending message OR any message that already carries renderable payload
      if (m.pending && !hasRenderableMessagePayload(m)) continue;
      const key = m.id
        ? `id:${m.id}`
        : `ts:${m.role || ''}:${m.ts || i}:${String(m.content ?? m.text ?? '').slice(0, 60)}`;
      const prev = seen.get(key);
      if (!prev) {
        seen.set(key, m);
        continue;
      }
      if (preferNonBg && m.bg && !prev.bg) continue;
      const prevLen = String(prev.content ?? prev.text ?? '').length;
      const nextLen = String(m.content ?? m.text ?? '').length;
      const prevHasRich = hasRenderableMessagePayload(prev);
      const nextHasRich = hasRenderableMessagePayload(m);
      if ((prev.bg && !m.bg) || (nextHasRich && !prevHasRich) || nextLen > prevLen || (!m.pending && prev.pending)) {
        seen.set(key, { ...prev, ...m, pending: false });
      }
    }
  };

  absorb(Array.isArray(localMsgs) ? localMsgs : [], true);
  absorb(Array.isArray(incomingMsgs) ? incomingMsgs : [], true);

  // Restore any recently completed session message that belongs to this conversation
  for (const [id, cached] of completedCache.entries()) {
    const key = `id:${id}`;
    const cur = seen.get(key);
    if (!cur && hasRenderableMessagePayload(cached)) {
      seen.set(key, cached);
    } else if (cur && cur.pending && !cached.pending) {
      seen.set(key, { ...cur, ...cached, pending: false });
    }
  }

  return Array.from(seen.values()).sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
}

/**
 * Decides whether a background server sync is allowed to trigger a full DOM re-render
 * of #messages. Strictly blocks re-renders during active streaming, within the post-turn
 * protection window, or whenever the incoming snapshot has fewer completed messages than
 * the currently rendered DOM.
 */
export function shouldAllowSyncRerender(params: {
  busy: boolean;
  activeTurnsCount: number;
  lastTurnFinishedAt: number;
  now: number;
  domCompletedCount: number;
  mergedCompletedCount: number;
  hasNewRemoteMessage: boolean;
  hadPrevConv: boolean;
}): boolean {
  if (params.busy) return false;
  if (params.activeTurnsCount > 0) return false;
  if (params.now - params.lastTurnFinishedAt < 8000) return false;
  if (params.mergedCompletedCount < params.domCompletedCount) return false;
  return params.hasNewRemoteMessage || !params.hadPrevConv;
}
