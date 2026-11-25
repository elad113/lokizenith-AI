/* LokiLessons 4.0 — Interactive AI Study Studio & Personal Tutor. Made by Lokiz Studios. */
(function(){
'use strict';
const A = window.App, {$, $$, el, esc} = A;
const S = () => A.settings();

/* ---------- UI strings (lesson language) ---------- */
const STR = {
  he:{
    title:'LokiLessons', sub:'מרכז לימוד אינטראקטיבי · כל המקצועות', back:'‹ חזרה לצ׳אט',
    quiz:'בוחן (4 סוגים)', explain:'הסבר מעמיק', cards:'כרטיסיות 3D', summary:'סיכום ומפת חשיבה',
    steps:'שיעור בשלבים', match:'משחק התאמה', mistake:'מצא את הטעות', feynman:'שיטת פיינמן',
    plan:'תוכנית לימוד', hints:'מצב רמזים', review:'חזרה', due:'לחזרה', clear:'נקה שיחה',
    placeholder:'שאלו כל שאלה, בקשו הסבר על פרק/נושא או כתבו "תעשה לי מבחן"…', send:'שלח',
    check:'בדיקה', next:'המשך', finish:'סיום', hint:'רמז', letterHint:'רמז אותיות',
    correct:'נכון! 🎉', wrong:'לא בדיוק', rightAnswer:'התשובה הנכונה:', yourAnswer:'התשובה שלך:', why:'הסבר:',
    question:'שאלה', of:'מתוך', typeAnswer:'כתבו את התשובה שלכם כאן…', fillPlaceholder:'הקלידו את המילה / המושג החסר…',
    grading:'בודק…', score:'הציון שלך', retryWrong:'🔁 תרגול הטעויות', newQuiz:'✨ בוחן חדש',
    reviewTitle:'סקירת התשובות המלאה', perfect:'מושלם! אלופים 🏆', great:'עבודה מצוינת! 💪',
    ok:'כיוון טוב — עוד קצת תרגול 📚', low:'לא נורא — בואו נחזור על החומר 🌱',
    makingQuiz:'בונה מבחן אינטראקטיבי (4 סוגי שאלות)…', makingCards:'מכין כרטיסיות תלת-ממד…',
    makingSummary:'בונה סיכום ומפת חשיבה…', makingSteps:'בונה שיעור מודרך שלב-אחר-שלב…',
    makingMatch:'מכין משחק התאמת מושגים…', makingMistake:'מכין אתגר "מצא את הטעות"…',
    makingFeynman:'מכין אימון שיטת פיינמן…',
    flip:'לחצו להפיכת הכרטיסייה', again:'שוב', hard:'קשה', good:'טוב', easy:'קל',
    deckDone:'סיימתם את כל הכרטיסיות! 🎉', cardOf:'כרטיסייה', quizzes:'בחנים', avg:'ממוצע',
    mastery:'שליטה', noDue:'אין כרטיסיות לחזרה כרגע', topics:'נושאים מהירים', difficulty:'רמת קושי',
    easyL:'קל', mediumL:'בינוני', hardL:'קשה',
    welcome:'היי! ברוכים הבאים אל מרכז הלימוד ב**{s}** 👋\nבחרו נושא מהרשימה למעלה או אחד מכלי הלמידה האינטראקטיביים למטה — אפשר ללמוד בשלבים, לשחק משחק התאמת מושגים, לתרגל כרטיסיות 3D או להיבחן במבחן עם **4 סוגי שאלות** (אמריקאיות, נכון/לא נכון, השלמת משפט ושאלות פתוחות)!',
    err:'משהו השתבש — נסו שוב.', keyTerms:'מושגי מפתח', mindmap:'מפת חשיבה',
    topicPrompt:'כתבו נושא בתיבה למטה או לחצו על אחד הנושאים המהירים למעלה',
    explainAsk:'למד והסבר לי בצורה מסודרת ומעמיקה את הנושא: ',
    planAsk:'בנה לי תוכנית לימוד ל-7 ימים לקראת מבחן ב{s}, עם משימות יומיות קצרות ותרגול.',
    open:'שאלה פתוחה', mc:'רב-ברירה (אמריקאית)', tf:'נכון / לא נכון', fill:'השלמת משפט',
    trueOpt:'נכון', falseOpt:'לא נכון',
    copy:'העתק', speak:'הקרא', minQ:'לא הצלחתי לבנות מספיק שאלות — נסו שוב',
    working:'עובד', worked:'עבד', verifying:'מאמת את התשובות…',
    quizOnThis:'📝 בחן אותי על זה', stepsOnThis:'🎯 שיעור בשלבים', matchOnThis:'🎮 משחק מושגים', cardsOnThis:'🃏 כרטיסיות על זה',
    quizBuilderTitle:'הגדרת מבחן אינטראקטיבי', qCountLbl:'מספר שאלות:', qTypeLbl:'סוגי שאלות:',
    typeAll:'כל 4 הסוגים (מומלץ)', typeMc:'רק אמריקאיות', typeTf:'רק נכון / לא נכון', typeFill:'רק השלמת משפט', typeOpen:'רק פתוחות',
    startQuizBtn:'🚀 התחל מבחן עכשיו', scrollBottom:'⬇ גלול להודעה האחרונה'
  },
  en:{
    title:'LokiLessons', sub:'Interactive Study Studio · All Subjects', back:'‹ Back to Chat',
    quiz:'Test (4 Types)', explain:'Deep Explain', cards:'3D Flashcards', summary:'Summary & Mind Map',
    steps:'Guided Steps', match:'Match Game', mistake:'Spot the Mistake', feynman:'Feynman Coach',
    plan:'Study Plan', hints:'Hints mode', review:'Review', due:'due', clear:'Clear chat',
    placeholder:'Ask anything, pick a topic above, or say "make a test on this"…', send:'Send',
    check:'Check', next:'Next', finish:'Finish', hint:'Hint', letterHint:'Letter clue',
    correct:'Correct! 🎉', wrong:'Not quite', rightAnswer:'Correct answer:', yourAnswer:'Your answer:', why:'Why:',
    question:'Question', of:'of', typeAnswer:'Type your answer here…', fillPlaceholder:'Type the missing word or term…',
    grading:'Checking…', score:'Your score', retryWrong:'🔁 Retry wrong ones', newQuiz:'✨ New test',
    reviewTitle:'Full Answer Review', perfect:'Perfect! Champion 🏆', great:'Great work! 💪',
    ok:'Good direction — a bit more practice 📚', low:'No worries — let’s review the material 🌱',
    makingQuiz:'Building your 4-type interactive test…', makingCards:'Making 3D flashcards…',
    makingSummary:'Writing summary & mind map…', makingSteps:'Building step-by-step guided lesson…',
    makingMatch:'Creating concept match game…', makingMistake:'Preparing "Spot the Mistake" challenge…',
    makingFeynman:'Preparing Feynman Teach-Back session…',
    flip:'Tap to flip card', again:'Again', hard:'Hard', good:'Good', easy:'Easy',
    deckDone:'Deck complete! 🎉', cardOf:'Card', quizzes:'tests', avg:'avg',
    mastery:'Mastery', noDue:'No cards due right now', topics:'Quick Topics', difficulty:'Difficulty',
    easyL:'Easy', mediumL:'Medium', hardL:'Hard',
    welcome:'Welcome to your interactive **{s}** Study Studio 👋\nClick any quick topic above or launch an interactive learning mode below — Guided Step-by-Step Lessons, Concept Match Games, 3D Flashcards, or a full Test with **4 question types** (Multiple Choice, True/False, Fill in the Blank, and Open Questions)!',
    err:'Something went wrong — try again.', keyTerms:'Key terms', mindmap:'Mind map',
    topicPrompt:'Type a topic below or click one of the quick topic chips above',
    explainAsk:'Teach and explain this topic clearly and thoroughly: ',
    planAsk:'Build me a 7-day study plan for a {s} test, with short daily tasks and practice.',
    open:'Open question', mc:'Multiple choice', tf:'True / False', fill:'Fill in the blank',
    trueOpt:'True', falseOpt:'False',
    copy:'Copy', speak:'Read aloud', minQ:'Could not build enough questions — try again',
    working:'Working', worked:'Worked', verifying:'Verifying answer keys…',
    quizOnThis:'📝 Test me on this', stepsOnThis:'🎯 Guided Steps', matchOnThis:'🎮 Match Game', cardsOnThis:'🃏 Flashcards',
    quizBuilderTitle:'Interactive Test Builder', qCountLbl:'Questions:', qTypeLbl:'Question Types:',
    typeAll:'All 4 Types (Recommended)', typeMc:'Multiple Choice Only', typeTf:'True / False Only', typeFill:'Fill in the Blank Only', typeOpen:'Open Questions Only',
    startQuizBtn:'🚀 Launch Test Now', scrollBottom:'⬇ Scroll to latest'
  },
  ar:{
    title:'LokiLessons', sub:'استوديو التعلم التفاعلي · جميع المواد', back:'‹ الدردشة',
    quiz:'اختبار (4 أنواع)', explain:'شرح مفصل', cards:'بطاقات 3D', summary:'ملخص وخريطة ذهنية',
    steps:'درس خطوة بخطوة', match:'لعبة المطابقة', mistake:'اكتشف الخطأ', feynman:'طريقة فاينمان',
    plan:'خطة دراسة', hints:'وضع التلميحات', review:'مراجعة', due:'للمراجعة', clear:'مسح المحادثة',
    placeholder:'اسأل معلمك أي سؤال أو اطلب اختبارًا…', send:'إرسال',
    check:'تحقق', next:'التالي', finish:'إنهاء', hint:'تلميح', letterHint:'تلميح الحروف',
    correct:'صحيح! 🎉', wrong:'ليس تمامًا', rightAnswer:'الإجابة الصحيحة:', yourAnswer:'إجابتك:', why:'الشرح:',
    question:'سؤال', of:'من', typeAnswer:'اكتب إجابتك هنا…', fillPlaceholder:'اكتب الكلمة أو المصطلح المفقود…',
    grading:'جارٍ التحقق…', score:'نتيجتك', retryWrong:'🔁 أعد الأخطاء', newQuiz:'✨ اختبار جديد',
    reviewTitle:'مراجعة الإجابات', perfect:'ممتاز! بطل 🏆', great:'عمل رائع! 💪',
    ok:'اتجاه جيد — المزيد من التدريب 📚', low:'لا بأس — لنراجع المادة 🌱',
    makingQuiz:'جارٍ إعداد الاختبار التفاعلي…', makingCards:'جارٍ إعداد البطاقات…',
    makingSummary:'جارٍ كتابة الملخص…', makingSteps:'جارٍ إعداد درس خطوة بخطوة…',
    makingMatch:'جارٍ إعداد لعبة المطابقة…', makingMistake:'جارٍ إعداد تحدي اكتشاف الخطأ…',
    makingFeynman:'جارٍ إعداد تدريب فاينمان…',
    flip:'اضغط للقلب', again:'مجددًا', hard:'صعب', good:'جيد', easy:'سهل',
    deckDone:'أنهيت البطاقات! 🎉', cardOf:'بطاقة', quizzes:'اختبارات', avg:'المعدل',
    mastery:'الإتقان', noDue:'لا توجد بطاقات للمراجعة الآن', topics:'مواضيع سريعة', difficulty:'المستوى',
    easyL:'سهل', mediumL:'متوسط', hardL:'صعب',
    welcome:'مرحبًا بك في استوديو التعلم لمادة **{s}** 👋\nاختر موضوعًا من الأعلى أو أداة تعلم تفاعلية.',
    err:'حدث خطأ — حاول مرة أخرى.', keyTerms:'مصطلحات أساسية', mindmap:'خريطة ذهنية',
    topicPrompt:'أي موضوع؟', explainAsk:'اشرح لي موضوع: ',
    planAsk:'ضع لي خطة دراسة لمدة 7 أيام لاختبار في {s} مع مهام يومية قصيرة وتدريب.',
    open:'سؤال مفتوح', mc:'اختيار من متعدد', tf:'صح أم خطأ', fill:'أكمل الفراغ',
    trueOpt:'صحيح', falseOpt:'خطأ',
    copy:'نسخ', speak:'قراءة', minQ:'تعذر إنشاء أسئلة كافية — حاول مرة أخرى',
    working:'يعمل', worked:'عمل', verifying:'جارٍ التحقق من الإجابات…',
    quizOnThis:'📝 اختبرني في هذا', stepsOnThis:'🎯 خطوة بخطوة', matchOnThis:'🎮 لعبة المطابقة', cardsOnThis:'🃏 بطاقات',
    quizBuilderTitle:'إعداد الاختبار التفاعلي', qCountLbl:'عدد الأسئلة:', qTypeLbl:'أنواع الأسئلة:',
    typeAll:'جميع الأنواع الأربعة', typeMc:'اختيار من متعدد فقط', typeTf:'صح أم خطأ فقط', typeFill:'أكمل الفراغ فقط', typeOpen:'أسئلة مفتوحة فقط',
    startQuizBtn:'🚀 ابدأ الاختبار الآن', scrollBottom:'⬇ التمرير للأسفل'
  }
};
const LL = () => {
  const st = S();
  if (st.lang && STR[st.lang]) return st.lang;
  if (st.lessonLang && STR[st.lessonLang]) return st.lessonLang;
  return 'he';
};
const L = k => (STR[LL()][k] ?? STR.en[k] ?? k);
const LANGN = {he:'Hebrew', en:'English', ar:'Arabic'};

/* ---------- subjects (Israeli MoE curriculum) ---------- */
const SUBJECTS = [
  {id:'tanach', icon:'📜', hue:34, name:{he:'תנ״ך ומקרא', en:'Bible / Tanakh', ar:'دراسات الكتاب المقدس'},
   topics:{
     he:['מלכים א׳ י״ז – אליהו והבצורת','מלכים א׳ י״ח – אליהו בהר הכרמל','מלכים א׳ כ״א – כרם נבות היזרעאלי','ספר שמואל – שאול ודוד','פילוג הממלכה – רחבעם וירבעם','עמוס – נבואות צדק חברתי','ישעיהו – חזון אחרית הימים','ירמיהו – חורבן וגלות','בראשית – בריאת העולם והמבול','מילים מנחות ואמצעים ספרותיים'],
     en:['1 Kings 17 – Elijah & the Drought','1 Kings 18 – Mount Carmel','1 Kings 21 – Naboth’s Vineyard','Samuel – Saul & David','Division of the Kingdom','Amos – Social Justice Prophecies','Isaiah – Vision of Peace','Jeremiah – Exile & Resilience','Genesis – Creation & Flood','Literary Motifs & Leitwords'],
     ar:['ملوك الأول 17 – إيليا والجفاف','ملوك الأول 18 – جبل الكرمل','سفر صموئيل – شاول وداود','انقسام المملكة','عاموس – نبوءات العدالة','إشعياء – رؤى السلام']
   },
   prompt:'You teach Biblical Studies (תנ״ך): Former and Latter Prophets & Torah — Samuel, Kings (Elijah, Ahab, Naboth, Carmel), Amos, Isaiah, Jeremiah, Genesis; skills: reading verses precisely, key words (מילים מנחות / שורש מנחה), literary devices (תקבולת, אירוניה, אנלוגיה), characters & motives, moral/social messages, and commentary comparisons.'},
  {id:'math', icon:'📐', hue:152, name:{he:'מתמטיקה', en:'Mathematics', ar:'رياضيات'},
   topics:{
     he:['פונקציה קווית ושיפוע','מערכת משוואות','פונקציה ריבועית ופרבולה','נוסחאות הכפל המקוצר','פירוק לגורמים','משוואות ריבועיות','אי-שוויונות','משפט פיתגורס','דמיון משולשים','טריגונומטריה במשולש ישר-זווית','סטטיסטיקה והסתברות'],
     en:['Linear Functions & Slope','Systems of Equations','Quadratic Functions & Parabolas','Short Multiplication Formulas','Factoring Polynomials','Quadratic Equations','Inequalities','Pythagorean Theorem','Similar Triangles','Right-Triangle Trigonometry','Statistics & Probability'],
     ar:['الدالة الخطية والميل','هيئة معادلات','الدالة التربيعية والقطع المكافئ','قوانين الضرب المختصر','التحليل إلى عوامل','المعادلات التربيعية','نظرية فيثاغورس','حساب المثلثات']
   },
   prompt:'You teach Mathematics: linear functions & slope, systems of equations, quadratic functions & parabolas, short multiplication formulas, factoring, quadratic equations, inequalities, Pythagoras, similar triangles, right-triangle trigonometry, statistics & probability. Show clear step-by-step solutions with plain math (^ and √), verify results, and give a practice exercise.'},
  {id:'history', icon:'🏛️', hue:42, name:{he:'היסטוריה', en:'History', ar:'تاريخ'},
   topics:{
     he:['לאומיות ותנועות לאומיות','הציונות וראשיתה – הרצל','מלחמת העולם הראשונה','בין שתי המלחמות','משטרים טוטליטריים','עליית הנאציזם בגרמניה','מלחמת העולם השנייה','השואה','המאבק להקמת המדינה','הכרזת העצמאות ומלחמת העצמאות'],
     en:['Nationalism & National Movements','Rise of Zionism & Herzl','World War I','The Interwar Period','Totalitarian Regimes','Rise of Fascism & Nazism','World War II','The Holocaust','Struggle for Statehood','Declaration of Independence'],
     ar:['القومية والحركات القومية','الحرب العالمية الأولى','فترة ما بين الحربين','الأنظمة الشمولية','الحرب العالمية الثانية','الهولوكوست']
   },
   prompt:'You teach History: nationalism, Zionism, World War I, the interwar period, totalitarian regimes, World War II, the Holocaust, and state formation. Emphasize causes and consequences (גורמים ותוצאות), historical timeline, primary sources, and structured exam answers.'},
  {id:'science', icon:'🔬', hue:175, name:{he:'מדעים וביולוגיה', en:'Science & Biology', ar:'علوم وأحياء'},
   topics:{
     he:['מבנה התא ואברוניו','מיטוכונדריה ונשימה תאית','פוטוסינתזה','תורשה, דנ״א וגנטיקה','מערכת העצבים וההורמונים','מבנה האטום והטבלה המחזורית','קשרים ותגובות כימיות','חומצות ובסיסים','חשמל ומעגלים חשמליים','כוחות, תנועה ואנרגיה','אקולוגיה ומערכות אקולוגיות'],
     en:['Cell Structure & Organelles','Mitochondria & Cellular Respiration','Photosynthesis','Heredity, DNA & Genetics','Nervous & Endocrine Systems','Atomic Structure & Periodic Table','Chemical Bonds & Reactions','Acids & Bases','Electricity & Circuits','Forces, Motion & Energy','Ecology'],
     ar:['مبنى الخلية','التنفس الخلوي والتمثيل الضوئي','الوراثة والجينات','مبنى الذرة والجدول الدوري','الكهرباء والدوائر','القوى والحركة']
   },
   prompt:'You teach Science, Biology, Chemistry & Physics: cell structure, photosynthesis, cellular respiration, genetics & DNA, nervous/hormonal systems, atom structure, periodic table, chemical bonds/reactions, electricity, forces & energy, ecology. Use clear everyday examples and accurate scientific terminology.'},
  {id:'english', icon:'🇬🇧', hue:205, name:{he:'אנגלית', en:'English', ar:'إنجليزية'},
   topics:{
     he:['Present Perfect vs Past Simple','Passive Voice','Conditionals 1, 2 & 3','Reported Speech','Relative Clauses','Reading Comprehension (HOTS)','Writing an Opinion Essay','Vocabulary Band II & III','Modal Verbs'],
     en:['Present Perfect vs Past Simple','Passive Voice','Conditionals 1, 2 & 3','Reported Speech','Relative Clauses','Reading Comprehension (HOTS)','Opinion Essay Writing','Academic Vocabulary','Modal Verbs'],
     ar:['المضارع التام مقابل الماضي البسيط','المبني للمجهول (Passive Voice)','الجمل الشرطية','الكلام المنقول','جمل الوصل','كتابة مقال']
   },
   prompt:'You are an English teacher: teach grammar (tenses, passive, conditionals, reported speech, relative clauses, modals), reading comprehension with HOTS, vocabulary, and essay writing. Explain clearly in the student\'s chosen language with English examples and exercises.'},
  {id:'lashon', icon:'✍️', hue:125, name:{he:'לשון והבעה', en:'Language & Grammar', ar:'اللغة والقواعد'},
   topics:{
     he:['חלקי המשפט ותחביר','משפט פשוט, מאוחה ומורכב','שורש, משקל וגזרות','שבעת הבניינים','שם המספר','סמיכות וצירופים','מילות קישור ויחסי משמעות','כללי פיסוק','כתיבה טיעונית וסיכום ממזג','הבנת הנקרא'],
     en:['Parts of a Sentence & Syntax','Simple, Compound & Complex Sentences','Word Roots & Patterns','Verb Binyanim & Voice','Construct State & Noun Phrases','Logical Connectors','Punctuation Rules','Argumentative Writing','Reading Comprehension'],
     ar:['أقسام الجملة','الجملة البسيطة والمركبة','الجذر والوزن الصرفي','أوزان الأفعال','الإضافة','أدوات الربط','الكتابة الحجاجية']
   },
   prompt:'You teach Hebrew Language, Grammar & Composition (לשון והבעה): syntax (חלקי המשפט, משפט פשוט/מאוחה/מורכב), morphology (שורש, משקל, בניינים, גזרות), שם המספר, logical connectors, reading comprehension, and argumentative writing.'},
  {id:'literature', icon:'📚', hue:280, name:{he:'ספרות', en:'Literature', ar:'أدب'},
   topics:{
     he:['אמצעים אומנותיים בשירה','דובר ונמען בשירה','שירי ביאליק','רחל המשוררת ולאה גולדברג','יהודה עמיחי','הסיפור הקצר – מבנה ודמויות','נקודת תצפית וקונפליקט','דרמה וטרגדיה','כתיבת תשובה ספרותית מלאה'],
     en:['Literary Devices & Figurative Language','Speaker & Addressee in Poetry','Bialik Poetry','Modern Lyric Poetry','Short Story Structure & Characters','Conflict & Point of View','Drama & Tragedy','Writing a Complete Literary Analysis'],
     ar:['الأساليب البلاغية','المتكلم والمخاطب في الشعر','القصة القصيرة','الصراع ووجهة النظر','المسرح والدراما']
   },
   prompt:'You teach Literature (ספרות): poetry, short stories, and drama; literary devices (מטאפורה, דימוי, האנשה, מוטיב, אירוניה, אנלוגיה), speaker/addressee, structure, theme, characters, and how to write a complete exam-grade literary analysis (טענה, נימוק, ביסוס וציטוט).'},
  {id:'civics', icon:'🌍', hue:190, name:{he:'אזרחות וגאוגרפיה', en:'Civics & Geography', ar:'مدنيات وجغرافيا'},
   topics:{
     he:['מגילת העצמאות','מדינה יהודית ודמוקרטית','זכויות האדם והאזרח','הפרדת רשויות בישראל','שלטון החוק ובג״ץ','שיטת הבחירות בישראל','אוכלוסייה והגירה','עיור וערים חכמות','אקלים ומשאבי מים'],
     en:['Declaration of Independence','Democratic Principles','Human & Civil Rights','Separation of Powers','Rule of Law & Supreme Court','Electoral Systems','Population & Migration','Urbanization','Climate & Water Resources'],
     ar:['مبادئ الديمقراطية','حقوق الإنسان والمواطن','الفصل بين السلطات','سيادة القانون','الأنظمة الانتخابية','المناخ وموارد المياه']
   },
   prompt:'You teach Civics and Geography (אזרחות וגאוגרפיה): Declaration of Independence, democratic principles, human & civil rights, separation of powers, rule of law; geography: population, urbanization, climate, and water resources.'}
];

const subjName = s => s.name[LL()] || s.name.he || s.name.en;
const subjTopics = s => Array.isArray(s.topics) ? s.topics : (s.topics[LL()] || s.topics.he || s.topics.en || []);

/* ---------- store ---------- */
const store = Object.assign({cur:'tanach', hints:false, qLen:8, qType:'all', subj:{}}, A.safeJSON(localStorage.getItem('lz.lessons')) || {});
if (!SUBJECTS.some(s => s.id === store.cur)) store.cur = 'tanach';
let _saveTimer = 0;
const save = (debounced = false) => {
  if (debounced){
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => save(false), 380);
    return;
  }
  clearTimeout(_saveTimer);
  try { localStorage.setItem('lz.lessons', JSON.stringify(store)); } catch(_){ A.toast('Storage is full', 'err'); }
};
const sd = id => store.subj[id] || (store.subj[id] = {msgs:[], quizzes:[], deck:[]});
const cur = () => SUBJECTS.find(s => s.id === store.cur) || SUBJECTS[0];

function stats(id){
  const d = sd(id), q = d.quizzes.slice(-5);
  const avg = q.length ? Math.round(q.reduce((a, x) => a + x.score / Math.max(1, x.total), 0) / q.length * 100) : 0;
  const now = Date.now(), due = d.deck.filter(c => (c.due || 0) <= now).length;
  const mastered = d.deck.length ? d.deck.filter(c => (c.ivl || 0) >= 4).length / d.deck.length : 0;
  const mastery = Math.round(q.length ? avg * .75 + mastered * 25 : mastered * 100 * .5);
  return {avg, count: d.quizzes.length, due, mastery, cards: d.deck.length};
}

/* ---------- layout ---------- */
const view = $('#lessonsView');
let busy = false, ctl = null, quizTrayOpen = false, activeTopicChip = '';

function render(){
  if (!view) return;
  const l = LL(); const rtl = l !== 'en';
  view.dataset.noi18n = '1'; view.dir = rtl ? 'rtl' : 'ltr'; view.lang = l;
  view.innerHTML = `<div class="ls-wrap">
    <aside class="ls-side" aria-label="Subjects">
      <div class="ls-brand">
        <span class="ls-logo" aria-hidden="true">🎓</span>
        <div class="ls-brand-txt">
          <b>${L('title')} <span class="ls-v4-tag">4.0</span></b>
          <small>${L('sub')}</small>
        </div>
      </div>
      <div class="ls-subjects" id="lsSubjects" role="tablist"></div>
      <button type="button" class="back-btn ls-back" id="lsBack">${L('back')}</button>
    </aside>
    <section class="ls-main">
      <header class="ls-head" id="lsHead"></header>
      <div class="ls-tools" id="lsTools" role="toolbar" aria-label="Interactive Study Tools"></div>
      <div class="ls-quiz-tray" id="lsQuizTray" hidden></div>
      <div class="ls-msgs-stage">
        <div class="ls-msgs" id="lsMsgs" role="log" aria-live="polite" tabindex="0"></div>
        <button type="button" class="ls-scroll-fab" id="lsScrollFab" hidden aria-label="${esc(L('scrollBottom'))}">${L('scrollBottom')}</button>
      </div>
      <form class="ls-composer" id="lsForm" autocomplete="off">
        <span class="ls-comp-subject-pill" id="lsCompPill"></span>
        <textarea id="lsInput" rows="1" dir="auto" placeholder="${esc(L('placeholder'))}"></textarea>
        <button type="submit" class="send" id="lsSend" aria-label="${esc(L('send'))}"><svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z"/></svg></button>
      </form>
    </section>
  </div>`;

  $('#lsBack').onclick = () => A.showView('chat');
  $('#lsForm').onsubmit = e => {
    e.preventDefault();
    const v = $('#lsInput').value.trim();
    if (busy){ ctl && ctl.abort(); return; }
    if (v){ $('#lsInput').value = ''; autosize(); handleUserPromptOrCommand(v); }
  };
  const ta = $('#lsInput');
  ta.addEventListener('input', autosize);
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing){
      e.preventDefault();
      $('#lsForm').requestSubmit();
    }
  });

  const msgsBox = $('#lsMsgs');
  const fab = $('#lsScrollFab');
  if (msgsBox && fab){
    msgsBox.addEventListener('scroll', () => {
      const dist = msgsBox.scrollHeight - msgsBox.scrollTop - msgsBox.clientHeight;
      fab.hidden = dist < 160;
    }, {passive: true});
    fab.onclick = () => scroll(true);
  }

  renderSubjects();
  renderHead();
  renderQuizTray();
  renderMsgs();
}

