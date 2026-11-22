import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reconcileConversationMessages,
  shouldAllowSyncRerender,
  hasRenderableMessagePayload,
} from './messagePersistenceGuard';

test('reconcileConversationMessages never drops a completed local AI reply when stale sync omits it', () => {
  const local = [
    { id: 'u1', role: 'user', content: 'Explain black holes', ts: 1000 },
    { id: 'b1', role: 'assistant', content: 'A black hole is a region of spacetime...', ts: 1500 },
  ];
  // Stale server snapshot sent before b1 finished
  const staleServer = [
    { id: 'u1', role: 'user', content: 'Explain black holes', ts: 1000 },
  ];

  const merged = reconcileConversationMessages(local, staleServer);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].id, 'b1');
  assert.match(merged[1].content || '', /spacetime/);
});

test('reconcileConversationMessages preserves recently completed message from session cache even if local was wiped', () => {
  const staleServer = [{ id: 'u1', role: 'user', content: 'Hi', ts: 1000 }];
  const cache = new Map([
    ['b2', { id: 'b2', role: 'assistant', content: 'Hello! How can I help?', ts: 1200 }],
  ]);
  const merged = reconcileConversationMessages([], staleServer, cache);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].id, 'b2');
  assert.equal(merged[1].content, 'Hello! How can I help?');
});

test('reconcileConversationMessages keeps rich non-text replies (gamePicker, candyButton, images)', () => {
  assert.equal(hasRenderableMessagePayload({ id: 'g1', role: 'assistant', gamePicker: true }), true);
  assert.equal(hasRenderableMessagePayload({ id: 'c1', role: 'assistant', candyButton: true }), true);
  assert.equal(hasRenderableMessagePayload({ id: 'p1', role: 'assistant', pending: true, content: '' }), false);
});

test('shouldAllowSyncRerender blocks DOM re-render during busy, active turns, 8s cooldown, or shrinking message count', () => {
  assert.equal(
    shouldAllowSyncRerender({
      busy: true,
      activeTurnsCount: 1,
      lastTurnFinishedAt: 0,
      now: 50000,
      domCompletedCount: 2,
      mergedCompletedCount: 3,
      hasNewRemoteMessage: true,
      hadPrevConv: true,
    }),
    false
  );

  // Within 8 seconds of finishing an AI answer -> MUST NOT wipe DOM
  assert.equal(
    shouldAllowSyncRerender({
      busy: false,
      activeTurnsCount: 0,
      lastTurnFinishedAt: 45000,
      now: 50000,
      domCompletedCount: 2,
      mergedCompletedCount: 2,
      hasNewRemoteMessage: true,
      hadPrevConv: true,
    }),
    false
  );

  // Shrinking message count -> MUST NEVER wipe DOM
  assert.equal(
    shouldAllowSyncRerender({
      busy: false,
      activeTurnsCount: 0,
      lastTurnFinishedAt: 1000,
      now: 50000,
      domCompletedCount: 4,
      mergedCompletedCount: 3,
      hasNewRemoteMessage: true,
      hadPrevConv: true,
    }),
    false
  );

  // Genuine new message from another device after cooldown -> ALLOWED
  assert.equal(
    shouldAllowSyncRerender({
      busy: false,
      activeTurnsCount: 0,
      lastTurnFinishedAt: 1000,
      now: 50000,
      domCompletedCount: 2,
      mergedCompletedCount: 3,
      hasNewRemoteMessage: true,
      hadPrevConv: true,
    }),
    true
  );
});
