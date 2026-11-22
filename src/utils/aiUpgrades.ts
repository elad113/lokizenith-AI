export type SupportedLang = 'he' | 'ar' | 'en';

export interface CandyDetection {
  isCandy: boolean;
  lang: SupportedLang;
}

export interface PersonalizationProfile {
  name?: string;
  userRole?: string;
  persona?: string;
  responseFormat?: string;
  emojiLevel?: string;
  aboutMe?: string;
  howRespond?: string;
  avoidTopics?: string;
}

export interface KnowledgeEntry {
  id: string;
  topic: string;
  fact: string;
  tags: string[];
  lang: SupportedLang;
  sourceUser?: string;
  confidence: number;
  uses: number;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeCandidate {
  topic: string;
  fact: string;
  tags: string[];
  lang: SupportedLang;
  confidence: number;
}

export function detectTextLang(text: string, fallback: string = 'en'): SupportedLang {
  const s = String(text || '');
  const heCount = (s.match(/[\u0590-\u05FF]/g) || []).length;
  const arCount = (s.match(/[\u0600-\u06FF]/g) || []).length;
  if (heCount >= 2 && heCount >= arCount) return 'he';
  if (arCount >= 2 && arCount > heCount) return 'ar';
  const fb = String(fallback || 'en').toLowerCase();
  if (fb.startsWith('he') || fb.startsWith('iw')) return 'he';
  if (fb.startsWith('ar')) return 'ar';
  return 'en';
}

const CANDY_FALSE_POSITIVES = /\b(candy\s*crush|eye\s*candy|arm\s*candy|brain\s*candy|candy\s*apple\s*red|css|gradient|algorithm|database|sql)\b/i;

export function detectCandyRequest(text: string): CandyDetection {
  const raw = String(text || '').trim();
  const lang = detectTextLang(raw, 'en');
  if (!raw || raw.length > 180) return { isCandy: false, lang };
  if (CANDY_FALSE_POSITIVES.test(raw)) return { isCandy: false, lang };

  // Hebrew candy triggers (e.g. "תביא לי סוכריה", "תן לי סוכריה", "סוכריה", "בא לי סוכרייה", "אפשר סוכריות")
  if (/סוכרי(?:ה|יה|ית|ות)/u.test(raw)) {
    return { isCandy: true, lang: 'he' };
  }

  // Arabic candy triggers
  if (/(?:حلوى|سكاكر|بونبون|مصاصة)/u.test(raw)) {
    return { isCandy: true, lang: 'ar' };
  }

  // English candy triggers
  if (
    /^(?:candy|candies|lollipop|sweet|sweets)[!?.🍬🍭\s]*$/i.test(raw) ||
    /\b(?:give|bring|hand|pass|get|send|want|need|gimme|can\s+i\s+have|may\s+i\s+have|got\s+any)\b.{0,28}\b(?:candy|candies|lollipop|lollipops|sweets?)\b/i.test(raw) ||
    /\b(?:candy|lollipop)\b.{0,18}\b(?:please|pls|plz|now|for\s+me)\b/i.test(raw)
  ) {
    return { isCandy: true, lang: 'en' };
  }

  return { isCandy: false, lang };
}

export function buildCandyReply(lang: SupportedLang): string {
  if (lang === 'he') return 'הנה קח סוכריה! 🍬';
  if (lang === 'ar') return 'تفضل، خذ حلوى! 🍬';
  return 'Here, take a candy! 🍬';
}

const STOP_WORDS = new Set([
  'to', 'in', 'on', 'at', 'by', 'of', 'or', 'as', 'is', 'it', 'be', 'do', 'an', 'we', 'he', 'me', 'my', 'up', 'so', 'no', 'if', 'us',
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'what', 'when', 'where', 'which', 'about',
  'your', 'their', 'there', 'they', 'would', 'could', 'should', 'into', 'more', 'some', 'such', 'than',
  'then', 'them', 'also', 'just', 'like', 'make', 'made', 'very', 'much', 'most', 'only', 'over', 'after',
  'here', 'does', 'doing', 'been', 'being', 'will', 'can', 'how', 'why', 'who', 'are', 'was', 'were',
  'את', 'של', 'על', 'עם', 'זה', 'זו', 'זאת', 'הוא', 'היא', 'הם', 'הן', 'אני', 'אתה', 'אתם', 'אנחנו',
  'מה', 'איך', 'למה', 'מתי', 'איפה', 'מי', 'אבל', 'גם', 'או', 'כי', 'אם', 'לא', 'כן', 'יש', 'אין',
  'כדי', 'כמו', 'יותר', 'פחות', 'מאוד', 'רק', 'כל', 'בין', 'אחרי', 'לפני', 'תוך', 'דרך', 'עוד', 'שלי',
  'קורה', 'בתוך', 'ליד', 'בלי', 'אמיתית', 'אמיתי', 'מכינים', 'עושים', 'רוצה', 'אפשר', 'כדאי', 'צריך', 'הכי', 'טוב', 'טובה', 'חדש', 'חדשה',
]);

function cleanConcept(raw: string): string {
  return String(raw || '')
    .replace(/[`*_#>\[\]()?!.,:;'"״׳]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSubConcepts(answer: string, primaryTopic: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>([primaryTopic.toLowerCase()]);
  const push = (val: string) => {
    const c = cleanConcept(val);
    if (
      c.length >= 3 &&
      c.length <= 34 &&
      !seen.has(c.toLowerCase()) &&
      !/^(bottom line|בשורה התחתונה|summary|סיכום|conclusion|לסיכום|note|הערה|example|דוגמה)$/i.test(c)
    ) {
      seen.add(c.toLowerCase());
      found.push(c);
    }
  };
  for (const m of String(answer || '').matchAll(/^#{2,3}\s+([^\n]{3,42})/gm)) push(m[1]);
  for (const m of String(answer || '').matchAll(/\*\*([^*\n]{3,36})\*\*/g)) push(m[1]);
  return found.slice(0, 4);
}

function extractTopicLabel(question: string, answer: string, lang: SupportedLang): string {
  const cleanQ = cleanConcept(question);

  // Strip multi-word conversational Hebrew/English prefixes
  let stripped = cleanQ
    .replace(/^(?:תסביר|הסבר|ספר|תכתוב|כתוב|תן|תתאר|תאר|בנה|צור|הכן|עזור)(?:\s+לי)?\s+/i, '')
    .replace(/^(?:בקצרה|באריכות|בפירוט|בפשטות|בצורה\s+פשוטה|ב-?\s*\d+\s+(?:משפטים|נקודות|מילים|שורות)(?:\s+קצרים|\s+קצרות|\s+פשוטים)?)\s+/gi, '')
    .replace(/^(?:בבקשה|אנא)\s+/i, '')
    .replace(/^(?:על\s+)?(?:מה\s+קורה\s+(?:בתוך|ב|ליד|עם)|מה\s+זה|מה\s+הוא|מה\s+היא|מהם|מהן|איך\s+מכינים|איך\s+עובד|איך\s+עובדת|איך\s+עובדים|איך\s+לעשות|איך\s+עושים|למה\s+יש|מה\s+ההבדל\s+בין|על)\s+/i, '')
    .replace(/^(?:please\s+)?(?:explain|describe|tell\s+me|summarize|write|build|create|make)(?:\s+(?:to\s+me|me|briefly|simply|in\s+\d+\s+(?:short\s+)?(?:sentences|words|points|lines)))?\s+/i, '')
    .replace(/^(?:about\s+)?(?:what\s+happens\s+(?:in|inside|near)|what\s+is|what\s+are|how\s+does|how\s+do|how\s+to\s+make|how\s+to|why\s+is|why\s+do|compare|the\s+difference\s+between)\s+/i, '')
    .replace(/^(?:a|an|the)\s+/i, '')
    .trim();

  // Trim trailing qualifier phrases like "ליד ...", "בלי ..." when stripped is still long
  if (stripped.length > 26) {
    const trimmedClause = stripped.split(/\s+(?:בלי|ליד|ללא|without|near)\s+/i)[0]?.trim();
    if (trimmedClause && trimmedClause.length >= 4 && trimmedClause.length <= 28) {
      stripped = trimmedClause;
    }
  }

  if (stripped.length >= 3 && stripped.length <= 32) {
    return stripped;
  }

  // Try bold terms or headings from the answer
  const subConcepts = extractSubConcepts(answer, '');
  if (subConcepts.length > 0) {
    return subConcepts[0];
  }

  // Fallback to first 2-3 significant words of stripped question
  const words = stripped.split(/\s+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length > 0) {
    return words.slice(0, 3).join(' ');
  }
  return lang === 'he' ? 'הנושא שדיברנו עליו' : lang === 'ar' ? 'هذا الموضوع' : 'this subject';
}

export function buildSmartFallbackFollowups(question: string, answer: string, preferredLang?: string): string[] {
  const lang = detectTextLang(`${question} ${answer}`, preferredLang || 'en');
  const topic = extractTopicLabel(question, answer, lang);
  const subs = extractSubConcepts(answer, topic);
  const sub1 = subs[0] || '';
  const sub2 = subs[1] || '';
  const combined = `${question}\n${answer}`;

  const hasCode = /```|function\s+|const\s+|def\s+|class\s+|import\s+|typescript|javascript|python|react|sql|api\b/i.test(combined);
  const isComparison = /\b(vs\.?|versus|compare|difference|better than)\b|הבדל|השוואה|לעומת|עדיף/i.test(combined);
  const isScience = /\b(space|planet|black hole|quantum|physics|biology|dna|photosynthesis|gravity|atom|climate|energy)\b|חלל|חור שחור|כבידה|קוונט|פוטוסינתזה|פיזיקה|ביולוגיה|אנרגיה|אטום/i.test(combined);
  const isHistory = /\b(history|century|war|empire|ancient|king|president|founded|year \d{3,4})\b|היסטוריה|מאה ה|מלחמ|אימפרי|עתיק|הוקם|מדינה/i.test(combined);
  const isCooking = /\b(recipe|cook|bake|ingredients|oven|sauce|pasta|cake)\b|מתכון|בישול|אפייה|מצרכים|תנור|רוטב|אוכל|עוגה/i.test(combined);
  const isFinance = /\b(invest|stock|roi|mortgage|budget|startup|revenue|pricing|tax|crypto|salary)\b|השקע|מניות|תקציב|משכנתא|ריבית|סטארטאפ|הכנסות|שכר|כסף/i.test(combined);
  const isHealth = /\b(workout|muscle|diet|protein|sleep|calories|training|health|stress)\b|אימון|כושר|תזונה|חלבון|שינה|קלוריות|בריאות|שריר/i.test(combined);
  const isCreative = /\b(story|poem|character|plot|game|movie|music|design|art|logo)\b|סיפור|שיר|דמות|עלילה|משחק|סרט|מוזיקה|עיצוב|אמנות/i.test(combined);
  const isTravel = /\b(travel|trip|flight|hotel|itinerary|city|country|visit)\b|טיול|חופשה|טיסה|מלון|מסלול|יעד|עיר/i.test(combined);

  if (lang === 'he') {
    if (hasCode) {
      return [
        `איך לשפר ביצועים ולטפל במקרי קצה ב-${topic}?`,
        sub1 ? `איך ${sub1} עובד מתחת למכסה המנוע?` : `כתוב בדיקות יחידה (Unit Tests) עבור ${topic}`,
        `אילו שגיאות אבטחה או באגים נפוצים כדאי למנוע ב-${topic}?`,
      ];
    }
    if (isComparison) {
      return [
        `תכין טבלת השוואה מפורטת לפי פרמטרים עבור ${topic}`,
        `באיזה תרחיש ספציפי כל אפשרות ב-${topic} מנצחת?`,
        sub1 ? `מה מייחד במיוחד את ${sub1} בהשוואה הזו?` : `מה העלות האמיתית לאורך זמן ב-${topic}?`,
      ];
    }
    if (isScience) {
      return [
        `מה קורה ברמה הפיזיקלית או המיקרוסקופית בתהליך של ${topic}?`,
        sub1 ? `איך ${sub1} משפיע על ${topic}?` : `אילו תגליות מדעיות חדשות קשורות ל-${topic}?`,
        `איך מדענים מודדים או חוקרים את ${topic} היום?`,
      ];
    }
    if (isHistory) {
      return [
        `אילו אירועים מרכזיים הובילו ל-${topic}?`,
        `איך ${topic} השפיע על העולם המודרני עד היום?`,
        `תציג ציר זמן מסודר של נקודות המפנה ב-${topic}`,
      ];
    }
    if (isCooking) {
      return [
        `אילו שדרוגים או תחליפי מצרכים מתאימים ל-${topic}?`,
        `מה הטעות הכי נפוצה שמקלקלת ${topic} ואיך נמנעים ממנה?`,
        `כמה זמן ואיך הכי טוב לשמור ולחמם מחדש ${topic}?`,
      ];
    }
    if (isFinance) {
      return [
        `בנה מחשבון אינטראקטיבי לבדיקת תרחישים של ${topic}`,
        `אילו סיכונים נסתרים ועמלות חשוב לבדוק ב-${topic}?`,
        `איך לבנות אסטרטגיה חכמה לטווח ארוך ב-${topic}?`,
      ];
    }
    if (isHealth) {
      return [
        `איך להתאים תוכנית שבועית ריאלית סביב ${topic}?`,
        `אילו מיתוסים נפוצים קיימים לגבי ${topic}?`,
        `מה המדדים הכי אמינים לעקוב אחרי התקדמות ב-${topic}?`,
      ];
    }
    if (isCreative) {
      return [
        `תפתח את ${topic} לכיוון מפתיע יותר או עם טוויסט`,
        `תציע 3 סגנונות שונים לגמרי לביצוע של ${topic}`,
        `איך להפוך את ${topic} להרבה יותר זכיר וסוחף?`,
      ];
    }
    if (isTravel) {
      return [
        `תבנה מסלול מומלץ לפי ימים עבור ${topic}`,
        `מתי העונה הכי משתלמת ונעימה עבור ${topic}?`,
        `אילו מקומות סודיים ופחות תיירותיים שווים ב-${topic}?`,
      ];
    }
    return [
      sub1 ? `תרחיב לעומק על ${sub1} והקשר ל-${topic}` : `מה הדבר הכי מפתיע שרוב האנשים לא יודעים על ${topic}?`,
      sub2 ? `איך ${sub2} משתלב יחד עם ${topic}?` : `תציג מפת חשיבה מסודרת של כל התחומים ב-${topic}`,
      `מה השלב הבא הכי חכם ללמוד או לחקור בנושא ${topic}?`,
    ];
  }

  if (lang === 'ar') {
    return [
      sub1 ? `اشرح بمزيد من التفصيل دور ${sub1} في ${topic}` : `ما هي أهم الحقائق غير المعروفة حول ${topic}؟`,
      `اعرض خريطة مفاهيم واضحة لتفاصيل ${topic}`,
      `ما هي الخطوة الذكية التالية للتعمق في ${topic}؟`,
    ];
  }

  if (hasCode) {
    return [
      `How can I optimize and handle edge cases in ${topic}?`,
      sub1 ? `How does ${sub1} work under the hood?` : `Write complete tested unit tests for ${topic}`,
      `What are the most common security or performance pitfalls in ${topic}?`,
    ];
  }
  if (isComparison) {
    return [
      `Build a visual side-by-side comparison card for ${topic}`,
      `In which specific scenario does each option in ${topic} win?`,
      sub1 ? `What makes ${sub1} stand out here?` : `What hidden long-term trade-offs matter most for ${topic}?`,
    ];
  }
  if (isScience) {
    return [
      `What actually happens beneath the surface during ${topic}?`,
      sub1 ? `How does ${sub1} directly shape ${topic}?` : `What recent breakthroughs changed our view of ${topic}?`,
      `How do scientists measure or observe ${topic} today?`,
    ];
  }
  if (isFinance) {
    return [
      `Build an interactive slider calculator to model ${topic}`,
      `What hidden risks or fees usually surprise people with ${topic}?`,
      `What is the smartest long-term strategy for ${topic}?`,
    ];
  }
  if (isHistory) {
    return [
      `Show a visual timeline of the turning points in ${topic}`,
      `What chain of events originally triggered ${topic}?`,
      `How does ${topic} still shape the modern world today?`,
    ];
  }
  if (isCreative) {
    return [
      `Reimagine ${topic} with an unexpected twist or fresh tone`,
      `Explore 3 completely different creative directions for ${topic}`,
      `How can we make ${topic} feel more vivid and memorable?`,
    ];
  }
  return [
    sub1 ? `Go deeper into ${sub1} and how it connects to ${topic}` : `What is the most surprising misconception about ${topic}?`,
    sub2 ? `How does ${sub2} interact with ${topic}?` : `Create an interactive mind-map breaking down ${topic}`,
    `What is the smartest next question to explore on ${topic}?`,
  ];
}

const PERSONA_DIRECTIVES: Record<string, string> = {
  balanced: 'Maintain a balanced, clear, intelligent, and approachable tone.',
  direct: 'Be razor-sharp, concise, and direct. Lead with the conclusion and skip fluff.',
  warm: 'Be warm, encouraging, supportive, and conversational while staying accurate.',
  teacher: 'Act as a patient, crystal-clear tutor: break concepts down intuitively with analogies and check understanding.',
  developer: 'Respond like a principal software engineer: prioritize clean architecture, edge cases, complexity, and idiomatic code.',
  creative: 'Be imaginative, vivid, and original — offer fresh angles and creative sparks.',
  witty: 'Be clever, lively, and subtly witty without sacrificing technical accuracy.',
};

const FORMAT_DIRECTIVES: Record<string, string> = {
  auto: '',
  bullets: 'Prefer structured bullet points and crisp scannable takeaways.',
  steps: 'Organize explanations into clear numbered step-by-step instructions.',
  concise: 'Keep answers tight and high-density with minimal prose.',
  deep: 'Provide thorough, in-depth analysis with concrete examples and trade-offs.',
};

const EMOJI_DIRECTIVES: Record<string, string> = {
  none: 'Do NOT use emojis in responses unless explicitly asked.',
  light: 'Use emojis sparingly only when they improve visual clarity.',
  rich: 'Use expressive, tasteful emojis to make headings and key points engaging.',
};

export function buildPersonalizationPrompt(profile: PersonalizationProfile): string {
  if (!profile) return '';
  const lines: string[] = [];
  const name = String(profile.name || '').trim();
  const role = String(profile.userRole || '').trim();
  const persona = String(profile.persona || 'balanced').trim().toLowerCase();
  const fmt = String(profile.responseFormat || 'auto').trim().toLowerCase();
  const emoji = String(profile.emojiLevel || 'light').trim().toLowerCase();
  const about = String(profile.aboutMe || '').trim();
  const how = String(profile.howRespond || '').trim();
  const avoid = String(profile.avoidTopics || '').trim();

  if (name) lines.push(`- Address or recognize the user as: ${name}.`);
  if (role) lines.push(`- User's role / background: ${role}. Tailor depth and examples accordingly.`);
  if (persona && persona !== 'balanced' && PERSONA_DIRECTIVES[persona]) {
    lines.push(`- Persona & Tone: ${PERSONA_DIRECTIVES[persona]}`);
  }
  if (fmt && FORMAT_DIRECTIVES[fmt]) {
    lines.push(`- Preferred Format: ${FORMAT_DIRECTIVES[fmt]}`);
  }
  if (emoji && emoji !== 'light' && EMOJI_DIRECTIVES[emoji]) {
    lines.push(`- Emoji Style: ${EMOJI_DIRECTIVES[emoji]}`);
  }
  if (about) lines.push(`- About the user: ${about}`);
  if (how) lines.push(`- Custom response instructions (STRICTLY FOLLOW): ${how}`);
  if (avoid) lines.push(`- Avoid / Do not include: ${avoid}`);

  if (!lines.length) return '';
  return `=== USER PERSONALIZATION PROFILE (ACTIVE) ===\n${lines.join('\n')}`;
}

const SENSITIVE_PATTERN =
  /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:\+?\d[\d\s\-()]{7,}\d)|\b(?:password|passwd|secret|api[_\s-]?key|token|bearer|credit\s*card|ssn|cvv)\b|sk-[a-zA-Z0-9]{12,}|AIza[0-9A-Za-z_-]{20,}|סיסמה|תעודת\s*זהות|כרטיס\s*אשראי)/i;

const TRIVIAL_QUESTION_PATTERN =
  /^(hi+|hey+|hello+|shalom|שלום|היי|הי|מה קורה|מה נשמע|תודה|thanks?|ok(ay)?|ביי|bye|תביא לי סוכריה|סוכריה|candy)$/i;

export function containsSensitiveInfo(text: string): boolean {
  return SENSITIVE_PATTERN.test(String(text || ''));
}

export function extractKnowledgeFacts(question: string, answer: string): KnowledgeCandidate[] {
  const q = String(question || '').trim();
  const a = String(answer || '').trim();
  if (q.length < 10 || a.length < 60) return [];
  if (TRIVIAL_QUESTION_PATTERN.test(q)) return [];
  if (containsSensitiveInfo(q) || containsSensitiveInfo(a)) return [];

  const lang = detectTextLang(`${q} ${a}`, 'en');
  const topic = extractTopicLabel(q, a, lang);

  // Strip code blocks and markdown links for clean knowledge extraction
  const plainAns = a
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plainAns.length < 45) return [];

