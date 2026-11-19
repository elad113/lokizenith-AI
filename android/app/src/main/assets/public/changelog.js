/* Lokizenith AI — Changelog. Made by Lokiz Studios.
 *
 * ⚠️ EVERY FUTURE UPDATE MUST ADD AN ENTRY TO THE TOP OF `CHANGELOG` BELOW
 *    (version, date, title, and new / fixed / changed lists). The "What's new"
 *    toast + badge is shown once per new version, based on CHANGELOG[0].version.
 */
(function(){
'use strict';
const CHANGELOG = [
  {version:'2.3', date:'2026-11-04', title:'Turbo thinking, 12K tokens & supercharged LokiCode',
   new:[
     'Token usage limit raised to 12,000 tokens with automatic reset every 6 hours',
     'Image creation now tracks token spending with 0% limit enforcement',
     'Thinking modes upgraded to modern dropdown with a brand-new “Turbo” mode (10× faster answers with great reasoning) and “Recommended” badge on High',
     'LokiCode supercharged: generates complete scripts of tens or hundreds of lines with an automated syntax/error verification pass before writing',
     'LokiCode editor and page are now fully and infinitely scrollable with line numbers',
     'Loki mascot actively suggests prompt ideas and speaks fresh AI suggestions every 8 seconds',
     'Design Assistant now includes a Refresh button that asks the AI for fresh tailored design ideas'
   ],
   fixed:[
     'Code page scrolling fixed — now supports infinite scrolling on large multi-hundred-line programs',
     'LSL script generation now produces 100% complete, fully working and compilable Second Life scripts'
   ],
   changed:[
     'Thinking level control converted from horizontal track to sleek dropdown menu with detailed mode descriptions'
   ]},
  {version:'2.2', date:'2026-11-04', title:'Places, maps, mascot & a lot more',
   new:[
     'Location & Places: find the best restaurants, museums, cafés and more near you, with photos, distance, hours, phone and website',
     'Navigate: interactive map with the route from your location, car / walking toggle, ETA, turn-by-turn steps and “Start in Google Maps”',
     'Quizzes in regular chat — “create a quiz about …” gives the same interactive quiz as LokiLessons',
     '8 new animated backgrounds: Aurora, Warp, Bokeh, Waves, Horizon, Fireflies, Hex pulse and Orbits',
     'Design assistant in Settings — describe a look or a new background and it is applied live; saved as Custom designs with toggle / undo / delete',
     'Loki, the animated mascot: blinks, follows your cursor, looks around, walks along the message box, thinks while working, talks while answering, celebrates, waves and joins voice calls (Settings → Mascot)',
     'LokiCode interactive terminal: programs that ask for input (Python input(), C++ cin, JS prompt) let you type right in the output window',
     '10 new tools: Weather, Currency converter, Unit converter, QR codes, Timers & reminders, Regex tester, Diagrams, Recipe from ingredients, Text recognition (OCR) and Color palette from image',
     'This changelog, with a “What’s new” badge for every update',
     'Full mobile polish: compact top bar, slide-in sidebar with swipe to close, bottom-sheet dialogs, safe-area support'
   ],
   fixed:[
     'The Working label is now translated inside the Hebrew LokiLessons view',
     'Quiz answer keys are verified in a second pass — wrong keys are fixed or the question is replaced',
     'Composer on phones: the mode chip no longer squeezes the message box'
   ],
   changed:[
     'Timers everywhere use one format: 42s · 1m 36s · 2m 30s (Working, Worked, image ETA, LokiCode, lessons)'
   ]},
  {version:'2.1', date:'2026-11-04', title:'3× faster, lessons, widgets & voice calls',
   new:[
     'Answers stream word by word — about 3× faster',
     'Beautiful animated image placeholder with a live ETA',
     'LokiLessons: 9th-grade tutor (Hebrew by default) with quizzes, AI-graded open answers, flashcards with spaced repetition, summaries and mind maps',
     'Interactive widgets in chat (calculators, games, simulators) with fullscreen, new tab and download',
     'Interface in English, Hebrew and Arabic with full right-to-left support',
     'Live voice call with captions',
     'LokiCode: Kotlin and LSL (Second Life) with highlighting and a simulated run',
     '5 more Labs: Math Solver, Translator, Mind Map, Doc Q&A and URL Summarizer'
   ],
   fixed:['Long quizzes no longer time out', 'Language switching back to English', 'Ending a voice call no longer shows an error'],
   changed:['More settings and smoother animations']},
  {version:'2.0', date:'2026-11-03', title:'Fera & Stark',
   new:[
     'Two models: Lokizenith 3.5 Fera (fast, default) and Lokizen 4.0 Stark (images, web search, PowerPoint and files)',
     'Thinking levels: Medium, High, Extra High and Ultra',
     'The Working indicator with a live timer and an activity log',
     'LokiCode — describe it, watch it get written, run it',
     'Settings: accent color, background, fonts, voice and more',
     'Labs with 5 features: Voice Mode, Prompt Enhancer, Deep Research, Site Builder and Chart Studio'
   ],
   fixed:[],
   changed:['Brand-new green animated design']},
  {version:'1.1', date:'2026-11-02', title:'Reliable conversations',
   new:['Multiple backup engines with automatic fallback'],
   fixed:['Chats no longer stop answering after 2 messages'],
   changed:[]},
  {version:'1.0', date:'2026-11-01', title:'First release',
   new:['Lokizenith AI chat site', 'Chat history saved on your device'],
   fixed:[], changed:[]}
];
const A = () => window.App;
const t = s => window.I18N ? I18N.t(s) : s;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LATEST = CHANGELOG[0].version;
const seen = () => localStorage.getItem('lz.seenVersion');
function fmtDate(d){ try { return new Date(d + 'T12:00:00').toLocaleDateString(document.documentElement.lang || undefined, {day:'numeric', month:'short', year:'numeric'}); } catch(_){ return d; } }
function ensureModal(){
  let m = document.getElementById('changelogModal'); if (m) return m;
  m = document.createElement('div'); m.className = 'modal'; m.id = 'changelogModal'; m.hidden = true;
  m.innerHTML = `<div class="modal-card wide cl-card"><div class="modal-head"><h2>🗒 ${esc(t('Changelog'))}</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div><div class="modal-body" id="clBody"></div></div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) A().closeModal('changelogModal'); });
  return m;
}
function sec(cls, icon, label, list){
  if (!list || !list.length) return '';
  return `<div class="cl-sec ${cls}"><h4>${icon} ${esc(t(label))}</h4><ul>${list.map(x => `<li dir="auto">${esc(t(x))}</li>`).join('')}</ul></div>`;
}
function open(){
  ensureModal();
  const b = document.getElementById('clBody');
  b.innerHTML = `<p class="cl-intro">${esc(t('Every update to Lokizenith AI, from the very beginning.'))}</p><div class="cl-timeline">${CHANGELOG.map((v, i) => `
    <article class="cl-item${i === 0 ? ' latest' : ''}" style="--d:${i * 90}ms">
      <div class="cl-dot"></div>
      <div class="cl-box">
        <div class="cl-top"><span class="cl-ver">v${esc(v.version)}</span>${i === 0 ? `<span class="cl-new">${esc(t('Latest'))}</span>` : ''}<span class="cl-date">${esc(fmtDate(v.date))}</span></div>
        <h3 dir="auto">${esc(t(v.title))}</h3>
        ${sec('n', '✨', 'New', v.new)}${sec('f', '🛠', 'Fixed', v.fixed)}${sec('c', '🔄', 'Changed', v.changed)}
      </div>
    </article>`).join('')}</div>`;
  A().openModal('changelogModal');
  localStorage.setItem('lz.seenVersion', LATEST); badge();
}
function badge(){ const b = document.getElementById('openChangelog'); if (b) b.classList.toggle('has-new', seen() !== LATEST); }
function init(){
  const b = document.getElementById('openChangelog');
  if (b) b.onclick = () => { open(); document.body.classList.remove('sb-open'); };
  badge();
  if (seen() !== LATEST){
    setTimeout(() => {
      if (seen() === LATEST) return;
      const tt = document.createElement('div'); tt.className = 'whatsnew';
      tt.innerHTML = `<span class="wn-ic">🎉</span><span><b>${esc(t("What's new in"))} v${LATEST}</b><small dir="auto">${esc(t(CHANGELOG[0].title))}</small></span><button class="btn-primary">${esc(t('See updates'))}</button><button class="wn-x" aria-label="Dismiss">✕</button>`;
      document.body.appendChild(tt);
      const close = () => { tt.classList.add('out'); setTimeout(() => tt.remove(), 400); };
      tt.querySelector('.btn-primary').onclick = () => { close(); open(); };
      tt.querySelector('.wn-x').onclick = () => { localStorage.setItem('lz.seenVersion', LATEST); badge(); close(); };
      setTimeout(() => tt.isConnected && close(), 12000);
    }, 2500);
  }
}
window.Changelog = {open, CHANGELOG, LATEST};
init();
})();