function autosize(){ const ta = $('#lsInput'); if (ta) A.grow(ta); }

function getLastTaughtTopicInSubject(){
  const d = sd(cur().id);
  for (let i = d.msgs.length - 1; i >= 0; i--){
    const m = d.msgs[i];
    if (m.role === 'user' && m.content){
      const clean = String(m.content)
        .replace(/^[📝🃏🧭🎯🎮🕵️🧠💡🗓]\s*/u, '')
        .replace(/^(?:למד והסבר לי בצורה מסודרת ומעמיקה את הנושא:|הסבר לי את הנושא:|בוחן(?:\s*\(4 סוגים\))?:|כרטיסיות(?:\s*3D)?:|סיכום(?:\s*ומפת חשיבה)?:|שיעור בשלבים:|משחק התאמה:|מצא את הטעות:)\s*/i, '')
        .trim();
      if (clean && clean.length >= 2 && !/^(?:תעשה\s+(?:לי\s+)?(?:על\s+זה\s+)?מבחן|בחן\s+אותי(?:\s+על\s+זה)?|בוחן|מבחן)$/i.test(clean)){
        return clean.slice(0, 110);
      }
    }
  }
  return activeTopicChip || '';
}

function getRecentSubjectStudyContext(){
  const d = sd(cur().id);
  const recentAssistant = [...d.msgs].reverse().filter(m => m.role === 'assistant' && m.content && String(m.content).length > 40).slice(0, 2);
  if (!recentAssistant.length) return '';
  return recentAssistant.map(m => String(m.content).slice(0, 2400)).join('\n---\n');
}

function handleUserPromptOrCommand(v){
  if (/^(?:תעשה|תכין|צור|בנה)?\s*(?:לי\s+)?(?:מבחן|בוחן|חידון|תבחן\s+אותי|בחן\s+אותי|quiz|test\s+me)\b/i.test(v)){
    const numMatch = v.match(/(\d{1,2})\s*(?:שאלות|questions?|qs?)/i);
    const customN = numMatch ? Math.max(5, Math.min(20, parseInt(numMatch[1], 10))) : undefined;
    let topic = v
      .replace(/^(?:תעשה|תכין|צור|בנה)?\s*(?:לי\s+)?(?:מבחן|בוחן|חידון|תבחן\s+אותי|בחן\s+אותי|quiz|test\s+me)\s*(?:של\s+\d{1,2}\s+שאלות\s*)?(?:על|בנושא|ב-?|on|about)?\s*/i, '')
      .replace(/\s*(?:עם|של|בן|with|of)\s+\d{1,2}\s*(?:שאלות|questions?).*$/i, '')
      .trim();
    if (!topic || /^(?:זה|הזה|הנושא\s+הזה|החומר\s+הזה|מה\s+שלמדנו|this|it)$/i.test(topic)){
      topic = getLastTaughtTopicInSubject();
    }
    makeQuiz(topic, null, {n: customN});
    return;
  }
  ask(v);
}

function renderSubjects(){
  const box = $('#lsSubjects'); if (!box) return; box.innerHTML = '';
  SUBJECTS.forEach((s, i) => {
    const st = stats(s.id);
    const tps = subjTopics(s);
    const b = el('button', 'ls-subject' + (s.id === store.cur ? ' on' : ''));
    b.type = 'button';
    b.style.setProperty('--h', s.hue);
    b.style.animationDelay = i * 35 + 'ms';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', s.id === store.cur ? 'true' : 'false');
    b.dataset.subject = s.id;
    b.innerHTML = `<span class="ls-ic">${s.icon}</span><span class="ls-nm"><b>${esc(subjName(s))}</b><small>${st.count ? st.count + ' ' + L('quizzes') + ' · ' + L('avg') + ' ' + st.avg + '%' : (tps.length + ' ' + L('topics'))}</small><span class="ls-prog"><i style="transform:scaleX(${st.mastery / 100})"></i></span></span>${st.due ? `<span class="ls-due" title="${L('due')}">${st.due}</span>` : ''}`;
    b.onclick = () => {
      if (busy) return;
      store.cur = s.id;
      activeTopicChip = '';
      save();
      renderSubjects();
      renderHead();
      renderQuizTray();
      renderMsgs();
    };
    box.appendChild(b);
  });
  const pill = $('#lsCompPill');
  if (pill){
    const s = cur();
    pill.textContent = `${s.icon} ${subjName(s)}`;
  }
}

