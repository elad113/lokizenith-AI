export type QuizQuestionType = 'mc' | 'open' | 'tf' | 'fill';

export interface ParsedQuizSpec {
  topic: string;
  count: number;
  mode: 'mixed' | 'mc' | 'open' | 'tf' | 'fill';
  mcCount: number;
  tfCount: number;
  fillCount: number;
  openCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  lang: 'en' | 'he' | 'ar';
}

export interface QuizQuestionItem {
  type: QuizQuestionType;
  q: string;
  options?: string[];
  answer: number | string | boolean;
  explanation?: string;
  hint?: string;
  distractors?: string[];
}

export interface QuizAnswerRecord {
  given: number | string | null;
  correct: boolean;
  score: number;
  feedback?: string;
}

export interface QuizEvaluationResult {
  score: number;
  points: number;
  total: number;
  percentage: number;
  answers: QuizAnswerRecord[];
}

const CODE_TEST_EXCLUDE_RX =
  /\b(unit\s*tests?|integration\s*tests?|e2e\s*tests?|test\s*cases?|test\s*suite|jest|pytest|vitest|mocha|cypress|playwright|node:test|junit|testng|api\s*key|connection\s*test|ping\s*test|speed\s*test|stress\s*test|load\s*test|ab\s*test|a\/b\s*test|blood\s*test|covid\s*test|pregnancy\s*test)\b/i;

const QUIZ_TRIGGER_RX =
  /^\/(quiz|test|exam|בוחן|מבחן|חידון)\b|\b(quiz|trivia|test\s+me|exam\s+me)\b|\b(create|make|give|build|generate|write|prepare|start|want|need)\b[\s\S]{0,45}\b(quiz|test|exam|questions?)\b|\b(test|exam|quiz)\s+(about|on|for|in|with|of)\b|\b\d{1,2}\s*[-\s]?\s*questions?\s+(test|quiz|exam)\b|בוחן|חידון|מבחן|מבדק|שאלון|תבחן\s+אותי|בחן\s+אותי|תעשה\s+(לי\s+)?(מבחן|בוחן|חידון)|תכין\s+(לי\s+)?(מבחן|בוחן|חידון)|צור\s+(לי\s+)?(מבחן|בוחן|חידון)|اختبار|اختبرني|امتحان/i;

export function detectQuizLanguage(text: string): 'en' | 'he' | 'ar' {
  if (/[\u0590-\u05FF]/.test(text || '')) return 'he';
  if (/[\u0600-\u06FF]/.test(text || '')) return 'ar';
  return 'en';
}

export function isQuizOrTestRequest(text: string): boolean {
  const raw = String(text || '').trim();
  if (!raw || raw.length > 420) return false;
  if (/^\/(quiz|test|exam|בוחן|מבחן|חידון)\b/i.test(raw)) return true;
  if (CODE_TEST_EXCLUDE_RX.test(raw)) return false;
  return QUIZ_TRIGGER_RX.test(raw);
}

export function clampQuizCount(n: number, fallback = 8): number {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return Math.max(5, Math.min(20, fallback));
  return Math.max(5, Math.min(20, Math.round(num)));
}

export function computeFourTypeDistribution(totalCount: number): {
  mcCount: number;
  tfCount: number;
  fillCount: number;
  openCount: number;
} {
  const count = clampQuizCount(totalCount, 8);
  const tfCount = Math.max(1, Math.round(count * 0.2));
  const fillCount = Math.max(1, Math.round(count * 0.2));
  const openCount = Math.max(1, Math.round(count * 0.25));
  const mcCount = Math.max(1, count - tfCount - fillCount - openCount);
  return { mcCount, tfCount, fillCount, openCount };
}

