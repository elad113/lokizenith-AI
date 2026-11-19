export interface ReasoningPassTiming {
  level: number;
  passes: string[];
  estimatedMs: number;
  speedupFactor: number;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  engine: string;
}

export interface MascotPosition {
  x: number;
  y: number;
}

export interface MascotLiveKinematics {
  mouthOpen: number;
  leftArmDeg: number;
  rightArmDeg: number;
  headBobPx: number;
  isTalking: boolean;
}

export interface CallVoiceProfile {
  id: string;
  name: string;
  gender: 'male' | 'female';
  pollyVoice: string;
  pitch: number;
  baseRate: number;
  label: string;
}

export const CALL_VOICE_PROFILES: CallVoiceProfile[] = [
  { id: 'male-matthew', name: 'Matthew', gender: 'male', pollyVoice: 'Matthew', pitch: 0.92, baseRate: 1.25, label: 'Deep & Warm Male' },
  { id: 'male-brian',   name: 'Brian',   gender: 'male', pollyVoice: 'Brian',   pitch: 0.95, baseRate: 1.28, label: 'Crisp British Male' },
  { id: 'male-joey',    name: 'Joey',    gender: 'male', pollyVoice: 'Joey',    pitch: 1.00, baseRate: 1.32, label: 'Energetic Fast Male' },
  { id: 'female-joanna', name: 'Joanna', gender: 'female', pollyVoice: 'Joanna', pitch: 1.08, baseRate: 1.25, label: 'Clear Studio Female' },
  { id: 'female-amy',    name: 'Amy',    gender: 'female', pollyVoice: 'Amy',    pitch: 1.12, baseRate: 1.28, label: 'Warm British Female' },
  { id: 'female-salli',  name: 'Salli',  gender: 'female', pollyVoice: 'Salli',  pitch: 1.16, baseRate: 1.30, label: 'Expressive Bright Female' },
];

/**
 * Usage is permanently unlimited across all Lokizenith features.
 */
export function isUsageUnlimited(): boolean {
  return true;
}

/**
 * Detects the language of spoken or typed text so the Voice Call AI responds
 * in the exact language the user spoke.
 */