function ring(p){
  const c = 2 * Math.PI * 22;
  return `<svg class="ls-ring" viewBox="0 0 52 52"><circle cx="26" cy="26" r="22"/><circle class="v" cx="26" cy="26" r="22" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p / 100)}"/><text x="26" y="30">${p}%</text></svg>`;
}

function renderHead(){
  const s = cur(), st = stats(s.id), tps = subjTopics(s);
  const h = $('#lsHead'); if (!h) return; h.style.setProperty('--h', s.hue);
  const isCollapsed = !!store.topCollapsed;
  if (view) view.classList.toggle('ls-top-collapsed', isCollapsed);
  const isHe = LL() === 'he';
  h.innerHTML = `<div class="ls-hicon">${s.icon}</div>
  <div class="ls-htxt">
    <div class="ls-htitle-row">
      <h2><span class="ls-h-inline-ic">${s.icon}</span> ${esc(subjName(s))}</h2>
      <span class="ls-hmeta-badge">${st.count} ${L('quizzes')} · ${st.cards} 🃏</span>
      <button type="button" class="ls-top-collapse-btn" id="lsTopCollapseBtn" title="${isHe ? 'כווץ/הרחב סרגל כלים' : 'Toggle tools bar'}" aria-expanded="${!isCollapsed}">${isCollapsed ? (isHe ? '▾ כלים' : '▾ Tools') : '▴'}</button>
    </div>
    <div class="ls-topics" role="list" aria-label="${esc(L('topics'))}">
      ${tps.map(tp => `<button type="button" class="ls-topic${activeTopicChip === tp ? ' active' : ''}" dir="auto">${esc(tp)}</button>`).join('')}
    </div>
  </div>
  <div class="ls-hstat" title="${L('mastery')}">${ring(st.mastery)}<small>${L('mastery')}</small></div>`;

  const colBtn = $('#lsTopCollapseBtn', h);
  if (colBtn){
    colBtn.onclick = () => {
      store.topCollapsed = !store.topCollapsed;
      save();
      renderHead();
    };
  }

  $$('.ls-topic', h).forEach(b => {
    b.onclick = () => {
      activeTopicChip = b.textContent.trim();
      $$('.ls-topic', h).forEach(x => x.classList.toggle('active', x === b));
      const inp = $('#lsInput');
      if (inp) inp.value = activeTopicChip;
      ask(L('explainAsk') + activeTopicChip);
    };
  });

  const tl = $('#lsTools');
  if (!tl) return;
  const diff = S().quizDifficulty || 'medium';
  tl.innerHTML = `
    <button type="button" data-t="quiz" class="ls-tool primary">📝 ${L('quiz')}</button>
    <button type="button" data-t="quiz-cfg" class="ls-tool ls-tool-cfg${quizTrayOpen ? ' on' : ''}" title="${esc(L('quizBuilderTitle'))}">⚙️</button>
    <button type="button" data-t="steps" class="ls-tool">🎯 ${L('steps')}</button>
    <button type="button" data-t="match" class="ls-tool">🎮 ${L('match')}</button>
    <button type="button" data-t="mistake" class="ls-tool">🕵️ ${L('mistake')}</button>
    <button type="button" data-t="feynman" class="ls-tool">🧠 ${L('feynman')}</button>
    <button type="button" data-t="cards" class="ls-tool">🃏 ${L('cards')}</button>
    <button type="button" data-t="summary" class="ls-tool">🧭 ${L('summary')}</button>
    <button type="button" data-t="explain" class="ls-tool">💡 ${L('explain')}</button>
    <button type="button" data-t="plan" class="ls-tool">🗓 ${L('plan')}</button>
    <button type="button" data-t="review" class="ls-tool"${st.due ? '' : ' disabled'}>🔁 ${L('review')}${st.due ? ' <i class="ls-badge">' + st.due + '</i>' : ''}</button>
    <div class="ls-tools-end">
      <label class="ls-hints"><input type="checkbox" id="lsHints"${store.hints ? ' checked' : ''}> <span>${L('hints')}</span></label>
      <select id="lsDiff" class="ls-diff" title="${L('difficulty')}"><option value="easy">${L('easyL')}</option><option value="medium">${L('mediumL')}</option><option value="hard">${L('hardL')}</option></select>
      <button type="button" data-t="clear" class="ls-tool ghost" title="${L('clear')}">🗑</button>
    </div>`;

  $('#lsDiff').value = diff;
  $('#lsDiff').onchange = e => { S().quizDifficulty = e.target.value; A.saveSettings(); };
  $('#lsHints').onchange = e => { store.hints = e.target.checked; save(); };

  tl.onclick = e => {
    const b = e.target.closest('button[data-t]'); if (!b || busy) return;
    const rawInput = ($('#lsInput') && $('#lsInput').value.trim()) || '';
    const topic = rawInput || activeTopicChip || getLastTaughtTopicInSubject();
    const a = b.dataset.t;
    if (a === 'quiz'){
      if ($('#lsInput')) $('#lsInput').value = '';
      makeQuiz(topic);
    } else if (a === 'quiz-cfg'){
      quizTrayOpen = !quizTrayOpen;
      b.classList.toggle('on', quizTrayOpen);
      renderQuizTray();
    } else if (a === 'steps'){
      if ($('#lsInput')) $('#lsInput').value = '';
      makeGuidedSteps(topic);
    } else if (a === 'match'){
      if ($('#lsInput')) $('#lsInput').value = '';
      makeMatchGame(topic);
    } else if (a === 'mistake'){
      if ($('#lsInput')) $('#lsInput').value = '';
      makeSpotMistake(topic);
    } else if (a === 'feynman'){
      if ($('#lsInput')) $('#lsInput').value = '';
      makeFeynman(topic);
    } else if (a === 'cards'){
      if ($('#lsInput')) $('#lsInput').value = '';
      makeCards(topic);
    } else if (a === 'summary'){
      if ($('#lsInput')) $('#lsInput').value = '';
      makeSummary(topic);
    } else if (a === 'explain'){
      if (rawInput || activeTopicChip){
        if ($('#lsInput')) $('#lsInput').value = '';
        ask(L('explainAsk') + (rawInput || activeTopicChip));
      } else {
        $('#lsInput').value = L('explainAsk');
        $('#lsInput').focus();
        A.toast(L('topicPrompt'));
      }
    } else if (a === 'plan'){
      ask(L('planAsk').replace('{s}', subjName(cur())));
    } else if (a === 'review'){
      review();
    } else if (a === 'clear'){
      const go = () => { sd(cur().id).msgs = []; save(); renderMsgs(); };
      const cancel = ({he:'ביטול', ar:'إلغاء', en:'Cancel'}[(A.settings && A.settings().lang)] || 'Cancel');
      (A.confirmDanger ? A.confirmDanger({ title: L('clear') + '?', confirmLabel: L('clear'), cancelLabel: cancel }) : Promise.resolve(true)).then(ok => { if (ok) go(); });
    }
  };
}

function renderQuizTray(){
  const tray = $('#lsQuizTray');
  if (!tray) return;
  tray.hidden = !quizTrayOpen;
  if (!quizTrayOpen) return;
  const qLen = Math.max(5, Math.min(20, +(store.qLen || S().quizLength || 8)));
  const qType = store.qType || 'all';
  const counts = [5, 8, 10, 12, 15, 20];
  const types = [
    {id:'all', icon:'✨', label: L('typeAll')},
    {id:'mc', icon:'🔘', label: L('typeMc')},
    {id:'tf', icon:'⚖️', label: L('typeTf')},
    {id:'fill', icon:'🧩', label: L('typeFill')},
    {id:'open', icon:'✍️', label: L('typeOpen')}
  ];
  tray.innerHTML = `
    <div class="ls-qtray-inner">
      <div class="ls-qtray-row">
        <span class="ls-qtray-lbl">📝 <b>${L('quizBuilderTitle')}</b></span>
        <div class="ls-qtray-group">
          <small>${L('qCountLbl')}</small>
          <div class="ls-qtray-pills" id="lsQCountPills">
            ${counts.map(c => `<button type="button" class="ls-qpill${c === qLen ? ' on' : ''}" data-cnt="${c}">${c}</button>`).join('')}
          </div>
        </div>
        <div class="ls-qtray-group">
          <small>${L('qTypeLbl')}</small>
          <div class="ls-qtray-pills" id="lsQTypePills">
            ${types.map(t => `<button type="button" class="ls-qpill${t.id === qType ? ' on' : ''}" data-qtype="${t.id}">${t.icon} ${esc(t.label)}</button>`).join('')}
          </div>
        </div>
        <button type="button" class="btn-primary ls-qtray-go" id="lsQLaunchBtn">${L('startQuizBtn')}</button>
      </div>
    </div>`;

  $$('#lsQCountPills .ls-qpill', tray).forEach(b => {
    b.onclick = () => {
      store.qLen = +b.dataset.cnt;
      S().quizLength = store.qLen;
      A.saveSettings();
      save();
      renderQuizTray();
    };
  });
  $$('#lsQTypePills .ls-qpill', tray).forEach(b => {
    b.onclick = () => {
      store.qType = b.dataset.qtype;
      save();
      renderQuizTray();
    };
  });
  $('#lsQLaunchBtn', tray).onclick = () => {
    const rawInput = ($('#lsInput') && $('#lsInput').value.trim()) || '';
    const topic = rawInput || activeTopicChip || getLastTaughtTopicInSubject();
    if ($('#lsInput')) $('#lsInput').value = '';
    quizTrayOpen = false;
    renderQuizTray();
    makeQuiz(topic, null, {n: store.qLen, mode: store.qType});
  };
}

/* ---------- messages & interactive welcome studio ---------- */
function renderMsgs(){
  const box = $('#lsMsgs'); if (!box) return; box.innerHTML = '';
  const d = sd(cur().id);
  if (!d.msgs.length){
    const s = cur();
    const tps = subjTopics(s).slice(0, 6);
    const isHe = LL() === 'he';
    const w = el('div', 'ls-welcome-studio');
    w.innerHTML = `
      <div class="ls-ws-hero">
        <div class="ls-wicon">${s.icon}</div>
        <div class="ls-ws-txt">
          <b>${isHe ? 'לימוד ותרגול מהיר ב' + esc(subjName(s)) : esc(subjName(s)) + ' Quick Studio'}</b>
          <small>${isHe ? 'בחרו פעולה או נושא מהיר, או שאלו למטה:' : 'Pick an action or topic, or ask below:'}</small>
        </div>
        <button type="button" class="ls-ws-close" title="${isHe ? 'צמצם' : 'Minimize'}" aria-label="Minimize">✕</button>
      </div>
      <div class="ls-ws-modes">
        <button type="button" class="ls-ws-mode" data-m="quiz">
          <span class="ls-wm-ic">📝</span>
          <div><b>${isHe ? 'מבחן 4 סוגים' : '4-Type Test'}</b><small>${isHe ? 'אמריקאי·נכון/לא·השלמה·פתוח' : 'MC·T/F·Fill·Open'}</small></div>
        </button>
        <button type="button" class="ls-ws-mode" data-m="steps">
          <span class="ls-wm-ic">🎯</span>
          <div><b>${isHe ? 'שיעור בשלבים' : 'Guided Steps'}</b><small>${isHe ? '4 שלבים + בדיקה' : 'Stage-by-stage'}</small></div>
        </button>
        <button type="button" class="ls-ws-mode" data-m="match">
          <span class="ls-wm-ic">🎮</span>
          <div><b>${isHe ? 'משחק התאמה' : 'Match Game'}</b><small>${isHe ? 'מושגים והגדרות' : 'Match terms'}</small></div>
        </button>
        <button type="button" class="ls-ws-mode" data-m="mistake">
          <span class="ls-wm-ic">🕵️</span>
          <div><b>${isHe ? 'מצא את הטעות' : 'Spot Mistake'}</b><small>${isHe ? 'איתור ותיקון' : 'Fix errors'}</small></div>
        </button>
        <button type="button" class="ls-ws-mode" data-m="feynman">
          <span class="ls-wm-ic">🧠</span>
          <div><b>${isHe ? 'שיטת פיינמן' : 'Feynman'}</b><small>${isHe ? 'הסבר במילים שלך' : 'Teach back'}</small></div>
        </button>
        <button type="button" class="ls-ws-mode" data-m="cards">
          <span class="ls-wm-ic">🃏</span>
          <div><b>${isHe ? 'כרטיסיות 3D' : '3D Cards'}</b><small>${isHe ? 'שינון מהיר' : 'Flip cards'}</small></div>
        </button>
      </div>
      <div class="ls-ws-topics">
        ${tps.map((tp, idx) => `<button type="button" class="ls-ws-topic-card" data-tp="${esc(tp)}"><span class="ls-ws-num">${idx + 1}</span><b dir="auto">${esc(tp)}</b></button>`).join('')}
      </div>`;
    const closeBtn = $('.ls-ws-close', w);
    if (closeBtn) closeBtn.onclick = () => w.remove();
    $$('.ls-ws-topic-card', w).forEach(btn => {
      btn.onclick = () => {
        const tp = btn.dataset.tp;
        activeTopicChip = tp;
        ask(L('explainAsk') + tp);
      };
    });
    $$('.ls-ws-mode', w).forEach(btn => {
      btn.onclick = () => {
        const m = btn.dataset.m;
        const tp = activeTopicChip || ($('#lsInput') && $('#lsInput').value.trim()) || '';
        if (m === 'quiz') makeQuiz(tp);
        else if (m === 'steps') makeGuidedSteps(tp);
        else if (m === 'match') makeMatchGame(tp);
        else if (m === 'mistake') makeSpotMistake(tp);
        else if (m === 'feynman') makeFeynman(tp);
        else if (m === 'cards') makeCards(tp);
      };
    });
    box.appendChild(w);
    box.scrollTop = 0;
    return;
  }
  d.msgs.forEach(m => box.appendChild(msgEl(m)));
  scroll(true);
}

function msgEl(m){
  const row = el('div', 'ls-msg ' + m.role); row.dataset.id = m.id;
  if (m.role === 'user'){
    const b = el('div', 'bubble'); b.dir = 'auto'; b.textContent = m.content; row.appendChild(b); return row;
  }
  if (m.kind === 'quiz'){ row.appendChild(Quiz(m)); return row; }
  if (m.kind === 'cards'){ row.appendChild(Cards(m)); return row; }
  if (m.kind === 'summary'){ row.appendChild(Summary(m)); return row; }
  if (m.kind === 'steps'){ row.appendChild(Steps(m)); return row; }
  if (m.kind === 'match'){ row.appendChild(MatchGame(m)); return row; }
  if (m.kind === 'mistake'){ row.appendChild(SpotMistake(m)); return row; }
  if (m.kind === 'feynman'){ row.appendChild(Feynman(m)); return row; }

  const b = el('div', 'bubble md');
  A.renderMarkdown(b, m.content || '');
  row.appendChild(b);

  const acts = el('div', 'msg-actions ls-study-actions', `
    <button type="button" data-a="quiz" class="ls-act-primary">${L('quizOnThis')}</button>
    <button type="button" data-a="steps">${L('stepsOnThis')}</button>
    <button type="button" data-a="match">${L('matchOnThis')}</button>
    <button type="button" data-a="cards">${L('cardsOnThis')}</button>
    <button type="button" data-a="copy">⧉ ${L('copy')}</button>
    <button type="button" data-a="speak">🔊 ${L('speak')}</button>
  `);
  acts.onclick = e => {
    const x = e.target.closest('button'); if (!x || busy) return;
    const act = x.dataset.a;
    const inferredTopic = getLastTaughtTopicInSubject() || subjName(cur());
    if (act === 'copy') A.copyText(m.content);
    else if (act === 'speak') A.speak(m.content);
    else if (act === 'quiz') makeQuiz(inferredTopic, null, {studyContext: m.content});
    else if (act === 'steps') makeGuidedSteps(inferredTopic, m.content);
    else if (act === 'match') makeMatchGame(inferredTopic, m.content);
    else if (act === 'cards') makeCards(inferredTopic, m.content);
  };
  row.appendChild(acts);
  return row;
}

function push(m){
  const d = sd(cur().id);
  m.id = m.id || A.uid();
  m.ts = Date.now();
  d.msgs.push(m);
  if (d.msgs.length > 120) d.msgs = d.msgs.slice(-120);
  save();
  const box = $('#lsMsgs');
  if (!box) return null;
  const w = $('.ls-welcome-studio', box);
  if (w) w.remove();
  const e = msgEl(m);
  box.appendChild(e);
  scroll(true);
  return e;
}

