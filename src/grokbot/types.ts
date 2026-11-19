export type MascotSilhouette =
  | 'blob'      // 1. Classic Blob (tilted smooth circle)
  | 'cloud'     // 2. Cloud Puff (scalloped puffy cloud)
  | 'cube'      // 3. Cube Buddy (tilted rounded square)
  | 'star'      // 4. Star Spark / Neko Bot (4-pointed soft star)
  | 'neko'      // Alias for Star/Neko silhouette
  | 'clover'    // 5. Clover Puff (4-lobed tilted peanut/clover)
  | 'heart'     // 6. Heart Blob (plump tilted heart)
  | 'flower'    // 7. Flower Puff (8-petal scalloped flower)
  | 'drop'      // 8. Teardrop Buddy (plump egg/teardrop)
  | 'pill'      // 9. Pill Bot (tilted capsule pill with floating hands)
  | 'triangle'; // 10. Triangle Buddy (soft rounded triangle)

export type MascotAnimationState =
  | 'idle'
  | 'thinking'
  | 'browsing'
  | 'coding'
  | 'purchasing'
  | 'approval'
  | 'celebrating';

export type CursorModelId = 'grok-4.7' | 'grok-4.7-fast';

export interface GrokBotAgent {
  id: string;
  name: string;
  handle: string;
  role: string;
  specialty: string;
  color: string;
  silhouette: MascotSilhouette;
  state: MascotAnimationState;
  model: CursorModelId;
  pinned: boolean;
  memoryMd: string;
  skillMd: string;
  linkedVaultCardId?: string;
}

export type GroupOrchestrationMode = 'auto-orchestrate' | 'parallel-swarm';

export interface GrokGroupChannel {
  id: string;
  name: string;
  handle: string;
  description: string;
  memberBotIds: string[];
  mode: GroupOrchestrationMode;
  sharedInstructions: string;
}

export interface ShoppingComparisonRow {
  id: string;
  name: string;
  store: string;
  unitPrice: number;
  qty: number;
  checked: boolean;
  tag: string;
}

export interface TrackerGoalRow {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  done: boolean;
}

export interface CustomUICard {
  id: string;
  title: string;
  subtitle: string;
  category: 'shopping' | 'tracker' | 'mini-app';
  createdByBotId: string;
  createdByBotName: string;
  createdAt: number;
  pinnedToBoard: boolean;
  // For shopping comparison cards
  shoppingRows?: ShoppingComparisonRow[];
  vaultCardId?: string;
  // For tracker/dashboard cards
  trackerRows?: TrackerGoalRow[];
  pollQuestion?: string;
  pollOptions?: Array<{ id: string; label: string; votes: number }>;
  // For mini-app / code cards
  miniAppType?: 'pomodoro' | 'roi-calc' | 'theme-shader' | 'custom-code';
  codeSnippet?: string;
  codeLanguage?: string;
}

export interface VaultCard {
  id: string;
  nickname: string;
  last4: string;
  expiry: string;
  billingProfile: string;
  brand: 'Visa' | 'Mastercard' | 'Amex';
  color: string;
  maxSinglePurchase: number;
  monthlyCap: number;
  spentThisMonth: number;
  approvedMerchants: string[];
  approvalMode: 'auto-within-rules' | 'always-ask';
}

export interface ShoppingListItem {
  id: string;
  name: string;
  preferredBrand: string;
  merchant: string;
  price: number;
  maxPriceThreshold: number;
  qty: number;
  schedule: string;
  autoOrder: boolean;
}

export interface PurchasingRoutine {
  id: string;
  name: string;
  scheduleLabel: string;
  assignedBotId: string;
  vaultCardId: string;
  active: boolean;
  lastRunAt?: number;
  lastStatus?: string;
}

export interface VaultTransactionReceipt {
  id: string;
  vaultCardId: string;
  cardNickname: string;
  cardLast4: string;
  merchant: string;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  status: 'completed' | 'needs_approval' | 'declined';
  reason?: string;
  timestamp: number;
}

export interface HandoffPayload {
  fromBotId: string;
  fromBotName: string;
  toBotId: string;
  toBotName: string;
  reason: string;
}

export interface ChatStreamItem {
  id: string;
  conversationId: string;
  senderType: 'user' | 'bot' | 'system';
  botId?: string;
  senderName: string;
  senderHandle?: string;
  senderColor?: string;
  senderSilhouette?: MascotSilhouette;
  replyToMessageId?: string;
  replyToSender?: string;
  replyToPreview?: string;
  text: string;
  timestamp: number;
  modelUsed?: CursorModelId;
  latencyMs?: number;
  toolLogs?: string[];
  customCard?: CustomUICard;
  handoff?: HandoffPayload;
  vaultReceipt?: VaultTransactionReceipt;
  reactions?: Record<string, number>;
}

export interface WorkspaceFile {
  path: string;
  name: string;
  language: 'markdown' | 'json' | 'typescript' | 'python';
  content: string;
  updatedAt: number;
}

export interface SharedComputerState {
  isOpen: boolean;
  isFullscreen: boolean;
  activeTab: 'browser' | 'terminal' | 'workspace' | 'inspector';
  inspectorTab: 'details' | 'library' | 'members';
  browserUrl: string;
  browserTitle: string;
  browserStatus: string;
  cursorX: number;
  cursorY: number;
  userControl: boolean;
  cartItems: Array<{ name: string; price: number; qty: number; store: string }>;
  terminalLines: string[];
  activeFilePath: string;
}

export interface CursorApiSettings {
  cursorApiKey: string;
  proxyUrl: string;
  defaultModel: CursorModelId;
  smartRouting: boolean;
  requestsThisMinute: number;
  weeklyRequestsSaved: number;
  totalApiCalls: number;
}
