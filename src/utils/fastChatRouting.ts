export type FastThinkingLevel = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface FastChatRouteInput {
  level?: number;
  mode?: string;
  answerLength?: string;
  maxTokens?: number;
  isLslChat?: boolean;
  userText?: string;
}

export interface FastChatRoutePlan {
  isTurbo: boolean;
  isUltra: boolean;
  isFastMode: boolean;
  isCodeOrUi: boolean;
  preferQuality: boolean;
  primaryModel: string;
  primaryThinking: FastThinkingLevel;
  secondaryModel: string;
  secondaryThinking: FastThinkingLevel;
  /** Delay before launching secondary model if primary has not emitted its first token yet. */
  hedgeDelayMs: number;
  /** Overall Gemini first-token deadline before falling back to secondary providers. */
  firstTokenTimeoutMs: number;
  /** Cooldown applied only on actual API error (kept short for lite model so transient hiccups recover fast). */
  errorCooldownMs: number;
  /** OVH Kepler fallback first-token deadline. */
  ovhTimeoutMs: number;
  maxOutputTokens: number;
}

const FAST_MODE_TOKEN_CAPS: Record<string, number> = {
  short: 420,
  medium: 1100,
  detailed: 1600,
  long: 2400,
};

export function detectCodeOrUiRequest(text: string): boolean {
  const s = String(text || '');
  if (!s.trim()) return false;
  return (
    /\b(html|css|javascript|typescript|python|react|lsl|matlab|sql|java|c\+\+|rust|golang|code|script|program|widget|calculator|dashboard|landing\s*page|mini[- ]?app|simulator|build\s+(me\s+)?a|create\s+(me\s+)?a|make\s+(me\s+)?a|write\s+(a\s+)?(function|class|script|code|app|ui|game)|interactive\s+(ui|app|tool|demo|quiz|chart))\b/i.test(
      s
    ) ||
    /(תבנה|בנה\s+לי|תיצור|צור\s+לי|תכין\s+לי|קוד|סקריפט|מחשבון|אפליקציה|אתר|ממשק|טבלה\s+אינטראקטיבית|משחק)/i.test(s)
  );
}

export function planFastChatRoute(input: FastChatRouteInput = {}): FastChatRoutePlan {
  const level = Number.isFinite(Number(input.level)) ? Number(input.level) : 1;
  const mode = String(input.mode || '').trim().toLowerCase();
  const isUltra = level === 4 || mode === 'ultra';
  const isTurbo = level === 0 || mode === 'fast';
  const isFastMode = isTurbo || isUltra;
  const isLslChat = Boolean(input.isLslChat);
  const isCodeOrUi = isLslChat || detectCodeOrUiRequest(input.userText || '');
  const requestedMax = Math.min(Math.max(Number(input.maxTokens) || 4096, 200), 8192);
  const lenKey = String(input.answerLength || 'medium').trim().toLowerCase();

  if (isLslChat) {
    return {
      isTurbo,
      isUltra,
      isFastMode,
      isCodeOrUi: true,
      preferQuality: true,
      primaryModel: 'gemini-4-hydrogen',
      primaryThinking: 'MEDIUM',
      secondaryModel: 'gemini-3.1-flash-lite',
      secondaryThinking: 'LOW',
      hedgeDelayMs: 0,
      firstTokenTimeoutMs: 11000,
      errorCooldownMs: 15000,
      ovhTimeoutMs: 2800,
      maxOutputTokens: 8192,
    };
  }

  if (isFastMode) {
    const cap = isCodeOrUi
      ? Math.max(requestedMax, 3600)
      : Math.min(requestedMax, FAST_MODE_TOKEN_CAPS[lenKey] ?? FAST_MODE_TOKEN_CAPS.medium);
    return {
      isTurbo,
      isUltra,
      isFastMode: true,
      isCodeOrUi,
      preferQuality: false,
      primaryModel: 'gemini-3.1-flash-lite',
      primaryThinking: isUltra ? 'LOW' : 'MINIMAL',
      secondaryModel: 'gemini-4-hydrogen',
      secondaryThinking: 'LOW',
      hedgeDelayMs: isUltra ? 750 : 1100,
      firstTokenTimeoutMs: isUltra ? 2800 : 2500,
      errorCooldownMs: 6000,
      ovhTimeoutMs: 1350,
      maxOutputTokens: Math.min(Math.max(cap, 250), 8192),
    };
  }

  const deepThinking: FastThinkingLevel = level >= 3 ? 'MEDIUM' : 'LOW';
  return {
    isTurbo: false,
    isUltra: false,
    isFastMode: false,
    isCodeOrUi,
    preferQuality: false,
    primaryModel: 'gemini-4-hydrogen',
    primaryThinking: deepThinking,
    secondaryModel: 'gemini-3.1-flash-lite',
    secondaryThinking: 'MINIMAL',
    hedgeDelayMs: 2200,
    firstTokenTimeoutMs: 8500,
    errorCooldownMs: 15000,
    ovhTimeoutMs: 2500,
    maxOutputTokens: requestedMax,
  };
}

export function buildFastSpeedDirective(input: FastChatRouteInput = {}): string {
  const plan = planFastChatRoute(input);
  if (input.isLslChat || !plan.isFastMode) return '';

  const noWidgetsHint = plan.isCodeOrUi
    ? ''
    : ' Do NOT emit heavy JSON loki-* widget blocks or long ASCII/Mermaid diagrams unless the user explicitly asks for one — use crisp Markdown headings, bullets, or a compact Markdown table instead.';

  if (plan.isUltra) {
    return `\n\n[ULTRA SPEED + PRECISION MODE: Deliver the single best, deepest, most accurate answer possible within 1-5 seconds. Lead immediately with the direct conclusion on sentence 1 with zero filler or preamble, include concrete facts/examples/code where helpful, and structure clearly in the user's language.${noWidgetsHint}]`;
  }

  return `\n\n[TURBO SPEED MODE: Deliver the clearest, highest-value answer in 1-5 seconds. Start immediately with the direct answer on sentence 1, keep every sentence high-signal with zero filler or repetition, and give a complete, helpful response in the user's language.${noWidgetsHint}]`;
}
