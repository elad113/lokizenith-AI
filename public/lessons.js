/* LokiLessons — a personal tutor for Israeli 9th grade (כיתה ט׳). Made by Lokiz Studios. */
(function(){
'use strict';
const A = window.App, {$, $$, el, esc} = A;
const S = () => A.settings();

/* ---------- UI strings (lesson language) ---------- */
const STR = {
  he:{title:'LokiLessons', sub:'כיתה ט׳ · לפי תוכנית משרד החינוך', back:'‹ לצ׳אט', quiz:'בוחן', explain:'הסבר נושא', cards:'כרטיסיות', summary:'סיכום', plan:'תוכנית לימוד', hints:'מצב רמזים', review:'חזרה', due:'לחזרה', clear:'נקה שיחה', placeholder:'שאלו את המורה…', send:'שלח',
    check:'בדיקה', next:'המשך', finish:'סיום', hint:'רמז', correct:'נכון! 🎉', wrong:'לא בדיוק', rightAnswer:'התשובה הנכונה:', yourAnswer:'התשובה שלך:', why:'הסבר:', question:'שאלה', of:'מתוך', typeAnswer:'כתבו את התשובה כאן…', grading:'בודק…', score:'הציון שלך', retryWrong:'🔁 תרגול הטעויות', newQuiz:'✨ בוחן חדש', reviewTitle:'סקירת התשובות', perfect:'מושלם! אלופים 🏆', great:'עבודה מצוינת! 💪', ok:'כיוון טוב — עוד קצת תרגול 📚', low:'לא נורא — בואו נחזור על החומר 🌱',
    makingQuiz:'מכין בוחן…', makingCards:'מכין כרטיסיות…', makingSummary:'מכין סיכום…', flip:'לחצו להפוך', again:'שוב', hard:'קשה', good:'טוב', easy:'קל', deckDone:'סיימתם את הכרטיסיות! 🎉', cardOf:'כרטיס', quizzes:'בחנים', avg:'ממוצע', mastery:'שליטה', noDue:'אין כרטיסיות לחזרה כרגע', topics:'נושאים', difficulty:'רמה', easyL:'קל', mediumL:'בינוני', hardL:'קשה', welcome:'היי! אני המורה הפרטי שלך ל{s} 👋\nאפשר לשאול אותי כל שאלה, לבקש הסבר, בוחן, כרטיסיות או סיכום.', err:'משהו השתבש — נסו שוב.', keyTerms:'מושגי מפתח', mindmap:'מפת חשיבה', topicPrompt:'על איזה נושא? (השאירו ריק לכל החומר)', explainAsk:'הסבר לי את הנושא: ', planAsk:'בנה לי תוכנית לימוד ל-7 ימים לקראת מבחן ב{s}, עם משימות יומיות קצרות ותרגול.', open:'שאלה פתוחה', mc:'רב-ברירה', copy:'העתק', speak:'הקרא', minQ:'לא הצלחתי לבנות מספיק שאלות — נסו שוב', working:'עובד', worked:'עבד', verifying:'מאמת את התשובות…'},
  en:{title:'LokiLessons', sub:'9th grade · Israeli Ministry of Education curriculum', back:'‹ Chat', quiz:'Quiz me', explain:'Explain a topic', cards:'Flashcards', summary:'Summary', plan:'Study plan', hints:'Hints mode', review:'Review', due:'due', clear:'Clear chat', placeholder:'Ask your tutor…', send:'Send',
    check:'Check', next:'Next', finish:'Finish', hint:'Hint', correct:'Correct! 🎉', wrong:'Not quite', rightAnswer:'Correct answer:', yourAnswer:'Your answer:', why:'Why:', question:'Question', of:'of', typeAnswer:'Type your answer here…', grading:'Checking…', score:'Your score', retryWrong:'🔁 Retry wrong ones', newQuiz:'✨ New quiz', reviewTitle:'Review', perfect:'Perfect! Champion 🏆', great:'Great work! 💪', ok:'Good direction — a bit more practice 📚', low:'No worries — let’s review the material 🌱',
    makingQuiz:'Building your quiz…', makingCards:'Making flashcards…', makingSummary:'Writing a summary…', flip:'Tap to flip', again:'Again', hard:'Hard', good:'Good', easy:'Easy', deckDone:'Deck complete! 🎉', cardOf:'Card', quizzes:'quizzes', avg:'avg', mastery:'Mastery', noDue:'No cards due right now', topics:'Topics', difficulty:'Level', easyL:'Easy', mediumL:'Medium', hardL:'Hard', welcome:'Hi! I’m your personal {s} tutor 👋\nAsk me anything, or ask for an explanation, a quiz, flashcards or a summary.', err:'Something went wrong — try again.', keyTerms:'Key terms', mindmap:'Mind map', topicPrompt:'Which topic? (leave empty for everything)', explainAsk:'Explain this topic: ', planAsk:'Build me a 7-day study plan for a {s} test, with short daily tasks and practice.', open:'Open question', mc:'Multiple choice', copy:'Copy', speak:'Read aloud', minQ:'Could not build enough questions — try again', working:'Working', worked:'Worked', verifying:'Verifying answer keys…'},
  ar:{title:'LokiLessons', sub:'الصف التاسع · حسب منهاج وزارة التربية', back:'‹ الدردشة', quiz:'اختبار', explain:'اشرح موضوعًا', cards:'بطاقات', summary:'ملخص', plan:'خطة دراسة', hints:'وضع التلميحات', review:'مراجعة', due:'للمراجعة', clear:'مسح المحادثة', placeholder:'اسأل معلمك…', send:'إرسال',
    check:'تحقق', next:'التالي', finish:'إنهاء', hint:'تلميح', correct:'صحيح! 🎉', wrong:'ليس تمامًا', rightAnswer:'الإجابة الصحيحة:', yourAnswer:'إجابتك:', why:'الشرح:', question:'سؤال', of:'من', typeAnswer:'اكتب إجابتك هنا…', grading:'جارٍ التحقق…', score:'نتيجتك', retryWrong:'🔁 أعد الأخطاء', newQuiz:'✨ اختبار جديد', reviewTitle:'مراجعة الإجابات', perfect:'ممتاز! بطل 🏆', great:'عمل رائع! 💪', ok:'اتجاه جيد — المزيد من التدريب 📚', low:'لا بأس — لنراجع المادة 🌱',
    makingQuiz:'جارٍ إعداد الاختبار…', makingCards:'جارٍ إعداد البطاقات…', makingSummary:'جارٍ كتابة الملخص…', flip:'اضغط للقلب', again:'مجددًا', hard:'صعب', good:'جيد', easy:'سهل', deckDone:'أنهيت البطاقات! 🎉', cardOf:'بطاقة', quizzes:'اختبارات', avg:'المعدل', mastery:'الإتقان', noDue:'لا توجد بطاقات للمراجعة الآن', topics:'مواضيع', difficulty:'المستوى', easyL:'سهل', mediumL:'متوسط', hardL:'صعب', welcome:'مرحبًا! أنا معلمك الخاص في {s} 👋\nاسألني أي شيء أو اطلب شرحًا أو اختبارًا أو بطاقات أو ملخصًا.', err:'حدث خطأ — حاول مرة أخرى.', keyTerms:'مصطلحات أساسية', mindmap:'خريطة ذهنية', topicPrompt:'أي موضوع؟ (اتركه فارغًا لكل المادة)', explainAsk:'اشرح لي موضوع: ', planAsk:'ضع لي خطة دراسة لمدة 7 أيام لاختبار في {s} مع مهام يومية قصيرة وتدريب.', open:'سؤال مفتوح', mc:'اختيار من متعدد', copy:'نسخ', speak:'قراءة', minQ:'تعذر إنشاء أسئلة كافية — حاول مرة أخرى', working:'يعمل', worked:'عمل', verifying:'جارٍ التحقق من الإجابات…'}
};
const LL = () => {
  const st = S();
  if (st.lang && STR[st.lang]) return st.lang;
  if (st.lessonLang && STR[st.lessonLang]) return st.lessonLang;
  return 'en';
};
const L = k => (STR[LL()][k] ?? STR.en[k] ?? k);
const LANGN = {he:'Hebrew', en:'English', ar:'Arabic'};

/* ---------- subjects (Israeli MoE 9th grade) ---------- */
const SUBJECTS = [
  {id:'math', icon:'📐', hue:150, name:{he:'מתמטיקה', en:'Math', ar:'رياضيات'},
   topics:{
     he:['פונקציה קווית ושיפוע','מערכת משוואות','פונקציה ריבועית','נוסחאות הכפל המקוצר','פירוק לגורמים','משוואות ריבועיות','אי-שוויונות','משפט פיתגורס','דמיון משולשים','טריגונומטריה במשולש ישר-זווית','סטטיסטיקה והסתברות'],
     en:['Linear Functions & Slope','Systems of Equations','Quadratic Functions & Parabolas','Short Multiplication Formulas','Factoring Polynomials','Quadratic Equations','Inequalities','Pythagorean Theorem','Similar Triangles','Right-Triangle Trigonometry','Statistics & Probability'],
     ar:['الدالة الخطية والميل','هيئة معادلات','الدالة التربيعية والقطع المكافئ','قوانين الضرب المختصر','التحليل إلى عوامل','المعادلات التربيعية','المتباينات','نظرية فيثاغورس','تشابه المثلثات','حساب المثلثات قائم الزاوية','الإحصاء والاحتمالات']
   },
   prompt:'You teach 9th-grade mathematics following the curriculum: linear functions & slope, systems of equations, quadratic functions & parabolas, short multiplication formulas, factoring, quadratic equations, inequalities, Pythagoras, similar triangles, right-triangle trigonometry, statistics & probability. Show full step-by-step solutions with LaTeX-free plain math (use ^ and √), check answers, and give a similar practice exercise at the end.'},
  {id:'english', icon:'🇬🇧', hue:200, name:{he:'אנגלית', en:'English', ar:'إنجليزية'},
   topics:{
     he:['Present Perfect vs Past Simple','Passive Voice','Conditionals 1 & 2','Reported Speech','Relative Clauses','Reading comprehension (HOTS)','Writing a paragraph','Vocabulary Band II','Modals'],
     en:['Present Perfect vs Past Simple','Passive Voice','Conditionals 1 & 2','Reported Speech','Relative Clauses','Reading Comprehension (HOTS)','Paragraph Writing','Academic Vocabulary','Modal Verbs'],
     ar:['المضارع التام مقابل الماضي البسيط','المبني للمجهول (Passive Voice)','الجمل الشرطية 1 و 2','الكلام المنقول (Reported Speech)','جمل الوصل (Relative Clauses)','فهم المقروء ومهارات التفكير','كتابة فقرة باللغة الإنجليزية','مفردات اللغة الإنجليزية','الأفعال الناقصة (Modals)']
   },
   prompt:'You are an English teacher for 9th graders: teach grammar (tenses, passive, conditionals, reported speech, relative clauses, modals), reading comprehension with HOTS (higher-order thinking skills), vocabulary and paragraph writing. Explain in the student\'s chosen language but give examples and exercises in English.'},
  {id:'science', icon:'🔬', hue:170, name:{he:'מדע וטכנולוגיה', en:'Science', ar:'علوم'},
   topics:{
     he:['מבנה האטום','הטבלה המחזורית','קשרים כימיים','תגובות כימיות ושימור מסה','חומצות ובסיסים','חשמל ומעגלים','כוחות ותנועה','אנרגיה ושימורה','תורשה וגנטיקה','מערכת העצבים וההורמונים','אקולוגיה'],
     en:['Atomic Structure','The Periodic Table','Chemical Bonds','Chemical Reactions & Conservation of Mass','Acids & Bases','Electricity & Circuits','Forces & Motion','Energy & Conservation','Heredity & Genetics','Nervous & Endocrine Systems','Ecology & Ecosystems'],
     ar:['مبنى الذرة','الجدول الدوري','الروابط الكيميائية','التفاعلات الكيميائية وحفظ الكتلة','الأحماض والقواعد','الكهرباء والدوائر الكهربائية','القوى والحركة','الطاقة وحفظها','الوراثة وعلم الجينات','الجهاز العصبي والهرموني','علم البيئة والأنظمة البيئية']
   },
   prompt:'You teach 9th-grade Science & Technology: chemistry (atom structure, periodic table, bonds, reactions, conservation of mass, acids & bases), physics (electricity & circuits, forces & motion, energy), biology (heredity & genetics, nervous & hormonal systems, ecology). Use clear everyday examples, simple experiments, and accurate scientific terminology in the student\'s chosen language.'},
  {id:'history', icon:'🏛️', hue:40, name:{he:'היסטוריה', en:'History', ar:'تاريخ'},
   topics:{
     he:['לאומיות ותנועות לאומיות','הציונות וראשיתה','מלחמת העולם הראשונה','בין שתי המלחמות','משטרים טוטליטריים','עליית הנאציזם','מלחמת העולם השנייה','השואה','המאבק להקמת המדינה','הכרזת העצמאות ומלחמת העצמאות'],
     en:['Nationalism & National Movements','Rise of Modern National Movements','World War I','The Interwar Period','Totalitarian Regimes','Rise of Fascism & Nazism','World War II','The Holocaust','Post-War Global Shifts','Decolonization & Statehood'],
     ar:['القومية والحركات القومية','نشأة الحركات الوطنية الحديثة','الحرب العالمية الأولى','فترة ما بين الحربين','الأنظمة الشمولية','صعود الفاشية والنازية','الحرب العالمية الثانية','الهولوكوست','تحولات العالم بعد الحرب','تأسيس الدول الحديثة']
   },
   prompt:'You teach 9th-grade modern history: nationalism and national movements, World War I, the interwar period, totalitarian regimes, World War II, the Holocaust, and modern state formation. Teach historical thinking: causes and results, comparison, primary sources, and structured exam-style answers.'},
  {id:'lashon', icon:'✍️', hue:120, name:{he:'לשון', en:'Language & Grammar', ar:'اللغة والقواعد'},
   topics:{
     he:['חלקי המשפט','משפט פשוט, מאוחה ומורכב','שורש ומשקל','בניינים','גזרות','סמיכות','מילות קישור ויחסי משמעות','פיסוק','כתיבה טיעונית','הבנת הנקרא'],
     en:['Parts of a Sentence','Simple, Compound & Complex Sentences','Word Roots & Patterns','Verb Conjugations & Voice','Construct State & Noun Phrases','Logical Connectors & Transitions','Punctuation Rules','Argumentative Essay Writing','Reading Comprehension'],
     ar:['أقسام الجملة','الجملة البسيطة والمركبة','الجذر والوزن الصرفي','أوزان الأفعال وتصريفها','الإضافة والتركيب','أدوات الربط والعلاقات المنطقية','علامات الترقيم','الكتابة الحجاجية والإقناعية','فهم المقروء والتحليل']
   },
   prompt:'You teach 9th-grade Language, Grammar & Composition: syntax (parts of a sentence, simple/compound/complex sentences), morphology (roots, patterns, verb structures), logical connectors, punctuation, reading comprehension, and argumentative writing in the student\'s chosen language.'},
  {id:'tanach', icon:'📜', hue:30, name:{he:'תנ״ך', en:'Biblical Studies', ar:'دراسات الكتاب المقدس'},
   topics:{
     he:['ספר שמואל – שאול ודוד','ספר מלכים – פילוג הממלכה','אליהו ואחאב','עמוס – נבואות חברתיות','ישעיהו – חזון אחרית הימים','ירמיהו – חורבן וגלות','מוטיבים ומילים מנחות','פרשנות ועיון'],
     en:['Samuel – Saul & David','Kings – Division of the Kingdom','Elijah & Ahab','Amos – Social Justice Prophecies','Isaiah – Vision of Peace','Jeremiah – Exile & Resilience','Literary Motifs & Leitwords','Classical & Modern Commentary'],
     ar:['سفر صموئيل – شاول وداود','سفر الملوك – انقسام المملكة','إيليا وأخاب','عاموس – نبوءات العدالة الاجتماعية','إشعياء – رؤى السلام','إرميا – السبي والصمود','الرموز والكلمات المفتاحية','التفسير والتحليل النصي']
   },
   prompt:'You teach 9th-grade Biblical Studies: Former and Latter Prophets — Samuel, Kings, Elijah, Amos, Isaiah, Jeremiah; skills: reading verses precisely, key words (leitwords), motifs, characters, moral and social messages, and connecting to commentaries in the student\'s chosen language.'},
  {id:'literature', icon:'📚', hue:280, name:{he:'ספרות', en:'Literature', ar:'أدب'},
   topics:{
     he:['אמצעים אומנותיים','דובר ונמען בשירה','ביאליק','רחל המשוררת','לאה גולדברג','יהודה עמיחי','הסיפור הקצר – מבנה ודמויות','דרמה','כתיבת תשובה ספרותית'],
     en:['Literary Devices & Figurative Language','Speaker & Addressee in Poetry','Modern Lyric Poetry','Classic & Contemporary Poets','Short Story Structure & Character Arc','Conflict & Point of View','Modern Drama & Tragedy','Theme & Symbolism','Writing a Literary Analysis'],
     ar:['الأساليب البلاغية والفنية','المتكلم والمخاطب في الشعر','الشعر الغنائي الحديث','شعراء كلاسيكيون ومعاصرون','القصة القصيرة – البناء والشخصيات','الصراع ووجهة النظر السردية','المسرح والدراما','الموضوع والرمزية','كتابة تحليل أدبي متكامل']
   },
   prompt:'You teach 9th-grade Literature: poetry, short stories, and drama; literary devices (metaphor, simile, personification, repetition, contrast, irony), speaker/addressee, structure, theme, characters, and how to write a complete literary analysis (claim, evidence/quote, explanation) in the student\'s chosen language.'},
  {id:'civics', icon:'🌍', hue:190, name:{he:'אזרחות וגאוגרפיה', en:'Civics & Geography', ar:'مدنيات وجغرافيا'},
   topics:{
     he:['מגילת העצמאות','מדינה יהודית ודמוקרטית','זכויות האדם והאזרח','רשויות השלטון','שלטון החוק','הבחירות בישראל','אוכלוסייה והגירה','עיור וערים','אקלים ומשאבי מים','גאוגרפיה של ארץ ישראל'],
     en:['Constitutional Foundations','Democratic Principles','Human & Civil Rights','Separation of Powers','Rule of Law','Electoral Systems','Population & Migration','Urbanization & Smart Cities','Climate & Water Resources','Physical & Human Geography'],
     ar:['الأسس الدستورية','مبادئ الديمقراطية','حقوق الإنسان والمواطن','الفصل بين السلطات','سيادة القانون','الأنظمة الانتخابية','السكان والهجرة','التحضر والمدن','المناخ وموارد المياه','الجغرافيا الطبيعية والبشرية']
   },
   prompt:'You teach 9th-grade Civics and Geography: democratic principles, human & civil rights, separation of powers, rule of law, elections; geography: population & migration, urbanization, climate and water resources, and map skills in the student\'s chosen language.'}
];
const subjName = s => s.name[LL()] || s.name.en || s.name.he;
const subjTopics = s => Array.isArray(s.topics) ? s.topics : (s.topics[LL()] || s.topics.en || s.topics.he || []);

/* ---------- store ---------- */
const store = Object.assign({cur:'math', hints:false, subj:{}}, A.safeJSON(localStorage.getItem('lz.lessons')) || {});
const save = () => { try { localStorage.setItem('lz.lessons', JSON.stringify(store)); } catch(_){ A.toast('Storage is full', 'err'); } };
const sd = id => store.subj[id] || (store.subj[id] = {msgs:[], quizzes:[], deck:[]});
const cur = () => SUBJECTS.find(s => s.id === store.cur) || SUBJECTS[0];

function stats(id){
  const d = sd(id), q = d.quizzes.slice(-5);
  const avg = q.length ? Math.round(q.reduce((a, x) => a + x.score / x.total, 0) / q.length * 100) : 0;
  const now = Date.now(), due = d.deck.filter(c => (c.due || 0) <= now).length;
  const mastered = d.deck.length ? d.deck.filter(c => (c.ivl || 0) >= 4).length / d.deck.length : 0;
  const mastery = Math.round(q.length ? avg * .75 + mastered * 25 : mastered * 100 * .5);
  return {avg, count: d.quizzes.length, due, mastery, cards: d.deck.length};
}

/* ---------- layout ---------- */
const view = $('#lessonsView');
let busy = false, ctl = null;
function render(){
  const l = LL(); const rtl = l !== 'en';
  view.dataset.noi18n = '1'; view.dir = rtl ? 'rtl' : 'ltr'; view.lang = l;
  view.innerHTML = `<div class="ls-wrap">
    <aside class="ls-side">
      <div class="ls-brand"><span class="ls-logo">🎓</span><div><b>${L('title')}</b><small>${L('sub')}</small></div></div>
      <div class="ls-subjects" id="lsSubjects" role="tablist"></div>
      <button class="back-btn ls-back" id="lsBack">${L('back')}</button>
    </aside>
    <section class="ls-main">
      <header class="ls-head" id="lsHead"></header>
      <div class="ls-tools" id="lsTools"></div>
      <div class="ls-msgs" id="lsMsgs" role="log" aria-live="polite"></div>
      <form class="ls-composer" id="lsForm" autocomplete="off">
        <textarea id="lsInput" rows="1" dir="auto" placeholder="${esc(L('placeholder'))}"></textarea>
        <button type="submit" class="send" id="lsSend" aria-label="${esc(L('send'))}"><svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z"/></svg></button>
      </form>
    </section></div>`;
  $('#lsBack').onclick = () => A.showView('chat');
  $('#lsForm').onsubmit = e => { e.preventDefault(); const v = $('#lsInput').value.trim(); if (busy){ ctl && ctl.abort(); return; } if (v){ $('#lsInput').value = ''; autosize(); ask(v); } };
  const ta = $('#lsInput');
  ta.addEventListener('input', autosize);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); $('#lsForm').requestSubmit(); } });
  renderSubjects(); renderHead(); renderMsgs();
}
function autosize(){ A.grow($('#lsInput')); }
function renderSubjects(){
  const box = $('#lsSubjects'); box.innerHTML = '';
  SUBJECTS.forEach((s, i) => {
    const st = stats(s.id);
    const tps = subjTopics(s);
    const b = el('button', 'ls-subject' + (s.id === store.cur ? ' on' : ''));
    b.style.setProperty('--h', s.hue); b.style.animationDelay = i * 35 + 'ms';
    b.setAttribute('role', 'tab'); b.dataset.subject = s.id;
    b.innerHTML = `<span class="ls-ic">${s.icon}</span><span class="ls-nm"><b>${esc(subjName(s))}</b><small>${st.count ? st.count + ' ' + L('quizzes') + ' · ' + L('avg') + ' ' + st.avg + '%' : (tps.length + ' ' + L('topics'))}</small><span class="ls-prog"><i style="transform:scaleX(${st.mastery / 100})"></i></span></span>${st.due ? `<span class="ls-due" title="${L('due')}">${st.due}</span>` : ''}`;
    b.onclick = () => { if (busy) return; store.cur = s.id; save(); renderSubjects(); renderHead(); renderMsgs(); };
    box.appendChild(b);
  });
}
function ring(p){ const c = 2 * Math.PI * 22; return `<svg class="ls-ring" viewBox="0 0 52 52"><circle cx="26" cy="26" r="22"/><circle class="v" cx="26" cy="26" r="22" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p / 100)}"/><text x="26" y="30">${p}%</text></svg>`; }
function renderHead(){
  const s = cur(), st = stats(s.id), tps = subjTopics(s);
  const h = $('#lsHead'); h.style.setProperty('--h', s.hue);
  h.innerHTML = `<div class="ls-hicon">${s.icon}</div><div class="ls-htxt"><h2>${esc(subjName(s))}</h2><div class="ls-topics">${tps.map(tp => `<button class="ls-topic" dir="auto">${esc(tp)}</button>`).join('')}</div></div><div class="ls-hstat" title="${L('mastery')}">${ring(st.mastery)}<small>${L('mastery')}</small></div>`;
  $$('.ls-topic', h).forEach(b => b.onclick = () => ask(L('explainAsk') + b.textContent));
  const tl = $('#lsTools');
  const diff = S().quizDifficulty || 'medium';
  tl.innerHTML = `<button data-t="quiz" class="ls-tool primary">📝 ${L('quiz')}</button><button data-t="explain" class="ls-tool">💡 ${L('explain')}</button><button data-t="cards" class="ls-tool">🃏 ${L('cards')}</button><button data-t="summary" class="ls-tool">🧭 ${L('summary')}</button><button data-t="plan" class="ls-tool">🗓 ${L('plan')}</button><button data-t="review" class="ls-tool"${st.due ? '' : ' disabled'}>🔁 ${L('review')}${st.due ? ' <i class="ls-badge">' + st.due + '</i>' : ''}</button>
  <label class="ls-hints"><input type="checkbox" id="lsHints"${store.hints ? ' checked' : ''}> ${L('hints')}</label>
  <select id="lsDiff" class="ls-diff" title="${L('difficulty')}"><option value="easy">${L('easyL')}</option><option value="medium">${L('mediumL')}</option><option value="hard">${L('hardL')}</option></select>
  <button data-t="clear" class="ls-tool ghost" title="${L('clear')}">🗑</button>`;
  $('#lsDiff').value = diff;
  $('#lsDiff').onchange = e => { S().quizDifficulty = e.target.value; A.saveSettings(); };
  $('#lsHints').onchange = e => { store.hints = e.target.checked; save(); };
  tl.onclick = e => {
    const b = e.target.closest('button[data-t]'); if (!b || busy) return;
    const topic = $('#lsInput').value.trim();
    const a = b.dataset.t;
    if (a === 'quiz'){ $('#lsInput').value = ''; makeQuiz(topic); }
    else if (a === 'cards'){ $('#lsInput').value = ''; makeCards(topic); }
    else if (a === 'summary'){ $('#lsInput').value = ''; makeSummary(topic); }
    else if (a === 'explain'){ if (topic){ $('#lsInput').value = ''; ask(L('explainAsk') + topic); } else { $('#lsInput').value = L('explainAsk'); $('#lsInput').focus(); A.toast(L('topicPrompt')); } }
    else if (a === 'plan') ask(L('planAsk').replace('{s}', subjName(cur())));
    else if (a === 'review') review();
    else if (a === 'clear'){
      const go = () => { sd(cur().id).msgs = []; save(); renderMsgs(); };
      const cancel = ({he:'ביטול', ar:'إلغاء', en:'Cancel'}[(A.settings && A.settings().lang)] || 'Cancel');
      (A.confirmDanger ? A.confirmDanger({ title: L('clear') + '?', confirmLabel: L('clear'), cancelLabel: cancel }) : Promise.resolve(false)).then(ok => { if (ok) go(); });
    }
  };
}

