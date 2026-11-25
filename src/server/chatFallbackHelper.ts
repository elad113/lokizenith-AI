/**
 * Pure helper functions for chat fallback synthesis and Unicode-safe greeting detection.
 * Decoupled so deterministic unit tests can verify Hebrew/Arabic/English handling
 * and guarantee robotic placeholder phrases are never emitted.
 */

export type FallbackLang = 'he' | 'ar' | 'en';

export function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p: any) => p && (p.type === 'text' || typeof p.text === 'string'))
      .map((p: any) => String(p.text || ''))
      .join(' ')
      .trim();
  }
  if (content && typeof content === 'object' && typeof (content as any).text === 'string') {
    return String((content as any).text);
  }
  return String(content || '');
}

export function stripSystemWrappers(text: string): string {
  return String(text || '')
    .replace(/\[(?:CONTEXT|USER_PROFILE|MEMORIES|LOKIMEMORY|SYSTEM)[\s\S]*?\]/gi, '')
    .trim();
}

export function detectFallbackLanguage(userText: string, systemInstruction = ''): FallbackLang {
  const clean = stripSystemWrappers(userText);
  if (/[\u0590-\u05FF]/.test(clean)) return 'he';
  if (/[\u0600-\u06FF]/.test(clean)) return 'ar';
  if (/[\u0590-\u05FF]/.test(systemInstruction)) return 'he';
  if (/[\u0600-\u06FF]/.test(systemInstruction)) return 'ar';
  return 'en';
}

export function matchGreetingOrSmallTalk(rawUserText: string, lang: FallbackLang): string | null {
  const cleanUser = stripSystemWrappers(rawUserText);
  if (!cleanUser) return null;

  // Normalize punctuation & emojis while preserving Hebrew, Arabic, Latin letters, and spaces
  const normalized = cleanUser.replace(/[!?,."'`~:;()\[\]{}😊👋🔥✨❤️🙏👍🎉🚀]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > 60) return null;

  const isEnGreet = /^(hi|hello|hey|yo|sup|hiya|howdy|good morning|good afternoon|good evening|whats up|what's up|how are you|thanks|thank you|thx)$/i.test(normalized);
  const isHeGreet = /^(היי|הי|הייי+|שלום|אהלן|הלו|מה קורה|מה נשמע|מה המצב|מה שלומך|בוקר טוב|צהריים טובים|ערב טוב|לילה טוב|תודה|תודה רבה|היי מה קורה|היי מה נשמע|היי מה שלומך|שלום מה נשמע|אהלן מה קורה)$/i.test(normalized);
  const isArGreet = /^(مرحبا|أهلا|اهلا|السلام عليكم|صباح الخير|مساء الخير|كيف حالك|شكرا|شكرا جزيلا)$/i.test(normalized);

  if (!isEnGreet && !isHeGreet && !isArGreet) return null;

  if (lang === 'he' || isHeGreet) {
    if (/תודה/.test(normalized)) {
      return 'בשמחה! אם תצטרך עוד משהו — אני כאן.';
    }
    if (/מה שלומך|מה קורה|מה נשמע|מה המצב/.test(normalized)) {
      return 'הכול מצוין, תודה! 😊 במה אפשר לעזור לך היום?';
    }
    return 'היי! 😊 מה נשמע? איך אפשר לעזור לך היום?';
  }

  if (lang === 'ar' || isArGreet) {
    if (/شكرا/.test(normalized)) {
      return 'على الرحب والسعة! كيف يمكنني مساعدتك بعد؟';
    }
    return 'مرحباً! 😊 كيف يمكنني مساعدتك اليوم؟';
  }

  if (/thanks|thank you|thx/i.test(normalized)) {
    return "You're welcome! Let me know if there's anything else I can help with.";
  }
  return 'Hey there! 😊 How can I help you today?';
}

export function buildUpstreamBusyReply(lang: FallbackLang): string {
  if (lang === 'he') {
    return 'כרגע כל ספקי ה-AI בשרשרת עמוסים או ממתינים למפתח API זמין — נסה לשלוח שוב בעוד רגע, ואענה לך ישירות ולעניין.';
  }
  if (lang === 'ar') {
    return 'مزودو الذكاء الاصطناعي في السلسلة مشغولون حالياً — جرّب إرسال رسالتك مرة أخرى بعد لحظة.';
  }
  return 'All upstream AI providers in the chain are momentarily busy — please resend your message in a moment for a full live answer.';
}