function scroll(force){
  const b = $('#lsMsgs');
  if (!b) return;
  requestAnimationFrame(() => {
    if (force || b.scrollHeight - b.scrollTop - b.clientHeight < 260){
      b.scrollTo({top: b.scrollHeight, behavior: force ? 'smooth' : 'auto'});
    }
  });
}

function setBusy(v){
  busy = v;
  const s = $('#lsSend');
  if (s) s.classList.toggle('stop', v);
  $$('#lsTools button').forEach(b => b.classList.toggle('dim', v));
}

function tutorSystem(extra){
  const s = cur(), lang = LANGN[LL()];
  return [
    `You are LokiLessons, a warm, encouraging, crystal-clear private tutor made by Lokiz Studios (part of Lokizenith AI). Never mention any other AI company or model.`,
    s.prompt,
    `Always reply in ${lang} (unless the subject requires English examples). Structure your teaching clearly with Markdown headings, bulleted key points, bold key terms, a concrete example or verse/formula breakdown, and a quick memory tip. End with one short check-for-understanding question.`,
    store.hints ? `HINTS MODE IS ON: do NOT give final answers to exercises right away. Guide with one hint at a time and Socratic questions, and let the student try.` : ``,
    extra || ''
  ].filter(Boolean).join('\n');
}

function history(){
  return sd(cur().id).msgs.slice(-14).map(m => {
    if (m.kind === 'quiz') return {role:'assistant', content:`[Quiz "${m.data.title}" — ${m.data.state && m.data.state.done ? 'score ' + m.data.state.score + '/' + m.data.questions.length : 'in progress'}]`};
    if (m.kind === 'cards') return {role:'assistant', content:'[3D Flashcards]'};
    if (m.kind === 'summary') return {role:'assistant', content:`[Summary: ${m.data.title}]`};
    if (m.kind === 'steps') return {role:'assistant', content:`[Guided Step-by-Step Lesson: ${m.data.title}]`};
    if (m.kind === 'match') return {role:'assistant', content:`[Concept Match Game: ${m.data.title}]`};
    if (m.kind === 'mistake') return {role:'assistant', content:`[Spot the Mistake Challenge: ${m.data.title}]`};
    if (m.kind === 'feynman') return {role:'assistant', content:`[Feynman Teach-Back Coach: ${m.data.concept}]`};
    return {role: m.role, content: m.content || ''};
  });
}

function working(text){
  const w = el('div', 'ls-msg assistant');
  const c = el('div', 'ls-working');
  w.appendChild(c);
  const box = $('#lsMsgs');
  if (box) box.appendChild(w);
  scroll(true);
  const work = A.Work(c, {words:{working: L('working'), worked: L('worked')}});
  work.log(text);
  return {w, work};
}

async function ask(text){
  if (busy) return;
  push({role:'user', content: text});
  setBusy(true); ctl = new AbortController();
  const {w, work} = working('…');
  let bubble = null, latest = '', pend = 0;
  const paint = () => {
    pend = 0;
    if (!bubble){
      work.root.remove();
      bubble = el('div', 'bubble md streaming');
      w.appendChild(bubble);
    }
    bubble.innerHTML = A.mdToHtml(latest);
    A.enhance(bubble, null, true);
    scroll();
  };
  try {
    const out = await LZ.chat(
      [{role:'system', content: tutorSystem()}, ...history()],
      {
        tier: A.state.model,
        level: Math.min(A.state.level, 1),
        signal: ctl.signal,
        maxTokens: 2400,
        onStatus: x => work.log(x),
        onToken: (d, full) => {
          latest = full;
          if (!pend) pend = setTimeout(() => requestAnimationFrame(paint), 60);
        }
      }
    );
    clearTimeout(pend); w.remove(); work.done();
    push({role:'assistant', content: out});
  } catch(e){
    clearTimeout(pend); w.remove();
    push({role:'assistant', content: e.name === 'AbortError' ? (latest || '…') : L('err')});
  }
  setBusy(false); ctl = null; renderSubjects(); renderHead();
}

/* =====================================================================
   QUIZ ENGINE — 4 QUESTION TYPES:
   1. 'mc'   (Multiple Choice / רב-ברירה - אמריקאית)
   2. 'tf'   (True or False / נכון או לא נכון)
   3. 'fill' (Fill in the Blank / השלמת משפט)
   4. 'open' (Open Written Question / שאלה פתוחה)
   ===================================================================== */
function normTrueFalseIdx(ans){
  if (ans === 0 || ans === true) return 0;
  if (ans === 1 || ans === false) return 1;
  const s = String(ans ?? '').trim().toLowerCase();
  if (/^(0|true|t|yes|correct|נכון|אמת|כן|צודק|صحيح|صح|نعم)$/i.test(s)) return 0;
  return 1;
}

function normQuiz(j, lang){
  const lg = lang || LL();
  const trueLbl = (STR[lg] || STR.en).trueOpt || 'True';
  const falseLbl = (STR[lg] || STR.en).falseOpt || 'False';
  const raw = (j && (j.questions || j.quiz || j.items)) || [];
  const out = [];
  raw.forEach(q => {
    if (!q || !(q.q || q.question || q.statement)) return;
    let text = String(q.q || q.question || q.statement).trim();
    let rawType = String(q.type || '').trim().toLowerCase();
    let opts = Array.isArray(q.options || q.choices)
      ? (q.options || q.choices).map(o => String(typeof o === 'object' ? (o.text || o.label || '') : o).trim()).filter(Boolean)
      : [];
    let ans = q.answer ?? q.correct ?? q.answerIndex;

    // Detect True/False ('tf')
    const looksLikeTfOpts = opts.length === 2 && opts.every(o => /^(true|false|נכון|לא נכון|שקר|אמת|صحيح|خطأ|صح)$/i.test(o.trim()));
    if (rawType === 'tf' || rawType === 'true_false' || rawType === 'truefalse' || rawType === 'boolean' || typeof ans === 'boolean' || looksLikeTfOpts){
      const tfAns = normTrueFalseIdx(ans);
      out.push({
        type: 'tf',
        q: text,
        options: [trueLbl, falseLbl],
        answer: tfAns,
        explanation: String(q.explanation || ''),
        hint: String(q.hint || '')
      });
      return;
    }

    // Detect Fill-in-the-blank ('fill')
    if (rawType === 'fill' || rawType === 'fill_blank' || rawType === 'blank' || rawType === 'cloze' || (/_{3,}|\[\s*\.\.\.\s*\]/.test(text) && opts.length < 2)){
      if (ans == null || !String(ans).trim()) return;
      const cleanAns = String(ans).trim();
      if (!/_{3,}/.test(text)){
        // If the LLM forgot to put _____ in the sentence, replace the answer occurrence or append blank indicator
        const escAns = cleanAns.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rx = new RegExp(escAns, 'i');
        if (rx.test(text) && text.length > cleanAns.length + 6){
          text = text.replace(rx, '_____');
        } else {
          text = text.replace(/[?.!]+$/, '') + ': _____';
        }
      }
      out.push({
        type: 'fill',
        q: text,
        answer: cleanAns,
        explanation: String(q.explanation || ''),
        hint: String(q.hint || '')
      });
      return;
    }

    // Multiple Choice ('mc') vs Open ('open')
    const type = (rawType === 'open' || opts.length < 2) ? 'open' : 'mc';
    if (type === 'mc'){
      if (typeof ans === 'string' && /^\d+$/.test(ans.trim())) ans = +ans;
      if (typeof ans === 'string'){
        const a = ans.trim();
        let k = opts.findIndex(o => o === a || o.replace(/^[A-Dא-ד][.)]\s*/, '') === a.replace(/^[A-Dא-ד][.)]\s*/, ''));
        if (k < 0 && /^[A-D]$/i.test(a)) k = a.toUpperCase().charCodeAt(0) - 65;
        if (k < 0 && /^[א-ד]$/.test(a)) k = 'אבגד'.indexOf(a);
        ans = k;
      }
      if (typeof ans !== 'number' || ans < 0 || ans >= opts.length) return;
      opts = opts.map(o => o.replace(/^[A-Dא-ד][.)]\s+/, ''));
      out.push({
        type: 'mc',
        q: text,
        options: opts.slice(0, 6),
        answer: ans,
        explanation: String(q.explanation || ''),
        hint: String(q.hint || ''),
        distractors: Array.isArray(q.distractors) ? q.distractors.map(String) : []
      });
    } else {
      if (ans == null || !String(ans).trim()) return;
      out.push({
        type: 'open',
        q: text,
        answer: String(ans).trim(),
        explanation: String(q.explanation || ''),
        hint: String(q.hint || '')
      });
    }
  });
  return out;
}

async function makeQuiz(topic, fromQuestions, opts = {}){
  if (busy) return;
  const s = cur();
  const n = Math.max(5, Math.min(20, +(opts.n || store.qLen || S().quizLength || 8)));
  const diff = opts.diff || S().quizDifficulty || 'medium';
  const mode = opts.mode || store.qType || 'all';
  if (fromQuestions){
    push({role:'assistant', kind:'quiz', data:{title: L('retryWrong').replace(/^\S+\s/, ''), questions: fromQuestions, state:{i:0, answers:[], drafts:[]}}});
    return;
  }
  const effectiveTopic = topic || getLastTaughtTopicInSubject() || subjName(s);
  const studyContext = opts.studyContext || getRecentSubjectStudyContext();
  let mcCount, tfCount, fillCount, openCount;
  if (mode === 'mc'){ mcCount = n; tfCount = 0; fillCount = 0; openCount = 0; }
  else if (mode === 'tf'){ mcCount = 0; tfCount = n; fillCount = 0; openCount = 0; }
  else if (mode === 'fill'){ mcCount = 0; tfCount = 0; fillCount = n; openCount = 0; }
  else if (mode === 'open'){ mcCount = 0; tfCount = 0; fillCount = 0; openCount = n; }

  push({role:'user', content: '📝 ' + L('quiz') + (effectiveTopic ? ': ' + effectiveTopic : '')});
  setBusy(true); ctl = new AbortController();
  const {w, work} = working(L('makingQuiz'));
  try {
    const q = await genQuiz({
      topic: effectiveTopic,
      n,
      diff,
      lang: LL(),
      mcCount,
      tfCount,
      fillCount,
      openCount,
      tier: A.state.model,
      signal: ctl.signal,
      log: x => work.log(x),
      subjectPrompt: s.prompt,
      studyContext
    });
    w.remove(); work.done();
    if (!q.questions || q.questions.length < 3) throw new Error('few');
    push({role:'assistant', kind:'quiz', data:{title: q.title || (L('quiz') + ' · ' + effectiveTopic), topic: effectiveTopic, questions: q.questions.slice(0, n), state:{i:0, answers:[], drafts:[]}}});
  } catch(e){
    w.remove();
    if (e.name !== 'AbortError') push({role:'assistant', content: e.message === 'few' ? L('minQ') : L('err')});
  }
  setBusy(false); ctl = null;
}

async function verifyQuiz(qs){
  return Array.isArray(qs) ? qs : [];
}

/* quiz generation for any topic (5-20 questions across 4 question types: mc, tf, fill, open) */
async function genQuiz({topic, n = 8, diff = 'medium', lang = 'en', tier = 'fera', mcCount, tfCount, fillCount, openCount, subjectPrompt = '', studyContext = '', signal, log = () => {}}){
  n = Math.max(5, Math.min(20, Math.round(+n || 8)));
  const hasExplicitCounts = [mcCount, tfCount, fillCount, openCount].some(v => typeof v === 'number');
  let totalMc = 0, totalTf = 0, totalFill = 0, totalOpen = 0;

  if (hasExplicitCounts){
    totalMc = Math.max(0, +(mcCount || 0));
    totalTf = Math.max(0, +(tfCount || 0));
    totalFill = Math.max(0, +(fillCount || 0));
    totalOpen = Math.max(0, +(openCount || 0));
    // If legacy caller only passed mcCount + openCount without tfCount/fillCount and both > 0, check if tfCount was omitted:
    if (tfCount === undefined && fillCount === undefined && totalMc > 0 && totalOpen > 0 && totalMc + totalOpen === n){
      totalTf = Math.max(1, Math.round(n * 0.2));
      totalFill = Math.max(1, Math.round(n * 0.2));
      totalOpen = Math.max(1, Math.round(n * 0.25));
      totalMc = Math.max(1, n - totalTf - totalFill - totalOpen);
    }
  } else {
    totalTf = Math.max(1, Math.round(n * 0.2));
    totalFill = Math.max(1, Math.round(n * 0.2));
    totalOpen = Math.max(1, Math.round(n * 0.25));
    totalMc = Math.max(1, n - totalTf - totalFill - totalOpen);
  }

  const ctxBlock = studyContext
    ? `\nCONVERSATION STUDY MATERIAL (The student just studied this material — base the test questions directly on the facts, chapters, verses, concepts, and explanations from this material):\n${String(studyContext).slice(0, 4200)}\n`
    : '';

  const sys = (cnt, mcN, tfN, fillN, openN, part) => `You are an expert teacher creating an interactive test with 4 question types about the student's subject.
${subjectPrompt ? subjectPrompt + '\n' : ''}${ctxBlock}Return ONLY valid JSON matching this exact structure:
{"title":"short test title","questions":[
  {"type":"mc","q":"clear multiple-choice question","options":["Option A","Option B","Option C","Option D"],"answer":0,"hint":"short helpful hint","explanation":"concise explanation of why the correct option is right"},
  {"type":"tf","q":"clear factual statement that is unambiguously True or False","answer":0,"hint":"short helpful hint","explanation":"concise explanation of why the statement is true (answer:0) or false (answer:1)"},
  {"type":"fill","q":"complete sentence with one key missing term replaced by _____","answer":"exact missing word or short term (1-3 words)","hint":"short clue about the missing term","explanation":"brief explanation of the completed sentence"},
  {"type":"open","q":"open-ended question where the student types a short written answer","answer":"ideal model answer (1-2 sentences or key terms)","hint":"short helpful hint","explanation":"key points required for a full-credit answer"}
]}
Generate EXACTLY ${cnt} distinct questions with this breakdown:
- ${mcN} multiple-choice questions ("type":"mc", 4 options, 0-based "answer" index 0..3)
- ${tfN} true/false statement questions ("type":"tf", "answer": 0 for True/נכון or 1 for False/לא נכון)
- ${fillN} fill-in-the-blank sentence questions ("type":"fill", sentence MUST contain "_____" for the missing key term, and "answer" is the exact missing 1-3 word term)
- ${openN} open written-answer questions ("type":"open", "answer" is the model explanation).${part}
Difficulty: ${diff}. Every question must be factually accurate, clear, and directly about "${topic}"${studyContext ? ' and the conversation study material above' : ''}. Write all text in ${LANGN[lang] || 'English'}.`;

  const K = n <= 8 ? 1 : n <= 14 ? 2 : 3;
  const sizes = [], mcs = [], tfs = [], fills = [], opens = [];
  for (let k = 0; k < K; k++) sizes.push(Math.floor(n / K) + (k < n % K ? 1 : 0));
  let mcRem = totalMc, tfRem = totalTf, fillRem = totalFill, openRem = totalOpen;
  sizes.forEach((c, k) => {
    if (k === K - 1){
      mcs.push(mcRem); tfs.push(tfRem); fills.push(fillRem); opens.push(openRem);
    } else {
      const m = Math.min(c, Math.min(mcRem, Math.round(c * (totalMc / n))));
      const tf = Math.min(c - m, Math.min(tfRem, Math.max(totalTf > 0 ? 1 : 0, Math.round(c * (totalTf / n)))));
      const fl = Math.min(c - m - tf, Math.min(fillRem, Math.max(totalFill > 0 ? 1 : 0, Math.round(c * (totalFill / n)))));
      const op = Math.min(c - m - tf - fl, openRem);
      mcs.push(m); tfs.push(tf); fills.push(fl); opens.push(op);
      mcRem -= m; tfRem -= tf; fillRem -= fl; openRem -= op;
    }
  });

  const FOCUS = [
    ' Focus on core concepts, key facts, verses/formulas, and foundational definitions.',
    ' Focus on practical application, mechanisms, cause-and-effect, and deeper analysis.',
    ' Focus on synthesis, comparisons, problem solving, and common misconceptions.'
  ];
  const parts = await Promise.all(sizes.map((c, k) =>
    LZ.chatJSON(
      [{role:'system', content: sys(c, mcs[k], tfs[k], fills[k], opens[k], FOCUS[k % FOCUS.length])}, {role:'user', content: `Subject: ${topic} (Part ${k + 1} of ${K})`}],
      {tier, maxTokens: 2600, signal, lane: k, onStatus: log}
    ).catch(e => { if (e && e.name === 'AbortError') throw e; return null; })
  ));

  let qs = [], title = '';
  const addUnique = (arr) => {
    arr.forEach(g => {
      const key = String(g.q || '').trim().toLowerCase();
      if (key && !qs.some(x => String(x.q || '').trim().toLowerCase() === key)) qs.push(g);
    });
  };
  parts.forEach(j => {
    if (!j) return;
    const got = normQuiz(j, lang);
    if (got.length) log(got.length + ' ✓');
    addUnique(got);
    if (j.title && !title) title = j.title;
  });

  if (qs.length < n){
    const need = n - qs.length;
    const haveMc = qs.filter(q => q.type === 'mc').length;
    const haveTf = qs.filter(q => q.type === 'tf').length;
    const haveFill = qs.filter(q => q.type === 'fill').length;
    const needTf = Math.max(0, Math.min(need, totalTf - haveTf));
    const needFill = Math.max(0, Math.min(need - needTf, totalFill - haveFill));
    const needMc = Math.max(0, Math.min(need - needTf - needFill, totalMc - haveMc));
    const needOpen = Math.max(0, need - needTf - needFill - needMc);
    const j = await LZ.chatJSON(
      [{role:'system', content: sys(need, needMc, needTf, needFill, needOpen, ' Do not repeat earlier questions.')}, {role:'user', content: `${topic} — generate ${need} additional unique questions`}],
      {tier, maxTokens: 2600, signal, onStatus: log}
    ).catch(() => null);
    if (j){
      addUnique(normQuiz(j, lang));
      title = title || j.title;
    }
  }
  return {title: title || topic, topic, questions: qs.slice(0, n)};
}

