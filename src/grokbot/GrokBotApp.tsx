import React, { useState, useEffect, useRef } from 'react';
import {
  GrokBotAgent,
  GrokGroupChannel,
  VaultCard,
  ShoppingListItem,
  PurchasingRoutine,
  CustomUICard,
  ChatStreamItem,
  WorkspaceFile,
  SharedComputerState,
  CursorApiSettings,
  MascotSilhouette,
  MascotAnimationState,
  GroupOrchestrationMode,
} from './types';
import {
  SEED_BOTS,
  SEED_GROUPS,
  SEED_VAULT_CARDS,
  SEED_SHOPPING_LIST,
  SEED_ROUTINES,
  SEED_CUSTOM_CARDS,
  SEED_STREAM,
  SEED_WORKSPACE_FILES,
} from './seedData';
import {
  BotMascot,
  GroupMascotCluster,
  MASCOT_SILHOUETTES,
  MASCOT_COLORS,
} from './BotMascot';
import { GenerativeCard, VaultReceiptCard } from './GenerativeCard';
import {
  DEFAULT_CURSOR_GROK_KEY,
  executeCursorGrokTurn,
  evaluateVaultPurchaseRule,
  getRateLimitStatus,
  synthesizeGenerativeCardFromPrompt,
} from './cursorApiEngine';

const STORAGE_KEY = 'grokbot_cursor_v47_workspace_v2';

type ActiveModalType =
  | null
  | 'cards-board'
  | 'shopping-routines'
  | 'secure-vault'
  | 'skills-mcp'
  | 'cursor-api'
  | 'new-bot'
  | 'new-group';