export function parseQuizRequestSpec(text: string, defaultCount = 8): ParsedQuizSpec {
  const raw = String(text || '').trim();
  const lang = detectQuizLanguage(raw);

  const difficulty: 'easy' | 'medium' | 'hard' =
    /\b(hard|difficult|advanced|challenging)\b|קשה|מתקדם|מאתגר|صعب/i.test(raw)
      ? 'hard'
      : /\b(easy|simple|basic|beginner)\b|קל|פשוט|בסיסי|سهل/i.test(raw)
        ? 'easy'
        : 'medium';

  // Check for explicit split counts e.g. "6 option questions and 4 open questions" / "5 אמריקאיות ו-5 פתוחות"
  const mcMatch =
    raw.match(/(\d{1,2})\s*(?:multiple[-\s]*choice|option(?:s)?\s*questions?|mc\s*questions?|שאלות\s*אמריקאיות|אמריקאיות|רב[-\s]*ברירה)/i);
  const openMatch =
    raw.match(/(\d{1,2})\s*(?:open(?:[-\s]*ended)?(?:\s*questions?)?|written\s*questions?|שאלות\s*פתוחות|פתוחות)/i);
  const tfMatch =
    raw.match(/(\d{1,2})\s*(?:true\s*(?:\/|or)\s*false(?:\s*questions?)?|tf\s*questions?|נכון\s*(?:או\s*|\/)?לא\s*נכון)/i);
  const fillMatch =
    raw.match(/(\d{1,2})\s*(?:fill[-\s]*in(?:[-\s]*the[-\s]*blanks?)?(?:\s*questions?)?|השלמת\s*משפט(?:ים)?|השלם\s*את\s*החסר)/i);

  if (mcMatch && openMatch && !tfMatch && !fillMatch) {
    let mcCount = Math.max(1, parseInt(mcMatch[1], 10));
    let openCount = Math.max(1, parseInt(openMatch[1], 10));
    let total = mcCount + openCount;
    if (total < 5) {
      const scale = 5 / total;
      mcCount = Math.max(1, Math.round(mcCount * scale));
      openCount = Math.max(1, 5 - mcCount);
      total = 5;
    } else if (total > 20) {
      const scale = 20 / total;
      mcCount = Math.max(1, Math.round(mcCount * scale));
      openCount = Math.max(1, 20 - mcCount);
      total = 20;
    }
    return {
      topic: cleanQuizTopic(raw, lang),
      count: total,
      mode: 'mixed',
      mcCount,
      tfCount: 0,
      fillCount: 0,
      openCount,
      difficulty,
      lang,
    };
  }

  // Extract requested total question count (5-20)
  const withoutRange = raw.replace(/\b(?:between\s+)?5\s*(?:-|to|and|עד|ל-?)\s*20\s*(?:questions?|qs?|שאלות|أسئلة)?/gi, '');
  const countMatch =
    withoutRange.match(/(\d{1,2})\s*[-\s]?\s*(?:questions?|qs?\b|שאלות|أسئلة|سؤال)/i) ||
    withoutRange.match(/(?:מבחן|בוחן|חידון|test|quiz|exam)\s+(?:של|עם|בן|with|of)\s+(\d{1,2})\b/i);

  const count = countMatch ? clampQuizCount(parseInt(countMatch[1], 10), defaultCount) : clampQuizCount(defaultCount, 8);

  const wantsOnlyOpen =
    /\b(only\s+open|open\s+questions?\s+only|all\s+open\s+questions?)\b|רק\s+(?:שאלות\s+)?פתוחות|שאלות\s+פתוחות\s+בלבד/i.test(raw);
  const wantsOnlyMc =
    /\b(only\s+(?:multiple[-\s]*choice|options?|mc)|(?:multiple[-\s]*choice|option\s+questions?)\s+only)\b|רק\s+(?:שאלות\s+)?(?:אמריקאיות|רב[-\s]*ברירה)|(?:אמריקאיות|רב[-\s]*ברירה)\s+בלבד/i.test(raw);
  const wantsOnlyTf =
    /\b(only\s+true\s*(?:\/|or)\s*false|true\s*(?:\/|or)\s*false\s+only)\b|רק\s+(?:שאלות\s+)?נכון\s*(?:או\s*|\/)?לא\s*נכון/i.test(raw);
  const wantsOnlyFill =
    /\b(only\s+fill[-\s]*in(?:[-\s]*the[-\s]*blanks?)?|fill[-\s]*in(?:[-\s]*the[-\s]*blanks?)?\s+only)\b|רק\s+(?:שאלות\s+)?(?:השלמת\s*משפט(?:ים)?|השלם\s*את\s*החסר)/i.test(raw);

  if (wantsOnlyOpen && !wantsOnlyMc) {
    return {
      topic: cleanQuizTopic(raw, lang),
      count,
      mode: 'open',
      mcCount: 0,
      tfCount: 0,
      fillCount: 0,
      openCount: count,
      difficulty,
      lang,
    };
  }
  if (wantsOnlyMc && !wantsOnlyOpen) {
    return {
      topic: cleanQuizTopic(raw, lang),
      count,
      mode: 'mc',
      mcCount: count,
      tfCount: 0,
      fillCount: 0,
      openCount: 0,
      difficulty,
      lang,
    };
  }
  if (wantsOnlyTf) {
    return {
      topic: cleanQuizTopic(raw, lang),
      count,
      mode: 'tf',
      mcCount: 0,
      tfCount: count,
      fillCount: 0,
      openCount: 0,
      difficulty,
      lang,
    };
  }
  if (wantsOnlyFill) {
    return {
      topic: cleanQuizTopic(raw, lang),
      count,
      mode: 'fill',
      mcCount: 0,
      tfCount: 0,
      fillCount: count,
      openCount: 0,
      difficulty,
      lang,
    };
  }

  // Mixed mode across all 4 question types: mc + tf + fill + open
  const dist = computeFourTypeDistribution(count);
  return {
    topic: cleanQuizTopic(raw, lang),
    count,
    mode: 'mixed',
    mcCount: dist.mcCount,
    tfCount: dist.tfCount,
    fillCount: dist.fillCount,
    openCount: dist.openCount,
    difficulty,
    lang,
  };
}