function gradeFillAnswerFallback(modelAns, studentAns){
  const norm = s => String(s || '').trim().toLowerCase().replace(/[\u0591-\u05C7\u064B-\u065F]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const given = norm(studentAns);
  const target = norm(modelAns);
  if (!given) return {correct: false, score: 0, decisive: true};
  if (!target) return {correct: true, score: 1, decisive: true};
  if (given === target) return {correct: true, score: 1, decisive: true};
  const stripPrefix = s => s.replace(/^(?:the|a|an|אל)\s+/i, '').replace(/^[הובלכמש](?=[\u05D0-\u05EA]{2,})/, '').trim();
  const sg = stripPrefix(given), st = stripPrefix(target);
  if (sg === st) return {correct: true, score: 1, decisive: true};
  if ((st.length >= 3 && sg.includes(st)) || (sg.length >= 3 && st.includes(sg) && sg.length >= st.length * 0.6)){
    return {correct: true, score: 1, decisive: true};
  }
  // Check 1-character typo tolerance (Levenshtein distance <= 1 for words >= 4 chars)
  if (sg.length >= 4 && st.length >= 4 && Math.abs(sg.length - st.length) <= 1){
    let diff = 0, i = 0, j = 0;
    while (i < sg.length && j < st.length){
      if (sg[i] === st[j]){ i++; j++; }
      else {
        diff++;
        if (diff > 1) break;
        if (sg.length > st.length) i++;
        else if (st.length > sg.length) j++;
        else { i++; j++; }
      }
    }
    if (diff + (sg.length - i) + (st.length - j) <= 1){
      return {correct: true, score: 0.95, decisive: true};
    }
  }
  return gradeOpenAnswerFallback(modelAns, studentAns);
}

function gradeOpenAnswerFallback(modelAns, studentAns){
  const norm = s => String(s || '').trim().toLowerCase().replace(/[\u0591-\u05C7\u064B-\u065F]/g, '');
  const given = norm(studentAns);
  const target = norm(modelAns);
  if (!given) return {correct: false, score: 0, decisive: true};
  if (!target) return {correct: true, score: 1, decisive: true};
  if (given === target || given.includes(target) || (given.length >= 4 && target.includes(given))){
    return {correct: true, score: 1, decisive: true};
  }
  const stop = new Set(['the','and','for','that','with','this','from','are','was','were','because','into','have','has','had','של','את','על','עם','או','כי','הוא','היא','הם','הן','זה','זו','זאת','אשר','כמו','לא','כן','אל','מן','כל','גם','רק','בין','אבל']);
  const stripWord = w => w.replace(/^[הובלכמש](?=[\u05D0-\u05EA]{3,})/, '').replace(/(?:ים|ות|ה|ת|ן|ם)$/, '');
  const tok = s => s.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length >= 2 && !stop.has(w));
  const tks = tok(target);
  const gTks = tok(given);
  if (!tks.length) return {correct: given.length >= 2, score: given.length >= 2 ? 1 : 0, decisive: true};
  if (!gTks.length) return {correct: false, score: 0, decisive: true};
  const gTxt = ' ' + gTks.join(' ') + ' ';
  const gRoots = new Set(gTks.map(stripWord));
  let hits = 0;
  tks.forEach(w => {
    const rw = stripWord(w);
    const stem = w.length > 4 ? w.slice(0, Math.ceil(w.length * 0.72)) : w;
    if (gTxt.includes(' ' + w + ' ') || given.includes(stem) || (rw.length >= 2 && gRoots.has(rw))){
      hits++;
    }
  });
  const ratio = hits / tks.length;
  const ok = ratio >= 0.42 || (hits >= 2 && tks.length >= 4) || (hits >= 1 && tks.length <= 2 && given.length >= 3);
  const decisive = ok || (hits === 0 && given.length < 15);
  return {correct: ok, score: ok ? Math.max(0.8, ratio) : ratio, decisive};
}