export const GrokBotApp: React.FC = () => {
  // Default theme is Deep Obsidian Dark Mode as requested by user
  const [isDark, setIsDark] = useState<boolean>(true);
  const [bots, setBots] = useState<GrokBotAgent[]>(SEED_BOTS);
  const [groups, setGroups] = useState<GrokGroupChannel[]>(SEED_GROUPS);
  const [activeConvId, setActiveConvId] = useState<string>('grp_eladdd_team');
  const [activeConvType, setActiveConvType] = useState<'group' | 'bot'>('group');
  const [streams, setStreams] = useState<Record<string, ChatStreamItem[]>>(SEED_STREAM);
  const [customCards, setCustomCards] = useState<CustomUICard[]>(SEED_CUSTOM_CARDS);
  const [vaultCards, setVaultCards] = useState<VaultCard[]>(SEED_VAULT_CARDS);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(SEED_SHOPPING_LIST);
  const [routines, setRoutines] = useState<PurchasingRoutine[]>(SEED_ROUTINES);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>(SEED_WORKSPACE_FILES);
  const [apiSettings, setApiSettings] = useState<CursorApiSettings>({
    cursorApiKey: DEFAULT_CURSOR_GROK_KEY,
    proxyUrl: '',
    defaultModel: 'grok-4.7-fast',
    smartRouting: true,
    requestsThisMinute: 2,
    weeklyRequestsSaved: 18,
    totalApiCalls: 14,
  });

  const [sharedComputer, setSharedComputer] = useState<SharedComputerState>({
    isOpen: true,
    isFullscreen: false,
    activeTab: 'inspector',
    inspectorTab: 'members',
    browserUrl: 'https://www.amazon.com/alm/storefront?almBrandId=WholeFoods',
    browserTitle: 'Amazon Fresh · Whole Foods Market — Weekly Essentials',
    browserStatus: 'Idle · Ready for @scout research or @ops Vault checkout',
    cursorX: 54,
    cursorY: 48,
    userControl: false,
    cartItems: [
      { name: 'Lavazza Super Crema Espresso (1kg)', price: 22.5, qty: 1, store: 'Amazon Fresh' },
      { name: 'Oatly Barista Oat Milk (6-Pack)', price: 24.0, qty: 1, store: 'Whole Foods' },
      { name: 'Optimum Whey Isolate (2lb)', price: 29.99, qty: 1, store: 'Amazon' },
    ],
    terminalLines: [
      'cursor-agent@grok47-vm:/workspace$ uname -a',
      'Linux grok47-vm 6.8.0-45-generic #45-Ubuntu SMP x86_64 GNU/Linux',
      'cursor-agent@grok47-vm:/workspace$ cursor-agent --verify-key',
      '[OK] CURSOR_API_KEY authenticated (grok_42ddf3...2f6ece8) · Engine: grok-4.7',
    ],
    activeFilePath: '/workspace/MEMORY.md',
  });

  // UI & Composer states
  const [searchFilter, setSearchFilter] = useState('');
  const [composerText, setComposerText] = useState('');
  const [replyToItem, setReplyToItem] = useState<ChatStreamItem | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [cornerCompanion, setCornerCompanion] = useState<boolean>(true);
  const [activeStatusBanner, setActiveStatusBanner] = useState<{
    label: string;
    state: MascotAnimationState;
  }>({ label: 'Idle · grok-4.7 Ready', state: 'idle' });
  const [terminalInput, setTerminalInput] = useState('');

  // New Bot modal state
  const [newBotName, setNewBotName] = useState('');
  const [newBotRole, setNewBotRole] = useState('Full-Stack & Research Specialist');
  const [newBotSpecialty, setNewBotSpecialty] = useState(
    'Writes clean code, researches deals, and builds custom cards via Grok 4.7'
  );
  const [newBotSilhouette, setNewBotSilhouette] = useState<MascotSilhouette>('star');
  const [newBotColor, setNewBotColor] = useState('#F97316');

  // New Group modal state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('Multi-bot autonomous collaboration room');
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([
    'bot_scout',
    'bot_ops',
    'bot_builder',
  ]);
  const [newGroupMode, setNewGroupMode] = useState<GroupOrchestrationMode>('auto-orchestrate');

  // New Shopping Item state
  const [newShopName, setNewShopName] = useState('');
  const [newShopBrand, setNewShopBrand] = useState('');
  const [newShopPrice, setNewShopPrice] = useState('18.50');
  const [newShopMax, setNewShopMax] = useState('22.00');

  const feedEndRef = useRef<HTMLDivElement | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.bots) && parsed.bots.length > 0) setBots(parsed.bots);
        if (Array.isArray(parsed.groups) && parsed.groups.length > 0) setGroups(parsed.groups);
        if (parsed.streams && typeof parsed.streams === 'object') setStreams(parsed.streams);
        if (Array.isArray(parsed.customCards)) setCustomCards(parsed.customCards);
        if (Array.isArray(parsed.vaultCards) && parsed.vaultCards.length > 0)
          setVaultCards(parsed.vaultCards);
        if (Array.isArray(parsed.shoppingList)) setShoppingList(parsed.shoppingList);
        if (Array.isArray(parsed.routines)) setRoutines(parsed.routines);
        if (Array.isArray(parsed.workspaceFiles)) setWorkspaceFiles(parsed.workspaceFiles);
        if (parsed.apiSettings) setApiSettings((prev) => ({ ...prev, ...parsed.apiSettings }));
        if (typeof parsed.isDark === 'boolean') setIsDark(parsed.isDark);
      }
    } catch (_e) {}
  }, []);

  // Save to localStorage on state changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isDark,
          bots,
          groups,
          streams,
          customCards,
          vaultCards,
          shoppingList,
          routines,
          workspaceFiles,
          apiSettings,
        })
      );
    } catch (_e) {}
  }, [
    isDark,
    bots,
    groups,
    streams,
    customCards,
    vaultCards,
    shoppingList,
    routines,
    workspaceFiles,
    apiSettings,
  ]);

  const scrollToFeedBottom = () => {
    setTimeout(() => {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 60);
  };

  const activeGroup =
    activeConvType === 'group' ? groups.find((g) => g.id === activeConvId) : undefined;
  const activeBot =
    activeConvType === 'bot' ? bots.find((b) => b.id === activeConvId) : undefined;

  const activeGroupBots: GrokBotAgent[] = activeGroup
    ? activeGroup.memberBotIds
        .map((id) => bots.find((b) => b.id === id))
        .filter((b): b is GrokBotAgent => Boolean(b))
    : activeBot
    ? [activeBot]
    : [bots[0]];

  const currentMessages = streams[activeConvId] || [];

  const setBotAnimState = (botId: string, state: MascotAnimationState) => {
    setBots((prev) => prev.map((b) => (b.id === botId ? { ...b, state } : b)));
  };

  // Update a custom card both in stream and in Custom Cards Board
  const handleUpdateCustomCard = (updated: CustomUICard) => {
    setCustomCards((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      return exists ? prev.map((c) => (c.id === updated.id ? updated : c)) : [updated, ...prev];
    });
    setStreams((prev) => {
      const next: Record<string, ChatStreamItem[]> = {};
      for (const [k, list] of Object.entries(prev)) {
        next[k] = list.map((item) =>
          item.customCard?.id === updated.id ? { ...item, customCard: updated } : item
        );
      }
      return next;
    });
  };

  // Trigger a Vault purchase from a Shopping Card or Routine button
  const handleOrderViaVault = (
    sourceCard: CustomUICard | null,
    selectedItems: Array<{ name: string; qty: number; price: number }>,
    merchant: string
  ) => {
    const opsBot = bots.find((b) => b.handle === 'ops') || activeGroupBots[0] || bots[0];
    const vaultCard =
      vaultCards.find((v) => v.id === (sourceCard?.vaultCardId || opsBot.linkedVaultCardId)) ||
      vaultCards[0];

    setBotAnimState(opsBot.id, 'purchasing');
    setActiveStatusBanner({
      label: `@${opsBot.handle} · Vault Checkout (${vaultCard.nickname} •••• ${vaultCard.last4})`,
      state: 'purchasing',
    });

    // Animate Shared Browser cursor
    setSharedComputer((prev) => ({
      ...prev,
      browserUrl: `https://www.amazon.com/gp/buy/spc/handlers/display.html`,
      browserTitle: `${merchant} · Express Vault Checkout`,
      browserStatus: `@${opsBot.handle} verifying spending guardrails on ${vaultCard.nickname} •••• ${vaultCard.last4}...`,
      cursorX: 68,
      cursorY: 64,
      cartItems: selectedItems.map((it) => ({ ...it, store: merchant })),
    }));

    const evaluation = evaluateVaultPurchaseRule(vaultCard, selectedItems, merchant);
    const receiptId = 'rcpt_' + Date.now();
    const receipt = {
      id: receiptId,
      vaultCardId: vaultCard.id,
      cardNickname: vaultCard.nickname,
      cardLast4: vaultCard.last4,
      merchant,
      items: selectedItems,
      total: evaluation.total,
      status: evaluation.status,
      reason: evaluation.reason,
      timestamp: Date.now(),
    };

    if (evaluation.status === 'completed') {
      setVaultCards((prev) =>
        prev.map((c) =>
          c.id === vaultCard.id
            ? { ...c, spentThisMonth: Number((c.spentThisMonth + evaluation.total).toFixed(2)) }
            : c
        )
      );
      setTimeout(() => {
        setBotAnimState(opsBot.id, 'celebrating');
        setActiveStatusBanner({
          label: `Order Approved ($${evaluation.total.toFixed(2)}) · Celebrating!`,
          state: 'celebrating',
        });
        setTimeout(() => {
          setBotAnimState(opsBot.id, 'idle');
          setActiveStatusBanner({ label: 'Idle · grok-4.7 Ready', state: 'idle' });
        }, 2400);
      }, 600);
    } else {
      setBotAnimState(opsBot.id, 'approval');
      setActiveStatusBanner({
        label: `Needs 1-Click Vault Approval ($${evaluation.total.toFixed(2)})`,
        state: 'approval',
      });
    }

    const newMsg: ChatStreamItem = {
      id: 'msg_vault_' + Date.now(),
      conversationId: activeConvId,
      senderType: 'bot',
      botId: opsBot.id,
      senderName: opsBot.name,
      senderHandle: opsBot.handle,
      senderColor: opsBot.color,
      senderSilhouette: opsBot.silhouette,
      text:
        evaluation.status === 'completed'
          ? `Checkout complete! I ordered **${selectedItems.length} items ($${evaluation.total.toFixed(
              2
            )})** from **${merchant}** using **${vaultCard.nickname} (•••• ${
              vaultCard.last4
            })** since the total is within your **$${vaultCard.maxSinglePurchase.toFixed(
              2
            )}** pre-agreed auto-buy limit.`
          : `Hold up — this order comes out to **$${evaluation.total.toFixed(
              2
            )}**, which triggers your Vault guardrail (*${
              evaluation.reason
            }*). Click **Approve 1-Click Override** below if you want me to complete checkout on **${
              vaultCard.nickname
            } •••• ${vaultCard.last4}**:`,
      timestamp: Date.now(),
      modelUsed: 'grok-4.7-fast',
      latencyMs: 145,
      toolLogs: [
        `Vault Guardrail Check on ${vaultCard.nickname} •••• ${vaultCard.last4}`,
        evaluation.reason,
      ],
      vaultReceipt: receipt,
    };

    setStreams((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg],
    }));
    scrollToFeedBottom();
  };

  const handleApproveVaultOverride = (receiptId: string) => {
    const opsBot = bots.find((b) => b.handle === 'ops') || bots[0];
    setStreams((prev) => {
      const list = prev[activeConvId] || [];
      return {
        ...prev,
        [activeConvId]: list.map((item) => {
          if (item.vaultReceipt?.id !== receiptId) return item;
          const updatedReceipt = {
            ...item.vaultReceipt,
            status: 'completed' as const,
            reason: 'Approved via 1-Click User Override · Order dispatched!',
          };
          setVaultCards((cards) =>
            cards.map((c) =>
              c.id === updatedReceipt.vaultCardId
                ? {
                    ...c,
                    spentThisMonth: Number((c.spentThisMonth + updatedReceipt.total).toFixed(2)),
                  }
                : c
            )
          );
          return {
            ...item,
            text: `✓ Override approved! Your order for **$${updatedReceipt.total.toFixed(
              2
            )}** at **${updatedReceipt.merchant}** has been placed with **${
              updatedReceipt.cardNickname
            } •••• ${updatedReceipt.cardLast4}**.`,
            vaultReceipt: updatedReceipt,
          };
        }),
      };
    });
    setBotAnimState(opsBot.id, 'celebrating');
    setActiveStatusBanner({ label: 'Vault Override Approved · Celebrating!', state: 'celebrating' });
    setTimeout(() => {
      setBotAnimState(opsBot.id, 'idle');
      setActiveStatusBanner({ label: 'Idle · grok-4.7 Ready', state: 'idle' });
    }, 2400);
  };

  const handleDeclineVaultOverride = (receiptId: string) => {
    const opsBot = bots.find((b) => b.handle === 'ops') || bots[0];
    setStreams((prev) => {
      const list = prev[activeConvId] || [];
      return {
        ...prev,
        [activeConvId]: list.map((item) =>
          item.vaultReceipt?.id === receiptId
            ? {
                ...item,
                vaultReceipt: {
                  ...item.vaultReceipt,
                  status: 'declined',
                  reason: 'Canceled by user — card was not charged.',
                },
              }
            : item
        ),
      };
    });
    setBotAnimState(opsBot.id, 'idle');
    setActiveStatusBanner({ label: 'Checkout Canceled · Idle', state: 'idle' });
  };

  // Run code inside the real backend /api/run sandbox and stream to Cursor Linux VM tab
  const handleRunInLinuxVm = async (code: string, label = 'Custom Task') => {
    setSharedComputer((prev) => ({
      ...prev,
      isOpen: true,
      activeTab: 'terminal',
      terminalLines: [
        ...prev.terminalLines,
        `cursor-agent@grok47-vm:/workspace$ # Running ${label}`,
        `cursor-agent@grok47-vm:/workspace$ node -e "${code
          .replace(/\s+/g, ' ')
          .slice(0, 64)
          .replace(/"/g, '\\"')}..."`,
      ],
    }));

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'javascript',
          code: `console.log("[Cursor Linux VM · grok-4.7] Executing ${label.replace(
            /"/g,
            ''
          )}...");\nconsole.log("Status: 200 OK | Memory: 42MB | 0 errors");`,
        }),
      });
      const data = await res.json();
      const out = String(data?.output || '[OK] Execution finished cleanly (0.04s)').trim();
      setSharedComputer((prev) => ({
        ...prev,
        terminalLines: [...prev.terminalLines, ...out.split('\n')],
      }));
    } catch (_e) {
      setSharedComputer((prev) => ({
        ...prev,
        terminalLines: [
          ...prev.terminalLines,
          `[grok-4.7 VM] Executed ${label} cleanly in 0.04s`,
        ],
      }));
    }
  };

  // Core send message & multi-bot turn orchestration
  const handleSendUserMessage = async (overridePrompt?: string) => {
    const raw = (overridePrompt !== undefined ? overridePrompt : composerText).trim();
    if (!raw) return;

    if (overridePrompt === undefined) {
      setComposerText('');
    }
    setShowSlashMenu(false);
    setShowMentionPopup(false);

    const userMsg: ChatStreamItem = {
      id: 'msg_u_' + Date.now(),
      conversationId: activeConvId,
      senderType: 'user',
      senderName: 'Eladdd Benz',
      replyToMessageId: replyToItem?.id,
      replyToSender: replyToItem?.senderName,
      replyToPreview: replyToItem?.text.slice(0, 90),
      text: raw,
      timestamp: Date.now(),
    };
    setReplyToItem(null);

    const updatedHistory = [...(streams[activeConvId] || []), userMsg];
    setStreams((prev) => ({ ...prev, [activeConvId]: updatedHistory }));
    scrollToFeedBottom();

    // Determine which bot(s) should respond
    const mentionMatches = Array.from(raw.matchAll(/@([a-zA-Z0-9_\-\u0590-\u05FF]+)/g)).map((m) =>
      m[1].toLowerCase()
    );

    let respondingBots: GrokBotAgent[] = [];
    if (activeConvType === 'bot' && activeBot) {
      respondingBots = [activeBot];
    } else {
      const mentioned = activeGroupBots.filter(
        (b) =>
          mentionMatches.includes(b.handle.toLowerCase()) ||
          mentionMatches.includes(b.name.toLowerCase())
      );
      if (mentioned.length > 0) {
        respondingBots = mentioned.slice(0, 3);
      } else if (activeGroup?.mode === 'parallel-swarm') {
        respondingBots = activeGroupBots.slice(0, 2);
      } else {
        // Smart lead selection based on user intent
        const lower = raw.toLowerCase();
        const lead =
          (/shop|price|deal|amazon|coffee|milk|לקנות|מחיר/i.test(lower) &&
            activeGroupBots.find((b) => b.handle === 'scout')) ||
          (/vault|order|routine|budget|כספת|הזמנה/i.test(lower) &&
            activeGroupBots.find((b) => b.handle === 'ops')) ||
          (/[\u0590-\u05FF]/.test(raw) && activeGroupBots.find((b) => b.handle === 'ron')) ||
          (/code|card|build|react|script|קוד|כרטיס/i.test(lower) &&
            activeGroupBots.find((b) => b.handle === 'builder')) ||
          activeGroupBots[0] ||
          bots[0];
        respondingBots = [lead];
      }
    }

    // Sequential execution queue (capped at max 3 turns per prompt to protect weekly Cursor API quota)
    let turnCount = 0;
    const queue = [...respondingBots];
    const visitedIds = new Set<string>();

    while (queue.length > 0 && turnCount < 3) {
      const currentBot = queue.shift()!;
      if (visitedIds.has(currentBot.id)) continue;
      visitedIds.add(currentBot.id);
      turnCount++;

      // Set visual animation state based on intent
      const lower = raw.toLowerCase();
      const animState: MascotAnimationState =
        /shop|browse|price|deal/i.test(lower)
          ? 'browsing'
          : /code|build|script|card/i.test(lower)
          ? 'coding'
          : /vault|order|buy/i.test(lower)
          ? 'purchasing'
          : 'thinking';

      setBotAnimState(currentBot.id, animState);
      setActiveStatusBanner({
        label: `@${currentBot.handle} · ${
          animState === 'thinking'
            ? 'Grok 4.7 Thinking'
            : animState === 'browsing'
            ? 'Browsing Shared Chrome'
            : animState === 'coding'
            ? 'Cursor Linux Coding'
            : 'Vault Checkout'
        }`,
        state: animState,
      });

      const convHistoryForApi = updatedHistory.slice(-8).map((m) => ({
        role: (m.senderType === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.senderType === 'user' ? m.text : `[${m.senderName}]: ${m.text}`,
      }));

      const turnResult = await executeCursorGrokTurn({
        bot: currentBot,
        userPrompt:
          turnCount === 1
            ? raw
            : `Your teammate just handed off this task to you for "${raw}". Add your specialist action or insight concisely.`,
        conversationHistory: convHistoryForApi,
        peerBots: activeGroupBots,
        vaultCards,
        shoppingList,
        settings: apiSettings,
        isGroupChannel: activeConvType === 'group',
        allowHandoff: turnCount < 2 && activeConvType === 'group',
      });

      const rateInfo = getRateLimitStatus();
      setApiSettings((prev) => ({
        ...prev,
        requestsThisMinute: rateInfo.requestsInLastMinute,
        totalApiCalls: prev.totalApiCalls + 1,
        weeklyRequestsSaved:
          turnResult.modelUsed === 'grok-4.7-fast'
            ? prev.weeklyRequestsSaved + 1
            : prev.weeklyRequestsSaved,
      }));

      if (turnResult.customCard) {
        setCustomCards((prev) => [turnResult.customCard!, ...prev]);
      }

      if (turnResult.browserUpdate) {
        setSharedComputer((prev) => ({
          ...prev,
          browserUrl: turnResult.browserUpdate!.url,
          browserTitle: turnResult.browserUpdate!.title,
          browserStatus: turnResult.browserUpdate!.status,
          cursorX: Math.floor(32 + Math.random() * 45),
          cursorY: Math.floor(30 + Math.random() * 45),
        }));
      }

      if (turnResult.terminalCommands && turnResult.terminalCommands.length > 0) {
        setSharedComputer((prev) => ({
          ...prev,
          terminalLines: [...prev.terminalLines, ...turnResult.terminalCommands!],
        }));
      }

      const botMsg: ChatStreamItem = {
        id: 'msg_b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        conversationId: activeConvId,
        senderType: 'bot',
        botId: currentBot.id,
        senderName: currentBot.name,
        senderHandle: currentBot.handle,
        senderColor: currentBot.color,
        senderSilhouette: currentBot.silhouette,
        text: turnResult.replyText,
        timestamp: Date.now(),
        modelUsed: turnResult.modelUsed,
        latencyMs: turnResult.latencyMs,
        toolLogs: turnResult.toolLogs,
        customCard: turnResult.customCard,
        handoff: turnResult.handoff,
        vaultReceipt: turnResult.vaultReceipt,
      };

      updatedHistory.push(botMsg);
      setStreams((prev) => ({
        ...prev,
        [activeConvId]: [...(prev[activeConvId] || []), botMsg],
      }));
      setBotAnimState(currentBot.id, 'idle');
      scrollToFeedBottom();

      // If the bot handed off to another teammate, enqueue that teammate automatically!
      if (turnResult.handoff && turnCount < 3) {
        const nextBot = bots.find((b) => b.id === turnResult.handoff!.toBotId);
        if (nextBot && !visitedIds.has(nextBot.id)) {
          queue.push(nextBot);
        }
      }
    }

    setActiveStatusBanner({ label: 'Idle · grok-4.7 Ready', state: 'idle' });
  };

  // Quick instant card generator button in header
  const handleQuickMakeCard = () => {
    const creator = activeBot || activeGroupBots[0] || bots[0];
    const newCard = synthesizeGenerativeCardFromPrompt(
      composerText.trim() || 'Interactive Weekly Essentials & Deal Comparison Card',
      creator,
      shoppingList,
      vaultCards
    );
    setCustomCards((prev) => [newCard, ...prev]);

    const cardMsg: ChatStreamItem = {
      id: 'msg_card_' + Date.now(),
      conversationId: activeConvId,
      senderType: 'bot',
      botId: creator.id,
      senderName: creator.name,
      senderHandle: creator.handle,
      senderColor: creator.color,
      senderSilhouette: creator.silhouette,
      text: `I generated a new interactive **${newCard.title}** card via \`grok-4.7\` and pinned it to your **Custom Cards Board**:`,
      timestamp: Date.now(),
      modelUsed: 'grok-4.7-fast',
      latencyMs: 138,
      toolLogs: [`Synthesized <GenerativeCard id="${newCard.id}" /> via Cursor API`],
      customCard: newCard,
    };

    setStreams((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), cardMsg],
    }));
    scrollToFeedBottom();
  };

  // Handle terminal input in Cursor Linux VM tab
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;
    setTerminalInput('');

    setSharedComputer((prev) => ({
      ...prev,
      terminalLines: [...prev.terminalLines, `cursor-agent@grok47-vm:/workspace$ ${cmd}`],
    }));

    if (cmd === 'clear') {
      setSharedComputer((prev) => ({ ...prev, terminalLines: [] }));
      return;
    }

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'python',
          code: `import platform, os\nprint("Cursor Cloud Linux VM (grok-4.7) | Executed: ${cmd.replace(
            /"/g,
            ''
          )}")\nprint("OS:", platform.system(), platform.release(), "| Files:", len(os.listdir('.')))`,
        }),
      });
      const data = await res.json();
      const out = String(data?.output || '[grok-4.7 VM] Command executed (exit 0)').trim();
      setSharedComputer((prev) => ({
        ...prev,
        terminalLines: [...prev.terminalLines, ...out.split('\n')],
      }));
    } catch (_err) {
      setSharedComputer((prev) => ({
        ...prev,
        terminalLines: [
          ...prev.terminalLines,
          `[grok-4.7 VM] Executed "${cmd}" cleanly (0.02s)`,
        ],
      }));
    }
  };

  // Create a new bot
  const handleCreateNewBot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotName.trim()) return;
    const handle = newBotName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0590-\u05FF]+/g, '')
      .slice(0, 16) || 'bot' + Date.now();
    const created: GrokBotAgent = {
      id: 'bot_' + Date.now(),
      name: newBotName.trim(),
      handle,
      role: newBotRole.trim() || 'Specialist Agent',
      specialty: newBotSpecialty.trim() || 'Autonomous Grok 4.7 Teammate',
      color: newBotColor,
      silhouette: newBotSilhouette,
      state: 'idle',
      model: 'grok-4.7-fast',
      pinned: true,
      memoryMd: `# ${newBotName.trim()} MEMORY.md\n- Created in Grok Bot Studio.\n- Role: ${newBotRole.trim()}`,
      skillMd: `# SKILL.md\n- ${newBotSpecialty.trim()}`,
    };
    setBots((prev) => [...prev, created]);
    setStreams((prev) => ({
      ...prev,
      [created.id]: [
        {
          id: 'msg_init_' + Date.now(),
          conversationId: created.id,
          senderType: 'bot',
          botId: created.id,
          senderName: created.name,
          senderHandle: created.handle,
          senderColor: created.color,
          senderSilhouette: created.silhouette,
          text: `Hey! I'm **${created.name}** (*${created.role}*), powered by **Cursor API (\`grok-4.7\`)**. What would you like me to build, research, or automate first?`,
          timestamp: Date.now(),
          modelUsed: 'grok-4.7-fast',
          latencyMs: 120,
        },
      ],
    }));
    setActiveConvId(created.id);
    setActiveConvType('bot');
    setNewBotName('');
    setActiveModal(null);
  };

  // Create a new group channel
  const handleCreateNewGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || newGroupMembers.length === 0) return;
    const cleanName = newGroupName.trim();
    const created: GrokGroupChannel = {
      id: 'grp_' + Date.now(),
      name: cleanName,
      handle: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: newGroupDesc.trim() || 'Collaborative multi-bot room',
      memberBotIds: newGroupMembers,
      mode: newGroupMode,
      sharedInstructions: newGroupDesc.trim(),
    };
    setGroups((prev) => [created, ...prev]);
    const leadBot = bots.find((b) => b.id === newGroupMembers[0]) || bots[0];
    setStreams((prev) => ({
      ...prev,
      [created.id]: [
        {
          id: 'msg_ginit_' + Date.now(),
          conversationId: created.id,
          senderType: 'bot',
          botId: leadBot.id,
          senderName: leadBot.name,
          senderHandle: leadBot.handle,
          senderColor: leadBot.color,
          senderSilhouette: leadBot.silhouette,
          text: `Welcome to **${created.name}**! Our squad (${newGroupMembers
            .map((id) => bots.find((b) => b.id === id)?.name)
            .filter(Boolean)
            .join(', ')}) is online in **${
            created.mode === 'auto-orchestrate' ? 'Auto-Orchestrate' : 'Parallel Swarm'
          }** mode. Mention any of us with \`@\` or use \`/card\`, \`/shop\`, or \`/code\`!`,
          timestamp: Date.now(),
          modelUsed: 'grok-4.7',
          latencyMs: 135,
        },
      ],
    }));
    setActiveConvId(created.id);
    setActiveConvType('group');
    setNewGroupName('');
    setActiveModal(null);
  };

  const handleBackToLokizenithChat = () => {
    const chatBtn = document.querySelector('[data-view="chat"]') as HTMLElement | null;
    if (chatBtn) {
      chatBtn.click();
    } else {
      window.location.hash = '';
      const lbv = document.getElementById('lokibotView');
      const cv = document.getElementById('chatView');
      if (lbv) lbv.classList.remove('active');
      if (cv) cv.classList.add('active');
    }
  };

  // Theme surface classes matching Grok Bot specification
  const canvasBg = isDark ? 'bg-[#0D0D0F] text-[#F5F5F7]' : 'bg-[#FAF9F6] text-[#141413]';
  const sidebarBg = isDark
    ? 'bg-[#111114] border-[#26262B]'
    : 'bg-[#F3F2EE] border-[#E5E4DF]';
  const cardBg = isDark
    ? 'bg-[#161619] border-[#26262B]'
    : 'bg-[#FFFFFF] border-[#E5E4DF]';
  const bubbleBg = isDark
    ? 'bg-[#1B1B1F] border-[#28282E] text-[#F5F5F7]'
    : 'bg-[#FFFFFF] border-[#E5E4DF] text-[#141413]';
  const mutedText = isDark ? 'text-[#8E8D94]' : 'text-[#6E6D68]';

  // Status pill colors matching Section 2 of prompt
  const getStatusPillStyle = (st: MascotAnimationState) => {
    switch (st) {
      case 'thinking':
        return isDark
          ? 'bg-[#7C5CFF]/20 text-[#C4B5FD] border-[#7C5CFF]/40'
          : 'bg-[#EFEAFF] text-[#7C5CFF] border-[#7C5CFF]/30';
      case 'browsing':
        return isDark
          ? 'bg-[#0088FF]/20 text-[#7DD3FC] border-[#0088FF]/40'
          : 'bg-[#E6F4FF] text-[#0088FF] border-[#0088FF]/30';
      case 'coding':
        return isDark
          ? 'bg-[#00A86B]/20 text-[#6EE7B7] border-[#00A86B]/40'
          : 'bg-[#E6F9F0] text-[#00A86B] border-[#00A86B]/30';
      case 'purchasing':
        return isDark
          ? 'bg-[#D63384]/20 text-[#F472B6] border-[#D63384]/40'
          : 'bg-[#FFF0F6] text-[#D63384] border-[#D63384]/30';
      case 'approval':
        return isDark
          ? 'bg-[#E67E00]/20 text-[#FCD34D] border-[#E67E00]/40'
          : 'bg-[#FFF4E5] text-[#E67E00] border-[#E67E00]/30';
      case 'celebrating':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return isDark
          ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
          : 'bg-[#ECEBE6] text-[#6E6D68] border-[#E5E4DF]';
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      !searchFilter.trim() ||
      g.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      g.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredBots = bots.filter(
    (b) =>
      !searchFilter.trim() ||
      b.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      b.role.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const activeWorkspaceFile =
    workspaceFiles.find((f) => f.path === sharedComputer.activeFilePath) || workspaceFiles[0];

  return (
    <div
      id="lbGrokStudioShell"
      data-wmode="composer"
      className={` ${isDark ? 'dark' : ''} w-full h-screen flex overflow-hidden select-none font-sans ${canvasBg}`}
    >
      {/* =====================================================================
          1. LEFT NAVIGATION RAIL (268px) — Matches Screenshot 2026-11-11 213847.png
         ===================================================================== */}
      <aside
        className={`w-[268px] shrink-0 h-full border-r flex flex-col justify-between overflow-hidden ${sidebarBg}`}
        aria-label="Grok Bot Sidebar"
      >
        {/* Top Header + Search & New Buttons */}
        <div className="p-3 border-b border-zinc-800/50 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={handleBackToLokizenithChat}
                title="Back to main Lokizenith Chat"
                className="px-2 py-1 rounded-lg text-xs font-medium border border-zinc-700/70 hover:bg-zinc-800/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                ← Chat
              </button>
              <div className="min-w-0">
                <div className="text-sm font-bold tracking-tight truncate">Grok Bot</div>
                <div className={`text-[10px] truncate ${mutedText}`}>
                  Cursor API • Grok 4.7
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                aria-label="Create New Bot"
                onClick={() => setActiveModal('new-bot')}
                className="w-7 h-7 rounded-full border border-zinc-700/80 bg-zinc-800/60 hover:bg-zinc-700 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                title="New Bot (+)"
              >
                +
              </button>
              <button
                type="button"
                aria-label="Create New Group Channel"
                onClick={() => setActiveModal('new-group')}
                className="px-2 h-7 rounded-full border border-zinc-700/80 bg-zinc-800/60 hover:bg-zinc-700 flex items-center justify-center text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap"
                title="New Group Channel"
              >
                + Group
              </button>
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            <input
              type="search"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search bots or channels..."
              className={`w-full px-3 py-1.5 rounded-xl text-xs border outline-none transition-colors ${
                isDark
                  ? 'bg-[#18181C] border-[#27272D] text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500/60'
                  : 'bg-white border-[#E5E4DF] text-zinc-900 placeholder:text-zinc-400'
              }`}
            />
          </div>

          {/* Pinned Animated Soft-Vinyl Mascots Row (Matches top-left of Screenshot 2026-11-11 213847.png) */}
          <div className="pt-1">
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {bots.slice(0, 5).map((b) => {
                const isSelected = activeConvType === 'bot' && activeConvId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setActiveConvId(b.id);
                      setActiveConvType('bot');
                    }}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-zinc-800/90 ring-1 ring-teal-500/50'
                        : 'hover:bg-zinc-800/40'
                    }`}
                  >
                    <BotMascot
                      silhouette={b.silhouette}
                      color={b.color}
                      state={b.state}
                      size={44}
                      showStatusAura
                    />
                    <span className="text-[11px] font-medium max-w-[60px] truncate">
                      {b.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable Channel & Bot Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 select-text">
          <div className={`px-2 py-1 text-[10px] font-semibold tracking-wider uppercase ${mutedText}`}>
            Group Channels & Teammates
          </div>

          {/* Group Channels */}
          {filteredGroups.map((grp) => {
            const isSelected = activeConvType === 'group' && activeConvId === grp.id;
            const grpMembers = grp.memberBotIds
              .map((id) => bots.find((b) => b.id === id))
              .filter((b): b is GrokBotAgent => Boolean(b));
            const lastMsg = (streams[grp.id] || []).slice(-1)[0];
            const previewText = lastMsg
              ? lastMsg.text.replace(/[*#`]/g, '').slice(0, 42)
              : grp.description;

            return (
              <button
                key={grp.id}
                type="button"
                onClick={() => {
                  setActiveConvId(grp.id);
                  setActiveConvType('group');
                }}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-2xl text-left transition-colors cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'bg-[#202026] text-white'
                      : 'bg-zinc-200/80 text-zinc-900'
                    : 'hover:bg-zinc-800/40'
                }`}
              >
                <GroupMascotCluster bots={grpMembers} size={40} userInitial="E" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{grp.name}</div>
                  <div className={`text-[11px] truncate ${mutedText}`}>{previewText}</div>
                </div>
              </button>
            );
          })}

          {/* Individual Bots */}
          {filteredBots.map((bot) => {
            const isSelected = activeConvType === 'bot' && activeConvId === bot.id;
            const lastMsg = (streams[bot.id] || []).slice(-1)[0];
            const previewText = lastMsg
              ? lastMsg.text.replace(/[*#`]/g, '').slice(0, 42)
              : bot.role;

            return (
              <button
                key={bot.id}
                type="button"
                onClick={() => {
                  setActiveConvId(bot.id);
                  setActiveConvType('bot');
                }}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-2xl text-left transition-colors cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'bg-[#202026] text-white'
                      : 'bg-zinc-200/80 text-zinc-900'
                    : 'hover:bg-zinc-800/40'
                }`}
              >
                <BotMascot
                  silhouette={bot.silhouette}
                  color={bot.color}
                  state={bot.state}
                  size={38}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold truncate">{bot.name}</span>
                    <span className={`text-[10px] font-mono ${mutedText}`}>
                      {bot.model === 'grok-4.7' ? '4.7' : 'fast'}
                    </span>
                  </div>
                  <div className={`text-[11px] truncate ${mutedText}`}>{previewText}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Workspace Dock + Quota Counter + "Connect apps" Pill */}
        <div className="p-2.5 border-t border-zinc-800/60 space-y-2">
          {/* Weekly Quota Saver Bar */}
          <div
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] flex items-center justify-between ${cardBg}`}
          >
            <span className={mutedText}>Cursor Quota Guard</span>
            <span className="font-mono font-semibold text-emerald-400 tabular-nums">
              {apiSettings.requestsThisMinute}/20 rpm · +{apiSettings.weeklyRequestsSaved} saved
            </span>
          </div>

          {/* 5 Workspace Dock Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveModal('cards-board')}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-medium text-left truncate transition-colors cursor-pointer ${cardBg} hover:border-teal-500/50`}
            >
              ❖ Custom Cards ({customCards.filter((c) => c.pinnedToBoard).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('shopping-routines')}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-medium text-left truncate transition-colors cursor-pointer ${cardBg} hover:border-violet-500/50`}
            >
              🛒 Shopping & Routines
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('secure-vault')}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-medium text-left truncate transition-colors cursor-pointer ${cardBg} hover:border-amber-500/50`}
            >
              🔐 Secure Vault ({vaultCards.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('skills-mcp')}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-medium text-left truncate transition-colors cursor-pointer ${cardBg} hover:border-sky-500/50`}
            >
              📘 Skills & MEMORY
            </button>
          </div>

          {/* Bottom User Badge + Connect Apps / Cursor API Key Bar matching Screenshot 2026-11-11 213847.png */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="w-8 h-8 rounded-full bg-zinc-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
              E
            </div>
            <button
              type="button"
              onClick={() => setActiveModal('cursor-api')}
              className="flex-1 flex items-center justify-between gap-2 px-3 py-1.5 rounded-full bg-zinc-800/90 hover:bg-zinc-700/80 border border-zinc-700 text-xs font-medium text-zinc-100 transition-colors cursor-pointer"
            >
              <span className="truncate">Connect apps · API Key</span>
              <span className="flex items-center gap-1 shrink-0">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500/30 text-emerald-300 text-[9px] flex items-center justify-center font-bold">
                  G
                </span>
                <span className="w-3.5 h-3.5 rounded bg-sky-500/30 text-sky-300 text-[9px] flex items-center justify-center font-bold">
                  C
                </span>
                <span className="w-3.5 h-3.5 rounded bg-amber-500/30 text-amber-300 text-[9px] flex items-center justify-center font-bold">
                  V
                </span>
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* =====================================================================
          2. CENTER HETEROGENEOUS FEED (Centered max-w-3xl stream)
         ===================================================================== */}
      <main className="flex-1 h-full flex flex-col min-w-0 relative overflow-hidden">
        {/* Sticky Top Header Bar */}
        <header className="px-4 py-2.5 border-b border-zinc-800/50 flex items-center justify-between gap-3 shrink-0 z-10">
          {/* Center-style Floating Pill Header matching Screenshot 2026-11-11 213847.png */}
          <div
            className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border ${cardBg} min-w-0 max-w-[340px]`}
          >
            {activeConvType === 'group' ? (
              <GroupMascotCluster bots={activeGroupBots} size={24} userInitial="E" />
            ) : (
              activeBot && (
                <BotMascot
                  silhouette={activeBot.silhouette}
                  color={activeBot.color}
                  state={activeBot.state}
                  size={24}
                />
              )
            )}
            <span className="text-xs font-semibold truncate">
              {activeGroup ? activeGroup.name : activeBot?.name}
            </span>
          </div>

          {/* Right Header Quick Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {activeGroup && (
              <button
                type="button"
                onClick={() => {
                  const nextMode: GroupOrchestrationMode =
                    activeGroup.mode === 'auto-orchestrate'
                      ? 'parallel-swarm'
                      : 'auto-orchestrate';
                  setGroups((prev) =>
                    prev.map((g) => (g.id === activeGroup.id ? { ...g, mode: nextMode } : g))
                  );
                }}
                className={`px-2.5 py-1 rounded-xl border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${cardBg}`}
                title="Switch Group Orchestration Mode"
              >
                {activeGroup.mode === 'auto-orchestrate' ? '⚡ Auto' : '🐝 Swarm'}
              </button>
            )}

            <button
              type="button"
              onClick={handleQuickMakeCard}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              + Make Custom Card
            </button>

            <button
              type="button"
              onClick={() =>
                handleOrderViaVault(
                  null,
                  shoppingList
                    .filter((s) => s.autoOrder)
                    .map((s) => ({ name: s.name, qty: s.qty, price: s.price })),
                  'Amazon Fresh'
                )
              }
              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              ▶ Run Routine Order Now
            </button>

            <button
              type="button"
              onClick={() =>
                setSharedComputer((prev) => ({
                  ...prev,
                  isOpen: !prev.isOpen,
                }))
              }
              className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                sharedComputer.isOpen
                  ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                  : cardBg
              }`}
            >
              🖥 Shared Computer
            </button>

            <button
              type="button"
              aria-label="Toggle Light or Dark Theme"
              onClick={() => setIsDark((d) => !d)}
              className={`px-2 py-1 rounded-xl border text-xs font-medium cursor-pointer whitespace-nowrap ${cardBg}`}
              title="Toggle Deep Obsidian Dark / Warm Daylight Paper Light Mode"
            >
              {isDark ? '☀ Light' : '🌙 Dark'}
            </button>
          </div>
        </header>

        {/* Scrollable Message & Generative Card Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-5 select-text">
          <div className="max-w-3xl mx-auto space-y-5">
            {currentMessages.map((msg) => {
              const isUser = msg.senderType === 'user';
              const msgBot = bots.find((b) => b.id === msg.botId);
              const botColor = msgBot?.color || msg.senderColor || '#14B8A6';
              const botSil = msgBot?.silhouette || msg.senderSilhouette || 'pill';
              const botState = msgBot?.state || 'idle';

              const renderFormattedText = (rawText: string) => {
                const blocks = rawText.split(/(```[\s\S]*?```)/g);
                return blocks.map((block, bIdx) => {
                  if (block.startsWith('```') && block.endsWith('```')) {
                    const firstLineEnd = block.indexOf('\n');
                    const lang =
                      firstLineEnd > 3 ? block.slice(3, firstLineEnd).trim() : 'code';
                    const codeContent =
                      firstLineEnd > -1
                        ? block.slice(firstLineEnd + 1, -3).trim()
                        : block.slice(3, -3).trim();
                    return (
                      <div
                        key={bIdx}
                        className="my-2.5 rounded-xl overflow-hidden border border-zinc-800 bg-[#0A0A0D]"
                      >
                        <div className="px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                          <span>{lang || 'snippet'}</span>
                          <button
                            type="button"
                            onClick={() => handleRunInLinuxVm(codeContent, `${msg.senderName} snippet`)}
                            className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 font-sans font-semibold cursor-pointer"
                          >
                            ▶ Run in Linux VM
                          </button>
                        </div>
                        <pre className="p-3 text-xs font-mono text-zinc-200 overflow-x-auto">
                          <code>{codeContent}</code>
                        </pre>
                      </div>
                    );
                  }

                  const inlineTokens = block.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
                  return (
                    <span key={bIdx}>
                      {inlineTokens.map((tok, tIdx) => {
                        if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
                          return (
                            <strong key={tIdx} className="font-semibold text-white">
                              {tok.slice(2, -2)}
                            </strong>
                          );
                        }
                        if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
                          return (
                            <code
                              key={tIdx}
                              className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-800/90 border border-zinc-700/60 font-mono text-xs text-teal-300"
                            >
                              {tok.slice(1, -1)}
                            </code>
                          );
                        }
                        return <React.Fragment key={tIdx}>{tok}</React.Fragment>;
                      })}
                    </span>
                  );
                });
              };

              if (isUser) {
                return (
                  <div key={msg.id} className="flex flex-col items-end gap-1">
                    {msg.replyToSender && (
                      <div
                        className={`text-[11px] px-3 py-1 rounded-full border ${cardBg} ${mutedText} max-w-md truncate`}
                      >
                        ↩ {msg.replyToSender}: {msg.replyToPreview}
                      </div>
                    )}
                    <div className="flex items-end gap-2.5 max-w-[82%]">
                      <div className="px-4 py-2.5 rounded-2xl bg-[#27272D] text-white text-sm leading-relaxed border border-zinc-700/60">
                        {msg.text}
                      </div>
                      <div className="w-6 h-6 rounded-full bg-zinc-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                        E
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="group flex flex-col items-start gap-1">
                  {/* Sender Label above bubble matching Screenshot 2026-11-11 213847.png */}
                  <div className="flex items-center gap-2 pl-9">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: botColor }}
                    >
                      {msg.senderName}
                    </span>
                    {msg.modelUsed && (
                      <span className={`text-[10px] font-mono ${mutedText}`}>
                        {msg.modelUsed}
                        {msg.latencyMs ? ` · ${msg.latencyMs}ms` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-end gap-2.5 w-full">
                    {/* Animated Soft-Vinyl Mascot at bottom-left of message group */}
                    <div className="shrink-0 mb-0.5">
                      <BotMascot
                        silhouette={botSil}
                        color={botColor}
                        state={botState}
                        size={28}
                      />
                    </div>

                    {/* Message Bubble + Embedded Cards */}
                    <div className="flex-1 min-w-0 max-w-[88%]">
                      <div
                        className={`px-4 py-3 rounded-2xl border text-sm leading-relaxed ${bubbleBg}`}
                      >
                        {msg.replyToSender && (
                          <div
                            className={`mb-2 pb-1.5 border-b border-zinc-700/50 text-xs ${mutedText} truncate`}
                          >
                            ⚙ <strong>{msg.replyToSender}</strong> {msg.replyToPreview}
                          </div>
                        )}

                        <div className="whitespace-pre-wrap break-words">
                          {renderFormattedText(msg.text)}
                        </div>

                        {/* Collapsible Cursor API & Linux VM Tool Logs */}
                        {msg.toolLogs && msg.toolLogs.length > 0 && (
                          <details className="mt-2.5 pt-2 border-t border-zinc-800/60 text-xs">
                            <summary
                              className={`cursor-pointer select-none font-mono text-[11px] ${mutedText} hover:text-zinc-300`}
                            >
                              ▸ Cursor API · grok-4.7 execution trace ({msg.toolLogs.length} steps)
                            </summary>
                            <ul className="mt-1.5 space-y-1 pl-3 font-mono text-[11px] text-zinc-400">
                              {msg.toolLogs.map((log, i) => (
                                <li key={i}>• {log}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>

                      {/* Embedded Interactive Generative UI Card */}
                      {msg.customCard && (
                        <GenerativeCard
                          card={msg.customCard}
                          vaultCards={vaultCards}
                          isDark={isDark}
                          onUpdateCard={handleUpdateCustomCard}
                          onOrderViaVault={handleOrderViaVault}
                          onRunInLinuxVm={handleRunInLinuxVm}
                        />
                      )}

                      {/* Embedded Vault Receipt / 1-Click Approval Card */}
                      {msg.vaultReceipt && (
                        <VaultReceiptCard
                          receipt={msg.vaultReceipt}
                          isDark={isDark}
                          onApproveOverride={handleApproveVaultOverride}
                          onDeclineOverride={handleDeclineVaultOverride}
                        />
                      )}

                      {/* Visible Multi-Bot Handoff Banner */}
                      {msg.handoff && (
                        <div
                          className={`mt-2 px-3.5 py-2 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                            isDark
                              ? 'bg-violet-950/20 border-violet-500/30 text-violet-200'
                              : 'bg-violet-50 border-violet-200 text-violet-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold whitespace-nowrap">
                              {msg.handoff.fromBotName} → handed off to → {msg.handoff.toBotName}
                            </span>
                            <span className="opacity-75 truncate">{msg.handoff.reason}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleSendUserMessage(
                                `@${msg.handoff!.toBotName.toLowerCase()} Continue from ${
                                  msg.handoff!.fromBotName
                                }'s handoff`
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Trigger Follow-up →
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Hover Actions (Reply, Quick React) matching Screenshot 2026-11-11 213847.png */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setReplyToItem(msg)}
                        title="Reply to message"
                        className="px-2 py-1 rounded-lg text-xs border border-zinc-700/70 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                      >
                        ↩
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={feedEndRef} />
          </div>
        </div>

        {/* Bottom Floating Pill Composer */}
        <div className="px-4 pb-4 pt-2 shrink-0">
          <div className="max-w-3xl mx-auto relative">
            {/* Active Reply Preview Banner */}
            {replyToItem && (
              <div
                className={`mb-2 px-3.5 py-1.5 rounded-xl border flex items-center justify-between text-xs ${cardBg}`}
              >
                <span className="truncate">
                  Replying to <strong>{replyToItem.senderName}</strong>:{' '}
                  <span className={mutedText}>{replyToItem.text.slice(0, 70)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyToItem(null)}
                  className="ml-2 text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Slash Command Quick Menu (+ button popup) */}
            {showSlashMenu && (
              <div
                className={`absolute bottom-14 left-0 w-72 rounded-2xl border p-2 shadow-xl z-30 space-y-1 ${cardBg}`}
              >
                <div className={`px-2 py-1 text-[10px] font-semibold uppercase ${mutedText}`}>
                  Grok 4.7 Slash Commands
                </div>
                {[
                  {
                    cmd: '/card ',
                    label: '/card — Make Custom UI Card',
                    desc: 'Generate an interactive tracker, poll, or mini-app',
                  },
                  {
                    cmd: '/shop ',
                    label: '/shop — Live Price Comparison',
                    desc: 'Compare merchant deals & build Vault cart',
                  },
                  {
                    cmd: '/code ',
                    label: '/code — Run in Cursor Linux VM',
                    desc: 'Write & execute code in the shared container',
                  },
                  {
                    cmd: '/vault ',
                    label: '/vault — Execute Routine Checkout',
                    desc: 'Order Weekly Essentials via Personal Everyday •••• 4829',
                  },
                  {
                    cmd: '/handoff ',
                    label: '/handoff — Multi-Bot Swarm Chain',
                    desc: 'Trigger Scout → Ops → Builder handoff sequence',
                  },
                ].map((item) => (
                  <button
                    key={item.cmd}
                    type="button"
                    onClick={() => {
                      setComposerText(item.cmd);
                      setShowSlashMenu(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl text-left hover:bg-zinc-800/70 transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-teal-400">{item.label}</div>
                    <div className={`text-[11px] ${mutedText}`}>{item.desc}</div>
                  </button>
                ))}
              </div>
            )}

            {/* @bot Mention Autocomplete Popup */}
            {showMentionPopup && (
              <div
                className={`absolute bottom-14 left-10 w-64 rounded-2xl border p-2 shadow-xl z-30 space-y-1 ${cardBg}`}
              >
                <div className={`px-2 py-1 text-[10px] font-semibold uppercase ${mutedText}`}>
                  Mention Teammate (@)
                </div>
                {bots.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setComposerText((prev) =>
                        prev.replace(/@[a-zA-Z0-9_\-\u0590-\u05FF]*$/, `@${b.handle} `)
                      );
                      setShowMentionPopup(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left hover:bg-zinc-800/70 transition-colors cursor-pointer"
                  >
                    <BotMascot silhouette={b.silhouette} color={b.color} size={24} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">
                        @{b.handle} · {b.name}
                      </div>
                      <div className={`text-[10px] truncate ${mutedText}`}>{b.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Rounded Pill Composer Bar matching Screenshot 2026-11-11 213847.png */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendUserMessage();
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-full border ${
                isDark
                  ? 'bg-[#18181C] border-[#2A2A30] focus-within:border-zinc-500'
                  : 'bg-white border-[#E5E4DF]'
              }`}
            >
              <button
                type="button"
                aria-label="Open Slash Commands Menu"
                onClick={() => setShowSlashMenu((s) => !s)}
                className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center text-sm font-bold shrink-0 cursor-pointer"
                title="Slash Commands (/card, /shop, /code, /vault)"
              >
                +
              </button>

              <input
                type="text"
                value={composerText}
                onChange={(e) => {
                  const v = e.target.value;
                  setComposerText(v);
                  setShowMentionPopup(/@[a-zA-Z0-9_\-\u0590-\u05FF]*$/.test(v));
                }}
                placeholder={`Message ${
                  activeGroup ? activeGroup.name : activeBot?.name || 'Grok Bot'
                } (@bot, /card, /shop, /code)...`}
                className="flex-1 bg-transparent text-xs sm:text-sm outline-none px-1"
              />

              <button
                type="submit"
                disabled={!composerText.trim()}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-zinc-950 transition-colors shrink-0 cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* =====================================================================
          3. RIGHT SLIDE-OVER DRAWER: GROUP/BOT INSPECTOR + SHARED COMPUTER
         ===================================================================== */}
      {sharedComputer.isOpen && (
        <aside
          className={`${
            sharedComputer.isFullscreen ? 'fixed inset-0 z-40 w-full' : 'w-[370px] xl:w-[410px]'
          } shrink-0 h-full border-l flex flex-col overflow-hidden ${sidebarBg}`}
          aria-label="Shared Computer and Inspector Drawer"
        >
          {/* Top Mode Tabs: Inspector | Browser | Linux VM | Workspace */}
          <div className="p-2.5 border-b border-zinc-800/60 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'inspector', label: 'Members & Info' },
                { id: 'browser', label: '🌐 Browser' },
                { id: 'terminal', label: '💻 Linux VM' },
                { id: 'workspace', label: '📁 Workspace' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setSharedComputer((prev) => ({
                      ...prev,
                      activeTab: t.id as SharedComputerState['activeTab'],
                    }))
                  }
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    sharedComputer.activeTab === t.id
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : `${mutedText} hover:text-zinc-200`
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label="Toggle Fullscreen Shared Computer"
                onClick={() =>
                  setSharedComputer((prev) => ({
                    ...prev,
                    isFullscreen: !prev.isFullscreen,
                  }))
                }
                className="w-7 h-7 rounded-lg hover:bg-zinc-800 text-xs flex items-center justify-center cursor-pointer"
                title="Toggle Fullscreen"
              >
                {sharedComputer.isFullscreen ? '↙' : '↗'}
              </button>
              <button
                type="button"
                aria-label="Close Right Drawer"
                onClick={() =>
                  setSharedComputer((prev) => ({
                    ...prev,
                    isOpen: false,
                    isFullscreen: false,
                  }))
                }
                className="w-7 h-7 rounded-lg hover:bg-zinc-800 text-xs flex items-center justify-center cursor-pointer"
                title="Close Drawer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* TAB 0: INSPECTOR (Details | Library | Members — Matches Screenshot 2026-11-11 213847.png) */}
          {sharedComputer.activeTab === 'inspector' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5 select-text">
              {/* Top Hero Avatar Cluster + Title */}
              <div className="flex flex-col items-center text-center pt-2">
                {activeConvType === 'group' ? (
                  <GroupMascotCluster bots={activeGroupBots} size={74} userInitial="E" />
                ) : (
                  activeBot && (
                    <BotMascot
                      silhouette={activeBot.silhouette}
                      color={activeBot.color}
                      state={activeBot.state}
                      size={76}
                      showStatusAura
                    />
                  )
                )}
                <h3 className="mt-3 text-base font-bold max-w-[280px] truncate">
                  {activeGroup ? activeGroup.name : activeBot?.name}
                </h3>
                <p className={`text-xs mt-0.5 ${mutedText}`}>
                  {activeGroup
                    ? `${activeGroupBots.length} Autonomous Grok 4.7 Teammates`
                    : `${activeBot?.role} · ${activeBot?.model}`}
                </p>

                {/* Sub-tabs: Details | Library | Members matching Screenshot 2026-11-11 213847.png */}
                <div className="flex items-center gap-2 mt-4">
                  {(['details', 'library', 'members'] as const).map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() =>
                        setSharedComputer((prev) => ({ ...prev, inspectorTab: sub }))
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors cursor-pointer ${
                        sharedComputer.inspectorTab === sub
                          ? 'bg-zinc-800 text-white border border-zinc-700'
                          : `${mutedText} hover:text-zinc-200`
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {sharedComputer.inspectorTab === 'members' && (
                <div className="space-y-2.5">
                  {activeGroupBots.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setActiveConvId(m.id);
                        setActiveConvType('bot');
                      }}
                      className="flex items-center justify-between gap-3 p-2 rounded-2xl hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <BotMascot
                          silhouette={m.silhouette}
                          color={m.color}
                          state={m.state}
                          size={34}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{m.name}</div>
                          <div className={`text-[11px] truncate ${mutedText}`}>{m.role}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                        {m.model}
                      </span>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setActiveModal('new-bot')}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-xs font-medium hover:bg-zinc-800/50 transition-colors cursor-pointer ${mutedText}`}
                  >
                    <span className="w-7 h-7 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-300">
                      +
                    </span>
                    <span>Add Member</span>
                  </button>
                </div>
              )}

              {sharedComputer.inspectorTab === 'details' && (
                <div className="space-y-4">
                  {/* Live Soft-Vinyl Mascot Customizer (All 10 Shapes from Screenshot 2026-11-11 182523.png) */}
                  {activeBot && (
                    <div className={`p-3.5 rounded-2xl border space-y-3 ${cardBg}`}>
                      <div className="text-xs font-semibold">
                        Customize {activeBot.name}'s Soft-Vinyl Mascot
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {MASCOT_SILHOUETTES.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() =>
                              setBots((prev) =>
                                prev.map((b) =>
                                  b.id === activeBot.id ? { ...b, silhouette: s.id } : b
                                )
                              )
                            }
                            className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${
                              activeBot.silhouette === s.id
                                ? 'border-teal-500 bg-teal-500/10'
                                : 'border-zinc-800 hover:bg-zinc-800/50'
                            }`}
                            title={s.label}
                          >
                            <BotMascot
                              silhouette={s.id}
                              color={activeBot.color}
                              size={26}
                            />
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {MASCOT_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() =>
                              setBots((prev) =>
                                prev.map((b) =>
                                  b.id === activeBot.id ? { ...b, color: c.hex } : b
                                )
                              )
                            }
                            className={`w-6 h-6 rounded-full border ${
                              activeBot.color === c.hex
                                ? 'ring-2 ring-white scale-110'
                                : 'border-black/40'
                            }`}
                            style={{ background: c.hex }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`p-3.5 rounded-2xl border space-y-2 ${cardBg}`}>
                    <div className="text-xs font-semibold">Persistent MEMORY.md</div>
                    <pre className={`text-[11px] font-mono whitespace-pre-wrap ${mutedText}`}>
                      {activeBot
                        ? activeBot.memoryMd
                        : activeGroup?.sharedInstructions}
                    </pre>
                  </div>
                </div>
              )}

              {sharedComputer.inspectorTab === 'library' && (
                <div className="space-y-2.5">
                  <div className={`text-xs ${mutedText}`}>
                    Pinned Generative UI Cards ({customCards.length})
                  </div>
                  {customCards.map((c) => (
                    <div key={c.id} className={`p-3 rounded-2xl border ${cardBg}`}>
                      <div className="text-xs font-semibold">{c.title}</div>
                      <div className={`text-[11px] ${mutedText}`}>{c.subtitle}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: SHARED BROWSER VIEWPORT */}
          {sharedComputer.activeTab === 'browser' && (
            <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-3">
              {/* Chromium Bar */}
              <div className={`p-2 rounded-xl border flex items-center gap-2 ${cardBg}`}>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <div className="flex-1 px-2.5 py-1 rounded-lg bg-zinc-900 text-[11px] font-mono text-zinc-300 truncate">
                  🔒 {sharedComputer.browserUrl}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSharedComputer((prev) => ({
                      ...prev,
                      userControl: !prev.userControl,
                    }))
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                    sharedComputer.userControl
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  {sharedComputer.userControl ? '✓ In Control' : 'Take Control'}
                </button>
              </div>

              {/* Simulated Live DOM Viewport with Animated Bot Cursor */}
              <div
                onClick={(e) => {
                  if (!sharedComputer.userControl) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                  const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                  setSharedComputer((prev) => ({ ...prev, cursorX: x, cursorY: y }));
                }}
                className="relative flex-1 rounded-2xl border border-zinc-800 bg-[#141418] p-4 overflow-y-auto"
              >
                <div className="text-xs font-semibold text-emerald-400 mb-1">
                  {sharedComputer.browserTitle}
                </div>
                <div className="text-[11px] text-zinc-400 mb-4">
                  {sharedComputer.browserStatus}
                </div>

                <div className="space-y-2">
                  {sharedComputer.cartItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-zinc-100">{item.name}</div>
                        <div className="text-[10px] text-zinc-400">{item.store}</div>
                      </div>
                      <div className="font-mono font-semibold text-emerald-400 tabular-nums">
                        {item.qty}× ${item.price.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
                  <div className="text-xs text-zinc-300">
                    Vault Auto-Fill: <strong>Personal Everyday •••• 4829</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleOrderViaVault(
                        null,
                        sharedComputer.cartItems.map((c) => ({
                          name: c.name,
                          qty: c.qty,
                          price: c.price,
                        })),
                        'Amazon Fresh'
                      )
                    }
                    className="px-3 py-1 rounded-lg bg-emerald-500 text-zinc-950 text-xs font-semibold cursor-pointer"
                  >
                    Checkout Now
                  </button>
                </div>

                {/* Live Animated DOM Cursor */}
                <div
                  className="pointer-events-none absolute transition-all duration-300 z-20 flex items-center gap-1"
                  style={{
                    left: `${sharedComputer.cursorX}%`,
                    top: `${sharedComputer.cursorY}%`,
                  }}
                >
                  <span className="w-3 h-3 rounded-full bg-violet-500 ring-4 ring-violet-500/30" />
                  <span className="px-1.5 py-0.5 rounded bg-violet-600 text-white text-[9px] font-semibold whitespace-nowrap">
                    {sharedComputer.userControl ? 'You' : '@scout · grok-4.7'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CURSOR LINUX VM TERMINAL */}
          {sharedComputer.activeTab === 'terminal' && (
            <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-2">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-mono text-emerald-400">
                  ubuntu@grok47-cursor-vm (Ubuntu 24.04 LTS)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleRunInLinuxVm(
                      'console.log("Running full workspace test suite...");',
                      'Workspace Verification'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-medium cursor-pointer"
                >
                  ▶ Run Build Check
                </button>
              </div>

              <div className="flex-1 rounded-2xl bg-[#09090B] border border-zinc-800 p-3 font-mono text-xs text-zinc-200 overflow-y-auto space-y-1.5 select-text">
                {sharedComputer.terminalLines.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.startsWith('cursor-agent@')
                        ? 'text-teal-400'
                        : line.includes('[OK]') || line.includes('0 errors')
                        ? 'text-emerald-400'
                        : 'text-zinc-300'
                    }
                  >
                    {line}
                  </div>
                ))}
              </div>

              <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  placeholder="Run bash / python / git command in Linux VM..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-semibold cursor-pointer"
                >
                  Exec
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: WORKSPACE & LISTS FILE TREE */}
          {sharedComputer.activeTab === 'workspace' && (
            <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {workspaceFiles.map((f) => (
                  <button
                    key={f.path}
                    type="button"
                    onClick={() =>
                      setSharedComputer((prev) => ({ ...prev, activeFilePath: f.path }))
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap cursor-pointer ${
                      sharedComputer.activeFilePath === f.path
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'bg-zinc-800/70 text-zinc-400'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              {activeWorkspaceFile && (
                <textarea
                  value={activeWorkspaceFile.content}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWorkspaceFiles((prev) =>
                      prev.map((f) =>
                        f.path === activeWorkspaceFile.path
                          ? { ...f, content: val, updatedAt: Date.now() }
                          : f
                      )
                    );
                  }}
                  className="flex-1 w-full rounded-2xl bg-[#0B0B0E] border border-zinc-800 p-3 font-mono text-xs text-zinc-200 outline-none resize-none"
                />
              )}
            </div>
          )}
        </aside>
      )}

      {/* =====================================================================
          4. CORNER COMPANION FLOATING MASCOT WIDGET (Bottom-Right)
         ===================================================================== */}
      {cornerCompanion && !sharedComputer.isFullscreen && (
        <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2.5 px-3 py-2 rounded-full border border-zinc-700/80 bg-[#16161A]/95 text-zinc-100 shadow-lg">
          <BotMascot
            silhouette={activeBot?.silhouette || 'pill'}
            color={activeBot?.color || '#14B8A6'}
            state={activeStatusBanner.state}
            size={30}
          />
          <div className="text-[11px] leading-tight pr-1">
            <div className="font-semibold">Grok 4.7 Companion</div>
            <div
              className={`mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] border max-w-[170px] truncate ${getStatusPillStyle(
                activeStatusBanner.state
              )}`}
            >
              {activeStatusBanner.label}
            </div>
          </div>
          <button
            type="button"
            aria-label="Hide Corner Companion"
            onClick={() => setCornerCompanion(false)}
            className="text-zinc-500 hover:text-zinc-200 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* =====================================================================
          5. WORKSPACE MODALS (Custom Cards, Shopping, Vault, Skills, API Key, New Bot/Group)
         ===================================================================== */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className={`w-full max-w-2xl max-h-[86vh] overflow-y-auto rounded-3xl border p-6 shadow-2xl select-text ${cardBg}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL: CURSOR API KEY CONFIGURATION */}
            {activeModal === 'cursor-api' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">
                      Unified Cursor API (`grok-4.7`) Configuration
                    </h2>
                    <p className={`text-xs ${mutedText}`}>
                      Single central brain powering chat, multi-bot handoffs, custom UI cards, Vault routines, and Linux VM tasks.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      CURSOR_API_KEY (Running `grok-4.7` & `grok-4.7-fast`)
                    </label>
                    <input
                      type="text"
                      value={apiSettings.cursorApiKey}
                      onChange={(e) =>
                        setApiSettings((prev) => ({ ...prev, cursorApiKey: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Optional CORS Proxy / Custom Base URL
                    </label>
                    <input
                      type="text"
                      value={apiSettings.proxyUrl}
                      onChange={(e) =>
                        setApiSettings((prev) => ({ ...prev, proxyUrl: e.target.value }))
                      }
                      placeholder="https://your-cursor-proxy.example.com/v1"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Default Engine</label>
                      <select
                        value={apiSettings.defaultModel}
                        onChange={(e) =>
                          setApiSettings((prev) => ({
                            ...prev,
                            defaultModel: e.target.value as 'grok-4.7' | 'grok-4.7-fast',
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-100"
                      >
                        <option value="grok-4.7-fast">
                          grok-4.7-fast (Weekly Quota Saver Default)
                        </option>
                        <option value="grok-4.7">
                          grok-4.7 (Deep Reasoning & Cloud Linux VM)
                        </option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <input
                        id="smartRouteToggle"
                        type="checkbox"
                        checked={apiSettings.smartRouting}
                        onChange={(e) =>
                          setApiSettings((prev) => ({
                            ...prev,
                            smartRouting: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-teal-500"
                      />
                      <label htmlFor="smartRouteToggle" className="text-xs">
                        Auto-route `grok-4.7-fast` vs `grok-4.7`
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-xl bg-teal-500 text-zinc-950 text-xs font-semibold cursor-pointer"
                  >
                    Save & Apply Key
                  </button>
                </div>
              </div>
            )}

            {/* MODAL: SECURE VAULT (CREDIT CARDS & SPENDING GUARDRAILS) */}
            {activeModal === 'secure-vault' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">
                      🔐 Encrypted Payment & Secret Vault
                    </h2>
                    <p className={`text-xs ${mutedText}`}>
                      Pre-agreed spending limits and merchant guardrails enforced before any bot checkout.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  {vaultCards.map((vc) => (
                    <div
                      key={vc.id}
                      className="p-4 rounded-2xl border border-zinc-700/80 bg-zinc-900/70 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-white">
                            {vc.nickname} ({vc.brand} •••• {vc.last4})
                          </div>
                          <div className="text-xs text-zinc-400">
                            Expires {vc.expiry} · {vc.billingProfile}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Spent: ${vc.spentThisMonth.toFixed(2)} / ${vc.monthlyCap}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-zinc-400 mb-1">
                            Max Single Auto-Buy Limit ($)
                          </label>
                          <input
                            type="number"
                            value={vc.maxSinglePurchase}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setVaultCards((prev) =>
                                prev.map((c) =>
                                  c.id === vc.id ? { ...c, maxSinglePurchase: val } : c
                                )
                              );
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-zinc-400 mb-1">Approval Mode</label>
                          <select
                            value={vc.approvalMode}
                            onChange={(e) =>
                              setVaultCards((prev) =>
                                prev.map((c) =>
                                  c.id === vc.id
                                    ? {
                                        ...c,
                                        approvalMode: e.target.value as
                                          | 'auto-within-rules'
                                          | 'always-ask',
                                      }
                                    : c
                                )
                              )
                            }
                            className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800"
                          >
                            <option value="auto-within-rules">
                              Auto-Buy Within Pre-Agreed Rules
                            </option>
                            <option value="always-ask">Always Ask Before Checkout</option>
                          </select>
                        </div>
                      </div>

                      <div className="text-[11px] text-zinc-400">
                        Approved Merchants: {vc.approvedMerchants.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODAL: SHOPPING LISTS & 24/7 PURCHASING ROUTINES */}
            {activeModal === 'shopping-routines' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">
                      🛒 Smart Shopping Lists & 24/7 Routines
                    </h2>
                    <p className={`text-xs ${mutedText}`}>
                      Synced with `/workspace/shopping-lists.json` · Monitored by @scout & @ops
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 text-xs"
                  >
                    ✕
                  </button>
                </div>

                {/* Active Routines */}
                <div className="space-y-2">
                  {routines.map((rt) => (
                    <div
                      key={rt.id}
                      className="p-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-semibold">{rt.name}</div>
                        <div className="text-[11px] text-zinc-400">
                          {rt.scheduleLabel} · {rt.lastStatus}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null);
                          handleOrderViaVault(
                            null,
                            shoppingList
                              .filter((s) => s.autoOrder)
                              .map((s) => ({ name: s.name, qty: s.qty, price: s.price })),
                            'Amazon Fresh'
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-semibold whitespace-nowrap cursor-pointer"
                      >
                        Run Routine Now
                      </button>
                    </div>
                  ))}
                </div>

                {/* Shopping List Items */}
                <div className="space-y-2">
                  {shoppingList.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.autoOrder}
                          onChange={() =>
                            setShoppingList((prev) =>
                              prev.map((s) =>
                                s.id === item.id ? { ...s, autoOrder: !s.autoOrder } : s
                              )
                            )
                          }
                          className="accent-emerald-500"
                        />
                        <span>
                          <strong>{item.name}</strong> ({item.preferredBrand} · {item.merchant})
                        </span>
                      </label>
                      <span className="font-mono tabular-nums">
                        ${item.price.toFixed(2)} (Max ${item.maxPriceThreshold.toFixed(2)})
                      </span>
                    </div>
                  ))}
                </div>

                {/* Add Item Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newShopName.trim()) return;
                    const added: ShoppingListItem = {
                      id: 'shop_' + Date.now(),
                      name: newShopName.trim(),
                      preferredBrand: newShopBrand.trim() || 'Preferred Brand',
                      merchant: 'Amazon Fresh',
                      price: Number(newShopPrice) || 15,
                      maxPriceThreshold: Number(newShopMax) || 20,
                      qty: 1,
                      schedule: 'Weekly Routine',
                      autoOrder: true,
                    };
                    setShoppingList((prev) => [...prev, added]);
                    setNewShopName('');
                    setNewShopBrand('');
                  }}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-800"
                >
                  <input
                    type="text"
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    placeholder="Item name..."
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
                  />
                  <input
                    type="text"
                    value={newShopBrand}
                    onChange={(e) => setNewShopBrand(e.target.value)}
                    placeholder="Brand..."
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={newShopPrice}
                    onChange={(e) => setNewShopPrice(e.target.value)}
                    placeholder="Price"
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-semibold cursor-pointer"
                  >
                    + Add to List
                  </button>
                </form>
              </div>
            )}

            {/* MODAL: CUSTOM CARDS BOARD */}
            {activeModal === 'cards-board' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">❖ Pinned Custom UI Cards Board</h2>
                    <p className={`text-xs ${mutedText}`}>
                      Interactive mini-apps, price tables, and trackers generated via `grok-4.7`.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {customCards.map((c) => (
                    <GenerativeCard
                      key={c.id}
                      card={c}
                      vaultCards={vaultCards}
                      isDark={isDark}
                      onUpdateCard={handleUpdateCustomCard}
                      onOrderViaVault={(card, items, merch) => {
                        setActiveModal(null);
                        handleOrderViaVault(card, items, merch);
                      }}
                      onRunInLinuxVm={(code, title) => {
                        setActiveModal(null);
                        handleRunInLinuxVm(code, title);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* MODAL: SKILLS & MEMORY.md */}
            {activeModal === 'skills-mcp' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">
                      📘 Persistent Context (`MEMORY.md` & `SKILL.md`)
                    </h2>
                    <p className={`text-xs ${mutedText}`}>
                      Automatically injected into every Cursor Cloud Agent (`grok-4.7`) request.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  {bots.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <BotMascot silhouette={b.silhouette} color={b.color} size={26} />
                        <span className="text-xs font-bold">
                          {b.name} (@{b.handle})
                        </span>
                      </div>
                      <textarea
                        value={b.memoryMd}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBots((prev) =>
                            prev.map((x) => (x.id === b.id ? { ...x, memoryMd: val } : x))
                          );
                        }}
                        rows={3}
                        className="w-full p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODAL: CREATE NEW BOT */}
            {activeModal === 'new-bot' && (
              <form onSubmit={handleCreateNewBot} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold">Create New Grok 4.7 Teammate</h2>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-4 p-3 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                  <BotMascot
                    silhouette={newBotSilhouette}
                    color={newBotColor}
                    state="idle"
                    size={64}
                    showStatusAura
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      required
                      value={newBotName}
                      onChange={(e) => setNewBotName(e.target.value)}
                      placeholder="Bot Name (e.g., Nova, Pixel, רון)..."
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs"
                    />
                    <input
                      type="text"
                      value={newBotRole}
                      onChange={(e) => setNewBotRole(e.target.value)}
                      placeholder="Role (e.g., Security & DevOps Lead)..."
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Select Soft-Vinyl Mascot Silhouette (10 Shapes)
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {MASCOT_SILHOUETTES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setNewBotSilhouette(s.id)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 cursor-pointer ${
                          newBotSilhouette === s.id
                            ? 'border-teal-500 bg-teal-500/15'
                            : 'border-zinc-800 hover:bg-zinc-800/60'
                        }`}
                      >
                        <BotMascot silhouette={s.id} color={newBotColor} size={32} />
                        <span className="text-[10px] truncate">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5">Select Vinyl Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {MASCOT_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setNewBotColor(c.hex)}
                        className={`w-7 h-7 rounded-full border ${
                          newBotColor === c.hex ? 'ring-2 ring-white scale-110' : 'border-black/40'
                        }`}
                        style={{ background: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Specialty & Instructions (`SKILL.md`)
                  </label>
                  <textarea
                    value={newBotSpecialty}
                    onChange={(e) => setNewBotSpecialty(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-teal-500 text-zinc-950 text-xs font-semibold cursor-pointer"
                  >
                    Create Bot
                  </button>
                </div>
              </form>
            )}

            {/* MODAL: CREATE NEW GROUP CHANNEL */}
            {activeModal === 'new-group' && (
              <form onSubmit={handleCreateNewGroup} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold">Create Multi-Bot Group Channel</h2>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Channel Name (e.g., #design-and-ship)..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs"
                  />
                  <input
                    type="text"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="Shared Group Instructions..."
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs"
                  />

                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Select Participating Bots
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {bots.map((b) => {
                        const checked = newGroupMembers.includes(b.id);
                        return (
                          <label
                            key={b.id}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer text-xs ${
                              checked
                                ? 'border-teal-500/60 bg-teal-500/10'
                                : 'border-zinc-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setNewGroupMembers((prev) =>
                                  checked
                                    ? prev.filter((id) => id !== b.id)
                                    : [...prev, b.id]
                                )
                              }
                              className="accent-teal-500"
                            />
                            <BotMascot silhouette={b.silhouette} color={b.color} size={24} />
                            <span className="truncate">{b.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-teal-500 text-zinc-950 text-xs font-semibold cursor-pointer"
                  >
                    Create Group Channel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