export function cleanQuizTopic(rawText: string, lang: 'en' | 'he' | 'ar' = 'en'): string {
  let t = String(rawText || '').trim();
  t = t
    .replace(/^\/(quiz|test|exam|בוחן|מבחן|חידון)\s*:?\s*/i, '')
    .replace(/^(?:please\s+)?(?:can\s+you\s+|could\s+you\s+)?(?:create|make|give\s+me|build|generate|write|prepare|start)?\s*(?:me\s+)?(?:a|an)?\s*(?:short|quick|hard|easy|medium|full|interactive)?\s*(?:\d{1,2}[-\s]*question\s*)?(?:quiz|test|exam|trivia)\s*(?:me\s+)?(?:about|on|for|in|regarding)?\s*/i, '')
    .replace(/^(?:בבקשה\s+)?(?:אפשר\s+)?(?:תכין|צור|תיצור|תעשה|תן|תבנה|בנה|עשה|הכן|תבחן\s+אותי|בחן\s+אותי)?\s*(?:לי\s+)?(?:מבחן|בוחן|חידון|מבדק|שאלון)?\s*(?:של\s+\d{1,2}\s+שאלות\s*)?(?:על|בנושא|ב-?|עבור)?\s*/i, '')
    .replace(/[,(]?\s*(?:with|in|of|including|containing|between|עם|של|בן|כולל|-)?\s*\d{1,2}(?:\s*(?:-|to|עד)\s*\d{1,2})?\s*(?:questions?|qs?\b|שאלות|أسئلة|سؤال)\)?/gi, '')
    .replace(/[,(]?\s*(?:both\s+)?(?:multiple[-\s]*choice|option\s*questions?|open(?:\s*questions?)?|written\s*answers?|true\s*(?:\/|or)\s*false|fill[-\s]*in[-\s]*the[-\s]*blanks?|and\s+open\s+questions?|וגם\s+שאלות\s+פתוחות|שאלות\s+אמריקאיות\s+ו(?:שאלות\s+)?פתוחות|אמריקאיות\s+ופתוחות|שאלות\s+פתוחות|שאלות\s+אמריקאיות|רב[-\s]*ברירה|נכון\s*או\s*לא\s*נכון|השלמת\s*משפט(?:ים)?)\)?/gi, '')
    .replace(/[,]?\s*\b(?:easy|medium|hard|difficult|simple)\b(?:\s*(?:level|difficulty))?/gi, '')
    .replace(/\s+(?:קשה|קל|בינוני)$/, '')
    .replace(/^(?:about|on|for|in|על|בנושא)\s+/i, '')
    .replace(/[?.!،,\s]+$/, '')
    .trim();

  if (!t || t.length < 2) {
    return lang === 'he' ? 'ידע כללי' : lang === 'ar' ? 'معلومات عامة' : 'General Knowledge';
  }
  return t;
}

export function normalizeTrueFalseAnswerIndex(ans: number | string | boolean | null | undefined): 0 | 1 {
  if (ans === 0 || ans === true) return 0;
  if (ans === 1 || ans === false) return 1;
  const s = String(ans ?? '').trim().toLowerCase();
  if (/^(0|true|t|yes|correct|נכון|אמת|כן|צודק|صحيح|صح|نعم)$/i.test(s)) return 0;
  return 1;
}