async function fastChatJSONRace(messages, opts, maxWaitMs = 1600){
  const ctl = new AbortController();
  let timer = 0;
  try {
    return await Promise.race([
      LZ.chatJSON(messages, Object.assign({}, opts, {
        level: 0,
        minWriteMs: 0,
        fastFail: true,
        timeout: maxWaitMs,
        signal: ctl.signal,
        _noConsume: true
      })),
      new Promise((_, rej) => {
        timer = setTimeout(() => {
          try { ctl.abort(); } catch(_){}
          rej(new Error('fast_grade_timeout'));
        }, maxWaitMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function letterOf(i, lg){ lg = lg || LL(); return lg === 'he' ? 'אבגדהו'[i] : lg === 'ar' ? 'أبجدهو'[i] : 'ABCDEF'[i]; }

function lessonEnv(){
  return {
    lang: LL(),
    save,
    scroll,
    tier: () => A.state.model,
    finish(st, d, qs){
      if (!st.recorded){
        st.recorded = true;
        sd(cur().id).quizzes.push({score: st.score, total: qs.length, ts: Date.now(), title: d.title});
      }
      save(); renderSubjects(); renderHead();
    },
    retry(qs){ makeQuiz('', qs); },
    newQuiz(topic){ makeQuiz(topic || ''); }
  };
}

function Quiz(m, env){
  env = env || lessonEnv();
  const LL = () => env.lang, L = k => ((STR[env.lang] || STR.en)[k] ?? STR.en[k] ?? k), letter = i => letterOf(i, env.lang), save = env.save, scroll = env.scroll || (() => {});
  const isHe = env.lang === 'he', isAr = env.lang === 'ar';
  const d = m.data, qs = d.questions, st = d.state || (d.state = {i:0, answers:[], drafts:[]});
  if (!Array.isArray(st.answers)) st.answers = [];
  if (!Array.isArray(st.drafts)) st.drafts = [];
  const box = el('div', 'quiz');
  const persist = (debounced = false) => save(debounced);
  const hasAnswerAt = (k) => {
    if (st.answers[k] && st.answers[k].given != null && String(st.answers[k].given).trim() !== '') return true;
    const dr = st.drafts[k];
    return dr !== undefined && dr !== null && String(dr).trim() !== '';
  };
  const answeredCount = () => qs.filter((_, k) => hasAnswerAt(k)).length;
  const mcTotal = qs.filter(q => q.type === 'mc').length;
  const tfTotal = qs.filter(q => q.type === 'tf').length;
  const fillTotal = qs.filter(q => q.type === 'fill').length;
  const openTotal = qs.filter(q => q.type === 'open').length;

  function typeTagOf(type){
    if (type === 'mc') return L('mc');
    if (type === 'tf') return L('tf');
    if (type === 'fill') return L('fill');
    return L('open');
  }

  function header(){
    const parts = [];
    if (mcTotal) parts.push(isHe ? `${mcTotal} אמריקאיות` : isAr ? `${mcTotal} اختيار` : `${mcTotal} MC`);
    if (tfTotal) parts.push(isHe ? `${tfTotal} נכון/לא נכון` : isAr ? `${tfTotal} صح/خطأ` : `${tfTotal} True/False`);
    if (fillTotal) parts.push(isHe ? `${fillTotal} השלמת משפט` : isAr ? `${fillTotal} فراغ` : `${fillTotal} Fill-Blank`);
    if (openTotal) parts.push(isHe ? `${openTotal} פתוחות` : isAr ? `${openTotal} مفتوحة` : `${openTotal} Open`);
    const mixBadge = parts.join(' · ');
    return `<div class="qz-head"><span class="qz-ic">📝</span><b dir="auto">${esc(d.title)}</b><span class="qz-mix-pill">${esc(mixBadge)}</span><span class="qz-count">${st.done ? '' : L('question') + ' ' + (st.i + 1) + ' ' + L('of') + ' ' + qs.length}</span></div>
    <div class="qz-dots" role="tablist">${qs.map((q, k) => {
      const a = st.answers[k];
      const cls = a ? (a.correct ? 'ok' : 'bad') : (k === st.i && !st.done ? 'cur' : (hasAnswerAt(k) ? 'ok' : ''));
      return `<i class="${cls}" data-qi="${k}" title="${L('question')} ${k + 1} (${esc(typeTagOf(q.type))})" style="cursor:pointer"></i>`;
    }).join('')}</div>`;
  }

  function bindDots(){
    $$('.qz-dots i[data-qi]', box).forEach(dot => {
      dot.onclick = () => {
        if (st.done) return;
        const targetIdx = +dot.dataset.qi;
        if (Number.isFinite(targetIdx) && targetIdx >= 0 && targetIdx < qs.length && targetIdx !== st.i){
          st.i = targetIdx;
          persist();
          draw(true);
        }
      };
    });
  }

  async function gradeSingleQuestion(idx){
    const q = qs[idx];
    const given = st.drafts[idx];
    if (q.type === 'mc' || q.type === 'tf'){
      if (given == null || given === '') return false;
      st.answers[idx] = {given: +given, correct: +given === +q.answer};
      return true;
    } else if (q.type === 'fill'){
      const textGiven = String(given ?? '').trim();
      if (!textGiven) return false;
      const det = gradeFillAnswerFallback(q.answer, textGiven);
      if (det.correct || det.decisive){
        st.answers[idx] = {given: textGiven, correct: det.correct, feedback: ''};
        return true;
      }
      let g = null;
      try {
        g = await fastChatJSONRace([
          {role:'system', content:`Grade fill-in-the-blank answer fairly (accept synonyms/typos). Return ONLY JSON {"correct":true|false,"score":0..1,"feedback":"1 short sentence in ${LANGN[LL()]}"}`},
          {role:'user', content:`Sentence: ${q.q}\nExpected: ${q.answer}\nStudent: ${textGiven}`}
        ], {tier: 'fera', maxTokens: 160}, 1500);
      } catch(_){}
      const ok = g && (typeof g.correct === 'boolean' || g.score != null)
        ? (g.correct === true || g.correct === 'true' || +g.score >= 0.65)
        : det.correct;
      st.answers[idx] = {given: textGiven, correct: ok, feedback: g && g.feedback ? String(g.feedback) : ''};
      return true;
    } else {
      const textGiven = String(given ?? '').trim();
      if (!textGiven) return false;
      const fb = gradeOpenAnswerFallback(q.answer, textGiven);
      if (fb.correct || fb.decisive){
        st.answers[idx] = {
          given: textGiven,
          correct: fb.correct,
          feedback: fb.correct
            ? (isHe ? 'תשובה מדויקת שמכסה את נקודות המפתח!' : isAr ? 'إجابة دقيقة تغطي النقاط الأساسية!' : 'Accurate answer covering the key points!')
            : ''
        };
        return true;
      }
      let g = null;
      try {
        g = await fastChatJSONRace([
          {role:'system', content:`Grade student's short written answer fairly (accept equivalent wording & synonyms). Return ONLY JSON {"correct":true|false,"score":0..1,"feedback":"1 short sentence in ${LANGN[LL()]}"}`},
          {role:'user', content:`Q: ${q.q}\nModel: ${q.answer}\nStudent: ${textGiven}`}
        ], {tier: 'fera', maxTokens: 200}, 1600);
      } catch(_){}
      const ok = g && (typeof g.correct === 'boolean' || g.score != null)
        ? (g.correct === true || g.correct === 'true' || +g.score >= 0.65)
        : fb.correct;
      st.answers[idx] = {given: textGiven, correct: ok, feedback: g && g.feedback ? String(g.feedback) : ''};
      return true;
    }
  }

  async function gradeAllAndFinish(triggerBtn){
    if (triggerBtn){
      triggerBtn.disabled = true;
      triggerBtn.textContent = isHe ? '⚡ בודק תשובות מיד…' : isAr ? '⚡ جارٍ فحص الإجابات فورًا…' : '⚡ Checking answers instantly…';
    }
    const openToGrade = [];
    qs.forEach((q, k) => {
      if (st.answers[k]) return;
      const given = st.drafts[k];
      if (q.type === 'mc' || q.type === 'tf'){
        const hasChoice = given !== undefined && given !== null && given !== '';
        st.answers[k] = {given: hasChoice ? +given : -1, correct: hasChoice && +given === +q.answer};
      } else if (q.type === 'fill'){
        const textGiven = String(given ?? '').trim();
        if (!textGiven){
          st.answers[k] = {given: '', correct: false, feedback: isHe ? 'לא הוזנה מילה להשלמת המשפט.' : 'No word was entered for the blank.'};
        } else {
          const det = gradeFillAnswerFallback(q.answer, textGiven);
          if (det.correct || det.decisive){
            st.answers[k] = {given: textGiven, correct: det.correct, feedback: ''};
          } else {
            openToGrade.push({index: k, type: 'fill', question: q.q, modelAnswer: q.answer, studentAnswer: textGiven});
          }
        }
      } else {
        const textGiven = String(given ?? '').trim();
        if (!textGiven){
          st.answers[k] = {given: '', correct: false, feedback: isHe ? 'לא הוזנה תשובה לשאלה זו.' : 'No answer was entered for this question.'};
        } else {
          const det = gradeOpenAnswerFallback(q.answer, textGiven);
          if (det.correct || det.decisive){
            st.answers[k] = {
              given: textGiven,
              correct: det.correct,
              feedback: det.correct
                ? (isHe ? 'תשובה נכונה ומדויקת!' : isAr ? 'إجابة صحيحة ودقيقة!' : 'Correct and accurate answer!')
                : ''
            };
          } else {
            openToGrade.push({index: k, type: 'open', question: q.q, modelAnswer: q.answer, studentAnswer: textGiven});
          }
        }
      }
    });

    if (openToGrade.length > 0){
      let batchGrades = null;
      try {
        const res = await fastChatJSONRace([
          {
            role: 'system',
            content: `Grade each student answer fairly against modelAnswer. Return ONLY JSON: {"grades":[{"index":<number>,"correct":true|false,"score":0..1,"feedback":"1 short sentence in ${LANGN[LL()]}"}]}`
          },
          {role: 'user', content: JSON.stringify(openToGrade)}
        ], {tier: 'fera', maxTokens: 600}, 1700);
        if (res && Array.isArray(res.grades)) batchGrades = res.grades;
      } catch(_){}

      openToGrade.forEach(item => {
        const matched = Array.isArray(batchGrades) ? batchGrades.find(g => g && +g.index === item.index) : null;
        const fb = item.type === 'fill'
          ? gradeFillAnswerFallback(item.modelAnswer, item.studentAnswer)
          : gradeOpenAnswerFallback(item.modelAnswer, item.studentAnswer);
        const ok = matched && (typeof matched.correct === 'boolean' || matched.score != null)
          ? (matched.correct === true || matched.correct === 'true' || +matched.score >= 0.65)
          : fb.correct;
        st.answers[item.index] = {
          given: item.studentAnswer,
          correct: ok,
          feedback: (matched && matched.feedback) ? String(matched.feedback) : ''
        };
      });
    }

    st.done = true;
    finish();
    persist();
    draw(true);
    A.sound && A.sound('done');
  }

  function formatFillSentenceHtml(qText, filledWord){
    const safe = esc(qText);
    const pillText = filledWord ? esc(filledWord) : '_____';
    const cls = filledWord ? 'qz-blank-slot filled' : 'qz-blank-slot';
    if (/_{3,}/.test(safe)){
      return safe.replace(/_{3,}/g, `<span class="${cls}" id="qzBlankLiveSlot">${pillText}</span>`);
    }
    return `${safe} <span class="${cls}" id="qzBlankLiveSlot">${pillText}</span>`;
  }

  function draw(dirn){
    if (st.done) return drawScore();
    const q = qs[st.i], a = st.answers[st.i];
    const curDraft = a ? a.given : st.drafts[st.i];
    const isLast = st.i === qs.length - 1;
    const prevLbl = isHe ? '‹ הקודם' : isAr ? '‹ السابق' : '‹ Prev';
    const checkAllLbl = isHe ? '✓ סיום ובדיקת המבחן' : isAr ? '✓ إنهاء وفحص الاختبار' : '✓ Finish & Check Answers';

    let typeBadgeHtml = '';
    if (q.type === 'mc') typeBadgeHtml = `<div class="qz-type qz-type-mc">🔘 ${L('mc')}</div>`;
    else if (q.type === 'tf') typeBadgeHtml = `<div class="qz-type qz-type-tf">⚖️ ${L('tf')}</div>`;
    else if (q.type === 'fill') typeBadgeHtml = `<div class="qz-type qz-type-fill">🧩 ${L('fill')}</div>`;
    else typeBadgeHtml = `<div class="qz-type qz-type-open">✍️ ${L('open')}</div>`;

    let bodyHtml = '';
    if (q.type === 'mc'){
      const opts = Array.isArray(q.options) ? q.options : [];
      bodyHtml = `<div class="qz-opts">${opts.map((o, k) => `<button type="button" class="q-opt${curDraft === k ? ' sel' : ''}" data-k="${k}" dir="auto"><span class="q-l">${letter(k)}</span><span class="q-t"></span></button>`).join('')}</div>`;
    } else if (q.type === 'tf'){
      const opts = Array.isArray(q.options) && q.options.length === 2 ? q.options : [L('trueOpt'), L('falseOpt')];
      bodyHtml = `<div class="qz-opts qz-tf-grid">
        <button type="button" class="q-opt q-tf-opt q-tf-true${curDraft === 0 ? ' sel' : ''}" data-k="0" dir="auto">
          <span class="q-tf-ic">✓</span>
          <span class="q-t">${esc(opts[0])}</span>
        </button>
        <button type="button" class="q-opt q-tf-opt q-tf-false${curDraft === 1 ? ' sel' : ''}" data-k="1" dir="auto">
          <span class="q-tf-ic">✗</span>
          <span class="q-t">${esc(opts[1])}</span>
        </button>
      </div>`;
    } else if (q.type === 'fill'){
      const ansStr = String(q.answer || '').trim();
      const firstChar = ansStr.charAt(0);
      const charLen = ansStr.replace(/\s+/g, '').length;
      const clueTxt = isHe ? `אורך: ${charLen} אותיות · מתחיל באות "${firstChar}"` : `Length: ${charLen} letters · Starts with "${firstChar}"`;
      bodyHtml = `<div class="qz-fill-wrap">
        <div class="qz-fill-input-row">
          <span class="qz-fill-ic">🧩</span>
          <input type="text" class="qz-fill" dir="auto" autocomplete="off" placeholder="${esc(L('fillPlaceholder'))}">
          <button type="button" class="btn-ghost qz-fill-clue-btn" title="${esc(clueTxt)}">🔤 ${L('letterHint')}</button>
        </div>
        <div class="qz-fill-clue" id="qzFillClue" hidden>🔤 ${esc(clueTxt)}</div>
      </div>`;
    } else {
      bodyHtml = `<textarea class="qz-open" dir="auto" rows="3" placeholder="${esc(L('typeAnswer'))}"></textarea>`;
    }

    box.innerHTML = header() + `<div class="qz-card ${dirn ? 'in' : ''}">
      ${typeBadgeHtml}
      <div class="qz-q md" dir="auto"></div>
      ${bodyHtml}
      <div class="qz-hint" hidden></div>
      <div class="qz-result" hidden></div>
      <div class="qz-foot" style="flex-wrap:wrap;gap:8px">
        <div style="display:flex;gap:6px;align-items:center">
          ${st.i > 0 ? `<button type="button" class="btn-ghost qz-prev">${prevLbl}</button>` : ''}
          ${q.hint ? `<button type="button" class="btn-ghost qz-hbtn">💡 ${L('hint')}</button>` : ''}
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-inline-start:auto">
          <button type="button" class="btn-ghost qz-check" ${a ? 'hidden' : ''}>${L('check')}</button>
          ${!isLast ? `<button type="button" class="btn-primary qz-next">${L('next')} ›</button>` : ''}
          ${(isLast || answeredCount() >= qs.length) ? `<button type="button" class="btn-primary qz-finish-all">${checkAllLbl}</button>` : ''}
        </div>
      </div>
    </div>`;

    bindDots();
    const qEl = $('.qz-q', box);
    if (q.type === 'fill'){
      qEl.innerHTML = formatFillSentenceHtml(q.q, curDraft != null ? String(curDraft) : '');
    } else {
      A.renderMarkdown(qEl, q.q);
    }

    let sel = (curDraft !== undefined && curDraft !== null) ? curDraft : null;

    if (q.type === 'mc' || q.type === 'tf'){
      $$('.q-opt', box).forEach((b, k) => {
        if (q.type === 'mc' && q.options && q.options[k] != null){
          $('.q-t', b).textContent = q.options[k];
        }
        b.style.animationDelay = k * 40 + 'ms';
        b.onclick = () => {
          if (st.answers[st.i]) return;
          sel = k;
          st.drafts[st.i] = k;
          persist(true);
          $$('.q-opt', box).forEach(x => x.classList.toggle('sel', x === b));
        };
      });
    } else if (q.type === 'fill'){
      const inp = $('.qz-fill', box);
      if (sel != null) inp.value = String(sel);
      if (a) inp.disabled = true;
      inp.oninput = () => {
        st.drafts[st.i] = inp.value;
        persist(true);
        const slot = $('#qzBlankLiveSlot', box);
        if (slot){
          const v = inp.value.trim();
          slot.textContent = v || '_____';
          slot.classList.toggle('filled', !!v);
        }
      };
      const clueBtn = $('.qz-fill-clue-btn', box);
      const clueBox = $('#qzFillClue', box);
      if (clueBtn && clueBox){
        clueBtn.onclick = () => { clueBox.hidden = !clueBox.hidden; };
      }
    } else {
      const ta = $('.qz-open', box);
      if (sel != null) ta.value = String(sel);
      if (a) ta.disabled = true;
      ta.oninput = () => {
        st.drafts[st.i] = ta.value;
        persist(true);
      };
    }

    const prevBtn = $('.qz-prev', box);
    if (prevBtn) prevBtn.onclick = () => { if (st.i > 0){ st.i--; persist(); draw(true); } };

    const hb = $('.qz-hbtn', box);
    if (hb) hb.onclick = () => { const h = $('.qz-hint', box); h.hidden = false; h.textContent = '💡 ' + q.hint; hb.disabled = true; };

    const readCurrentInput = () => {
      if (q.type === 'mc' || q.type === 'tf'){
        if (sel == null || sel === ''){
          $('.qz-opts', box).classList.add('shake');
          setTimeout(() => $('.qz-opts', box) && $('.qz-opts', box).classList.remove('shake'), 500);
          return null;
        }
        st.drafts[st.i] = +sel;
        return +sel;
      } else if (q.type === 'fill'){
        const inp = $('.qz-fill', box);
        const given = inp ? inp.value.trim() : '';
        if (!given){ if (inp) inp.focus(); return null; }
        st.drafts[st.i] = given;
        return given;
      } else {
        const ta = $('.qz-open', box);
        const given = ta ? ta.value.trim() : '';
        if (!given){ if (ta) ta.focus(); return null; }
        st.drafts[st.i] = given;
        return given;
      }
    };

    const checkBtn = $('.qz-check', box);
    if (checkBtn) checkBtn.onclick = async () => {
      const val = readCurrentInput();
      if (val === null) return;
      if (q.type === 'open' || q.type === 'fill'){
        checkBtn.disabled = true;
        checkBtn.textContent = L('grading');
        const inp = $('.qz-open, .qz-fill', box);
        if (inp) inp.disabled = true;
      }
      await gradeSingleQuestion(st.i);
      persist();
      showResult();
      A.sound && A.sound(st.answers[st.i].correct ? 'done' : 'error');
    };

    const nextBtn = $('.qz-next', box);
    if (nextBtn) nextBtn.onclick = () => {
      if (!st.answers[st.i]){
        const val = readCurrentInput();
        if (val === null) return;
      }
      st.i = Math.min(qs.length - 1, st.i + 1);
      persist();
      draw(true);
    };

    const finBtn = $('.qz-finish-all', box);
    if (finBtn) finBtn.onclick = async () => {
      if (!st.answers[st.i] && !hasAnswerAt(st.i)){
        const val = readCurrentInput();
        if (val === null) return;
      }
      await gradeAllAndFinish(finBtn);
    };

    if (a) showResult(true);
  }

  function showResult(silent){
    const q = qs[st.i], a = st.answers[st.i];
    if (!a) return;
    const r = $('.qz-result', box); r.hidden = false; r.className = 'qz-result ' + (a.correct ? 'ok' : 'bad') + (silent ? '' : ' pop');
    let html = `<b>${a.correct ? L('correct') : L('wrong')}</b>`;
    if (q.type === 'mc'){
      $$('.q-opt', box).forEach((b, k) => { b.disabled = true; b.classList.toggle('right', k === q.answer); b.classList.toggle('wrongpick', k === a.given && !a.correct); b.classList.toggle('sel', k === a.given); });
      if (!a.correct && q.options && q.options[q.answer] != null){
        html += `<div>${L('rightAnswer')} <b dir="auto">${esc(letter(q.answer) + '. ' + q.options[q.answer])}</b></div>`;
        const why = q.distractors && q.distractors[a.given];
        if (why) html += `<div dir="auto">✗ ${esc(why)}</div>`;
      }
    } else if (q.type === 'tf'){
      const opts = Array.isArray(q.options) && q.options.length === 2 ? q.options : [L('trueOpt'), L('falseOpt')];
      $$('.q-opt', box).forEach((b, k) => { b.disabled = true; b.classList.toggle('right', k === q.answer); b.classList.toggle('wrongpick', k === a.given && !a.correct); b.classList.toggle('sel', k === a.given); });
      if (!a.correct){
        html += `<div>${L('rightAnswer')} <b dir="auto">${esc(opts[q.answer] || '')}</b></div>`;
      }
    } else {
      if (a.feedback) html += `<div dir="auto">${esc(a.feedback)}</div>`;
      if (!a.correct) html += `<div>${L('rightAnswer')} <b dir="auto">${esc(String(q.answer || ''))}</b></div>`;
    }
    if (q.explanation) html += `<div class="qz-exp" dir="auto"><b>${L('why')}</b> ${esc(q.explanation)}</div>`;
    r.innerHTML = html;
    const chk = $('.qz-check', box); if (chk) chk.hidden = true;
    $$('.qz-dots i', box).forEach((d2, k) => { d2.className = st.answers[k] ? (st.answers[k].correct ? 'ok' : 'bad') : k === st.i ? 'cur' : (hasAnswerAt(k) ? 'ok' : ''); });
    scroll();
  }

  function finish(){
    st.score = st.answers.filter(a => a && a.correct).length;
    env.finish(st, d, qs);
  }

  function drawScore(){
    const sc = st.score ?? st.answers.filter(a => a && a.correct).length, pct = Math.round(sc / Math.max(1, qs.length) * 100);
    const msg = pct === 100 ? L('perfect') : pct >= 80 ? L('great') : pct >= 55 ? L('ok') : L('low');
    const c = 2 * Math.PI * 52;
    box.innerHTML = header() + `<div class="qz-score in"><div class="qz-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/><circle class="v" cx="60" cy="60" r="52" stroke-dasharray="${c}" stroke-dashoffset="${c}"/></svg><div class="qz-pct"><b>0</b>%<small>${sc}/${qs.length}</small></div></div>
      <h3>${L('score')}: ${sc} / ${qs.length} (${pct}%)</h3><p>${msg}</p>
      <div class="qz-review"><h4>${L('reviewTitle')}</h4>${qs.map((q, k) => {
        const a = st.answers[k] || {};
        const tfOpts = Array.isArray(q.options) && q.options.length === 2 ? q.options : [L('trueOpt'), L('falseOpt')];
        const givenText = q.type === 'mc'
          ? (a.given != null && q.options && q.options[a.given] != null ? `${letter(a.given)}. ${q.options[a.given]}` : '—')
          : q.type === 'tf'
            ? (a.given === 0 || a.given === 1 ? tfOpts[a.given] : '—')
            : (String(a.given || '').trim() || '—');
        const rightText = q.type === 'mc'
          ? (q.options && q.options[q.answer] != null ? `${letter(q.answer)}. ${q.options[q.answer]}` : '')
          : q.type === 'tf'
            ? tfOpts[q.answer]
            : String(q.answer || '');
        const typeTag = typeTagOf(q.type);
        return `<div class="qr ${a.correct ? 'ok' : 'bad'}"><span class="qr-i">${a.correct ? '✓' : '✗'}</span><div style="flex:1;min-width:0">
          <div class="qr-q" dir="auto"><b>${k + 1}.</b> <small class="qr-type-chip">[${esc(typeTag)}]</small> ${esc(q.q)}</div>
          <div class="qr-a" dir="auto" style="${a.correct ? 'color:var(--acc3)' : ''}">${L('yourAnswer')} <b>${esc(givenText)}</b></div>
          ${(!a.correct || q.type === 'open' || q.type === 'fill') ? `<div class="qr-c" dir="auto">${L('rightAnswer')} <b>${esc(rightText)}</b></div>` : ''}
          ${a.feedback ? `<div class="qz-exp" dir="auto" style="margin-top:3px">${esc(a.feedback)}</div>` : ''}
          ${q.explanation ? `<div class="qz-exp" dir="auto" style="margin-top:2px"><b>${L('why')}</b> ${esc(q.explanation)}</div>` : ''}
        </div></div>`;
      }).join('')}</div>
      <div class="qz-foot">${sc < qs.length ? `<button type="button" class="btn-primary qz-retry">${L('retryWrong')}</button>` : ''}<button type="button" class="btn-ghost qz-new">${L('newQuiz')}</button></div></div>`;
    requestAnimationFrame(() => { const v = $('.qz-ring .v', box); if (v) v.style.strokeDashoffset = c * (1 - pct / 100); });
    const num = $('.qz-pct b', box), t0 = performance.now();
    const step = () => { const k = Math.min(1, (performance.now() - t0) / 900); num.textContent = Math.round(pct * (1 - Math.pow(1 - k, 3))); if (k < 1 && num.isConnected) requestAnimationFrame(step); };
    step();
    if (pct >= 80 && !st.celebrated){ st.celebrated = true; save(); confetti(); }
    const rt = $('.qz-retry', box); if (rt) rt.onclick = () => env.retry(qs.filter((q, k) => !(st.answers[k] && st.answers[k].correct)).map(q => ({...q})), d);
    $('.qz-new', box).onclick = () => env.newQuiz(d.topic || '', d);
  }
  draw(false);
  return box;
}

function confetti(){
  if (S().reduceMotion) return;
  const cv = el('canvas', 'confetti'); document.body.appendChild(cv);
  const W = cv.width = innerWidth, H = cv.height = innerHeight, x = cv.getContext('2d');
  const cols = ['#00ff9c', '#7dffcf', '#b6ff3b', '#ffffff', '#00d4ff', '#ffd166'];
  const P = Array.from({length: 140}, () => ({x: W / 2 + (Math.random() - .5) * 200, y: H * .55, vx: (Math.random() - .5) * 14, vy: -8 - Math.random() * 10, r: Math.random() * 6, c: cols[Math.random() * cols.length | 0], s: 4 + Math.random() * 5}));
  const t0 = performance.now();
  const f = now => { x.clearRect(0, 0, W, H); P.forEach(p => { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += .1; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); }); if (now - t0 < 2200) requestAnimationFrame(f); else cv.remove(); };
  requestAnimationFrame(f);
}

/* =====================================================================
   NEW TEACHING MODE 1: INTERACTIVE STEP-BY-STEP GUIDED TUTOR (Steps)
   ===================================================================== */
async function makeGuidedSteps(topic, contextText){
  if (busy) return;
  const s = cur();
  const effectiveTopic = topic || getLastTaughtTopicInSubject() || subjName(s);
  const studyCtx = contextText || getRecentSubjectStudyContext();
  push({role:'user', content: '🎯 ' + L('steps') + ': ' + effectiveTopic});
  setBusy(true); ctl = new AbortController();
  const {w, work} = working(L('makingSteps'));
  try {
    const j = await LZ.chatJSON([
      {
        role:'system',
        content: tutorSystem(`Create a 4-stage interactive Step-by-Step Guided Lesson on "${effectiveTopic}".
${studyCtx ? 'Base it on this material:\n' + String(studyCtx).slice(0, 3000) + '\n' : ''}Return ONLY valid JSON:
{"title":"lesson title","steps":[{"stepTitle":"Stage 1 title","icon":"emoji","teach":"2-3 clear sentences explaining this stage","example":"concrete quote, verse, formula, or example","checkQ":"short multiple-choice check question for this stage","options":["Option A","Option B","Option C"],"answer":0,"explain":"1 sentence why that option is correct"}]}
All text in ${LANGN[LL()]}.`)
      },
      {role:'user', content: effectiveTopic}
    ], {tier: A.state.model, maxTokens: 2400, signal: ctl.signal, onStatus: x => work.log(x)});
    w.remove(); work.done();
    const steps = ((j && j.steps) || []).filter(st => st && st.stepTitle && st.teach);
    if (!steps.length) throw new Error('none');
    push({role:'assistant', kind:'steps', data:{title: j.title || effectiveTopic, topic: effectiveTopic, steps, state:{curStep:0, unlocked:0, checked:{}}}});
  } catch(e){
    w.remove();
    if (e.name !== 'AbortError') push({role:'assistant', content: L('err')});
  }
  setBusy(false); ctl = null;
}

function Steps(m){
  const d = m.data, steps = d.steps || [], st = d.state || (d.state = {curStep:0, unlocked:0, checked:{}});
  const isHe = LL() === 'he';
  const box = el('div', 'ls-steps-card');
  function draw(){
    const idx = Math.min(steps.length - 1, Math.max(0, st.curStep || 0));
    const curStep = steps[idx];
    const ch = st.checked[idx];
    box.innerHTML = `
      <div class="ls-st-head">
        <span class="ls-st-badge">🎯 ${isHe ? 'שיעור מודרך בשלבים' : 'Guided Step-by-Step Lesson'}</span>
        <h3 dir="auto">${esc(d.title || '')}</h3>
      </div>
      <div class="ls-st-stepper" role="tablist">
        ${steps.map((s2, k) => {
          const done = st.checked[k] && st.checked[k].ok;
          const active = k === idx;
          return `<button type="button" class="ls-st-tab${active ? ' active' : ''}${done ? ' done' : ''}" data-sk="${k}">
            <span class="ls-st-num">${done ? '✓' : (k + 1)}</span>
            <span class="ls-st-tlbl" dir="auto">${esc(s2.stepTitle)}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="ls-st-body in">
        <div class="ls-st-stage-title"><span class="ls-st-ic">${esc(curStep.icon || '📘')}</span><b dir="auto">${isHe ? `שלב ${idx + 1}: ` : `Stage ${idx + 1}: `}${esc(curStep.stepTitle)}</b></div>
        <div class="ls-st-teach md" dir="auto"></div>
        ${curStep.example ? `<div class="ls-st-example" dir="auto"><b>💡 ${isHe ? 'דוגמה / ביסוס:' : 'Example / Reference:'}</b> <span>${esc(curStep.example)}</span></div>` : ''}
        ${curStep.checkQ && Array.isArray(curStep.options) && curStep.options.length >= 2 ? `
          <div class="ls-st-check">
            <div class="ls-st-cq" dir="auto">❓ <b>${isHe ? 'בדיקת הבנה לשלב זה:' : 'Quick Stage Check:'}</b> ${esc(curStep.checkQ)}</div>
            <div class="ls-st-copts">
              ${curStep.options.map((op, okIdx) => {
                const isPicked = ch && ch.pick === okIdx;
                const isRight = okIdx === +curStep.answer;
                const cls = ch ? (isRight ? ' right' : (isPicked ? ' wrong' : '')) : '';
                return `<button type="button" class="ls-st-copt${cls}" data-ok="${okIdx}" dir="auto">${esc(op)}</button>`;
              }).join('')}
            </div>
            ${ch ? `<div class="ls-st-cfb ${ch.ok ? 'ok' : 'bad'}" dir="auto"><b>${ch.ok ? L('correct') : L('wrong')}</b> ${esc(curStep.explain || '')}</div>` : ''}
          </div>
        ` : ''}
        <div class="ls-st-foot">
          ${idx > 0 ? `<button type="button" class="btn-ghost ls-st-prev">${isHe ? '‹ השלב הקודם' : '‹ Previous Stage'}</button>` : '<span></span>'}
          ${idx < steps.length - 1
            ? `<button type="button" class="btn-primary ls-st-next">${isHe ? 'לשלב הבא ›' : 'Next Stage ›'}</button>`
            : `<button type="button" class="btn-primary ls-st-quiz">📝 ${isHe ? 'סיימתי! בחן אותי על הנושא' : 'Done! Test me on this'}</button>`}
        </div>
      </div>`;

    A.renderMarkdown($('.ls-st-teach', box), curStep.teach || '');
    $$('.ls-st-tab', box).forEach(b => {
      b.onclick = () => { st.curStep = +b.dataset.sk; save(); draw(); };
    });
    $$('.ls-st-copt', box).forEach(b => {
      b.onclick = () => {
        const pick = +b.dataset.ok;
        const ok = pick === +curStep.answer;
        st.checked[idx] = {pick, ok};
        if (ok && st.unlocked <= idx) st.unlocked = idx + 1;
        save();
        A.sound && A.sound(ok ? 'done' : 'error');
        draw();
      };
    });
    const prev = $('.ls-st-prev', box);
    if (prev) prev.onclick = () => { st.curStep = Math.max(0, idx - 1); save(); draw(); };
    const next = $('.ls-st-next', box);
    if (next) next.onclick = () => { st.curStep = Math.min(steps.length - 1, idx + 1); save(); draw(); };
    const qz = $('.ls-st-quiz', box);
    if (qz) qz.onclick = () => makeQuiz(d.topic || d.title);
  }
  draw();
  return box;
}

/* =====================================================================
   NEW TEACHING MODE 2: INTERACTIVE CONCEPT MATCH GAME (MatchGame)
   ===================================================================== */
async function makeMatchGame(topic, contextText){
  if (busy) return;
  const s = cur();
  const effectiveTopic = topic || getLastTaughtTopicInSubject() || subjName(s);
  const studyCtx = contextText || getRecentSubjectStudyContext();
  push({role:'user', content: '🎮 ' + L('match') + ': ' + effectiveTopic});
  setBusy(true); ctl = new AbortController();
  const {w, work} = working(L('makingMatch'));
  try {
    const j = await LZ.chatJSON([
      {
        role:'system',
        content: tutorSystem(`Create an interactive Concept Match Game on "${effectiveTopic}" with 6 distinct pairs (term/character/verse/formula matched to its definition/meaning/event).
${studyCtx ? 'Base it on this material:\n' + String(studyCtx).slice(0, 3000) + '\n' : ''}Return ONLY valid JSON:
{"title":"game title","pairs":[{"term":"short term (1-5 words)","def":"matching definition or meaning (max 14 words)"}]}
Generate 6 pairs in ${LANGN[LL()]}.`)
      },
      {role:'user', content: effectiveTopic}
    ], {tier: A.state.model, maxTokens: 1800, signal: ctl.signal, onStatus: x => work.log(x)});
    w.remove(); work.done();
    const pairs = ((j && j.pairs) || []).filter(p => p && p.term && p.def).slice(0, 6);
    if (pairs.length < 3) throw new Error('none');
    const orderDefs = pairs.map((_, i) => i).sort(() => Math.random() - 0.5);
    push({role:'assistant', kind:'match', data:{title: j.title || effectiveTopic, topic: effectiveTopic, pairs, orderDefs, state:{matched:[], streak:0, bestStreak:0, mistakes:0}}});
  } catch(e){
    w.remove();
    if (e.name !== 'AbortError') push({role:'assistant', content: L('err')});
  }
  setBusy(false); ctl = null;
}

function MatchGame(m){
  const d = m.data, pairs = d.pairs || [], st = d.state || (d.state = {matched:[], streak:0, bestStreak:0, mistakes:0});
  if (!Array.isArray(st.matched)) st.matched = [];
  const isHe = LL() === 'he';
  const box = el('div', 'ls-match-card');
  let selTerm = null, selDef = null, wrongPair = null;

  function checkMatch(){
    if (selTerm === null || selDef === null) return;
    if (selTerm === selDef){
      if (!st.matched.includes(selTerm)) st.matched.push(selTerm);
      st.streak = (st.streak || 0) + 1;
      st.bestStreak = Math.max(st.bestStreak || 0, st.streak);
      selTerm = null; selDef = null;
      save();
      A.sound && A.sound('done');
      if (st.matched.length === pairs.length) confetti();
      draw();
    } else {
      st.streak = 0;
      st.mistakes = (st.mistakes || 0) + 1;
      wrongPair = {t: selTerm, d: selDef};
      save();
      A.sound && A.sound('error');
      draw();
      setTimeout(() => { wrongPair = null; selTerm = null; selDef = null; draw(); }, 550);
    }
  }

  function draw(){
    const done = st.matched.length >= pairs.length;
    box.innerHTML = `
      <div class="ls-mg-head">
        <div>
          <span class="ls-st-badge">🎮 ${isHe ? 'משחק התאמת מושגים' : 'Concept Match Game'}</span>
          <h3 dir="auto">${esc(d.title || '')}</h3>
        </div>
        <div class="ls-mg-stats">
          <span class="ls-mg-pill">✓ ${st.matched.length}/${pairs.length}</span>
          <span class="ls-mg-pill streak">🔥 ${isHe ? 'רצף:' : 'Streak:'} ${st.streak || 0}</span>
        </div>
      </div>
      ${done ? `
        <div class="ls-mg-win in">
          <div class="ls-mg-trophy">🏆</div>
          <h4>${isHe ? 'כל הכבוד! התאמתם את כל המושגים בהצלחה!' : 'Awesome! You matched all concepts!'}</h4>
          <p>${isHe ? `רצף שיא: ${st.bestStreak || pairs.length} · טעויות: ${st.mistakes || 0}` : `Best streak: ${st.bestStreak || pairs.length} · Mistakes: ${st.mistakes || 0}`}</p>
          <div class="ls-mg-actions">
            <button type="button" class="btn-ghost ls-mg-reset">🔁 ${isHe ? 'שחק שוב' : 'Play Again'}</button>
            <button type="button" class="btn-primary ls-mg-quiz">📝 ${isHe ? 'מבחן על המושגים האלו' : 'Test me on these concepts'}</button>
          </div>
        </div>
      ` : `
        <p class="ls-mg-sub">${isHe ? 'לחצו על מושג בטור הימני והתאימו אותו להגדרה שלו בטור השמאלי:' : 'Tap a term in the first column and match it with its definition:'}</p>
        <div class="ls-mg-grid">
          <div class="ls-mg-col">
            <h5>📌 ${isHe ? 'מושגים' : 'Terms'}</h5>
            ${pairs.map((p, idx) => {
              const isMatched = st.matched.includes(idx);
              const isSel = selTerm === idx;
              const isWrong = wrongPair && wrongPair.t === idx;
              return `<button type="button" class="ls-mg-item${isMatched ? ' matched' : ''}${isSel ? ' sel' : ''}${isWrong ? ' wrong' : ''}" data-ti="${idx}" ${isMatched ? 'disabled' : ''} dir="auto">${esc(p.term)}</button>`;
            }).join('')}
          </div>
          <div class="ls-mg-col">
            <h5>📖 ${isHe ? 'הגדרות ופירושים' : 'Definitions'}</h5>
            ${(d.orderDefs || pairs.map((_, i) => i)).map(idx => {
              const p = pairs[idx];
              const isMatched = st.matched.includes(idx);
              const isSel = selDef === idx;
              const isWrong = wrongPair && wrongPair.d === idx;
              return `<button type="button" class="ls-mg-item def${isMatched ? ' matched' : ''}${isSel ? ' sel' : ''}${isWrong ? ' wrong' : ''}" data-di="${idx}" ${isMatched ? 'disabled' : ''} dir="auto">${esc(p.def)}</button>`;
            }).join('')}
          </div>
        </div>
      `}`;

    $$('[data-ti]', box).forEach(b => {
      b.onclick = () => { selTerm = +b.dataset.ti; draw(); checkMatch(); };
    });
    $$('[data-di]', box).forEach(b => {
      b.onclick = () => { selDef = +b.dataset.di; draw(); checkMatch(); };
    });
    const rst = $('.ls-mg-reset', box);
    if (rst) rst.onclick = () => {
      st.matched = []; st.streak = 0; st.mistakes = 0;
      d.orderDefs = pairs.map((_, i) => i).sort(() => Math.random() - 0.5);
      save(); draw();
    };
    const qz = $('.ls-mg-quiz', box);
    if (qz) qz.onclick = () => makeQuiz(d.topic || d.title);
  }
  draw();
  return box;
}

/* =====================================================================
   NEW TEACHING MODE 3: SPOT THE MISTAKE CHALLENGE (SpotMistake)
   ===================================================================== */
async function makeSpotMistake(topic){
  if (busy) return;
  const s = cur();
  const effectiveTopic = topic || getLastTaughtTopicInSubject() || subjName(s);
  const studyCtx = getRecentSubjectStudyContext();
  push({role:'user', content: '🕵️ ' + L('mistake') + ': ' + effectiveTopic});
  setBusy(true); ctl = new AbortController();
  const {w, work} = working(L('makingMistake'));
  try {
    const j = await LZ.chatJSON([
      {
        role:'system',
        content: tutorSystem(`Create an interactive "Spot the Mistake" challenge on "${effectiveTopic}" with 3 realistic statements/student answers that each contain a subtle factual, conceptual, or methodological mistake.
${studyCtx ? 'Base it on this material:\n' + String(studyCtx).slice(0, 2800) + '\n' : ''}Return ONLY valid JSON:
{"title":"challenge title","items":[{"statement":"a plausible-sounding statement or student solution that contains 1 key mistake","hint":"short clue pointing toward the error","mistake":"what exactly is wrong in the statement","correction":"the accurate corrected version"}]}
All text in ${LANGN[LL()]}.`)
      },
      {role:'user', content: effectiveTopic}
    ], {tier: A.state.model, maxTokens: 2000, signal: ctl.signal, onStatus: x => work.log(x)});
    w.remove(); work.done();
    const items = ((j && j.items) || []).filter(x => x && x.statement && x.correction);
    if (!items.length) throw new Error('none');
    push({role:'assistant', kind:'mistake', data:{title: j.title || effectiveTopic, topic: effectiveTopic, items, state:{revealed:{}}}});
  } catch(e){
    w.remove();
    if (e.name !== 'AbortError') push({role:'assistant', content: L('err')});
  }
  setBusy(false); ctl = null;
}

function SpotMistake(m){
  const d = m.data, items = d.items || [], st = d.state || (d.state = {revealed:{}});
  const isHe = LL() === 'he';
  const box = el('div', 'ls-mistake-card');
  function draw(){
    box.innerHTML = `
      <div class="ls-st-head">
        <span class="ls-st-badge">🕵️ ${isHe ? 'אתגר "מצא את הטעות"' : 'Spot the Mistake Challenge'}</span>
        <h3 dir="auto">${esc(d.title || '')}</h3>
        <p class="ls-mg-sub">${isHe ? 'בכל אחת מהטענות הבאות מסתתרת טעות נפוצה במבחנים. נסו לזהות אותה ולחצו על "חשוף את הטעות והתיקון":' : 'Each statement below hides a common exam misconception. Try to spot it, then click to reveal the fix:'}</p>
      </div>
      <div class="ls-mk-list">
        ${items.map((it, idx) => {
          const rev = st.revealed && st.revealed[idx];
          return `<div class="ls-mk-item${rev ? ' rev' : ''}">
            <div class="ls-mk-num">${idx + 1}</div>
            <div class="ls-mk-content">
              <div class="ls-mk-stmt" dir="auto">❌ <b>${isHe ? 'טענה עם טעות:' : 'Flawed Statement:'}</b> "${esc(it.statement)}"</div>
              ${!rev ? `
                <div class="ls-mk-btns">
                  ${it.hint ? `<button type="button" class="btn-ghost ls-mk-hint" data-hi="${idx}">💡 ${L('hint')}</button>` : ''}
                  <button type="button" class="btn-primary ls-mk-rev" data-ri="${idx}">🔍 ${isHe ? 'חשוף את הטעות והתיקון' : 'Reveal Mistake & Fix'}</button>
                </div>
                <div class="ls-mk-hbox" id="mkHint_${idx}" hidden dir="auto">💡 ${esc(it.hint || '')}</div>
              ` : `
                <div class="ls-mk-solution in">
                  <div class="ls-mk-err" dir="auto">🕵️ <b>${isHe ? 'מה הטעות כאן?' : 'The Mistake:'}</b> ${esc(it.mistake)}</div>
                  <div class="ls-mk-fix" dir="auto">✅ <b>${isHe ? 'הניסוח המדויק:' : 'Corrected Fact:'}</b> ${esc(it.correction)}</div>
                </div>
              `}
            </div>
          </div>`;
        }).join('')}
      </div>`;

    $$('.ls-mk-hint', box).forEach(b => {
      b.onclick = () => {
        const hb = $(`#mkHint_${b.dataset.hi}`, box);
        if (hb) hb.hidden = !hb.hidden;
      };
    });
    $$('.ls-mk-rev', box).forEach(b => {
      b.onclick = () => {
        st.revealed[b.dataset.ri] = true;
        save();
        A.sound && A.sound('done');
        draw();
      };
    });
  }
  draw();
  return box;
}

/* =====================================================================
   NEW TEACHING MODE 4: FEYNMAN TEACH-BACK COACH (Feynman)
   ===================================================================== */
async function makeFeynman(topic){
  if (busy) return;
  const s = cur();
  const effectiveTopic = topic || getLastTaughtTopicInSubject() || subjName(s);
  const studyCtx = getRecentSubjectStudyContext();
  push({role:'user', content: '🧠 ' + L('feynman') + ': ' + effectiveTopic});
  setBusy(true); ctl = new AbortController();
  const {w, work} = working(L('makingFeynman'));
  try {
    const j = await LZ.chatJSON([
      {
        role:'system',
        content: tutorSystem(`Create a Feynman Technique ("Explain it in your own simple words") challenge for "${effectiveTopic}".
${studyCtx ? 'Base it on this material:\n' + String(studyCtx).slice(0, 2800) + '\n' : ''}Return ONLY valid JSON:
{"concept":"specific concept or event to explain","prompt":"friendly prompt asking the student to explain this concept in 2-4 simple sentences as if teaching a classmate","keyPoints":["key point 1 to look for","key point 2","key point 3"],"modelSimple":"a crystal-clear 3-sentence model explanation"}
All text in ${LANGN[LL()]}.`)
      },
      {role:'user', content: effectiveTopic}
    ], {tier: A.state.model, maxTokens: 1500, signal: ctl.signal, onStatus: x => work.log(x)});
    w.remove(); work.done();
    if (!j || !j.concept) throw new Error('none');
    push({role:'assistant', kind:'feynman', data:{concept: j.concept, prompt: j.prompt, keyPoints: j.keyPoints || [], modelSimple: j.modelSimple || '', state:{draft:'', evaluation:null}}});
  } catch(e){
    w.remove();
    if (e.name !== 'AbortError') push({role:'assistant', content: L('err')});
  }
  setBusy(false); ctl = null;
}

function Feynman(m){
  const d = m.data, st = d.state || (d.state = {draft:'', evaluation:null});
  const isHe = LL() === 'he';
  const box = el('div', 'ls-feynman-card');
  function draw(){
    const ev = st.evaluation;
    box.innerHTML = `
      <div class="ls-st-head">
        <span class="ls-st-badge">🧠 ${isHe ? 'שיטת פיינמן — "תסביר במילים שלך"' : 'Feynman Teach-Back Coach'}</span>
        <h3 dir="auto">${esc(d.concept || '')}</h3>
        <p class="ls-mg-sub" dir="auto">${esc(d.prompt || '')}</p>
      </div>
      <div class="ls-fn-body">
        <textarea class="qz-open ls-fn-ta" rows="4" dir="auto" placeholder="${isHe ? 'הסבירו כאן במילים שלכם בפשטות…' : 'Write your simple explanation here…'}"></textarea>
        <div class="ls-fn-actions">
          <button type="button" class="btn-primary ls-fn-grade">${isHe ? '✨ בדוק את ההסבר שלי ותן ציון בהירות' : '✨ Grade My Explanation'}</button>
        </div>
        ${ev ? `
          <div class="ls-fn-result in">
            <div class="ls-fn-score-row">
              <span class="ls-fn-score-pill">${isHe ? 'ציון בהירות ודיוק:' : 'Clarity & Accuracy:'} <b>${ev.score}%</b></span>
            </div>
            <div class="ls-fn-fb" dir="auto">👍 <b>${isHe ? 'מה הסברת מצוין:' : 'What you nailed:'}</b> ${esc(ev.praise || '')}</div>
            ${ev.missing ? `<div class="ls-fn-miss" dir="auto">💡 <b>${isHe ? 'מה כדאי להוסיף/לחדד:' : 'What to add:'}</b> ${esc(ev.missing)}</div>` : ''}
            <div class="ls-fn-model" dir="auto">🌟 <b>${isHe ? 'הסבר זהב קצר לסיכום:' : 'Gold-Standard Simple Explanation:'}</b> ${esc(d.modelSimple || '')}</div>
          </div>
        ` : ''}
      </div>`;

    const ta = $('.ls-fn-ta', box);
    ta.value = st.draft || '';
    ta.oninput = () => { st.draft = ta.value; save(true); };
    const btn = $('.ls-fn-grade', box);
    btn.onclick = async () => {
      const txt = ta.value.trim();
      if (!txt){ ta.focus(); return; }
      btn.disabled = true;
      btn.textContent = L('grading');
      const det = gradeOpenAnswerFallback((d.keyPoints || []).join(' ') || d.modelSimple || d.concept, txt);
      try {
        const res = await fastChatJSONRace([
          {role:'system', content:`You coach a student using the Feynman technique. Evaluate their explanation of "${d.concept}" against key points (${(d.keyPoints || []).join('; ')}). Return ONLY JSON {"score":0..100,"praise":"1 encouraging sentence in ${LANGN[LL()]}","missing":"1 short tip in ${LANGN[LL()]}"}`},
          {role:'user', content: txt}
        ], {tier: 'fera', maxTokens: 320}, 1800);
        st.evaluation = {score: Math.max(20, Math.min(100, +(res && res.score) || 85)), praise: (res && res.praise) || '', missing: (res && res.missing) || ''};
      } catch(_){
        const detScore = Math.max(55, Math.min(98, Math.round((det.score || 0.85) * 100)));
        st.evaluation = {
          score: detScore,
          praise: isHe ? 'הסבר ברור וממוקד שמציג היטב את הרעיון המרכזי במילים שלך!' : 'Clear explanation covering the core idea in your own words!',
          missing: ''
        };
      }
      save();
      A.sound && A.sound('done');
      draw();
    };
  }
  draw();
  return box;
}

/* ---------- flashcards (spaced repetition, SM-2 lite) ---------- */
async function makeCards(topic, contextText){
  if (busy) return;
  const s = cur();
  const effectiveTopic = topic || getLastTaughtTopicInSubject() || '';
  const studyCtx = contextText || getRecentSubjectStudyContext();
  push({role:'user', content: '🃏 ' + L('cards') + (effectiveTopic ? ': ' + effectiveTopic : '')});
  setBusy(true); ctl = new AbortController();
  const {w, work} = working(L('makingCards'));
  try {
    const j = await LZ.chatJSON([{role:'system', content: tutorSystem(`Create 10 study flashcards. Return ONLY JSON {"cards":[{"front":"short question or term","back":"concise answer/definition (max 30 words)"}]}. ${effectiveTopic ? 'Topic: ' + effectiveTopic + '.' : 'Key concepts of this subject.'}${studyCtx ? '\nBase the flashcards on this taught material:\n' + String(studyCtx).slice(0, 3000) : ''} Language: ${LANGN[LL()]}.`)}, {role:'user', content: effectiveTopic || subjName(s)}], {tier: A.state.model, maxTokens: 2000, signal: ctl.signal, onStatus: x => work.log(x)});
    const cards = ((j && j.cards) || []).filter(c => c && c.front && c.back).slice(0, 14);
    w.remove(); work.done();
    if (!cards.length) throw new Error('none');
    const deck = sd(s.id).deck, ids = [];
    cards.forEach(c => { let ex = deck.find(x => x.front === c.front); if (!ex){ ex = {id: A.uid(), front: String(c.front), back: String(c.back), due: 0, ivl: 0, ease: 2.5, reps: 0}; deck.push(ex); } ids.push(ex.id); });
    save();
    push({role:'assistant', kind:'cards', data:{ids, i:0}});
    renderSubjects(); renderHead();
  } catch(e){ w.remove(); if (e.name !== 'AbortError') push({role:'assistant', content: L('err')}); }
  setBusy(false); ctl = null;
}

function review(){
  const deck = sd(cur().id).deck, now = Date.now();
  const due = deck.filter(c => (c.due || 0) <= now).sort((a, b) => (a.due || 0) - (b.due || 0)).slice(0, 20);
  if (!due.length){ A.toast(L('noDue')); return; }
  push({role:'assistant', kind:'cards', data:{ids: due.map(c => c.id), i:0, review:true}});
}

function grade(card, q){
  const day = 864e5;
  if (q === 0){ card.reps = 0; card.ivl = 0; card.due = Date.now() + 60e3; card.ease = Math.max(1.3, card.ease - .2); }
  else {
    card.reps++;
    card.ivl = card.reps === 1 ? (q === 3 ? 3 : 1) : card.reps === 2 ? (q === 1 ? 3 : 6) : Math.round(card.ivl * (q === 1 ? 1.2 : q === 3 ? card.ease * 1.3 : card.ease));
    card.ease = Math.max(1.3, card.ease + (q === 1 ? -.15 : q === 3 ? .15 : 0));
    card.due = Date.now() + card.ivl * day;
  }
}

function Cards(m){
  const d = m.data, deck = sd(cur().id).deck;
  const box = el('div', 'fc-box');
  function draw(){
    const cards = d.ids.map(id => deck.find(c => c.id === id)).filter(Boolean);
    if (d.i >= cards.length){ box.innerHTML = `<div class="fc-done">${L('deckDone')}</div>`; return; }
    const c = cards[d.i];
    box.innerHTML = `<div class="fc-top"><span>🃏 ${L('cardOf')} ${d.i + 1} ${L('of')} ${cards.length}</span><span class="fc-bar"><i style="transform:scaleX(${d.i / cards.length})"></i></span></div>
    <div class="fc-scene"><div class="fc-card" tabindex="0" role="button" aria-label="${esc(L('flip'))}"><div class="fc-face fc-front"><div dir="auto"></div><small>${L('flip')} ↻</small></div><div class="fc-face fc-back"><div dir="auto"></div></div></div></div>
    <div class="fc-grade" hidden><button type="button" data-q="0" class="g0">${L('again')}</button><button type="button" data-q="1" class="g1">${L('hard')}</button><button type="button" data-q="2" class="g2">${L('good')}</button><button type="button" data-q="3" class="g3">${L('easy')}</button></div>`;
    $('.fc-front div', box).textContent = c.front; $('.fc-back div', box).textContent = c.back;
    const card = $('.fc-card', box);
    const flip = () => { card.classList.toggle('flipped'); $('.fc-grade', box).hidden = false; };
    card.onclick = flip; card.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); flip(); } };
    $('.fc-grade', box).onclick = e => { const b = e.target.closest('button'); if (!b) return; grade(c, +b.dataset.q); d.i++; save(); box.classList.add('next'); setTimeout(() => { box.classList.remove('next'); draw(); renderSubjects(); }, 180); };
  }
  draw();
  return box;
}