  // Split into sentences and take the most informative 1-2 sentences (avoid greetings/meta phrases)
  const sentences = plainAns
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 28 && s.length <= 280)
    .filter((s) => !/^(here is|sure|certainly|great question|let me know|בשמחה|כמובן|הנה)/i.test(s));

  if (!sentences.length) return [];

  const fact = sentences.slice(0, 2).join(' ').slice(0, 360).trim();
  if (fact.length < 35 || containsSensitiveInfo(fact)) return [];

  const tokenPool = `${topic} ${q} ${fact}`
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF\u0600-\u06FF\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  const tags = Array.from(new Set(tokenPool)).slice(0, 8);
  if (tags.length < 2) return [];

  return [
    {
      topic: topic.slice(0, 72),
      fact,
      tags,
      lang,
      confidence: 0.78,
    },
  ];
}

export function tokenizeForKnowledge(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF\u0600-\u06FF\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => (w.length >= 3 || (w.length >= 2 && /[\u0590-\u05FF\u0600-\u06FF]/.test(w))) && !STOP_WORDS.has(w));
}

export function scoreKnowledgeMatch(query: string, entries: KnowledgeEntry[], limit = 4): KnowledgeEntry[] {
  const qTokens = Array.from(new Set(tokenizeForKnowledge(query)));
  if (!qTokens.length || !Array.isArray(entries) || !entries.length) return [];

  const scored = entries
    .map((entry) => {
      const hayTokens = new Set([
        ...tokenizeForKnowledge(entry.topic),
        ...tokenizeForKnowledge(entry.fact),
        ...(entry.tags || []).map((t) => String(t).toLowerCase()),
      ]);
      let overlap = 0;
      let topicHits = 0;
      const topicLower = String(entry.topic || '').toLowerCase();
      for (const qt of qTokens) {
        if (hayTokens.has(qt)) overlap += 1;
        if (topicLower.includes(qt)) topicHits += 1;
      }
      if (overlap === 0) return { entry, score: 0 };
      const ratio = overlap / Math.max(2, qTokens.length);
      const score = overlap * 1.4 + topicHits * 2.1 + ratio * 2 + (entry.confidence || 0.7);
      return { entry, score };
    })
    .filter((x) => x.score >= 2.2)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.entry);
}