export function gradeFillInBlankDeterministically(
  modelAnswer: string,
  studentAnswer: string
): { correct: boolean; score: number } {
  const norm = (s: string) =>
    String(s || '')
      .trim()
      .toLowerCase()
      .replace(/[\u0591-\u05C7]/g, '') // strip Hebrew diacritics (nikud)
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const given = norm(studentAnswer);
  const target = norm(modelAnswer);
  if (!given) return { correct: false, score: 0 };
  if (!target) return { correct: true, score: 1 };
  if (given === target) return { correct: true, score: 1 };

  // Strip common Hebrew prefix letters (ה, ו, ב, ל, כ, מ, ש) or English articles (the, a, an)
  const stripPrefix = (s: string) =>
    s
      .replace(/^(?:the|a|an)\s+/i, '')
      .replace(/^[הובלכמש](?=[\u05D0-\u05EA]{3,})/, '')
      .trim();

  if (stripPrefix(given) === stripPrefix(target)) {
    return { correct: true, score: 1 };
  }
  if (
    (target.length >= 3 && given.includes(target)) ||
    (given.length >= 3 && target.includes(given) && given.length >= target.length * 0.65)
  ) {
    return { correct: true, score: 1 };
  }
  return gradeOpenAnswerDeterministically(modelAnswer, studentAnswer);
}

export function gradeOpenAnswerDeterministically(
  modelAnswer: string,
  studentAnswer: string
): { correct: boolean; score: number } {
  const given = String(studentAnswer || '').trim().toLowerCase();
  const target = String(modelAnswer || '').trim().toLowerCase();
  if (!given) return { correct: false, score: 0 };
  if (!target) return { correct: true, score: 1 };
  if (given === target || given.includes(target) || (given.length >= 4 && target.includes(given))) {
    return { correct: true, score: 1 };
  }
  const stop = new Set([
    'the', 'and', 'for', 'that', 'with', 'this', 'from', 'are', 'was', 'were', 'because', 'into', 'של', 'את', 'על', 'עם', 'או', 'כי', 'הוא', 'היא', 'הם'
  ]);
  const tokens = (s: string) =>
    s
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !stop.has(w));
  const targetTokens = tokens(target);
  if (!targetTokens.length) return { correct: given.length >= 2, score: given.length >= 2 ? 1 : 0 };
  const givenText = ' ' + tokens(given).join(' ') + ' ';
  let hits = 0;
  for (const tk of targetTokens) {
    const stem = tk.length > 4 ? tk.slice(0, Math.ceil(tk.length * 0.75)) : tk;
    if (givenText.includes(' ' + tk + ' ') || given.includes(stem)) {
      hits++;
    }
  }
  const ratio = hits / targetTokens.length;
  const ok = ratio >= 0.45 || (hits >= 2 && targetTokens.length >= 4);
  return { correct: ok, score: ok ? Math.max(0.75, Math.min(1, ratio + 0.25)) : Math.min(0.4, ratio) };
}