/* ---------- summary + mind map ---------- */
async function makeSummary(topic){
  if (busy) return;
  const s = cur();
  const effectiveTopic = topic || getLastTaughtTopicInSubject() || '';
  push({role:'user', content: '🧭 ' + L('summary') + (effectiveTopic ? ': ' + effectiveTopic : '')});
  setBusy(true); ctl = new AbortController();
  const {w, work} = working(L('makingSummary'));
  try {
    const j = await LZ.chatJSON([{role:'system', content: tutorSystem(`Write a study summary as JSON ONLY: {"title":"","intro":"1-2 sentences","sections":[{"icon":"one emoji","heading":"","points":["short bullet","…"]}],"keyTerms":[{"term":"","def":"max 15 words"}],"mindmap":{"center":"topic","branches":[{"label":"","children":["",""]}]}}. 4-6 sections, 3-5 points each, 5-8 key terms, 4-6 branches with 2-4 children. ${effectiveTopic ? 'Topic: ' + effectiveTopic + '.' : 'Overview of the main material.'} Language: ${LANGN[LL()]}.`)}, {role:'user', content: effectiveTopic || subjName(s)}], {tier: A.state.model, maxTokens: 3000, signal: ctl.signal, onStatus: x => work.log(x)});
    w.remove(); work.done();
    if (!j || !Array.isArray(j.sections)) throw new Error('bad');
    push({role:'assistant', kind:'summary', data: j});
  } catch(e){ w.remove(); if (e.name !== 'AbortError') push({role:'assistant', content: L('err')}); }
  setBusy(false); ctl = null;
}

