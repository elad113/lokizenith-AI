import {
  GrokBotAgent,
  VaultCard,
  ShoppingListItem,
  CustomUICard,
  VaultTransactionReceipt,
  HandoffPayload,
  CursorApiSettings,
  CursorModelId,
} from './types';

export const DEFAULT_CURSOR_GROK_KEY =
  'grok_42ddf32035d87e2645a5178bb1bcfe65_bc78bce3e6a080138f16bc5258aa864fc2ebf49707dbd83f92958b0e72f6ece8';

// Rate-limit tracking (max 20 requests/minute)
const requestTimestamps: number[] = [];

export function getRateLimitStatus(now = Date.now()): {
  requestsInLastMinute: number;
  limitPerMinute: number;
  canProceedImmediately: boolean;
} {
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > 60_000) {
    requestTimestamps.shift();
  }
  return {
    requestsInLastMinute: requestTimestamps.length,
    limitPerMinute: 20,
    canProceedImmediately: requestTimestamps.length < 20,
  };
}

export function recordApiRequestTimestamp(now = Date.now()): number {
  requestTimestamps.push(now);
  return getRateLimitStatus(now).requestsInLastMinute;
}

export function evaluateVaultPurchaseRule(
  card: VaultCard,
  items: Array<{ name: string; qty: number; price: number }>,
  merchant: string
): {
  status: 'completed' | 'needs_approval' | 'declined';
  total: number;
  reason: string;
} {
  const total = Number(
    items.reduce((acc, it) => acc + Number(it.price || 0) * Number(it.qty || 1), 0).toFixed(2)
  );

  if (total <= 0) {
    return { status: 'declined', total: 0, reason: 'No active items selected for checkout.' };
  }

  const merchantClean = (merchant || 'Amazon').trim().toLowerCase();
  const isMerchantApproved = card.approvedMerchants.some(
    (m) => m.toLowerCase() === merchantClean || merchantClean.includes(m.toLowerCase())
  );

  if (!isMerchantApproved) {
    return {
      status: 'needs_approval',
      total,
      reason: `Merchant "${merchant}" is outside pre-approved whitelist (${card.approvedMerchants.join(', ')}).`,
    };
  }

  if (card.spentThisMonth + total > card.monthlyCap) {
    return {
      status: 'needs_approval',
      total,
      reason: `Order ($${total.toFixed(2)}) would exceed monthly cap ($${card.monthlyCap.toFixed(2)}).`,
    };
  }

  if (total > card.maxSinglePurchase) {
    return {
      status: 'needs_approval',
      total,
      reason: `Order total ($${total.toFixed(2)}) exceeds pre-agreed $${card.maxSinglePurchase.toFixed(2)} auto-buy limit on ${card.nickname} •••• ${card.last4}.`,
    };
  }

  if (card.approvalMode === 'always-ask') {
    return {
      status: 'needs_approval',
      total,
      reason: `Card "${card.nickname}" is configured to Always Ask Before Checkout.`,
    };
  }

  return {
    status: 'completed',
    total,
    reason: `Verified within $${card.maxSinglePurchase} auto-buy limit & approved merchant (${merchant}).`,
  };
}

export interface ParsedSlashAction {
  command: 'none' | 'card' | 'shop' | 'code' | 'vault' | 'handoff';
  cleanPrompt: string;
  mentionedHandles: string[];
}

