import React, { useState } from 'react';
import { CustomUICard, VaultCard, VaultTransactionReceipt } from './types';

interface GenerativeCardProps {
  card: CustomUICard;
  vaultCards: VaultCard[];
  isDark: boolean;
  onUpdateCard: (updated: CustomUICard) => void;
  onOrderViaVault: (
    card: CustomUICard,
    selectedItems: Array<{ name: string; qty: number; price: number }>,
    merchant: string
  ) => void;
  onRunInLinuxVm?: (code: string, title: string) => void;
}

export const GenerativeCard: React.FC<GenerativeCardProps> = ({
  card,
  vaultCards,
  isDark,
  onUpdateCard,
  onOrderViaVault,
  onRunInLinuxVm,
}) => {
  const [inspectCode, setInspectCode] = useState(false);
  // Mini-app interactive state
  const [sprintMinutes, setSprintMinutes] = useState(25);
  const [sprintRunning, setSprintRunning] = useState(false);
  const [calcPrincipal, setCalcPrincipal] = useState(1200);
  const [calcRate, setCalcRate] = useState(12);
  const [shaderHue, setShaderHue] = useState(168);

  const linkedVault =
    vaultCards.find((v) => v.id === card.vaultCardId) || vaultCards[0];
  const autoBuyLimit = linkedVault?.maxSinglePurchase ?? 80;

  const surfaceCls = isDark
    ? 'bg-[#161619] border-[#26262B] text-[#F5F5F7]'
    : 'bg-white border-[#E5E4DF] text-[#141413]';
  const mutedCls = isDark ? 'text-[#8E8D94]' : 'text-[#6E6D68]';
  const rowBgCls = isDark
    ? 'bg-[#1C1C21] border-[#2A2A30]'
    : 'bg-[#FAF9F6] border-[#E5E4DF]';

  const handleTogglePin = () => {
    onUpdateCard({ ...card, pinnedToBoard: !card.pinnedToBoard });
  };

  // 1. SHOPPING & PRICE COMPARISON CARD
  if (card.category === 'shopping' && card.shoppingRows) {
    const rows = card.shoppingRows;
    const selectedRows = rows.filter((r) => r.checked);
    const total = Number(
      selectedRows.reduce((sum, r) => sum + r.unitPrice * r.qty, 0).toFixed(2)
    );
    const isWithinLimit = total <= autoBuyLimit && total > 0;

    const toggleRow = (rowId: string) => {
      const nextRows = rows.map((r) =>
        r.id === rowId ? { ...r, checked: !r.checked } : r
      );
      onUpdateCard({ ...card, shoppingRows: nextRows });
    };

    const stepQty = (rowId: string, delta: number) => {
      const nextRows = rows.map((r) =>
        r.id === rowId ? { ...r, qty: Math.max(1, Math.min(20, r.qty + delta)) } : r
      );
      onUpdateCard({ ...card, shoppingRows: nextRows });
    };

    return (
      <div
        className={`mt-2.5 rounded-2xl border p-4 transition-colors ${surfaceCls}`}
        data-testid={`generative-card-${card.id}`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-xs font-medium text-emerald-400 mb-0.5">
              Interactive Shopping Card · Grok 4.7
            </div>
            <h4 className="text-sm font-semibold">{card.title}</h4>
            <p className={`text-xs ${mutedCls}`}>{card.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleTogglePin}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              card.pinnedToBoard
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                : 'bg-zinc-100 border-zinc-300 text-zinc-700'
            }`}
          >
            {card.pinnedToBoard ? '★ Pinned to Board' : '☆ Pin to Board'}
          </button>
        </div>

        <div className="space-y-2 mb-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl border ${rowBgCls}`}
            >
              <label className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={row.checked}
                  onChange={() => toggleRow(row.id)}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{row.name}</div>
                  <div className={`text-[11px] ${mutedCls}`}>
                    {row.store} · {row.tag}
                  </div>
                </div>
              </label>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center border border-zinc-700/50 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    aria-label={`Decrease quantity for ${row.name}`}
                    onClick={() => stepQty(row.id, -1)}
                    className="px-2 py-0.5 text-xs hover:bg-zinc-700/40 transition-colors"
                  >
                    −
                  </button>
                  <span className="px-2 text-xs font-mono tabular-nums">
                    {row.qty}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase quantity for ${row.name}`}
                    onClick={() => stepQty(row.id, 1)}
                    className="px-2 py-0.5 text-xs hover:bg-zinc-700/40 transition-colors"
                  >
                    +
                  </button>
                </div>
                <div className="w-16 text-right text-xs font-mono font-semibold tabular-nums">
                  ${(row.unitPrice * row.qty).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/60">
          <div>
            <div className="text-xs font-mono tabular-nums">
              Total:{' '}
              <span className="text-sm font-bold">${total.toFixed(2)}</span>{' '}
              <span className={mutedCls}>
                ({selectedRows.length} items · {linkedVault?.nickname || 'Vault'} ••••{' '}
                {linkedVault?.last4 || '4829'})
              </span>
            </div>
            <div
              className={`text-[11px] font-medium ${
                total === 0
                  ? mutedCls
                  : isWithinLimit
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {total === 0
                ? 'Select at least 1 item to order'
                : isWithinLimit
                ? `✓ Within $${autoBuyLimit.toFixed(2)} Pre-Agreed Auto-Buy Guardrail`
                : `⚠ Exceeds $${autoBuyLimit.toFixed(2)} Auto-Buy Limit · Will request 1-click Vault Approval`}
            </div>
          </div>

          <button
            type="button"
            disabled={selectedRows.length === 0}
            onClick={() =>
              onOrderViaVault(
                card,
                selectedRows.map((r) => ({
                  name: r.name,
                  qty: r.qty,
                  price: r.unitPrice,
                })),
                selectedRows[0]?.store || 'Amazon Fresh'
              )
            }
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Order via Vault (${total.toFixed(2)})
          </button>
        </div>
      </div>
    );
  }

  // 2. LIVE DASHBOARD & TRACKER CARD
  if (card.category === 'tracker' && card.trackerRows) {
    const rows = card.trackerRows;

    const bumpTracker = (rowId: string) => {
      const next = rows.map((r) => {
        if (r.id !== rowId) return r;
        const inc = r.unit === '$' ? 5 : 1;
        const nextVal = Math.min(r.target, Number((r.current + inc).toFixed(2)));
        return { ...r, current: nextVal, done: nextVal >= r.target };
      });
      onUpdateCard({ ...card, trackerRows: next });
    };

    const votePoll = (optId: string) => {
      if (!card.pollOptions) return;
      const nextOpts = card.pollOptions.map((o) =>
        o.id === optId ? { ...o, votes: o.votes + 1 } : o
      );
      onUpdateCard({ ...card, pollOptions: nextOpts });
    };

    return (
      <div
        className={`mt-2.5 rounded-2xl border p-4 transition-colors ${surfaceCls}`}
        data-testid={`generative-card-${card.id}`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-xs font-medium text-violet-400 mb-0.5">
              Live Tracker & Decision Card · Grok 4.7
            </div>
            <h4 className="text-sm font-semibold">{card.title}</h4>
            <p className={`text-xs ${mutedCls}`}>{card.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleTogglePin}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              card.pinnedToBoard
                ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                : isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                : 'bg-zinc-100 border-zinc-300 text-zinc-700'
            }`}
          >
            {card.pinnedToBoard ? '★ Pinned' : '☆ Pin'}
          </button>
        </div>

        <div className="space-y-2.5 mb-3">
          {rows.map((r) => {
            const pct = Math.min(100, Math.round((r.current / Math.max(1, r.target)) * 100));
            return (
              <div key={r.id} className={`p-3 rounded-xl border ${rowBgCls}`}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium">{r.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums">
                      {r.unit === '$' ? `$${r.current}` : r.current} /{' '}
                      {r.unit === '$' ? `$${r.target}` : `${r.target} ${r.unit}`} ({pct}%)
                    </span>
                    <button
                      type="button"
                      onClick={() => bumpTracker(r.id)}
                      className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 text-[11px] font-medium"
                    >
                      + Step
                    </button>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all duration-200"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {card.pollQuestion && card.pollOptions && (
          <div className="pt-3 border-t border-zinc-800/60">
            <div className="text-xs font-medium mb-2">{card.pollQuestion}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {card.pollOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => votePoll(opt.id)}
                  className={`px-3 py-2 rounded-xl border text-left text-xs transition-colors cursor-pointer ${rowBgCls} hover:border-violet-500/50`}
                >
                  <div className="font-medium truncate">{opt.label}</div>
                  <div className={`text-[11px] font-mono tabular-nums mt-0.5 ${mutedCls}`}>
                    {opt.votes} votes · Click to vote
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. CUSTOM CODE / UI MINI-APP CARD
  const compoundResult = Number(
    (calcPrincipal * Math.pow(1 + calcRate / 100, 3)).toFixed(2)
  );

  return (
    <div
      className={`mt-2.5 rounded-2xl border p-4 transition-colors ${surfaceCls}`}
      data-testid={`generative-card-${card.id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-xs font-medium text-teal-400 mb-0.5">
            Interactive Grok 4.7 Mini-App
          </div>
          <h4 className="text-sm font-semibold">{card.title}</h4>
          <p className={`text-xs ${mutedCls}`}>{card.subtitle}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setInspectCode((v) => !v)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-zinc-700 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700 transition-colors whitespace-nowrap"
          >
            {inspectCode ? 'Hide Code' : 'Inspect Code'}
          </button>
          <button
            type="button"
            onClick={handleTogglePin}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              card.pinnedToBoard
                ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300'
            }`}
          >
            {card.pinnedToBoard ? '★ Pinned' : '☆ Pin'}
          </button>
        </div>
      </div>

      {card.miniAppType === 'roi-calc' ? (
        <div className={`p-3.5 rounded-xl border ${rowBgCls} space-y-3`}>
          <div className="flex items-center justify-between text-xs">
            <span>Initial Capital: ${calcPrincipal}</span>
            <input
              type="range"
              min={100}
              max={10000}
              step={100}
              value={calcPrincipal}
              onChange={(e) => setCalcPrincipal(Number(e.target.value))}
              className="w-36 accent-teal-500"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Annual Yield: {calcRate}%</span>
            <input
              type="range"
              min={2}
              max={30}
              step={1}
              value={calcRate}
              onChange={(e) => setCalcRate(Number(e.target.value))}
              className="w-36 accent-teal-500"
            />
          </div>
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
            <span className={mutedCls}>3-Year Projected Value:</span>
            <span className="text-sm font-mono font-bold text-teal-400 tabular-nums">
              ${compoundResult.toLocaleString()}
            </span>
          </div>
        </div>
      ) : (
        <div className={`p-3.5 rounded-xl border ${rowBgCls}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium">
                Cursor Cloud Linux VM · Sprint & Rate-Limit Controller
              </div>
              <div className={`text-[11px] font-mono tabular-nums ${mutedCls}`}>
                Focus Timer: {sprintMinutes}:00 · Status:{' '}
                <span className={sprintRunning ? 'text-emerald-400' : 'text-zinc-400'}>
                  {sprintRunning ? 'Running Active Pass' : 'Ready'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSprintMinutes((m) => (m === 25 ? 50 : 25))}
                className="px-2.5 py-1 rounded-lg text-xs border border-zinc-700 hover:bg-zinc-800"
              >
                {sprintMinutes}m
              </button>
              <button
                type="button"
                onClick={() => setSprintRunning((r) => !r)}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-teal-500 text-zinc-950 hover:bg-teal-400"
              >
                {sprintRunning ? 'Pause Sprint' : 'Start Sprint'}
              </button>
              {onRunInLinuxVm && (
                <button
                  type="button"
                  onClick={() =>
                    onRunInLinuxVm(
                      card.codeSnippet || 'console.log("Grok 4.7 Mini-App Verified");',
                      card.title
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-xs border border-teal-500/40 text-teal-300 hover:bg-teal-500/10"
                >
                  Run in VM
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between gap-3 text-xs">
            <span className={mutedCls}>Interactive Accent Hue ({shaderHue}°):</span>
            <input
              type="range"
              min={0}
              max={360}
              value={shaderHue}
              onChange={(e) => setShaderHue(Number(e.target.value))}
              className="w-32 accent-teal-400"
            />
            <span
              className="w-6 h-4 rounded border border-white/20 shrink-0"
              style={{ background: `hsl(${shaderHue}, 82%, 52%)` }}
            />
          </div>
        </div>
      )}

      {inspectCode && (
        <pre className="mt-3 p-3 rounded-xl bg-zinc-950 text-zinc-200 text-xs font-mono overflow-x-auto border border-zinc-800">
          <code>{card.codeSnippet}</code>
        </pre>
      )}
    </div>
  );
};

interface VaultReceiptCardProps {
  receipt: VaultTransactionReceipt;
  isDark: boolean;
  onApproveOverride: (receiptId: string) => void;
  onDeclineOverride: (receiptId: string) => void;
}

export const VaultReceiptCard: React.FC<VaultReceiptCardProps> = ({
  receipt,
  isDark,
  onApproveOverride,
  onDeclineOverride,
}) => {
  const isCompleted = receipt.status === 'completed';
  const isPending = receipt.status === 'needs_approval';

  return (
    <div
      className={`mt-2.5 rounded-2xl border p-4 ${
        isCompleted
          ? isDark
            ? 'bg-emerald-950/20 border-emerald-500/40 text-zinc-100'
            : 'bg-emerald-50 border-emerald-300 text-zinc-900'
          : isPending
          ? isDark
            ? 'bg-amber-950/25 border-amber-500/50 text-zinc-100'
            : 'bg-amber-50 border-amber-300 text-zinc-900'
          : 'bg-rose-950/20 border-rose-500/40 text-zinc-200'
      }`}
      data-testid={`vault-receipt-${receipt.id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div>
          <div className="text-xs font-semibold">
            {isCompleted
              ? '✓ Secure Vault Order Completed'
              : isPending
              ? '⚠ Vault Authorization Required (Exceeds Pre-Agreed Rule)'
              : '✕ Vault Order Declined'}
          </div>
          <div className="text-xs opacity-80">
            Card: {receipt.cardNickname} (•••• {receipt.cardLast4}) · Merchant:{' '}
            {receipt.merchant}
          </div>
        </div>
        <div className="text-sm font-mono font-bold tabular-nums">
          ${receipt.total.toFixed(2)}
        </div>
      </div>

      <div className="space-y-1 text-xs mb-2.5 border-t border-b border-white/10 py-2">
        {receipt.items.map((it, idx) => (
          <div key={idx} className="flex items-center justify-between font-mono tabular-nums">
            <span>
              {it.qty}× {it.name}
            </span>
            <span>${(it.price * it.qty).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {receipt.reason && (
        <div className="text-[11px] opacity-85 mb-2.5">{receipt.reason}</div>
      )}

      {isPending && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onApproveOverride(receipt.id)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors cursor-pointer"
          >
            Approve 1-Click Override (${receipt.total.toFixed(2)})
          </button>
          <button
            type="button"
            onClick={() => onDeclineOverride(receipt.id)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-600 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
};