export function evaluateQuizSubmission(
  questions: QuizQuestionItem[],
  givenByIndex: Array<number | string | boolean | null | undefined>,
  aiOpenGrades: Record<number, { correct?: boolean; score?: number; feedback?: string }> = {}
): QuizEvaluationResult {
  const answers: QuizAnswerRecord[] = [];
  let correctCount = 0;
  let points = 0;

  questions.forEach((q, idx) => {
    const given = givenByIndex[idx] ?? null;
    if (q.type === 'mc') {
      const numGiven = given !== null && given !== '' && given !== undefined ? Number(given) : -1;
      const isCorrect = Number.isFinite(numGiven) && numGiven === Number(q.answer);
      if (isCorrect) {
        correctCount++;
        points += 1;
      }
      answers.push({
        given: Number.isFinite(numGiven) && numGiven >= 0 ? numGiven : null,
        correct: isCorrect,
        score: isCorrect ? 1 : 0,
      });
    } else if (q.type === 'tf') {
      if (given === null || given === '' || given === undefined) {
        answers.push({ given: null, correct: false, score: 0 });
        return;
      }
      const givenIdx = normalizeTrueFalseAnswerIndex(given);
      const targetIdx = normalizeTrueFalseAnswerIndex(q.answer);
      const isCorrect = givenIdx === targetIdx;
      if (isCorrect) {
        correctCount++;
        points += 1;
      }
      answers.push({
        given: givenIdx,
        correct: isCorrect,
        score: isCorrect ? 1 : 0,
      });
    } else if (q.type === 'fill') {
      const strGiven = String(given ?? '').trim();
      const aiGrade = aiOpenGrades[idx];
      if (!strGiven) {
        answers.push({ given: '', correct: false, score: 0 });
        return;
      }
      const det = gradeFillInBlankDeterministically(String(q.answer || ''), strGiven);
      if (det.correct) {
        correctCount++;
        points += 1;
        answers.push({
          given: strGiven,
          correct: true,
          score: 1,
          feedback: aiGrade?.feedback ? String(aiGrade.feedback) : undefined,
        });
      } else if (aiGrade && (typeof aiGrade.correct === 'boolean' || typeof aiGrade.score === 'number')) {
        const sc = typeof aiGrade.score === 'number' ? Math.max(0, Math.min(1, aiGrade.score)) : aiGrade.correct ? 1 : 0;
        const ok = aiGrade.correct === true || sc >= 0.7;
        if (ok) correctCount++;
        points += ok ? 1 : sc;
        answers.push({
          given: strGiven,
          correct: ok,
          score: sc,
          feedback: aiGrade.feedback ? String(aiGrade.feedback) : undefined,
        });
      } else {
        points += det.score;
        answers.push({
          given: strGiven,
          correct: false,
          score: det.score,
        });
      }
    } else {
      const strGiven = String(given ?? '').trim();
      const aiGrade = aiOpenGrades[idx];
      if (!strGiven) {
        answers.push({ given: '', correct: false, score: 0 });
        return;
      }
      if (aiGrade && (typeof aiGrade.correct === 'boolean' || typeof aiGrade.score === 'number')) {
        const sc = typeof aiGrade.score === 'number' ? Math.max(0, Math.min(1, aiGrade.score)) : aiGrade.correct ? 1 : 0;
        const ok = aiGrade.correct === true || sc >= 0.65;
        if (ok) correctCount++;
        points += ok ? Math.max(sc, 1) : sc;
        answers.push({
          given: strGiven,
          correct: ok,
          score: sc,
          feedback: aiGrade.feedback ? String(aiGrade.feedback) : undefined,
        });
      } else {
        const det = gradeOpenAnswerDeterministically(String(q.answer || ''), strGiven);
        if (det.correct) correctCount++;
        points += det.correct ? 1 : det.score;
        answers.push({
          given: strGiven,
          correct: det.correct,
          score: det.score,
        });
      }
    }
  });

  const total = Math.max(1, questions.length);
  const percentage = Math.round((correctCount / total) * 100);
  return {
    score: correctCount,
    points: Math.round(points * 10) / 10,
    total: questions.length,
    percentage,
    answers,
  };
}

export interface ChatTurnMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content?: string;
  pending?: boolean;
}

export interface SubjectStudyProfile {
  id: string;
  labelHe: string;
  labelEn: string;
  tutorDirective: string;
}

const REFERENTIAL_TOPIC_RX =
  /^(?:זה|הזה|זאת|הזאת|הם|הן|אלו|אלה|החומר(?:\s+הזה)?|הנושא(?:\s+הזה)?|מה\s+ש(?:דיברנו|למדנו|אמרת|הסברת|כתבת|ביקשתי|שלחתי)(?:\s+עליו|\s+עכשיו)?|עליו|עליה|עליהם|אותו\s+דבר|אותו\s+נושא|הפרק(?:\s+הזה)?|הסיפור(?:\s+הזה)?|המאמר(?:\s+הזה)?|this|that|it|these|those|this\s+topic|that\s+topic|this\s+subject|this\s+material|the\s+material|what\s+we\s+(?:just\s+)?(?:talked|learned|studied|discussed)(?:\s+about)?|what\s+you\s+(?:just\s+)?(?:taught|explained|said)|the\s+above|same\s+topic|General\s+Knowledge|ידע\s+כללי|معلومات\s+عامة)$/i;

export function isReferentialOrEmptyQuizTopic(topic: string, rawRequest = ''): boolean {
  const clean = String(topic || '')
    .replace(/^(?:על|בנושא|לגבי|ב-?|about|on|for|of|in)\s+/i, '')
    .replace(/[?.!،,\s]+$/g, '')
    .trim();
  if (!clean || clean.length < 2) return true;
  if (REFERENTIAL_TOPIC_RX.test(clean)) return true;
  if (
    /^(?:על\s+זה|בנושא\s+הזה|על\s+החומר\s+הזה|על\s+הנושא\s+הזה|על\s+מה\s+שלמדנו|על\s+מה\s+שדיברנו|על\s+מה\s+שהסברת|about\s+this|on\s+this|about\s+that|on\s+that|about\s+it|on\s+it|on\s+what\s+we\s+learned|about\s+what\s+you\s+taught)$/i.test(
      String(topic || '').trim()
    )
  ) {
    return true;
  }
  // Also catch when the raw request itself says "תעשה על זה מבחן" / "תבחן אותי על זה" / "quiz me on this"
  if (
    rawRequest &&
    /(?:מבחן|בוחן|חידון|תבחן\s+אותי|בחן\s+אותי|test|quiz|exam)\s+(?:אותי\s+)?(?:על\s+זה|על\s+הנושא\s+הזה|על\s+החומר\s+הזה|על\s+מה\s+שלמדנו|על\s+מה\s+שדיברנו|על\s+מה\s+שהסברת|עליו|עליה|on\s+this|about\s+this|on\s+that|about\s+that|on\s+it|about\s+it|on\s+what\s+we\s+learned)\b/i.test(
      rawRequest
    ) &&
    clean.split(/\s+/).length <= 3
  ) {
    return true;
  }
  return false;
}