function Summary(m){
  const d = m.data;
  const box = el('div', 'sm-box');
  box.innerHTML = `<h3 dir="auto"></h3><p class="sm-intro" dir="auto"></p><div class="sm-grid"></div>${d.mindmap && d.mindmap.branches ? `<h4>🧠 ${L('mindmap')}</h4><div class="mm"><div class="mm-center" dir="auto"></div><div class="mm-branches"></div></div>` : ''}${(d.keyTerms || []).length ? `<h4>🔑 ${L('keyTerms')}</h4><dl class="sm-terms"></dl>` : ''}`;
  $('h3', box).textContent = d.title || ''; $('.sm-intro', box).textContent = d.intro || '';
  (d.sections || []).forEach((s2, i) => { const c = el('div', 'sm-card'); c.style.animationDelay = i * 70 + 'ms'; c.innerHTML = `<div class="sm-h"><span>${esc(s2.icon || '•')}</span><b dir="auto"></b></div><ul>${(s2.points || []).map(p => `<li dir="auto">${esc(p)}</li>`).join('')}</ul>`; $('b', c).textContent = s2.heading || ''; $('.sm-grid', box).appendChild(c); });
  if (d.mindmap && d.mindmap.branches){ $('.mm-center', box).textContent = d.mindmap.center || d.title || ''; d.mindmap.branches.forEach((b, i) => { const br = el('div', 'mm-branch'); br.style.setProperty('--i', i); br.innerHTML = `<div class="mm-node" dir="auto">${esc(b.label || '')}</div><div class="mm-kids">${(b.children || []).map(k => `<span dir="auto">${esc(k)}</span>`).join('')}</div>`; $('.mm-branches', box).appendChild(br); }); }
  (d.keyTerms || []).forEach(k => { const dl = $('.sm-terms', box); dl.insertAdjacentHTML('beforeend', `<dt dir="auto">${esc(k.term)}</dt><dd dir="auto">${esc(k.def)}</dd>`); });
  return box;
}

window.Lessons = {
  Quiz,
  genQuiz,
  verifyQuiz,
  normQuiz,
  STR,
  confetti,
  onShow(){
    render();
    setTimeout(() => $('#lsInput') && innerWidth > 820 && $('#lsInput').focus(), 50);
  },
  refresh(){
    if (view && view.innerHTML) render();
  },
  SUBJECTS,
  makeQuiz,
  makeGuidedSteps,
  makeMatchGame,
  makeSpotMistake,
  makeFeynman,
  makeCards,
  makeSummary,
  ask
};
render();
})();