/* ---------- messages ---------- */
function renderMsgs(){
  const box = $('#lsMsgs'); box.innerHTML = '';
  const d = sd(cur().id);
  if (!d.msgs.length){
    const w = el('div', 'ls-welcome');
    w.innerHTML = `<div class="ls-wicon">${cur().icon}</div><div class="bubble md" dir="auto"></div>`;
    A.renderMarkdown($('.bubble', w), L('welcome').replace('{s}', subjName(cur())));
    box.appendChild(w);
  }
  d.msgs.forEach(m => box.appendChild(msgEl(m)));
  box.scrollTop = box.scrollHeight;
}
function msgEl(m){
  const row = el('div', 'ls-msg ' + m.role); row.dataset.id = m.id;
  if (m.role === 'user'){ const b = el('div', 'bubble'); b.dir = 'auto'; b.textContent = m.content; row.appendChild(b); return row; }
  if (m.kind === 'quiz'){ row.appendChild(Quiz(m)); return row; }
  if (m.kind === 'cards'){ row.appendChild(Cards(m)); return row; }
  if (m.kind === 'summary'){ row.appendChild(Summary(m)); return row; }
  const b = el('div', 'bubble md'); A.renderMarkdown(b, m.content || ''); row.appendChild(b);
  const acts = el('div', 'msg-actions', `<button data-a="copy">⧉ ${L('copy')}</button><button data-a="speak">🔊 ${L('speak')}</button>`);
  acts.onclick = e => { const x = e.target.closest('button'); if (!x) return; if (x.dataset.a === 'copy') A.copyText(m.content); else A.speak(m.content); };
  row.appendChild(acts);
  return row;
}
function push(m){ const d = sd(cur().id); m.id = m.id || A.uid(); m.ts = Date.now(); d.msgs.push(m); if (d.msgs.length > 120) d.msgs = d.msgs.slice(-120); save(); const w = $('.ls-welcome', $('#lsMsgs')); if (w) w.remove(); const e = msgEl(m); $('#lsMsgs').appendChild(e); scroll(true); return e; }
function scroll(force){ const b = $('#lsMsgs'); if (force || b.scrollHeight - b.scrollTop - b.clientHeight < 240) b.scrollTop = b.scrollHeight; }
function setBusy(v){ busy = v; const s = $('#lsSend'); if (s){ s.classList.toggle('stop', v); } $$('#lsTools button').forEach(b => b.classList.toggle('dim', v)); }