const SUBJECT_PROFILES: Array<{ rx: RegExp; profile: SubjectStudyProfile }> = [
  {
    rx: /תנ"?ך|תורה|נביאים|כתובים|בראשית|שמות|ויקרא|במדבר|דברים|יהושע|שופטים|שמואל|מלכים|ישעיהו|ירמיהו|יחזקאל|תהילים|משלי|איוב|מגילת|קהלת|אסתר|רות|עזרא|נחמיה|דברי\s+הימים|bible|tanakh|torah|genesis|exodus|kings|samuel|isaiah|jeremiah/i,
    profile: {
      id: 'tanakh',
      labelHe: 'תנ״ך ומקרא',
      labelEn: 'Bible / Tanakh',
      tutorDirective:
        'Subject: Tanakh (Hebrew Bible). Focus on chapters & verses (פרקים ופסוקים), biblical characters & motives, keywords/leitwort (מילים מנחות), literary devices (תקבולת, אירוניה, אנלוגיה, שורש מנחה), historical/moral messages, and comparisons between biblical passages.',
    },
  },
  {
    rx: /היסטוריה|מלחמת\s+העולם|המהפכה|ציונות|השואה|לאומיות|בית\s+שני|יוון|רומא|ימי\s+הביניים|history|world\s+war|revolution|holocaust|zionism/i,
    profile: {
      id: 'history',
      labelHe: 'היסטוריה',
      labelEn: 'History',
      tutorDirective:
        'Subject: History. Focus on causes and consequences (גורמים ותוצאות), historical timeline & turning points, primary source analysis, key figures, ideological movements, and historical significance.',
    },
  },
  {
    rx: /מתמטיקה|אלגברה|גיאומטריה|טריגונומטריה|חדו"?א|נגזרת|אינטגרל|משוואה|משוואות|פונקציה|פונקציות|הסתברות|וקטורים|math|algebra|geometry|calculus|derivative|integral|equation|probability/i,
    profile: {
      id: 'math',
      labelHe: 'מתמטיקה',
      labelEn: 'Mathematics',
      tutorDirective:
        'Subject: Mathematics. Focus on step-by-step problem solving, formulas, geometric/algebraic reasoning, numerical calculation questions, and conceptual understanding of theorems.',
    },
  },
  {
    rx: /פיזיקה|מכניקה|חשמל|מגנטיות|אופטיקה|קרינה|חוקי\s+ניוטון|אנרגיה|תנע|כוח|תאוצה|מהירות|physics|mechanics|electromagnetism|optics|newton|kinematics/i,
    profile: {
      id: 'physics',
      labelHe: 'פיזיקה',
      labelEn: 'Physics',
      tutorDirective:
        'Subject: Physics. Focus on physical laws, formulas & units, real-world physical phenomena, force/energy analysis, and quantitative/conceptual problem solving.',
    },
  },
  {
    rx: /ביולוגיה|תא|גנטיקה|דנ"?א|אבולוציה|אקולוגיה|מערכת\s+הדם|מערכת\s+העצבים|פוטוסינתזה|נשימה\s+תאית|אנזימים|biology|genetics|dna|cell|ecology|photosynthesis|evolution/i,
    profile: {
      id: 'biology',
      labelHe: 'ביולוגיה ומדעים',
      labelEn: 'Biology & Life Sciences',
      tutorDirective:
        'Subject: Biology & Sciences. Focus on biological mechanisms, structure-to-function relationships (התאמה בין מבנה לתפקוד), processes, experiments/control groups, and physiological systems.',
    },
  },
  {
    rx: /כימיה|אטום|מולקולה|טבלה\s+מחזורית|קשר\s+כימי|חומצה|בסיס|חמצון|חיזור|מולים|chemistry|periodic\s+table|molecule|acid|base|redox/i,
    profile: {
      id: 'chemistry',
      labelHe: 'כימיה',
      labelEn: 'Chemistry',
      tutorDirective:
        'Subject: Chemistry. Focus on atomic structure, chemical bonding, reactions, stoichiometry, states of matter, and molecular properties.',
    },
  },
  {
    rx: /ספרות|שירה|סיפור\s+קצר|רומן|דרמה|מטאפורה|דימוי|מוטיב|דובר|נמען|אירוניה|literature|poetry|literary|metaphor|protagonist/i,
    profile: {
      id: 'literature',
      labelHe: 'ספרות',
      labelEn: 'Literature',
      tutorDirective:
        'Subject: Literature. Focus on literary devices (אמצעים אמנותיים), character development, narrator/point of view, central themes, conflict, and textual evidence.',
    },
  },
  {
    rx: /אזרחות|דמוקרטיה|זכויות\s+אדם|הפרדת\s+רשויות|שלטון\s+החוק|בג"?ץ|כנסת|מגילת\s+העצמאות|civics|democracy|human\s+rights|constitution/i,
    profile: {
      id: 'civics',
      labelHe: 'אזרחות',
      labelEn: 'Civics & Government',
      tutorDirective:
        'Subject: Civics. Focus on democratic principles, human & civil rights, separation of powers, rule of law, and applying civic concepts to real case studies.',
    },
  },
  {
    rx: /לשון|דקדוק|תחביר|מערכת\s+הצורות|בניינים|גזרות|שורש|משקל|הבעה|שחבור|grammar|syntax|morphology|hebrew\s+language/i,
    profile: {
      id: 'language',
      labelHe: 'לשון והבעה',
      labelEn: 'Language & Grammar',
      tutorDirective:
        'Subject: Language & Grammar. Focus on syntax (תחביר), morphology (בניינים, שורשים, משקלים), parts of speech, semantics, and accurate linguistic analysis.',
    },
  },
  {
    rx: /מדעי\s+המחשב|תכנות|אלגוריתמים|מבני\s+נתונים|פייתון|ג׳אווה|סיבוכיות|רקורסיה|עצים|מחסנית|תור|computer\s+science|algorithms|data\s+structures|recursion|complexity/i,
    profile: {
      id: 'cs',
      labelHe: 'מדעי המחשב',
      labelEn: 'Computer Science',
      tutorDirective:
        'Subject: Computer Science. Focus on algorithmic thinking, data structures, time/space complexity, tracing code outputs, and edge cases.',
    },
  },
];

