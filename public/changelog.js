/* Lokizenith AI — Changelog. Made by Lokiz Studios.
 *
 * ⚠️ EVERY FUTURE UPDATE MUST UPDATE TODAY'S ENTRY IN-PLACE IF AN ENTRY FOR
 *    TODAY ALREADY EXISTS, OR ADD A NEW TOP ENTRY IF IT IS A NEW DAY.
 *    Use `window.Changelog.recordUpdateForToday({ title, new, fixed, changed })`
 *    or edit today's top entry directly so there is never more than 1 entry per day.
 */
(function(){
'use strict';
const TODAY_ISO = new Date().toISOString().slice(0, 10);
const CHANGELOG = [
  {version:'2.6', date: TODAY_ISO, title:'Subscription Plans (Free, Pro & Ultimate), PayPal Instant Sync, Animated Video Banners, Smooth Typewriter Chat, Enlarged Settings, Profiles & Voice Calls',
   new:[
     'Subscription Plans Studio (Replaced Benches with Plans): compare Loki Free ($0/Month), Loki Pro ($7.99/Month with 5× more usage — 125,000 tokens, 15 daily images/16h, 52 LokiCode generations/4h, 85 Lokizen 4.0 Stark messages/6h, 25 file/photo attachments/4h, 12 weekly shared chats, Animated Backgrounds & 4s Video Profile Banner), and Loki Ultimate ($12.99/Month or $5.00/Month prorated upgrade from Pro + one-time 3-Day Free Trial with Unlimited usage, images, LokiCode, Stark & attachments, Ultra Thinking Mode at Turbo speed, and AI Design Studio)',
     'Instant PayPal Subscription Activation & Cancelation Retention: integrated live PayPal Subscription checkout with instant plan activation upon PayPal approval, automatic lower-tier unobtainable lockouts, and cancelation support that preserves your active plan benefits until the end of your billing cycle',
     'Plan Tier Tags (FREE / PRO / ✦ ULTIMATE) & Admin Plan Manager: live plan tags next to your username in the Topbar, Sidebar, Profile Studio, Public Profile, and Admin Directory, plus Admin ability to assign any plan or Special Stark Authorization to any user (including self) without payment',
     'User Profile Studio & 4-Second Looping Video Banners: customize your circular Profile Picture, 600 × 240 image or silent looping 4-second video Banner (Pro+), Display Name (1st change free + 14-day cooldown), Bio, and animated overlays',
     'Team Chat 1000× Redesign: live Group Voice Calls with full-screen incoming call popup (Join / Decline), volume-reactive talking avatar pulse, per-user Local Mute, live Screen Sharing, purple waveform voice messages, and @mention autocomplete',
     'Share Conversation via Unique Link & MATLAB in LokiCode: generate shareable conversation copy links (resets Friday 3:00 PM EST) and compile MATLAB + 8 other languages with interactive stdin input'
   ],
   fixed:[
     'Fixed LokiCode button interactivity and restored full action bar responsiveness across all 9 languages',
     'Fixed AI Chat answers occasionally stopping early or failing by eliminating premature chunk-watchdog aborts and adding multi-layer live streaming failover',
     'Formula Calculator now evaluates every scalar, vector, derivative, and phase-gradient formula in real time inside a spacious unclipped formula box',
     'Admin Command Suite navigation tabs and badges redesigned so buttons and counters never collide or overlap'
   ],
   changed:[
     'AI Chat answers now type out smoothly with fast progressive typewriter streaming (at least 3 seconds of fluid writing) instead of appearing all at once',
     'Settings modal significantly enlarged into a wide, spacious multi-page studio where each section opens on its own dedicated page',
     'Changelog system automatically merges all same-day updates into today’s single changelog entry'
   ]},
  {version:'2.5', date:'2026-11-13', title:'WebSocket Live Sync, Turbo Intelligence Boost, Formula Calculator, Invite Rewards & Auto-Stop Dictation',
   new:[
     'WebSocket real-time synchronization for Team Chat and LokiCode Teams with instant live cursor indicators, reconnect sync, and zero-refresh updates',
     'Formula Calculator tool (Labs, Plus menu, /formula command & inline chat cards) — prompt any formula in math, physics, engineering, finance or everyday domains and calculate interactively with KaTeX rendering',
     'Invite Friends (+25k) sharing system: share your personal referral link so every new account registered through your link automatically awards you +25,000 bonus tokens live',
     'Optional Internet Topic Images: answers about real-world landmarks, animals, science, history, architecture, and places can now attach verified web photos with lightbox & credits',
     'Smart auto-stop voice dictation: improved prompt speech-to-text with Voice Activity Detection that automatically ends recording once you finish speaking'
   ],
   fixed:[
     'Bonus tokens now dynamically expand your active cycle quota ceiling (x / new limit) and cleanly return to the base cycle quota after automatic or admin resets',
     'Updated AI knowledge base with official Lokizenith Studios creator & model architecture attribution (Elad Benczel / אלעד בנצל)'
   ],
   changed:[
     'Turbo reasoning & flagship responses upgraded to Gemini 4 Hydrogen next-gen reasoning tiers with parallel failover for significantly higher accuracy and faster delivery',
     'Base usage limit updated to 25,000 tokens per 6-hour cycle; valid gift codes and developer codes are now strictly private during redemption'
   ]},
  {version:'2.4', date:'2026-11-13', title:'Accounts, Live Quota, Gift/Dev Codes, Real-Time Teams & Turbo LokiCode',
   new:[
     'First-visit Log In & Create Account screen with unique Username and Password authentication saved on the server across devices and retained on refresh',
     'Live Usage Remaining progress bar right below Settings displaying % remaining, tokens left, and a live 6-hour reset countdown',
     '0% limit enforcement with quick Gift Code (single-use per account) and unlimited DEV CODE redemption buttons',
     'Lokizenith Admin top bar control ("Reset limit for all") with confirmation dialog that resets every user in real time and displays a live popup with OK',
     'Real-Time Team Chat: create rooms, share with accounts, collaborate live with @ai / Ask AI, and creator access removal',
     'Real-Time LokiCode Teams: create teams, add or remove members, and watch code edits and AI generations update instantaneously for the whole team',
     'Shared Hub & Notifications bell: share chats and code snippets directly with users or publicly, with Like and 1-click Fork into LokiCode'
   ],
   fixed:[
     'Account conversations, settings, LokiCode workspace and code history now sync automatically to the server per account'
   ],
   changed:[
     'LokiCode upgraded to true real-time SSE streaming with instant frame-synced syntax highlighting — dramatically faster code creation and delivery',
     'Moved Shared Hub to the top bar and removed LokiLessons and the floating mascot for a cleaner workspace with ample space for chat history'
   ]},
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
  document.querySelectorAll('.whatsnew').forEach(el => el.remove());
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
      if (seen() === LATEST || document.querySelector('#changelogModal:not([hidden])')) return;
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
function recordUpdateForToday(patch = {}){
  const todayStr = new Date().toISOString().slice(0, 10);
  const dedupe = (a = [], b = []) => {
    const out = [];
    const seenSet = new Set();
    for (const item of [...a, ...b]){
      const k = String(item || '').trim();
      if (!k || seenSet.has(k.toLowerCase())) continue;
      seenSet.add(k.toLowerCase());
      out.push(k);
    }
    return out;
  };
  if (CHANGELOG.length && CHANGELOG[0].date === todayStr){
    const top = CHANGELOG[0];
    if (patch.title) top.title = patch.title;
    top.new = dedupe(patch.new || [], top.new || []);
    top.fixed = dedupe(patch.fixed || [], top.fixed || []);
    top.changed = dedupe(patch.changed || [], top.changed || []);
    return top;
  }
  const nextVer = (parseFloat(CHANGELOG[0]?.version || '2.6') + 0.1).toFixed(1);
  const created = {
    version: patch.version || nextVer,
    date: todayStr,
    title: patch.title || 'Lokizenith AI Update',
    new: dedupe(patch.new || []),
    fixed: dedupe(patch.fixed || []),
    changed: dedupe(patch.changed || [])
  };
  CHANGELOG.unshift(created);
  return created;
}
window.Changelog = {open, CHANGELOG, LATEST, recordUpdateForToday};
init();
})();