function tutorSystem(extra){
  const s = cur(), lang = LANGN[LL()];
  return [`You are LokiLessons, a warm, encouraging private tutor made by Lokiz Studios (part of Lokizenith AI). Never mention any other AI company or model.`,
    s.prompt,
    `The student is in 9th grade (כיתה ט׳) in Israel. Always reply in ${lang} (unless the subject requires English examples). Use simple, clear language, short paragraphs, Markdown headings, numbered steps, bold key terms, and a concrete example. End with one short check-for-understanding question.`,
    store.hints ? `HINTS MODE IS ON: do NOT give final answers to exercises. Guide with one hint at a time and Socratic questions, and let the student try.` : ``,
    extra || ''].filter(Boolean).join('\n');
}
function history(){
  return sd(cur().id).msgs.slice(-14).map(m => {
    if (m.kind === 'quiz') return {role:'assistant', content:`[Quiz "${m.data.title}" — ${m.data.state && m.data.state.done ? 'score ' + m.data.state.score + '/' + m.data.questions.length : 'in progress'}]`};
    if (m.kind === 'cards') return {role:'assistant', content:'[Flashcards]'};
    if (m.kind === 'summary') return {role:'assistant', content:`[Summary: ${m.data.title}]`};
    return {role: m.role, content: m.content};
  });
}
function working(text){
  const w = el('div', 'ls-msg assistant'); const c = el('div', 'ls-working'); w.appendChild(c);
  $('#lsMsgs').appendChild(w); scroll(true);
  const work = A.Work(c, {words:{working: L('working'), worked: L('worked')}}); work.log(text);
  return {w, work};
}
async function ask(text){
  if (busy) return;
  push({role:'user', content: text});
  setBusy(true); ctl = new AbortController();
  const {w, work} = working('…');
  let bubble = null, latest = '', pend = 0;
  const paint = () => { pend = 0; if (!bubble){ work.root.remove(); bubble = el('div', 'bubble md streaming'); w.appendChild(bubble); } bubble.innerHTML = A.mdToHtml(latest); A.enhance(bubble, null, true); scroll(); };
  try {
    const out = await LZ.chat([{role:'system', content: tutorSystem()}, ...history()], {tier: A.state.model, level: Math.min(A.state.level, 1), signal: ctl.signal, maxTokens: 2200, onStatus: x => work.log(x),
      onToken: (d, full) => { latest = full; if (!pend) pend = setTimeout(() => requestAnimationFrame(paint), 60); }});
    clearTimeout(pend); w.remove(); work.done();
    push({role:'assistant', content: out});
  } catch(e){
    clearTimeout(pend); w.remove();
    push({role:'assistant', content: e.name === 'AbortError' ? (latest || '…') : L('err')});
  }
  setBusy(false); ctl = null; renderSubjects();
}