export function detectSubjectStudyProfile(text: string): SubjectStudyProfile | null {
  const sample = String(text || '');
  if (!sample.trim()) return null;
  for (const item of SUBJECT_PROFILES) {
    if (item.rx.test(sample)) return item.profile;
  }
  return null;
}

function cleanLearnedTopicPrompt(userMsg: string): string {
  return String(userMsg || '')
    .replace(
      /^(?:בבקשה\s+)?(?:אפשר\s+)?(?:תלמד|למד|תסביר|הסבר|סכם|תסכם|ספר|תספר|תעזור\s+לי\s+ללמוד|עזור\s+לי\s+ללמוד|תן\s+לי\s+סיכום|הכן\s+לי\s+סיכום|אני\s+רוצה\s+ללמוד|אני\s+לומד|אני\s+צריך\s+ללמוד)\s*(?:אותי\s+|לי\s+)?(?:על\s+|את\s+|בנושא\s+|לגבי\s+|ב-?)?/i,
      ''
    )
    .replace(
      /^(?:please\s+)?(?:can\s+you\s+|could\s+you\s+)?(?:teach\s+me|explain(?:\s+to\s+me)?|summarize|help\s+me\s+(?:learn|study)|i\s+want\s+to\s+(?:learn|study)|tell\s+me)\s*(?:about\s+|on\s+|the\s+topic\s+of\s+)?/i,
      ''
    )
    .replace(/[?.!،,\s]+$/g, '')
    .trim();
}