export function detectSpokenLanguage(text: string, fallback: 'en' | 'he' | 'ar' = 'en'): {
  code: 'en' | 'he' | 'ar' | 'ru' | 'es' | 'fr' | 'de';
  bcp47: string;
  name: string;
} {
  const s = String(text || '').trim();
  if (!s) {
    const map = {
      en: { code: 'en' as const, bcp47: 'en-US', name: 'English' },
      he: { code: 'he' as const, bcp47: 'he-IL', name: 'Hebrew' },
      ar: { code: 'ar' as const, bcp47: 'ar-SA', name: 'Arabic' },
    };
    return map[fallback] || map.en;
  }
  const hebCount = (s.match(/[\u0590-\u05FF]/g) || []).length;
  const arCount = (s.match(/[\u0600-\u06FF]/g) || []).length;
  const ruCount = (s.match(/[\u0400-\u04FF]/g) || []).length;
  if (hebCount > 0 && hebCount >= arCount) {
    return { code: 'he', bcp47: 'he-IL', name: 'Hebrew' };
  }
  if (arCount > 0) {
    return { code: 'ar', bcp47: 'ar-SA', name: 'Arabic' };
  }
  if (ruCount > 1) {
    return { code: 'ru', bcp47: 'ru-RU', name: 'Russian' };
  }
  if (/\b(hola|cómo|estás|gracias|por favor|qué|buenos días)\b/i.test(s)) {
    return { code: 'es', bcp47: 'es-ES', name: 'Spanish' };
  }
  if (/\b(bonjour|merci|comment|s'il vous plaît|oui|très)\b/i.test(s)) {
    return { code: 'fr', bcp47: 'fr-FR', name: 'French' };
  }
  if (/\b(hallo|danke|wie geht|bitte|guten tag)\b/i.test(s)) {
    return { code: 'de', bcp47: 'de-DE', name: 'German' };
  }
  return { code: 'en', bcp47: 'en-US', name: 'English' };
}

/**
 * Computes the reasoning pipeline configuration for a given level (0..4).
 */
export function getReasoningConfig(level: number): ReasoningPassTiming {
  const clamped = Math.max(0, Math.min(4, Math.floor(level || 0)));
  if (clamped === 4) {
    return {
      level: 4,
      passes: ['Plan', 'Draft', 'Critique', 'Perfect'],
      estimatedMs: 2200,
      speedupFactor: 4,
    };
  }
  if (clamped === 3) {
    return {
      level: 3,
      passes: ['Draft', 'Critique', 'Refine'],
      estimatedMs: 3200,
      speedupFactor: 2,
    };
  }
  return {
    level: clamped,
    passes: ['Direct'],
    estimatedMs: clamped === 0 ? 800 : 1600,
    speedupFactor: 1,
  };
}

/**
 * Deduplicates and interleaves research results across all internet research engines.
 */
export function mergeResearchSources(
  engineResults: ResearchSource[][],
  maxCount: number = 10
): ResearchSource[] {
  const seenUrls = new Set<string>();
  const merged: ResearchSource[] = [];
  const maxLen = Math.max(0, ...engineResults.map((r) => r.length));

  for (let i = 0; i < maxLen && merged.length < maxCount; i++) {
    for (const group of engineResults) {
      if (i < group.length) {
        const item = group[i];
        const normUrl = (item.url || '').trim().toLowerCase().replace(/\/+$/, '');
        if (normUrl && !seenUrls.has(normUrl)) {
          seenUrls.add(normUrl);
          merged.push(item);
          if (merged.length >= maxCount) break;
        }
      }
    }
  }
  return merged;
}

/**
 * Normalizes language codes across settings, LokiLessons, and UI components.
 */
export function resolveAppLanguage(langSetting?: string): 'en' | 'he' | 'ar' {
  const clean = String(langSetting || 'en').toLowerCase().slice(0, 2);
  if (clean === 'he' || clean === 'iw') return 'he';
  if (clean === 'ar') return 'ar';
  return 'en';
}

/**
 * Clamps a dragged mascot coordinate within the visible viewport bounds on both X and Y axes.
 */
export function clampMascotPosition(
  x: number,
  y: number,
  viewportW: number,
  viewportH: number,
  mascotSize: number = 56
): MascotPosition {
  const pad = 6;
  const maxX = Math.max(pad, viewportW - mascotSize - pad);
  const maxY = Math.max(pad, viewportH - mascotSize - pad);
  return {
    x: Math.round(Math.max(pad, Math.min(maxX, x))),
    y: Math.round(Math.max(pad, Math.min(maxY, y))),
  };
}

/**
 * Computes real-time mouth and hand kinematics for the Loki mascot based on
 * the current situation (voice call speaking, listening, coding, or idle).
 */
export function computeMascotLiveKinematics(
  situation: 'speaking' | 'listening' | 'coding' | 'thinking' | 'idle',
  timestampMs: number,
  audioLevel: number = 0.5
): MascotLiveKinematics {
  const t = timestampMs / 1000;
  if (situation === 'speaking') {
    const wave = Math.abs(Math.sin(t * 14)) * 0.65 + Math.abs(Math.cos(t * 9)) * 0.35;
    const mouthOpen = Math.min(1, Math.max(0.18, wave * Math.max(0.4, audioLevel)));
    const leftArmDeg = Math.round(Math.sin(t * 6.5) * 38 - 25);
    const rightArmDeg = Math.round(Math.cos(t * 7.2) * 42 + 25);
    const headBobPx = Math.round(Math.sin(t * 5) * 4);
    return { mouthOpen, leftArmDeg, rightArmDeg, headBobPx, isTalking: true };
  }
  if (situation === 'coding') {
    const leftArmDeg = Math.round(Math.sin(t * 18) * 22 - 40);
    const rightArmDeg = Math.round(Math.cos(t * 18) * 22 + 40);
    return { mouthOpen: 0.15, leftArmDeg, rightArmDeg, headBobPx: Math.round(Math.sin(t * 8) * 2), isTalking: false };
  }
  if (situation === 'listening') {
    return {
      mouthOpen: 0.1,
      leftArmDeg: Math.round(Math.sin(t * 2.5) * 12 - 10),
      rightArmDeg: Math.round(Math.cos(t * 2.5) * 12 + 10),
      headBobPx: Math.round(Math.sin(t * 3) * 3),
      isTalking: false,
    };
  }
  return { mouthOpen: 0, leftArmDeg: 0, rightArmDeg: 0, headBobPx: 0, isTalking: false };
}

export interface LokiBotGrokConfig {
  engineId: string;
  displayName: string;
  apiPrefix: string;
  workspaceModes: Array<'chat' | 'composer' | 'linux' | 'studio'>;
  supportsMultiFileComposer: boolean;
  supportsSwarmDebate: boolean;
}

export function getLokiBotGrokConfig(): LokiBotGrokConfig {
  return {
    engineId: 'grok-4.7-cursor',
    displayName: 'Cursor + Grok 4.7',
    apiPrefix: 'grok_42ddf32035d87e2645a5178bb1bcfe65',
    workspaceModes: ['chat', 'composer', 'linux', 'studio'],
    supportsMultiFileComposer: true,
    supportsSwarmDebate: true,
  };
}