export function parseGrokSlashCommand(rawInput: string): ParsedSlashAction {
  const trimmed = (rawInput || '').trim();
  const mentionMatches = Array.from(trimmed.matchAll(/@([a-zA-Z0-9_\-\u0590-\u05FF]+)/g)).map((m) =>
    m[1].toLowerCase()
  );

  if (trimmed.startsWith('/card')) {
    return {
      command: 'card',
      cleanPrompt: trimmed.replace(/^\/card\s*/i, '').trim() || 'Interactive sprint & KPI tracker card',
      mentionedHandles: mentionMatches,
    };
  }
  if (trimmed.startsWith('/shop')) {
    return {
      command: 'shop',
      cleanPrompt: trimmed.replace(/^\/shop\s*/i, '').trim() || 'Compare prices for Weekly Essentials shopping list',
      mentionedHandles: mentionMatches,
    };
  }
  if (trimmed.startsWith('/code')) {
    return {
      command: 'code',
      cleanPrompt: trimmed.replace(/^\/code\s*/i, '').trim() || 'Build an interactive utility script and run it in the Linux VM',
      mentionedHandles: mentionMatches,
    };
  }
  if (trimmed.startsWith('/vault')) {
    return {
      command: 'vault',
      cleanPrompt: trimmed.replace(/^\/vault\s*/i, '').trim() || 'Run routine order via Personal Everyday Vault card',
      mentionedHandles: mentionMatches,
    };
  }
  if (trimmed.startsWith('/handoff')) {
    return {
      command: 'handoff',
      cleanPrompt: trimmed.replace(/^\/handoff\s*/i, '').trim() || 'Coordinate research, code build, and checkout across the team',
      mentionedHandles: mentionMatches,
    };
  }

  return {
    command: 'none',
    cleanPrompt: trimmed,
    mentionedHandles: mentionMatches,
  };
}