export function resolveQuizContextFromConversation(
  rawText: string,
  extractedTopic: string,
  messages: ChatTurnMessage[] = [],
  currentMsgId?: string
): {
  topic: string;
  studyMaterialContext: string;
  subjectProfile: SubjectStudyProfile | null;
  usedConversationContext: boolean;
} {
  const prior = (Array.isArray(messages) ? messages : []).filter(
    (m) => m && !m.pending && m.id !== currentMsgId && m.content && String(m.content).trim()
  );

  // Exclude the very last user message if it equals rawText
  const history =
    prior.length &&
    prior[prior.length - 1].role === 'user' &&
    String(prior[prior.length - 1].content || '').trim() === String(rawText || '').trim()
      ? prior.slice(0, -1)
      : prior;

  const isReferential = isReferentialOrEmptyQuizTopic(extractedTopic, rawText);

  // Gather recent assistant teaching messages & recent user study prompts
  const recentAssistantMsgs = [...history]
    .reverse()
    .filter((m) => m.role === 'assistant' && String(m.content || '').trim().length > 40)
    .slice(0, 3);

  const recentUserTopicMsgs = [...history]
    .reverse()
    .filter((m) => m.role === 'user' && !isQuizOrTestRequest(String(m.content || '')))
    .slice(0, 4);

  let resolvedTopic = extractedTopic;
  let usedConversationContext = false;

  if (isReferential) {
    // 1. Try extracting topic from the most recent non-quiz user message (e.g. "תלמד אותי בתנך על מלכים א פרק יז - אליהו הנביא")
    for (const um of recentUserTopicMsgs) {
      const cleaned = cleanLearnedTopicPrompt(String(um.content || ''));
      if (cleaned && cleaned.length >= 3 && !isReferentialOrEmptyQuizTopic(cleaned)) {
        resolvedTopic = cleaned.slice(0, 120);
        usedConversationContext = true;
        break;
      }
    }
    // 2. If still not found, extract the first markdown heading or bold title from the last assistant message
    if (!usedConversationContext && recentAssistantMsgs.length > 0) {
      const lastBot = String(recentAssistantMsgs[0].content || '');
      const headingMatch =
        lastBot.match(/^#{1,3}\s+([^\n#*]{3,90})/m) || lastBot.match(/\*\*([^*]{3,80})\*\*/);
      if (headingMatch && headingMatch[1]) {
        resolvedTopic = headingMatch[1].replace(/[#*`]/g, '').trim();
        usedConversationContext = true;
      } else {
        resolvedTopic = lastBot.replace(/\s+/g, ' ').trim().slice(0, 80);
        usedConversationContext = true;
      }
    }
  } else if (recentAssistantMsgs.length > 0) {
    // Even if user named a short topic (e.g. "תעשה לי מבחן בתנך"), check if the recent conversation taught that subject
    const topicWords = resolvedTopic
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);
    const recentCombined = [
      ...recentUserTopicMsgs.map((m) => m.content || ''),
      ...recentAssistantMsgs.map((m) => m.content || ''),
    ]
      .join('\n')
      .toLowerCase();
    if (topicWords.some((w) => recentCombined.includes(w))) {
      usedConversationContext = true;
      // If the user only said "תנך" (1-2 words) and the previous user prompt had a specific chapter/story, enrich the topic!
      if (topicWords.length <= 2 && recentUserTopicMsgs.length > 0) {
        const detailedPrev = cleanLearnedTopicPrompt(String(recentUserTopicMsgs[0].content || ''));
        if (detailedPrev && detailedPrev.length > resolvedTopic.length && detailedPrev.length <= 120) {
          resolvedTopic = detailedPrev;
        }
      }
    }
  }

  let studyMaterialContext = '';
  if ((isReferential || usedConversationContext) && (recentAssistantMsgs.length > 0 || recentUserTopicMsgs.length > 0)) {
    const snippets: string[] = [];
    if (recentUserTopicMsgs.length > 0) {
      snippets.push(
        `Student's study request in this chat: ${ recentUserTopicMsgs
          .slice(0, 2)
          .reverse()
          .map((m) => String(m.content || '').trim())
          .join(' | ') }`
      );
    }
    if (recentAssistantMsgs.length > 0) {
      const taughtMaterial = recentAssistantMsgs
        .slice(0, 2)
        .reverse()
        .map((m) => String(m.content || '').trim().slice(0, 2600))
        .join('\n---\n');
      snippets.push(`Material taught in this conversation (base the test questions directly on this material):\n${taughtMaterial}`);
    }
    studyMaterialContext = snippets.join('\n\n').slice(0, 4800);
  }

  const subjectProfile = detectSubjectStudyProfile(`${rawText}\n${resolvedTopic}\n${studyMaterialContext}`);

  return {
    topic: resolvedTopic,
    studyMaterialContext,
    subjectProfile,
    usedConversationContext: usedConversationContext || Boolean(studyMaterialContext),
  };
}