/* ---------- quiz ---------- */
function normQuiz(j){
  const raw = (j && (j.questions || j.quiz || j.items)) || [];
  const out = [];
  raw.forEach(q => {
    if (!q || !(q.q || q.question)) return;
    const text = String(q.q || q.question).trim();
    let opts = Array.isArray(q.options || q.choices) ? (q.options || q.choices).map(o => String(typeof o === 'object' ? (o.text || o.label || '') : o).trim()).filter(Boolean) : [];
    const type = (q.type === 'open' || opts.length < 2) ? 'open' : 'mc';
    let ans = q.answer ?? q.correct ?? q.answerIndex;
    if (type === 'mc'){
      if (typeof ans === 'string' && /^\d+$/.test(ans.trim())) ans = +ans;
      if (typeof ans === 'string'){
        const a = ans.trim(); let k = opts.findIndex(o => o === a || o.replace(/^[A-Dא-ד][.)]\s*/, '') === a.replace(/^[A-Dא-ד][.)]\s*/, ''));
        if (k < 0 && /^[A-D]$/i.test(a)) k = a.toUpperCase().charCodeAt(0) - 65;
        if (k < 0 && /^[א-ד]$/.test(a)) k = 'אבגד'.indexOf(a);
        ans = k;
      }
      if (typeof ans !== 'number' || ans < 0 || ans >= opts.length) return;
      opts = opts.map(o => o.replace(/^[A-Dא-ד][.)]\s+/, ''));
      out.push({type, q: text, options: opts.slice(0, 6), answer: ans, explanation: String(q.explanation || ''), hint: String(q.hint || ''), distractors: Array.isArray(q.distractors) ? q.distractors.map(String) : []});
    } else {
      if (ans == null || !String(ans).trim()) return;
      out.push({type, q: text, answer: String(ans), explanation: String(q.explanation || ''), hint: String(q.hint || '')});
    }
  });
  return out;
}
async function makeQuiz(topic, fromQuestions){
  if (busy) return;
  const s = cur(), n = Math.max(6, +S().quizLength || 8), diff = S().quizDifficulty || 'medium';
  if (fromQuestions){ push({role:'assistant', kind:'quiz', data:{title: L('retryWrong').replace(/^\S+\s/, ''), questions: fromQuestions, state:{i:0, answers:[]}}}); return; }
  push({role:'user', content: '📝 ' + L('quiz') + (topic ? ': ' + topic : '')});
  setBusy(true); ctl = new AbortController();
  const {w, work} = working(L('makingQuiz'));
  try {
    const mk = (cnt, mcN, part) => tutorSystem(`Now create a quiz. Return ONLY JSON:
{"title":"short quiz title","questions":[{"type":"mc","q":"question","options":["…","…","…","…"],"answer":<index 0-3 of the correct option>,"hint":"a small hint","explanation":"why the answer is correct + the common mistake","distractors":["one short sentence: why option 0 is wrong (empty string for the correct one)","…","…","…"]},{"type":"open","q":"question needing a short written answer","answer":"model answer","hint":"…","explanation":"…"}]}
Exactly ${cnt} questions: ${mcN} multiple-choice and ${cnt - mcN} open.${part} Difficulty: ${diff}. ${topic ? 'Topic: ' + topic + '.' : 'Cover a mix of the main 9th-grade topics of this subject.'} Questions must match the Israeli 9th-grade curriculum, be unambiguous and have exactly one correct option. Before answering, silently double-check every answer key and every grammar/math fact. Write everything in ${LANGN[LL()]}${s.id === 'english' ? ' (questions themselves in English, explanations in ' + LANGN[LL()] + ')' : ''}.`);
    // split into parallel chunks → a fraction of the wait
    const K = n >= 8 ? 3 : 2, mcT = Math.round(n * .7), sizes = [], mcs = [];
    for (let k = 0; k < K; k++) sizes.push(Math.floor(n / K) + (k < n % K ? 1 : 0));
    let mcLeft = mcT; sizes.forEach((c, k) => { const m = k === K - 1 ? Math.min(c, mcLeft) : Math.min(c, Math.max(1, Math.round(c * .7))); mcs.push(m); mcLeft -= m; });
    const FOCUS = topic ? [' Focus on core definitions and basic skills.', ' Focus on applying the ideas (word problems, examples).', ' Focus on deeper understanding and common mistakes.'] : [' Use the FIRST third of the subject\'s main topics.', ' Use the MIDDLE third of the subject\'s main topics.', ' Use the LAST third of the subject\'s main topics.'];
    const ask1 = (sys, extra, k) => LZ.chatJSON([{role:'system', content: sys}, {role:'user', content: (topic || subjName(s)) + (extra || '')}], {tier: A.state.model, maxTokens: 2200, signal: ctl.signal, race: k == null, lane: k, onStatus: x => work.log(x)}).catch(e => { if (e.name === 'AbortError') throw e; return null; });
    const parts = await Promise.all(sizes.map((c, k) => ask1(mk(c, mcs[k], FOCUS[K === 2 ? k * 2 : k]), '', k)));
    let qs = [], qTitle = '';
    parts.forEach(j => { if (!j) return; const got = normQuiz(j); work.log(got.length + ' ✓'); qs = qs.concat(got.filter(g => !qs.some(x => x.q === g.q))); if (j.title && !qTitle) qTitle = j.title; });
    if (qs.length < 6){
      const j = await ask1(mk(n, Math.round(n * .7), ''), ' (follow the JSON schema exactly)');
      if (j){ qs = qs.concat(normQuiz(j).filter(g => !qs.some(x => x.q === g.q))); qTitle = qTitle || j.title; }
    }
    qs = await verifyQuiz(qs, {lang: LL(), tier: A.state.model, signal: ctl.signal, log: x => work.log(x)});
    // keep MC first, open questions after, but interleave lightly
    qs.sort((a, b) => (a.type === 'open') - (b.type === 'open'));
    w.remove(); work.done();
    if (qs.length < 6) throw new Error('few');
    push({role:'assistant', kind:'quiz', data:{title: qTitle || (L('quiz') + ' · ' + subjName(s)), topic, questions: qs.slice(0, Math.max(n, 6)), state:{i:0, answers:[]}}});
  } catch(e){ w.remove(); if (e.name !== 'AbortError') push({role:'assistant', content: e.message === 'few' ? L('minQ') : L('err')}); }
  setBusy(false); ctl = null;
}
/* second pass: an independent solver re-answers every multiple-choice question; disagreements go to a careful tie-break that fixes or drops the question */
async function verifyQuiz(qs, {lang = 'en', tier = 'fera', signal, log = () => {}} = {}){
  const mc = qs.filter(q => q.type === 'mc'); if (!mc.length) return qs;
  log((STR[lang] || STR.en).verifying);
  const drop = new Set(); let fixed = 0, i = 0;
  const one = async q => {
    const opts = q.options.map((o, k) => k + ') ' + o).join('\n');
    let v = null;
    try { v = await LZ.chatJSON([{role:'system', content:'Solve the multiple-choice question yourself, carefully and independently. Return ONLY JSON {"answer":index of the single correct option,"valid":true if exactly one option is correct and the question is unambiguous}'}, {role:'user', content: q.q + '\n' + opts}], {tier:'fera', maxTokens: 300, temperature: 0, signal}); } catch(e){ if (e.name === 'AbortError') throw e; return; }
    if (!v) return;
    const a = +v.answer;
    if (a === q.answer && v.valid !== false) return;
    // disagreement → careful tie-break with the strongest model
    let tb = null;
    try { tb = await LZ.chatJSON([{role:'system', content:`Two graders disagree about this multiple-choice question. Think it through step by step, then return ONLY JSON {"answer":index of the correct option or -1 if none/several are correct,"explanation":"why it is correct, in ${LANGN[lang] || 'English'}","distractors":["why each option is wrong (empty for the correct one)"]}`}, {role:'user', content: `${q.q}
${opts}
Grader A says ${q.answer}; grader B says ${isNaN(a) ? '?' : a}.`}], {tier:'stark', level: 1, maxTokens: 900, temperature: 0, signal}); } catch(e){ if (e.name === 'AbortError') throw e; }
    const f = tb ? +tb.answer : NaN;
    if (!(f >= 0 && f < q.options.length)){ drop.add(q); return; }
    if (f !== q.answer){ q.answer = f; fixed++; if (tb.explanation) q.explanation = String(tb.explanation); if (Array.isArray(tb.distractors)) q.distractors = tb.distractors.map(String); }
  };
  const workers = Array.from({length: Math.min(4, mc.length)}, async () => { while (i < mc.length){ const q = mc[i++]; await one(q); } });
  await Promise.all(workers);
  if (fixed || drop.size) log(`✓ ${mc.length - fixed - drop.size} · ✎ ${fixed} · ✗ ${drop.size}`);
  const out = qs.filter(q => !drop.has(q));
  return out.length >= Math.min(4, qs.length) ? out : qs;
}
/* quiz generation for any topic, used by the chat quiz tool */
async function genQuiz({topic, n = 8, diff = 'medium', lang = 'en', tier = 'fera', signal, log = () => {}}){
  const sys = (cnt, mcN, part) => `You are an expert teacher. Create a quiz about the user's topic. Return ONLY JSON:
{"title":"short quiz title","questions":[{"type":"mc","q":"question","options":["…","…","…","…"],"answer":<index 0-3 of the correct option>,"hint":"a small hint","explanation":"why the answer is correct + the common mistake","distractors":["one short sentence: why option 0 is wrong (empty string for the correct one)","…","…","…"]},{"type":"open","q":"question needing a short written answer","answer":"model answer","hint":"…","explanation":"…"}]}
Exactly ${cnt} questions: ${mcN} multiple-choice and ${cnt - mcN} open.${part} Difficulty: ${diff}. Questions must be factually accurate, unambiguous and have exactly one correct option. Silently double-check every answer key. Write everything in ${LANGN[lang] || 'English'}.`;
  const K = 2, sizes = [Math.ceil(n / 2), Math.floor(n / 2)], mcs = sizes.map(c => Math.max(1, Math.round(c * .75)));
  const FOCUS = [' Focus on core facts and definitions.', ' Focus on understanding, application and common misconceptions.'];
  const parts = await Promise.all(sizes.map((c, k) => LZ.chatJSON([{role:'system', content: sys(c, mcs[k], FOCUS[k])}, {role:'user', content: topic}], {tier, maxTokens: 2200, signal, lane: k, onStatus: log}).catch(e => { if (e.name === 'AbortError') throw e; return null; })));
  let qs = [], title = '';
  parts.forEach(j => { if (!j) return; const got = normQuiz(j); log(got.length + ' ✓'); qs = qs.concat(got.filter(g => !qs.some(x => x.q === g.q))); title = title || j.title; });
  if (qs.length < 4){ const j = await LZ.chatJSON([{role:'system', content: sys(n, Math.round(n * .75), '')}, {role:'user', content: topic + ' (follow the JSON schema exactly)'}], {tier, maxTokens: 3000, signal, onStatus: log}).catch(() => null); if (j){ qs = qs.concat(normQuiz(j)); title = title || j.title; } }
  qs = await verifyQuiz(qs, {lang, tier, signal, log});
  qs.sort((a, b) => (a.type === 'open') - (b.type === 'open'));
  return {title: title || topic, topic, questions: qs.slice(0, n)};
}
function letterOf(i, lg){ lg = lg || LL(); return lg === 'he' ? 'אבגדהו'[i] : lg === 'ar' ? 'أبجدهو'[i] : 'ABCDEF'[i]; }
function letter(i){ return letterOf(i); }
// lessons environment for the shared quiz card (chat passes its own)
function lessonEnv(){ return {lang: LL(), save, scroll, tier: () => A.state.model,
  finish(st, d, qs){ if (!st.recorded){ st.recorded = true; sd(cur().id).quizzes.push({score: st.score, total: qs.length, ts: Date.now(), title: d.title}); } save(); renderSubjects(); renderHead(); },
  retry(qs){ makeQuiz('', qs); }, newQuiz(topic){ makeQuiz(topic || ''); }}; }