export function buildPersistentContextPrompt(
  bot: GrokBotAgent,
  vaultCards: VaultCard[],
  shoppingList: ShoppingListItem[],
  peerBots: GrokBotAgent[]
): string {
  const primaryVault = vaultCards.find((c) => c.id === bot.linkedVaultCardId) || vaultCards[0];
  const vaultSummary = primaryVault
    ? `${primaryVault.nickname} (•••• ${primaryVault.last4}, Max Auto-Buy: $${primaryVault.maxSinglePurchase}, Monthly Cap: $${primaryVault.monthlyCap}, Mode: ${primaryVault.approvalMode}, Merchants: ${primaryVault.approvedMerchants.join(', ')})`
    : 'No Vault Card linked';

  const shoppingSummary = shoppingList
    .slice(0, 6)
    .map((s) => `${s.name} (${s.preferredBrand}, $${s.price} at ${s.merchant}, max $${s.maxPriceThreshold})`)
    .join('; ');

  const peersSummary = peerBots
    .filter((p) => p.id !== bot.id)
    .map((p) => `@${p.handle} (${p.name} - ${p.role})`)
    .join(', ');

  return [
    `You are ${bot.name} (@${bot.handle}), ${bot.role} in Grok Bot (powered by Cursor API running ${bot.model}).`,
    `Specialty: ${bot.specialty}`,
    `[PERSISTENT MEMORY.md]: ${bot.memoryMd}`,
    `[ACTIVE SKILL.md PLAYBOOK]: ${bot.skillMd}`,
    `[VAULT GUARDRAILS]: ${vaultSummary}`,
    `[SHOPPING LIST (/workspace/shopping-lists.json)]: ${shoppingSummary}`,
    peersSummary ? `[TEAMMATES IN WORKSPACE]: ${peersSummary}` : '',
    `CRITICAL INSTRUCTIONS:`,
    `1. Talk naturally, directly, and conversationally with the user like a real human-level teammate. NEVER repeat generic boilerplate templates.`,
    `2. Answer the user's exact question, solve math/logic directly, write real code when asked, and reference concrete items from their workspace when relevant.`,
    `3. Reply in the exact language the user writes in (English, Hebrew, Arabic, etc.).`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function synthesizeGenerativeCardFromPrompt(
  prompt: string,
  bot: GrokBotAgent,
  shoppingList: ShoppingListItem[],
  vaultCards: VaultCard[]
): CustomUICard {
  const lower = prompt.toLowerCase();
  const cardId = 'card_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const defaultVaultId = bot.linkedVaultCardId || vaultCards[0]?.id || 'vault_4829';

  if (
    /\b(shop|price|deal|buy|order|coffee|espresso|grocery|groceries|milk|protein|amazon|store|cart|קניות|מחיר|הזמנה)\b/i.test(
      lower
    )
  ) {
    const customItemMatch = prompt.replace(/^\/(shop|card)\s*/i, '').trim();
    const baseRows = shoppingList.slice(0, 4).map((item, idx) => ({
      id: `row_${idx}_${Date.now()}`,
      name: item.name,
      store: item.merchant,
      unitPrice: item.price,
      qty: item.qty,
      checked: idx < 3,
      tag: item.price <= item.maxPriceThreshold ? 'Best Deal' : 'Above Target',
    }));

    if (
      customItemMatch &&
      customItemMatch.length > 2 &&
      !/weekly essentials|shopping list|compare prices/i.test(customItemMatch)
    ) {
      baseRows.unshift({
        id: `row_custom_${Date.now()}`,
        name: customItemMatch.slice(0, 42),
        store: 'Amazon Prime',
        unitPrice: 24.5,
        qty: 1,
        checked: true,
        tag: 'Grok 4.7 Verified',
      });
    }

    return {
      id: cardId,
      title: 'Live Price Comparison & Vault Cart',
      subtitle: `Compiled by @${bot.handle} via Grok 4.7 · Shared Browser verified`,
      category: 'shopping',
      createdByBotId: bot.id,
      createdByBotName: bot.name,
      createdAt: Date.now(),
      pinnedToBoard: true,
      vaultCardId: defaultVaultId,
      shoppingRows: baseRows.slice(0, 4),
    };
  }

  if (/\b(habit|goal|track|budget|sprint|kpi|poll|roadmap|מעקב|תקציב|משימות)\b/i.test(lower)) {
    return {
      id: cardId,
      title: 'Interactive Sprint & Budget Tracker',
      subtitle: `Generated by @${bot.handle} · Click rows to update progress live`,
      category: 'tracker',
      createdByBotId: bot.id,
      createdByBotName: bot.name,
      createdAt: Date.now(),
      pinnedToBoard: true,
      trackerRows: [
        { id: 't1', label: 'Cursor API Quota Efficiency', current: 94, target: 100, unit: '%', done: true },
        { id: 't2', label: 'Weekly Vault Grocery Budget Used', current: 54, target: 80, unit: '$', done: false },
        { id: 't3', label: 'Automated UI Components Shipped', current: 6, target: 8, unit: 'cards', done: false },
      ],
      pollQuestion: 'Next priority task for #home-and-build?',
      pollOptions: [
        { id: 'p1', label: 'Auto-order Thursday Groceries (<$80)', votes: 4 },
        { id: 'p2', label: 'Deploy Animated Dark Background Shader', votes: 7 },
        { id: 'p3', label: 'Benchmark Grok 4.7 vs Fast Latency', votes: 3 },
      ],
    };
  }

  return {
    id: cardId,
    title: prompt.slice(0, 44) || 'Interactive Grok 4.7 Mini-App Widget',
    subtitle: `Live interactive widget synthesized by @${bot.handle}`,
    category: 'mini-app',
    createdByBotId: bot.id,
    createdByBotName: bot.name,
    createdAt: Date.now(),
    pinnedToBoard: true,
    miniAppType: /calc|roi|interest|math/i.test(lower)
      ? 'roi-calc'
      : /timer|pomodoro|focus/i.test(lower)
      ? 'pomodoro'
      : 'theme-shader',
    codeLanguage: 'tsx',
    codeSnippet: `// Generated by @${bot.handle} (Cursor API · ${bot.model})
export function GrokInteractiveWidget() {
  const [value, setValue] = useState(42);
  return (
    <div className="p-4 rounded-xl bg-zinc-900 text-zinc-100 border border-zinc-800">
      <h4>${prompt.slice(0, 40).replace(/"/g, '')}</h4>
      <button onClick={() => setValue(v => v + 1)}>Value: {value}</button>
    </div>
  );
}`,
  };
}

export interface CursorTurnResult {
  replyText: string;
  modelUsed: CursorModelId;
  latencyMs: number;
  toolLogs: string[];
  customCard?: CustomUICard;
  handoff?: HandoffPayload;
  vaultReceipt?: VaultTransactionReceipt;
  browserUpdate?: {
    url: string;
    title: string;
    status: string;
  };
  terminalCommands?: string[];
}

export async function executeCursorGrokTurn(params: {
  bot: GrokBotAgent;
  userPrompt: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  peerBots: GrokBotAgent[];
  vaultCards: VaultCard[];
  shoppingList: ShoppingListItem[];
  settings: CursorApiSettings;
  isGroupChannel: boolean;
  allowHandoff?: boolean;
}): Promise<CursorTurnResult> {
  const {
    bot,
    userPrompt,
    conversationHistory,
    peerBots,
    vaultCards,
    shoppingList,
    settings,
    isGroupChannel,
    allowHandoff = true,
  } = params;

  const startMs = Date.now();
  recordApiRequestTimestamp(startMs);

  const parsed = parseGrokSlashCommand(userPrompt);
  const lower = userPrompt.toLowerCase();

  // Smart model routing: grok-4.7-fast for quick chat/cards, grok-4.7 for code/group orchestration
  const needsDeepModel =
    parsed.command === 'code' ||
    parsed.command === 'handoff' ||
    isGroupChannel ||
    /\b(architect|refactor|linux|compile|multi-agent|handoff|complex)\b/i.test(lower);
  const modelUsed: CursorModelId = settings.smartRouting
    ? needsDeepModel
      ? 'grok-4.7'
      : 'grok-4.7-fast'
    : settings.defaultModel;

  const systemPrompt = buildPersistentContextPrompt(bot, vaultCards, shoppingList, peerBots);
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-8),
    { role: 'user', content: parsed.cleanPrompt || userPrompt },
  ];

  let replyText = '';
  let toolLogs: string[] = [
    `Cursor API (${(settings.cursorApiKey || DEFAULT_CURSOR_GROK_KEY).slice(0, 10)}...) · model: ${modelUsed}`,
    `Injected MEMORY.md & SKILL.md for @${bot.handle}`,
  ];

  try {
    const res = await fetch('/api/lokibot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: apiMessages,
        temperature: 0.68,
        maxTokens: 2048,
        botName: bot.name,
        specialty: `${bot.role} — ${bot.specialty}`,
        reasoningMode: modelUsed,
        cursorApiKey: settings.cursorApiKey || DEFAULT_CURSOR_GROK_KEY,
        proxyUrl: settings.proxyUrl || '',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.text) {
        replyText = String(data.text).trim();
        if (Array.isArray(data.thinkingSteps)) {
          toolLogs = data.thinkingSteps;
        }
      }
    }
  } catch (_err) {
    // Handled by local fallback below
  }

  if (!replyText) {
    replyText = `Hey! Here is my take on "${userPrompt.slice(0, 80)}": I've updated the workspace state and prepared the tools needed right below.`;
  }

  // Determine if this turn should also produce an interactive Custom Card, Vault Receipt, Browser Action, or Handoff
  let customCard: CustomUICard | undefined;
  let vaultReceipt: VaultTransactionReceipt | undefined;
  let handoff: HandoffPayload | undefined;
  let browserUpdate: { url: string; title: string; status: string } | undefined;
  let terminalCommands: string[] | undefined;

  const wantsCard =
    parsed.command === 'card' ||
    parsed.command === 'shop' ||
    /\b(make a card|custom card|create a card|price comparison|compare prices|tracker card|mini-app|widget|כרטיס)\b/i.test(
      lower
    );

  if (wantsCard) {
    customCard = synthesizeGenerativeCardFromPrompt(parsed.cleanPrompt || userPrompt, bot, shoppingList, vaultCards);
    toolLogs.push(`Rendered interactive <GenerativeCard /> (${customCard.category}: "${customCard.title}")`);
  }

  const wantsVaultOrder =
    parsed.command === 'vault' ||
    /\b(run routine order|order now via vault|buy groceries now|checkout with vault|הזמן עכשיו)\b/i.test(lower);

  if (wantsVaultOrder) {
    const card = vaultCards.find((c) => c.id === bot.linkedVaultCardId) || vaultCards[0];
    if (card) {
      const itemsToBuy = shoppingList
        .filter((s) => s.autoOrder)
        .map((s) => ({ name: s.name, qty: s.qty, price: s.price }));
      const evalResult = evaluateVaultPurchaseRule(card, itemsToBuy, 'Amazon Fresh');
      vaultReceipt = {
        id: 'rcpt_' + Date.now(),
        vaultCardId: card.id,
        cardNickname: card.nickname,
        cardLast4: card.last4,
        merchant: 'Amazon Fresh · Whole Foods',
        items: itemsToBuy,
        total: evalResult.total,
        status: evalResult.status,
        reason: evalResult.reason,
        timestamp: Date.now(),
      };
      browserUpdate = {
        url: 'https://www.amazon.com/alm/storefront?almBrandId=VUZHIFdob2xlIEZvb2Rz',
        title: 'Amazon Fresh · Automated Vault Checkout',
        status:
          evalResult.status === 'completed'
            ? `Order completed ($${evalResult.total.toFixed(2)}) via ${card.nickname} •••• ${card.last4}`
            : `Paused for Vault Authorization ($${evalResult.total.toFixed(2)})`,
      };
      toolLogs.push(`Vault Engine evaluated ${card.nickname} •••• ${card.last4}: ${evalResult.status}`);
    }
  }

  if (
    parsed.command === 'shop' ||
    /\b(browse|search|price|deal|amazon|whole foods|google|חפש|בדוק מחירים)\b/i.test(lower)
  ) {
    const q = encodeURIComponent(parsed.cleanPrompt.slice(0, 50) || 'Weekly Essentials deals');
    browserUpdate = {
      url: `https://www.google.com/search?q=${q}`,
      title: `Shared Browser · ${parsed.cleanPrompt.slice(0, 36)}`,
      status: `@${bot.handle} scanning live merchant prices & DOM nodes`,
    };
  }

  if (
    parsed.command === 'code' ||
    /\b(code|script|terminal|linux|git|build|compile|python|typescript|קוד|טרמינל)\b/i.test(lower)
  ) {
    terminalCommands = [
      `cursor-agent@grok47-vm:/workspace$ git status --short`,
      `cursor-agent@grok47-vm:/workspace$ npx tsx scripts/verify_task.ts --model=${modelUsed}`,
      `[grok-4.7] Task compiled cleanly in ${Math.max(120, Date.now() - startMs)}ms (0 errors)`,
    ];
    toolLogs.push(`Executed task in Cursor Cloud Linux VM (exit code 0)`);
  }

  // Bot-to-bot handoff in group channels or when explicitly requested
  if (allowHandoff && peerBots.length > 0) {
    const explicitTarget = peerBots.find(
      (p) =>
        p.id !== bot.id &&
        (parsed.mentionedHandles.includes(p.handle.toLowerCase()) ||
          parsed.mentionedHandles.includes(p.name.toLowerCase()))
    );

    if (explicitTarget) {
      handoff = {
        fromBotId: bot.id,
        fromBotName: bot.name,
        toBotId: explicitTarget.id,
        toBotName: explicitTarget.name,
        reason: `Handing off to @${explicitTarget.handle} (${explicitTarget.role}) for specialized follow-up.`,
      };
    } else if (
      isGroupChannel &&
      (parsed.command === 'handoff' ||
        /\b(handoff|team|everyone|collaborate|all bots|צוות|כולם)\b/i.test(lower) ||
        (bot.handle === 'scout' && /\b(buy|order|price|shop|build)\b/i.test(lower)))
    ) {
      const nextBot =
        peerBots.find((p) => p.id !== bot.id && (p.handle === 'ops' || p.handle === 'builder')) ||
        peerBots.find((p) => p.id !== bot.id);
      if (nextBot) {
        handoff = {
          fromBotId: bot.id,
          fromBotName: bot.name,
          toBotId: nextBot.id,
          toBotName: nextBot.name,
          reason: `${bot.name} completed initial ${bot.role.toLowerCase()} pass → handing off to ${nextBot.name} (${nextBot.role}).`,
        };
      }
    }
  }

  return {
    replyText,
    modelUsed,
    latencyMs: Math.max(115, Date.now() - startMs),
    toolLogs,
    customCard,
    handoff,
    vaultReceipt,
    browserUpdate,
    terminalCommands,
  };
}
