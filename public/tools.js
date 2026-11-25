/* Lokizenith v2.2 tools — chat auto-routing + Labs. Made by Lokiz Studios.
   Every tool: {id, icon, label, test(text,{hasImages}), run(text, ctx) → {content, cards}}.  stark:true = needs Lokizen 4.0 Stark. */
(function(){
'use strict';
const A = window.App, {$, $$, el, esc} = A;
const t = s => window.I18N ? I18N.t(s) : s;
const langOf = s => /[\u0590-\u05FF]/.test(s) ? 'he' : /[\u0600-\u06FF]/.test(s) ? 'ar' : 'en';
const LN = {en:'English', he:'Hebrew', ar:'Arabic'};
const pick = (lg, o) => o[lg] || o.en;
const imgsOf = um => ((um && um.attachments) || []).filter(a => a.kind === 'image');
const lab = (o) => A.registerLab(Object.assign({isNew: true}, o));

/* ======================= 0. QUIZ / TEST IN CHAT (both) ======================= */
const CODE_TEST_EXCLUDE_RX = /\b(unit\s*tests?|test\s*cases?|jest|pytest|vitest|mocha|cypress|playwright|node:test|npm\s+test|tsx\s+--test)\b/i;
const QUIZ_RX = /^\s*\/(test|quiz|exam)\b|\b(quiz|trivia|test\s+me|quiz\s+me|exam\s+on|exam\s+about|test\s+on|test\s+about)\b|(create|make|give\s+me|build|generate|write|prepare).{0,35}\b(quiz|test|exam|questions?)\b|\b\d{1,2}\s*(?:-|\s)?\s*(questions?|qs?)\s+(quiz|test|exam)\b|בוחן|מבחן|חידון|תבחן\s*אותי|בחן\s*אותי|מבדק|שאלון|תעשה\s+(?:לי\s+)?מבחן|תכין\s+(?:לי\s+)?מבחן|צור\s+(?:לי\s+)?מבחן|اختبار|اختبرني|امتحان/i;
function quizTest(tx){
  const s = String(tx || '').trim();
  if (!s || s.length > 420) return false;
  if (CODE_TEST_EXCLUDE_RX.test(s)) return false;
  return QUIZ_RX.test(s);
}
function parseQuizRequestSpecClient(rawText, defaultCount){
  const text = String(rawText || '').trim();
  const lg = langOf(text);
  let requestedCount = null;
  const patterns = [
    /(?:between\s+\d+\s*(?:and|-|to)\s*)?(\d{1,2})\s*(?:questions?|qs?\b|שאלות|שאלה|أسئلة|سؤال)/i,
    /(?:עם|של|בן|בת|with|of|containing|having)\s+(\d{1,2})\s*(?:questions?|qs?\b|שאלות|שאלה|أسئلة|سؤال)/i,
    /(?:quiz|test|exam|מבחן|בוחן|חידון|מבדק|اختبار)\s+(?:של|עם|with|of)\s+(\d{1,2})/i
  ];
  for (const rx of patterns){
    const m = text.match(rx);
    if (m && m[1]){
      const val = parseInt(m[1], 10);
      if (Number.isFinite(val) && val >= 1 && val <= 99){ requestedCount = val; break; }
    }
  }
  const fallback = Number.isFinite(+defaultCount) ? +defaultCount : 8;
  const baseN = requestedCount !== null ? requestedCount : fallback;
  const n = Math.max(5, Math.min(20, baseN));

  const wantsOpen = /\b(open(?:\s|-)?(?:ended)?\s*questions?|written\s*questions?|type\s+(?:the\s+)?answers?|free(?:\s|-)?text|short(?:\s|-)?answer)\b|שאלות?\s+פתוחות?|שאלה\s+פתוחה|לכתוב\s+(?:את\s+)?התשובה|להקליד\s+(?:את\s+)?התשובה|פתוחות|أسئلة\s+مفتوحة/i.test(text);
  const wantsMc = /\b(multiple(?:\s|-)?choice|options?\s*questions?|mc\s*questions?|choice\s*questions?)\b|שאלות?\s+אמריקאיות?|אמריקאיות|רב(?:\s|-)?ברירה|בחירה|אפשרויות|اختيار\s+من\s+متعدد/i.test(text);
  const onlyOpen = /\b(only\s+open|all\s+open|just\s+open)\b|רק\s+(?:שאלות\s+)?פתוחות/i.test(text);
  const onlyMc = /\b(only\s+(?:multiple\s*choice|options?|mc)|all\s+multiple\s*choice)\b|רק\s+(?:שאלות\s+)?(?:אמריקאיות|רב(?:\s|-)?ברירה)/i.test(text);
  const onlyTf = /\b(only\s+true\s*(?:\/|or)\s*false|all\s+true\s*(?:\/|or)\s*false)\b|רק\s+(?:שאלות\s+)?נכון\s*(?:או\s*|\/)?לא\s*נכון/i.test(text);
  const onlyFill = /\b(only\s+fill(?:\s|-)*in(?:\s|-)*(?:the(?:\s|-)*blanks?)?)\b|רק\s+(?:שאלות\s+)?(?:השלמת\s*משפט(?:ים)?|השלם\s*את\s*החסר)/i.test(text);

  const explicitMcMatch = text.match(/(\d{1,2})\s*(?:option(?:s)?|multiple(?:\s|-)?choice|mc|אמריקאיות|רב(?:\s|-)?ברירה|בחירה)(?:\s+questions?|\s+שאלות)?/i);
  const explicitOpenMatch = text.match(/(\d{1,2})\s*(?:open(?:\s|-)?(?:ended)?|written|פתוחות)(?:\s+questions?|\s+שאלות)?/i);

  let mcCount = 0, tfCount = 0, fillCount = 0, openCount = 0;
  if (explicitMcMatch && explicitOpenMatch){
    const rawMc = Math.max(1, parseInt(explicitMcMatch[1], 10));
    const rawOpen = Math.max(1, parseInt(explicitOpenMatch[1], 10));
    const total = Math.max(5, Math.min(20, rawMc + rawOpen));
    mcCount = Math.min(total - 1, rawMc);
    openCount = total - mcCount;
    return { n: total, mcCount, tfCount: 0, fillCount: 0, openCount, lg };
  } else if (onlyOpen || (wantsOpen && !wantsMc && /\bonly\b|רק/i.test(text))){
    openCount = n;
  } else if (onlyMc){
    mcCount = n;
  } else if (onlyTf){
    tfCount = n;
  } else if (onlyFill){
    fillCount = n;
  } else {
    // 4-type balanced distribution: mc + tf + fill + open
    tfCount = Math.max(1, Math.round(n * 0.2));
    fillCount = Math.max(1, Math.round(n * 0.2));
    openCount = Math.max(1, Math.round(n * 0.25));
    mcCount = Math.max(1, n - tfCount - fillCount - openCount);
  }
  return { n, mcCount, tfCount, fillCount, openCount, lg };
}
function extractQuizTopicClient(text){
  let topic = String(text || '')
    .replace(/^\s*\/(test|quiz|exam)\s*/i, '')
    .replace(/^(please\s+)?(can\s+you\s+|could\s+you\s+)?(create|make|give\s+me|build|generate|write|prepare)?\s*(me\s+)?(a|an)?\s*(short|quick|hard|easy|medium|full|complete|new|interactive)?\s*(quiz|test|exam|trivia)\s*(me\s+)?(about|on|for|in|regarding)?\s*/i, '')
    .replace(/^(בבקשה\s+)?(תכין|צור|תיצור|תעשה|תן|כתוב|תכתוב|תבנה)?\s*(לי)?\s*(בוחן|מבחן|חידון|מבדק|שאלון)\s*(חדש\s+|קצר\s+|מלא\s+)?(על|בנושא|ב-?|לגבי)?\s*/i, '')
    .replace(/^(תבחן|בחן)\s+אותי\s*(על|בנושא|ב-?)?\s*/i, '')
    .replace(/[,(]?\s*(with|in|of|containing|having|between|עם|ב|של|בן|בת|-)?\s*(?:\d{1,2}\s*(?:and|-|to|עד)\s*)?\d{1,2}\s*(questions?|qs?\b|שאלות|שאלה|أسئلة|سؤال)\)?/ig, '')
    .replace(/[,(]?\s*(?:including|with|both|and|or|only|כולל|עם|וגם|שילוב\s+של|רק)?\s*(?:option(?:s)?\s*questions?|multiple(?:\s|-)?choice(?:\s*questions?)?|open(?:\s|-)?(?:ended)?\s*questions?|written\s*questions?|true\s*(?:\/|or)\s*false(?:\s*questions?)?|fill(?:\s|-)*in(?:\s|-)*the(?:\s|-)*blanks?|שאלות?\s+אמריקאיות?|שאלות?\s+פתוחות?|נכון\s*או\s*לא\s*נכון|השלמת\s*משפט(?:ים)?|אמריקאיות|פתוחות|רב(?:\s|-)?ברירה)/ig, '')
    .replace(/[,(]?\s*(?:and\s+)?(?:at\s+the\s+end\s+)?(?:check\s+my\s+answers?|give\s+me\s+(?:a\s+)?score|grade\s+me|ותבדוק\s+אותי|ותן\s+לי\s+ציון).*$/i, '')
    .replace(/[,]?\s*\b(easy|medium|hard|difficult|simple)\b(\s*(level|difficulty))?/ig, '')
    .replace(/\s+(קשה|קל|בינוני|ברמה\s+קשה|ברמה\s+קלה|ברמה\s+בינונית)\b/g, '')
    .replace(/^[\s,.:;\-–—]+|[\s?.!,:;\-–—]+$/g, '')
    .trim();
  if (!topic || topic.length < 2){
    const aboutMatch = String(text || '').match(/(?:about|on|for|על|בנושא)\s+([^,.?!]+?)(?:\s+(?:with|עם|בן|של)\s+\d+|\s*$)/i);
    if (aboutMatch && aboutMatch[1]) topic = aboutMatch[1].trim();
  }
  return topic || String(text || '').replace(/^\s*\/(test|quiz|exam)\s*/i, '').trim() || 'General Knowledge';
}
const REFERENTIAL_QUIZ_TOPIC_RX = /^(?:זה|הזה|זאת|הזאת|הם|הן|אלו|אלה|החומר(?:\s+הזה)?|הנושא(?:\s+הזה)?|מה\s+ש(?:דיברנו|למדנו|אמרת|הסברת|כתבת|ביקשתי|שלחתי)(?:\s+עליו|\s+עכשיו)?|עליו|עליה|עליהם|אותו\s+דבר|אותו\s+נושא|הפרק(?:\s+הזה)?|הסיפור(?:\s+הזה)?|המאמר(?:\s+הזה)?|this|that|it|these|those|this\s+topic|that\s+topic|this\s+subject|this\s+material|the\s+material|what\s+we\s+(?:just\s+)?(?:talked|learned|studied|discussed)(?:\s+about)?|what\s+you\s+(?:just\s+)?(?:taught|explained|said)|the\s+above|same\s+topic|General\s+Knowledge|ידע\s+כללי|معلومات\s+عامة)$/i;

function isReferentialOrEmptyQuizTopicClient(topic, rawRequest){
  const clean = String(topic || '').replace(/^(?:על|בנושא|לגבי|ב-?|about|on|for|of|in)\s+/i, '').replace(/[?.!،,\s]+$/g, '').trim();
  if (!clean || clean.length < 2) return true;
  if (REFERENTIAL_QUIZ_TOPIC_RX.test(clean)) return true;
  if (/^(?:על\s+זה|בנושא\s+הזה|על\s+החומר\s+הזה|על\s+הנושא\s+הזה|על\s+מה\s+שלמדנו|על\s+מה\s+שדיברנו|על\s+מה\s+שהסברת|about\s+this|on\s+this|about\s+that|on\s+that|about\s+it|on\s+it|on\s+what\s+we\s+learned|about\s+what\s+you\s+taught)$/i.test(String(topic || '').trim())) return true;
  if (rawRequest && /(?:מבחן|בוחן|חידון|תבחן\s+אותי|בחן\s+אותי|test|quiz|exam)\s+(?:אותי\s+)?(?:על\s+זה|על\s+הנושא\s+הזה|על\s+החומר\s+הזה|על\s+מה\s+שלמדנו|על\s+מה\s+שדיברנו|על\s+מה\s+שהסברת|עליו|עליה|on\s+this|about\s+this|on\s+that|about\s+that|on\s+it|about\s+it|on\s+what\s+we\s+learned)\b/i.test(rawRequest) && clean.split(/\s+/).length <= 3) return true;
  return false;
}

const SUBJECT_CURRICULUM_PROFILES = [
  { rx: /תנ"?ך|תורה|נביאים|כתובים|בראשית|שמות|ויקרא|במדבר|דברים|יהושע|שופטים|שמואל|מלכים|ישעיהו|ירמיהו|יחזקאל|תהילים|משלי|איוב|מגילת|קהלת|אסתר|רות|עזרא|נחמיה|דברי\s+הימים|bible|tanakh|torah|genesis|exodus|kings|samuel|isaiah|jeremiah/i,
    prompt: 'Subject: Tanakh (Hebrew Bible / תנ״ך). Focus on chapters & verses (פרקים ופסוקים), biblical characters & their motives, keywords/leitwort (מילים מנחות ושורש מנחה), literary devices (תקבולת, אירוניה, אנלוגיה, קושי ופתרונו), historical/moral messages, and comparisons between biblical passages.' },
  { rx: /היסטוריה|מלחמת\s+העולם|המהפכה|ציונות|השואה|לאומיות|בית\s+שני|יוון|רומא|ימי\s+הביניים|history|world\s+war|revolution|holocaust|zionism/i,
    prompt: 'Subject: History (היסטוריה). Focus on causes and consequences (גורמים ותוצאות), historical timeline & turning points, primary source analysis, key figures, ideological movements, and historical significance.' },
  { rx: /מתמטיקה|אלגברה|גיאומטריה|טריגונומטריה|חדו"?א|נגזרת|אינטגרל|משוואה|משוואות|פונקציה|פונקציות|הסתברות|וקטורים|math|algebra|geometry|calculus|derivative|integral|equation|probability/i,
    prompt: 'Subject: Mathematics (מתמטיקה). Focus on step-by-step problem solving, formulas, geometric/algebraic reasoning, numerical calculation questions, and conceptual understanding of theorems.' },
  { rx: /פיזיקה|מכניקה|חשמל|מגנטיות|אופטיקה|קרינה|חוקי\s+ניוטון|אנרגיה|תנע|כוח|תאוצה|מהירות|physics|mechanics|electromagnetism|optics|newton|kinematics/i,
    prompt: 'Subject: Physics (פיזיקה). Focus on physical laws, formulas & units, real-world physical phenomena, force/energy analysis, and quantitative/conceptual problem solving.' },
  { rx: /ביולוגיה|תא|גנטיקה|דנ"?א|אבולוציה|אקולוגיה|מערכת\s+הדם|מערכת\s+העצבים|פוטוסינתזה|נשימה\s+תאית|אנזימים|biology|genetics|dna|cell|ecology|photosynthesis|evolution/i,
    prompt: 'Subject: Biology & Life Sciences (ביולוגיה ומדעים). Focus on biological mechanisms, structure-to-function relationships (התאמה בין מבנה לתפקוד), processes, experiments/control groups, and physiological systems.' },
  { rx: /כימיה|אטום|מולקולה|טבלה\s+מחזורית|קשר\s+כימי|חומצה|בסיס|חמצון|חיזור|מולים|chemistry|periodic\s+table|molecule|acid|base|redox/i,
    prompt: 'Subject: Chemistry (כימיה). Focus on atomic structure, chemical bonding, reactions, stoichiometry, states of matter, and molecular properties.' },
  { rx: /ספרות|שירה|סיפור\s+קצר|רומן|דרמה|מטאפורה|דימוי|מוטיב|דובר|נמען|אירוניה|literature|poetry|literary|metaphor|protagonist/i,
    prompt: 'Subject: Literature (ספרות). Focus on literary devices (אמצעים אמנותיים), character development, narrator/point of view, central themes, conflict, and textual evidence.' },
  { rx: /אזרחות|דמוקרטיה|זכויות\s+אדם|הפרדת\s+רשויות|שלטון\s+החוק|בג"?ץ|כנסת|מגילת\s+העצמאות|civics|democracy|human\s+rights|constitution/i,
    prompt: 'Subject: Civics (אזרחות). Focus on democratic principles, human & civil rights, separation of powers, rule of law, and applying civic concepts to real case studies.' },
  { rx: /לשון|דקדוק|תחביר|מערכת\s+הצורות|בניינים|גזרות|שורש|משקל|הבעה|שחבור|grammar|syntax|morphology|hebrew\s+language/i,
    prompt: 'Subject: Language & Grammar (לשון והבעה). Focus on syntax (תחביר), morphology (בניינים, שורשים, משקלים), parts of speech, semantics, and accurate linguistic analysis.' },
  { rx: /מדעי\s+המחשב|תכנות|אלגוריתמים|מבני\s+נתונים|פייתון|ג׳אווה|סיבוכיות|רקורסיה|עצים|מחסנית|תור|computer\s+science|algorithms|data\s+structures|recursion|complexity/i,
    prompt: 'Subject: Computer Science (מדעי המחשב). Focus on algorithmic thinking, data structures, time/space complexity, tracing code outputs, and edge cases.' }
];

function cleanLearnedTopicPromptClient(userMsg){
  return String(userMsg || '')
    .replace(/^(?:בבקשה\s+)?(?:אפשר\s+)?(?:תלמד|למד|תסביר|הסבר|סכם|תסכם|ספר|תספר|תעזור\s+לי\s+ללמוד|עזור\s+לי\s+ללמוד|תן\s+לי\s+סיכום|הכן\s+לי\s+סיכום|אני\s+רוצה\s+ללמוד|אני\s+לומד|אני\s+צריך\s+ללמוד)\s*(?:אותי\s+|לי\s+)?(?:על\s+|את\s+|בנושא\s+|לגבי\s+|ב-?)?/i, '')
    .replace(/^(?:please\s+)?(?:can\s+you\s+|could\s+you\s+)?(?:teach\s+me|explain(?:\s+to\s+me)?|summarize|help\s+me\s+(?:learn|study)|i\s+want\s+to\s+(?:learn|study)|tell\s+me)\s*(?:about\s+|on\s+|the\s+topic\s+of\s+)?/i, '')
    .replace(/[?.!،,\s]+$/g, '')
    .trim();
}

function resolveQuizContextClient(rawText, extractedTopic, ctx){
  const convMsgs = (ctx && ctx.conv && Array.isArray(ctx.conv.messages)) ? ctx.conv.messages : [];
  const curId = ctx && ctx.um && ctx.um.id;
  const prior = convMsgs.filter(m => m && !m.pending && m.id !== curId && m.content && String(m.content).trim());
  const history = (prior.length && prior[prior.length - 1].role === 'user' && String(prior[prior.length - 1].content || '').trim() === String(rawText || '').trim())
    ? prior.slice(0, -1)
    : prior;

  const isRef = isReferentialOrEmptyQuizTopicClient(extractedTopic, rawText);
  const recentAssistant = [...history].reverse().filter(m => m.role === 'assistant' && String(m.content || '').trim().length > 40).slice(0, 3);
  const recentUserTopics = [...history].reverse().filter(m => m.role === 'user' && !quizTest(String(m.content || ''))).slice(0, 4);

  let resolvedTopic = extractedTopic;
  let usedConv = false;

  if (isRef){
    for (const um of recentUserTopics){
      const cleaned = cleanLearnedTopicPromptClient(um.content || '');
      if (cleaned && cleaned.length >= 3 && !isReferentialOrEmptyQuizTopicClient(cleaned)){
        resolvedTopic = cleaned.slice(0, 120);
        usedConv = true;
        break;
      }
    }
    if (!usedConv && recentAssistant.length > 0){
      const lastBot = String(recentAssistant[0].content || '');
      const hm = lastBot.match(/^#{1,3}\s+([^\n#*]{3,90})/m) || lastBot.match(/\*\*([^*]{3,80})\*\*/);
      if (hm && hm[1]){
        resolvedTopic = hm[1].replace(/[#*`]/g, '').trim();
        usedConv = true;
      } else {
        resolvedTopic = lastBot.replace(/\s+/g, ' ').trim().slice(0, 80);
        usedConv = true;
      }
    }
  } else if (recentAssistant.length > 0){
    const topicWords = resolvedTopic.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length >= 2);
    const recentCombined = [...recentUserTopics.map(m => m.content || ''), ...recentAssistant.map(m => m.content || '')].join('\n').toLowerCase();
    if (topicWords.some(w => recentCombined.includes(w))){
      usedConv = true;
      if (topicWords.length <= 2 && recentUserTopics.length > 0){
        const detailedPrev = cleanLearnedTopicPromptClient(recentUserTopics[0].content || '');
        if (detailedPrev && detailedPrev.length > resolvedTopic.length && detailedPrev.length <= 120){
          resolvedTopic = detailedPrev;
        }
      }
    }
  }

  let studyContext = '';
  if ((isRef || usedConv) && (recentAssistant.length > 0 || recentUserTopics.length > 0)){
    const parts = [];
    if (recentUserTopics.length > 0){
      parts.push('Student study request in this chat: ' + recentUserTopics.slice(0, 2).reverse().map(m => String(m.content || '').trim()).join(' | '));
    }
    if (recentAssistant.length > 0){
      parts.push('Material taught in this conversation:\n' + recentAssistant.slice(0, 2).reverse().map(m => String(m.content || '').trim().slice(0, 2600)).join('\n---\n'));
    }
    studyContext = parts.join('\n\n').slice(0, 4800);
  }

  const combinedSample = `${rawText}\n${resolvedTopic}\n${studyContext}`;
  let subjectPrompt = '';
  for (const sp of SUBJECT_CURRICULUM_PROFILES){
    if (sp.rx.test(combinedSample)){ subjectPrompt = sp.prompt; break; }
  }

  return { topic: resolvedTopic, studyContext, subjectPrompt, usedConv };
}

async function quizRun(text, ctx){
  const defLen = Math.max(5, Math.min(20, +(A.settings && A.settings().quizLength) || 8));
  const spec = parseQuizRequestSpecClient(text, defLen);
  const rawExtractedTopic = extractQuizTopicClient(text);
  const resolved = resolveQuizContextClient(text, rawExtractedTopic, ctx);
  const topic = resolved.topic;
  const lg = /[\u0590-\u05FF]/.test(topic) ? 'he' : /[\u0600-\u06FF]/.test(topic) ? 'ar' : spec.lg;
  const n = spec.n;
  const diff = /hard|difficult|קשה|صعب/i.test(text) ? 'hard' : /easy|simple|קל|سهل/i.test(text) ? 'easy' : 'medium';
  ctx.work.log(pick(lg, {
    en: `Building ${n}-question test on "${topic}" (${spec.mcCount} MC · ${spec.tfCount} True/False · ${spec.fillCount} Fill-Blank · ${spec.openCount} Open)…`,
    he: `בונה מבחן בן ${n} שאלות על "${topic}" (${spec.mcCount} אמריקאיות · ${spec.tfCount} נכון/לא נכון · ${spec.fillCount} השלמת משפט · ${spec.openCount} פתוחות)…`,
    ar: `جارٍ إعداد اختبار من ${n} أسئلة حول "${topic}"…`
  }));
  const q = await Lessons.genQuiz({
    topic,
    n,
    diff,
    lang: lg,
    mcCount: spec.mcCount,
    tfCount: spec.tfCount,
    fillCount: spec.fillCount,
    openCount: spec.openCount,
    subjectPrompt: resolved.subjectPrompt,
    studyContext: resolved.studyContext,
    tier: ctx.tier,
    signal: ctx.signal,
    log: x => ctx.work.log(x)
  });
  if (!q || !q.questions || q.questions.length < 3) {
    throw Object.assign(new Error(pick(lg, {en:'Could not build enough questions — try again', he:'לא הצלחתי לבנות מספיק שאלות — נסו שוב'})), {userFacing: true});
  }
  const actualMc = q.questions.filter(x => x.type === 'mc').length;
  const actualTf = q.questions.filter(x => x.type === 'tf').length;
  const actualFill = q.questions.filter(x => x.type === 'fill').length;
  const actualOpen = q.questions.filter(x => x.type === 'open').length;
  const breakdownHe = [
    actualMc ? `${actualMc} אמריקאיות` : '',
    actualTf ? `${actualTf} נכון/לא נכון` : '',
    actualFill ? `${actualFill} השלמת משפט` : '',
    actualOpen ? `${actualOpen} שאלות פתוחות` : ''
  ].filter(Boolean).join(' + ');
  const breakdownEn = [
    actualMc ? `${actualMc} multiple-choice` : '',
    actualTf ? `${actualTf} true/false` : '',
    actualFill ? `${actualFill} fill-in-the-blank` : '',
    actualOpen ? `${actualOpen} open written` : ''
  ].filter(Boolean).join(' + ');
  return {
    content: pick(lg, {
      en: `Here is your interactive test on **${topic}** — **${q.questions.length} questions** (${breakdownEn}). Answer all questions and click **✓ Finish & Check Answers** at the end to get your full score and AI feedback! 📝`,
      he: `הנה המבחן האינטראקטיבי שלך על **${topic}** — **${q.questions.length} שאלות** (${breakdownHe}). ענו על כל השאלות ולחצו על **✓ סיום ובדיקת המבחן** בסוף כדי לקבל בדיקה מלאה וציון! 📝`,
      ar: `إليك اختبارك التفاعلي حول **${topic}** — **${q.questions.length} أسئلة**. أجب عن جميع الأسئلة واضغط على إنهاء وفحص الإجابات للحصول على نتيجتك! 📝`
    }),
    cards: [{type:'quiz', data: Object.assign(q, {lang: lg, state:{i:0, answers:[], drafts:[]}}), summary: `You gave an interactive test "${q.title}" with ${q.questions.length} questions (${breakdownEn})`}]
  };
}
A.registerCard('quiz', (d, m, c) => {
  const env = {lang: d.lang || 'en', save: () => m && A.persistMsg(m), scroll: () => {}, tier: () => A.state.model,
    finish(st){ if (c){ c.summary = `Test "${d.title}" — user scored ${st.score}/${d.questions.length}`; } if (m) A.persistMsg(m); if (st.score / d.questions.length >= .8 && window.Mascot) Mascot.set('happy'); },
    retry(qs){ A.sendText(pick(env.lang, {en:'Test me again on the questions I got wrong', he:'תבחן אותי שוב על השאלות שטעיתי בהן', ar:'اختبرني مجددًا في الأسئلة التي أخطأت فيها'}), {quizRetry: qs, title: d.title}, 'quiz'); },
    newQuiz(topic){ A.sendText(pick(env.lang, {en:'Create a new test about ', he:'צור מבחן חדש על ', ar:'أنشئ اختبارًا جديدًا عن '}) + topic, null, 'quiz'); }};
  const box = Lessons.Quiz({data: d}, env); box.classList.add('chat-quiz'); return box;
});
A.registerTool({id:'quiz', icon:'📝', label:'Test / Quiz', test: quizTest, run: async (text, ctx) => {
  const meta = ctx.um && ctx.um.meta;
  if (meta && meta.quizRetry){ const lg = langOf(text); return {content: pick(lg, {en:'Let’s fix those — same questions, fresh try 💪', he:'בואו נתקן — אותן שאלות, ניסיון חדש 💪', ar:'لنصحح ذلك — نفس الأسئلة، محاولة جديدة 💪'}), cards:[{type:'quiz', data:{title: meta.title, lang: lg, questions: meta.quizRetry, state:{i:0, answers:[], drafts:[]}}, summary:'You gave a retry test'}]}; }
  return quizRun(text, ctx);
}});

/* ======================= 1. WEATHER (both) ======================= */
const WX = {0:['☀️','Clear'],1:['🌤','Mostly clear'],2:['⛅','Partly cloudy'],3:['☁️','Overcast'],45:['🌫','Fog'],48:['🌫','Fog'],51:['🌦','Light drizzle'],53:['🌦','Drizzle'],55:['🌧','Heavy drizzle'],61:['🌦','Light rain'],63:['🌧','Rain'],65:['🌧','Heavy rain'],71:['🌨','Light snow'],73:['🌨','Snow'],75:['❄️','Heavy snow'],80:['🌦','Showers'],81:['🌧','Showers'],82:['⛈','Heavy showers'],95:['⛈','Thunderstorm'],96:['⛈','Thunderstorm'],99:['⛈','Thunderstorm']};
const WXHE = {Clear:'בהיר','Mostly clear':'בהיר ברובו','Partly cloudy':'מעונן חלקית',Overcast:'מעונן',Fog:'ערפל','Light drizzle':'טפטוף קל',Drizzle:'טפטוף','Heavy drizzle':'טפטוף כבד','Light rain':'גשם קל',Rain:'גשם','Heavy rain':'גשם כבד','Light snow':'שלג קל',Snow:'שלג','Heavy snow':'שלג כבד',Showers:'ממטרים','Heavy showers':'ממטרים כבדים',Thunderstorm:'סופת רעמים'};
const wxTest = tx => /\b(weather|forecast|temperature|rain(ing)?|umbrella|how (hot|cold))\b|מזג (ה)?אוויר|תחזית|יירד גשם|כמה מעלות|חם היום|קר היום|الطقس|درجة الحرارة|هل ستمطر/i.test(tx) && tx.length < 160;
async function wxRun(text, ctx){
  const lg = langOf(text);
  const m = text.match(/\b(?:in|at|for)\s+([A-Z\u00C0-\u024F][\w\u00C0-\u024F' .-]{1,40}?)(?:\s+(?:today|tomorrow|this|next|now|on)\b|[?.!,]|$)/) || text.match(/(?:ב|של\s)([\u05D0-\u05EA][\u05D0-\u05EA'" -]{1,30}?)(?:\s+(?:היום|מחר|השבוע|עכשיו)|[?.!,]|$)/) || text.match(/في\s+([\u0600-\u06FF ]{2,30}?)(?:\s+(?:اليوم|غدا)|[?.!,]|$)/);
  let place = null, label = '';
  const name = m && m[1] && !/^(the|my|this|זה|ה?עיר שלי)$/i.test(m[1].trim()) ? m[1].trim().replace(/^(ה)(?=[\u05D0-\u05EA]{3})/, '') : '';
  if (name && !/^(מזג|אוויר|תחזית)/.test(name)){
    ctx.work.log('Finding ' + name);
    const r = await LZ.tfetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=${lg}&name=${encodeURIComponent(name)}`, {}, 10000, ctx.signal); const j = await r.json();
    if (j.results && j.results[0]){ place = {lat: j.results[0].latitude, lon: j.results[0].longitude}; label = [j.results[0].name, j.results[0].country].filter(Boolean).join(', '); }
  }
  if (!place){ ctx.work.log('Getting your location'); const p = window.Geo && await Geo.get(); if (p){ place = p; label = pick(lg, {en:'Your location', he:'המיקום שלך', ar:'موقعك'}); } }
  if (!place) return {content: pick(lg, {en:'Which city? e.g. “weather in Haifa tomorrow” — or enable location in Settings → Location.', he:'באיזו עיר? למשל "מזג אוויר בחיפה מחר" — או אפשרו מיקום בהגדרות ← מיקום.', ar:'أي مدينة؟ مثل "الطقس في حيفا غدًا".'}), cards:[{type:'geo-enable', data:{}}]};
  ctx.work.log('Fetching the forecast');
  const r = await LZ.tfetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&forecast_days=7`, {}, 12000, ctx.signal);
  const w = await r.json(); if (!w.current) throw Object.assign(new Error('Weather service unavailable'), {userFacing:true});
  const c = w.current, d0 = WX[c.weather_code] || ['🌡', ''];
  const now = Date.now(), hi = w.hourly.time.findIndex(x => new Date(x).getTime() >= now - 3600e3);
  const data = {label, lang: lg, cur: {t: c.temperature_2m, feels: c.apparent_temperature, hum: c.relative_humidity_2m, wind: c.wind_speed_10m, code: c.weather_code}, hours: w.hourly.time.slice(hi, hi + 24).map((x, i) => ({h: x.slice(11, 16), t: w.hourly.temperature_2m[hi + i], p: w.hourly.precipitation_probability[hi + i]})), days: w.daily.time.map((x, i) => ({d: x, code: w.daily.weather_code[i], max: w.daily.temperature_2m_max[i], min: w.daily.temperature_2m_min[i], p: w.daily.precipitation_probability_max[i]}))};
  const desc = lg === 'he' ? (WXHE[d0[1]] || d0[1]) : d0[1];
  const tom = data.days[1];
  const content = pick(lg, {en:`${d0[0]} **${label}**: ${Math.round(c.temperature_2m)}° and ${desc.toLowerCase()} right now (feels like ${Math.round(c.apparent_temperature)}°). Tomorrow ${Math.round(tom.min)}–${Math.round(tom.max)}°, ${tom.p}% chance of rain.`, he:`${d0[0]} **${label}**: כרגע ${Math.round(c.temperature_2m)}° ו${desc} (מרגיש כמו ${Math.round(c.apparent_temperature)}°). מחר ${Math.round(tom.min)}–${Math.round(tom.max)}°, סיכוי לגשם ${tom.p}%.`, ar:`${d0[0]} **${label}**: ${Math.round(c.temperature_2m)}° الآن. غدًا ${Math.round(tom.min)}–${Math.round(tom.max)}°، احتمال المطر ${tom.p}%.`});
  return {content, cards:[{type:'weather', data, summary:`Weather card for ${label}: ${Math.round(c.temperature_2m)}°C now`}]};
}
A.registerCard('weather', d => {
  const lg = d.lang, D = new Intl.DateTimeFormat(lg === 'he' ? 'he-IL' : lg === 'ar' ? 'ar' : 'en-GB', {weekday:'short'});
  const b = el('div', 'wx-card'); b.setAttribute('data-noi18n', ''); b.dir = lg === 'en' ? 'ltr' : 'rtl';
  const c = d.cur, w0 = WX[c.code] || ['🌡', ''];
  const ts = d.hours.map(h => h.t), mn = Math.min(...ts), mx = Math.max(...ts), W = 480, H = 70;
  const pts = d.hours.map((h, i) => [i / (d.hours.length - 1) * W, H - 10 - (h.t - mn) / (mx - mn || 1) * (H - 26)]);
  b.innerHTML = `<div class="wx-top"><div class="wx-ic">${w0[0]}</div><div><div class="wx-t">${Math.round(c.t)}°</div><div class="wx-l"></div></div><ul class="wx-meta"><li>🤗 ${Math.round(c.feels)}°</li><li>💧 ${c.hum}%</li><li>💨 ${Math.round(c.wind)} km/h</li></ul></div>
  <svg class="wx-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="wxg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".45"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs><path d="M0,${H} L${pts.map(p => p.join(',')).join(' L')} L${W},${H}Z" fill="url(#wxg)"/><polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--acc)" stroke-width="2.5"/></svg>
  <div class="wx-hours">${d.hours.filter((h, i) => i % 3 === 0).map(h => `<span><small>${h.h}</small><b>${Math.round(h.t)}°</b><i>${h.p ? '💧' + h.p + '%' : ''}</i></span>`).join('')}</div>
  <div class="wx-days">${d.days.map(x => { const w = WX[x.code] || ['🌡']; return `<div><span class="dn">${D.format(new Date(x.d + 'T12:00'))}</span><span>${w[0]}</span><span class="pp">${x.p ? x.p + '%' : ''}</span><span class="mm"><b>${Math.round(x.max)}°</b> ${Math.round(x.min)}°</span></div>`; }).join('')}</div>`;
  $('.wx-l', b).textContent = d.label + ' · ' + (lg === 'he' ? (WXHE[w0[1]] || w0[1]) : w0[1]);
  return b;
});
A.registerTool({id:'weather', icon:'🌤', label:'Weather', test: (tx, o) => !o.hasImages && wxTest(tx), run: wxRun});

/* ======================= 2. CURRENCY (both) ======================= */
const CUR = {usd:'USD',dollar:'USD',dollars:'USD','$':'USD',דולר:'USD','דולרים':'USD',دولار:'USD',eur:'EUR',euro:'EUR',euros:'EUR','€':'EUR',יורו:'EUR',يورو:'EUR',ils:'ILS',nis:'ILS',shekel:'ILS',shekels:'ILS','₪':'ILS',שקל:'ILS',שקלים:'ILS','ש"ח':'ILS',شيكل:'ILS',gbp:'GBP',pound:'GBP',pounds:'GBP','£':'GBP',פאונד:'GBP',jpy:'JPY',yen:'JPY','¥':'JPY',ין:'JPY',chf:'CHF',franc:'CHF',cad:'CAD',aud:'AUD',cny:'CNY',yuan:'CNY',inr:'INR',rupee:'INR',try:'TRY',lira:'TRY',sek:'SEK',nok:'NOK',dkk:'DKK',pln:'PLN',czk:'CZK',huf:'HUF',ron:'RON',thb:'THB',mxn:'MXN',brl:'BRL',krw:'KRW',sgd:'SGD',hkd:'HKD',nzd:'NZD',zar:'ZAR',php:'PHP',idr:'IDR',myr:'MYR'};
const curRe = Object.keys(CUR).map(k => k.replace(/[$€£¥₪"]/g, m => '\\' + m)).sort((a, b) => b.length - a.length).join('|');
const FX_RX = new RegExp(`(\\d[\\d,.]*)\\s*(${curRe})\\s*(?:to|in|into|=|ל|ב|إلى|بـ)\\s*-?\\s*(${curRe})(?![a-z])`, 'i');
function fxParse(tx){
  const m = tx.match(FX_RX); if (m) return {amt: parseFloat(m[1].replace(/,/g, '')), from: CUR[m[2].toLowerCase()], to: CUR[m[3].toLowerCase()]};
  const m2 = tx.match(new RegExp(`(?:^|\\s)(${curRe})\\s*(\\d[\\d,.]*).{0,12}(?:to|in|ל|ב)\\s*-?\\s*(${curRe})`, 'i')); if (m2) return {amt: parseFloat(m2[2].replace(/,/g, '')), from: CUR[m2[1].toLowerCase()], to: CUR[m2[3].toLowerCase()]};
  if (/exchange rate|שער ה?(דולר|יורו|חליפין)|سعر صرف/i.test(tx)){ const cs = (tx.match(new RegExp(curRe, 'gi')) || []).map(x => CUR[x.toLowerCase()]).filter(Boolean); return {amt: 1, from: cs[0] || 'USD', to: cs[1] || (cs[0] === 'ILS' ? 'USD' : 'ILS')}; }
  return null;
}
async function fxRates(base){ const r = await LZ.tfetch('https://api.frankfurter.dev/v1/latest?from=' + base, {}, 10000); if (!r.ok) throw new Error('fx'); return r.json(); }
A.registerCard('fx', d => {
  const b = el('div', 'fx-card'); b.setAttribute('data-noi18n', '');
  const codes = Object.keys(d.rates).concat(d.base).sort();
  b.innerHTML = `<div class="fx-row"><input type="number" inputmode="decimal" class="fx-a" value="${d.amt}"><select class="fx-f">${codes.map(c => `<option ${c === d.from ? 'selected' : ''}>${c}</option>`).join('')}</select></div><button class="fx-sw" aria-label="Swap">⇅</button><div class="fx-row"><output class="fx-o"></output><select class="fx-t">${codes.map(c => `<option ${c === d.to ? 'selected' : ''}>${c}</option>`).join('')}</select></div><small class="fx-src">${esc(t('Rates'))} · ${esc(d.date)} · ECB</small>`;
  const rate = (f, to) => { const R = Object.assign({[d.base]: 1}, d.rates); return R[to] / R[f]; };
  const upd = () => { const a = +$('.fx-a', b).value || 0, f = $('.fx-f', b).value, to = $('.fx-t', b).value; $('.fx-o', b).textContent = new Intl.NumberFormat('en', {maximumFractionDigits: 4}).format(a * rate(f, to)); };
  b.oninput = upd; b.onchange = upd; $('.fx-sw', b).onclick = () => { const f = $('.fx-f', b), to = $('.fx-t', b), x = f.value; f.value = to.value; to.value = x; upd(); }; upd();
  return b;
});
A.registerTool({id:'currency', icon:'💱', label:'Currency converter', test: (tx, o) => !o.hasImages && !!fxParse(tx) && tx.length < 140, run: async (text, ctx) => {
  const lg = langOf(text), q = fxParse(text); ctx.work.log('Getting today’s exchange rates');
  const j = await fxRates('EUR'); const R = Object.assign({EUR: 1}, j.rates);
  if (!R[q.from] || !R[q.to]) return {content: pick(lg, {en:`I don't have a live rate for ${q.from}/${q.to}.`, he:`אין לי שער עדכני עבור ${q.from}/${q.to}.`})};
  const v = q.amt * R[q.to] / R[q.from], f = n => new Intl.NumberFormat('en', {maximumFractionDigits: n < 10 ? 4 : 2}).format(n);
  return {content: pick(lg, {en:`**${f(q.amt)} ${q.from} = ${f(v)} ${q.to}** (rate ${f(R[q.to] / R[q.from])}, ${j.date}).`, he:`**${f(q.amt)} ${q.from} = ${f(v)} ${q.to}** (שער ${f(R[q.to] / R[q.from])}, ${j.date}).`, ar:`**${f(q.amt)} ${q.from} = ${f(v)} ${q.to}** (السعر ${f(R[q.to] / R[q.from])}، ${j.date}).`}),
    cards:[{type:'fx', data:{amt: q.amt, from: q.from, to: q.to, base:'EUR', rates: j.rates, date: j.date}, summary:`${q.amt} ${q.from} = ${f(v)} ${q.to} on ${j.date}`}]};
}});

/* ======================= 3. UNIT CONVERTER (both) ======================= */
const U = { // factor to base unit
  length:{m:1,meter:1,meters:1,metre:1,km:1000,kilometer:1000,kilometers:1000,cm:.01,mm:.001,mi:1609.344,mile:1609.344,miles:1609.344,ft:.3048,foot:.3048,feet:.3048,in:.0254,inch:.0254,inches:.0254,yd:.9144,yard:.9144,yards:.9144,nmi:1852,'מטר':1,'ק"מ':1000,'קילומטר':1000,'ס"מ':.01,'מייל':1609.344,'רגל':.3048,'אינץ':.0254},
  mass:{kg:1,kilo:1,kilos:1,kilogram:1,kilograms:1,g:.001,gram:.001,grams:.001,mg:1e-6,lb:.45359237,lbs:.45359237,pound:.45359237,pounds:.45359237,oz:.028349523,ounce:.028349523,ounces:.028349523,ton:1000,tonne:1000,'ק"ג':1,'קילו':1,'גרם':.001,'ליברה':.45359237},
  volume:{l:1,liter:1,liters:1,litre:1,ml:.001,gal:3.785411784,gallon:3.785411784,gallons:3.785411784,cup:.2365882,cups:.2365882,tbsp:.0147868,tsp:.00492892,floz:.0295735,'ליטר':1,'מ"ל':.001,'כוס':.24,'כוסות':.24},
  speed:{'km/h':1,kmh:1,kph:1,mph:1.609344,'m/s':3.6,knot:1.852,knots:1.852,'קמ"ש':1},
  data:{b:1,byte:1,bytes:1,kb:1e3,mb:1e6,gb:1e9,tb:1e12,kib:1024,mib:1048576,gib:1073741824},
  area:{m2:1,'sq m':1,km2:1e6,ha:1e4,hectare:1e4,acre:4046.856,acres:4046.856,ft2:.092903,'sq ft':.092903,dunam:1000,'דונם':1000,'מ"ר':1},
  time:{s:1,sec:1,second:1,seconds:1,min:60,minute:60,minutes:60,h:3600,hr:3600,hour:3600,hours:3600,day:86400,days:86400,week:604800,weeks:604800,year:31557600,years:31557600}
};
const TEMP = {c:'C',celsius:'C','°c':'C',f:'F',fahrenheit:'F','°f':'F',k:'K',kelvin:'K','צלזיוס':'C','פרנהייט':'F'};
const unitOf = u => { u = u.toLowerCase().replace(/\.$/, ''); for (const [k, tb] of Object.entries(U)) if (u in tb) return [k, tb[u]]; if (u in TEMP) return ['temp', TEMP[u]]; return null; };
const allUnits = [...Object.values(U).flatMap(Object.keys), ...Object.keys(TEMP)].map(x => x.replace(/[.*+?^${}()|[\]\\/"]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|');
const UNIT_RX = new RegExp(`(-?\\d[\\d,.]*)\\s*(${allUnits})\\s+(?:to|in|into|=|ל|ב|إلى)\\s*-?\\s*(${allUnits})(?![\\w\u05D0-\u05EA])`, 'i');
function convTemp(v, f, to){ const c = f === 'C' ? v : f === 'F' ? (v - 32) * 5 / 9 : v - 273.15; return to === 'C' ? c : to === 'F' ? c * 9 / 5 + 32 : c + 273.15; }
function convert(v, a, b){ const A1 = unitOf(a), B1 = unitOf(b); if (!A1 || !B1 || A1[0] !== B1[0]) return null; return A1[0] === 'temp' ? convTemp(v, A1[1], B1[1]) : v * A1[1] / B1[1]; }
A.registerCard('units', (d) => {
  const b = el('div', 'fx-card units'); b.setAttribute('data-noi18n', '');
  const tb = d.kind === 'temp' ? {C:1, F:2, K:3} : U[d.kind]; const canon = u => { const k = Object.keys(tb).find(x => tb[x] === tb[u]); return k || u; }; const opts = Object.keys(tb).filter((k, i, a) => a.findIndex(x => tb[x] === tb[k]) === i);
  d = Object.assign({}, d, {a: canon(d.a), b: canon(d.b)});
  b.innerHTML = `<div class="fx-row"><input type="number" inputmode="decimal" class="fx-a" value="${d.v}"><select class="fx-f">${opts.map(u => `<option ${u === d.a ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></div><button class="fx-sw" aria-label="Swap">⇅</button><div class="fx-row"><output class="fx-o"></output><select class="fx-t">${opts.map(u => `<option ${u === d.b ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></div><small class="fx-src">${esc(d.kind)}</small>`;
  const upd = () => { const r = convert(+$('.fx-a', b).value || 0, $('.fx-f', b).value, $('.fx-t', b).value); $('.fx-o', b).textContent = r == null ? '—' : +r.toPrecision(8) + ''; };
  b.oninput = upd; b.onchange = upd; $('.fx-sw', b).onclick = () => { const f = $('.fx-f', b), to = $('.fx-t', b), x = f.value; f.value = to.value; to.value = x; upd(); }; upd();
  return b;
});
A.registerTool({id:'units', icon:'📏', label:'Unit converter', test: (tx, o) => { if (o.hasImages || tx.length > 120) return false; const m = tx.match(UNIT_RX); return !!(m && convert(1, m[2], m[3]) != null); }, run: async (text) => {
  const m = text.match(UNIT_RX), v = parseFloat(m[1].replace(/,/g, '')), r = convert(v, m[2], m[3]), kind = unitOf(m[2])[0];
  const a = kind === 'temp' ? unitOf(m[2])[1] : m[2].toLowerCase(), b = kind === 'temp' ? unitOf(m[3])[1] : m[3].toLowerCase();
  return {content: `**${v} ${m[2]} = ${+r.toPrecision(8)} ${m[3]}**`, cards:[{type:'units', data:{v, a, b, kind}, summary:`${v} ${m[2]} = ${+r.toPrecision(8)} ${m[3]}`}]};
}});

/* ======================= 4. QR CODE (both) ======================= */
const QR_LIB = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
async function qrCanvas(text, size = 512, fg = '#00ff9c', bg = '#03140c'){
  await LZ.loadScript(QR_LIB);
  const q = qrcode(0, 'M'); q.addData(unescape(encodeURIComponent(text))); q.make();
  const n = q.getModuleCount(), quiet = 4, cell = Math.floor(size / (n + quiet * 2)), cv = document.createElement('canvas'); cv.width = cv.height = cell * (n + quiet * 2);
  const x = cv.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = fg;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)){ x.beginPath(); x.roundRect ? x.roundRect((c + quiet) * cell, (r + quiet) * cell, cell, cell, cell * .3) : x.rect((c + quiet) * cell, (r + quiet) * cell, cell, cell); x.fill(); }
  return cv;
}
A.registerCard('qr', d => {
  const b = el('div', 'qr-card'); b.innerHTML = `<div class="qr-img"></div><div class="qr-side"><div class="qr-txt" dir="auto" data-noi18n></div><div class="qr-acts"><label>🎨 <input type="color" class="qr-fg" value="${d.fg || '#00ff9c'}"></label><label class="qr-inv"><input type="checkbox"> ${esc(t('Print-friendly'))}</label><button class="btn-primary qr-dl">⤓ PNG</button></div></div>`;
  $('.qr-txt', b).textContent = d.text;
  const paint = async () => { const inv = $('.qr-inv input', b).checked; const cv = await qrCanvas(d.text, 512, inv ? '#000000' : $('.qr-fg', b).value, inv ? '#ffffff' : '#03140c'); const h = $('.qr-img', b); h.innerHTML = ''; h.appendChild(cv); };
  paint().catch(() => { $('.qr-img', b).textContent = '⚠️'; });
  b.onchange = paint; $('.qr-dl', b).onclick = () => A.download($('canvas', b).toDataURL('image/png'), 'qr-code.png');
  return b;
});
A.registerTool({id:'qr', icon:'🔳', label:'QR code', test: (tx, o) => !o.hasImages && /\bqr\b|ברקוד|קוד qr|קיו.?אר|رمز qr|باركود/i.test(tx) && /make|create|generate|give|build|צור|תיצור|תכין|תעשה|הפוך|أنشئ|اصنع|\bfor\b|ל/i.test(tx), run: async (text, ctx) => {
  const lg = langOf(text);
  let payload = (text.match(/https?:\/\/\S+/) || [])[0] || (text.match(/["“'«](.+?)["”'»]/) || [])[1];
  if (!payload){ const tail = text.replace(/^.*?\b(?:qr(?: code)?)\b\s*(?:for|to|with|of|that says|containing|ל|של|עבור|عن|لـ)?\s*:?\s*/i, '').trim(); payload = tail || text; }
  ctx.work.log('Encoding QR code');
  return {content: pick(lg, {en:'Here is your QR code — scan it to test, recolor it, or download a PNG.', he:'הנה קוד ה-QR שלך — אפשר לסרוק, לשנות צבע או להוריד PNG.', ar:'إليك رمز QR — امسحه أو غيّر لونه أو نزّله.'}), cards:[{type:'qr', data:{text: payload}, summary:'QR code for: ' + payload}]};
}});

/* ======================= 5. TIMER / REMINDER (both) ======================= */
const TK = 'lz.timers';
const timers = () => A.safeJSON(localStorage.getItem(TK)) || [];
const saveTimers = a => localStorage.setItem(TK, JSON.stringify(a.filter(x => x.end > Date.now() - 864e5).slice(-30)));
function parseDur(tx){
  let s = 0, hit = false;
  const re = /(\d+(?:[.,]\d+)?|half an?|an?|one|two|three|five|ten|fifteen|twenty|thirty|חצי|רבע|שתי|שני|שלוש|חמש|עשר)\s*(hours?|hrs?|h\b|minutes?|mins?|m\b|seconds?|secs?|s\b|שעות|שעה|דקות|דקה|שניות|שנייה|ساعات|ساعة|دقائق|دقيقة|ثوان|ثانية)/gi;
  const W = {a:1, an:1, one:1, two:2, three:3, five:5, ten:10, fifteen:15, twenty:20, thirty:30, 'half a':.5, 'half an':.5, 'חצי':.5, 'רבע':.25, 'שתי':2, 'שני':2, 'שלוש':3, 'חמש':5, 'עשר':10};
  let m; while ((m = re.exec(tx))){ hit = true; const n = W[m[1].toLowerCase()] ?? parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase(); s += n * (/^(h|hour|hr|שע|ساع)/.test(u) ? 3600 : /^(m|min|דק|دق)/.test(u) ? 60 : 1); }
  if (!hit && /חצי שעה|half an hour/i.test(tx)){ s = 1800; hit = true; }
  if (/רבע שעה|quarter of an hour/i.test(tx)){ s = 900; hit = true; }
  if (!hit){ const at = tx.match(/\bat\s+(\d{1,2})(?::(\d\d))?\s*(am|pm)?|בשעה\s+(\d{1,2})(?::(\d\d))?/i); if (at){ let h = +(at[1] || at[4]), mi = +(at[2] || at[5] || 0); if (/pm/i.test(at[3] || '') && h < 12) h += 12; const d = new Date(); d.setHours(h, mi, 0, 0); if (d < Date.now()) d.setDate(d.getDate() + 1); return Math.round((d - Date.now()) / 1000); } }
  return hit ? Math.round(s) : 0;
}
const TIMER_RX = /\b(timer|remind me|reminder|alarm|countdown)\b|טיימר|תזכיר לי|תזכורת|שעון מעורר|ספירה לאחור|ذكرني|مؤقت|منبه/i;
function ding(){ try { const C = new (window.AudioContext || window.webkitAudioContext)(); [0, .25, .5].forEach((d, i) => { const o = C.createOscillator(), g = C.createGain(); o.frequency.value = [880, 1175, 1568][i]; g.gain.setValueAtTime(.0001, C.currentTime + d); g.gain.exponentialRampToValueAtTime(.3, C.currentTime + d + .02); g.gain.exponentialRampToValueAtTime(.0001, C.currentTime + d + .5); o.connect(g).connect(C.destination); o.start(C.currentTime + d); o.stop(C.currentTime + d + .6); }); } catch(_){} }
function fire(tm){
  if (tm.fired) return; tm.fired = true; const a = timers(); const x = a.find(y => y.id === tm.id); if (x){ x.fired = true; saveTimers(a); }
  ding(); const msg = tm.label ? '⏰ ' + tm.label : '⏰ ' + t('Time is up!');
  A.toast(msg);
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Lokizenith', {body: msg, icon: 'favicon.svg'}); } catch(_){}
  if (window.Mascot) Mascot.set('happy');
  document.dispatchEvent(new CustomEvent('lz-timer', {detail: tm}));
}
let tickT = 0; function tick(){ clearTimeout(tickT); const a = timers().filter(x => !x.fired); const now = Date.now(); a.forEach(x => { if (x.end <= now) fire(x); }); const next = a.filter(x => x.end > now).sort((x, y) => x.end - y.end)[0]; if (next) tickT = setTimeout(tick, Math.min(next.end - now + 30, 30000)); }
tick();
A.registerCard('timer', d => {
  const b = el('div', 'tm-card'); const R = 52, C = 2 * Math.PI * R;
  b.innerHTML = `<div class="tm-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}"/><circle class="v" cx="60" cy="60" r="${R}" stroke-dasharray="${C}"/></svg><div class="tm-num"></div></div><div class="tm-side"><b class="tm-lbl" dir="auto" data-noi18n></b><small class="tm-at"></small><div class="tm-acts"><button class="btn-ghost tm-cancel">✕ ${esc(t('Cancel'))}</button>${'Notification' in window && Notification.permission === 'default' ? `<button class="btn-ghost tm-notif">🔔 ${esc(t('Enable notifications'))}</button>` : ''}</div></div>`;
  $('.tm-lbl', b).textContent = d.label || t('Timer'); $('.tm-at', b).textContent = '⏰ ' + new Date(d.end).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second: d.total < 600 ? '2-digit' : undefined});
  const upd = () => { if (!b.isConnected && b._init) return; b._init = true; const tm = timers().find(x => x.id === d.id) || d; const left = Math.max(0, (d.end - Date.now()) / 1000);
    $('.tm-num', b).textContent = tm.cancelled ? '—' : left > 0 ? A.fmtDur(Math.ceil(left)) : '✓'; $('.tm-ring .v', b).style.strokeDashoffset = C * (1 - left / d.total);
    b.classList.toggle('done', left <= 0 || !!tm.cancelled); if (left > 0 && !tm.cancelled) requestAnimationFrame(() => setTimeout(upd, 250)); else $('.tm-cancel', b).hidden = true; };
  upd();
  $('.tm-cancel', b).onclick = () => { const a = timers(); const x = a.find(y => y.id === d.id); if (x){ x.cancelled = true; x.fired = true; saveTimers(a); } upd(); tick(); };
  const nb = $('.tm-notif', b); if (nb) nb.onclick = () => Notification.requestPermission().then(() => nb.remove());
  return b;
});
A.registerTool({id:'timer', icon:'⏱', label:'Timer & reminders', test: (tx, o) => !o.hasImages && TIMER_RX.test(tx) && parseDur(tx) > 0 && !/\b(build|create an? (interactive|app)|widget|code)\b/i.test(tx), run: async (text) => {
  const lg = langOf(text), secs = parseDur(text);
  let label = (text.match(/(?:remind me|reminder)\s+(?:in\s+[\w\s.]+?\s+)?(?:to|that|about)\s+(.+)$/i) || text.match(/תזכיר לי\s+(?:בעוד\s+\S+(?:\s+\S+)?\s+)?(?:ל|ש|על)?(.+)$/) || text.match(/ذكرني\s+(?:بعد\s+\S+\s+\S+\s+)?(?:أن|ب)?(.+)$/) || [])[1] || '';
  label = label.replace(/\s*(in|בעוד|بعد)\s+\d+.*$/i, '').trim();
  const tm = {id: A.uid(), end: Date.now() + secs * 1000, total: secs, label};
  saveTimers(timers().concat(tm)); tick();
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
  return {content: pick(lg, {en:`⏱ Done — I'll ${label ? 'remind you to **' + label + '**' : 'ring'} in **${A.fmtDur(secs)}** (keep this tab open).`, he:`⏱ סגור — ${label ? 'אזכיר לך **' + label + '**' : 'אצלצל'} בעוד **${A.fmtDur(secs)}** (השאירו את הלשונית פתוחה).`, ar:`⏱ تم — سأنبهك بعد **${A.fmtDur(secs)}**.`}), cards:[{type:'timer', data: tm, summary:`Timer set for ${secs}s${label ? ': ' + label : ''}`}]};
}});

/* ======================= 6. REGEX TESTER (both) ======================= */
function regexUI(box, d){
  box.innerHTML = `<div class="rx-top"><span>/</span><input class="rx-p" spellcheck="false" dir="ltr"><span>/</span><input class="rx-f" spellcheck="false" dir="ltr" maxlength="6" placeholder="gim"></div><textarea class="rx-s" rows="4" dir="auto" spellcheck="false"></textarea><div class="rx-out" dir="auto"></div><div class="rx-info"></div>`;
  const p = $('.rx-p', box), f = $('.rx-f', box), s = $('.rx-s', box); p.value = d.pattern || ''; f.value = d.flags ?? 'g'; s.value = d.sample || '';
  const run = () => { let re; const out = $('.rx-out', box), info = $('.rx-info', box);
    try { re = new RegExp(p.value, f.value.includes('g') ? f.value : f.value + 'g'); p.classList.remove('bad'); } catch(e){ p.classList.add('bad'); info.textContent = '⚠️ ' + e.message; out.textContent = s.value; return; }
    let html = '', last = 0, n = 0, m; const groups = [];
    if (p.value) while ((m = re.exec(s.value)) && n < 500){ if (m[0] === ''){ re.lastIndex++; continue; } html += esc(s.value.slice(last, m.index)) + `<mark>${esc(m[0])}</mark>`; last = m.index + m[0].length; n++; if (m.length > 1 && groups.length < 6) groups.push(m.slice(1).map(x => x ?? '∅').join(' · ')); }
    out.innerHTML = html + esc(s.value.slice(last)); info.innerHTML = `<b>${n}</b> ${esc(t('matches'))}${groups.length ? ' · ' + esc(t('groups')) + ': ' + groups.map(g => `<code>${esc(g)}</code>`).join(' ') : ''}`; };
  box.oninput = run; run();
}
A.registerCard('regex', d => { const b = el('div', 'rx-card'); b.setAttribute('data-noi18n', ''); if (d.explain){ const e = el('div', 'rx-exp'); A.renderMarkdown(e, d.explain); b.appendChild(e); } const u = el('div'); b.appendChild(u); regexUI(u, d); return b; });
A.registerTool({id:'regex', icon:'🧪', label:'Regex builder & tester', test: (tx, o) => !o.hasImages && /\b(regex|regexp|regular expression)\b|ביטוי רגולרי|ריגקס|تعبير نمطي/i.test(tx) && !/```/.test(tx), run: async (text, ctx) => {
  const lg = langOf(text); ctx.work.log('Writing the pattern & test cases');
  const j = await LZ.chatJSON([{role:'system', content:`You are a regex expert (JavaScript flavor). Return ONLY JSON {"pattern":"the regex without slashes","flags":"e.g. gm","sample":"6-10 lines of sample text: some that SHOULD match and some that should NOT","explain":"short markdown in ${LN[lg]}: what each part does + edge cases"}. If the user gave a regex, explain/fix it.`}, {role:'user', content: text}], {tier: ctx.tier, maxTokens: 1200, signal: ctx.signal});
  try { new RegExp(j.pattern, j.flags || 'g'); } catch(e){ j.flags = 'g'; }
  return {content: '`/' + j.pattern + '/' + (j.flags || '') + '`', cards:[{type:'regex', data:{pattern: j.pattern, flags: j.flags || 'g', sample: j.sample || '', explain: j.explain || ''}, summary:'Regex: /' + j.pattern + '/' + (j.flags || '')}]};
}});
lab({id:'regexlab', icon:'🧪', name:'Regex Tester', desc:'Live highlighting, groups & flags', both:true, fn(body){ body.innerHTML = '<div class="lab-grid"><p class="lab-desc">Type a pattern and some text — matches highlight live. Ask in chat “regex for …” to have one written for you.</p><div class="rx-card" id="rxLab"></div></div>'; regexUI($('#rxLab'), {pattern:'\\b[\\w.+-]+@[\\w-]+\\.[\\w.]+\\b', flags:'gi', sample:'Contact: dana@example.com, yoni.k+news@mail.co.il\nnot-an-email@\nhello@lokiz'}); }});

/* ======================= 7. MERMAID DIAGRAMS (Stark) ======================= */
const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
let mmReady = null;
function mermaidLib(){ return mmReady || (mmReady = LZ.loadScript(MERMAID).then(() => { mermaid.initialize({startOnLoad:false, theme:'dark', securityLevel:'strict', themeVariables:{primaryColor:'#0b2a1c', primaryBorderColor:'#00ff9c', primaryTextColor:'#e6fff3', lineColor:'#7dffcf', fontFamily:'Inter'}}); })); }
A.registerCard('mermaid', d => {
  const b = el('div', 'mm-card'); b.innerHTML = `<div class="mm-view">⏳</div><div class="mm-acts"><button class="btn-ghost mm-src">‹/› ${esc(t('Source'))}</button><button class="btn-primary mm-dl">⤓ SVG</button><button class="btn-ghost mm-png">⤓ PNG</button></div><pre class="mm-code" hidden></pre>`;
  $('.mm-code', b).textContent = d.code;
  (async () => { try { await mermaidLib(); const {svg} = await mermaid.render('mm' + Math.random().toString(36).slice(2), d.code); $('.mm-view', b).innerHTML = svg; } catch(e){ $('.mm-view', b).innerHTML = '⚠️ ' + esc(t('Could not draw this diagram')); $('.mm-code', b).hidden = false; } })();
  $('.mm-src', b).onclick = () => { const c = $('.mm-code', b); c.hidden = !c.hidden; };
  $('.mm-dl', b).onclick = () => { const s = $('.mm-view svg', b); if (s) A.download(new XMLSerializer().serializeToString(s), 'diagram.svg', 'image/svg+xml'); };
  $('.mm-png', b).onclick = () => { const s = $('.mm-view svg', b); if (!s) return; const r = s.getBoundingClientRect(), img = new Image(), cv = document.createElement('canvas'); cv.width = r.width * 2; cv.height = r.height * 2; img.onload = () => { const x = cv.getContext('2d'); x.fillStyle = '#06100b'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0, cv.width, cv.height); A.download(cv.toDataURL('image/png'), 'diagram.png'); }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(s)); };
  return b;
});
A.registerTool({id:'diagram', icon:'🔀', label:'Diagrams (flowchart, sequence, mind map)', stark: true, test: (tx, o) => !o.hasImages && /\b(diagram|flow ?chart|sequence diagram|mind ?map|gantt|er diagram|org chart|mermaid)\b|תרשים|דיאגרמה|מפת חשיבה|מפת מוח|مخطط|خريطة ذهنية/i.test(tx) && !/\b(image|picture|photo|draw)\b|תמונה|ציור/i.test(tx), run: async (text, ctx) => {
  const lg = langOf(text); ctx.work.log('Designing the diagram');
  let code = '';
  for (let k = 0; k < 2; k++){
    const out = await LZ.chat([{role:'system', content:`Write ONE Mermaid (v10) diagram for the request. Choose the best type (flowchart TD/LR, sequenceDiagram, mindmap, gantt, erDiagram, classDiagram, timeline, pie). Labels in ${LN[lg]}; wrap labels containing spaces/punctuation in double quotes; no HTML, no parentheses inside unquoted labels. Output ONLY the mermaid code in a \`\`\`mermaid block.${k ? ' The previous attempt had a syntax error: ' + code.err + ' — fix it.' : ''}`}, {role:'user', content: text}], {tier:'stark', maxTokens: 1800, signal: ctx.signal});
    code = ((out.match(/```(?:mermaid)?\s*([\s\S]*?)```/) || [, out])[1] || '').trim();
    ctx.work.log('Checking the syntax');
    try { await mermaidLib(); await mermaid.parse(code); break; } catch(e){ code = Object.assign(new String(code), {err: String(e.message || e).slice(0, 300)}); }
  }
  return {content: pick(lg, {en:'Here’s your diagram — download it as SVG or PNG.', he:'הנה התרשים — אפשר להוריד כ-SVG או PNG.', ar:'إليك المخطط — يمكنك تنزيله.'}), cards:[{type:'mermaid', data:{code: String(code)}, summary:'You drew a Mermaid diagram:\n' + String(code).slice(0, 800)}]};
}});

/* ======================= 8. RECIPE FROM INGREDIENTS (Stark) ======================= */
A.registerCard('recipes', d => {
  const b = el('div', 'rc-recipes'); b.setAttribute('data-noi18n', ''); b.dir = d.lang === 'en' ? 'ltr' : 'rtl';
  d.recipes.forEach((r, i) => {
    const c = el('details', 'rcp'); if (!i) c.open = true;
    c.innerHTML = `<summary><span class="rcp-e">${esc(r.emoji || '🍳')}</span><span class="rcp-h"><b></b><small>⏱ ${esc(String(r.minutes || '?'))} ${esc(pick(d.lang, {en:'min', he:'דק׳', ar:'دقيقة'}))} · ${esc(r.difficulty || '')} · 🍽 ${esc(String(r.servings || 2))}</small></span></summary><p class="rcp-d"></p><div class="rcp-cols"><div><h5>${pick(d.lang, {en:'Ingredients', he:'מצרכים', ar:'المكونات'})}</h5><ul class="rcp-ing"></ul></div><div><h5>${pick(d.lang, {en:'Steps', he:'הוראות הכנה', ar:'الخطوات'})}</h5><ol class="rcp-st"></ol></div></div>`;
    $('summary b', c).textContent = r.name; $('.rcp-d', c).textContent = r.description || '';
    (r.ingredients || []).forEach(x => { const li = el('li'); li.innerHTML = `<label><input type="checkbox"> <span></span></label>`; $('span', li).textContent = x; if (/\*$/.test(x)) li.classList.add('extra'); $('ul', c).appendChild(li); });
    (r.steps || []).forEach(x => { const li = el('li'); li.textContent = x; li.onclick = () => li.classList.toggle('done'); $('ol', c).appendChild(li); });
    b.appendChild(c);
  });
  return b;
});
A.registerTool({id:'recipe', icon:'🍳', label:'Recipes from your ingredients', stark: true, test: (tx, o) => /what can i (cook|make|bake)|recipe(s)? (with|from|using)|i have .{3,80}(what|cook|make)|מה (אפשר|אני יכול|אפשר ל)?(לבשל|להכין|לאפות)|מתכון (עם|מ|ל)|יש לי .{3,80}(מה|לבשל|להכין)|ماذا يمكنني أن أطبخ|وصفة (من|بـ)/i.test(tx), run: async (text, ctx) => {
  const lg = langOf(text); ctx.work.log('Thinking about what you can cook');
  const msgs = [{role:'system', content:`You are a creative home chef. From the user's ingredients (and any photo description), suggest 3 different realistic recipes. Prefer using what they have; mark any extra ingredient they probably need to buy with a trailing *. Return ONLY JSON {"intro":"one friendly sentence in ${LN[lg]}","recipes":[{"name":"","emoji":"","minutes":number,"difficulty":"easy|medium|hard (in ${LN[lg]})","servings":number,"description":"1 sentence","ingredients":["quantity + item"],"steps":["clear step"]}]} — all text in ${LN[lg]}.`}, {role:'user', content: text}];
  const j = await LZ.chatJSON(msgs, {tier:'stark', maxTokens: 3000, signal: ctx.signal});
  const recipes = (j.recipes || []).filter(r => r && r.name).slice(0, 4);
  return {content: (j.intro || '') + (recipes.some(r => (r.ingredients || []).some(x => /\*$/.test(x))) ? '\n\n_' + pick(lg, {en:'* = you may need to buy this', he:'* = ייתכן שתצטרכו לקנות', ar:'* = قد تحتاج لشرائه'}) + '_' : ''), cards:[{type:'recipes', data:{recipes, lang: lg}, summary:'Recipes: ' + recipes.map(r => r.name).join(', ')}]};
}});

/* ======================= 9. OCR — text from image (both) ======================= */
const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
async function ocr(dataUrl, langs, log){
  await LZ.loadScript(TESS);
  const w = await Tesseract.createWorker(langs, 1, {logger: m => { if (m.status === 'recognizing text' && log) log(m); }});
  try { const r = await w.recognize(dataUrl); return {text: r.data.text.trim(), conf: Math.round(r.data.confidence)}; } finally { w.terminate(); }
}
A.registerCard('ocr', d => {
  const b = el('div', 'ocr-card'); b.innerHTML = `<div class="ocr-h">🔤 ${esc(t('Extracted text'))} <small>· ${d.conf}% ${esc(t('confidence'))}</small></div><textarea class="ocr-t autogrow" dir="auto" data-noi18n></textarea><div class="ocr-acts"><button class="btn-ghost ocr-c">⧉ ${esc(t('Copy'))}</button><button class="btn-ghost ocr-d">⤓ .txt</button></div>`;
  const ta = $('.ocr-t', b); ta.value = d.text; requestAnimationFrame(() => A.grow(ta));
  $('.ocr-c', b).onclick = () => A.copyText(ta.value); $('.ocr-d', b).onclick = () => A.download(ta.value, 'text.txt', 'text/plain');
  return b;
});
const OCR_RX = /\b(ocr|extract (the )?text|read (the )?text|copy (the )?text|transcribe (this|the) (image|photo|picture)|what does (it|this) say)\b|חלץ (את ה)?טקסט|תחלץ|העתק את הטקסט|מה כתוב|תקליד|استخرج النص|ماذا مكتوب/i;
A.registerTool({id:'ocr', icon:'🔤', label:'Text from image (OCR)', images: true, test: (tx, o) => o.hasImages && OCR_RX.test(tx), run: async (text, ctx) => {
  const lg = langOf(text), img = imgsOf(ctx.um)[0];
  ctx.work.log('Loading the text recognizer');
  let last = 0;
  const r = await ocr(img.dataUrl, 'eng+heb', m => { const p = Math.round(m.progress * 100); if (p - last >= 25){ last = p; ctx.work.log(`Reading text · ${p}%`); } });
  if (!r.text) return {content: pick(lg, {en:"I couldn't find readable text in that image.", he:'לא מצאתי טקסט קריא בתמונה.', ar:'لم أجد نصًا مقروءًا.'})};
  return {content: pick(lg, {en:`I extracted ${r.text.split(/\s+/).length} words from the image:`, he:`חילצתי ${r.text.split(/\s+/).length} מילים מהתמונה:`, ar:`استخرجت ${r.text.split(/\s+/).length} كلمة:`}), cards:[{type:'ocr', data: r, summary:'OCR text: ' + r.text.slice(0, 1500)}]};
}});

/* ======================= 10. COLOR PALETTE FROM IMAGE (both) ======================= */
function palette(dataUrl, k = 6){
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => {
    const s = 96, cv = document.createElement('canvas'), r = Math.min(1, s / Math.max(im.width, im.height)); cv.width = Math.max(1, im.width * r | 0); cv.height = Math.max(1, im.height * r | 0);
    const x = cv.getContext('2d', {willReadFrequently: true}); x.drawImage(im, 0, 0, cv.width, cv.height); const d = x.getImageData(0, 0, cv.width, cv.height).data, px = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) px.push([d[i], d[i + 1], d[i + 2]]);
    let C = [px[0]]; while (C.length < k){ let best = null, bd = -1; for (let i = 0; i < px.length; i += 7){ const p = px[i], dd = Math.min(...C.map(c => (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2)); if (dd > bd){ bd = dd; best = p; } } C.push(best); }
    let cnt = [];
    for (let it = 0; it < 8; it++){ const S = C.map(() => [0, 0, 0, 0]); px.forEach(p => { let bi = 0, bd = Infinity; C.forEach((c, j) => { const dd = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2; if (dd < bd){ bd = dd; bi = j; } }); const s2 = S[bi]; s2[0] += p[0]; s2[1] += p[1]; s2[2] += p[2]; s2[3]++; }); C = S.map((s2, j) => s2[3] ? [s2[0] / s2[3], s2[1] / s2[3], s2[2] / s2[3]] : C[j]); cnt = S.map(s2 => s2[3]); }
    const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    res(C.map((c, j) => ({hex: hex(c), pct: Math.round(cnt[j] / px.length * 100), l: (.299 * c[0] + .587 * c[1] + .114 * c[2]) / 255})).sort((a, b) => b.pct - a.pct));
  }; im.onerror = rej; im.src = dataUrl; });
}
A.registerCard('palette', d => {
  const b = el('div', 'pal-card'); b.innerHTML = `<div class="pal-bar">${d.colors.map(c => `<span style="flex:${Math.max(c.pct, 4)};background:${c.hex}"></span>`).join('')}</div><div class="pal-sw">${d.colors.map(c => `<button style="--c:${c.hex};color:${c.l > .6 ? '#111' : '#fff'}" data-h="${c.hex}"><b>${c.hex.toUpperCase()}</b><small>${c.pct}%</small></button>`).join('')}</div><div class="pal-acts"><button class="btn-ghost pal-css">⧉ CSS</button><button class="btn-ghost pal-json">⧉ JSON</button><button class="btn-ghost pal-apply">🎨 ${esc(t('Use as accent'))}</button></div>`;
  b.onclick = e => { const s = e.target.closest('[data-h]'); if (s){ A.copyText(s.dataset.h); } };
  $('.pal-css', b).onclick = () => A.copyText(':root{\n' + d.colors.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n') + '\n}');
  $('.pal-json', b).onclick = () => A.copyText(JSON.stringify(d.colors.map(c => c.hex)));
  $('.pal-apply', b).onclick = () => { const c = d.colors.slice().sort((x, y) => { const sat = h => { const [r, g, bb] = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)); return Math.max(r, g, bb) - Math.min(r, g, bb); }; return sat(y.hex) - sat(x.hex); })[0]; A.settings().accent = c.hex; A.saveSettings(); A.applySettings(); A.toast('🎨 ' + c.hex); };
  return b;
});
A.registerTool({id:'palette', icon:'🎨', label:'Color palette from image', images: true, test: (tx, o) => o.hasImages && /palette|colou?rs? (scheme|codes?)|hex (codes?|colou?rs?)|פלטה|פלטת|צבעים|קודי צבע|لوحة ألوان|ألوان/i.test(tx), run: async (text, ctx) => {
  const lg = langOf(text); ctx.work.log('Analyzing the colors'); const colors = await palette(imgsOf(ctx.um)[0].dataUrl, 6);
  let content = pick(lg, {en:'Here is the palette from your image — tap a swatch to copy it.', he:'הנה פלטת הצבעים מהתמונה — הקישו על צבע כדי להעתיק.', ar:'إليك لوحة الألوان — اضغط على لون لنسخه.'});
  try { const nm = await LZ.chat([{role:'system', content:`Give this color palette a short evocative name and one sentence on the mood and where to use it, in ${LN[lg]}. Plain text, max 2 sentences.`}, {role:'user', content: colors.map(c => c.hex + ' ' + c.pct + '%').join(', ')}], {tier:'fera', maxTokens: 120, signal: ctx.signal}); if (nm) content = nm.trim() + '\n\n' + content; } catch(e){ if (e.name === 'AbortError') throw e; }
  return {content, cards:[{type:'palette', data:{colors}, summary:'Palette: ' + colors.map(c => c.hex).join(' ')}]};
}});
lab({id:'imgtools', icon:'🖼', name:'Image Tools', desc:'Extract text (OCR) or a color palette', both:true, fn(body){
  body.innerHTML = `<div class="lab-grid"><p class="lab-desc">Drop or choose an image — then extract its text or its color palette. Everything runs on your device.</p><label class="it-drop"><input type="file" accept="image/*" hidden id="itFile"><span>🖼 ${esc(t('Choose an image'))}</span><img id="itImg" hidden alt=""></label><div class="lab-row"><button class="btn-primary" id="itOcr" disabled>🔤 ${esc(t('Extract text'))}</button><button class="btn-ghost" id="itPal" disabled>🎨 ${esc(t('Get palette'))}</button></div><div id="itWork"></div><div id="itOut"></div></div>`;
  let url = '';
  const load = f => { if (!f || !/^image\//.test(f.type)) return; const r = new FileReader(); r.onload = () => { url = r.result; $('#itImg').src = url; $('#itImg').hidden = false; $('#itOcr').disabled = $('#itPal').disabled = false; }; r.readAsDataURL(f); };
  $('#itFile').onchange = e => load(e.target.files[0]);
  const dz = $('.it-drop', body); dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over'); dz.ondrop = e => { e.preventDefault(); dz.classList.remove('over'); load(e.dataTransfer.files[0]); };
  $('#itOcr').onclick = async () => { $('#itOut').innerHTML = ''; $('#itWork').innerHTML = ''; const w = A.Work($('#itWork'), {open:true}); w.log('Loading the text recognizer'); let last = 0; try { const r = await ocr(url, 'eng+heb', m => { const p = Math.round(m.progress * 100); if (p - last >= 25){ last = p; w.log(`Reading text · ${p}%`); } }); w.done(); $('#itOut').appendChild(A.cardEl({type:'ocr', data: r})); } catch(e){ w.done(); A.toast(t('Could not read the image'), 'err'); } };
  $('#itPal').onclick = async () => { $('#itOut').innerHTML = ''; $('#itOut').appendChild(A.cardEl({type:'palette', data:{colors: await palette(url, 6)}})); };
}});

/* ---- Labs entries for chat-first tools ---- */
lab({id:'converter', icon:'💱', name:'Converter', desc:'Live currency rates & units', both:true, async fn(body){
  body.innerHTML = `<div class="lab-grid"><p class="lab-desc">Currency (daily ECB rates) and units. Tip: in chat just type “100 usd to ils” or “5 miles to km”.</p><div id="cvFx">⏳</div><div class="lab-row" style="margin-top:6px">${['length', 'mass', 'volume', 'temp', 'speed', 'area', 'data', 'time'].map((k, i) => `<button class="btn-ghost cv-k ${i ? '' : 'on'}" data-k="${k}">${esc(t(k))}</button>`).join('')}</div><div id="cvU"></div></div>`;
  const first = {length:['km', 'mi'], mass:['kg', 'lb'], volume:['l', 'gal'], temp:['C', 'F'], speed:['km/h', 'mph'], area:['m2', 'ft2'], data:['gb', 'mb'], time:['hour', 'min']};
  const show = k => { $('#cvU').innerHTML = ''; $('#cvU').appendChild(A.cardEl({type:'units', data:{v: 1, a: first[k][0], b: first[k][1], kind: k}})); $$('.cv-k', body).forEach(b => b.classList.toggle('on', b.dataset.k === k)); };
  $$('.cv-k', body).forEach(b => b.onclick = () => show(b.dataset.k)); show('length');
  try { const j = await fxRates('EUR'); $('#cvFx').innerHTML = ''; $('#cvFx').appendChild(A.cardEl({type:'fx', data:{amt: 100, from:'USD', to:'ILS', base:'EUR', rates: j.rates, date: j.date}})); } catch(e){ $('#cvFx').textContent = '⚠️ ' + t('Rates unavailable right now'); }
}});
lab({id:'qrlab', icon:'🔳', name:'QR Code Maker', desc:'Link or text → styled QR, PNG download', both:true, fn(body){
  body.innerHTML = `<div class="lab-grid"><p class="lab-desc">Paste a link, Wi-Fi details or any text.</p><div class="lab-row"><input class="lab-input" id="qrIn" style="flex:1" dir="auto" placeholder="https://…"><button class="btn-primary" id="qrGo">🔳 ${esc(t('Create'))}</button></div><div id="qrOut"></div></div>`;
  $('#qrGo').onclick = () => { const v = $('#qrIn').value.trim(); if (!v) return; $('#qrOut').innerHTML = ''; $('#qrOut').appendChild(A.cardEl({type:'qr', data:{text: v}})); };
}});
lab({id:'timerlab', icon:'⏱', name:'Timers', desc:'Countdowns & reminders with alerts', both:true, fn(body){
  body.innerHTML = `<div class="lab-grid"><p class="lab-desc">Or just say “remind me in 10 minutes to call mom”.</p><div class="lab-row">${[1, 5, 10, 15, 25, 60].map(m => `<button class="btn-ghost tl-q" data-m="${m}">${m < 60 ? m + ' min' : '1 h'}</button>`).join('')}</div><div class="lab-row"><input class="lab-input" id="tlLbl" style="flex:1" dir="auto" placeholder="${esc(t('Label (optional)'))}"></div><div id="tlList"></div></div>`;
  const list = () => { const h = $('#tlList'); if (!h) return; h.innerHTML = ''; timers().filter(x => !x.fired && x.end > Date.now()).forEach(x => h.appendChild(A.cardEl({type:'timer', data: x}))); };
  $$('.tl-q', body).forEach(b => b.onclick = () => { const s = +b.dataset.m * 60; saveTimers(timers().concat({id: A.uid(), end: Date.now() + s * 1000, total: s, label: $('#tlLbl').value.trim()})); tick(); list(); if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); });
  list();
}});

/* ======================= 11. FORMULA CALCULATOR (both) ======================= */
A.registerCard('formula', d => {
  if (window.LabsX && window.LabsX.renderFormulaCard) return window.LabsX.renderFormulaCard(d);
  const b = el('div', 'fc-card');
  b.innerHTML = `<b>${esc(d.title || 'Formula')}</b><pre>${esc(d.expressionText || d.latex || '')}</pre>`;
  return b;
});
const FORMULA_RX = /\b(formula calculator|calculate formula|formula for|equation for|build a formula)\b|מחשבון נוסחאות|תבנה לי נוסח[אה]|נוסחה (ל|של|עבור)|חש[בו]ב נוסח[אה]|آلة حاسبة للصيغة|صيغة لـ/i;
A.registerTool({
  id: 'formula',
  icon: '🧮',
  label: 'Formula Calculator',
  test: (tx, o) => !o.hasImages && FORMULA_RX.test(tx) && tx.length < 320,
  run: async (text, ctx) => {
    const lg = langOf(text);
    ctx.work.log('Generating formula & interactive calculator');
    const cleanPrompt = text.replace(/^\/?formula(\s+calculator)?\s*:?\s*/i, '').trim() || text;
    if (!window.LabsX || !window.LabsX.generateFormulaSpec) {
      throw Object.assign(new Error('Formula engine unavailable'), {userFacing: true});
    }
    const spec = await window.LabsX.generateFormulaSpec(cleanPrompt, x => ctx.work.log(x), ctx.signal);
    if (!spec || !spec.jsExpression || !Array.isArray(spec.variables) || !spec.variables.length) {
      throw Object.assign(new Error(pick(lg, {en:'Could not build variables for that formula — try describing the variables.', he:'לא הצלחתי לחלץ משתנים לנוסחה הזו — נסו לפרט מעט יותר.'})), {userFacing: true});
    }
    return {
      content: pick(lg, {
        en: `Here is your interactive **${spec.title || 'Formula Calculator'}** — adjust any variable live below:`,
        he: `הנה מחשבון הנוסחאות האינטראקטיבי שלך עבור **${spec.title || 'הנוסחה'}** — אפשר לשנות כל משתנה בזמן אמת:`,
        ar: `إليك حاسبة الصيغة التفاعلية لـ **${spec.title || 'الصيغة'}** — يمكنك تعديل كل متغير مباشرة:`
      }),
      cards: [{type:'formula', data: spec, summary: `Interactive Formula Calculator: ${spec.title} (${spec.expressionText})`}]
    };
  }
});

window.Tools = {fxParse, parseDur, convert, palette, ocr, qrCanvas};
})();