function Quiz(m, env){
  env = env || lessonEnv();
  const LL = () => env.lang, L = k => ((STR[env.lang] || STR.en)[k] ?? STR.en[k] ?? k), letter = i => letterOf(i, env.lang), save = env.save, scroll = env.scroll || (() => {});
  const d = m.data, qs = d.questions, st = d.state || (d.state = {i:0, answers:[]});
  const box = el('div', 'quiz');
  const persist = () => save();
  function header(){
    return `<div class="qz-head"><span class="qz-ic">📝</span><b dir="auto">${esc(d.title)}</b><span class="qz-count">${st.done ? '' : L('question') + ' ' + (st.i + 1) + ' ' + L('of') + ' ' + qs.length}</span></div>
    <div class="qz-dots">${qs.map((q, k) => `<i class="${st.answers[k] ? (st.answers[k].correct ? 'ok' : 'bad') : k === st.i && !st.done ? 'cur' : ''}"></i>`).join('')}</div>`;
  }
  function draw(dirn){
    if (st.done) return drawScore();
    const q = qs[st.i], a = st.answers[st.i];
    box.innerHTML = header() + `<div class="qz-card ${dirn ? 'in' : ''}"><div class="qz-type">${q.type === 'mc' ? L('mc') : L('open')}</div><div class="qz-q md" dir="auto"></div>
      ${q.type === 'mc' ? `<div class="qz-opts">${q.options.map((o, k) => `<button class="q-opt" data-k="${k}" dir="auto"><span class="q-l">${letter(k)}</span><span class="q-t"></span></button>`).join('')}</div>` : `<textarea class="qz-open" dir="auto" rows="3" placeholder="${esc(L('typeAnswer'))}"></textarea>`}
      <div class="qz-hint" hidden></div><div class="qz-result" hidden></div>
      <div class="qz-foot">${q.hint ? `<button class="btn-ghost qz-hbtn">💡 ${L('hint')}</button>` : '<span></span>'}<button class="btn-primary qz-check" ${a ? 'hidden' : ''}>${L('check')}</button><button class="btn-primary qz-next" ${a ? '' : 'hidden'}>${st.i === qs.length - 1 ? L('finish') : L('next')} ›</button></div></div>`;
    A.renderMarkdown($('.qz-q', box), q.q);
    let sel = a ? a.given : null;
    if (q.type === 'mc'){
      $$('.q-opt', box).forEach((b, k) => {
        $('.q-t', b).textContent = q.options[k];
        b.style.animationDelay = k * 50 + 'ms';
        b.onclick = () => { if (st.answers[st.i]) return; sel = k; $$('.q-opt', box).forEach(x => x.classList.toggle('sel', x === b)); };
      });
    } else { const ta = $('.qz-open', box); if (a) { ta.value = a.given; ta.disabled = true; } }
    const hb = $('.qz-hbtn', box); if (hb) hb.onclick = () => { const h = $('.qz-hint', box); h.hidden = false; h.textContent = '💡 ' + q.hint; hb.disabled = true; };
    $('.qz-check', box).onclick = async () => {
      const btn = $('.qz-check', box);
      if (q.type === 'mc'){
        if (sel == null){ $('.qz-opts', box).classList.add('shake'); setTimeout(() => $('.qz-opts', box) && $('.qz-opts', box).classList.remove('shake'), 500); return; }
        st.answers[st.i] = {given: sel, correct: sel === q.answer};
      } else {
        const given = $('.qz-open', box).value.trim(); if (!given){ $('.qz-open', box).focus(); return; }
        btn.disabled = true; btn.textContent = L('grading'); $('.qz-open', box).disabled = true;
        let g = null;
        try {
          g = await LZ.chatJSON([{role:'system', content:`You grade a 9th-grade student's short written answer fairly (accept equivalent wording, synonyms, minor spelling mistakes). Return ONLY JSON {"correct":true|false,"score":0..1,"feedback":"1-3 sentences in ${LANGN[LL()]}: if wrong or partial, explain exactly what the mistake is and what was missing; if right, briefly confirm"}`}, {role:'user', content:`Question: ${q.q}\nModel answer: ${q.answer}\nStudent answer: ${given}`}], {tier: env.tier ? env.tier() : A.state.model, maxTokens: 500});
        } catch(_){}
        const ok = g ? (g.correct === true || g.correct === 'true' || +g.score >= .7) : given.toLowerCase().includes(q.answer.toLowerCase());
        st.answers[st.i] = {given, correct: ok, feedback: g && g.feedback ? String(g.feedback) : ''};
      }
      persist(); showResult(); A.sound && A.sound(st.answers[st.i].correct ? 'done' : 'error');
    };
    $('.qz-next', box).onclick = () => { st.i++; if (st.i >= qs.length){ st.done = true; finish(); } persist(); draw(true); };
    if (a) showResult(true);
  }
  function showResult(silent){
    const q = qs[st.i], a = st.answers[st.i];
    const r = $('.qz-result', box); r.hidden = false; r.className = 'qz-result ' + (a.correct ? 'ok' : 'bad') + (silent ? '' : ' pop');
    let html = `<b>${a.correct ? L('correct') : L('wrong')}</b>`;
    if (q.type === 'mc'){
      $$('.q-opt', box).forEach((b, k) => { b.disabled = true; b.classList.toggle('right', k === q.answer); b.classList.toggle('wrongpick', k === a.given && !a.correct); b.classList.toggle('sel', k === a.given); });
      if (!a.correct){ html += `<div>${L('rightAnswer')} <b dir="auto">${esc(letter(q.answer) + '. ' + q.options[q.answer])}</b></div>`; const why = q.distractors && q.distractors[a.given]; if (why) html += `<div dir="auto">✗ ${esc(why)}</div>`; }
    } else {
      if (a.feedback) html += `<div dir="auto">${esc(a.feedback)}</div>`;
      if (!a.correct) html += `<div>${L('rightAnswer')} <span dir="auto">${esc(q.answer)}</span></div>`;
    }
    if (q.explanation) html += `<div class="qz-exp" dir="auto"><b>${L('why')}</b> ${esc(q.explanation)}</div>`;
    r.innerHTML = html;
    $('.qz-check', box).hidden = true; const nx = $('.qz-next', box); nx.hidden = false; if (!silent) nx.focus({preventScroll:true});
    $$('.qz-dots i', box).forEach((d2, k) => { d2.className = st.answers[k] ? (st.answers[k].correct ? 'ok' : 'bad') : k === st.i ? 'cur' : ''; });
    scroll();
  }
  function finish(){
    st.score = st.answers.filter(a => a && a.correct).length;
    env.finish(st, d, qs);
  }
  function drawScore(){
    const sc = st.score ?? st.answers.filter(a => a && a.correct).length, pct = Math.round(sc / qs.length * 100);
    const msg = pct === 100 ? L('perfect') : pct >= 80 ? L('great') : pct >= 55 ? L('ok') : L('low');
    const c = 2 * Math.PI * 52;
    box.innerHTML = header() + `<div class="qz-score in"><div class="qz-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/><circle class="v" cx="60" cy="60" r="52" stroke-dasharray="${c}" stroke-dashoffset="${c}"/></svg><div class="qz-pct"><b>0</b>%<small>${sc}/${qs.length}</small></div></div>
      <h3>${L('score')}</h3><p>${msg}</p>
      <div class="qz-review"><h4>${L('reviewTitle')}</h4>${qs.map((q, k) => { const a = st.answers[k] || {}; return `<div class="qr ${a.correct ? 'ok' : 'bad'}"><span class="qr-i">${a.correct ? '✓' : '✗'}</span><div><div class="qr-q" dir="auto">${esc(q.q)}</div>${a.correct ? '' : `<div class="qr-a" dir="auto">${L('yourAnswer')} ${esc(q.type === 'mc' ? (q.options[a.given] ?? '—') : (a.given || '—'))}</div><div class="qr-c" dir="auto">${L('rightAnswer')} ${esc(q.type === 'mc' ? q.options[q.answer] : q.answer)}</div>`}</div></div>`; }).join('')}</div>
      <div class="qz-foot">${sc < qs.length ? `<button class="btn-primary qz-retry">${L('retryWrong')}</button>` : ''}<button class="btn-ghost qz-new">${L('newQuiz')}</button></div></div>`;
    requestAnimationFrame(() => { const v = $('.qz-ring .v', box); if (v) v.style.strokeDashoffset = c * (1 - pct / 100); });
    const num = $('.qz-pct b', box), t0 = performance.now();
    const step = () => { const k = Math.min(1, (performance.now() - t0) / 1100); num.textContent = Math.round(pct * (1 - Math.pow(1 - k, 3))); if (k < 1 && num.isConnected) requestAnimationFrame(step); };
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

/* ---------- flashcards (spaced repetition, SM-2 lite) ---------- */
async function makeCards(topic){
  if (busy) return;
  const s = cur();
  push({role:'user', content: '🃏 ' + L('cards') + (topic ? ': ' + topic : '')});
  setBusy(true); ctl = new AbortController();
  const {w, work} = working(L('makingCards'));
  try {
    const j = await LZ.chatJSON([{role:'system', content: tutorSystem(`Create 10 study flashcards. Return ONLY JSON {"cards":[{"front":"short question or term","back":"concise answer/definition (max 30 words)"}]}. ${topic ? 'Topic: ' + topic + '.' : 'Key 9th-grade concepts of this subject.'} Language: ${LANGN[LL()]}.`)}, {role:'user', content: topic || subjName(s)}], {tier: A.state.model, maxTokens: 2000, signal: ctl.signal, onStatus: x => work.log(x)});
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
function grade(card, q){ // q: 0 again, 1 hard, 2 good, 3 easy
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
    <div class="fc-grade" hidden><button data-q="0" class="g0">${L('again')}</button><button data-q="1" class="g1">${L('hard')}</button><button data-q="2" class="g2">${L('good')}</button><button data-q="3" class="g3">${L('easy')}</button></div>`;
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
  push({role:'user', content: '🧭 ' + L('summary') + (topic ? ': ' + topic : '')});
  setBusy(true); ctl = new AbortController();
  const {w, work} = working(L('makingSummary'));
  try {
    const j = await LZ.chatJSON([{role:'system', content: tutorSystem(`Write a study summary as JSON ONLY: {"title":"","intro":"1-2 sentences","sections":[{"icon":"one emoji","heading":"","points":["short bullet","…"]}],"keyTerms":[{"term":"","def":"max 15 words"}],"mindmap":{"center":"topic","branches":[{"label":"","children":["",""]}]}}. 4-6 sections, 3-5 points each, 5-8 key terms, 4-6 branches with 2-4 children. ${topic ? 'Topic: ' + topic + '.' : 'Overview of the main 9th-grade material.'} Language: ${LANGN[LL()]}.`)}, {role:'user', content: topic || subjName(s)}], {tier: A.state.model, maxTokens: 3000, signal: ctl.signal, onStatus: x => work.log(x)});
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

window.Lessons = {Quiz, genQuiz, verifyQuiz, normQuiz, STR, confetti, onShow(){ render(); setTimeout(() => $('#lsInput') && innerWidth > 820 && $('#lsInput').focus(), 50); }, refresh(){ if (view.innerHTML) render(); }, SUBJECTS, makeQuiz, ask};
render();
})();
