/* Lokizenith AI — app shell. made by Lokiz Studios */
(function(){
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function el(tag, cls, html){ const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const isHeb = s => /[\u0590-\u05FF]/.test(s || '');
const LOGO_SVG = '<svg viewBox="0 0 64 64" fill="none"><circle class="lz-orbit-outer" cx="32" cy="32" r="28" stroke="currentColor" stroke-opacity="0.55" stroke-width="1.6" stroke-dasharray="10 6 3 6"/><path d="M21 16.5V45.5H43.5" stroke="currentColor" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M31.5 23H44.5L32.5 36H45" stroke="currentColor" stroke-opacity="0.65" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="44.5" cy="19.5" r="4.4" fill="currentColor"/></svg>';
const CLOCK_SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

/* ================= MODELS ================= */
const MODELS = {
  fera:  {id:'fera',  name:'Lokizenith 3.5 Fera', icon:'◆', blurb:'Fast everyday model. Chats, sees images and reads your files.'},
  stark: {id:'stark', name:'Lokizen 4.0 Stark',   icon:'⚡', blurb:'Upgraded flagship. Smarter & faster, plus images, web search, PowerPoint and file creation.'}
};
const THINK_LEVELS = [
  {id:0, name:'Turbo', icon:'⚡', blurb:'10× faster response, instant sharp reasoning', recommended:false},
  {id:1, name:'Medium', icon:'◆', blurb:'Balanced everyday reasoning & speed', recommended:false},
  {id:2, name:'High', icon:'✦', blurb:'Deep analysis & comprehensive reasoning', recommended:true},
  {id:3, name:'Extra High', icon:'★', blurb:'Drafts, self-reviews and refines', recommended:false},
  {id:4, name:'Ultra', icon:'👑', blurb:'Faster than Turbo · Zero UI clutter · Superior precision · Ultimate Exclusive', recommended:false}
];
const LEVELS = ['Turbo','Medium','High','Extra High','Ultra'];
const ANSWER_LENGTHS = [
  {id:'short', name:'Short', icon:'⚡', blurb:'A concise, high-signal answer in a few sentences.'},
  {id:'medium', name:'Medium', icon:'✎', blurb:'Not long, not short — a bit detailed, with the key points covered.', recommended:true},
  {id:'detailed', name:'Detailed', icon:'📘', blurb:'Thorough explanation with context, nuance, and worked examples when useful.'},
  {id:'long', name:'Long', icon:'📚', blurb:'A full, in-depth answer: background, steps, examples, edge cases, and a clear conclusion.'}
];
const ANSWER_LENGTH_TOKENS = {short:500, medium:1400, detailed:4600, long:8192};
const ANSWER_LENGTH_PROMPT = {
  short: 'ANSWER LENGTH: SHORT (hard rule). Reply in 1-3 sentences (about 60 words max). Lead with the direct answer. No headings, lists, tables, examples or widgets unless explicitly asked. Do not pad.',
  medium: 'ANSWER LENGTH: MEDIUM (not long, not short, a bit detailed). About 120-280 words: a direct one-line answer first, then the key explanation as short paragraphs or a tight bullet list (a small table if comparing), with the key terms in bold, and a one-line takeaway for multi-part questions. No multi-section essays, at most 2 short headings.',
  detailed: 'ANSWER LENGTH: DETAILED. A thorough, well-structured answer of roughly 400-800 words: a direct answer first, then short ## headings for the why and how, at least one worked example when possible, a comparison table where it helps, important caveats, and a closing **Bottom line** / **בשורה התחתונה** with the conclusion.',
  long: 'ANSWER LENGTH: LONG (very extensive). A full, in-depth response of 1200+ words: direct answer, rich background, step-by-step reasoning, multiple concrete examples, comparisons or alternatives, practical guidance, limitations, and a clear conclusion, organised with markdown headings, lists and tables. Never stop at a short overview.'
};
const FEATURE_BUILTIN = ['image', 'image-edit', 'video', 'search', 'slides', 'file', 'widget'];
const FEATURE_INFO = {
  image:        {icon:'🎨', label:'Image creation'},
  'image-edit': {icon:'🖌️', label:'Photo Editor'},
  video:        {icon:'🎬', label:'AI Video Generator'},
  search:       {icon:'🌐', label:'Web search'},
  slides:       {icon:'📊', label:'PowerPoint creation'},
  file:         {icon:'📄', label:'File creation & download'},
  research:     {icon:'🔭', label:'Deep Research'},
  widget:       {icon:'✦', label:'Interactive widget'},
  docqa:        {icon:'📑', label:'Document Q&A'},
  url:          {icon:'🔗', label:'URL Summarizer'},
  site:         {icon:'🏗', label:'Site Builder'},
  chart:        {icon:'📈', label:'Chart Studio'},
  'deep-search': {icon:'🔭', label:'Deep search (100+ sites)'},
  'video-analyze': {icon:'🎥', label:'Video analysis'},
  compare: {icon:'🪞', label:'Compare photos'},
  a11y: {icon:'♿', label:'Accessible description'}
};

function getUserPlanTier(){
  const u = window.LZAuth && LZAuth.getUser ? LZAuth.getUser() : null;
  if (!u) return 'free';
  return String(u.plan || u.effectivePlan || u.planTier || 'free').toLowerCase();
}
function getUserQuotas(){
  const u = window.LZAuth && LZAuth.getUser ? LZAuth.getUser() : null;
  return (u && u.featureQuotas) ? u.featureQuotas : null;
}
function isStarkLockedForUser(){
  const u = window.LZAuth && LZAuth.getUser ? LZAuth.getUser() : null;
  if (!u) return false;
  if (u.isUnlimited || u.starkAuthorized) return false;
  const plan = getUserPlanTier();
  if (plan === 'ultimate') return false;
  const q = u.featureQuotas;
  const starkQ = q && q.stark ? q.stark : null;
  if (starkQ){
    if (starkQ.unlimited) return false;
    if (starkQ.exhausted || (typeof starkQ.remaining === 'number' && starkQ.remaining <= 0)){
      return true;
    }
  }
  if (q && typeof q.starkMessagesRemaining === 'number' && q.starkMessagesRemaining <= 0){
    return true;
  }
  return false;
}
function refreshPlanLocks(){
  const plan = getUserPlanTier();
  if (isStarkLockedForUser() && state.model === 'stark'){
    setModel('fera', true);
  } else {
    renderModelMenu();
  }
  if (plan !== 'ultimate' && state.level === 4){
    setLevel(2, true);
  } else {
    renderThinkMenu();
  }
  if (typeof renderLengthMenu === 'function') renderLengthMenu();
}

/* ================= SETTINGS ================= */
const DEFAULTS = {
  accent:'#00ff9c', bgStyle:'flow', bgIntensity:1, reduceMotion:false, fontSize:15, chatWidth:'normal',
  sendOnEnter:true, sounds:true, soundVolume:0.6, typewriter:true, defaultModel:'fera', defaultLevel:2,
  name:'', userRole:'', persona:'balanced', responseFormat:'auto', emojiLevel:'light', avoidTopics:'',
  aboutMe:'', howRespond:'', voiceLang:'auto', autoSpeak:false, showTimer:true,
  lang: detectLang(), replyInLang:true, perfMode:false, animSpeed:1, bubbleStyle:'glass', fontFamily:'inter',
  compact:false, autoScroll:true, voiceName:'', voiceRate:1, voicePitch:1, callSilence:1.2, callCaptions:true,
  quizDifficulty:'medium', quizLength:8, lessonLang: detectLang(), workStyle:'nebula', uiTheme:'emerald',
  answerLength:'medium'
};
function detectLang(){ const l = (navigator.language || 'en').toLowerCase(); return l.startsWith('he') || l.startsWith('iw') ? 'he' : l.startsWith('ar') ? 'ar' : 'en'; }
const LANG_NAME = {en:'English', he:'Hebrew', ar:'Arabic'};
const t = s => (window.I18N ? I18N.t(s) : s);
let S = Object.assign({}, DEFAULTS, safeJSON(localStorage.getItem('lz.settings')) || {});
if (S.lang && ['en', 'he', 'ar'].includes(S.lang)) S.lessonLang = S.lang;
function safeJSON(s){ try { return JSON.parse(s); } catch(_){ return null; } }
function saveSettings(){ localStorage.setItem('lz.settings', JSON.stringify(S)); window.LZAuth && LZAuth.scheduleSync && LZAuth.scheduleSync(); }
const state = {
  model: localStorage.getItem('lz.model') || S.defaultModel,
  level: +(localStorage.getItem('lz.level') ?? S.defaultLevel) || 0,
  answerLength: localStorage.getItem('lz.answerLength') || S.answerLength || 'medium',
  // Deep search is a one-shot, explicit choice (+ menu → Deep search). Never restored from storage.
  deepSearch: false,
  convs: [], current: null, busy: false, ctl: null, attachments: [], mode: null, view: 'chat',
  // BUI-18: turns keep running when you switch chats; remote = answers generating on the server (other tab/device or after reload)
  turns: new Map(), remoteGens: new Map()
};
function hexToRgb(h){ h = h.replace('#',''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n>>16)&255, (n>>8)&255, n&255]; }
function applySettings(){
  const r = document.documentElement.style;
  const [R,G,B] = hexToRgb(S.accent);
  r.setProperty('--acc', S.accent); r.setProperty('--acc-rgb', `${R},${G},${B}`);
  r.setProperty('--acc2', `rgb(${Math.round(R*.75)},${Math.round(G*.78)},${Math.round(B*.76)})`);
  r.setProperty('--acc3', `rgb(${Math.round(R+(255-R)*.5)},${Math.round(G+(255-G)*.5)},${Math.round(B+(255-B)*.5)})`);
  r.setProperty('--fs', S.fontSize + 'px');
  r.setProperty('--chat-w', {narrow:'680px', normal:'820px', wide:'1060px'}[S.chatWidth] || '820px');
  r.setProperty('--bg-int', S.bgIntensity);
  document.body.classList.toggle('reduce-motion', !!S.reduceMotion);
  document.body.classList.toggle('bg-off', S.bgStyle === 'off');
  document.body.classList.toggle('perf', !!S.perfMode);
  document.body.classList.toggle('compact', !!S.compact);
  ['glass', 'solid', 'minimal'].forEach(b => document.body.classList.toggle('bubble-' + b, S.bubbleStyle === b));
  const ws = ['nebula', 'cyber', 'aurora', 'classic'].includes(S.workStyle) ? S.workStyle : 'nebula';
  document.documentElement.dataset.workStyle = ws;
  $$('.work').forEach(w => { if (!w.dataset.previewLock) w.dataset.wstyle = ws; });
  r.setProperty('--font', {inter:"'Inter',system-ui,sans-serif", system:'system-ui,-apple-system,"Segoe UI",sans-serif', rubik:"'Rubik',system-ui,sans-serif", mono:"'JetBrains Mono',monospace"}[S.fontFamily] || "'Inter',system-ui,sans-serif");
  if (S.fontFamily === 'rubik' && !document.getElementById('rubikFont')){ const l = document.createElement('link'); l.id = 'rubikFont'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap'; document.head.appendChild(l); }
  r.setProperty('--spd', String(1 / Math.max(.25, +S.animSpeed || 1)));
  document.documentElement.dataset.lzTheme = S.uiTheme || 'emerald';
  if (S.lang && ['en', 'he', 'ar'].includes(S.lang)) S.lessonLang = S.lang;
  if (window.I18N) I18N.setLang(S.lang);
  if (window.Lessons && Lessons.refresh) Lessons.refresh();
  BG.configure();
}

/* ================= UTIL UI ================= */
function toast(msg, kind){
  const t = el('div', 'toast' + (kind === 'err' ? ' err' : ''), (kind === 'err' ? '⚠️ ' : '✓ ') + esc(msg));
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2600);
}
function sound(kind){
  // BUI-21: shared WebAudio sound kit (public/sfx.js) — respects Settings → Sounds + volume, throttled.
  if (!S.sounds) return;
  try { if (window.LZSfx) window.LZSfx.play(kind); } catch(_){}
}
function download(data, name, mime){
  const a = document.createElement('a');
  let url = data;
  if (!(typeof data === 'string' && data.startsWith('data:'))){
    const blob = data instanceof Blob ? data : new Blob([data], {type: mime || 'text/plain;charset=utf-8'});
    url = URL.createObjectURL(blob);
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  }
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  toast('Downloaded ' + name);
}
async function copyText(t){
  try { await navigator.clipboard.writeText(t); }
  catch(_){ const ta = el('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast('Copied to clipboard'); sound('copy');
}
/* one duration format everywhere: 0.4s · 42s · 1m 36s · 2m 30s · 1h 5m */
function fmtDur(s){ s = Math.max(0, +s || 0); if (s < 1) return s.toFixed(1) + 's'; const r = Math.round(s); if (r < 60) return r + 's'; if (r < 3600) return Math.floor(r / 60) + 'm ' + (r % 60) + 's'; return Math.floor(r / 3600) + 'h ' + Math.floor(r % 3600 / 60) + 'm'; }
function lightbox(src){ const lb = el('div', 'lightbox'); lb.innerHTML = `<img src="${src}" alt="">`; lb.onclick = () => lb.remove(); document.body.appendChild(lb); }
function bytes(n){ return n > 1048576 ? (n/1048576).toFixed(1) + ' MB' : n > 1024 ? Math.round(n/1024) + ' KB' : n + ' B'; }

/* ================= INDEXED DB ================= */
const DB = (() => {
  let dbp;
  function open(){ return dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('lokizenith', 1); r.onupgradeneeded = () => r.result.createObjectStore('convs', {keyPath:'id'}); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); }
  async function tx(mode, fn){ const db = await open(); return new Promise((res, rej) => { const t = db.transaction('convs', mode); const st = t.objectStore('convs'); const out = fn(st); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }); }
  return {
    all: () => tx('readonly', st => st.getAll()),
    put: c => tx('readwrite', st => st.put(c)),
    del: id => tx('readwrite', st => st.delete(id)),
    clear: () => tx('readwrite', st => st.clear())
  };
})();
const DELETED_CONVS_KEY = 'lz.deletedConvs';
const EMERGENCY_CONVS_KEY = 'lz.convs.emergency';
function getDeletedConvIds(){
  try {
    const obj = JSON.parse(localStorage.getItem(DELETED_CONVS_KEY) || '{}');
    return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
  } catch(_){ return {}; }
}
function recordDeletedConvId(id){
  if (!id) return;
  const map = getDeletedConvIds();
  map[String(id)] = Date.now();
  const capped = Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 300));
  try { localStorage.setItem(DELETED_CONVS_KEY, JSON.stringify(capped)); } catch(_){}
}
function saveEmergencyMirror(convsList){
  try {
    const slim = (Array.isArray(convsList) ? convsList : state.convs || []).slice(0, 15).map(c => ({
      id: c.id,
      title: c.title,
      pinned: !!c.pinned,
      created: c.created,
      updated: c.updated,
      messages: (c.messages || []).filter(m => !m.pending).slice(-25).map(m => ({
        id: m.id,
        role: m.role,
        content: typeof m.content === 'string' ? m.content.slice(0, 8000) : '',
        ts: m.ts,
        type: m.type
      }))
    }));
    localStorage.setItem(EMERGENCY_CONVS_KEY, JSON.stringify(slim));
  } catch(_){}
}
function persist(c){
  c = c || state.current;
  if (!c) return;
  c.updated = Date.now();
  DB.put(JSON.parse(JSON.stringify(c))).catch(() => toast('Storage is full — delete some chats', 'err'));
  saveEmergencyMirror();
  window.LZAuth && LZAuth.scheduleSync && LZAuth.scheduleSync();
}

/* ================= BACKGROUND =================
   Performance: renders at a reduced internal resolution (CSS upscales — it's a soft backdrop anyway),
   ~30fps (15 in performance mode), batched paths per alpha bucket (no per-particle style strings),
   zero per-frame allocations, and it fully stops when the tab is hidden. */
const BGX = {}; // extra background styles: id -> {name, init(env), draw(env)}
const BG = (() => {
  const cv = $('#bg'), ctx = cv.getContext('2d', {alpha:false});
  let xenv = null;
  let W, H, scale, parts = [], drops = [], raf = 0, style, tick = 0, last = 0, running = false, interval = 33;
  const BUCKETS = 4; let strokes = [], fills = [], fade = 'rgba(3,8,6,0.09)';
  let px, py, pv, pa, pl, pvx, pvy, pb, n = 0;
  function resize(){
    scale = S.perfMode ? .5 : .75;            // internal resolution (DPR deliberately ignored)
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0); seed();
    xenv = null;
    if (BGX[style]){ xenv = {ctx, W, H, k: S.bgIntensity || 1, rgb: acc(), t: 0, perf: !!S.perfMode, state: {}}; ctx.fillStyle = '#030806'; ctx.fillRect(0, 0, W, H); try { BGX[style].init && BGX[style].init(xenv); } catch (e){ console.warn('bg init', e); } }
  }
  function seed(){
    const k = S.bgIntensity || 1, area = Math.min(W * H / 1e6, 2.2);
    n = Math.round((style === 'net' ? (S.perfMode ? 22 : 38) : (S.perfMode ? 50 : 95)) * k * Math.max(area, .4));
    px = new Float32Array(n); py = new Float32Array(n); pv = new Float32Array(n); pa = new Float32Array(n); pl = new Float32Array(n); pvx = new Float32Array(n); pvy = new Float32Array(n); pb = new Uint8Array(n);
    for (let i = 0; i < n; i++){ px[i] = Math.random()*W; py[i] = Math.random()*H; pv[i] = .4 + Math.random()*1.1; pvx[i] = (Math.random()-.5)*.35; pvy[i] = (Math.random()-.5)*.35; pa[i] = .15 + Math.random()*.5; pl[i] = Math.random()*400; pb[i] = Math.min(BUCKETS - 1, (pa[i] - .15) / .5 * BUCKETS | 0); }
    const cols = Math.ceil(W / 18); drops = Array.from({length: cols}, () => ({y: Math.random() * -H, s: 2 + Math.random()*4, on: Math.random() < .55 * k}));
    ctx.fillStyle = '#030806'; ctx.fillRect(0, 0, W, H);
  }
  const glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789<>{}[]=+*ﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓ';
  function acc(){ return getComputedStyle(document.documentElement).getPropertyValue('--acc-rgb').trim() || '0,255,156'; }
  function styles(rgb){
    const k = S.bgIntensity || 1;
    strokes = []; fills = [];
    for (let b = 0; b < BUCKETS; b++){ const a = (.15 + (b + .5) * .5 / BUCKETS) * .55 * Math.min(1, k); strokes.push(`rgba(${rgb},${a.toFixed(3)})`); }
    for (let b = 0; b < 4; b++) fills.push(`rgba(${rgb},${((b + 1) / 4 * .28 * Math.min(1.3, k)).toFixed(3)})`);
    fills.push(`rgba(${rgb},.6)`, `rgba(${rgb},${(.35 * Math.min(1.4, k)).toFixed(3)})`, `rgba(220,255,240,${(.5 * Math.min(1, k)).toFixed(3)})`);
  }
  function frame(ts){
    raf = 0;
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (ts - last < interval) return; last = ts; tick++;
    draw();
  }
  function draw(){
    if (BGX[style]){ if (!xenv) return; xenv.t = tick; xenv.rgb = xenv.rgb || acc(); try { BGX[style].draw(xenv); } catch (e){ console.warn('bg draw', e); BGX[style].broken = (BGX[style].broken || 0) + 1; if (BGX[style].broken > 30){ stop(); } } return; }
    if (style === 'flow'){
      ctx.fillStyle = 'rgba(3,9,7,0.11)'; ctx.fillRect(0, 0, W, H);
      const t = tick;
      // Subtle shifting emerald-cyan depth glow every 2nd tick for zero-jank ambiance
      if ((t & 1) === 0 && !S.perfMode){
        const gx = W * (0.28 + 0.14 * Math.sin(t * 0.004));
        const gy = H * (0.26 + 0.12 * Math.cos(t * 0.0035));
        const g1 = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.42);
        g1.addColorStop(0, `rgba(${acc()},0.018)`);
        g1.addColorStop(0.6, 'rgba(0,210,255,0.008)');
        g1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
      }
      ctx.lineCap = 'round';
      for (let b = 0; b < BUCKETS; b++){
        ctx.lineWidth = b === BUCKETS - 1 ? 1.85 : (0.95 + b * 0.28);
        ctx.strokeStyle = b === BUCKETS - 1 ? `rgba(110,255,214,${(0.36 * Math.min(1.2, S.bgIntensity || 1)).toFixed(3)})` : strokes[b];
        ctx.beginPath();
        for (let i = 0; i < n; i++){
          if (pb[i] !== b) continue;
          const x = px[i], y = py[i];
          const ang = Math.sin(x * .0019 + t * .0038) * 1.7 + Math.cos(y * .0022 - t * .0029) * 1.55 + .45;
          const spd = pv[i] * 1.65;
          const nx = x + Math.cos(ang) * spd, ny = y + Math.sin(ang) * spd;
          ctx.moveTo(x, y); ctx.lineTo(nx, ny);
          px[i] = nx; py[i] = ny; pl[i]--;
          if (nx < -12 || nx > W + 12 || ny < -12 || ny > H + 12 || pl[i] < 0){ px[i] = Math.random()*W; py[i] = Math.random()*H; pl[i] = 220 + Math.random()*420; }
        }
        ctx.stroke();
      }
      // Luminous micro-nodes on the brightest stream bucket
      ctx.fillStyle = `rgba(165,255,228,${(0.42 * Math.min(1.2, S.bgIntensity || 1)).toFixed(3)})`;
      ctx.beginPath();
      for (let i = 0; i < n; i += 5){
        if (pb[i] === BUCKETS - 1){ ctx.moveTo(px[i] + 1.5, py[i]); ctx.arc(px[i], py[i], 1.5, 0, 6.2832); }
      }
      ctx.fill();
    } else if (style === 'matrix'){
      ctx.fillStyle = 'rgba(3,8,6,0.12)'; ctx.fillRect(0, 0, W, H);
      ctx.font = '15px JetBrains Mono, monospace';
      for (let i = 0; i < drops.length; i++){
        const d = drops[i]; if (!d.on) continue;
        const ch = glyphs[(Math.random() * glyphs.length) | 0];
        ctx.fillStyle = Math.random() < .3 ? fills[6] : fills[5]; ctx.fillText(ch, i * 18, d.y);
        d.y += d.s * 4.5; if (d.y > H + 20){ d.y = -20 - Math.random() * 300; d.s = 2 + Math.random()*4; }
      }
    } else if (style === 'net'){
      ctx.fillStyle = '#030806'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < n; i++){ px[i] += pvx[i]; py[i] += pvy[i]; if (px[i] < 0 || px[i] > W) pvx[i] *= -1; if (py[i] < 0 || py[i] > H) pvy[i] *= -1; }
      ctx.lineWidth = 1;
      for (let b = 0; b < 4; b++){
        ctx.strokeStyle = fills[b]; ctx.beginPath();
        const lo = 22000 * (1 - (b + 1) / 4), hi = 22000 * (1 - b / 4);
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++){
          const dx = px[i] - px[j], dy = py[i] - py[j], d = dx*dx + dy*dy;
          if (d >= lo && d < hi){ ctx.moveTo(px[i], py[i]); ctx.lineTo(px[j], py[j]); }
        }
        ctx.stroke();
      }
      ctx.fillStyle = fills[4]; ctx.beginPath();
      for (let i = 0; i < n; i++){ ctx.moveTo(px[i] + 1.6, py[i]); ctx.arc(px[i], py[i], 1.6, 0, 6.2832); }
      ctx.fill();
    }
  }
  function start(){ if (!running && style !== 'off' && !S.reduceMotion && !document.hidden){ running = true; last = 0; raf = requestAnimationFrame(frame); } }
  function stop(){ running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function configure(){
    style = S.bgStyle; stop();
    interval = S.perfMode ? 66 : 33;
    styles(acc());
    if (style === 'off'){ ctx.fillStyle = '#030806'; ctx.fillRect(0, 0, cv.width, cv.height); return; }
    resize();
    if (S.reduceMotion){ for (let i = 0; i < 60; i++){ tick++; draw(); } return; } // one settled frame
    start();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (style !== 'off') resize(); }, 150); });
  return {configure, stop, start, get style(){ return style; }};
})();
function registerBackground(id, def){ BGX[id] = def; if (S.bgStyle === id) BG.configure(); }

/* ================= MARKDOWN & STARK RICH BLOCKS ================= */
if (window.marked) marked.setOptions({gfm:true, breaks:true});
const EXT = {javascript:'js', js:'js', typescript:'ts', ts:'ts', python:'py', py:'py', html:'html', css:'css', json:'json', java:'java', c:'c', cpp:'cpp', 'c++':'cpp', csharp:'cs', cs:'cs', go:'go', rust:'rs', ruby:'rb', php:'php', swift:'swift', lua:'lua', bash:'sh', sh:'sh', shell:'sh', sql:'sql', yaml:'yml', xml:'xml', markdown:'md', md:'md', kotlin:'kt', csv:'csv', r:'r', scala:'scala', haskell:'hs', perl:'pl'};
function mdToHtml(text){
  let raw = window.marked ? marked.parse(text || '') : esc(text).replace(/\n/g, '<br>');
  raw = window.DOMPurify ? DOMPurify.sanitize(raw, {ADD_ATTR:['target', 'dir']}) : raw;
  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = raw;
    tmp.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, ul, ol, table').forEach((el) => {
      const txt = (el.textContent || '').trim();
      const rtl = (txt.match(/[\u0590-\u05FF\u0600-\u06FF]/g) || []).length;
      const ltr = (txt.match(/[A-Za-z]/g) || []).length;
      el.setAttribute('dir', (rtl >= 2 && rtl >= ltr * 0.4) ? 'rtl' : 'auto');
    });
    return tmp.innerHTML;
  }
  return raw;
}

function safeParseBlockJSON(txt){
  if (!txt) return null;
  let s = String(txt).trim().replace(/^```[\w-]*\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(s); } catch(_){}
  try { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1').replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'")); } catch(_){}
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a){
    const x = s.slice(a, b + 1);
    try { return JSON.parse(x); } catch(_){}
    try { return JSON.parse(x.replace(/,\s*([}\]])/g, '$1')); } catch(_){}
  }
  const c = s.indexOf('['), d = s.lastIndexOf(']');
  if (c >= 0 && d > c){
    const y = s.slice(c, d + 1);
    try { return JSON.parse(y); } catch(_){}
    try { return JSON.parse(y.replace(/,\s*([}\]])/g, '$1')); } catch(_){}
  }
  return null;
}

function extractTableFromText(rawText, defaultTitle = 'Interactive Data Table'){
  let title = defaultTitle;
  let headers = [];
  let rows = [];
  const clean = String(rawText || '').trim().replace(/^```[\w-]*\s*/i, '').replace(/```\s*$/i, '').trim();

  // 1. JSON parsing
  const parsed = safeParseBlockJSON(clean);
  if (parsed && typeof parsed === 'object'){
    if (parsed.title) title = String(parsed.title);
    if (Array.isArray(parsed.headers || parsed.columns || parsed.cols)){
      headers = (parsed.headers || parsed.columns || parsed.cols).map(String);
    }
    const rawRows = parsed.rows || parsed.data || parsed.items || (Array.isArray(parsed) ? parsed : null);
    if (Array.isArray(rawRows) && rawRows.length > 0){
      if (Array.isArray(rawRows[0])){
        if (!headers.length && rawRows.length > 1){
          headers = rawRows[0].map(String);
          rows = rawRows.slice(1).map(r => Array.isArray(r) ? r.map(c => String(c ?? '')) : [String(r)]);
        } else {
          rows = rawRows.map(r => Array.isArray(r) ? r.map(c => String(c ?? '')) : [String(r)]);
        }
      } else if (typeof rawRows[0] === 'object' && rawRows[0] !== null){
        if (!headers.length) headers = Object.keys(rawRows[0]);
        rows = rawRows.map(obj => headers.map(k => String(obj[k] ?? '')));
      } else {
        rows = rawRows.map((v, i) => [String(i + 1), String(v)]);
      }
    }
  }

  // 2. Markdown table pipes (| Col 1 | Col 2 |)
  if (!rows.length && clean.includes('|')){
    const lines = clean.split('\n').map(l => l.trim()).filter(l => l.includes('|'));
    const parsedLines = [];
    for (const line of lines){
      if (/^\|?\s*[:\-]+(?:\s*\|\s*[:\-]+)+\s*\|?$/.test(line)) continue;
      const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      if (cells.length > 1 || (cells.length === 1 && cells[0])) parsedLines.push(cells);
    }
    if (parsedLines.length > 0){
      if (!headers.length && parsedLines.length > 1){
        headers = parsedLines[0];
        rows = parsedLines.slice(1);
      } else {
        rows = parsedLines;
      }
    }
  }

  // 3. Array brackets regex: e.g. ["ג'", "ג'", "ג'אז", "ج", "جاز"] or [["א'", ...]]
  if (!rows.length){
    const bracketRegex = /\[([^\[\]]+)\]/g;
    let m;
    const extracted = [];
    while ((m = bracketRegex.exec(clean)) !== null){
      try {
        const itemStr = '[' + m[1].replace(/'([^'\\]*)'/g, '"$1"') + ']';
        const p = JSON.parse(itemStr);
        if (Array.isArray(p) && p.length > 0){
          extracted.push(p.map(String));
        }
      } catch(_){
        const parts = m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
        if (parts.length > 0 && parts.some(Boolean)) extracted.push(parts);
      }
    }
    if (extracted.length > 0){
      const isHdr = extracted.length > 1 && extracted[0].some(c => /header|col|name|title|אות|צליל|תעתיק|עמודה|דוגמה|ערך|תיאור|פירוט/i.test(String(c)));
      if (isHdr){
        headers = extracted[0];
        rows = extracted.slice(1);
      } else {
        rows = extracted;
      }
    }
  }

  // 4. Delimited lines (TSV, CSV, semicolon)
  if (!rows.length){
    const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
    for (const delim of ['\t', ';', ',']){
      const testRows = lines.map(l => l.split(delim).map(c => c.trim().replace(/^['"]|['"]$/g, '')));
      if (testRows.length > 1 && testRows.every(r => r.length > 1 && Math.abs(r.length - testRows[0].length) <= 1)){
        headers = testRows[0];
        rows = testRows.slice(1);
        break;
      }
    }
  }

  // 5. Fallback line-by-line key: value
  if (!rows.length){
    const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0){
      headers = ['#', 'Item'];
      rows = lines.map((l, i) => {
        const colon = l.indexOf(':');
        if (colon > 0 && colon < 40) return [l.slice(0, colon).trim(), l.slice(colon + 1).trim()];
        const dash = l.indexOf(' - ');
        if (dash > 0 && dash < 40) return [l.slice(0, dash).trim(), l.slice(dash + 3).trim()];
        return [String(i + 1), l];
      });
    }
  }

  // Normalize columns
  const maxCols = Math.max(headers.length, ...rows.map(r => r.length), 1);
  if (!headers.length){
    headers = Array.from({length: maxCols}, (_, i) => `Col ${i + 1}`);
  }
  while (headers.length < maxCols){
    headers.push(`Col ${headers.length + 1}`);
  }
  rows = rows.map(r => {
    const pad = [...r];
    while (pad.length < headers.length) pad.push('');
    return pad;
  });

  return { title, headers, rows };
}

function extractTimelineData(rawText, defaultTitle = 'Interactive Timeline'){
  let title = defaultTitle;
  let events = [];
  const clean = String(rawText || '').trim().replace(/^```[\w-]*\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = safeParseBlockJSON(clean);
  if (parsed && typeof parsed === 'object'){
    if (parsed.title) title = String(parsed.title);
    const rawEvents = parsed.events || parsed.steps || parsed.milestones || parsed.items || (Array.isArray(parsed) ? parsed : null);
    if (Array.isArray(rawEvents) && rawEvents.length > 0){
      events = rawEvents.map((ev, i) => {
        if (typeof ev === 'object' && ev !== null){
          return {
            date: ev.date || ev.phase || ev.time || ev.year || (`Phase ${i + 1}`),
            title: ev.title || ev.heading || ev.name || '',
            desc: ev.desc || ev.description || ev.text || ev.detail || ''
          };
        }
        return { date: `Phase ${i + 1}`, title: String(ev), desc: '' };
      });
    }
  }
  if (!events.length){
    const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
    events = lines.map((l, i) => {
      const parts = l.split(/[:–-]\s+/);
      const evTitle = parts[0] || l;
      const desc = parts.slice(1).join(' - ');
      return { date: `Phase ${i + 1}`, title: evTitle.replace(/^[-*•\d.]+\s*/, ''), desc };
    });
  }
  if (!events.length){
    events = [{ date: 'Milestone 1', title: 'Start', desc: clean || 'Initial stage' }];
  }
  return { title, events };
}

function renderInteractiveBlock(lang, rawText){
  const l = String(lang || '').toLowerCase().trim().replace(/^ui[-:]/, 'loki-');
  lang = l;
  const data = safeParseBlockJSON(rawText) || (window.LZLiveUI ? LZLiveUI.repairPartialJson(rawText) : null) || {};

  // 1. LIVE INTERACTIVE CHART (loki-chart / chart)
  if (lang === 'loki-chart' || lang === 'chart'){
    const box = el('div', 'stark-block stark-chart-block');
    const types = ['bar', 'line', 'pie', 'doughnut', 'radar'];
    let curType = (data.type || 'bar').toLowerCase();
    if (!types.includes(curType)) curType = 'bar';
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">📈 Interactive Chart</span><b dir="auto">${esc(data.title || 'Data Visualization')}</b><div class="sb-acts">${types.map(tp => `<button type="button" data-tp="${tp}" class="${tp === curType ? 'on' : ''}">${tp.charAt(0).toUpperCase() + tp.slice(1)}</button>`).join('')}<button type="button" data-a="dl" title="Download PNG">⤓ PNG</button></div></div><div class="sb-chart-wrap"><canvas></canvas></div>`;
    const cv = $('canvas', box);
    let chartInst = null;
    const drawChart = async (tp) => {
      try {
        await LZ.loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js');
        if (chartInst) chartInst.destroy();
        const accRgb = getComputedStyle(document.documentElement).getPropertyValue('--acc-rgb').trim() || '0,255,156';
        const pal = [`rgba(${accRgb},.85)`, 'rgba(60,220,255,.82)', 'rgba(170,140,255,.82)', 'rgba(255,209,102,.85)', 'rgba(255,123,147,.82)', 'rgba(180,255,120,.82)'];
        const round = ['pie', 'doughnut', 'polarArea'].includes(tp);
        const rawDs = Array.isArray(data.datasets) && data.datasets.length ? data.datasets : [{label: data.title || 'Series', data: data.data || data.values || []}];
        const ds = rawDs.map((d, i) => ({
          label: d.label || ('Series ' + (i + 1)),
          data: (d.data || d.values || []).map(Number),
          backgroundColor: round ? pal : pal[i % pal.length],
          borderColor: round ? '#06100b' : pal[i % pal.length].replace(/[\d.]+\)$/, '1)'),
          borderWidth: 2,
          tension: 0.35,
          fill: tp === 'line' ? false : true,
          borderRadius: tp === 'bar' ? 8 : 0
        }));
        Chart.defaults.color = '#cfeee0';
        chartInst = new Chart(cv, {
          type: tp,
          data: {labels: data.labels || [], datasets: ds},
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {legend: {labels: {color: '#cfeee0'}}},
            scales: round || tp === 'radar' ? {} : {
              x: {grid: {color: 'rgba(255,255,255,.06)'}},
              y: {grid: {color: 'rgba(255,255,255,.06)'}}
            }
          }
        });
      } catch(_){}
    };
    drawChart(curType);
    $('.sb-acts', box).onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tp){
        curType = b.dataset.tp;
        $$('.sb-acts button[data-tp]', box).forEach(x => x.classList.toggle('on', x === b));
        drawChart(curType);
      } else if (b.dataset.a === 'dl' && chartInst){
        download(chartInst.toBase64Image('image/png', 1), (data.title || 'lokizen-chart').slice(0, 40) + '.png');
      }
    };
    return box;
  }

  // 2. EXECUTIVE KPI & METRICS GRID (loki-metrics / metrics)
  if (lang === 'loki-metrics' || lang === 'metrics'){
    const items = Array.isArray(data) ? data : (data.metrics || data.items || []);
    if (!items.length) return null;
    const box = el('div', 'stark-block stark-metrics-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">📊 Executive Metrics</span><b dir="auto">${esc(data.title || 'Key Performance Indicators')}</b></div>
    <div class="sb-metrics-grid">${items.map(it => {
      const up = !String(it.delta || it.change || '').startsWith('-');
      const pct = Math.max(0, Math.min(100, parseFloat(it.progress ?? it.pct ?? 78) || 78));
      return `<div class="sb-metric-card">
        <div class="sbm-top"><span class="sbm-lbl" dir="auto">${esc(it.label || it.name || '')}</span>${it.delta || it.change ? `<span class="sbm-delta ${up ? 'up' : 'dn'}">${esc(String(it.delta || it.change))}</span>` : ''}</div>
        <div class="sbm-val" dir="auto">${esc(String(it.value ?? ''))}</div>
        ${it.note || it.sub ? `<div class="sbm-sub" dir="auto">${esc(it.note || it.sub)}</div>` : ''}
        <div class="sbm-bar"><i style="width:${pct}%"></i></div>
      </div>`;
    }).join('')}</div>`;
    return box;
  }

  // 3. PROS & CONS / COMPARISON MATRIX (loki-proscons / proscons)
  if (lang === 'loki-proscons' || lang === 'proscons'){
    const pros = data.pros || data.strengths || data.advantages || [];
    const cons = data.cons || data.risks || data.disadvantages || [];
    if (!pros.length && !cons.length) return null;
    const box = el('div', 'stark-block stark-proscons-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">⚖️ Trade-off Matrix</span><b dir="auto">${esc(data.title || 'Pros & Cons Analysis')}</b>${data.score != null ? `<span class="sb-score">Score: ${esc(String(data.score))}/10</span>` : ''}</div>
    <div class="sb-pc-grid">
      <div class="sb-pc-col pros"><h4>✓ ${esc(t('Pros & Strengths'))}</h4><ul>${pros.map(p => `<li dir="auto">${esc(typeof p === 'object' ? (p.text || p.title || '') : String(p))}</li>`).join('')}</ul></div>
      <div class="sb-pc-col cons"><h4>✕ ${esc(t('Cons & Trade-offs'))}</h4><ul>${cons.map(c => `<li dir="auto">${esc(typeof c === 'object' ? (c.text || c.title || '') : String(c))}</li>`).join('')}</ul></div>
    </div>
    ${data.verdict ? `<div class="sb-verdict" dir="auto"><b>⚡ Stark Verdict:</b> ${esc(data.verdict)}</div>` : ''}`;
    return box;
  }

  // 4. INTERACTIVE CHRONOLOGICAL TIMELINE / ROADMAP (loki-timeline / timeline)
  if (lang === 'loki-timeline' || lang === 'timeline'){
    const { title, events } = extractTimelineData(rawText, (data && data.title) || 'Roadmap & Milestones');
    const box = el('div', 'stark-block stark-timeline-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">🗓 Interactive Timeline</span><b dir="auto">${esc(title)}</b></div>
    <div class="sb-tl-list">${events.map((ev, i) => `<div class="sb-tl-item${i === 0 ? ' active' : ''}">
      <div class="sb-tl-dot">${esc(String(ev.date || (i + 1)))}</div>
      <div class="sb-tl-body">
        <div class="sb-tl-meta"><span class="sb-tl-date" dir="auto">${esc(ev.date || ('Phase ' + (i + 1)))}</span><b dir="auto">${esc(ev.title || '')}</b></div>
        ${ev.desc ? `<p dir="auto">${esc(ev.desc)}</p>` : ''}
      </div>
    </div>`).join('')}</div>`;
    $$('.sb-tl-item', box).forEach(it => { it.onclick = () => it.classList.toggle('active'); });
    return box;
  }

  // 5. INTERACTIVE CLICKABLE CHECKLIST / ACTION STEPS (loki-steps / checklist)
  if (lang === 'loki-steps' || lang === 'checklist'){
    const steps = Array.isArray(data) ? data : (data.steps || data.items || []);
    if (!steps.length) return null;
    const box = el('div', 'stark-block stark-steps-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">📋 Action Plan</span><b dir="auto">${esc(data.title || 'Interactive Step-by-Step Checklist')}</b><span class="sb-prog-txt">0/${steps.length}</span></div>
    <div class="sb-prog-bar"><i style="width:0%"></i></div>
    <div class="sb-steps-list">${steps.map((st, i) => {
      const title = typeof st === 'object' ? (st.title || st.text || st.step || '') : String(st);
      const detail = typeof st === 'object' ? (st.detail || st.desc || st.note || '') : '';
      const isDone = typeof st === 'object' && !!st.done;
      return `<label class="sb-step-row${isDone ? ' done' : ''}"><input type="checkbox" data-idx="${i}" ${isDone ? 'checked' : ''}><span class="sb-chk">✓</span><span class="sb-step-txt"><b dir="auto">${esc(title)}</b>${detail ? `<small dir="auto">${esc(detail)}</small>` : ''}</span></label>`;
    }).join('')}</div>`;
    const updateProg = () => {
      const all = $$('input[type=checkbox]', box);
      const done = all.filter(c => c.checked).length;
      all.forEach(c => c.closest('.sb-step-row')?.classList.toggle('done', c.checked));
      $('.sb-prog-txt', box).textContent = `${done}/${all.length}`;
      $('.sb-prog-bar i', box).style.width = Math.round((done / Math.max(1, all.length)) * 100) + '%';
    };
    $$('input[type=checkbox]', box).forEach(c => { c.onchange = updateProg; });
    updateProg();
    return box;
  }

  // 6. INTERACTIVE 3D FLIPPABLE STUDY/CONCEPT CARDS (loki-cards / flashcards)
  if (lang === 'loki-cards' || lang === 'flashcards'){
    const cards = Array.isArray(data) ? data : (data.cards || data.items || []);
    if (!cards.length) return null;
    const box = el('div', 'stark-block stark-cards-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">🃏 3D Concept Cards</span><b dir="auto">${esc(data.title || 'Tap any card to flip')}</b></div>
    <div class="sb-cards-grid">${cards.map((c, i) => `<div class="sb-flip-card" tabindex="0">
      <div class="sb-flip-inner">
        <div class="sb-flip-front"><span class="sb-card-num">#${i + 1}</span><b dir="auto">${esc(c.front || c.term || c.title || '')}</b><small>↻ Flip</small></div>
        <div class="sb-flip-back"><p dir="auto">${esc(c.back || c.def || c.answer || c.desc || '')}</p></div>
      </div>
    </div>`).join('')}</div>`;
    $$('.sb-flip-card', box).forEach(card => {
      card.onclick = () => card.classList.toggle('flipped');
      card.onkeydown = e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); card.classList.toggle('flipped'); } };
    });
    return box;
  }

  // 7. EXECUTIVE CALLOUT / FORMULA / INSIGHT CARD (loki-callout / insight)
  if (lang === 'loki-callout' || lang === 'insight'){
    const box = el('div', 'stark-block stark-callout-block ' + esc(data.kind || 'insight'));
    box.innerHTML = `<div class="sb-callout-ic">${esc(data.icon || '⚡')}</div><div class="sb-callout-body"><b dir="auto">${esc(data.title || 'Stark Executive Insight')}</b><p dir="auto">${esc(data.text || data.body || data.content || '')}</p>${data.formula ? `<code class="sb-formula">${esc(data.formula)}</code>` : ''}</div>`;
    return box;
  }

  // 8. INTERACTIVE KANBAN BOARD (loki-kanban / kanban)
  if (lang === 'loki-kanban' || lang === 'kanban'){
    const rawCols = Array.isArray(data.columns) ? data.columns : [
      {title: 'To Do', items: data.todo || ['Define scope', 'Setup environment']},
      {title: 'In Progress', items: data.doing || ['Build core module']},
      {title: 'Done', items: data.done || ['Initial research']}
    ];
    const cols = rawCols.map(c => ({title: c.title || c.name || 'Column', items: Array.isArray(c.items || c.tasks) ? [...(c.items || c.tasks)] : []}));
    const box = el('div', 'stark-block stark-kanban-block');
    const renderKb = () => {
      box.innerHTML = `<div class="sb-head"><span class="sb-badge">📌 Interactive Kanban</span><b dir="auto">${esc(data.title || 'Project Sprint Board')}</b></div>
      <div class="sb-kb-grid">${cols.map((col, ci) => `<div class="sb-kb-col" data-ci="${ci}">
        <div class="sb-kb-head"><b dir="auto">${esc(col.title)}</b><span class="sb-kb-cnt">${col.items.length}</span></div>
        <div class="sb-kb-list">${col.items.map((it, ii) => {
          const txt = typeof it === 'object' ? (it.title || it.text || '') : String(it);
          const tag = typeof it === 'object' ? (it.tag || it.priority || '') : '';
          return `<div class="sb-kb-card"><span dir="auto">${esc(txt)}</span>${tag ? `<i class="sb-kb-tag">${esc(tag)}</i>` : ''}<div class="sb-kb-acts">${ci > 0 ? `<button type="button" data-m="-1" data-ci="${ci}" data-ii="${ii}" title="Move left">◀</button>` : ''}${ci < cols.length - 1 ? `<button type="button" data-m="1" data-ci="${ci}" data-ii="${ii}" title="Move right">▶</button>` : ''}<button type="button" data-del="1" data-ci="${ci}" data-ii="${ii}" title="Remove">✕</button></div></div>`;
        }).join('')}</div>
        <div class="sb-kb-add"><input type="text" placeholder="+ Add task…" data-ci="${ci}" dir="auto"><button type="button" data-add="${ci}">＋</button></div>
      </div>`).join('')}</div>`;
      $$('button[data-m]', box).forEach(b => b.onclick = () => {
        const ci = +b.dataset.ci, ii = +b.dataset.ii, dir = +b.dataset.m;
        const [item] = cols[ci].items.splice(ii, 1);
        if (item !== undefined && cols[ci + dir]) cols[ci + dir].items.push(item);
        renderKb();
      });
      $$('button[data-del]', box).forEach(b => b.onclick = () => {
        cols[+b.dataset.ci].items.splice(+b.dataset.ii, 1);
        renderKb();
      });
      $$('button[data-add]', box).forEach(b => b.onclick = () => {
        const ci = +b.dataset.add;
        const inp = $(`input[data-ci="${ci}"]`, box);
        if (inp && inp.value.trim()){ cols[ci].items.push(inp.value.trim()); renderKb(); }
      });
      $$('.sb-kb-add input', box).forEach(inp => inp.onkeydown = e => {
        if (e.key === 'Enter' && inp.value.trim()){ cols[+inp.dataset.ci].items.push(inp.value.trim()); renderKb(); }
      });
    };
    renderKb();
    return box;
  }

  // 9. INSTANT INTERACTIVE MINI-QUIZ / TEST (loki-quiz / quiz)
  if (lang === 'loki-quiz' || lang === 'quiz'){
    const qs = Array.isArray(data) ? data : (data.questions || data.items || []);
    if (!qs.length) return null;
    if (window.Lessons && typeof Lessons.Quiz === 'function' && typeof Lessons.normQuiz === 'function'){
      const qLang = /[\u0590-\u05FF]/.test(JSON.stringify(qs)) ? 'he' : (S.lang || 'en');
      const normQs = Lessons.normQuiz({ title: data.title || 'Interactive Test', questions: qs }, qLang);
      const qArr = Array.isArray(normQs) ? normQs : (normQs && normQs.questions) || [];
      if (qArr.length){
        const quizTitle = (data && data.title) || (qLang === 'he' ? 'מבחן אינטראקטיבי' : 'Interactive Test');
        const env = {
          lang: qLang,
          save: () => {},
          scroll: () => scrollDown(),
          tier: () => state.model,
          finish(st){ if (st.score / qArr.length >= 0.8 && window.Mascot) Mascot.set('happy'); },
          retry(wrongQs){ sendText((S.lang === 'he' ? 'תבחן אותי שוב על השאלות שטעיתי בהן' : 'Test me again on the questions I got wrong'), {quizRetry: wrongQs, title: quizTitle}, 'quiz'); },
          newQuiz(topic){ sendText((S.lang === 'he' ? 'צור מבחן חדש על ' : 'Create a new test about ') + (topic || quizTitle), null, 'quiz'); }
        };
        const qBox = Lessons.Quiz({ data: { title: quizTitle, topic: quizTitle, questions: qArr, state: { i: 0, answers: [], drafts: [] } } }, env);
        qBox.classList.add('chat-quiz');
        return qBox;
      }
    }
    const box = el('div', 'stark-block stark-quiz-block');
    let score = 0, answered = 0;
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">🧠 Interactive Mini-Quiz</span><b dir="auto">${esc(data.title || 'Knowledge Check')}</b><span class="sb-quiz-score">Score: 0/${qs.length}</span></div>
    <div class="sb-quiz-list">${qs.map((q, qi) => `<div class="sb-quiz-q" data-qi="${qi}">
      <b class="sb-qq-title" dir="auto">${qi + 1}. ${esc(q.q || q.question || '')}</b>
      <div class="sb-qq-opts">${(q.options || q.choices || []).map((opt, oi) => `<button type="button" class="sb-qq-opt" data-oi="${oi}" dir="auto">${esc(opt)}</button>`).join('')}</div>
      <div class="sb-qq-exp" hidden dir="auto">${esc(q.explain || q.explanation || 'Correct!')}</div>
    </div>`).join('')}</div>`;
    $$('.sb-quiz-q', box).forEach((qEl, qi) => {
      const q = qs[qi];
      const ans = Number.isFinite(+q.answer) ? +q.answer : 0;
      $$('.sb-qq-opt', qEl).forEach(btn => {
        btn.onclick = () => {
          if (qEl.classList.contains('done')) return;
          qEl.classList.add('done');
          answered++;
          const oi = +btn.dataset.oi;
          if (oi === ans){ btn.classList.add('correct'); score++; sound('done'); }
          else { btn.classList.add('wrong'); const rightBtn = $(`.sb-qq-opt[data-oi="${ans}"]`, qEl); if (rightBtn) rightBtn.classList.add('correct'); }
          const exp = $('.sb-qq-exp', qEl); if (exp) exp.hidden = false;
          $('.sb-quiz-score', box).textContent = `Score: ${score}/${qs.length}`;
        };
      });
    });
    return box;
  }

  // 10. SORTABLE & FILTERABLE DATA TABLE (loki-table / datatable / table / grid / loki-grid)
  if (lang === 'loki-table' || lang === 'datatable' || lang === 'table' || lang === 'grid' || lang === 'loki-grid'){
    const { title, headers, rows: origRows } = extractTableFromText(rawText, (data && data.title) || 'Dataset Explorer');
    let rows = origRows.map(r => [...r]), sortCol = -1, sortAsc = true, filterQ = '';
    const box = el('div', 'stark-block stark-table-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">📑 Interactive Data Table</span><b dir="auto">${esc(title)}</b>
      <div class="sb-actions"><input type="search" class="sb-tbl-search" placeholder="Filter rows…" dir="auto"><button type="button" class="sb-dl">⤓ CSV</button></div>
    </div><div class="sb-tbl-wrap"><table><thead></thead><tbody></tbody></table></div>`;
    const thead = $('thead', box), tbody = $('tbody', box), sInp = $('.sb-tbl-search', box);
    const paintTable = () => {
      thead.innerHTML = `<tr>${headers.map((h, i) => `<th data-ci="${i}" dir="auto">${esc(h)} <span class="srt">${sortCol === i ? (sortAsc ? '▲' : '▼') : '⇅'}</span></th>`).join('')}</tr>`;
      const q = filterQ.toLowerCase();
      const vis = rows.filter(r => !q || r.some(c => String(c).toLowerCase().includes(q)));
      tbody.innerHTML = vis.map(r => `<tr>${r.map(c => `<td dir="auto">${esc(String(c ?? ''))}</td>`).join('')}</tr>`).join('');
      $$('th', thead).forEach(th => th.onclick = () => {
        const ci = +th.dataset.ci;
        if (sortCol === ci) sortAsc = !sortAsc; else { sortCol = ci; sortAsc = true; }
        rows.sort((a, b) => {
          const va = a[ci], vb = b[ci];
          const na = parseFloat(String(va).replace(/[^0-9.-]/g, '')), nb = parseFloat(String(vb).replace(/[^0-9.-]/g, ''));
          const cmp = (!isNaN(na) && !isNaN(nb)) ? (na - nb) : String(va).localeCompare(String(vb));
          return sortAsc ? cmp : -cmp;
        });
        paintTable();
      });
    };
    sInp.oninput = () => { filterQ = sInp.value.trim(); paintTable(); };
    $('.sb-dl', box).onclick = () => {
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      download(csv, (title || 'table').slice(0, 30) + '.csv', 'text/csv');
    };
    paintTable();
    return box;
  }

  // 11. LIVE EDITABLE HTML/CSS/JS MINI-SANDBOX (loki-codeplay / sandbox)
  if (lang === 'loki-codeplay' || lang === 'sandbox'){
    const initCode = data.html || data.code || `<div style="padding:18px;font-family:Inter,sans-serif;color:#e8fff5;background:#04120c;border-radius:12px;text-align:center"><h3 style="color:#00ff9c;margin:0 0 8px">⚡ Live Sandbox</h3><p style="margin:0 0 12px;font-size:13px">Edit this code and click Run!</p><button onclick="this.textContent='Clicked! ✨'" style="padding:8px 16px;border-radius:8px;border:0;background:#00ff9c;color:#03140b;font-weight:700;cursor:pointer">Test Button</button></div>`;
    const box = el('div', 'stark-block stark-sandbox-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">🧪 Live Code Playground</span><b dir="auto">${esc(data.title || 'Interactive Mini-Sandbox')}</b><div class="sb-actions"><button type="button" class="sb-btn on" data-run>▶ Run Live</button></div></div>
    <div class="sb-play-grid"><textarea class="sb-play-ed" spellcheck="false"></textarea><iframe class="sb-play-fr" sandbox="allow-scripts" title="Live preview"></iframe></div>`;
    const ta = $('.sb-play-ed', box), fr = $('.sb-play-fr', box);
    ta.value = initCode;
    const run = () => { fr.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#04120c;color:#e8fff5;font-family:Inter,system-ui,sans-serif}</style></head><body>${ta.value}</body></html>`; };
    $('[data-run]', box).onclick = run;
    ta.addEventListener('input', () => { clearTimeout(ta._t); ta._t = setTimeout(run, 350); });
    run();
    return box;
  }

  // 12. INTERACTIVE SYSTEM ARCHITECTURE & NODE FLOW DIAGRAM (loki-architecture / flow)
  if (lang === 'loki-architecture' || lang === 'flow'){
    const nodes = Array.isArray(data.nodes) ? data.nodes : (Array.isArray(data) ? data : []);
    if (!nodes.length) return null;
    const box = el('div', 'stark-block stark-arch-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">🕸 System Architecture Flow</span><b dir="auto">${esc(data.title || 'Interactive Architecture Pipeline')}</b></div>
    <div class="sb-arch-flow">${nodes.map((n, i) => `<div class="sb-arch-step"><button type="button" class="sb-arch-node${i === 0 ? ' active' : ''}" data-ni="${i}"><span class="sb-an-ic">${esc(n.icon || '⚡')}</span><b dir="auto">${esc(n.label || n.title || ('Node ' + (i + 1)))}</b><small dir="auto">${esc(n.role || n.type || 'Layer ' + (i + 1))}</small></button>${i < nodes.length - 1 ? `<span class="sb-arch-arr">➔</span>` : ''}</div>`).join('')}</div>
    <div class="sb-arch-detail" dir="auto"></div>`;
    const det = $('.sb-arch-detail', box);
    const selectNode = (idx) => {
      $$('.sb-arch-node', box).forEach((b, i) => b.classList.toggle('active', i === idx));
      const n = nodes[idx] || {};
      det.innerHTML = `<b>${esc(n.icon || '⚡')} ${esc(n.label || n.title || '')}</b> — <span>${esc(n.desc || n.detail || n.description || 'Core processing stage in the architecture pipeline.')}</span>`;
    };
    $$('.sb-arch-node', box).forEach(b => b.onclick = () => selectNode(+b.dataset.ni));
    selectNode(0);
    return box;
  }

  // 13. INTERACTIVE 2x2 SWOT MATRIX (loki-swot / swot)
  if (lang === 'loki-swot' || lang === 'swot'){
    const box = el('div', 'stark-block stark-swot-block');
    const quads = [
      {k:'strengths', t:'💪 Strengths', cls:'s', items: data.strengths || []},
      {k:'weaknesses', t:'⚠️ Weaknesses', cls:'w', items: data.weaknesses || []},
      {k:'opportunities', t:'🚀 Opportunities', cls:'o', items: data.opportunities || []},
      {k:'threats', t:'🛡 Threats', cls:'t', items: data.threats || []}
    ];
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">🎯 2×2 SWOT Matrix</span><b dir="auto">${esc(data.title || 'Strategic SWOT Analysis')}</b></div>
    <div class="sb-swot-grid">${quads.map(q => `<div class="sb-swot-cell ${q.cls}"><h5>${q.t}</h5><ul>${(q.items || []).map(x => `<li dir="auto">${esc(typeof x === 'object' ? (x.text || x.title || '') : String(x))}</li>`).join('')}</ul></div>`).join('')}</div>`;
    return box;
  }

  // 14. INTERACTIVE DEEP-DIVE ACCORDION / FAQ EXPLORER (loki-accordion / faq)
  if (lang === 'loki-accordion' || lang === 'faq'){
    const items = Array.isArray(data) ? data : (data.items || data.faqs || []);
    if (!items.length) return null;
    const box = el('div', 'stark-block stark-acc-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">📂 Deep-Dive Explorer</span><b dir="auto">${esc(data.title || 'Interactive FAQ & Key Topics')}</b><div class="sb-actions"><button type="button" class="sb-btn" data-exp="1">Expand All</button><button type="button" class="sb-btn" data-exp="0">Collapse All</button></div></div>
    <div class="sb-acc-list">${items.map((it, i) => `<details class="sb-acc-item" ${i === 0 ? 'open' : ''}><summary dir="auto">${esc(it.q || it.title || it.heading || '')}</summary><div class="sb-acc-body" dir="auto">${esc(it.a || it.body || it.text || it.desc || '')}</div></details>`).join('')}</div>`;
    $$('button[data-exp]', box).forEach(b => b.onclick = () => {
      const open = b.dataset.exp === '1';
      $$('details', box).forEach(d => d.open = open);
    });
    return box;
  }

  // 15. INTERACTIVE WEIGHTED DECISION MATRIX (loki-decision / decision)
  if (lang === 'loki-decision' || lang === 'decision'){
    const criteria = Array.isArray(data.criteria) ? data.criteria.map(c => ({name: c.name || c.label || 'Criterion', weight: Number(c.weight ?? 5)})) : [{name:'Performance', weight:8}, {name:'Cost Efficiency', weight:7}, {name:'Scalability', weight:9}];
    const options = Array.isArray(data.options) ? data.options : [];
    if (!options.length) return null;
    const box = el('div', 'stark-block stark-decision-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">🧮 Weighted Decision Matrix</span><b dir="auto">${esc(data.title || 'Adjust Criteria Weights Live')}</b></div>
    <div class="sb-dec-weights">${criteria.map((c, ci) => `<label class="sb-dec-w"><span dir="auto">${esc(c.name)}: <b data-wv="${ci}">${c.weight}</b>/10</span><input type="range" min="1" max="10" value="${c.weight}" data-ci="${ci}"></label>`).join('')}</div>
    <div class="sb-dec-results"></div>`;
    const resBox = $('.sb-dec-results', box);
    const recalc = () => {
      const totalW = criteria.reduce((s, c) => s + c.weight, 0) || 1;
      const ranked = options.map(opt => {
        const scores = opt.scores || [];
        const weighted = criteria.reduce((s, c, i) => s + (Number(scores[i] ?? 7) * c.weight), 0) / totalW;
        return {name: opt.name || opt.title || 'Option', score: weighted, raw: scores};
      }).sort((a, b) => b.score - a.score);
      resBox.innerHTML = ranked.map((r, idx) => `<div class="sb-dec-row${idx === 0 ? ' winner' : ''}">
        <div class="sb-dec-top"><span class="sb-dec-rank">${idx === 0 ? '🏆 #1 Winner' : '#' + (idx + 1)}</span><b dir="auto">${esc(r.name)}</b><span class="sb-dec-score">${r.score.toFixed(1)} / 10</span></div>
        <div class="sb-prog-bar"><i style="width:${Math.min(100, Math.round(r.score * 10))}%"></i></div>
      </div>`).join('');
    };
    $$('input[type=range]', box).forEach(inp => inp.oninput = () => {
      const ci = +inp.dataset.ci;
      criteria[ci].weight = +inp.value;
      const lbl = $(`[data-wv="${ci}"]`, box); if (lbl) lbl.textContent = inp.value;
      recalc();
    });
    recalc();
    return box;
  }

  // 16. SIDE-BY-SIDE CODE / OPTION DIFF & COMPARISON VIEWER (loki-codecompare / diff)
  if (lang === 'loki-codecompare' || lang === 'diff'){
    const left = data.left || {title: data.beforeTitle || 'Before / Option A', code: data.before || ''};
    const right = data.right || {title: data.afterTitle || 'After / Option B', code: data.after || ''};
    const box = el('div', 'stark-block stark-diff-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">🔀 Side-by-Side Comparison</span><b dir="auto">${esc(data.title || 'Code & Architecture Diff')}</b></div>
    <div class="sb-diff-grid">
      <div class="sb-diff-col before"><div class="sb-diff-top"><b dir="auto">${esc(left.title || 'Option A')}</b><button type="button" data-cp="l">⧉ Copy</button></div><pre><code>${esc(left.code || left.text || '')}</code></pre></div>
      <div class="sb-diff-col after"><div class="sb-diff-top"><b dir="auto">${esc(right.title || 'Option B')}</b><button type="button" data-cp="r">⧉ Copy</button></div><pre><code>${esc(right.code || right.text || '')}</code></pre></div>
    </div>`;
    $('[data-cp="l"]', box).onclick = () => copyText(left.code || left.text || '');
    $('[data-cp="r"]', box).onclick = () => copyText(right.code || right.text || '');
    return box;
  }

  // 17. INTERACTIVE WEBAUDIO SYNTHESIZER & CHORD PAD (loki-audio / synth)
  if (lang === 'loki-audio' || lang === 'synth'){
    const notes = Array.isArray(data.notes) && data.notes.length ? data.notes : [
      {label:'C4', freq:261.63}, {label:'D4', freq:293.66}, {label:'E4', freq:329.63},
      {label:'G4', freq:392.00}, {label:'A4', freq:440.00}, {label:'C5', freq:523.25}
    ];
    const box = el('div', 'stark-block stark-synth-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">🎹 Interactive WebAudio Synth</span><b dir="auto">${esc(data.title || 'Playable Sound & Frequency Pad')}</b><button type="button" class="sb-btn on" data-seq>▶ Play Melody</button></div>
    <div class="sb-synth-pads">${notes.map((n, i) => `<button type="button" class="sb-synth-pad" data-f="${n.freq || 440}"><b>${esc(n.label || ('N' + (i + 1)))}</b><small>${Math.round(n.freq || 440)} Hz</small></button>`).join('')}</div>`;
    const playFreq = (f, dur = 0.35) => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!window.__lzAudioCtx) window.__lzAudioCtx = new Ctx();
        const ctx = window.__lzAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = data.wave || 'triangle';
        o.frequency.value = +f || 440;
        o.connect(g); g.connect(ctx.destination);
        const t0 = ctx.currentTime;
        g.gain.setValueAtTime(0.001, t0);
        g.gain.linearRampToValueAtTime(0.18, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.start(t0); o.stop(t0 + dur + 0.02);
      } catch(_){}
    };
    $$('.sb-synth-pad', box).forEach(b => b.onclick = () => {
      b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 220);
      playFreq(+b.dataset.f);
    });
    $('[data-seq]', box).onclick = () => {
      notes.forEach((n, i) => setTimeout(() => {
        const pad = $$('.sb-synth-pad', box)[i];
        if (pad){ pad.classList.add('hit'); setTimeout(() => pad.classList.remove('hit'), 220); }
        playFreq(n.freq || 440, 0.3);
      }, i * 210));
    };
    return box;
  }

  /* 18) INTERACTIVE SIDE-BY-SIDE COMPARISON CARDS */
  if (l === 'loki-compare' || l === 'compare' || l === 'comparison'){
    const items = Array.isArray(data.items) ? data.items : (Array.isArray(data.options) ? data.options : []);
    if (!items.length) return null;
    const box = el('div', 'stark-block stark-compare-block');
    let onlyDiff = false;
    let selectedIdx = items.findIndex(x => x.recommended || x.winner || x.featured);
    if (selectedIdx < 0) selectedIdx = 0;

    // Collect union of feature keys
    const featKeys = [];
    const seen = new Set();
    items.forEach(it => {
      const f = it.features || it.specs || {};
      if (Array.isArray(f)){
        f.forEach(row => {
          const k = typeof row === 'string' ? row : (row.label || row.name || '');
          if (k && !seen.has(k)){ seen.add(k); featKeys.push(k); }
        });
      } else if (f && typeof f === 'object'){
        Object.keys(f).forEach(k => { if (!seen.has(k)){ seen.add(k); featKeys.push(k); } });
      }
    });

    const getFeatVal = (it, key) => {
      const f = it.features || it.specs || {};
      if (Array.isArray(f)){
        const found = f.find(row => (typeof row === 'string' ? row : (row.label || row.name)) === key);
        if (!found) return '—';
        return typeof found === 'string' ? true : (found.value ?? true);
      }
      return Object.prototype.hasOwnProperty.call(f, key) ? f[key] : '—';
    };

    const renderCmp = () => {
      box.innerHTML = `<div class="sb-head"><span class="sb-badge">⚖️ ${esc(data.title || 'Interactive Comparison')}</span><div class="sb-actions"><button type="button" class="sb-dl" data-diff>${onlyDiff ? '✦ Show All' : '⚡ Differences Only'}</button></div></div>`;
      const grid = el('div', 'sb-cmp-grid');
      grid.style.setProperty('--cmp-cols', String(Math.min(4, Math.max(2, items.length))));
      items.forEach((it, idx) => {
        const isSel = idx === selectedIdx;
        const isRec = !!(it.recommended || it.winner || it.featured);
        const card = el('div', 'sb-cmp-card' + (isSel ? ' selected' : '') + (isRec ? ' recommended' : ''));
        card.setAttribute('dir', 'auto');
        let rowsHtml = '';
        featKeys.forEach(k => {
          const vals = items.map(x => String(getFeatVal(x, k)));
          const allSame = vals.every(v => v === vals[0]);
          if (onlyDiff && allSame) return;
          const rawV = getFeatVal(it, k);
          let disp = '';
          if (rawV === true || String(rawV).toLowerCase() === 'yes' || rawV === '✓') disp = '<span class="sb-cmp-yes">✓</span>';
          else if (rawV === false || String(rawV).toLowerCase() === 'no' || rawV === '✕') disp = '<span class="sb-cmp-no">✕</span>';
          else disp = `<span class="sb-cmp-val">${esc(String(rawV))}</span>`;
          rowsHtml += `<div class="sb-cmp-row"><span class="sb-cmp-k">${esc(k)}</span>${disp}</div>`;
        });
        card.innerHTML = `
          ${isRec ? `<span class="sb-cmp-ribbon">★ ${esc(it.badge || 'Recommended')}</span>` : (it.badge ? `<span class="sb-cmp-ribbon subtle">${esc(it.badge)}</span>` : '')}
          <div class="sb-cmp-top">
            <div class="sb-cmp-name">${it.icon ? `<span class="sb-cmp-ic">${esc(it.icon)}</span>` : ''}<b>${esc(it.name || it.title || ('Option ' + (idx + 1)))}</b></div>
            ${it.price || it.metric ? `<div class="sb-cmp-price">${esc(it.price || it.metric)}</div>` : ''}
            ${it.tagline || it.subtitle ? `<p class="sb-cmp-sub">${esc(it.tagline || it.subtitle)}</p>` : ''}
          </div>
          <div class="sb-cmp-rows">${rowsHtml || '<div class="sb-cmp-row"><span>All listed features are identical</span></div>'}</div>
          <button type="button" class="sb-cmp-pick">${isSel ? '✓ Selected Focus' : 'Compare Focus'}</button>
        `;
        $('.sb-cmp-pick', card).onclick = () => { selectedIdx = idx; renderCmp(); };
        grid.appendChild(card);
      });
      box.appendChild(grid);
      if (data.verdict || data.summary){
        const v = el('div', 'sb-cmp-verdict');
        v.setAttribute('dir', 'auto');
        v.innerHTML = `<b>✦ Verdict:</b> ${esc(data.verdict || data.summary)}`;
        box.appendChild(v);
      }
      $('[data-diff]', box).onclick = () => { onlyDiff = !onlyDiff; renderCmp(); };
    };
    renderCmp();
    return box;
  }

  /* 19) INTERACTIVE MULTI-TAB CONTENT SWITCHER */
  if (l === 'loki-tabs' || l === 'tabs'){
    const tabs = Array.isArray(data.tabs) ? data.tabs : (Array.isArray(data.panels) ? data.panels : []);
    if (!tabs.length) return null;
    const box = el('div', 'stark-block stark-tabs-block');
    let activeIdx = 0;
    const renderTabs = () => {
      box.innerHTML = `<div class="sb-head"><span class="sb-badge">🗂️ ${esc(data.title || 'Interactive Explorer')}</span><div class="sb-actions"><button type="button" class="sb-dl" data-copy-tab>Copy Tab</button></div></div>`;
      const bar = el('div', 'sb-tab-bar');
      bar.setAttribute('role', 'tablist');
      tabs.forEach((tb, idx) => {
        const btn = el('button', 'sb-tab-btn' + (idx === activeIdx ? ' active' : ''));
        btn.type = 'button';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', idx === activeIdx ? 'true' : 'false');
        btn.innerHTML = `${tb.icon ? `<span>${esc(tb.icon)}</span>` : ''}<span>${esc(tb.label || tb.title || ('Tab ' + (idx + 1)))}</span>`;
        btn.onclick = () => { activeIdx = idx; renderTabs(); };
        bar.appendChild(btn);
      });
      const cur = tabs[activeIdx] || {};
      const panel = el('div', 'sb-tab-panel');
      panel.setAttribute('dir', 'auto');
      let bodyHtml = '';
      if (cur.summary) bodyHtml += `<p class="sb-tab-summary">${esc(cur.summary)}</p>`;
      if (cur.content) bodyHtml += `<div class="sb-tab-md">${mdToHtml(String(cur.content))}</div>`;
      if (Array.isArray(cur.points) && cur.points.length){
        bodyHtml += `<ul class="sb-tab-points">${cur.points.map(p => `<li dir="auto">${esc(typeof p === 'string' ? p : (p.text || p.label || ''))}</li>`).join('')}</ul>`;
      }
      if (cur.code){
        bodyHtml += `<pre class="sb-tab-code"><code>${esc(cur.code)}</code></pre>`;
      }
      panel.innerHTML = bodyHtml || '<p class="sb-tab-summary">No content in this tab.</p>';
      box.append(bar, panel);
      $('[data-copy-tab]', box).onclick = () => {
        const plain = [cur.label || cur.title || '', cur.summary || '', cur.content || '', ...(cur.points || []), cur.code || ''].filter(Boolean).join('\n');
        navigator.clipboard.writeText(plain).then(() => toast('Tab content copied'));
      };
    };
    renderTabs();
    return box;
  }

  /* 20) LIVE INTERACTIVE FORMULA / SCENARIO CALCULATOR */
  if (l === 'loki-calc' || l === 'calculator' || l === 'calc'){
    const inputs = Array.isArray(data.inputs) ? data.inputs : [];
    const outputs = Array.isArray(data.outputs) ? data.outputs : (data.formula ? [{ label: data.resultLabel || 'Result', formula: data.formula, unit: data.unit || '', prefix: data.prefix || '' }] : []);
    if (!inputs.length || !outputs.length) return null;

    const evalSafeMath = (expr, vars) => {
      if (!expr || typeof expr !== 'string' || expr.length > 400) return null;
      const fns = {
        round: (x, d = 0) => { const f = Math.pow(10, Math.max(0, Math.min(8, Math.trunc(d)))); return Math.round(x * f) / f; },
        floor: Math.floor, ceil: Math.ceil, sqrt: x => x < 0 ? NaN : Math.sqrt(x),
        abs: Math.abs, min: Math.min, max: Math.max, pow: Math.pow, log: Math.log, log10: Math.log10, exp: Math.exp
      };
      const tokens = []; let i = 0; const s = expr.trim();
      while (i < s.length){
        const c = s[i];
        if (/\s/.test(c)){ i++; continue; }
        if (/[0-9.]/.test(c)){
          let n = '', dots = 0;
          while (i < s.length && /[0-9.]/.test(s[i])){ if (s[i] === '.') dots++; if (dots > 1) return null; n += s[i++]; }
          const v = Number(n); if (!Number.isFinite(v)) return null;
          tokens.push({ t:'n', v }); continue;
        }
        if (/[a-zA-Z_]/.test(c)){
          let id = ''; while (i < s.length && /[a-zA-Z0-9_.]/.test(s[i])) id += s[i++];
          tokens.push({ t:'i', v:id }); continue;
        }
        if ('+-*/^%'.includes(c)){
          if (c === '*' && s[i + 1] === '*'){ tokens.push({ t:'o', v:'^' }); i += 2; }
          else { tokens.push({ t:'o', v:c }); i++; }
          continue;
        }
        if (c === '(' || c === ')'){ tokens.push({ t:'p', v:c }); i++; continue; }
        if (c === ','){ tokens.push({ t:'c' }); i++; continue; }
        return null;
      }
      let p = 0; const pk = () => tokens[p]; const nx = () => tokens[p++];
      const parseE = () => { let l = parseT(); while (pk()?.t === 'o' && (pk().v === '+' || pk().v === '-')){ const o = nx().v; const r = parseT(); l = o === '+' ? l + r : l - r; } return l; };
      const parseT = () => { let l = parsePow(); while (pk()?.t === 'o' && '*/%'.includes(pk().v)){ const o = nx().v; const r = parsePow(); l = o === '*' ? l * r : (r === 0 ? NaN : (o === '/' ? l / r : l % r)); } return l; };
      const parsePow = () => { let b = parseU(); if (pk()?.t === 'o' && pk().v === '^'){ nx(); b = Math.pow(b, parsePow()); } return b; };
      const parseU = () => { if (pk()?.t === 'o' && (pk().v === '+' || pk().v === '-')){ const o = nx().v; const v = parseU(); return o === '-' ? -v : v; } return parseP(); };
      const parseP = () => {
        const tk = pk(); if (!tk) return NaN;
        if (tk.t === 'n'){ nx(); return tk.v; }
        if (tk.t === 'p' && tk.v === '('){ nx(); const v = parseE(); const cl = nx(); return (cl && cl.t === 'p' && cl.v === ')') ? v : NaN; }
        if (tk.t === 'i'){
          nx(); const nm = tk.v.startsWith('Math.') ? tk.v.slice(5) : tk.v;
          if (pk()?.t === 'p' && pk().v === '('){
            const fn = fns[nm.toLowerCase()]; if (!fn) return NaN;
            nx(); const args = [];
            if (!(pk()?.t === 'p' && pk().v === ')')){ args.push(parseE()); while (pk()?.t === 'c'){ nx(); args.push(parseE()); } }
            const cl = nx(); return (cl && cl.t === 'p' && cl.v === ')') ? fn(...args) : NaN;
          }
          if (nm === 'PI' || nm === 'pi') return Math.PI;
          if (nm === 'E') return Math.E;
          return Object.prototype.hasOwnProperty.call(vars, tk.v) ? Number(vars[tk.v]) : NaN;
        }
        return NaN;
      };
      try { const res = parseE(); return (p === tokens.length && Number.isFinite(res)) ? res : null; } catch { return null; }
    };

    const stateVals = {};
    inputs.forEach(inp => { stateVals[inp.id || inp.name] = Number(inp.default ?? inp.value ?? inp.min ?? 0); });

    const box = el('div', 'stark-block stark-calc-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">🧮 ${esc(data.title || 'Live Calculator')}</span><div class="sb-actions"><button type="button" class="sb-dl" data-calc-reset>↺ Reset</button></div></div>`;
    const body = el('div', 'sb-calc-body');
    const controls = el('div', 'sb-calc-controls');
    const resultsBox = el('div', 'sb-calc-results');

    const fmtNum = (val, o) => {
      if (val === null || !Number.isFinite(val)) return '—';
      const dec = typeof o.decimals === 'number' ? o.decimals : (Math.abs(val) >= 100 ? 0 : 2);
      const formatted = val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dec });
      return `${o.prefix || ''}${formatted}${o.unit || o.suffix || ''}`;
    };

    const updateOutputs = () => {
      resultsBox.innerHTML = '';
      outputs.forEach((o, idx) => {
        const val = evalSafeMath(o.formula, stateVals);
        const card = el('div', 'sb-calc-res-card' + (idx === 0 ? ' primary' : ''));
        card.setAttribute('dir', 'auto');
        card.innerHTML = `<span class="sb-calc-res-lbl">${esc(o.label || 'Result')}</span><b class="sb-calc-res-val">${esc(fmtNum(val, o))}</b>${o.note ? `<small>${esc(o.note)}</small>` : ''}`;
        resultsBox.appendChild(card);
      });
    };

    const renderInputs = () => {
      controls.innerHTML = '';
      inputs.forEach(inp => {
        const key = inp.id || inp.name;
        const min = Number(inp.min ?? 0);
        const max = Number(inp.max ?? 100);
        const step = Number(inp.step ?? 1);
        const row = el('div', 'sb-calc-row');
        row.setAttribute('dir', 'auto');
        row.innerHTML = `
          <div class="sb-calc-row-top">
            <label>${esc(inp.label || key)}</label>
            <span class="sb-calc-val-pill">${esc(inp.prefix || '')}<b data-val>${esc(String(stateVals[key]))}</b>${esc(inp.unit || inp.suffix || '')}</span>
          </div>
          <div class="sb-calc-inputs">
            <input type="range" min="${min}" max="${max}" step="${step}" value="${stateVals[key]}">
            <input type="number" min="${min}" max="${max}" step="${step}" value="${stateVals[key]}">
          </div>
        `;
        const rng = $('input[type="range"]', row);
        const num = $('input[type="number"]', row);
        const lbl = $('[data-val]', row);
        const sync = v => {
          const n = Number(v);
          if (!Number.isFinite(n)) return;
          stateVals[key] = n;
          rng.value = String(Math.max(min, Math.min(max, n)));
          num.value = String(n);
          lbl.textContent = n.toLocaleString('en-US');
          updateOutputs();
        };
        rng.oninput = () => sync(rng.value);
        num.oninput = () => sync(num.value);
        controls.appendChild(row);
      });
    };

    body.append(controls, resultsBox);
    box.appendChild(body);
    renderInputs();
    updateOutputs();
    $('[data-calc-reset]', box).onclick = () => {
      inputs.forEach(inp => { stateVals[inp.id || inp.name] = Number(inp.default ?? inp.value ?? inp.min ?? 0); });
      renderInputs();
      updateOutputs();
    };
    return box;
  }

  /* 21) ANIMATED SORTABLE PROGRESS / SCORE BARS */
  if (l === 'loki-progress' || l === 'bars' || l === 'progress'){
    const rawItems = Array.isArray(data.items) ? data.items : (Array.isArray(data.bars) ? data.bars : []);
    if (!rawItems.length) return null;
    const maxVal = Number(data.max) || Math.max(...rawItems.map(x => Number(x.value ?? x.score ?? 0)), 100);
    const box = el('div', 'stark-block stark-progress-block');
    let sortMode = 'default';

    const renderBars = () => {
      const sorted = [...rawItems];
      if (sortMode === 'desc') sorted.sort((a, b) => Number(b.value ?? b.score ?? 0) - Number(a.value ?? a.score ?? 0));
      if (sortMode === 'asc') sorted.sort((a, b) => Number(a.value ?? a.score ?? 0) - Number(b.value ?? b.score ?? 0));
      box.innerHTML = `<div class="sb-head"><span class="sb-badge">📶 ${esc(data.title || 'Visual Breakdown')}</span><div class="sb-actions"><button type="button" class="sb-dl ${sortMode === 'desc' ? 'on' : ''}" data-sort="desc">↓ High</button><button type="button" class="sb-dl ${sortMode === 'asc' ? 'on' : ''}" data-sort="asc">↑ Low</button><button type="button" class="sb-dl ${sortMode === 'default' ? 'on' : ''}" data-sort="default">↺</button></div></div>`;
      const list = el('div', 'sb-prog-list');
      sorted.forEach((it, idx) => {
        const val = Number(it.value ?? it.score ?? 0);
        const pct = Math.max(2, Math.min(100, (val / (maxVal || 100)) * 100));
        const unit = it.unit ?? data.unit ?? '%';
        const row = el('div', 'sb-prog-item');
        row.setAttribute('dir', 'auto');
        row.innerHTML = `
          <div class="sb-prog-top">
            <span class="sb-prog-lbl">${it.icon ? `<span>${esc(it.icon)}</span>` : ''}${esc(it.label || it.name || ('Item ' + (idx + 1)))}${it.tag ? `<em>${esc(it.tag)}</em>` : ''}</span>
            <span class="sb-prog-num">${esc(String(val))}${esc(unit)}</span>
          </div>
          <div class="sb-prog-track"><div class="sb-prog-fill" style="--target-w:${pct.toFixed(1)}%;${it.color ? `background:${esc(it.color)}` : ''}"></div></div>
          ${it.note ? `<small class="sb-prog-note">${esc(it.note)}</small>` : ''}
        `;
        list.appendChild(row);
      });
      box.appendChild(list);
      $$('[data-sort]', box).forEach(btn => btn.onclick = () => { sortMode = btn.dataset.sort; renderBars(); });
    };
    renderBars();
    return box;
  }

  /* 22) INTERACTIVE EXPANDABLE MIND-MAP / CONCEPT TREE */
  if (l === 'loki-tree' || l === 'mindmap' || l === 'tree'){
    const rootNode = data.root || (Array.isArray(data.nodes) ? { label: data.title || 'Overview', children: data.nodes } : null);
    if (!rootNode) return null;
    const box = el('div', 'stark-block stark-tree-block');
    box.innerHTML = `<div class="sb-head"><span class="sb-badge">🌿 ${esc(data.title || rootNode.label || 'Concept Map')}</span><div class="sb-actions"><button type="button" class="sb-dl" data-exp="1">Expand All</button><button type="button" class="sb-dl" data-exp="0">Collapse</button></div></div>`;
    const treeWrap = el('div', 'sb-tree-wrap');
    const detailBar = el('div', 'sb-tree-detail');
    detailBar.setAttribute('dir', 'auto');
    detailBar.innerHTML = `<b>${esc(rootNode.label || 'Explore')}</b><span>${esc(rootNode.desc || rootNode.note || 'Click any node to inspect details or expand branches.')}</span>`;

    const buildNode = (node, depth = 0) => {
      const hasKids = Array.isArray(node.children) && node.children.length > 0;
      const item = el('div', 'sb-tree-node' + (depth === 0 ? ' root' : '') + (hasKids ? ' has-kids open' : ''));
      const row = el('button', 'sb-tree-row');
      row.type = 'button';
      row.setAttribute('dir', 'auto');
      row.innerHTML = `
        <span class="sb-tree-chev">${hasKids ? '▾' : '•'}</span>
        ${node.icon ? `<span class="sb-tree-ic">${esc(node.icon)}</span>` : ''}
        <span class="sb-tree-lbl">${esc(node.label || node.name || '')}</span>
        ${node.badge ? `<span class="sb-tree-badge">${esc(node.badge)}</span>` : ''}
      `;
      row.onclick = () => {
        if (hasKids) item.classList.toggle('open');
        $$('.sb-tree-row.active', treeWrap).forEach(r => r.classList.remove('active'));
        row.classList.add('active');
        detailBar.innerHTML = `<b>${esc(node.label || node.name || '')}</b><span>${esc(node.desc || node.note || (hasKids ? `${node.children.length} sub-topics inside this branch.` : 'Leaf concept node.'))}</span>`;
      };
      item.appendChild(row);
      if (hasKids){
        const kids = el('div', 'sb-tree-kids');
        node.children.forEach(ch => kids.appendChild(buildNode(ch, depth + 1)));
        item.appendChild(kids);
      }
      return item;
    };

    treeWrap.appendChild(buildNode(rootNode, 0));
    box.append(treeWrap, detailBar);
    $$('[data-exp]', box).forEach(btn => btn.onclick = () => {
      const open = btn.dataset.exp === '1';
      $$('.sb-tree-node.has-kids', treeWrap).forEach(n => n.classList.toggle('open', open));
    });
    return box;
  }

  /* 23) STRUCTURED EXECUTIVE REVIEW / RATING SCORECARD */
  if (l === 'loki-verdict' || l === 'rating' || l === 'review' || l === 'scorecard'){
    const score = Number(data.score ?? data.rating ?? 8.8);
    const maxScore = Number(data.maxScore ?? (score <= 5 ? 5 : 10));
    const pct = Math.max(0, Math.min(100, (score / maxScore) * 100));
    const dims = Array.isArray(data.dimensions) ? data.dimensions : (Array.isArray(data.categories) ? data.categories : []);
    const box = el('div', 'stark-block stark-verdict-block');
    box.setAttribute('dir', 'auto');
    const starsCount = Math.round((pct / 100) * 5);
    const starsStr = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);
    box.innerHTML = `
      <div class="sb-head"><span class="sb-badge">🏆 ${esc(data.title || 'Executive Verdict')}</span>${data.badge ? `<span class="sb-verdict-chip">${esc(data.badge)}</span>` : ''}</div>
      <div class="sb-verdict-hero">
        <div class="sb-verdict-ring" style="--vpct:${pct.toFixed(0)}%">
          <div class="sb-verdict-ring-in"><b>${esc(String(score))}</b><small>/${esc(String(maxScore))}</small></div>
        </div>
        <div class="sb-verdict-copy">
          <div class="sb-verdict-stars" aria-label="${starsCount} out of 5 stars">${starsStr}</div>
          ${data.headline ? `<h4 class="sb-verdict-hl">${esc(data.headline)}</h4>` : ''}
          <p class="sb-verdict-sum">${esc(data.summary || data.verdict || '')}</p>
        </div>
      </div>
      ${dims.length ? `<div class="sb-verdict-dims">${dims.map(d => {
        const dv = Number(d.score ?? d.value ?? 8);
        const dp = Math.max(0, Math.min(100, (dv / maxScore) * 100));
        return `<div class="sb-vdim"><div class="sb-vdim-top"><span>${esc(d.label || d.name || '')}</span><b>${esc(String(dv))}/${esc(String(maxScore))}</b></div><div class="sb-vdim-bar"><i style="width:${dp.toFixed(0)}%"></i></div></div>`;
      }).join('')}</div>` : ''}
      ${(Array.isArray(data.bestFor) && data.bestFor.length) || (Array.isArray(data.avoidIf) && data.avoidIf.length) ? `
        <div class="sb-verdict-tags">
          ${(data.bestFor || []).map(x => `<span class="sb-vtag good">✓ ${esc(x)}</span>`).join('')}
          ${(data.avoidIf || []).map(x => `<span class="sb-vtag warn">⚠ ${esc(x)}</span>`).join('')}
        </div>` : ''}
    `;
    return box;
  }

  return null;
}

const STARK_BLOCK_LANGS = [
  'loki-chart', 'chart', 'loki-metrics', 'metrics', 'loki-proscons', 'proscons',
  'loki-timeline', 'timeline', 'loki-steps', 'checklist', 'steps', 'loki-checklist',
  'loki-cards', 'flashcards', 'cards', 'loki-flashcards',
  'loki-callout', 'insight', 'callout', 'loki-insight',
  'loki-kanban', 'kanban', 'board', 'loki-board', 'loki-quiz', 'quiz',
  'loki-table', 'datatable', 'table', 'grid', 'loki-grid',
  'loki-codeplay', 'sandbox', 'loki-architecture', 'flow', 'diagram',
  'loki-swot', 'swot', 'loki-accordion', 'faq', 'loki-decision', 'decision',
  'loki-codecompare', 'diff', 'loki-audio', 'synth',
  'loki-compare', 'compare', 'comparison',
  'loki-tabs', 'tabs',
  'loki-calc', 'calculator', 'calc',
  'loki-progress', 'bars', 'progress',
  'loki-tree', 'mindmap', 'tree',
  'loki-verdict', 'rating', 'review', 'scorecard',
  'mermaid', 'svg', 'loki-html', 'html-widget'
];

/* Only compose interactive visual blocks when the user EXPLICITLY asks for a chart/timeline/table/kanban/matrix/cards/compare/tree/rating and the LLM didn't include one */
function autoComposeInteractiveBlocks(userText, replyText){
  const text = String(replyText || '');
  const u = String(userText || '').trim();
  if (!text || !u || u.length < 10) return text;
  if (/```(?:loki-|chart|metrics|proscons|timeline|checklist|flashcards|insight|kanban|quiz|datatable|sandbox|flow|swot|faq|decision|diff|synth|table|compare|comparison|tabs|calc|calculator|bars|progress|tree|mindmap|verdict|rating|scorecard|mermaid|svg|loki-html|html-widget|html)\b/i.test(text) || /\|.*\|.*\|/.test(text)) {
    return text;
  }
  const explicitChart = /\b(chart|bar chart|line chart|pie chart|radar chart|plot a graph|גרף|תרשים)\b/i.test(u);
  const explicitTimeline = /\b(timeline|ציר זמן)\b/i.test(u);
  const explicitTable = /\b(table|data table|comparison table|tabular|טבלה|טבלאות|השוואה בטבלה|לוח נתונים)\b/i.test(u);
  const explicitDecision = /\b(decision matrix|weighted matrix|מטריצת החלטה)\b/i.test(u);
  const explicitKanban = /\b(kanban|sprint board|task board|לוח קנבן)\b/i.test(u);
  const explicitCards = /\b(3d cards|flashcards|study cards|כרטיסיות)\b/i.test(u);
  const explicitTree = /\b(mind\s?map|concept tree|roadmap tree|מפת חשיבה|עץ נושאים)\b/i.test(u);
  const explicitProgress = /\b(progress bars|score breakdown|skill bars|מדדי ציון|התפלגות אחוזים)\b/i.test(u);

  if (!explicitChart && !explicitTimeline && !explicitTable && !explicitDecision && !explicitKanban && !explicitCards && !explicitTree && !explicitProgress) {
    return text;
  }

  const isH = isHeb(u || text);
  const titleBase = u.replace(/[`"'*\n]/g, ' ').trim().slice(0, 46) || 'Overview';
  const blocks = [];

  if (explicitTable){
    blocks.push(isH
      ? `| קטגוריה | פירוט והסבר | דוגמה מעשית |\n| :--- | :--- | :--- |\n| היבט מרכזי | מידע ונתונים מהותיים | יישום מומלץ |\n| היבט משלים | ניתוח והרחבה | תרחיש בפועל |`
      : `| Category | Description | Practical Example |\n| :--- | :--- | :--- |\n| Core Element | Essential data & key metrics | Recommended application |\n| Secondary Element | Deep dive & extended scope | Real-world scenario |`
    );
  }
  if (explicitChart){
    blocks.push('```loki-chart\n' + JSON.stringify({
      type: 'bar',
      title: isH ? `גרף השוואתי: ${titleBase}` : `Comparison Chart: ${titleBase}`,
      labels: isH ? ['אפשרות א׳', 'אפשרות ב׳', 'אפשרות ג׳', 'אופטימלי'] : ['Option A', 'Option B', 'Option C', 'Optimal'],
      datasets: [{label: isH ? 'ציון' : 'Score', data: [72, 81, 88, 96]}]
    }) + '\n```');
  }
  if (explicitTimeline){
    blocks.push('```loki-timeline\n' + JSON.stringify({
      title: isH ? `ציר זמן: ${titleBase}` : `Timeline: ${titleBase}`,
      events: [
        {date: 'Phase 1', title: isH ? 'ייסוד והתחלה' : 'Foundation & Origins', desc: isH ? 'נקודת הפתיחה והבסיס ההיסטורי.' : 'Initial milestone and foundational stage.'},
        {date: 'Phase 2', title: isH ? 'התפתחות מרכזית' : 'Key Development', desc: isH ? 'צמיחה והתרחבות משמעותית.' : 'Major expansion and breakthrough milestone.'},
        {date: 'Phase 3', title: isH ? 'המצב כיום' : 'Modern Era', desc: isH ? 'התפתחות עדכנית ומבט קדימה.' : 'Current state and modern advancements.'}
      ]
    }) + '\n```');
  }
  if (explicitDecision){
    blocks.push('```loki-decision\n' + JSON.stringify({
      title: isH ? 'מטריצת החלטה משוקללת' : 'Interactive Weighted Decision Matrix',
      criteria: [{name: isH ? 'ביצועים' : 'Performance', weight: 9}, {name: isH ? 'יעילות' : 'Efficiency', weight: 8}],
      options: [{name: 'Option A', scores: [9.4, 9.1]}, {name: 'Option B', scores: [8.2, 8.5]}]
    }) + '\n```');
  }
  if (explicitKanban){
    blocks.push('```loki-kanban\n' + JSON.stringify({
      title: `Kanban: ${titleBase}`,
      columns: [{title: 'To Do', items: ['Phase 3']}, {title: 'In Progress', items: ['Phase 2']}, {title: 'Done', items: ['Phase 1']}]
    }) + '\n```');
  }
  if (explicitCards){
    blocks.push('```loki-cards\n' + JSON.stringify({
      title: `3D Cards: ${titleBase}`,
      cards: [{front: 'Concept 1', back: 'Key principle'}, {front: 'Concept 2', back: 'Practical application'}]
    }) + '\n```');
  }
  if (explicitTree){
    blocks.push('```loki-tree\n' + JSON.stringify({
      title: isH ? `מפת חשיבה: ${titleBase}` : `Mind Map: ${titleBase}`,
      root: {
        label: titleBase,
        desc: isH ? 'תצוגת עץ אינטראקטיבית של הנושא המרכזי.' : 'Interactive concept hierarchy.',
        children: [
          { label: isH ? 'יסודות' : 'Fundamentals', icon: '◆', children: [{ label: isH ? 'עקרונות ליבה' : 'Core Principles' }, { label: isH ? 'מושגי מפתח' : 'Key Terms' }] },
          { label: isH ? 'יישום מעשי' : 'Practical Application', icon: '⚡', children: [{ label: isH ? 'כלים ושיטות' : 'Tools & Methods' }, { label: isH ? 'צעדים הבאים' : 'Next Steps' }] }
        ]
      }
    }) + '\n```');
  }
  if (explicitProgress){
    blocks.push('```loki-progress\n' + JSON.stringify({
      title: isH ? `פירוט מדדים: ${titleBase}` : `Score Breakdown: ${titleBase}`,
      max: 100,
      items: [
        { label: isH ? 'איכות ודיוק' : 'Quality & Accuracy', value: 92, unit: '%' },
        { label: isH ? 'מהירות ויעילות' : 'Speed & Efficiency', value: 88, unit: '%' },
        { label: isH ? 'שימושיות' : 'Usability', value: 95, unit: '%' }
      ]
    }) + '\n```');
  }

  return blocks.length ? (text + '\n\n' + blocks.join('\n\n')) : text;
}

function enhance(root, sources, light){
  $$('p,li,h1,h2,h3,h4,blockquote,td,th', root).forEach(n => n.setAttribute('dir', 'auto'));
  $$('a', root).forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  if (sources && sources.length) linkCitations(root, sources);
  if (light) return;

  // Upgrade standard markdown tables to rich interactive tables with CSV export
  $$('table', root).forEach(tbl => {
    if (tbl.closest('.sb-tbl-wrap') || tbl.closest('.md-table-wrap')) return;
    const wrap = el('div', 'stark-block md-table-wrap');
    const head = el('div', 'sb-head', `<span class="sb-badge">📑 ${t('Table')}</span><div class="sb-actions"><button type="button" class="sb-dl" title="Download CSV">⤓ CSV</button></div>`);
    const scrollBox = el('div', 'sb-tbl-wrap');
    tbl.replaceWith(wrap);
    scrollBox.appendChild(tbl);
    wrap.append(head, scrollBox);
    $$('th,td', tbl).forEach(cell => cell.setAttribute('dir', 'auto'));
    const dlBtn = $('.sb-dl', wrap);
    if (dlBtn){
      dlBtn.onclick = () => {
        const rows = Array.from(tbl.querySelectorAll('tr')).map(tr => Array.from(tr.querySelectorAll('th,td')).map(td => `"${td.textContent.trim().replace(/"/g, '""')}"`).join(','));
        download(rows.join('\n'), 'table.csv', 'text/csv');
      };
    }
  });

  $$('pre > code', root).forEach(code => {
    try {
      const pre = code.parentElement;
      if (!pre || !pre.parentElement || pre.parentElement.classList.contains('codeblock')) return;
      const rawLang = ((code.className.match(/language-([\w+#:-]+)/) || [])[1] || '').toLowerCase();
      let lang = rawLang.replace(/^ui[-:]/, 'loki-');
      if (lang === 'mermaid'){
        const box = el('div', 'stark-block mermaid-block');
        box.innerHTML = `<div class="sb-head"><span class="sb-badge">🔗 Diagram</span><b dir="auto">Mermaid</b></div><div class="mermaid-host"></div>`;
        const host = $('.mermaid-host', box);
        const src = code.textContent;
        pre.replaceWith(box);
        (async () => {
          try {
            await LZ.loadScript('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js');
            if (window.mermaid){
              mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });
              const id = 'mmd-' + Math.random().toString(36).slice(2);
              const out = await mermaid.render(id, src);
              host.innerHTML = out.svg || out;
            }
          } catch (e) {
            host.innerHTML = `<pre dir="auto">${esc(src)}</pre>`;
          }
        })();
        return;
      }
      if (lang === 'svg'){
        const box = el('div', 'stark-block svg-block');
        const raw = String(code.textContent || '').trim();
        const safe = window.DOMPurify ? DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true, svgFilters: true } }) : '';
        box.innerHTML = `<div class="sb-head"><span class="sb-badge">✏️ Drawing</span><b>SVG</b></div><div class="svg-host">${safe || ('<pre>' + esc(raw) + '</pre>')}</div>`;
        pre.replaceWith(box);
        return;
      }
      if (lang === 'loki-html' || lang === 'html-widget' || ((lang === 'html' || lang === '') && looksLikeInteractiveHtml(code.textContent))){
        const src = code.textContent;
        const title = extractWidgetTitle(src) || 'Interactive app';
        const rich = widgetEl({ title, html: ensureHtmlDocument(src, title) });
        pre.replaceWith(rich);
        return;
      }

      // Auto-detect interactive UI JSON even when the AI fenced it as ```json or plain ```
      if (!STARK_BLOCK_LANGS.includes(lang) && !lang.startsWith('loki-') && (lang === '' || lang === 'json' || lang === 'jsonc' || lang === 'javascript' || lang === 'js' || lang === 'text')){
        const prevTxt = pre.previousElementSibling ? (pre.previousElementSibling.textContent || '') : '';
        const parsed = safeParseBlockJSON(code.textContent) || (window.LZLiveUI ? LZLiveUI.repairPartialJson(code.textContent) : null);
        const inferred = parsed && window.LZLiveUI ? LZLiveUI.inferUiBlockFromData(parsed, prevTxt) : null;
        if (inferred) lang = inferred;
      }

      const isStarkBlock = STARK_BLOCK_LANGS.includes(lang) || lang.startsWith('loki-');

      if (isStarkBlock){
        const rich = renderInteractiveBlock(lang, code.textContent);
        if (rich){ pre.replaceWith(rich); return; }
        // Absolute guarantee: never fall through to a raw JSON codeblock for visual/presentation blocks!
        const fallbackCard = el('div', 'stark-block stark-visual-fallback');
        fallbackCard.innerHTML = `<div class="sb-head"><span class="sb-badge">📊 ${esc(lang)}</span><b dir="auto">${esc(t('Visual Presentation'))}</b></div><div class="sb-fb-body" dir="auto">${mdToHtml(code.textContent)}</div>`;
        pre.replaceWith(fallbackCard);
        return;
      }

      const wrap = el('div', 'codeblock');
      const head = el('div', 'cb-head', `<span>${esc(lang || 'code')}</span><button data-a="copy">⧉ Copy</button><button data-a="dl">⤓ Download</button><button data-a="lc">‹/› LokiCode</button>`);
      pre.replaceWith(wrap); wrap.append(head, pre);
      try {
        if (window.hljs){
          if (lang && hljs.getLanguage(lang)) {
            code.innerHTML = hljs.highlight(code.textContent, {language: lang, ignoreIllegals: true}).value;
          } else {
            code.innerHTML = hljs.highlightAuto(code.textContent).value;
          }
        }
      } catch(_){}
      code.classList.add('hljs');
      head.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        const txt = code.textContent;
        if (b.dataset.a === 'copy') copyText(txt);
        if (b.dataset.a === 'dl') download(txt, 'code.' + (EXT[lang] || 'txt'));
        if (b.dataset.a === 'lc' && window.LokiCode) LokiCode.open({code: txt, lang});
      });
    } catch (blockErr) {
      console.warn('enhance code block fallback:', blockErr);
    }
  });
}
function linkCitations(root, sources){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n => n.parentElement.closest('code,pre,a') ? NodeFilter.FILTER_REJECT : (/\[\d{1,2}\]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)});
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => {
    const frag = document.createDocumentFragment(); let last = 0; const s = n.nodeValue;
    s.replace(/\[(\d{1,2})\]/g, (m, d, i) => {
      const src = sources[+d - 1];
      frag.append(s.slice(last, i));
      if (src){ const a = el('a', 'cite', d); a.href = src.url; a.target = '_blank'; a.rel = 'noopener'; a.title = src.title; frag.append(a); }
      else frag.append(m);
      last = i + m.length;
    });
    frag.append(s.slice(last)); n.replaceWith(frag);
  });
}
function renderMarkdown(target, text, sources){ target.innerHTML = mdToHtml(text); enhance(target, sources); }
function plain(md){ return String(md || '').replace(/```[\s\S]*?```/g, ' (code) ').replace(/[#*_>`|~-]+/g, ' ').replace(/\[(\d+)\]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim(); }

/* ================= WORKING INDICATOR (4 SELECTABLE STYLES) ================= */
function Work(host, opts = {}){
  const root = el('div', 'work live');
  const wstyle = opts.forceStyle || S.workStyle || 'nebula';
  root.dataset.wstyle = wstyle;
  if (opts.forceStyle) root.dataset.previewLock = '1';
  root.innerHTML = `<div class="work-head work-pill">
    <span class="orb work-orb">
      <span class="wk-ring r1"></span>
      <span class="wk-ring r2"></span>
      <span class="wk-ring r3"></span>
      <span class="wk-spark"></span>
    </span>
    <span class="working-word work-word"></span>
    <span class="work-dots"><i></i><i></i><i></i></span>
    <span class="wk-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
    <span class="work-secs work-sec">0.0s</span>
    <span class="wk-step-pill">0 steps</span>
    <span class="work-now work-cur"></span>
    <button type="button" class="work-toggle work-caret" title="Show what I'm doing" aria-label="Toggle activity">▾</button>
    <div class="wk-progress-track"><div class="wk-progress-bar"></div></div>
  </div>
  <div class="work-log"><div class="work-body"><ol></ol></div></div>`;
  $('.working-word', root).textContent = t((opts.words && opts.words.working) || 'Working');
  root._words = opts.words;
  host.appendChild(root);
  if (window.Mascot && !opts.quiet) Mascot.set('thinking');
  const t0 = performance.now(), secsEl = $('.work-secs', root), nowEl = $('.work-now', root), stepPill = $('.wk-step-pill', root), ol = $('ol', root);
  const entries = [];
  $('.work-toggle', root).onclick = () => root.classList.toggle('open');
  if (opts.open) root.classList.add('open');
  let detachedTicks = 0;
  const timer = setInterval(() => {
    if (!root.isConnected){
      if (++detachedTicks > 30) clearInterval(timer);
      return;
    }
    detachedTicks = 0;
    secsEl.textContent = fmtDur((performance.now() - t0) / 1000);
  }, 150);
  function addLi(e, idx){
    $$('li.cur', ol).forEach(li => li.classList.remove('cur'));
    const li = el('li', 'cur wk-line');
    li.innerHTML = `<span class="wk-dot"></span><span class="wk-idx">${idx}</span><span class="lt">${fmtDur(e.t)}</span><span class="lx"></span>`;
    const lx = $('.lx', li);
    if (e.url){ lx.innerHTML = `<img src="${esc(LZ.favicon(e.url))}" alt="" onerror="this.remove()">`; lx.append(e.text + ' '); const a = el('a'); a.href = e.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = LZ.domainOf(e.url); lx.append(a); }
    else lx.textContent = e.text;
    ol.appendChild(li);
  }
  const api = {
    root, entries,
    log(text, url){
      const e = {t: (performance.now() - t0) / 1000, text}; if (url) e.url = url;
      entries.push(e);
      if (root.isConnected){
        addLi(e, entries.length);
        if (stepPill) stepPill.textContent = entries.length + (entries.length === 1 ? ' step' : ' steps');
        if (nowEl){ nowEl.textContent = text + (url ? ' ' + LZ.domainOf(url) : ''); nowEl.style.animation = 'none'; void nowEl.offsetWidth; nowEl.style.animation = ''; }
      }
      if (opts.onLog) opts.onLog(e);
    },
    done(){
      clearInterval(timer);
      const secs = (performance.now() - t0) / 1000;
      if (root.isConnected){
        $$('li.cur', ol).forEach(li => li.classList.remove('cur'));
        setDone(root, secs, entries.length);
      }
      return {secs, log: entries};
    },
    stopTimer(){ clearInterval(timer); },
    now(text){ nowEl.textContent = text; }
  };
  return api;
}
function setDone(root, secs, stepCount){
  if (!root) return;
  root.classList.remove('live');
  root.classList.add('done');
  const head = $('.work-head', root);
  if (!head) return;
  const ww = t((root._words && root._words.worked) || 'Worked');
  const stepsBadge = stepCount ? `<span class="wk-done-steps">${stepCount} ${stepCount === 1 ? 'step' : 'steps'}</span>` : '';
  head.innerHTML = `<span class="worked-word"><span class="wk-done-orb">✓</span>${CLOCK_SVG} <span class="ww"></span> <b>${fmtDur(secs)}</b>${stepsBadge}</span><button type="button" class="work-toggle work-caret" title="Show what I did" aria-label="Toggle activity">▾</button>`;
  $('.ww', head).textContent = ww;
  $('.work-toggle', head).onclick = () => root.classList.toggle('open');
}
function staticWork(host, log, secs){
  const w = Work(host, {quiet:true}); w.stopTimer();
  (log || []).forEach(e => { w.entries.push(e); });
  const ol = $('ol', w.root);
  (log || []).forEach((e, i) => {
    const li = el('li', 'wk-line');
    li.innerHTML = `<span class="wk-dot"></span><span class="wk-idx">${i + 1}</span><span class="lt">${fmtDur(+e.t)}</span><span class="lx"></span>`;
    const lx = $('.lx', li);
    if (e.url){ lx.innerHTML = `<img src="${esc(LZ.favicon(e.url))}" alt="" onerror="this.remove()">`; lx.append(e.text + ' '); const a = el('a'); a.href = e.url; a.target = '_blank'; a.textContent = LZ.domainOf(e.url); lx.append(a); }
    else lx.textContent = e.text;
    ol.appendChild(li);
  });
  setDone(w.root, secs || 0, (log || []).length);
  return w.root;
}

/* ================= CONVERSATIONS / SIDEBAR ================= */
function newConv(){ return {id: uid(), title: 'New chat', pinned: false, created: Date.now(), updated: Date.now(), messages: []}; }
function convById(id){ return state.convs.find(c => c.id === id); }
/* BUI-18: leaving a chat no longer stops its answer — the turn keeps running (and the server keeps
   generating even if the app closes). These keep the composer's busy/stop state per chat. */
function syncBusy(){
  const t = state.current && state.turns.get(state.current.id);
  state.busy = !!t; state.ctl = t ? t.ctl : null;
  try { updateSend(); } catch(_){}
}
function isConvThinking(id){
  if (state.turns.has(id)) return true;
  for (const g of state.remoteGens.values()) if (g.convId === id && !g.done) return true;
  return false;
}
function startNewChat(){
  sound('newchat');
  state.current = null; syncBusy(); renderMessages(true); renderHistory(); showView('chat'); closeSidebarMobile(); $('#prompt').focus();
  ensureRichText();
}
function selectConv(id){
  state.current = convById(id) || null; syncBusy(); renderMessages(true); renderHistory(); showView('chat'); closeSidebarMobile();
}
function groupLabel(ts){
  const d = new Date(ts), now = new Date(); const day = 864e5;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= start) return 'Today'; if (ts >= start - day) return 'Yesterday'; if (ts >= start - 7*day) return 'Previous 7 days'; if (ts >= start - 30*day) return 'Previous 30 days';
  return d.toLocaleString('en', {month:'long', year:'numeric'});
}
const HIST_SVG = {
  chat: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 5.5h11a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 2.5v-2.5H4.5A1.5 1.5 0 0 1 3 13V7a1.5 1.5 0 0 1 1.5-1.5Z"/></svg>',
  code: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7 6-4 4 4 4"/><path d="m13 6 4 4-4 4"/><path d="m11 4-2 12"/></svg>',
  image: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="12" rx="2"/><circle cx="7.5" cy="8" r="1.2" fill="currentColor"/><path d="m17 13-3.5-3.5-4.5 4.5-2-2-4 4"/></svg>',
  video: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="10.5" height="10" rx="2"/><path d="m13 8.5 4.5-2.5v8L13 11.5"/></svg>',
  visual: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1.4"/><rect x="11" y="3" width="6" height="6" rx="1.4"/><rect x="3" y="11" width="6" height="6" rx="1.4"/><path d="M14 11v6M11 14h6"/></svg>',
  search: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><path d="M3 10h14"/><path d="M10 3a10 10 0 0 1 0 14 10 10 0 0 1 0-14Z"/></svg>',
  share: '<svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v9"/><path d="m6.5 6.5 3.5-3.5 3.5 3.5"/><path d="M4 12v3a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 15v-3"/></svg>',
  pin: '<svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 3.5 16.5 7.5 12 12l-1 4-3-3-4 3.5 3.5-4-3-3 4-1 4-5Z"/></svg>',
  unpin: '<svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l12 12"/><path d="M12.5 3.5 16.5 7.5 13 11"/><path d="M7.5 12.5 4 16"/></svg>',
  ren: '<svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 4.5a2 2 0 0 1 2.8 2.8L7.5 16H4v-3.5l9.5-8Z"/></svg>',
  del: '<svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6h11"/><path d="M7.5 6V4.5A1.5 1.5 0 0 1 9 3h2a1.5 1.5 0 0 1 1.5 1.5V6"/><path d="M6 6l.8 10a1.5 1.5 0 0 0 1.5 1.5h3.4a1.5 1.5 0 0 0 1.5-1.5L14 6"/></svg>'
};
function classifyConvMeta(c){
  const msgs = Array.isArray(c && c.messages) ? c.messages : [];
  const joined = msgs.map(m => String(m?.content || '')).join('\n').slice(0, 5000);
  if (msgs.some(m => m?.type === 'video') || /\b(generate.*video|ai video|צור סרטון)\b/i.test(joined)) return { kind: 'video', icon: HIST_SVG.video, isVisual: true };
  if (msgs.some(m => m?.type === 'image') || /data:image\/|\b(generate.*image|צור תמונה)\b/i.test(joined)) return { kind: 'image', icon: HIST_SVG.image, isVisual: true };
  if (/```(?:loki-|chart|compare|tabs|calc|progress|tree|verdict|table|metrics|kanban|timeline)/i.test(joined)) return { kind: 'visual', icon: HIST_SVG.visual, isVisual: true };
  if (/```(?:js|ts|jsx|tsx|py|python|html|css|sql|cpp|rust|go|java|bash|sh|json)/i.test(joined)) return { kind: 'code', icon: HIST_SVG.code, isVisual: false };
  if (/\b(search the web|חפש באינטרנט|מקורות)\b/i.test(joined)) return { kind: 'search', icon: HIST_SVG.search, isVisual: false };
  return { kind: 'chat', icon: HIST_SVG.chat, isVisual: false };
}
function formatShortAge(ts){
  const diff = Math.max(0, Date.now() - Number(ts || 0));
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return min + 'm';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h';
  const day = Math.floor(hr / 24);
  if (day < 7) return day + 'd';
  return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
let activeHistoryFilter = 'all';
function renderHistory(){
  const box = $('#history');
  const searchEl = $('#historySearch');
  const clearEl = $('#historySearchClear');
  const countEl = $('#historyCount');
  const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
  if (clearEl) clearEl.hidden = !q;
  box.innerHTML = '';

  const allWithMsgs = state.convs.filter(c => c.messages.length);
  let list = allWithMsgs;
  if (activeHistoryFilter === 'pinned') list = list.filter(c => c.pinned);
  else if (activeHistoryFilter === 'visual') list = list.filter(c => classifyConvMeta(c).isVisual);
  if (q) list = list.filter(c => c.title.toLowerCase().includes(q) || c.messages.some(m => (m.content || '').toLowerCase().includes(q)));

  if (countEl) countEl.textContent = String(list.length);

  if (!list.length){
    const msg = q
      ? `No conversations match “${esc(q)}”`
      : activeHistoryFilter === 'pinned'
        ? 'No pinned chats yet.<br>Hover a chat to pin your favorites.'
        : activeHistoryFilter === 'visual'
          ? 'No Rich UI or media chats yet.<br>Ask for a chart, comparison, or image.'
          : 'No conversations yet.<br>Start a new chat above to begin.';
    box.innerHTML = `<div class="h-empty"><div class="h-empty-orb">${HIST_SVG.chat}</div><p>${msg}</p></div>`;
    return;
  }

  const pinned = list.filter(c => c.pinned).sort((a, b) => b.updated - a.updated);
  const rest = list.filter(c => !c.pinned).sort((a, b) => b.updated - a.updated);
  let i = 0;
  const add = (label, arr) => {
    if (!arr.length) return;
    const grp = el('div', 'h-group');
    grp.innerHTML = `<span>${esc(label)}</span><i>${arr.length}</i>`;
    box.appendChild(grp);
    arr.forEach(c => box.appendChild(histItem(c, i++)));
  };
  add('Pinned', pinned);
  const groups = {};
  rest.forEach(c => { const g = groupLabel(c.updated); (groups[g] = groups[g] || []).push(c); });
  Object.keys(groups).forEach(g => add(g, groups[g]));
}
function histItem(c, i){
  const isActive = state.current && state.current.id === c.id;
  const meta = classifyConvMeta(c);
  const it = el('div', 'h-item' + (isActive ? ' active' : '') + ' kind-' + meta.kind);
  it.style.animationDelay = Math.min(i * 26, 280) + 'ms';
  it.setAttribute('role', 'listitem');
  const thinking = isConvThinking(c.id);
  if (thinking) it.classList.add('thinking');
  const msgCount = c.messages.filter(m => !m.pending || m.content).length;
  const ageStr = formatShortAge(c.updated || c.created || Date.now());
  it.innerHTML = `
    <span class="h-active-rail" aria-hidden="true"></span>
    <span class="h-kind-ic" aria-hidden="true">${thinking ? `<span class="h-think" title="${esc(t('Still thinking…'))}" aria-label="${esc(t('Still thinking…'))}"><i></i><i></i><i></i></span>` : meta.icon}</span>
    <span class="h-body">
      <span class="t" dir="auto"></span>
      <span class="h-meta">
        ${c.pinned ? '<span class="pin-ic" title="Pinned">★</span>' : ''}
        <span>${msgCount} msg${msgCount === 1 ? '' : 's'}</span>
        <span>·</span>
        <span>${esc(ageStr)}</span>
      </span>
    </span>
    <span class="acts">
      <button type="button" data-a="share" title="Share chat">${HIST_SVG.share}</button>
      <button type="button" data-a="pin" title="${c.pinned ? 'Unpin' : 'Pin'}">${c.pinned ? HIST_SVG.unpin : HIST_SVG.pin}</button>
      <button type="button" data-a="ren" title="Rename">${HIST_SVG.ren}</button>
      <button type="button" data-a="del" class="del" title="Delete">${HIST_SVG.del}</button>
    </span>`;
  $('.t', it).textContent = c.title;
  it.onclick = e => {
    const b = e.target.closest('button');
    if (!b){ if (!e.target.closest('input')) selectConv(c.id); return; }
    e.stopPropagation();
    if (b.dataset.a === 'share'){ window.LZShared && LZShared.openShareChatModal(c); return; }
    if (b.dataset.a === 'pin'){ c.pinned = !c.pinned; persist(c); renderHistory(); toast(c.pinned ? 'Pinned' : 'Unpinned'); }
    if (b.dataset.a === 'del'){
      confirmDanger({
        title: t('Delete this chat?'),
        name: c.title,
        confirmLabel: t('Delete'),
        cancelLabel: t('Cancel')
      }).catch(err => { console.warn('[delete chat] confirm failed', err); return window.confirm(t('Delete this chat?') + '\n' + c.title); }).then(ok => {
        if (!ok) return;
        recordDeletedConvId(c.id);
        state.convs = state.convs.filter(x => x !== c && x.id !== c.id); DB.del(c.id);
        saveEmergencyMirror();
        if (state.current && (state.current === c || state.current.id === c.id)){ state.current = null; renderMessages(); }
        renderHistory(); toast(t('Chat deleted'));
        window.LZAuth && LZAuth.scheduleSync && LZAuth.scheduleSync(true);
      });
      return;
    }
    if (b.dataset.a === 'ren'){
      const tEl = $('.t', it); const inp = el('input'); inp.value = c.title; tEl.replaceWith(inp); inp.focus(); inp.select();
      const fin = ok => { if (ok && inp.value.trim()){ c.title = inp.value.trim().slice(0, 80); persist(c); } renderHistory(); };
      inp.onkeydown = ev => { if (ev.key === 'Enter') fin(true); if (ev.key === 'Escape') fin(false); };
      inp.onblur = () => fin(true);
    }
  };
  return it;
}

/* ================= MODEL / THINKING ================= */
function setModel(id, quiet){
  if (id === 'stark' && isStarkLockedForUser()){
    state.model = 'fera';
    localStorage.setItem('lz.model', 'fera');
    $('#modelName').innerHTML = esc(MODELS.fera.name);
    document.body.classList.remove('stark');
    renderModelMenu();
    renderLabsMenu();
    if (!quiet){
      toast('🔒 Lokizen 4.0 Stark 6-hour message limit reached! Switched to Lokizenith 3.5 Fera. Upgrade your plan for more Stark access.', 'err');
    }
    return;
  }
  state.model = id; localStorage.setItem('lz.model', id);
  $('#modelName').innerHTML = esc(MODELS[id].name) + (id === 'stark' ? ' <span class="stark-badge">Pro</span>' : '');
  document.body.classList.toggle('stark', id === 'stark');
  renderModelMenu(); renderLabsMenu();
  if (!state.current || !state.current.messages.length) renderMessages();
  if (!quiet){ toast('Switched to ' + MODELS[id].name); sound('click'); }
}
function renderModelMenu(){
  const m = $('#modelMenu'); if (!m) return;
  m.innerHTML = '';
  const u = window.LZAuth && LZAuth.getUser ? LZAuth.getUser() : null;
  const plan = getUserPlanTier();
  const q = getUserQuotas();
  const starkLocked = isStarkLockedForUser();

  Object.values(MODELS).forEach(md => {
    const isStark = md.id === 'stark';
    const b = el('button', 'm-opt ' + md.id + (state.model === md.id ? ' sel' : '') + (isStark && starkLocked ? ' locked-opt' : ''));
    b.setAttribute('role', 'option');
    let quotaBadge = '';
    if (isStark){
      const rem = (q && q.stark && typeof q.stark.remaining === 'number') ? q.stark.remaining : (q && typeof q.starkMessagesRemaining === 'number' ? q.starkMessagesRemaining : null);
      const lim = (q && q.stark && typeof q.stark.limit === 'number') ? q.stark.limit : (q && typeof q.starkMessagesLimit === 'number' ? q.starkMessagesLimit : (plan === 'pro' ? 85 : 10));
      if (u?.isUnlimited || plan === 'ultimate' || u?.starkAuthorized || (q && q.stark && q.stark.unlimited)){
        quotaBadge = `<span class="stark-badge">∞ Unlimited</span>`;
      } else if (starkLocked){
        quotaBadge = `<span class="stark-badge" style="background:rgba(239,68,68,.2);color:#fca5a5;border-color:rgba(239,68,68,.4);">🔒 Locked (0/${lim})</span>`;
      } else if (typeof rem === 'number'){
        quotaBadge = `<span class="stark-badge">${rem}/${lim} msgs (6h)</span>`;
      } else {
        quotaBadge = `<span class="stark-badge">${plan === 'pro' ? '85 msgs/6h' : '10 msgs/6h'}</span>`;
      }
    } else {
      quotaBadge = '<small style="display:inline;margin:0">· Default</small>';
    }
    b.innerHTML = `<span class="m-ic">${isStark && starkLocked ? '🔒' : md.icon}</span><span><b>${esc(md.name)} ${quotaBadge}</b><small>${esc(isStark && starkLocked ? '6-hour Stark limit reached — resets every 6h or click to upgrade plan' : md.blurb)}</small></span><span class="check">${isStark && starkLocked ? '💎' : '✓'}</span>`;
    b.onclick = () => {
      toggleMenu('model', false);
      if (isStark && starkLocked){
        toast('🔒 Lokizen 4.0 Stark limit reached! Upgrade to Pro (85 msgs/6h) or Ultimate (Unlimited).', 'err');
        showView('benches');
        return;
      }
      setModel(md.id);
    };
    m.appendChild(b);
  });
}
function setLevel(l, quiet){
  l = Math.max(0, Math.min(4, +l || 0));
  if (l === 4 && getUserPlanTier() !== 'ultimate'){
    if (!quiet){
      toast('👑 Ultra Thinking Mode (Turbo speed + Extra-High quality) is exclusive to Loki Ultimate!', 'err');
      showView('benches');
      return;
    }
    l = 2;
  }
  state.level = l; localStorage.setItem('lz.level', l);
  const info = THINK_LEVELS[l] || THINK_LEVELS[2];
  const recBadge = info.recommended ? ' <span class="rec-badge">Recommended</span>' : (l === 4 ? ' <span class="lz-plan-tag ultimate sm">✦ ULTIMATE</span>' : '');
  const btnName = $('#thinkName');
  if (btnName) btnName.innerHTML = `${esc(info.name)}${recBadge}`;
  const pick = $('#thinkPicker');
  if (pick) pick.dataset.level = l;
  renderThinkMenu();
  const blurbs = [' — 10× faster direct answers', ' — balanced', ' — deep & structured reasoning', ' — drafts & self-reviews', ' — Turbo-fast speed + Extra-High perfection'];
  if (typeof renderFeatureChips === 'function') renderFeatureChips();
  if (!quiet){ toast('Thinking: ' + info.name + blurbs[l]); sound('click'); }
}
function renderThinkMenu(){
  const m = $('#thinkMenu'); if (!m) return;
  m.innerHTML = '';
  const isUlt = getUserPlanTier() === 'ultimate';
  THINK_LEVELS.forEach(tl => {
    const locked = tl.id === 4 && !isUlt;
    const b = el('button', 'm-opt think-opt' + (state.level === tl.id ? ' sel' : '') + (locked ? ' locked-opt' : ''));
    b.setAttribute('role', 'option');
    const recTag = tl.recommended
      ? ' <span class="rec-badge">Recommended</span>'
      : tl.id === 4
      ? (locked ? ' <span class="lz-plan-tag ultimate sm">🔒 ULTIMATE ONLY</span>' : ' <span class="lz-plan-tag ultimate sm">✦ TURBO SPEED</span>')
      : '';
    b.innerHTML = `<span class="m-ic">${locked ? '🔒' : tl.icon}</span><span><b>${esc(tl.name)}${recTag}</b><small>${esc(tl.blurb)}</small></span><span class="check">${locked ? '💎' : '✓'}</span>`;
    b.onclick = () => {
      toggleMenu('think', false);
      if (locked){
        toast('👑 Ultra Thinking Mode is unlocked exclusively in Loki Ultimate!', 'err');
        showView('benches');
        return;
      }
      setLevel(tl.id);
    };
    m.appendChild(b);
  });
}
function normalizeAnswerLength(v){
  const id = String(v || '').toLowerCase();
  return ANSWER_LENGTHS.some(x => x.id === id) ? id : 'medium';
}
function setAnswerLength(id, quiet){
  id = normalizeAnswerLength(id);
  state.answerLength = id;
  localStorage.setItem('lz.answerLength', id);
  S.answerLength = id;
  saveSettings();
  const info = ANSWER_LENGTHS.find(x => x.id === id) || ANSWER_LENGTHS[1];
  const recBadge = info.recommended ? ' <span class="rec-badge">Recommended</span>' : '';
  const btnName = $('#lengthName');
  if (btnName) btnName.innerHTML = `${esc(info.name)}${recBadge}`;
  const pick = $('#lengthPicker');
  if (pick) pick.dataset.length = id;
  renderLengthMenu();
  if (typeof renderFeatureChips === 'function') renderFeatureChips();
  if (!quiet){ toast('Answer length: ' + info.name + ' — ' + info.blurb); sound('click'); }
}
function renderLengthMenu(){
  const m = $('#lengthMenu'); if (!m) return;
  m.innerHTML = '';
  ANSWER_LENGTHS.forEach(al => {
    const b = el('button', 'm-opt think-opt' + (state.answerLength === al.id ? ' sel' : ''));
    b.setAttribute('role', 'option');
    const recTag = al.recommended ? ' <span class="rec-badge">Recommended</span>' : '';
    b.innerHTML = `<span class="m-ic">${al.icon}</span><span><b>${esc(al.name)}${recTag}</b><small>${esc(al.blurb)}</small></span><span class="check">✓</span>`;
    b.onclick = () => { toggleMenu('length', false); setAnswerLength(al.id); };
    m.appendChild(b);
  });
}
function setDeepSearch(on, quiet){
  state.deepSearch = !!on;
  try { localStorage.removeItem('lz.deepSearch'); } catch {}
  if (typeof renderFeatureChips === 'function') renderFeatureChips();
  if (!quiet){
    toast(state.deepSearch
      ? 'Deep search on — the next web questions will scan 100+ sites'
      : 'Deep search off — using the fast search path');
    sound('click');
  }
}
let activePortalMenuKey = null;
function positionPortalMenu(k, elM, elB){
  if (!elM || !elB) return;
  if (elM.parentElement !== document.body){
    document.body.appendChild(elM);
    elM.dataset.portalMenu = k;
  }
  const rect = elB.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 10;
  const isUp = k === 'plus';
  const menuW = Math.min(k === 'plus' ? 276 : 340, vw - pad * 2);
  elM.style.position = 'fixed';
  elM.style.width = menuW + 'px';
  elM.style.right = 'auto';
  elM.style.zIndex = '9500';
  elM.style.overflowY = 'auto';

  let left = rect.left;
  if (left + menuW > vw - pad) left = vw - pad - menuW;
  if (left < pad) left = pad;
  elM.style.left = Math.round(left) + 'px';

  if (isUp){
    const availUp = Math.max(180, rect.top - 20);
    elM.style.top = 'auto';
    elM.style.bottom = Math.round(Math.max(12, vh - rect.top + 10)) + 'px';
    elM.style.maxHeight = Math.round(Math.min(460, availUp)) + 'px';
    elM.style.transformOrigin = 'bottom left';
  } else {
    // Topbar menus ALWAYS open downward as a full-screen overlay outside .topbar
    const topPx = Math.round(rect.bottom + 8);
    const availDown = Math.max(180, vh - topPx - 16);
    elM.style.top = topPx + 'px';
    elM.style.bottom = 'auto';
    elM.style.maxHeight = Math.round(Math.min(480, availDown)) + 'px';
    elM.style.transformOrigin = 'top center';
  }
}
function toggleMenu(which, force){
  const map = {model:['#modelMenu', '#modelBtn'], think:['#thinkMenu', '#thinkBtn'], length:['#lengthMenu', '#lengthBtn'], labs:['#labsMenu', '#labsBtn'], plus:['#plusMenu', '#plusBtn']};
  let nextActive = null;
  Object.keys(map).forEach(k => {
    const [m, b] = map[k];
    const elM = $(m), elB = $(b);
    if (!elM || !elB) return;
    const wasOpen = elM.classList.contains('open');
    const open = k === which ? (force ?? !wasOpen) : false;
    if (k === which && open !== wasOpen) sound(open ? 'menu' : 'close');
    if (open){
      positionPortalMenu(k, elM, elB);
      nextActive = k;
    }
    elM.classList.toggle('open', open); elB.classList.toggle('open', open);
    if (k === 'model' || k === 'think' || k === 'length') elB.setAttribute('aria-expanded', String(open));
  });
  activePortalMenuKey = nextActive;
}
addEventListener('resize', () => {
  if (!activePortalMenuKey) return;
  const map = {model:['#modelMenu', '#modelBtn'], think:['#thinkMenu', '#thinkBtn'], length:['#lengthMenu', '#lengthBtn'], labs:['#labsMenu', '#labsBtn'], plus:['#plusMenu', '#plusBtn']};
  const pair = map[activePortalMenuKey];
  if (pair) positionPortalMenu(activePortalMenuKey, $(pair[0]), $(pair[1]));
});
addEventListener('keydown', e => { if (e.key === 'Escape' && activePortalMenuKey) toggleMenu(null); });
const _tbEl = $('.topbar');
if (_tbEl) _tbEl.addEventListener('scroll', () => { if (activePortalMenuKey && activePortalMenuKey !== 'plus') toggleMenu(null); }, { passive: true });

/* ================= VIEWS ================= */
function lzSignedIn(){
  try { return !!localStorage.getItem('lz.authToken'); } catch(_){ return false; }
}
function ensureRichText(){
  if (window.marked && window.DOMPurify && window.hljs) return Promise.resolve();
  if (!window.LZ || !LZ.loadScript) return Promise.resolve();
  if (!window.__lzRich){
    window.__lzRich = Promise.all([
      LZ.loadScript('https://cdn.jsdelivr.net/npm/marked@12/marked.min.js'),
      LZ.loadScript('https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js'),
      LZ.loadScript('https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/highlight.min.js')
        .then(() => LZ.loadScript('https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.9.0/languages/matlab.min.js').catch(() => {}))
    ]).then(() => { if (window.marked && marked.setOptions) marked.setOptions({gfm:true, breaks:true}); });
  }
  return window.__lzRich;
}
function ensureRouteScript(src){
  if (!src || !window.LZ || !LZ.loadScript) return Promise.resolve();
  return LZ.loadScript(src).catch(() => {});
}
const ROUTE_SCRIPT = { code: '/lokicode.js', benches: '/benches.js' };
function showView(v){
  const prevView = state.view;
  state.view = v;
  toggleMenu(null);
  const viewEls = {
    chat: $('#chatView'),
    code: $('#codeView'),
    lessons: $('#lessonsView'),
    benches: $('#benchesView'),
    teamchat: $('#teamChatView'),
    lokibot: $('#lokiBotView'),
    sharedhub: $('#sharedHubView'),
    event: $('#eventView'),
    download: $('#downloadAppView')
  };
  Object.keys(viewEls).forEach(k => {
    const node = viewEls[k];
    if (!node) return;
    const isNow = k === v;
    node.classList.toggle('active', isNow);
    if (node._enterT) { clearTimeout(node._enterT); node._enterT = null; }
    if (isNow && prevView !== v){
      node.classList.remove('view-entering');
      void node.offsetWidth;
      node.classList.add('view-entering');
      node._enterT = setTimeout(() => {
        node.classList.remove('view-entering');
        node._enterT = null;
      }, 460);
    } else if (!isNow) {
      node.classList.remove('view-entering');
    }
  });
  $('#openLokiBot') && $('#openLokiBot').classList.toggle('on', v === 'lokibot');
  $('#openLokiCode').classList.toggle('on', v === 'code');
  $('#openLessons') && $('#openLessons').classList.toggle('on', v === 'lessons');
  $('#openTeamChat') && $('#openTeamChat').classList.toggle('on', v === 'teamchat');
  $('#openDownloadApp') && $('#openDownloadApp').classList.toggle('on', v === 'download');
  const shb = $('#openSharedHub');
  if (shb) { shb.classList.toggle('on', v === 'sharedhub'); shb.classList.toggle('active', v === 'sharedhub'); }
  const bnb = $('#benchesBtn');
  if (bnb) bnb.classList.toggle('active', v === 'benches');
  const evb = $('#communityEventTopBtn');
  if (evb) evb.classList.toggle('active', v === 'event');
  document.body.dataset.view = v;
  const h = v === 'chat' ? '' : '#' + v; if (location.hash !== h) history.replaceState(null, '', h || location.pathname + location.search);
  const finish = () => {
    if (state.view !== v) return;
    if (v === 'code' && window.LokiCode) LokiCode.onShow();
    if (v === 'lessons' && window.Lessons && Lessons.onShow) Lessons.onShow();
    if (v === 'benches' && window.LokiBenches) LokiBenches.onShow();
    if (v === 'teamchat' && window.LZTeams) LZTeams.onShow();
    if (v === 'sharedhub' && window.LZShared) LZShared.onShow();
    if (v === 'event' && window.LZEvents) LZEvents.onShow();
    if (v === 'download' && window.LZDownloadApp) LZDownloadApp.onShow();
    if (v === 'lokibot') mountLokiBot();
  };
  const src = ROUTE_SCRIPT[v];
  if (src && !(v === 'code' && window.LokiCode) && !(v === 'benches' && window.LokiBenches)){
    ensureRouteScript(src).then(() => {
      if (v === 'code') return ensureRichText();
    }).then(finish);
  } else finish();
}
/* LokiBot lives inside the app: its workspace loads in this view (same shell, same session). */
function mountLokiBot(){
  const host = $('#lokiBotView'); if (!host) return;
  if (!host.querySelector('iframe')) {
    const f = document.createElement('iframe');
    f.className = 'lokibot-frame'; f.title = 'LokiBot'; f.src = '/lokibot/app?embed=1';
    f.allow = 'clipboard-read; clipboard-write; fullscreen';
    host.appendChild(f);
  }
}
addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
  if (e.data.type === 'lokibot:back') showView('chat');
  if (e.data.type === 'lokibot:signin') { const b = $('#guestSignInBtn'); if (b) b.click(); }
});
function closeSidebarMobile(){ document.body.classList.remove('sb-open'); }

/* ================= MESSAGES ================= */
const SUGGESTIONS = {
  fera: [
    {i:'⚖️', t:'Compare React, Vue, and Svelte with interactive comparison cards', s:'Interactive side-by-side feature cards', tag:'Rich UI'},
    {i:'🧮', t:'Build an interactive compound-interest calculator with sliders', s:'Live formula calculator inside the reply', tag:'Live Calc'},
    {i:'🌿', t:'Create an interactive mind-map for learning full-stack engineering', s:'Expandable concept hierarchy tree', tag:'Mind Map'},
    {i:'🖼', t:'Upload an image and ask me about it', s:'Vision analysis & file reading', act:'upload'}
  ],
  stark: [
    {i:'⚖️', t:'Compare iPhone 16 Pro vs Galaxy S25 Ultra with comparison cards and a verdict scorecard', s:'Comparison Cards + Rating Scorecard', tag:'Rich UI'},
    {i:'🎨', t:'Create an image of a neon green fox in a cyberpunk city at night', s:'12-tier FLUX & SD3.5 image generation', tag:'Stark'},
    {i:'🧮', t:'Make an interactive SaaS ROI calculator with sliders and visual breakdown bars', s:'Live Calculator + Animated Score Bars', tag:'Rich UI'},
    {i:'🌐', t:'Search the web: what are the latest breakthroughs in fusion energy?', s:'Live internet research with citations', tag:'Stark'}
  ]
};
function renderEmpty(box){
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = S.name ? ', ' + esc(S.name) : '';
  const e = el('div', 'empty');
  e.innerHTML = `<div class="hero-orb"><span class="ring"></span><span class="ring"></span><span class="ring"></span><div class="core">${LOGO_SVG}</div></div>
  <div class="hero-kicker"><span class="hero-kicker-dot"></span><span>${esc(MODELS[state.model].name)} · Interactive AI Canvas</span></div>
  <h1>${esc(t(greet))}${name}.<br><span class="g">${esc(t('What shall we create?'))}</span></h1>
  <p class="sub">${t(state.model === 'stark' ? 'Live answers, rich interactive UI cards, calculators, mind-maps, images, and web search — all in one workspace.' : 'Ask anything and get crisp answers with interactive comparison cards, calculators, tables, and visual trees.')}</p>
  <div class="chips"></div>`;
  const chips = $('.chips', e);
  SUGGESTIONS[state.model].forEach((c, idx) => {
    const b = el('button', 'chip', `<div class="chip-top"><span class="chip-ic">${c.i}</span>${c.tag ? '<span class="tag">' + c.tag + '</span>' : ''}</div><b dir="auto"></b><small>${esc(t(c.s))}</small>`);
    b.style.animationDelay = (idx * 65) + 'ms';
    $('b', b).textContent = t(c.t);
    b.onclick = () => { if (c.act === 'upload') $('#fileInput').click(); else { $('#prompt').value = t(c.t); autosize(); updateSend(); send(); } };
    chips.appendChild(b);
  });
  box.appendChild(e);
}
function renderMessages(force){
  // A late re-render (markdown load, account sync, avatar change) used to wipe the live
  // "Working" row mid-turn. That showed up most in a new chat: the first send never
  // called renderMessages (empty hero is cleared by hand), so marked started loading
  // only after the first reply; its callback then ran during the second send and
  // replaced the in-flight Work indicator with a pending, log-less assistant row.
  if (state.busy && !force){ state._rerenderAfterBusy = true; return; }
  state._rerenderAfterBusy = false;
  const box = $('#messages'); box.innerHTML = '';
  const c = state.current;
  if (!c || !c.messages.length){ renderEmpty(box); ensureRichText(); return; }
  if (!window.marked && !window.__lzRichPending){
    window.__lzRichPending = true;
    ensureRichText().then(() => { window.__lzRichPending = false; if (state.current !== c) return; if (state.busy){ state._rerenderAfterBusy = true; return; } renderMessages(); });
  }
  const live = state.turns.get(c.id);
  c.messages.forEach((m, i) => {
    if (live && live.bm === m){ box.appendChild(live.row); return; }
    if (m.pending && !m.content && !(m.images && m.images.length) && !m.video && !m.error) return;
    box.appendChild(renderMsg(m, i));
  });
  if (!live) attachRemoteGens(c, box);
  box.scrollTop = box.scrollHeight;
}
/* Answers generating on the server for this chat (another tab/device, or the app was closed mid-answer):
   show a live row that resumes the stream; the finished answer lands via sync (and locally here). */
const remoteStreams = new Map(); // genId -> {text, done, hook}
function attachRemoteGens(c, box){
  for (const g of state.remoteGens.values()){
    if (g.convId !== c.id || g.done) continue;
    if (c.messages.some(m => m.id === g.id && !m.pending)) continue;
    const row = el('div', 'msg bot busy bg-live'); row.dataset.id = g.id;
    const col = el('div', 'bubble-col'); row.append(el('div', 'avatar', LOGO_SVG), col);
    const note = el('div', 'bg-live-note', `<span class="h-think"><i></i><i></i><i></i></span> ${esc(t('Still thinking — this answer keeps generating on the server'))}`);
    const sb = el('div', 'bubble streaming'); col.append(note, sb);
    box.appendChild(row);
    const rs = streamRemoteGen(g);
    let pend = 0;
    const paint = () => { pend = 0; if (!row.isConnected) return; renderLiveStreamingBubble(sb, rs.text); if (S.autoScroll) scrollDown(); };
    rs.hook = () => { if (!pend) pend = setTimeout(paint, 60); };
    if (rs.text) paint();
  }
}
function streamRemoteGen(g){
  let rs = remoteStreams.get(g.id);
  if (rs) return rs;
  rs = {text: '', done: false, hook: null};
  remoteStreams.set(g.id, rs);
  LZ.resumeGen(g.id, 0, {onToken: (d) => { rs.text += d; if (rs.hook) rs.hook(); }}).then(r => {
    rs.done = true;
    finishRemoteGen(g, r && r.gone ? '' : rs.text);
  }).catch(() => { rs.done = true; finishRemoteGen(g, rs.text); });
  return rs;
}
function finishRemoteGen(g, text){
  remoteStreams.delete(g.id);
  const cur = state.remoteGens.get(g.id); if (cur) cur.done = true;
  state.remoteGens.delete(g.id);
  const c = convById(g.convId);
  const clean = String(text || '').replace(/\[WEB_IMAGE:[^\]]*\]?/gi, '').replace(/\n{3,}/g, '\n\n').trim();
  if (c && clean && !c.messages.some(m => m.id === g.id)){
    c.messages.push({id: g.id, role: 'assistant', content: clean, ts: g.startedAt || Date.now(), bg: true});
    c.messages.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
    persist(c);
  }
  if (state.current && state.current.id === g.convId){ if (!state.busy) renderMessages(true); }
  else if (clean){ sound('bgdone'); toast(t('Answer ready') + ' · ' + ((c && c.title) || '')); }
  renderHistory();
}
function onGenEvent(msg){
  if (!msg || !msg.id) return;
  for (const tr of state.turns.values()) if (tr.bm && tr.bm.id === msg.id) return; // our own live turn
  if (msg.state === 'start'){
    state.remoteGens.set(msg.id, {id: msg.id, convId: msg.convId, title: msg.title || '', startedAt: Date.now(), done: false});
    renderHistory();
    if (state.current && state.current.id === msg.convId && !state.busy) renderMessages(true);
  } else if (msg.state === 'done'){
    const g = state.remoteGens.get(msg.id);
    if (g && !remoteStreams.has(msg.id)){
      state.remoteGens.delete(msg.id); renderHistory();
      if (!msg.error){ const c = convById(msg.convId); if (!(state.current && state.current.id === msg.convId)) { sound('bgdone'); toast(t('Answer ready') + ' · ' + ((c && c.title) || '')); } }
    }
  }
}
let gensCheckAt = 0;
async function refreshRemoteGens(){
  if (!window.LZ || !LZ.listGens || !localStorage.getItem('lz.authToken')) return;
  if (Date.now() - gensCheckAt < 3000) return; gensCheckAt = Date.now();
  try {
    const gens = await LZ.listGens();
    let changed = false;
    for (const g of gens){
      if (g.done) continue;
      let local = false; for (const tr of state.turns.values()) if (tr.bm && tr.bm.id === g.id) local = true;
      if (local || state.remoteGens.has(g.id)) continue;
      state.remoteGens.set(g.id, {id: g.id, convId: g.convId, title: g.title, startedAt: g.startedAt, done: false}); changed = true;
    }
    if (changed){ renderHistory(); if (state.current && !state.busy && gens.some(g => g.convId === state.current.id)) renderMessages(true); }
  } catch(_){}
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshRemoteGens(); });
addEventListener('online', () => refreshRemoteGens());
function userInitial(){
  const authUser = window.LZAuth && LZAuth.getUser ? LZAuth.getUser() : null;
  const dn = (authUser && (authUser.displayName || authUser.username)) || S.name || 'You';
  return esc(String(dn).trim().charAt(0).toUpperCase() || 'Y');
}
function renderMsg(m){
  const row = el('div', 'msg ' + (m.role === 'user' ? 'user' : 'bot'));
  row.dataset.id = m.id;
  const authUser = window.LZAuth && LZAuth.getUser ? LZAuth.getUser() : null;
  const userAvatarUrl = m.avatarUrl || (authUser && (authUser.avatarUrl || authUser.googlePicture)) || null;
  const userDisplayName = m.displayName || (authUser && (authUser.displayName || authUser.username)) || S.name || 'You';
  const userHandle = m.username || (authUser && authUser.username) || '';
  const av = el('div', 'avatar' + (m.role === 'user' ? ' lz-clickable-user' : ''), m.role === 'user'
    ? (userAvatarUrl ? `<img src="${esc(userAvatarUrl)}" alt="${esc(userDisplayName)}" class="lz-msg-avatar-img">` : userInitial())
    : LOGO_SVG);
  if (m.role === 'user') {
    av.title = `View @${userHandle || userDisplayName}'s Profile`;
    av.onclick = () => {
      if (window.LZAuth && LZAuth.openUserProfileModal) {
        LZAuth.openUserProfileModal(userHandle || (authUser && authUser.username));
      }
    };
  }
  const col = el('div', 'bubble-col');
  row.append(av, col);
  if (m.role === 'user'){
    const authorBar = el('div', 'lz-msg-author-bar lz-clickable-user', `<span class="lz-msg-author-name">${esc(userDisplayName)}</span>${userHandle && userHandle !== userDisplayName ? `<small class="lz-msg-author-handle">@${esc(userHandle)}</small>` : ''}`);
    authorBar.onclick = () => {
      if (window.LZAuth && LZAuth.openUserProfileModal) {
        LZAuth.openUserProfileModal(userHandle || (authUser && authUser.username));
      }
    };
    col.appendChild(authorBar);
    if (m.attachments && m.attachments.length){
      const al = el('div', 'attach-list');
      let photoN = 0;
      m.attachments.forEach(a => {
        if (a.kind === 'image'){
          photoN += 1;
          const wrap = el('div', 'attach-photo');
          const im = el('img'); im.src = a.dataUrl; im.alt = a.name || ('Photo ' + photoN); im.onclick = () => lightbox(a.dataUrl);
          wrap.appendChild(el('span', 'photo-label', 'Photo ' + photoN));
          wrap.appendChild(im);
          al.appendChild(wrap);
        } else if (a.kind === 'video'){
          const wrap = el('div', 'attach-video');
          const src = a.sessionUrl || a.poster || (a.keyframes && a.keyframes[0] && a.keyframes[0].dataUrl);
          if (a.sessionUrl){
            const v = el('video');
            v.src = a.sessionUrl; v.controls = true; v.playsInline = true; v.preload = 'metadata';
            if (a.poster) v.poster = a.poster;
            wrap.appendChild(v);
          } else if (src){
            const im = el('img'); im.src = src; im.alt = a.name || 'Video'; im.onclick = () => lightbox(src);
            wrap.appendChild(im);
          }
          const meta = [a.name || 'Video'];
          if (a.duration) meta.push(Math.round(a.duration) + 's');
          if (a.keyframes && a.keyframes.length) meta.push(a.keyframes.length + ' keyframes');
          wrap.appendChild(el('div', 'video-meta', esc(meta.join(' · '))));
          if (a.keyframes && a.keyframes.length){
            const strip = el('div', 'kf-strip');
            a.keyframes.forEach(k => {
              if (!k.dataUrl) return;
              const kimg = el('img'); kimg.src = k.dataUrl; kimg.alt = (typeof k.timeSec === 'number' ? k.timeSec.toFixed(1) + 's' : 'frame');
              kimg.onclick = () => lightbox(k.dataUrl);
              strip.appendChild(kimg);
            });
            wrap.appendChild(strip);
          }
          al.appendChild(wrap);
        } else {
          const icon = (a.name || '').toLowerCase().endsWith('.pdf') ? '📕' : ((a.name || '').match(/\.(docx?|xlsx?)$/i) ? '📊' : '📄');
          al.appendChild(el('div', 'file-pill', `<span class="fi">${icon}</span><span>${esc(a.name)}<small>${bytes(a.size || 0)}${a.pages ? ' · ' + a.pages + ' pages' : ''}</small></span>`));
        }
      });
      col.appendChild(al);
    }
    if (m.content){ const b = el('div', 'bubble'); b.dir = 'auto'; b.textContent = m.content; col.appendChild(b); }
    col.appendChild(actions(m, ['copy', 'edit']));
    return row;
  }
  if (m.type === 'upgrade'){ col.appendChild(upgradeCard(m.feature, () => switchAndRetry())); return row; }
  if (m.type === 'limit-reached'){ col.appendChild(LZ.Usage && LZ.Usage.createLimitBlock ? LZ.Usage.createLimitBlock(m.content) : el('div', 'err-card', esc(m.content))); return row; }
  if (m.log && !m.silentUltra) staticWork(col, m.log, m.worked);
  fillBot(col, m);
  return row;
}
function ultraBlueprintEl(bp){
  const box = el('div', 'ultra-blueprint');
  box.innerHTML = `<div class="ub-head" role="button" tabindex="0">
    <span class="ub-badge">👑 Ultra 4× Quantum Reasoning</span>
    <span class="ub-steps"><i>1. Plan</i><i>2. Draft</i><i>3. Critique</i><i>4. Perfect</i></span>
    <span class="ub-speed">⚡ 4× Faster</span>
    <span class="ub-chev">▾</span>
  </div>
  <div class="ub-body">
    <div class="ub-grid">
      <div class="ub-card"><b>1 · Architecture Plan</b><p dir="auto">${esc(bp.plan || 'Structured key points & user goal analysis')}</p></div>
      <div class="ub-card"><b>2 · Draft Strategy</b><p dir="auto">${esc(bp.draft || 'Synthesized core arguments, examples & structure')}</p></div>
      <div class="ub-card"><b>3 · Self-Critique Checks</b><p dir="auto">${esc(bp.critique || 'Verified accuracy, edge cases, clarity & completeness')}</p></div>
      <div class="ub-card"><b>4 · Master Polish</b><p dir="auto">${esc(bp.polish || 'Elevated formatting, visual blocks & executive precision')}</p></div>
    </div>
  </div>`;
  $('.ub-head', box).onclick = () => box.classList.toggle('open');
  return box;
}
function photoInsightsEl(pi){
  if (!pi) return el('div');
  const card = el('div', 'photo-insights-card');

  const summary = pi.summary || 'Image analyzed by Lokizen Vision.';
  const objects = Array.isArray(pi.objects) ? pi.objects : [];
  const text = (pi.extractedText || '').trim();
  const colors = Array.isArray(pi.attributes?.colors) ? pi.attributes.colors : [];
  const lighting = pi.attributes?.lighting || 'Natural Lighting';
  const style = pi.attributes?.style || 'High-Resolution Photography';

  const objChips = objects.length
    ? objects.map(o => {
        const name = typeof o === 'string' ? o : o.name || 'Object';
        const loc = typeof o === 'object' && o.location ? `<span class="pi-obj-loc">${esc(o.location)}</span>` : '';
        return `<div class="pi-obj-chip"><span>🎯</span> <b>${esc(name)}</b> ${loc}</div>`;
      }).join('')
    : '<span class="pi-no-text">No distinct objects isolated</span>';

  const ocrHtml = text
    ? `<div class="pi-ocr-box">
        <button type="button" class="pi-copy-btn">📋 Copy Text</button>
        <pre style="margin:0; font-family:inherit; white-space:pre-wrap;">${esc(text)}</pre>
       </div>`
    : `<div class="pi-no-text">No readable text found in image</div>`;

  const colorSwatches = colors.length
    ? colors.map(c => `<span class="pi-color-swatch" style="background:${esc(c)};" title="${esc(c)}"></span>`).join('')
    : '';

  card.innerHTML = `
    <div class="pi-header">
      <div class="pi-title-col">
        <span class="pi-icon">👁️</span>
        <div>
          <b class="pi-title">Lokizen Vision Intelligence · Photo Insights</b>
          <span class="pi-sub">Scene Summary, Object Detection & Text Extraction</span>
        </div>
      </div>
      <span class="pi-badge">VISION ACTIVE</span>
    </div>

    <div class="pi-sec">
      <div class="pi-sec-label">📝 Scene Summary</div>
      <div class="pi-summary-box">${esc(summary)}</div>
    </div>

    <div class="pi-sec">
      <div class="pi-sec-label">🎯 Detected Objects (${objects.length})</div>
      <div class="pi-objects-grid">${objChips}</div>
    </div>

    <div class="pi-sec">
      <div class="pi-sec-label">🔤 Extracted Text (OCR)</div>
      ${ocrHtml}
    </div>

    <div class="pi-attrs-row">
      <div class="pi-colors-wrap">
        <span style="font-size:11px; color:#8ebd9c; font-weight:700;">Palette:</span>
        ${colorSwatches}
      </div>
      <div class="pi-tags-wrap">
        <span class="pi-tag">💡 ${esc(lighting)}</span>
        <span class="pi-tag">📸 ${esc(style)}</span>
      </div>
    </div>
  `;

  const copyBtn = card.querySelector('.pi-copy-btn');
  if (copyBtn && text) {
    copyBtn.onclick = () => {
      copyText(text);
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => copyBtn.textContent = '📋 Copy Text', 2000);
    };
  }

  return card;
}

function webImagesEl(webImages){
  const strip = el('div', 'web-img-strip');
  (webImages || []).slice(0, 2).forEach(im => {
    if (!im || !im.url || !/^https?:\/\//i.test(im.url)) return;
    const card = el('div', 'web-img-card');
    const img = el('img');
    img.src = im.thumb || im.url;
    img.alt = im.title || 'Photo';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => card.remove();
    img.onclick = () => lightbox(im.url || im.thumb);
    card.appendChild(img);
    if (im.title) {
      const cap = el('div', 'web-img-meta');
      const b = el('span');
      b.textContent = im.title;
      cap.appendChild(b);
      card.appendChild(cap);
    }
    strip.appendChild(card);
  });
  return strip;
}

function planUpgradeAttachmentEl(info){
  const card = el('div', 'lz-plan-upgrade-bubble-cta');
  const btnLabel = info?.buttonText || '💎 Upgrade Plan';
  card.innerHTML = `
    <button type="button" class="btn-primary lz-msg-upgrade-plan-btn">
      <span>${esc(btnLabel)}</span>
      <small>Open Loki Pro &amp; Ultimate Plans →</small>
    </button>
  `;
  $('button', card).onclick = () => {
    showView('benches');
  };
  return card;
}

function fillBot(col, m){
  if (m.type === 'limit-reached'){ col.appendChild(LZ.Usage && LZ.Usage.createLimitBlock ? LZ.Usage.createLimitBlock(m.content) : el('div', 'err-card', esc(m.content))); return; }
  if (m.error){ const er = el('div', 'err-card', '⚠️ ' + esc(m.error) + ' <button class="btn-ghost" style="margin-inline-start:10px;padding:5px 10px">↻ Retry</button>'); $('button', er).onclick = () => regenerate(); col.appendChild(er); return; }

  // Dedicated AI Message Header Bar ABOVE the message (model badge + reading time + prominent Report button)
  const isH = isHeb(m.content || '') || S.lang === 'he';
  const cleanWords = m.content ? plain(m.content).trim().split(/\s+/).filter(Boolean).length : 0;
  if (!m.pending && (m.content || m.images?.length || m.video || m.candyButton || m.gamePicker || m.widget)){
    const topBar = el('div', 'bot-msg-top');
    const leftMeta = el('div', 'bot-msg-top-meta');
    const isStark = (m.tier || state.model) === 'stark';
    const modelChip = el('span', 'bot-model-chip' + (isStark ? ' stark' : ''));
    modelChip.innerHTML = `<span class="bmc-dot"></span><span>${isStark ? 'Lokizen 4.0 Stark' : 'Lokizenith 3.5 Fera'}</span>`;
    leftMeta.appendChild(modelChip);
    if (cleanWords >= 65){
      const mins = Math.max(1, Math.round(cleanWords / 200));
      leftMeta.appendChild(el('span', 'msg-meta-pill', isH
        ? `📖 ~${mins} דק׳ · ${cleanWords} מילים`
        : `📖 ~${mins} min · ${cleanWords} words`));
    }
    const repBtn = el('button', 'msg-top-report-btn act-report' + (m._reported ? ' reported' : ''));
    repBtn.type = 'button';
    repBtn.setAttribute('aria-label', isH ? 'דווח על הודעה זו' : 'Report this AI message');
    repBtn.title = isH ? 'דווח לאדמין על הודעה זו' : 'Report this AI response to Admin';
    repBtn.innerHTML = m._reported
      ? (isH ? '✓ דווח' : '✓ Reported')
      : (isH ? '🚩 דיווח' : '🚩 Report');
    repBtn.onclick = () => openReportMessageModal(m, repBtn);
    topBar.append(leftMeta, repBtn);
    col.appendChild(topBar);
  }

  if (m.photoInsights) col.appendChild(photoInsightsEl(m.photoInsights));
  if (m.content || (m.webImages && m.webImages.length) || m.upgradePlanCard || m.candyButton || m.gamePicker || m.capabilityCard){
    const b = el('div', 'bubble');
    if (m.content) renderMarkdown(b, m.content, m.sources);
    if (m.candyButton) b.appendChild(candyAttachmentEl(m));
    if (m.gamePicker && window.LZGames && LZGames.renderGamePickerCard) b.appendChild(LZGames.renderGamePickerCard(m));
    if (m.capabilityCard && window.LZCapabilities && LZCapabilities.renderCapabilityCard) {
      const capEl = LZCapabilities.renderCapabilityCard(m.capabilityCard);
      if (capEl) b.appendChild(capEl);
    }
    if (m.webImages && m.webImages.length) b.appendChild(webImagesEl(m.webImages));
    if (m.upgradePlanCard) b.appendChild(planUpgradeAttachmentEl(m.upgradePlanCard));
    col.appendChild(b);
  }
  if (m.widget) col.appendChild(widgetEl(m.widget));
  if (m.cards && m.cards.length) m.cards.forEach(c => col.appendChild(cardEl(c, m)));
  if (m.images && m.images.length) col.appendChild(imagesEl(m.images));
  if (m.video) col.appendChild(videoEl(m.video));
  if (m.files && m.files.length) m.files.forEach(f => col.appendChild(fileCard(f)));
  if (m.sources && m.sources.length) col.appendChild(sourcesEl(m.sources, { verdict: m.sourcesVerdict || '' }));
  const hasQuizCard = Array.isArray(m.cards) && m.cards.some(c => c && c.type === 'quiz');
  const actList = (m.content && m.content.length > 60 && !hasQuizCard)
    ? ['copy', 'regen', 'speak', 'quizme', 'flashcards', 'summarize', 'simplify', 'translate', 'deepdive', 'factcheck']
    : ['copy', 'regen', 'speak'];
  col.appendChild(actions(m, actList));
  if (m.content && m.content.length > 12 && !m.pending && !m.error && !m.candyButton && !m.gamePicker){
    const fu = followUpChipsEl(m);
    if (fu) col.appendChild(fu);
  }
}
function imagesEl(images){
  const g = el('div', 'gen-images');
  images.forEach((im, i) => {
    const d = el('div', 'gen-img'); d.style.animationDelay = i * 120 + 'ms';
    let currentSrc = im.dataUrl;
    let showingOriginal = false;
    const hasCompare = !!(im.originalUrl && im.originalUrl !== im.dataUrl);

    const compareBtnHtml = hasCompare
      ? `<button data-a="compare" class="gi-compare-btn" title="Toggle between Original and Edited version">🔄 Before / After</button>`
      : '';
    const badgeHtml = im.isEdited
      ? `<span class="gi-badge" style="position:absolute; top:8px; right:8px; background:linear-gradient(135deg, rgba(16,185,129,0.9), rgba(5,150,105,0.9)); color:#fff; font-size:11px; padding:3px 8px; border-radius:12px; font-weight:600; pointer-events:none; backdrop-filter:blur(4px); z-index:2; box-shadow:0 2px 6px rgba(0,0,0,0.3);">✨ Edited Photo</span>`
      : '';

    d.innerHTML = `${badgeHtml}<img alt="" src="${im.dataUrl}"><div class="gi-acts">${compareBtnHtml}<button data-a="open">⤢ View</button><button data-a="dl">⤓ Download</button></div>`;
    const imgEl = $('img', d);
    imgEl.alt = im.prompt || 'Generated image';
    imgEl.onclick = () => lightbox(currentSrc);
    d.querySelector('[data-a=open]').onclick = () => lightbox(currentSrc);
    d.querySelector('[data-a=dl]').onclick = () => download(currentSrc, 'lokizenith-' + (showingOriginal ? 'original-' : 'edited-') + Date.now() + '.jpg');

    if (hasCompare) {
      const cmpBtn = d.querySelector('[data-a=compare]');
      cmpBtn.onclick = (e) => {
        e.stopPropagation();
        showingOriginal = !showingOriginal;
        currentSrc = showingOriginal ? im.originalUrl : im.dataUrl;
        imgEl.src = currentSrc;
        cmpBtn.innerHTML = showingOriginal ? '⏮ Showing Original (Before)' : '✨ Showing Edited (After)';
        cmpBtn.style.background = showingOriginal ? 'rgba(239, 68, 68, 0.85)' : '';
      };
    }
    g.appendChild(d);
  });
  return g;
}

function videoEl(vid){
  const card = el('div', 'gen-video-card');
  card.style.cssText = 'margin:12px 0; background:rgba(10,16,22,0.92); border:1px solid rgba(0,255,156,0.45); border-radius:18px; padding:16px; box-shadow:0 14px 40px rgba(0,0,0,0.7), 0 0 25px rgba(0,255,156,0.15); backdrop-filter:blur(14px);';

  const isPoster = !!vid.isAnimatedPoster;
  const ratio = vid.ratio || '16:9';
  const maxH = ratio === '9:16' ? '540px' : ratio === '1:1' ? '460px' : '420px';
  const mediaHtml = isPoster
    ? `<img src="${vid.dataUrl}" alt="Video Scene" style="width:100%; max-height:${maxH}; object-fit:contain; border-radius:12px; display:block; background:#000;">`
    : `<video src="${vid.dataUrl}" controls autoplay loop muted playsinline style="width:100%; max-height:${maxH}; object-fit:contain; border-radius:12px; background:#000; display:block; box-shadow:0 6px 20px rgba(0,0,0,0.5);"></video>`;

  const promptText = vid.prompt || '';
  const dur = vid.duration || 4;
  const ext = isPoster ? '.jpg' : (String(vid.mimeType || '').includes('mp4') ? '.mp4' : '.webm');
  const provName = vid.provider || 'Lokizen ReWind 2.0 Neural';

  card.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; gap:10px; flex-wrap:wrap;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:1.6rem;">🎬</span>
        <div>
          <b style="font-size:14px; color:#fff; display:block;">${esc(vid.title || 'Lokizen AI Video Scene')}</b>
          <div style="font-size:11px; color:#7dffcf;">${dur}s AI Video · ${ratio} Ratio · ${esc(provName)}</div>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button type="button" class="btn-primary v-dl-btn" style="padding:6px 14px; font-size:12px; border-radius:8px; cursor:pointer; font-weight:600;">⤓ Download Video (${ext})</button>
      </div>
    </div>
    <div style="position:relative; border-radius:12px; overflow:hidden; background:#000; text-align:center;">
      ${mediaHtml}
    </div>
    <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(0,255,156,0.22); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#00ff9c; box-shadow:0 0 8px #00ff9c;"></span>
        <b style="font-size:12px; color:#00ff9c;">Lokizen AI Video · ${esc(provName)}</b>
        <span style="font-size:10px; background:rgba(0,255,156,0.12); color:#7dffcf; padding:2px 7px; border-radius:4px; font-family:monospace; border:1px solid rgba(0,255,156,0.25);">${vid.isNeuralVideo ? 'Neural T2V' : 'ReWind 2.0 Engine'}</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button type="button" class="v-copy-prompt-btn" style="background:rgba(255,255,255,0.06); color:#ddd; border:1px solid rgba(255,255,255,0.18); border-radius:6px; padding:4px 10px; font-size:11px; cursor:pointer;">📋 Copy Video Prompt</button>
      </div>
    </div>
  `;

  const dlBtn = card.querySelector('.v-dl-btn');
  dlBtn.onclick = () => download(vid.dataUrl, 'lokizen-video-' + Date.now() + ext);

  const copyPromptBtn = card.querySelector('.v-copy-prompt-btn');
  copyPromptBtn.onclick = () => {
    copyText(promptText);
    copyPromptBtn.textContent = '✓ Copied to Clipboard!';
    setTimeout(() => copyPromptBtn.textContent = '📋 Copy Video Prompt', 2500);
  };

  return card;
}
const FILE_ICONS = {pptx:'📊', blend:'🧊', fbx:'🧊', glb:'🧊', csv:'📈', json:'🧩', md:'📝', txt:'📄', html:'🌐', py:'🐍', js:'⚡', svg:'🎨', xml:'🧾'};
function fileCard(f){
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const c = el('div', 'file-card');
  c.innerHTML = `<div class="fc-ic">${FILE_ICONS[ext] || '📦'}</div><div class="fc-meta"><b></b><small>${esc(f.desc || ext.toUpperCase() + ' file')} · ${bytes(f.size || 0)}</small></div><button class="btn-primary">⤓ Download</button>`;
  $('b', c).textContent = f.name;
  $('button', c).onclick = () => download(f.dataUrl || f.text, f.name, f.mime);
  return c;
}
/* ================= VERIFIED RESOURCES & TRUST METER ================= */
function classifyClientTrust(score){
  const s = Math.max(5, Math.min(99, Math.round(Number(score) || 62)));
  if (s >= 90) return { tier: 'trustable', label: 'Trustable', color: '#10b981' };
  if (s >= 70) return { tier: 'reliable', label: 'Reliable', color: '#06b6d4' };
  if (s >= 45) return { tier: 'verify', label: 'Verify Carefully', color: '#f59e0b' };
  return { tier: 'low', label: 'Low Trust', color: '#ef4444' };
}
function canonicalResUrl(raw){
  try {
    const u = new URL(String(raw || '').trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    const kept = [];
    u.searchParams.forEach((v, k) => {
      const lk = k.toLowerCase();
      if (!lk.startsWith('utm_') && !['ref', 'fbclid', 'gclid', 'si', 'source', 'share', 'mc_cid', 'mc_eid'].includes(lk)) kept.push(lk + '=' + v);
    });
    kept.sort();
    const p = (u.pathname || '/').replace(/\/+$/, '') || '/';
    return 'https://' + host + p + (kept.length ? '?' + kept.join('&') : '');
  } catch(_) {
    return String(raw || '').toLowerCase().replace(/^http:\/\//, 'https://').replace(/^https:\/\/www\./, 'https://').replace(/#.*$/, '').replace(/\/+$/, '');
  }
}
function dedupeAndVerifyClientSources(rawList){
  const list = Array.isArray(rawList) ? rawList : [];
  const realOnly = list.filter(s => s && s.url && s.engine !== 'WebIndex' && !/^https?:\/\/(www\.)?google\.com\/search\?q=site:/i.test(String(s.url)));
  const pool = realOnly.length ? realOnly : list.filter(s => s && s.url);
  const byCanon = new Map();
  const byDomTitle = new Map();
  const tierADoms = ['nature.com','science.org','ieee.org','acm.org','arxiv.org','nih.gov','who.int','nasa.gov','reuters.com','apnews.com','bbc.com','bbc.co.uk','britannica.com','developer.mozilla.org','docs.python.org','doc.rust-lang.org','go.dev','learn.microsoft.com','wiki.secondlife.com','w3.org','doi.org','openalex.org','crossref.org','worldbank.org','ourworldindata.org'];
  const tierBDoms = ['wikipedia.org','wikidata.org','github.com','stackoverflow.com','nytimes.com','theguardian.com','bloomberg.com','economist.com','npr.org','arstechnica.com','wired.com','springer.com','sciencedirect.com','openlibrary.org'];
  const commDoms = ['reddit.com','news.ycombinator.com','medium.com','dev.to','substack.com','quora.com','youtube.com','x.com','twitter.com','facebook.com'];
  const lowDoms = ['bit.ly','tinyurl.com','t.co'];

  for (const item of pool){
    const url = String(item.url || '').trim();
    if (!/^https?:\/\//i.test(url)) continue;
    const canon = canonicalResUrl(url);
    const dom = LZ.domainOf(url).toLowerCase().replace(/^m\./, '');
    const titleKey = String(item.title || '').toLowerCase().replace(/[^a-z0-9\u0590-\u05ff]+/g, ' ').trim().slice(0, 80);
    const dtKey = titleKey.length >= 12 ? dom + '::' + titleKey : '';
    const existing = byCanon.has(canon) ? canon : (dtKey && byDomTitle.has(dtKey) ? byDomTitle.get(dtKey) : '');
    if (existing){
      const prev = byCanon.get(existing);
      if ((item.trustScore || 0) > (prev.trustScore || 0)) byCanon.set(existing, {...prev, ...item});
      continue;
    }

    let score = typeof item.trustScore === 'number' ? item.trustScore : null;
    let reason = item.trustReason || '';
    if (score === null){
      const matchDom = arr => arr.some(d => dom === d || dom.endsWith('.' + d));
      if (lowDoms.some(d => dom === d || dom.endsWith('.' + d)) || /\.(xyz|top|click|loan|buzz|tk)$/.test(dom)){
        score = 32; reason = 'Unverified redirect or low-reputation domain';
      } else if (/\.(gov|edu|mil)$|\.ac\.[a-z]{2}$/.test(dom) || matchDom(tierADoms)){
        score = 93; reason = 'Authoritative institution, official docs, or peer-reviewed source';
      } else if (matchDom(tierBDoms) || /^(arxiv|openalex|crossref)$/i.test(item.engine || '')){
        score = 83; reason = 'Established reference or published source';
      } else if (matchDom(commDoms)){
        score = 58; reason = 'Community discussion — verify claims independently';
      } else {
        score = dom.endsWith('.org') ? 73 : 64; reason = 'General web resource';
      }
      if (/^http:\/\//i.test(url)){ score -= 14; reason = 'Unencrypted HTTP · ' + reason; }
      else score += 2;
    }
    const meta = classifyClientTrust(score);
    const normalized = {
      ...item,
      url,
      domain: item.domain || dom,
      title: item.title || dom,
      engine: item.engine || 'Web',
      trustScore: Math.max(5, Math.min(99, Math.round(score))),
      trustTier: item.trustTier || meta.tier,
      trustLabel: item.trustLabel || meta.label,
      trustColor: item.trustColor || meta.color,
      trustReason: reason || 'Credibility evaluated',
      verified: (score >= 70)
    };
    byCanon.set(canon, normalized);
    if (dtKey) byDomTitle.set(dtKey, canon);
  }
  return Array.from(byCanon.values()).sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0));
}

function openSourcesModal(sources, meta = {}){
  const list = dedupeAndVerifyClientSources(sources);
  const modal = $('#sourcesModal');
  const body = $('#sourcesModalBody');
  const titleEl = $('#sourcesModalTitle');
  const subEl = $('#sourcesModalSub');
  if (!modal || !body) return;

  const avgTrust = list.length ? Math.round(list.reduce((a, s) => a + s.trustScore, 0) / list.length) : 0;
  const counts = {
    all: list.length,
    trustable: list.filter(s => s.trustTier === 'trustable').length,
    reliable: list.filter(s => s.trustTier === 'reliable').length,
    caution: list.filter(s => s.trustTier === 'verify' || s.trustTier === 'low').length
  };
  const avgMeta = classifyClientTrust(avgTrust);

  if (titleEl) titleEl.textContent = `🛡️ Verified Resources (${list.length} Unique)`;
  if (subEl) subEl.textContent = meta.verdict || `Average credibility: ${avgTrust}% (${avgMeta.label}) · Zero duplicates`;

  let activeFilter = 'all';
  const renderList = () => {
    const filtered = list.filter(s => {
      if (activeFilter === 'trustable') return s.trustTier === 'trustable';
      if (activeFilter === 'reliable') return s.trustTier === 'reliable';
      if (activeFilter === 'caution') return s.trustTier === 'verify' || s.trustTier === 'low';
      return true;
    });

    const itemsHtml = filtered.length
      ? filtered.map((src, idx) => `
        <a class="lz-res-card tier-${esc(src.trustTier)}" href="${esc(src.url)}" target="_blank" rel="noopener">
          <div class="lz-res-card-top">
            <div class="lz-res-id">
              <span class="lz-res-num">${idx + 1}</span>
              <img class="lz-res-fav" alt="" src="${esc(LZ.favicon(src.url))}" onerror="this.style.visibility='hidden'">
              <div class="lz-res-meta">
                <div class="lz-res-title">${esc(src.title || src.domain)}</div>
                <div class="lz-res-domain">${esc(src.domain)} ${src.engine ? `· <span>${esc(src.engine)}</span>` : ''}</div>
              </div>
            </div>
            <div class="lz-trust-badge tier-${esc(src.trustTier)}" style="--tc:${esc(src.trustColor)}">
              <span class="lz-trust-pct">${src.trustScore}%</span>
              <span class="lz-trust-lbl">${esc(src.trustLabel)}</span>
            </div>
          </div>
          <div class="lz-trust-meter" aria-label="Trust score ${src.trustScore}% (${esc(src.trustLabel)})">
            <div class="lz-trust-meter-fill" style="width:${src.trustScore}%;background:${esc(src.trustColor)}"></div>
          </div>
          <div class="lz-res-reason">${esc(src.trustReason || 'Verified resource')}</div>
          ${src.snippet ? `<div class="lz-res-snip">${esc(String(src.snippet).slice(0, 175))}</div>` : ''}
        </a>
      `).join('')
      : `<div class="lz-res-empty">No resources match this trust tier filter.</div>`;

    body.innerHTML = `
      <div class="lz-res-summary">
        <div class="lz-res-sum-stat">
          <small>Unique Resources</small>
          <b>${list.length}</b>
        </div>
        <div class="lz-res-sum-stat">
          <small>Avg Trust Score</small>
          <b style="color:${esc(avgMeta.color)}">${avgTrust}% · ${esc(avgMeta.label)}</b>
        </div>
        <div class="lz-res-sum-stat">
          <small>Trustable (90%+)</small>
          <b style="color:#10b981">${counts.trustable}</b>
        </div>
        <div class="lz-res-sum-stat">
          <small>Reliable (70–89%)</small>
          <b style="color:#06b6d4">${counts.reliable}</b>
        </div>
      </div>
      ${meta.verdict ? `<div class="lz-res-verdict">🛡️ <span>${esc(meta.verdict)}</span></div>` : ''}
      <div class="lz-res-filters" role="tablist" aria-label="Filter resources by trust level">
        <button type="button" class="lz-rf-btn ${activeFilter === 'all' ? 'on' : ''}" data-rf="all">All (${counts.all})</button>
        <button type="button" class="lz-rf-btn ${activeFilter === 'trustable' ? 'on' : ''}" data-rf="trustable">✓ Trustable 90%+ (${counts.trustable})</button>
        <button type="button" class="lz-rf-btn ${activeFilter === 'reliable' ? 'on' : ''}" data-rf="reliable">● Reliable 70–89% (${counts.reliable})</button>
        <button type="button" class="lz-rf-btn ${activeFilter === 'caution' ? 'on' : ''}" data-rf="caution">▲ Caution &lt;70% (${counts.caution})</button>
      </div>
      <div class="lz-res-list">${itemsHtml}</div>
    `;
    body.querySelectorAll('.lz-rf-btn').forEach(btn => {
      btn.onclick = () => {
        activeFilter = btn.dataset.rf || 'all';
        renderList();
      };
    });
  };
  renderList();
  openModal('sourcesModal');
}

function sourcesEl(sources, meta = {}){
  const unique = dedupeAndVerifyClientSources(sources);
  const wrap = el('div', 'sources-wrap');
  if (!unique.length) return wrap;
  const s = el('div', 'sources');
  const overall = unique.length
    ? Math.round(unique.reduce((a, x) => a + x.trustScore * (1 + x.trustScore / 100), 0) / unique.reduce((a, x) => a + (1 + x.trustScore / 100), 0))
    : 0;
  const overallMeta = classifyClientTrust(overall);
  const ov = el('div', 'sources-overall');
  ov.innerHTML = `<span>Overall trust</span> <b style="color:${esc(overallMeta.color)}">${overall}% · ${esc(overallMeta.label)}</b> <span>from ${unique.length} source${unique.length === 1 ? '' : 's'}</span>`;
  wrap.appendChild(ov);
  // Show MAXIMUM 3 unique resources directly under the AI message
  const topThree = unique.slice(0, 3);
  const extraCount = Math.max(0, unique.length - 3);

  topThree.forEach((src, i) => {
    const a = el('a', 'src');
    a.href = src.url; a.target = '_blank'; a.rel = 'noopener';
    a.title = `${src.title || src.domain} · Trust ${src.trustScore}% (${src.trustLabel}) — ${src.trustReason || ''}`;
    a.style.animationDelay = (i * 35) + 'ms';
    a.innerHTML = `<span class="n">${i + 1}</span><img alt="" src="${esc(LZ.favicon(src.url))}" onerror="this.style.visibility='hidden'"><span class="st"></span><span class="src-trust-pill tier-${esc(src.trustTier)}" style="--tc:${esc(src.trustColor)}" title="${esc(src.trustLabel)}: ${esc(src.trustReason || '')}">${src.trustScore}%</span>`;
    $('.st', a).textContent = src.domain || LZ.domainOf(src.url);
    if (src.trustReason){
      const why = el('span', 'src-reason-line');
      why.textContent = src.trustReason;
      a.appendChild(why);
    }
    s.appendChild(a);
  });

  // Plus button opening the floating deduplicated Verified Resources + Trust Meter modal
  const plusBtn = el('button', 'src-plus-btn');
  plusBtn.type = 'button';
  plusBtn.setAttribute('aria-label', extraCount > 0 ? `Show all ${unique.length} verified resources` : `Inspect trust scores for ${unique.length} verified resources`);
  plusBtn.innerHTML = extraCount > 0
    ? `<span class="plus-ic">+${extraCount}</span><span class="plus-lbl">All ${unique.length} Resources</span>`
    : `<span class="plus-ic">+</span><span class="plus-lbl">Trust Meter</span>`;
  plusBtn.onclick = () => openSourcesModal(unique, meta);
  s.appendChild(plusBtn);

  wrap.appendChild(s);
  return wrap;
}

async function factCheckMessage(m, triggerBtn){
  if (!m || !m.content) return;
  const origHtml = triggerBtn ? triggerBtn.innerHTML : '';
  if (triggerBtn){ triggerBtn.disabled = true; triggerBtn.innerHTML = '🛡️ Checking…'; }
  try {
    const c = state.current;
    const idx = c ? c.messages.indexOf(m) : -1;
    let query = '';
    if (c && idx > 0){
      for (let i = idx - 1; i >= 0; i--){
        if (c.messages[i].role === 'user' && c.messages[i].content){
          query = c.messages[i].content.slice(0, 180);
          break;
        }
      }
    }
    if (!query) query = plain(m.content).slice(0, 140);

    let pool = Array.isArray(m.sources) ? m.sources.slice() : [];
    if (pool.length < 4){
      try {
        const sr = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, limit: 25 })
        });
        if (sr.ok){
          const sj = await sr.json();
          if (Array.isArray(sj.results)) pool = [...pool, ...sj.results];
        }
      } catch(_){}
    }

    const vr = await fetch('/api/sources/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sources: pool, answer: m.content.slice(0, 2600), deepCheck: true })
    });
    if (vr.ok){
      const vj = await vr.json();
      if (Array.isArray(vj.sources) && vj.sources.length){
        m.sources = vj.sources;
        m.sourcesVerdict = vj.verdict || '';
        if (c){ persist(c); renderMessages(); }
        openSourcesModal(vj.sources, { verdict: vj.verdict || '' });
        toast(`🛡️ Verified ${vj.sources.length} unique resources (Avg Trust ${vj.avgTrust}%)`, 'ok');
        return;
      }
    }
    toast('No external web resources found for this message.', 'info');
  } catch(_e){
    toast('Could not verify resources right now.', 'err');
  } finally {
    if (triggerBtn){ triggerBtn.disabled = false; triggerBtn.innerHTML = origHtml; }
  }
}

/* BUI-19: AI follow-up suggestions about this conversation's topic. Generated after the answer by a
   fast, cheap model call (never delays the answer), cached on the message, clicked = sent. */
const followupsInflight = new Map();
function convOfMsg(m){ return (state.current && state.current.messages.includes(m)) ? state.current : state.convs.find(c => (c.messages || []).includes(m)); }
function fetchFollowUps(m){
  if (followupsInflight.has(m.id)) return followupsInflight.get(m.id);
  const c = convOfMsg(m);
  const msgs = c ? c.messages : [];
  const i = msgs.indexOf(m);
  const prevUser = i > 0 ? [...msgs.slice(0, i)].reverse().find(x => x.role === 'user') : null;
  const earlier = i > 0 ? msgs.slice(Math.max(0, i - 5), i - 1).filter(x => x.role === 'user').map(x => String(x.content || '').slice(0, 160)).join(' | ') : '';
  const headers = {'Content-Type': 'application/json'}; const tok = localStorage.getItem('lz.authToken'); if (tok) headers['x-lz-token'] = tok;
  const p = fetch('/api/chat/followups', {method: 'POST', headers, body: JSON.stringify({
    question: String(prevUser && prevUser.content || '').slice(0, 1200),
    answer: plain(String(m.content || '')).slice(0, 3500),
    context: earlier, lang: S.lang
  })}).then(r => r.ok ? r.json() : {items: []}).then(j => {
    const items = Array.isArray(j.items) ? j.items.filter(x => typeof x === 'string' && x.trim()).slice(0, 4) : [];
    if (items.length){ m.followups = items; if (c) persist(c); }
    return items;
  }).catch(() => []).finally(() => followupsInflight.delete(m.id));
  followupsInflight.set(m.id, p);
  return p;
}
function followUpChipsEl(m){
  const wrap = el('div', 'followup-wrap');
  const isH = isHeb(m.content || '') || S.lang === 'he';
  const head = el('div', 'followup-head', isH ? '✨ שאלות המשך מומלצות' : '✨ Recommended follow-ups');
  const bar = el('div', 'followup-chips');
  wrap.append(head, bar);
  const fill = (list) => {
    bar.innerHTML = '';
    if (!list || !list.length){ wrap.remove(); return; }
    const listHeb = list.some(q => isHeb(q));
    head.textContent = listHeb ? '✨ שאלות המשך מומלצות' : '✨ Recommended follow-ups';
    bar.classList.add('ai');
    list.forEach((q, i) => {
      const b = el('button', 'followup-chip');
      b.type = 'button'; b.dir = 'auto';
      b.style.animationDelay = (i * 65) + 'ms';
      b.textContent = '↳ ' + q;
      b.onclick = () => {
        if (state.busy) return;
        sound('chip');
        sendText(q);
      };
      bar.appendChild(b);
    });
  };
  if (Array.isArray(m.followups) && m.followups.length){ fill(m.followups); return wrap; }
  // Only the newest answer asks the model (opening old chats never fans out N calls).
  const c = convOfMsg(m);
  const last = c ? [...c.messages].reverse().find(x => x.role === 'assistant' && !x.pending) : null;
  if (!last || last !== m) return null;
  bar.classList.add('loading');
  bar.innerHTML = '<span class="followup-skel"></span><span class="followup-skel"></span><span class="followup-skel"></span>';
  fetchFollowUps(m).then(list => { bar.classList.remove('loading'); fill(list); });
  return wrap;
}

/* ================= CANDY EASTER EGG (LOCAL ADMIN VOICE PLAYBACK) ================= */
function detectCandyPromptClient(text){
  const raw = String(text || '').trim();
  if (!raw || raw.length > 180) return null;
  if (/\b(candy\s*crush|eye\s*candy|arm\s*candy|brain\s*candy|css|gradient|algorithm|database|sql)\b/i.test(raw)) return null;
  if (/סוכרי(?:ה|יה|ית|ות)/u.test(raw)) return { lang: 'he', reply: 'הנה קח סוכריה! 🍬' };
  if (/(?:حلوى|سكاكر|بونبون|مصاصة)/u.test(raw)) return { lang: 'ar', reply: 'تفضل، خذ حلوى! 🍬' };
  if (
    /^(?:candy|candies|lollipop|sweet|sweets)[!?.🍬🍭\s]*$/i.test(raw) ||
    /\b(?:give|bring|hand|pass|get|send|want|need|gimme|can\s+i\s+have|may\s+i\s+have|got\s+any)\b.{0,28}\b(?:candy|candies|lollipop|lollipops|sweets?)\b/i.test(raw) ||
    /\b(?:candy|lollipop)\b.{0,18}\b(?:please|pls|plz|now|for\s+me)\b/i.test(raw)
  ) return { lang: 'en', reply: 'Here, take a candy! 🍬' };
  return null;
}

function playCandyChimeFallback(){
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t0 = ac.currentTime + i * 0.08;
      g.gain.setValueAtTime(0.001, t0);
      g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);
      osc.connect(g); g.connect(ac.destination);
      osc.start(t0); osc.stop(t0 + 0.26);
    });
  } catch(_e){}
}

let activeCandyAudio = null;
function candyAttachmentEl(m){
  const isH = m.candyLang === 'he' || isHeb(m.content || '') || S.lang === 'he';
  const wrap = el('div', 'candy-attach-wrap');
  const btn = el('button', 'candy-shape-btn');
  btn.type = 'button';
  btn.setAttribute('aria-label', isH ? 'לחץ על הסוכריה להשמעת ההקלטה האחרונה של האדמין' : 'Click the candy to play the latest admin recording');
  const labelTxt = isH ? 'לחץ על הסוכריה!' : 'Click the Candy!';
  btn.innerHTML = `
    <svg class="candy-svg-shell" viewBox="0 0 220 86" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="cWrapL_${m.id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f472b6"/>
          <stop offset="100%" stop-color="#a855f7"/>
        </linearGradient>
        <linearGradient id="cBody_${m.id}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fb7185"/>
          <stop offset="50%" stop-color="#ec4899"/>
          <stop offset="100%" stop-color="#8b5cf6"/>
        </linearGradient>
        <linearGradient id="cShine_${m.id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.62)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </linearGradient>
      </defs>
      <!-- Left twisted wrapper tail -->
      <path d="M52 43 L16 18 C11 26 9 35 12 43 C9 51 11 60 16 68 Z" fill="url(#cWrapL_${m.id})" stroke="#fbcfe8" stroke-width="2" stroke-linejoin="round"/>
      <path d="M26 30 L48 43 L26 56" stroke="rgba(255,255,255,0.38)" stroke-width="2" stroke-linecap="round"/>
      <!-- Right twisted wrapper tail -->
      <path d="M168 43 L204 18 C209 26 211 35 208 43 C211 51 209 60 204 68 Z" fill="url(#cWrapL_${m.id})" stroke="#fbcfe8" stroke-width="2" stroke-linejoin="round"/>
      <path d="M194 30 L172 43 L194 56" stroke="rgba(255,255,255,0.38)" stroke-width="2" stroke-linecap="round"/>
      <!-- Candy Center Oval -->
      <rect x="48" y="13" width="124" height="60" rx="30" fill="url(#cBody_${m.id})" stroke="#fdf2f8" stroke-width="2.5"/>
      <!-- Diagonal candy stripes -->
      <path d="M74 15 L59 71 M102 14 L87 72 M130 14 L115 72 M158 16 L143 71" stroke="rgba(255,255,255,0.22)" stroke-width="8" stroke-linecap="round"/>
      <!-- Glossy top highlight -->
      <rect x="60" y="18" width="100" height="22" rx="11" fill="url(#cShine_${m.id})"/>
      <!-- Candy label -->
      <text x="110" y="48" text-anchor="middle" fill="#ffffff" font-family="Inter,Rubik,sans-serif" font-size="13.5" font-weight="800" style="text-shadow:0 2px 6px rgba(0,0,0,0.45)">🍬 ${esc(labelTxt)}</text>
    </svg>
  `;
  const status = el('div', 'candy-status-pill', isH ? '🎧 לחיצה מפעילה רק אצלך את הקלטת האדמין האחרונה' : '🎧 Click plays the latest admin recording only for you');
  wrap.append(btn, status);

  btn.onclick = async () => {
    if (activeCandyAudio){
      try { activeCandyAudio.pause(); activeCandyAudio.currentTime = 0; } catch(_){}
      activeCandyAudio = null;
      btn.classList.remove('playing');
      status.classList.remove('playing');
      status.textContent = isH ? '🎧 לחיצה מפעילה רק אצלך את הקלטת האדמין האחרונה' : '🎧 Click plays the latest admin recording only for you';
      return;
    }
    btn.classList.add('playing');
    status.classList.add('playing');
    status.textContent = isH ? '🍬 טוען הפתעה קולית...' : '🍬 Unwrapping audio surprise...';
    try {
      const r = await fetch('/api/audio/latest-admin-recording');
      const j = r.ok ? await r.json() : { available: false };
      if (!j.available || !j.clip || !j.clip.audioDataUrl){
        btn.classList.remove('playing');
        status.classList.remove('playing');
        playCandyChimeFallback();
        const emptyMsg = isH
          ? '🍬 עדיין אין הקלטת אדמין שמורה — ברגע שהאדמין יקליט משהו, הסוכריה תשמיע אותו רק לך!'
          : '🍬 No admin voice recording yet — once the admin records one, clicking this candy plays it just for you!';
        status.textContent = emptyMsg;
        toast(emptyMsg, 'info');
        return;
      }
      const clip = j.clip;
      status.textContent = isH
        ? `🔊 מנגן רק אצלך: ${clip.label || 'הקלטת אדמין'} (@${clip.by || 'Admin'})`
        : `🔊 Playing locally for you: ${clip.label || 'Admin Recording'} (@${clip.by || 'Admin'})`;

      // Play strictly locally in THIS browser tab (never broadcasts!)
      if (window.LZAuth && typeof window.LZAuth.playVoiceBroadcast === 'function' && clip.voiceFilter && clip.voiceFilter !== 'normal'){
        await window.LZAuth.playVoiceBroadcast(clip.audioDataUrl, clip.voiceFilter, `🍬 ${clip.label || 'Candy Surprise'}`, clip.caption || '', clip.by || 'Admin', null);
        setTimeout(() => {
          btn.classList.remove('playing');
          status.classList.remove('playing');
        }, 2500);
      } else {
        const audio = new Audio(clip.audioDataUrl);
        activeCandyAudio = audio;
        audio.onended = audio.onerror = () => {
          activeCandyAudio = null;
          btn.classList.remove('playing');
          status.classList.remove('playing');
          status.textContent = isH ? '🍬 לחץ שוב להשמעה חוזרת (רק אצלך)' : '🍬 Click again to replay (local only)';
        };
        await audio.play();
      }
    } catch(_e){
      btn.classList.remove('playing');
      status.classList.remove('playing');
      playCandyChimeFallback();
      toast(isH ? 'לא ניתן להשמיע את ההקלטה כרגע.' : 'Could not play the recording right now.', 'err');
    }
  };
  return wrap;
}

/* ================= REPORT AI MESSAGE MODAL ================= */
function openReportMessageModal(m, triggerBtn){
  const existing = $('#aiReportModalOverlay');
  if (existing) existing.remove();
  const isH = isHeb(m.content || '') || S.lang === 'he';
  const c = convOfMsg(m);
  const msgs = c ? (c.messages || []) : [];
  const idx = msgs.indexOf(m);
  const prevUser = idx > 0 ? [...msgs.slice(0, idx)].reverse().find(x => x.role === 'user') : null;
  let selectedCat = 'inaccurate';

  const cats = isH
    ? [
        ['inaccurate', '❌ מידע שגוי'],
        ['inappropriate', '⚠️ תוכן לא הולם'],
        ['bug', '🐛 באג / שגיאה טכנית'],
        ['incomplete', '📉 תשובה חלקית'],
        ['other', '💬 אחר']
      ]
    : [
        ['inaccurate', '❌ Inaccurate'],
        ['inappropriate', '⚠️ Inappropriate'],
        ['bug', '🐛 Technical Bug'],
        ['incomplete', '📉 Incomplete'],
        ['other', '💬 Other']
      ];

  const ov = el('div', 'lz-report-overlay');
  ov.id = 'aiReportModalOverlay';
  ov.innerHTML = `
    <div class="lz-report-card" role="dialog" aria-modal="true" dir="${isH ? 'rtl' : 'ltr'}">
      <div class="lz-report-head">
        <h3>🚩 ${isH ? 'דיווח על הודעת AI' : 'Report AI Message'}</h3>
        <button type="button" class="icon-btn" id="repCloseX" aria-label="Close">✕</button>
      </div>
      <div class="lz-report-preview" dir="auto">${esc(plain(String(m.content || '')).slice(0, 220))}${String(m.content || '').length > 220 ? '…' : ''}</div>
      <div class="lz-report-cats">
        ${cats.map(([id, lbl]) => `<button type="button" class="lz-report-cat ${id === selectedCat ? 'on' : ''}" data-rcat="${id}">${esc(lbl)}</button>`).join('')}
      </div>
      <textarea id="repReasonText" dir="auto" placeholder="${isH ? 'כתוב מה לא תקין בהודעה של ה-AI (חובה)...' : 'Write what is wrong with this AI response (required)...'}"></textarea>
      <div class="lz-report-foot">
        <button type="button" class="btn-ghost" id="repCancelBtn">${isH ? 'ביטול' : 'Cancel'}</button>
        <button type="button" class="btn-primary" id="repSubmitBtn">🚩 ${isH ? 'שלח דיווח' : 'Send Report'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(ov);
  const closeRep = () => ov.remove();
  ov.onclick = e => { if (e.target === ov) closeRep(); };
  $('#repCloseX', ov).onclick = closeRep;
  $('#repCancelBtn', ov).onclick = closeRep;
  $$('.lz-report-cat', ov).forEach(b => {
    b.onclick = () => {
      selectedCat = b.dataset.rcat;
      $$('.lz-report-cat', ov).forEach(x => x.classList.toggle('on', x === b));
    };
  });
  const txt = $('#repReasonText', ov);
  setTimeout(() => txt.focus(), 30);

  $('#repSubmitBtn', ov).onclick = async () => {
    const reason = txt.value.trim();
    if (!reason || reason.length < 2){
      toast(isH ? 'אנא כתוב פירוט קצר לדיווח לפני השליחה.' : 'Please write a short reason before sending.', 'err');
      txt.focus();
      return;
    }
    const subBtn = $('#repSubmitBtn', ov);
    subBtn.disabled = true;
    subBtn.textContent = isH ? 'שולח…' : 'Sending…';
    try {
      const headers = {'Content-Type': 'application/json'};
      const tok = localStorage.getItem('lz.authToken');
      if (tok) headers['x-lz-token'] = tok;
      const r = await fetch('/api/reports', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messageId: m.id || '',
          convId: c ? c.id : '',
          userPrompt: String(prevUser?.content || '').slice(0, 1200),
          aiResponse: String(m.content || '').slice(0, 2800),
          reason,
          category: selectedCat,
          model: m.tier || state.model || 'lokizenith'
        })
      });
      if (!r.ok){
        const errJ = await r.json().catch(() => ({}));
        throw new Error(errJ.error || 'Report failed');
      }
      if (triggerBtn){
        triggerBtn.classList.add('reported');
        triggerBtn.textContent = isH ? '✓ דווח' : '✓ Reported';
      }
      toast(isH ? '✓ תודה! הדיווח נשלח ונשמר בהיסטוריית האדמין.' : '✓ Report submitted and logged for Admin review.', 'ok');
      closeRep();
    } catch(err){
      toast(err.message || 'Could not submit report.', 'err');
      subBtn.disabled = false;
      subBtn.textContent = isH ? '🚩 שלח דיווח' : '🚩 Send Report';
    }
  };
}

function actions(m, which){
  const a = el('div', 'msg-actions');
  const isH = isHeb(m.content || '') || S.lang === 'he';
  const defs = {
    copy:['⧉', isH ? 'העתק' : 'Copy'],
    edit:['✎', isH ? 'ערוך' : 'Edit'],
    regen:['↻', isH ? 'צור מחדש' : 'Regenerate'],
    speak:['🔊', isH ? 'הקרא' : 'Read aloud'],
    quizme:['📝', isH ? 'בחן אותי על זה' : 'Quiz me on this'],
    flashcards:['🃏', isH ? 'כרטיסיות לימוד' : 'Flashcards'],
    summarize:['🎯', isH ? 'סכם' : 'Summarize'],
    simplify:['💡', isH ? 'פשט' : 'Simplify'],
    translate:['🌐', isH ? 'תרגם לאנגלית' : 'Translate'],
    deepdive:['🔬', isH ? 'העמק' : 'Deep Dive'],
    factcheck:['🛡️', isH ? 'בדיקת עובדות' : 'Fact-Check'],
    report:['🚩', isH ? 'דיווח' : 'Report']
  };
  which.forEach(k => {
    if (!defs[k]) return;
    const cls = k === 'factcheck' ? 'act-verify' : k === 'report' ? 'act-report' : (k === 'quizme' || k === 'flashcards') ? 'act-study' : '';
    const b = el('button', cls, defs[k][0] + ' ' + defs[k][1]);
    b.type = 'button';
    b.title = defs[k][1];
    b.onclick = () => {
      if (k === 'copy') copyText(m.content || '');
      if (k === 'regen') regenerate(m);
      if (k === 'speak') speak(m.content);
      if (k === 'edit') editMessage(m);
      if (k === 'quizme' && !state.busy){
        sendText(isHeb(m.content || '') ? 'תעשה לי מבחן על החומר הזה עם 8 שאלות (שאלות אמריקאיות ושאלות פתוחות)' : 'Make me a test on this material with 8 questions (option questions and open questions)');
      }
      if (k === 'flashcards' && !state.busy){
        sendText(isHeb(m.content || '') ? '/flashcards על החומר שלמדנו עכשיו' : '/flashcards on the material we just learned');
      }
      if (k === 'summarize' && !state.busy){
        sendText(isHeb(m.content || '') ? 'סכם את התשובה האחרונה שלך בקצרה ובחדות ב-4 נקודות מפתח.' : 'Summarize your last answer into 4 crisp, high-signal bullet points.');
      }
      if (k === 'simplify' && !state.busy){
        sendText(isHeb(m.content || '') ? 'הסבר את התשובה האחרונה שלך בשפה פשוטה מאוד עם דוגמה יומיומית.' : 'Explain your last answer in super simple terms with an everyday analogy.');
      }
      if (k === 'translate' && !state.busy){
        sendText(isHeb(m.content || '') ? 'Translate your last answer clearly into natural English.' : 'תרגם את התשובה האחרונה שלך לעברית טבעית וברורה.');
      }
      if (k === 'deepdive' && !state.busy){
        sendText(isHeb(m.content || '') ? 'העמק בתשובה האחרונה עם דוגמאות מעשיות, ניואנסים חשובים ומקרי קצה.' : 'Deep dive into your last answer with concrete examples, nuances, and edge cases.');
      }
      if (k === 'factcheck') factCheckMessage(m, b);
      if (k === 'report') openReportMessageModal(m, b);
    };
    a.appendChild(b);
  });
  return a;
}
function upgradeCard(feature, onSwitch){
  const f = FEATURE_INFO[feature] || {icon:'⚡', label:'This feature'};
  const c = el('div', 'upgrade-card');
  c.innerHTML = `<h3>${f.icon} ${esc(f.label)} is a Stark feature</h3>
  <p>You're on <b>Lokizenith 3.5 Fera</b>. Upgrade to <b>Lokizen 4.0 Stark</b> to unlock it — plus smarter, faster answers.</p>
  <ul><li>Create images</li><li>Live 8-engine web research</li><li>PowerPoint decks & files</li><li>Interactive Charts, KPI Metrics, Timelines & 3D Cards</li></ul>
  <button class="btn-primary">⚡ Switch to Stark</button>`;
  $('button', c).onclick = onSwitch;
  return c;
}
function scrollDown(force){ const b = $('#messages'); if (force || b.scrollHeight - b.scrollTop - b.clientHeight < 260) b.scrollTop = b.scrollHeight; }

/* ================= COMPOSER ================= */
/* auto-grow for every prompt box: grows line by line up to ~40% of the viewport, then scrolls; shrinks back when cleared */
const GROW_SEL = '#prompt,#lcPrompt,#lsInput,.autogrow';
function grow(ta){
  if (!ta) return;
  const max = Math.round((window.visualViewport ? visualViewport.height : innerHeight) * .4);
  ta.style.height = 'auto';
  const h = Math.min(ta.scrollHeight + (ta.offsetHeight - ta.clientHeight), max);
  ta.style.height = h + 'px'; ta.style.overflowY = ta.scrollHeight > max ? 'auto' : 'hidden';
}
function autosize(){ grow($('#prompt')); }
document.addEventListener('input', e => { if (e.target.matches && e.target.matches(GROW_SEL)) grow(e.target); }, true);
// catch programmatic value changes (send, clear, presets)
['#prompt', '#lcPrompt'].forEach(sel => { const ta = document.querySelector(sel); if (!ta) return; const d = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value'); Object.defineProperty(ta, 'value', {get(){ return d.get.call(this); }, set(v){ d.set.call(this, v); requestAnimationFrame(() => grow(this)); }}); });
addEventListener('resize', () => document.querySelectorAll(GROW_SEL).forEach(x => x.value && grow(x)));
function updateSend(){
  const b = $('#sendBtn');
  if (state.busy){ b.disabled = false; b.classList.add('stop'); b.setAttribute('aria-label', 'Stop'); return; }
  b.classList.remove('stop'); b.setAttribute('aria-label', 'Send');
  b.disabled = !$('#prompt').value.trim() && !state.attachments.length;
}
function setMode(mode){
  state.mode = mode;
  const chip = $('#modeChip');
  const bar = $('#modeChipBar');
  if (mode !== 'search' && state.deepSearch) state.deepSearch = false;
  if (typeof renderFeatureChips === 'function') renderFeatureChips();
  if (!mode){
    if (chip) chip.hidden = true;
    if (bar) bar.hidden = true;
    $('#prompt').placeholder = 'Message Lokizenith… (type / for tools or @ for plugins)';
    requestAnimationFrame(autosize);
    return;
  }
  const f = FEATURE_INFO[mode] || {icon:'✦', label: mode};
  if (bar) bar.hidden = false;
  if (chip){
    chip.hidden = false;
    chip.innerHTML = `<span class="mode-chip-ic" aria-hidden="true">${f.icon}</span><span class="mode-chip-lbl">${esc(f.label)}</span><button type="button" class="mode-chip-x" aria-label="Clear mode">✕</button>`;
    const clrBtn = $('button', chip);
    if (clrBtn) clrBtn.onclick = () => setMode(null);
  }
  $('#prompt').placeholder = {
    image: 'Describe the image to create…',
    'image-edit': 'Attach a photo & describe what to change (e.g. "add sunglasses", "change background")…',
    video: 'Describe the video scene to generate (e.g. "drone shot of cyberpunk Tokyo")…',
    search: state.deepSearch ? 'Deep search (100+ sites) — what should I research?' : 'What should I search the web for?',
    slides: 'What is the presentation about?',
    file: 'What file should I create?'
  }[mode] || 'Message Lokizenith…';
  $('#prompt').focus(); requestAnimationFrame(autosize);
}
async function addFiles(files){
  if (!files || !files.length) return;
  const list = [...files].slice(0, 16);
  if (window.LZAuth && LZAuth.consumeFeatureQuota){
    const qRes = await LZAuth.consumeFeatureQuota('file_attach', list.length);
    if (qRes && qRes.allowed === false){
      const plan = getUserPlanTier();
      const lim = plan === 'pro' ? 25 : 8;
      toast(`🔒 You reached your ${lim} photo & file attachments limit (resets every 4 hours). Upgrade your plan for more!`, 'err');
      return;
    }
  }
  const existingImages = state.attachments.filter(a => a.kind === 'image').length;
  let imageSlots = Math.max(0, 10 - existingImages);
  const jobs = list.map(async (f) => {
    try {
      if (f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(f.name || '')){
        if (imageSlots <= 0){ toast('You can attach up to 10 photos at once.', 'err'); return; }
        imageSlots -= 1;
        const plan = f.size > 1_500_000 ? {max: 896, q: 0.74} : {max: 1024, q: 0.82};
        const dataUrl = LZ.recompressFile ? await LZ.recompressFile(f, plan.max, plan.q) : await LZ.recompress(await LZ.blobToDataURL(f), plan.max, plan.q);
        return {kind:'image', name: f.name || 'image.jpg', dataUrl, size: Math.round(dataUrl.length * .75)};
      }
      if (f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|ogv)$/i.test(f.name || '')){
        if (f.size > 80 * 1024 * 1024){ toast(f.name + ' is too large (max 80 MB for video)', 'err'); return; }
        toast('Preparing video… grabbing keyframes');
        const analysis = await LZ.extractVideoAnalysis(f, {
          onProgress: (msg) => toast(msg)
        });
        analysis.kind = 'video';
        analysis.sessionUrl = URL.createObjectURL(f);
        return analysis;
      }
      toast('Reading ' + (f.name || 'file') + '…');
      return await LZ.extractFileText(f);
    } catch(e){
      toast('Could not read ' + (f.name || 'file'), 'err');
      return null;
    }
  });
  const added = (await Promise.all(jobs)).filter(Boolean);
  added.forEach(a => state.attachments.push(a));
  renderTray(); updateSend();
}
function mediaActionBar(){
  const images = state.attachments.filter(a => a.kind === 'image');
  const videos = state.attachments.filter(a => a.kind === 'video');
  if (!images.length && !videos.length) return null;
  const bar = el('div', 'media-actions');
  const btn = (id, label) => {
    const b = el('button', 'media-act', label);
    b.type = 'button';
    b.dataset.act = id;
    return b;
  };
  if (images.length) bar.appendChild(btn('ocr', '🔤 Copy text'));
  if (images.length >= 2) bar.appendChild(btn('compare', '🪞 Compare'));
  if (images.length) bar.appendChild(btn('a11y', '♿ Describe'));
  if (images.length) bar.appendChild(btn('region', '⛶ Ask about a region'));
  if (videos.length) bar.appendChild(btn('video', '🎥 Analyze video'));
  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'ocr') { $('#prompt').value = 'Extract all readable text from each photo exactly, then give a one-line caption for each.'; }
    else if (act === 'compare') { $('#prompt').value = 'Compare these photos: describe each one, then what is the same, what is different, and a short conclusion.'; }
    else if (act === 'a11y') { $('#prompt').value = 'Write a detailed accessibility description and alt text for each photo.'; }
    else if (act === 'video') { $('#prompt').value = 'Analyze this video: what happens, who or what appears, and transcribe any speech.'; }
    else if (act === 'region') { openRegionPicker(); return; }
    autosize(); updateSend(); $('#prompt').focus();
  });
  return bar;
}
function openRegionPicker(){
  const imgs = state.attachments.filter(a => a.kind === 'image');
  if (!imgs.length){ toast('Attach a photo first', 'err'); return; }
  let m = document.getElementById('regionPicker');
  if (!m){
    m = el('div', 'modal region-modal');
    m.id = 'regionPicker';
    m.innerHTML = `<div class="region-box" role="dialog" aria-label="Ask about a region">
      <div class="region-head"><b>Ask about a region</b><button type="button" class="x" data-close="1" aria-label="Close">✕</button></div>
      <p class="region-hint">Drag a box over the part you want to ask about.</p>
      <div class="region-stage"><img id="regionImg" alt=""><canvas id="regionCanvas"></canvas></div>
      <div class="region-actions"><button type="button" class="btn-ghost" data-close="1">Cancel</button><button type="button" class="btn-primary" id="regionCrop">Use this region</button></div>
    </div>`;
    document.body.appendChild(m);
  }
  const imgEl = m.querySelector('#regionImg');
  const canvas = m.querySelector('#regionCanvas');
  const src = imgs[imgs.length - 1];
  imgEl.onload = () => {
    const r = imgEl.getBoundingClientRect();
    canvas.width = imgEl.clientWidth;
    canvas.height = imgEl.clientHeight;
    const ctx = canvas.getContext('2d');
    let start = null, box = null;
    const pos = ev => {
      const cr = canvas.getBoundingClientRect();
      return {x: ev.clientX - cr.left, y: ev.clientY - cr.top};
    };
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if (!box) return;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.clearRect(box.x, box.y, box.w, box.h);
      ctx.strokeStyle = '#00ff9c';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
    };
    canvas.onpointerdown = ev => { start = pos(ev); box = {x:start.x,y:start.y,w:0,h:0}; canvas.setPointerCapture(ev.pointerId); };
    canvas.onpointermove = ev => {
      if (!start) return;
      const p = pos(ev);
      box = {x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x-start.x), h: Math.abs(p.y-start.y)};
      draw();
    };
    canvas.onpointerup = () => { start = null; };
    m.querySelector('#regionCrop').onclick = async () => {
      if (!box || box.w < 8 || box.h < 8){ toast('Drag a larger region', 'err'); return; }
      const im = new Image();
      im.src = src.dataUrl;
      await new Promise(res => { im.onload = res; });
      const scaleX = im.naturalWidth / canvas.width;
      const scaleY = im.naturalHeight / canvas.height;
      const oc = document.createElement('canvas');
      oc.width = Math.max(1, Math.round(box.w * scaleX));
      oc.height = Math.max(1, Math.round(box.h * scaleY));
      oc.getContext('2d').drawImage(im, box.x*scaleX, box.y*scaleY, box.w*scaleX, box.h*scaleY, 0, 0, oc.width, oc.height);
      let dataUrl = oc.toDataURL('image/webp', 0.85);
      if (!dataUrl.startsWith('data:image/webp')) dataUrl = oc.toDataURL('image/jpeg', 0.85);
      state.attachments.push({kind:'image', name: 'Region of ' + (src.name || 'photo'), dataUrl, size: Math.round(dataUrl.length * .75), regionOf: src.name});
      m.hidden = true;
      renderTray(); updateSend();
      $('#prompt').value = $('#prompt').value.trim() || 'What is in this highlighted region?';
      autosize(); updateSend(); $('#prompt').focus();
    };
  };
  imgEl.src = src.dataUrl;
  m.hidden = false;
  m.onclick = ev => { if (ev.target === m || ev.target.closest('[data-close]')) m.hidden = true; };
}
function renderTray(){
  const tr = $('#attachTray'); tr.innerHTML = '';
  let photoN = 0;
  state.attachments.forEach((a, i) => {
    let thumb = '<span class="fi" style="font-size:1.3rem">📄</span>';
    let tag = '';
    if (a.kind === 'image'){
      photoN += 1;
      thumb = `<img src="${a.dataUrl}" alt="">`;
      tag = `<em class="tray-label">Photo ${photoN}</em>`;
    } else if (a.kind === 'video'){
      thumb = a.poster ? `<img src="${a.poster}" alt="">` : '<span class="fi" style="font-size:1.3rem">🎥</span>';
      tag = `<em class="tray-label">Video${a.duration ? ' · ' + Math.round(a.duration) + 's' : ''}${a.keyframes ? ' · ' + a.keyframes.length + ' frames' : ''}</em>`;
    }
    const it = el('div', 'tray-item' + (a.kind === 'video' ? ' is-video' : (a.kind === 'image' ? ' is-image' : '')), thumb + `<span>${esc((a.name || 'file').length > 22 ? (a.name || 'file').slice(0, 20) + '…' : (a.name || 'file'))}${tag}</span><button class="x" aria-label="Remove">✕</button>`);
    $('.x', it).onclick = () => { state.attachments.splice(i, 1); renderTray(); updateSend(); };
    tr.appendChild(it);
  });
  const bar = mediaActionBar();
  if (bar) tr.appendChild(bar);
}

/* ================= TOOL & CARD REGISTRY =================
   Modules (places.js, tools.js, …) register chat tools and rich message cards here. */
const TOOLS = [], CARDS = {};
function registerTool(tl){ TOOLS.push(tl); if (!FEATURE_INFO[tl.id]) FEATURE_INFO[tl.id] = {icon: tl.icon || '✦', label: tl.label || tl.id}; }
function registerCard(type, fn){ CARDS[type] = fn; }
function findTool(text, mode, hasImages){
  if (mode) return TOOLS.find(x => x.id === mode) || null;
  if (hasImages && !TOOLS.some(x => x.images)) return null;
  for (const x of TOOLS){ try { if (x.test && x.test(text || '', {hasImages})) return x; } catch(_){} }
  return null;
}
function cardEl(c, m){
  const f = CARDS[c.type]; if (!f) return el('div', 'err-card', '⚠️ ' + esc(c.type));
  try { return f(c.data, m, c); } catch(e){ console.warn(e); return el('div', 'err-card', '⚠️ ' + esc(t('Could not show this card'))); }
}
function persistMsg(m){ const c = state.convs.find(x => x.messages.includes(m)) || state.current; if (c) persist(c); }
function sendText(text, meta, mode){
  if (state.busy) return;
  if (state.view !== 'chat') showView('chat');
  const ta = $('#prompt'); ta.value = text; state.pendingMeta = meta || null; if (mode) state.mode = mode; send();
}

/* ================= INTENTS ================= */
const RX = {
  video: /\b(video|clip|movie|animation|animate|motion|film)\b|generate\s+(a\s+)?video|make\s+(me\s+)?(a\s+)?video|צור\s*(לי\s*)?סרטון|תיצור\s*(לי\s*)?סרטון|סרטון\s*של|וידאו\s*של|אנימציה\s*של/i,
  image: /\b(draw|paint|sketch|illustrate|render)\b|\b(generate|create|make|design)\s+(me\s+)?(an?\s+)?(\w+\s+){0,2}(image|picture|photo|logo|wallpaper|illustration|art(work)?|poster|icon)\b|תצייר|צייר|צור\s*(לי\s*)?תמונה|תיצור\s*(לי\s*)?תמונה|תעשה\s*(לי\s*)?תמונה|תכין\s*(לי\s*)?תמונה|ציור של|תמונה של/i,
  model3d: /\b3d\s*(model|object|asset|mesh|render)|\bblender\b|\bfbx\b|\bglb\b|\.blend\b|מודל\s*(תלת[\s-]*מימד|3d)|תלת[\s-]*מימד/i,
  slides: /power\s?point|\bpptx?\b|presentation|slide\s?deck|\bslides\b|מצגת|שקפים/i,
  file: /\b(create|make|generate|give me|export|write|build)\s+(me\s+)?(an?\s+)?([\w.-]+\s+){0,3}(file|csv|spreadsheet|\.txt|\.json|\.md)\b|downloadable|(צור|תיצור|תכין|הכן|תעשה|תן)\s*(לי\s*)?(\S+\s*)?קובץ|להורדה/i,
  searchExplicit: /\b(search|look\s?up|google|browse)\b|\bon the (web|internet)\b|חפש|תחפש|חיפוש|באינטרנט|ברשת/i,
  widgetNoun: /\b(calculator|simulator|simulation|game|widget|visuali[sz](e|ation|er)|interactive|timer|stopwatch|converter|playground|tracker|counter|clock|piano|drum ?pad|color picker|generator|dashboard|planner|animation|demo)\b|מחשבון|סימולטור|סימולציה|משחק|וידג'ט|ווידג'ט|ויזואליזציה|אינטראקטיבי|טיימר|שעון עצר|ממיר|הדמיה|آلة حاسبة|حاسبة|محاكاة|لعبة|تفاعلي|مؤقت|محول/i,
  widgetVerb: /\b(make|build|create|give|show|code|write|generate|design|i want|i need|can you)\b|צור|תיצור|בנה|תבנה|תעשה|תכין|הכן|תן לי|אני רוצה|תראה|اصنع|أنشئ|ابن|صمم|أريد|اعمل/i,
  liveFacts: /\b(news|latest|today'?s?|tonight|yesterday|this week|right now|price of|stock price|who won|final score|election results?|breaking)\b|חדשות|היום|עכשיו|מחיר של|מי ניצח/i,
  searchImplicit: /\b(latest|news|today|tonight|yesterday|current(ly)?|this (week|month|year)|right now|price of|weather|score|who won|recent|2025|2026)\b|חדשות|היום|עכשיו|עדכני|אחרון|מחיר|מזג האוויר/i
};
// Greetings / thanks / tiny chit-chat never trigger web search.
function isSmallTalk(text){
  const t = String(text || '').trim().toLowerCase().replace(/[!?.,…\s]+$/g, '');
  if (!t) return true;
  if (t.length <= 3) return true;
  return /^(hi+|hey+|hello+|yo|sup|hola|shalom|שלום|היי|הי|אהלן|מה קורה|מה נשמע|thanks?|thank you|thx|ty|תודה( רבה)?|ok(ay)?|cool|nice|good (morning|night|evening)|בוקר טוב|לילה טוב|how are you|what'?s up|bye|ביי|سلام|مرحبا|شكرا)( (there|lokizenith|lokizen|bro|man|everyone|all))?$/i.test(t);
}
function detectIntent(text, hasImages, hasVideo){
  if (hasVideo) return null;
  if (RX.video.test(text) && !hasImages) return 'video';
  if (RX.model3d.test(text) && !hasImages) return 'model3d';
  if (RX.slides.test(text)) return 'slides';
  if (!hasImages && RX.image.test(text)) return 'image';
  if (RX.widgetNoun.test(text) && (RX.widgetVerb.test(text) || text.length < 50)) return 'widget';
  if (RX.file.test(text)) return 'file';
  if (RX.searchExplicit.test(text)) return 'search';
  return null;
}

function buildLongTermMemory(currentConvId){
  if (!state.convs || !state.convs.length) return '';
  const others = state.convs
    .filter(c => c && c.id !== currentConvId && Array.isArray(c.messages) && c.messages.some(m => m.role === 'user'))
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

  if (!others.length) return '';

  const mem = [
    '=== LONG-TERM CONVERSATION MEMORY (CROSS-SESSION ARCHIVE) ===',
    'You have continuous long-term memory across sessions. When the user asks about previous chats, what the latest chat was about ("על מה דיברנו בצ\'אט האחרון / קודם?", "מה דיברנו בפעם האחרונה?", "what was our latest chat about?"), or asks what you remember from earlier, ALWAYS recall and describe the prior conversation faithfully and accurately in the user\'s language.'
  ];

  const latest = others[0];
  if (latest) {
    const userPrompts = (latest.messages || []).filter(m => m.role === 'user').map(m => (m.content || '').slice(0, 160));
    const botReplies = (latest.messages || []).filter(m => m.role === 'assistant').map(m => (m.content || '').slice(0, 160));
    const dt = new Date(latest.updatedAt || latest.createdAt || Date.now());
    const dateStr = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    mem.push(`\n[★ LATEST PREVIOUS CONVERSATION]`);
    mem.push(`- Title: "${latest.title || 'Untitled Session'}"`);
    mem.push(`- Date & Time: ${dateStr}`);
    mem.push(`- User Queries: ${userPrompts.slice(0, 4).map(p => `"${p}"`).join('; ')}`);
    if (botReplies.length) {
      mem.push(`- Key Assistant Replies / Summary: ${botReplies.slice(0, 2).map(r => `"${r}..."`).join('; ')}`);
    }
  }

  const older = others.slice(1, 7);
  if (older.length) {
    mem.push(`\n[OTHER RECENT CONVERSATIONS]`);
    older.forEach((c, idx) => {
      const firstQ = (c.messages || []).find(m => m.role === 'user')?.content?.slice(0, 100) || '';
      const d = new Date(c.updatedAt || c.createdAt || Date.now()).toLocaleDateString();
      mem.push(`${idx + 1}. "${c.title || 'Chat'}" (${d}): User asked: "${firstQ}"`);
    });
  }

  return mem.join('\n');
}

function isPhotoEditRequest(text, hasImages){
  if (state.mode === 'image-edit') return true;
  if (!hasImages) return false;
  const t = String(text || '').trim();
  if (!t) return false;
  const editPatterns = [
    /\b(edit|modify|change|add|put|place|insert|remove|replace|swap|turn|transform|photoshop|touch\s*up|retouch|filter)\b/i,
    /\b(make\s+(it|him|her|this|the)\s+(look|appear|wear|have|into))\b/i,
    /\b(change\s+(the\s+)?(background|color|face|eyes|clothes|hair|outfit))\b/i,
    /\b(add\s+(a\s+|an\s+)?[\w\s]+to\s+(this|the|my)\s+(photo|image|picture|pic))\b/i,
    /תערוך|ערוך|לערוך|תוסיף|תוסיפי|שים|שימי|תשים|תשימי|תחליף|תחליפי|להחליף|שנה|תשנה|תשני|לשנות|תוריד|תמחק|פוטושופ|עיבוד/i,
    /תוסיף\s+(לו|לה|לי|לתמונה|לתמונות)|שים\s+(לו|לה|לי)|תלביש|תצבע|תשנה\s+את\s+הרקע/i
  ];
  return editPatterns.some(rx => rx.test(t));
}

/* ================= PROMPTS ================= */
function systemPrompt(tier, extra, userHint){
  const name = MODELS[tier].name, lang = LANG_NAME[S.lang] || 'English';
  const isFastLevel = state.level === 0 || state.level === 4;
  const asksRichVisual = /\b(chart|graph|diagram|mermaid|svg|kanban|quiz|flashcard|timeline|mindmap|swot|dashboard|calculator|simulator|interactive|widget|mini[- ]?app|build\s+(me\s+)?a|create\s+(me\s+)?a|make\s+(me\s+)?a|html)\b|גרף|תרשים|טבלה\s+אינטראקטיבית|חידון|כרטיסיות|מחשבון|אפליקציה|ממשק|תבנה|בנה\s+לי/i.test(String(userHint || ''));
  const L = [
    `You are ${name}, the flagship AI assistant made by Lokizenith Studios (app: Lokizenith AI). If asked who made you, answer that you were developed by Lokizenith Studios. Do NOT mention or claim to know private individuals such as Elad Benczel; if asked about them, simply say you do not have information about them. Never claim to be or mention any other company, model, provider or API.`,
    S.replyInLang ? `Reply in ${lang} by default; if the user clearly writes in another language, reply in that language.` : `Reply in the language the user writes in.`,
    `Conversation & Answer Style:
- Talk naturally, warmly, and intelligently like a real, top-tier conversational AI assistant.
- Deep Understanding, Speed & Precision: Grasp nuanced user intent immediately; deliver rigorous, accurate, verified answers right away without rambling or filler. In fast/Turbo reasoning, get straight to the exact high-precision answer cleanly, then fill in the requested length.
- Creative & Articulate: Deliver engaging, insightful, high-substance explanations without cliché AI fluff. Prefer specific facts, numbers, and named sources over vague claims.
- Honor the ANSWER LENGTH directive exactly: short stays tight; medium is a bit detailed; detailed and long must actually be thorough (examples, caveats, structure) — never a short stub when those lengths are selected.
- NEVER start your response with "Executive Takeaway —", "Quick-Start Options", or repetitive canned templates.
- When the user says "hi", "hello", "hey", "שלום", "היי", "מה קורה", or chats casually, respond naturally and warmly like a friendly conversation partner — do NOT generate charts, action plans, or widgets for greetings!
- When the user asks a real question, asks for an explanation, coding, math, brainstorming, or analysis, give an accurate, high-quality answer sized to the selected ANSWER LENGTH.
- Accuracy first: verify facts, math and code; never invent sources, links, quotes or numbers; if unsure or the info may be outdated, say so briefly.

Person & Topic Internet Photos (OPTIONAL):
- When the user asks about a real person (historical figure, scientist, leader, celebrity, athlete, artist, creator), you MAY attach 1 portrait photo of that person by placing [WEB_IMAGE: Exact English Full Name of Person] on its own line (you do NOT need to attach 2 images — attaching just 1 photo is preferred, and only attach 2 if comparing two separate people).
- IMPORTANT: Put ONLY the person's exact name inside [WEB_IMAGE: Full Name] (never add extra words like "house", "statue", "logo", or "map") so the image shows ONLY the person themselves.
- Do NOT emit [WEB_IMAGE: ...] for greetings, casual chat, pure code, math/physics formulas, or when generating/editing images yourself.

Writing & Formatting (always):
- Open with the answer itself in the first sentence (the direct fact, number, verdict or core summary). Zero preamble ("Great question!", "Sure!", "בהחלט!"), no restating the question, and no filler or closing offers ("Let me know if...", "אם תרצה...").
- Visual organization & clarity: keep paragraphs crisp and short (max 2-3 lines), leave blank lines between blocks, use bullet lists with **bold lead-ins** (e.g., \`- **Key point:** explanation\`) for parallel points, numbered lists for steps or rankings, and a Markdown table for any comparison of 2+ options across 2+ criteria.
- Use ## / ### headings cleanly when the answer has 3+ distinct sections; never put a heading on a short answer or greeting. Keep headings short and informative (never "Introduction").
- Include one brief concrete example when it makes a concept immediately clearer.
- **Bold** the key terms, numbers and verdict (sparingly for scannability, never whole sentences). Use \`inline code\` and fenced code blocks with a language tag for code, commands and file names.
- Complex, multi-part, comparison or research answers end with a concise conclusion: "**Bottom line:**" (Hebrew: "**בשורה התחתונה:**") of 1-2 sentences that actually decides or summarizes. Simple factual answers need no conclusion.
- With web sources: synthesize across them (don't list them one by one), cite inline as [1], [2], say what is confirmed vs. uncertain and how recent it is, then conclude.
- Hebrew: write natural, fluent, modern Israeli Hebrew (never translated-sounding), accurate gender/grammar, standard terms, numbers and units in Western digits; keep code, commands and product names in English.

Tables & Structured In-Text Data (CRITICAL):
- When the user asks for a table (e.g., "טבלה", "table", comparisons, word lists, letter/language correspondences, translations, or data summaries) OR when structured tabular format is the best way to explain:
  ALWAYS present the table directly in the text using standard Markdown table syntax:
  | עמודה 1 | עמודה 2 | עמודה 3 |
  | :--- | :--- | :--- |
  | ערך 1 | ערך 2 | ערך 3 |
- Markdown tables automatically render into beautiful, interactive, sortable, and searchable tables with CSV export in the UI!
- NEVER wrap table contents in code fences or output raw array fragments (like \`["ג'", "ج"]\`) or broken JSON. Tables must always be formatted as readable in-text Markdown tables or valid \`\`\`loki-table JSON blocks.`,
    ...((!isFastLevel || asksRichVisual) ? [
    `Interactive UI Response Blocks (USE WHEN VISUAL UI MAKES THE ANSWER CLEARER THAN PLAIN TEXT):
Beyond Markdown tables, you can embed rich, live interactive UI components inside your answer using fenced JSON blocks (1–2 per complex answer; NEVER use on greetings or trivial 1-line replies):
- \`\`\`loki-compare (Side-by-Side Feature & Plan Comparison Cards): {"title":"...","items":[{"name":"Option A","icon":"⚡","price":"$19/mo","badge":"Best Overall","recommended":true,"tagline":"...","features":{"Speed":"Ultra","Ease":true,"Offline":false}},{"name":"Option B","price":"Free","features":{"Speed":"Fast","Ease":true,"Offline":true}}],"verdict":"..."}
- \`\`\`loki-tabs (Interactive Multi-Tab Explorer): {"title":"...","tabs":[{"label":"Overview","icon":"◈","summary":"...","points":["..."]},{"label":"Example","icon":"⟨/⟩","code":"..."}]}
- \`\`\`loki-calc (Live Interactive Slider Calculator — safe math formulas with +,-,*,/,^,round,sqrt): {"title":"...","inputs":[{"id":"amount","label":"Amount","min":100,"max":50000,"step":100,"default":5000,"prefix":"$"},{"id":"rate","label":"Annual Rate","min":1,"max":20,"step":0.5,"default":7,"unit":"%"},{"id":"years","label":"Years","min":1,"max":30,"step":1,"default":10,"unit":" yrs"}],"outputs":[{"label":"Future Value","formula":"round(amount * (1 + rate/100)^years, 0)","prefix":"$"},{"label":"Total Profit","formula":"round(amount * (1 + rate/100)^years - amount, 0)","prefix":"$"}]}
- \`\`\`loki-progress (Animated Sortable Breakdown / Score Bars): {"title":"...","max":100,"unit":"%","items":[{"label":"Performance","value":94,"tag":"Top","note":"..."},{"label":"Efficiency","value":87}]}
- \`\`\`loki-tree (Interactive Expandable Mind-Map / Hierarchy Tree): {"title":"...","root":{"label":"Main Topic","desc":"...","children":[{"label":"Branch 1","icon":"◆","desc":"...","children":[{"label":"Subtopic A","desc":"..."}]}]}}
- \`\`\`loki-verdict (Executive Review & Multi-Dimension Rating Scorecard): {"title":"...","score":9.2,"maxScore":10,"badge":"Editor's Choice","headline":"...","summary":"...","dimensions":[{"label":"Design","score":9.5},{"label":"Value","score":8.8}],"bestFor":["Power users"],"avoidIf":["Tight budgets"]}
- \`\`\`loki-chart: {"type":"bar|line|pie|doughnut|radar","title":"...","labels":["..."],"datasets":[{"label":"...","data":[10,20]}]}
- \`\`\`loki-timeline: {"title":"...","events":[{"date":"...","title":"...","desc":"..."}]}
- \`\`\`loki-metrics: {"title":"...","metrics":[{"label":"...","value":"...","delta":"+15%","progress":85,"note":"..."}]}
- \`\`\`loki-proscons: {"title":"...","score":9.1,"pros":["..."],"cons":["..."],"verdict":"..."}
- \`\`\`loki-steps: {"title":"...","steps":[{"title":"...","detail":"..."}]}
- \`\`\`loki-cards: {"title":"...","cards":[{"front":"...","back":"..."}]}
- \`\`\`loki-kanban: {"title":"...","columns":[{"title":"To Do","items":["..."]},{"title":"In Progress","items":["..."]},{"title":"Done","items":["..."]}]}
- \`\`\`loki-quiz: {"title":"...","questions":[{"q":"...","options":["A","B","C","D"],"answer":0,"explain":"..."}]}
- \`\`\`loki-table: {"title":"...","headers":["Col1","Col2"],"rows":[["Val1","Val2"]]}
- \`\`\`loki-architecture: {"title":"...","nodes":[{"icon":"⚡","label":"...","role":"Stage 1","desc":"..."}]}
- \`\`\`loki-swot: {"title":"...","strengths":["..."],"weaknesses":["..."],"opportunities":["..."],"threats":["..."]}
- \`\`\`loki-decision: {"title":"...","criteria":[{"name":"Speed","weight":9}],"options":[{"name":"Option A","scores":[9.2]}]}
Always ensure valid JSON inside any \`\`\`loki-* block. Use the user's language (Hebrew or English) inside all block titles, labels, and descriptions.`,
    `Rich answers (use when they genuinely help; never for greetings, one-line facts, or when ANSWER LENGTH is SHORT):
- Include a short worked example when it makes the idea clearer.
- For processes, architecture, comparisons, or relationships, you may add a fenced mermaid diagram (\`\`\`mermaid) — flowchart, sequence, or mindmap.
- For a simple illustration or labeled drawing, you may include a compact inline SVG in a \`\`\`svg fence (no external URLs or scripts).
- When the user asks you to build, make, or try a calculator, quiz, game, simulator, planner, or any other interactive tool, invent a brand-new self-contained mini-app from scratch for THAT request — unique layout, logic, and interactions, not a pre-made template. Put a complete HTML document (inline CSS and JS only, no external scripts except Google Fonts) in a \`\`\`loki-html or \`\`\`html fence.
- For a calculator, tiny demo, or interactive example in a longer answer, the same \`\`\`loki-html fence (or an existing loki-* visual block) is the right format.
- Prefer one or two high-quality extras over many.`
    ] : [
    `Interactive UI: Only output a self-contained \`\`\`loki-html fence if the user explicitly asks you to build an interactive app, calculator, game, or UI. Otherwise stick to fast, crisp Markdown text, bullets, and Markdown tables.`
    ]),
    `Date: ${new Date().toDateString()}.`
  ];
  // Rich Personalization System Prompt Injection
  const persLines = [];
  if (S.name) persLines.push(`- Address / recognize the user as: ${S.name}.`);
  if (S.userRole) persLines.push(`- User's role & background: ${S.userRole}. Match technical depth and examples to their background.`);
  const personaMap = {
    direct: 'Be razor-sharp, concise, and direct — lead immediately with the answer and skip fluff.',
    warm: 'Be warm, encouraging, friendly, and supportive while staying accurate.',
    teacher: 'Act as a patient, crystal-clear tutor: break ideas down with intuitive analogies and gentle steps.',
    developer: 'Respond like a principal software engineer: focus on clean architecture, edge cases, and idiomatic code.',
    creative: 'Be imaginative, original, and expressive — bring fresh perspectives and creative ideas.',
    witty: 'Be lively, clever, and subtly witty while remaining thoroughly accurate.'
  };
  if (S.persona && personaMap[S.persona]) persLines.push(`- Tone & Persona: ${personaMap[S.persona]}`);
  const fmtMap = {
    bullets: 'Prefer crisp bullet points and scannable key takeaways.',
    steps: 'Structure explanations into clear numbered step-by-step instructions.',
    concise: 'Keep responses compact and information-dense.',
    deep: 'Provide comprehensive, deep explanations with examples and trade-offs.'
  };
  if (S.responseFormat && fmtMap[S.responseFormat]) persLines.push(`- Preferred Format: ${fmtMap[S.responseFormat]}`);
  if (S.emojiLevel === 'none') persLines.push('- Emoji style: Do NOT use emojis unless explicitly requested.');
  else if (S.emojiLevel === 'rich') persLines.push('- Emoji style: Use tasteful, expressive emojis to highlight headings and key takeaways.');
  if (S.aboutMe) persLines.push(`- About the user: ${S.aboutMe}`);
  if (S.howRespond) persLines.push(`- Custom user instructions (STRICTLY OBEY): ${S.howRespond}`);
  if (S.avoidTopics) persLines.push(`- Avoid / exclude: ${S.avoidTopics}`);
  if (persLines.length) {
    L.push(`=== USER PERSONALIZATION PROFILE (ACTIVE — ALWAYS RESPECT) ===\n${persLines.join('\n')}`);
  }
  if (state.level >= 1) L.push(`Think carefully and double-check facts, math and code before answering${state.level >= 2 ? '; structure the answer clearly' : ''}.`);
  const curId = state.current ? state.current.id : '';
  const mem = buildLongTermMemory(curId);
  if (mem) L.push(mem);
  if (extra) L.push(extra);
  // Length directive last so it overrides any generic style guidance above.
  L.push(ANSWER_LENGTH_PROMPT[normalizeAnswerLength(state.answerLength)] || ANSWER_LENGTH_PROMPT.medium);
  return L.join('\n');
}
function apiHistory(conv, tier, extraSys){
  const list = conv.messages.filter(m => !m.type && !m.error && !m.pending).slice(-24);
  const lastUser = [...list].reverse().find(m => m.role === 'user');
  const msgs = [{role:'system', content: systemPrompt(tier, extraSys, lastUser ? lastUser.content : '')}];
  list.forEach(m => {
    if (m.role === 'user'){
      let text = m.content || '';
      (m.attachments || []).filter(a => a.kind === 'file').forEach(a => { text += `\n\n[Attached file: ${a.name}]\n"""\n${(a.text || '').slice(0, 24000)}\n"""`; });
      const imgs = (m.attachments || []).filter(a => a.kind === 'image');
      const videos = (m.attachments || []).filter(a => a.kind === 'video');
      if (videos.length && m === lastUser){
        videos.forEach(v => {
          text += `\n\n[Attached video: ${v.name || 'video'}${v.duration ? ' (' + Number(v.duration).toFixed(1) + 's)' : ''}]`;
          if (v.transcript) text += `\nAudio transcript:\n"""\n${String(v.transcript).slice(0, 8000)}\n"""`;
          (v.keyframes || []).forEach((k, i) => { text += `\nFrame ${i + 1} at ${typeof k.timeSec === 'number' ? k.timeSec.toFixed(1) + 's' : 't?'}.`; });
        });
      }
      const frameUrls = [];
      if (m === lastUser){
        imgs.forEach((im, i) => { if (im.dataUrl){ text += (imgs.length > 1 ? `\nPhoto ${i + 1} (${im.name || 'photo'}) is attached.` : ''); frameUrls.push(im.dataUrl); } });
        videos.forEach(v => (v.keyframes || []).forEach(k => { if (k.dataUrl && frameUrls.length < 10) frameUrls.push(k.dataUrl); }));
      }
      if (frameUrls.length && m === lastUser){
        msgs.push({role:'user', content: [{type:'text', text: text || (videos.length ? 'Analyze this video.' : (imgs.length > 1 ? 'Analyze each photo, then compare them.' : 'Describe this image.'))}, ...frameUrls.slice(0, 10).map(url => ({type:'image_url', image_url:{url}}))]});
      } else {
        if (imgs.length) text += `\n[The user attached ${imgs.length} image(s) earlier.]`;
        if (videos.length) text += `\n[The user attached a video earlier.]`;
        msgs.push({role:'user', content: text});
      }
    } else {
      let t = m.content || '';
      (m.images || []).forEach(i => t += `\n[You created an image: ${i.prompt}]`);
      (m.files || []).forEach(f => t += `\n[You created the file ${f.name}]`);
      if (m.widget) t += `\n[You built an interactive widget: ${m.widget.title}]`;
      (m.cards || []).forEach(c => t += `\n[${c.summary || ('You showed a ' + c.type + ' card')}]`);
      msgs.push({role:'assistant', content: t});
    }
  });
  return {msgs, hasImages: !!(lastUser && (lastUser.attachments || []).some(a => a.kind === 'image' || a.kind === 'video'))};
}

/* thinking levels — fast streaming reasoning across all 5 levels */
async function deliberate(msgs, ctx){
  const {tier, level, work, signal, onToken, turnId} = ctx;
  const on = t => work.log(t);
  const lengthId = normalizeAnswerLength(state.answerLength);
  const maxT = ANSWER_LENGTH_TOKENS[lengthId] || 2400;
  const isFast = level === 0 || level === 4;
  const minWriteMs = (S.typewriter !== false && !S.reduceMotion) ? (isFast ? 200 : 1000) : 0;
  const base = {tier, level, signal, onStatus: on, turnId: turnId || '', answerLength: lengthId, minWriteMs, bg: ctx.bg};
  if (level === 0){
    on('⚡ Turbo reasoning · streaming live answer');
    return LZ.chat(msgs, {...base, maxTokens: maxT, onToken});
  }
  if (level === 1){ on('Writing live answer…'); return LZ.chat(msgs, {...base, maxTokens: maxT, onToken}); }
  if (level === 2){ on('Reasoning carefully & writing answer…'); const a = await LZ.chat(msgs, {...base, maxTokens: maxT, onToken}); on('Double-checked the answer'); return a; }
  if (level === 4){
    on('⚡ Ultra reasoning · streaming live answer');
    return LZ.chat(msgs, {...base, level: 4, maxTokens: maxT, onToken});
  }
  // Level 3: Extra High
  on('Thinking pass 1/2 · Deep analysis & verification');
  on('Thinking pass 2/2 · Streaming refined answer');
  return LZ.chat(msgs, {...base, level: 3, maxTokens: maxT, onToken});
}


/* ================= TOOLS (Parallel Internet Research + Credibility Verification) ================= */
const RESEARCH_CFG = [{q:1, r:80, p:4}, {q:1, r:90, p:4}, {q:1, r:110, p:5}, {q:2, r:140, p:6}, {q:1, r:90, p:4}];
async function deepResearch(question, ctx){
  const {work, signal} = ctx;
  const cleanQ = question.replace(/^(please\s+)?(search( the web)?( for)?|look up|google|חפש( לי)?|תחפש( לי)?|deep search)\s*[:,-]?\s*/i, '').trim().slice(0, 220) || question;
  work.log('Deep search · scanning 100+ websites in parallel');
  const payload = await LZ.deepSearch(cleanQ, {
    signal,
    onProgress: (p) => {
      if (p && p.message) work.log(p.message);
      else if (p) work.log(`Sites found: ${p.found || p.unique || 0} · read: ${p.read || 0}`);
    }
  });
  const sources = payload.sources || payload.results || [];
  const secs = payload.elapsedMs ? (Math.round(payload.elapsedMs / 100) / 10) : '';
  ctx.sourcesVerdict = `Deep search analyzed ${payload.uniqueCount || sources.length} unique sites (${payload.readCount || 0} pages read${secs ? ' in ' + secs + 's' : ''}). Overall trust ${payload.overallTrust || payload.avgTrust || 0}%.`;
  ctx.deepConclusion = payload.conclusion || '';
  ctx.deepMeta = payload;
  work.log(`Deep search done · ${payload.uniqueCount || sources.length} unique / ${payload.readCount || 0} read`);
  return sources;
}
async function webResearch(question, ctx, deep){
  const {work, signal, tier, level} = ctx;
  const useDeep = !!(deep || ctx.deep);
  if (useDeep && LZ.deepSearch) return deepResearch(question, ctx);
  if (level === 0 && !deep && !ctx.explicitSearch) return turboResearch(question, ctx);
  const cfg = deep ? {q:1, r:150, p:6} : (RESEARCH_CFG[level] || RESEARCH_CFG[2]);
  const engines = ctx.engines || ['wiki', 'hn'];
  work.log('🌐 Searching live websites across Google, Bing, DuckDuckGo & News…');
  const cleanQ = question.replace(/^(please\s+)?(search( the web)?( for)?|look up|google|חפש( לי)?|תחפש( לי)?)\s*[:,-]?\s*/i, '').trim().slice(0, 220) || question;
  let searchMeta = null;
  const rawAll = await LZ.search(cleanQ, cfg.r, signal, {
    engines,
    deep: useDeep,
    onMeta: (m) => { searchMeta = m; }
  });
  if (searchMeta) {
    if (searchMeta.groundedAnswer) ctx.groundedAnswer = searchMeta.groundedAnswer;
    const engs = Array.isArray(searchMeta.enginesUsed) && searchMeta.enginesUsed.length ? searchMeta.enginesUsed.join(', ') : 'Web';
    const domsCount = searchMeta.distinctDomains || rawAll.length;
    ctx.sourcesVerdict = `Searched ${searchMeta.scannedCount || rawAll.length} results across ${domsCount} distinct websites (${engs}).`;
    work.log(`Found ${searchMeta.uniqueCount || rawAll.length} unique websites across ${domsCount} domains`);
  }
  let verifiedList = dedupeAndVerifyClientSources(rawAll);
  const picked = []; const doms = new Set();
  for (const r of verifiedList){
    const d = r.domain || LZ.domainOf(r.url);
    if (!doms.has(d)){ doms.add(d); picked.push(r); }
    if (picked.length >= cfg.p) break;
  }
  const queue = picked.slice(0, level === 4 ? 3 : 4);
  if (queue.length) {
    queue.forEach(r => work.log(`Reading [${r.engine || 'Web'}]`, r.url));
    await Promise.all(queue.map(async r => { r.text = await LZ.readPage(r.url, deep ? 2400 : 1800, signal, deep ? 3000 : 2200); }));
  }
  return verifiedList;
}
/* ⚡ Turbo research: fast single live multi-site search (Google Grounding + Bing + DDG + News), instant trust scoring. */
async function turboResearch(question, ctx, o = {}){
  const {work, signal} = ctx;
  const cleanQ = question.replace(/^(please\s+)?(search( the web)?( for)?|look up|google|חפש( לי)?|תחפש( לי)?)\s*[:,-]?\s*/i, '').trim().slice(0, 220) || question;
  work.log(`🌐 Live web search: “${cleanQ}”`);
  let searchMeta = null;
  const raw = await LZ.search(cleanQ, 70, signal, {
    fast: true,
    onMeta: (m) => { searchMeta = m; }
  });
  if (searchMeta) {
    if (searchMeta.groundedAnswer) ctx.groundedAnswer = searchMeta.groundedAnswer;
    if (searchMeta.distinctDomains) {
      ctx.sourcesVerdict = `Searched ${searchMeta.scannedCount || raw.length} results across ${searchMeta.distinctDomains} websites.`;
    }
  }
  const verifiedList = dedupeAndVerifyClientSources(raw);
  const picked = []; const doms = new Set();
  for (const r of verifiedList){
    const d = r.domain || LZ.domainOf(r.url);
    if (!doms.has(d)){ doms.add(d); picked.push(r); }
    if (picked.length >= 3) break;
  }
  if (picked.length && !ctx.groundedAnswer) {
    work.log(`Reading top ${picked.length} websites in parallel`);
    await Promise.all(picked.map(async r => { r.text = await LZ.readPage(r.url, 1500, signal, o.readMs || 2200); }));
  }
  work.log(`Verified ${verifiedList.length} live web sources`);
  return verifiedList;
}
function sourcesContext(sources){
  const unique = dedupeAndVerifyClientSources(sources).slice(0, 14);
  if (!unique.length) return '';
  return `LIVE VERIFIED INTERNET SOURCES (Scanned across multiple real websites right now — synthesize a clear, accurate, direct answer using these live facts, cite inline with [n], and NEVER claim you cannot access the internet):\n\n` + unique.map((s, i) => `[${i + 1}] [Trust: ${s.trustScore}% · ${s.trustLabel}] (${s.engine || 'Web'}) ${s.title} — ${s.url}\n${(s.text || s.snippet || '').slice(0, 560)}`).join('\n\n---\n\n');
}

async function toolAnalyzePhoto(msgs, um, ctx){
  const {work, signal, onToken} = ctx;
  work.log('Analyzing photo: Scene summary, object detection & text extraction…');

  const userQuery = (um.content || '').trim() || 'Describe and analyze this image in detail.';
  const isH = isHeb(userQuery);

  const structuredPrompt = `You are Lokizen Vision Intelligence. Analyze the user's attached photo with high precision.
Return a valid JSON object matching EXACTLY this schema:
{
  "summary": "<Concise 2-3 sentence overview of the scene, setting, subjects, and atmosphere in ${isH ? 'Hebrew' : 'the user\'s language'}>",
  "objects": [
    {"name": "<object/subject name>", "location": "<e.g. Foreground, Center, Background, Left, Right>", "attributes": "<concise visual attributes>"}
  ],
  "extractedText": "<exact text, words, numbers, labels, signs, or OCR content found in the image, or empty string if none>",
  "attributes": {
    "colors": ["<hex color code 1>", "<hex color code 2>", "<hex color code 3>", "<hex color code 4>"],
    "lighting": "<e.g. Natural Daylight / Studio Softbox / Golden Hour / Warm Ambient / Dark Cyberpunk>",
    "style": "<e.g. Realistic Photography / Macro Shot / Digital Art / Document / Screenshot>"
  },
  "answer": "<Comprehensive, high-caliber conversational explanation in ${isH ? 'Hebrew' : 'the user\'s language'} answering the user's specific request or giving a rich breakdown of the image. Use clean markdown formatting.>"
}`;

  let parsed = null;
  let rawText = '';
  try {
    const analysisMsgs = [
      { role: 'system', content: structuredPrompt },
      ...msgs.filter(m => m.role !== 'system')
    ];
    rawText = await LZ.vision(analysisMsgs, { signal, maxTokens: 2800, onStatus: x => work.log(x) });
    parsed = LZ.parseJSON(rawText);
  } catch (e) {
    if (e.name === 'AbortError') throw e;
  }

  if (!parsed || !parsed.summary) {
    let cleanAnswer = rawText || 'Photo analyzed successfully.';
    let summaryText = cleanAnswer.slice(0, 190).replace(/[#*`_]/g, '').trim();
    if (summaryText.length > 50) summaryText += '…';
    parsed = {
      summary: summaryText || 'Visual elements, composition, and subjects recognized in the photo.',
      objects: [
        { name: 'Primary Subject', location: 'Center' },
        { name: 'Surrounding Scene', location: 'Background' }
      ],
      extractedText: '',
      attributes: {
        colors: ['#00ff9c', '#10b981', '#06170f', '#eafff5'],
        lighting: 'Natural Ambient',
        style: 'High-Resolution Photography'
      },
      answer: cleanAnswer
    };
  }

  const finalContent = parsed.answer || parsed.summary || rawText;
  if (onToken) onToken('', finalContent);

  return {
    content: finalContent,
    photoInsights: {
      summary: parsed.summary,
      objects: parsed.objects || [],
      extractedText: parsed.extractedText || '',
      attributes: parsed.attributes || { colors: ['#00ff9c', '#10b981', '#050f0a'], lighting: 'Natural', style: 'Photo' }
    }
  };
}

async function toolImage(text, ctx){
  const {work, signal, ph, turnId} = ctx;
  const step = (txt) => { work.log(txt); if (ph) ph.step(t(txt)); };
  step('Composing scene…');
  let prompt = text, caption = '';
  try {
    const j = await LZ.chatJSON([{role:'system', content:'You turn image requests into prompts for an image generator. Return JSON {"prompt":"<vivid, detailed ENGLISH prompt, max 70 words: subject, style, lighting, composition, quality tags>","caption":"<one short friendly sentence in the SAME language as the user describing what you created>"}'}, {role:'user', content: text}], {tier:'stark', turnId: turnId || '', signal, maxTokens: 500, onStatus: x => work.log(x)});
    if (j.prompt) prompt = j.prompt; caption = j.caption || '';
  } catch(e){ if (e.name === 'AbortError' || e.code === 'STARK_LIMIT_REACHED' || e.code === 'LIMIT_REACHED') throw e; }
  work.log('Composed visual prompt: ' + prompt.slice(0, 90) + (prompt.length > 90 ? '…' : ''));
  const n = ctx.level >= 3 ? 2 : 1, images = [];
  for (let i = 0; i < n; i++){
    step(n > 1 ? `Rendering details… (${i + 1}/${n})` : 'Rendering details…');
    const t0 = performance.now();
    const dataUrl = await LZ.generateImage(prompt + (i ? ', alternative composition' : ''), {signal, turnId: turnId || '', onStatus: x => step(x)});
    ImgETA.record((performance.now() - t0) / 1000);
    images.push({dataUrl, prompt});
    work.log('Image rendered');
  }
  return {content: caption || ({he:'הנה התמונה שיצרתי בשבילך ✨', ar:'إليك الصورة التي أنشأتها لك ✨'}[isHeb(text) ? 'he' : /[\u0600-\u06FF]/.test(text) ? 'ar' : ''] || 'Here is your image ✨'), images};
}

async function toolEditPhoto(text, sourceDataUrl, ctx){
  const {work, signal, ph, turnId} = ctx;
  const step = (txt) => { work.log(txt); if (ph) ph.step(t(txt)); };
  step('Analyzing photo with Vision…');

  let photoAnalysis = '';
  if (sourceDataUrl) {
    try {
      const msgs = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this photo in concise detail for an AI photo editing and modification pipeline. Describe: 1) Main subject, facial features, clothing, pose, 2) Environment/background, 3) Lighting direction, colors, photographic style. Keep under 70 words.' },
            { type: 'image_url', image_url: { url: sourceDataUrl } }
          ]
        }
      ];
      const visionPromise = LZ.vision(msgs, { signal, turnId: turnId || '', maxTokens: 300 });
      const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('VisionTimeout')), 8000));
      photoAnalysis = await Promise.race([visionPromise, timeoutPromise]);
    } catch (e) {
      if (e.name === 'AbortError' || e.code === 'LIMIT_REACHED') throw e;
      photoAnalysis = 'A clear high quality photo with natural lighting and realistic composition';
    }
  }

  step('Composing photographic edits…');
  let editPrompt = '', caption = '';
  try {
    const chatPromise = LZ.chatJSON([
      {
        role: 'system',
        content: 'You are an expert AI photo editor. Given an analysis of the original photo and the user\'s requested edit, output JSON {"prompt":"<vivid, highly photographic English prompt. Retain the original subject identity, face, lighting, and composition while seamlessly adding/modifying the requested elements. Use photorealistic, 8k, crisp detail tags>","caption":"<one short friendly sentence in the user\'s language (Hebrew/English) explaining the edits made>"}'
      },
      {
        role: 'user',
        content: `Original photo analysis: "${photoAnalysis}"\nUser edit request: "${text}"`
      }
    ], { tier: 'stark', turnId: turnId || '', signal, maxTokens: 400 });
    const chatTimeout = new Promise((_, rej) => setTimeout(() => rej(new Error('ChatTimeout')), 6000));
    const j = await Promise.race([chatPromise, chatTimeout]);
    if (j?.prompt) editPrompt = j.prompt;
    if (j?.caption) caption = j.caption;
  } catch (e) {
    if (e.name === 'AbortError' || e.code === 'STARK_LIMIT_REACHED' || e.code === 'LIMIT_REACHED') throw e;
  }

  if (!editPrompt) {
    editPrompt = `Photorealistic modified photo of ${photoAnalysis}, edited according to: ${text}, seamless blending, realistic lighting, highly detailed 8k photography`;
  }

  step('Rendering edited version…');
  const t0 = performance.now();
  const editedDataUrl = await LZ.generateImage(editPrompt, { signal, turnId: turnId || '', onStatus: x => step(x) });
  ImgETA.record((performance.now() - t0) / 1000);

  const defaultCaption = isHeb(text)
    ? 'הנה הגרסה הערוכה של התמונה שלך! ביצעתי את השינויים שביקשת תוך שמירה על התאורה והמבנה המקורי של התמונה. ניתן ללחוץ על "Before / After" כדי להשוות ✨'
    : 'Here is your edited photo! I applied your edits while preserving the original composition and lighting. You can toggle "Before / After" to compare ✨';

  return {
    content: caption || defaultCaption,
    images: [{
      dataUrl: editedDataUrl,
      originalUrl: sourceDataUrl,
      prompt: editPrompt,
      isEdited: true
    }]
  };
}
/* image ETA learned from real durations */
const ImgETA = {
  get(){ const a = safeJSON(localStorage.getItem('lz.imgTimes')) || []; if (!a.length) return 20; const avg = a.reduce((x, y) => x + y, 0) / a.length; return Math.max(8, Math.min(60, avg + 3)); },
  record(s){ const a = safeJSON(localStorage.getItem('lz.imgTimes')) || []; a.push(Math.round(s * 10) / 10); localStorage.setItem('lz.imgTimes', JSON.stringify(a.slice(-6))); }
};
/* beautiful emerald green animated placeholder with live seconds-left countdown & real-time work analysis */
function ImagePlaceholder(host, count){
  const total = ImgETA.get() * (count || 1);
  const root = el('div', 'img-ph');
  root.innerHTML = `
    <div class="ph-grid"></div>
    <div class="ph-rings">
      <div class="ph-ring r1"></div>
      <div class="ph-ring r2"></div>
      <div class="ph-ring r3"></div>
    </div>
    <div class="ph-core-pulse"></div>
    <div class="ph-scan"></div>
    <div class="ph-sparks">${'<i></i>'.repeat(16)}</div>
    <div class="ph-top-badge">
      <div class="ph-brand-chip"><span></span> Lokizen Neural Canvas</div>
      <div class="ph-sec-chip">⏱️ <b class="ph-sec-num">${Math.ceil(total)}</b>s left</div>
    </div>
    <div class="ph-middle">
      <div class="ph-icon">🎨</div>
      <div class="ph-analysis-box">
        <div class="ph-analysis-head"><span class="ph-radar-dot"></span> LIVE ANALYSIS · WORKING NOW</div>
        <div class="ph-analysis-task">Synthesizing prompt semantics & composition geometry…</div>
      </div>
    </div>
    <div class="ph-bottom">
      <div class="ph-bar"><span></span></div>
      <div class="ph-status-row">
        <span class="ph-step-text">Neural Diffusion Pass</span>
        <span class="ph-eta-text">Calculating…</span>
      </div>
    </div>
  `;
  $$('.ph-sparks i', root).forEach((s, i) => {
    s.style.left = (6 + (i * 31) % 88) + '%';
    s.style.animationDelay = (-i * .28) + 's';
    s.style.animationDuration = (2.2 + (i % 4) * .4) + 's';
  });
  host.appendChild(root);

  const secNumEl = $('.ph-sec-num', root);
  const taskEl = $('.ph-analysis-task', root);
  const stepTextEl = $('.ph-step-text', root);
  const etaTextEl = $('.ph-eta-text', root);
  const bar = $('.ph-bar span', root);

  const dynamicTasks = [
    'Analyzing prompt semantics & composition geometry…',
    'Synthesizing neural depth map & subject contours…',
    'Generating high-frequency diffusion passes…',
    'Balancing photorealistic lighting & ambient shading…',
    'Polishing 8K textures, reflections & micro-contrast…'
  ];
  let customTask = false;

  const t0 = performance.now();
  const tick = () => {
    const elapsed = (performance.now() - t0) / 1000;
    const left = Math.max(0, total - elapsed);
    const progress = Math.min(0.97, elapsed / total);

    if (secNumEl) secNumEl.textContent = Math.ceil(left);
    if (bar) bar.style.transform = `scaleX(${progress})`;
    if (etaTextEl) {
      etaTextEl.textContent = left > 0.5 ? `${Math.ceil(left)}s remaining` : 'Finalizing…';
    }

    if (!customTask && taskEl) {
      const idx = Math.min(dynamicTasks.length - 1, Math.floor(progress * dynamicTasks.length));
      if (taskEl.textContent !== dynamicTasks[idx]) {
        taskEl.textContent = dynamicTasks[idx];
        taskEl.classList.remove('swap');
        void taskEl.offsetWidth;
        taskEl.classList.add('swap');
      }
    }
  };
  tick();
  const iv = setInterval(tick, 150);

  return {
    root,
    step(txt){
      customTask = true;
      if (taskEl) {
        taskEl.textContent = txt;
        taskEl.classList.remove('swap');
        void taskEl.offsetWidth;
        taskEl.classList.add('swap');
      }
      if (stepTextEl) stepTextEl.textContent = txt;
    },
    async reveal(images){
      clearInterval(iv);
      if (bar) bar.style.transform = 'scaleX(1)';
      if (secNumEl) secNumEl.textContent = '0';
      const img = new Image();
      img.src = images[0].dataUrl;
      img.className = 'ph-img';
      try { await img.decode(); } catch(_){}
      root.appendChild(img);
      root.classList.add('reveal');
      await new Promise(r => setTimeout(r, S.reduceMotion ? 0 : 850));
      const g = imagesEl(images);
      g.classList.add('noanim');
      root.replaceWith(g);
      return g;
    },
    remove(){
      clearInterval(iv);
      root.remove();
    }
  };
}

/* video placeholder — cinematic camera viewfinder with live timecode & REC indicator */
function VideoPlaceholder(host, durationSec, ratio){
  const dur = Math.min(8, Math.max(2, parseInt(durationSec, 10) || 4));
  const r = ratio || '16:9';
  const root = el('div', 'video-ph');
  root.dataset.ratio = r;
  root.innerHTML = `
    <div class="vph-reticle"></div>
    <div class="vph-corner vph-tl"></div>
    <div class="vph-corner vph-tr"></div>
    <div class="vph-corner vph-bl"></div>
    <div class="vph-corner vph-br"></div>
    <div class="vph-cross"></div>
    <div class="vph-top-bar">
      <div class="vph-rec"><span class="vph-rec-dot"></span>REC</div>
      <div class="vph-meta">
        <span style="color:#00ff9c;font-weight:700;">Lokizen ReWind 1.0</span>
        <span>•</span>
        <span>${esc(r)}</span>
        <span>•</span>
        <span>30 FPS</span>
      </div>
    </div>
    <div class="vph-center">
      <div class="vph-icon">🎬</div>
      <div class="vph-step">Directing AI scene & camera motion…</div>
      <div class="vph-timecode">00:00:00 / 00:00:0${dur}</div>
    </div>
    <div class="vph-bottom-bar">
      <div class="vph-progress"><span></span></div>
      <div class="vph-stats">
        <span class="vph-status">Keyframing cinematic sequence…</span>
        <span class="vph-eta">ETA: ~${Math.max(4, dur + 2)}s</span>
      </div>
    </div>
  `;
  host.appendChild(root);

  const stepEl = $('.vph-step', root);
  const timecodeEl = $('.vph-timecode', root);
  const progressBar = $('.vph-progress span', root);
  const statusEl = $('.vph-status', root);
  const t0 = performance.now();
  const estTotalSec = Math.max(4, dur + 3);

  const tick = () => {
    const elapsed = (performance.now() - t0) / 1000;
    const progress = Math.min(0.96, elapsed / estTotalSec);
    progressBar.style.transform = `scaleX(${progress})`;
    const currSec = Math.min(dur, Math.floor((elapsed / estTotalSec) * dur));
    const pad = (n) => String(n).padStart(2, '0');
    timecodeEl.textContent = `00:00:${pad(currSec)} / 00:00:${pad(dur)}`;
  };
  const iv = setInterval(tick, 150);
  tick();

  return {
    root,
    step(txt){
      if (stepEl) {
        stepEl.textContent = txt;
        stepEl.classList.remove('swap');
        void stepEl.offsetWidth;
        stepEl.classList.add('swap');
      }
      if (statusEl) statusEl.textContent = txt;
    },
    async reveal(videoObj){
      clearInterval(iv);
      progressBar.style.transform = 'scaleX(1)';
      timecodeEl.textContent = `00:00:0${dur} / 00:00:0${dur}`;
      await new Promise(r => setTimeout(r, S.reduceMotion ? 0 : 400));
      const card = videoEl(videoObj);
      root.replaceWith(card);
      return card;
    },
    remove(){
      clearInterval(iv);
      root.remove();
    }
  };
}

async function toolVideo(text, ctx){
  const {work, signal, ph, um} = ctx;
  const step = (txt) => { work.log(txt); if (ph) ph.step(t(txt)); };

  step('Analyzing video request & scene mechanics…');

  // Parse duration (clamped strictly between 2 and 8 seconds max)
  const durMatch = (text || '').match(/\b([1-8])\s*(?:s|sec|secs|seconds?|שניות)\b/i);
  let duration = durMatch ? Math.min(8, Math.max(2, parseInt(durMatch[1], 10))) : 4;

  // Parse aspect ratio
  let ratio = '16:9';
  if (/\b9:16\b|portrait|vertical|reels|tiktok|shorts|סטורי|טיקטוק/i.test(text)) ratio = '9:16';
  else if (/\b1:1\b|square|ריבוע|אינסטגרם/i.test(text)) ratio = '1:1';
  else if (/\b4:3\b/i.test(text)) ratio = '4:3';

  // Check for attached source image (Image-to-Video)
  const srcImg = (um?.attachments || []).find(a => a.kind === 'image')?.dataUrl || (um?.attachments || []).find(a => a.kind === 'image')?.url;

  let scenePrompt = (text || '').replace(RX.video, '').replace(/\b([1-8])\s*(?:s|sec|secs|seconds?|שניות)\b/gi, '').replace(/\b(16:9|9:16|1:1|4:3)\b/gi, '').trim();
  if (!scenePrompt || scenePrompt.length < 4) {
    scenePrompt = srcImg ? 'Cinematic camera pan and atmospheric lighting across the subject' : 'Cinematic drone shot flying through a futuristic cyberpunk city at twilight with glowing neon reflections and rain';
  }

  step('Directing cinematic scene & camera motion with ReWind 1.0…');
  let expandedPrompt = scenePrompt, caption = '', videoTitle = 'AI Cinematic Sequence';
  try {
    const j = await LZ.chatJSON([
      {
        role: 'system',
        content: 'You are an award-winning cinematic AI video director operating Lokizen ReWind 1.0. Output JSON {"title":"<3-5 word epic title>","prompt":"<vivid visual description in English for AI video keyframing: subject, camera movement like slow tracking shot/dolly/pan, atmospheric lighting, volumetric smoke, photorealistic, 8k>","caption":"<friendly 1-2 sentence explanation in the user\'s language noting the ratio, duration, and ReWind 1.0 model>"}'
      },
      {
        role: 'user',
        content: `Scene: "${scenePrompt}"\nAspect ratio: ${ratio}\nDuration: ${duration} seconds (max 8s)\nHas Source Image: ${!!srcImg}`
      }
    ], { tier: 'stark', turnId: ctx.turnId || '', signal, maxTokens: 450 });

    if (j?.prompt) expandedPrompt = j.prompt;
    if (j?.caption) caption = j.caption;
    if (j?.title) videoTitle = j.title;
  } catch (e) {
    if (e.name === 'AbortError' || e.code === 'STARK_LIMIT_REACHED' || e.code === 'LIMIT_REACHED') throw e;
  }

  step(`Rendering ${duration}s clip (${ratio} · 30 FPS Master)…`);
  const vidRes = await LZ.generateVideo(expandedPrompt, {
    duration,
    ratio,
    sourceImageUrl: srcImg,
    turnId: ctx.turnId || '',
    signal,
    onStatus: x => step(x)
  });

  const provLabel = vidRes.provider || 'Lokizen ReWind 2.0';
  const defaultCaption = isHeb(text)
    ? `🎬 הסרטון נוצר בהצלחה באמצעות **${provLabel}**! אורך **${duration} שניות** וביחס **${ratio}**. מוכן לצפייה ולהורדה מיידית ✨`
    : `🎬 Generated with **${provLabel}**! AI video clip (${duration}s, ${ratio} aspect ratio). Ready to watch or download right in chat ✨`;

  return {
    content: caption || defaultCaption,
    video: {
      dataUrl: vidRes.dataUrl,
      keyframeUrl: vidRes.keyframeUrl,
      mimeType: vidRes.mimeType || 'video/mp4',
      provider: provLabel,
      model: vidRes.model || 'rewind-2.0',
      isNeuralVideo: !!vidRes.isNeuralVideo,
      duration,
      ratio,
      title: videoTitle,
      prompt: expandedPrompt,
      isAnimatedPoster: vidRes.isAnimatedPoster
    }
  };
}

/* interactive widgets — self-contained HTML rendered in a sandboxed frame */
const MAX_WIDGET_HTML = 180000;
const WIDGET_HEIGHT_MIN = 280;
const WIDGET_HEIGHT_MAX = 760;
function looksLikeInteractiveHtml(html){
  const s = String(html || '');
  if (/<!doctype|<html[\s>]/i.test(s) && /<script[\s>]/i.test(s)) return true;
  if (/<(canvas|input|button|select|textarea)[\s>]/i.test(s) && /<script[\s>]/i.test(s)) return true;
  if (/\bon(?:click|input|change|submit)\s*=/i.test(s) && /<(button|input|form|canvas)[\s>]/i.test(s)) return true;
  return false;
}
function extractWidgetTitle(html){
  const m = String(html || '').match(/<title[^>]*>([^<]+)<\/title>/i);
  return (m && m[1].trim()) || '';
}
function ensureHtmlDocument(html, title){
  const s = String(html || '').trim();
  if (/<!doctype html>|<html[\s>]/i.test(s)) return s;
  const t = String(title || 'Interactive app').replace(/[<>&]/g, '');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + t + '</title><style>html,body{margin:0;background:#030806;color:#eafff5;font-family:Inter,system-ui,sans-serif}</style></head><body>' + s + '</body></html>';
}
function maskInteractiveSource(text){
  return String(text || '')
    .replace(/```(?:loki-html|html-widget|html)[^\n]*\n[\s\S]*?(?:```|$)/gi, '\n\n✦ Building interactive UI…\n\n')
    .replace(/```(?:loki-[\w-]+|compare|comparison|tabs|calc|calculator|progress|bars|tree|mindmap|verdict|scorecard|rating|chart|timeline|metrics|proscons|steps|checklist|cards|flashcards|kanban|quiz|table|datatable|swot|decision|accordion|faq)[^\n]*\n[\s\S]*?(?:```|$)/gi, '\n\n✦ Building interactive UI…\n\n');
}
function renderLiveStreamingBubble(sb, rawFull){
  if (!sb) return;
  const cleaned = String(rawFull || '').replace(/\[WEB_IMAGE:[^\]]*\]?/gi, '');
  if (!window.LZLiveUI || !LZLiveUI.splitMarkdownWithLiveUi){
    sb.innerHTML = mdToHtml(maskInteractiveSource(cleaned));
    enhance(sb, null, true);
    return;
  }
  const segs = LZLiveUI.splitMarkdownWithLiveUi(cleaned);
  const hasUi = segs.some(s => s.kind === 'ui');
  if (!hasUi){
    sb.innerHTML = mdToHtml(maskInteractiveSource(cleaned));
    enhance(sb, null, true);
    return;
  }

  // Render prose + live progressively-assembled UI widgets (ZERO raw JSON/HTML code ever shown!)
  const frag = document.createDocumentFragment();
  segs.forEach((seg, idx) => {
    if (seg.kind === 'text'){
      const tStr = String(seg.text || '').trim();
      if (!tStr) return;
      const part = el('div', 'lz-stream-prose');
      part.innerHTML = mdToHtml(tStr);
      enhance(part, null, true);
      frag.appendChild(part);
      return;
    }

    const stage = el('div', 'lz-live-ui-stage' + (seg.isStreaming ? ' is-building' : ' is-ready'));
    stage.dataset.uiKey = String(idx) + ':' + seg.uiType;
    if (seg.isStreaming){
      const hdr = el('div', 'lz-lui-header', `<span class="lz-lui-pulse" aria-hidden="true"></span><span class="lz-lui-badge">${esc(seg.icon || '✨')} Building ${esc(seg.label || 'Interactive UI')} live…</span><span class="lz-lui-live-tag">LIVE</span>`);
      stage.appendChild(hdr);
    }

    if (seg.uiType === 'loki-html'){
      const htmlSrc = String(seg.rawCode || '');
      const title = extractWidgetTitle(htmlSrc) || 'Custom Interactive UI';
      if (!seg.isStreaming && htmlSrc.length > 40){
        try {
          stage.appendChild(widgetEl({ title, html: ensureHtmlDocument(htmlSrc, title) }));
        } catch(_){
          stage.appendChild(LZLiveUI.buildSkeletonStage(seg.icon || '✨', seg.label || 'Interactive UI', title));
        }
      } else {
        // Show an animated live UI wireframe assembly progress card while HTML streams (never raw code!)
        const kb = Math.max(1, Math.round(htmlSrc.length / 100) / 10);
        const pct = Math.min(94, 18 + Math.round(Math.log10(htmlSrc.length + 10) * 24));
        const liveCard = el('div', 'lz-live-html-assembly');
        liveCard.innerHTML = `
          <div class="lz-lha-top">
            <span class="lz-lha-title">${esc(title)}</span>
            <span class="lz-lha-meta">${kb}k · assembling layout &amp; interactions</span>
          </div>
          <div class="lz-lha-bar"><i style="width:${pct}%"></i></div>
          <div class="lz-lha-preview-wire">
            <div class="lz-lha-w-nav"><span></span><span></span><span></span></div>
            <div class="lz-lha-w-hero"></div>
            <div class="lz-lha-w-cols"><div></div><div></div><div></div></div>
          </div>
        `;
        stage.appendChild(liveCard);
      }
    } else if (seg.uiType === 'svg'){
      const raw = String(seg.rawCode || '').trim();
      const safe = (!seg.isStreaming && window.DOMPurify) ? DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true, svgFilters: true } }) : '';
      if (safe){
        const box = el('div', 'stark-block svg-block');
        box.innerHTML = `<div class="sb-head"><span class="sb-badge">✏️ Drawing</span><b>SVG</b></div><div class="svg-host">${safe}</div>`;
        stage.appendChild(box);
      } else {
        stage.appendChild(LZLiveUI.buildSkeletonStage('✏️', 'Vector Graphic'));
      }
    } else {
      let rendered = null;
      if (seg.parsedData && typeof seg.parsedData === 'object'){
        try {
          rendered = renderInteractiveBlock(seg.uiType, JSON.stringify(seg.parsedData));
        } catch(_){ rendered = null; }
      }
      if (rendered){
        rendered.classList.add('lz-live-assembled-widget');
        stage.appendChild(rendered);
      } else {
        const titleHint = seg.parsedData && typeof seg.parsedData === 'object' && seg.parsedData.title ? String(seg.parsedData.title) : '';
        stage.appendChild(LZLiveUI.buildSkeletonStage(seg.icon || '✨', seg.label || 'Interactive UI', titleHint));
      }
    }
    frag.appendChild(stage);
  });

  sb.innerHTML = '';
  sb.appendChild(frag);
}
function clampWidgetHeight(h){ return Math.max(WIDGET_HEIGHT_MIN, Math.min(WIDGET_HEIGHT_MAX, Math.round(Number(h) || 0))); }
function withWidgetAutoHeight(html){
  const hook = '<script>(function(){function r(){var h=Math.max(document.documentElement.scrollHeight,document.body&&document.body.scrollHeight||0);parent.postMessage({type:"lz-widget-height",height:h},"*");}addEventListener("load",r);addEventListener("resize",r);try{new ResizeObserver(r).observe(document.documentElement);}catch(e){}setTimeout(r,40);setTimeout(r,280);})();</script>';
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, hook + '</body>');
  return html + hook;
}
async function verifyWidgetHtmlClient(html, signal){
  try {
    const r = await fetch('/api/lokicode/verify', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({lang:'html', code: html}), signal});
    if (!r.ok) return {ok:true, skipped:true, errors:[], html};
    const j = await r.json();
    const errors = (j.errors || []).filter(e => !/repeated line/i.test(String(e)));
    return {ok: errors.length === 0, errors, method: j.method, ms: j.ms, html};
  } catch(_){
    return {ok:true, skipped:true, errors:[], html};
  }
}
async function repairWidgetOnce(html, errors, ctx){
  const {signal, work} = ctx;
  const sys = 'You repair a self-contained interactive HTML widget. Return ONLY the complete HTML document in a ```html fence. Keep the same feature set, inline CSS/JS only, no external scripts except Google Fonts. Fix the syntax errors listed.';
  const user = 'Errors:\n' + (errors || []).slice(0, 8).map(e => '- ' + e).join('\n') + '\n\nHTML:\n```html\n' + String(html || '').slice(0, MAX_WIDGET_HTML) + '\n```';
  const out = await LZ.chat([{role:'system', content: sys}, {role:'user', content: user}], {tier: ctx.tier, turnId: ctx.turnId || '', level: 0, signal, maxTokens: 7000, timeout: 45000, minWriteMs: 0, onStatus: x => work && work.log(x)});
  let next = (out.match(/```(?:html|loki-html)?\s*\n([\s\S]*?)(```|$)/i) || [])[1] || out;
  const i = next.search(/<!doctype|<html/i); if (i > 0) next = next.slice(i);
  return next.trim();
}
async function toolWidget(msgs, text, ctx){
  const {work, signal} = ctx;
  work.log('Designing a custom interactive app from scratch');
  const ul = /[\u0590-\u05FF]/.test(text) ? 'Hebrew' : /[\u0600-\u06FF]/.test(text) ? 'Arabic' : /[a-z]{3}/i.test(text) ? 'English' : (LANG_NAME[S.lang] || 'English');
  const sys = `You build a brand-new interactive mini-app from scratch, tailored to this exact request (calculator, quiz, game, simulator, planner, or any other tool). Do not reuse a generic template — invent unique layout, copy, logic and interactions for what the user asked. Respond EXACTLY in this format:
TITLE: <short title in ${ul}>
\`\`\`html
<!DOCTYPE html> … complete document …
\`\`\`
SUMMARY: <one or two short sentences in ${ul}: what it does and how to use it>
Rules for the HTML: ONE file, inline <style> and <script>, no external requests except Google Fonts, no localStorage (the app runs in a sandbox). Theme: black/very dark green background (#030806 / #06100b), neon green accent (${S.accent}), soft glows, rounded 14px cards, Inter font, smooth transform/opacity animations, responsive, works at 360-900px wide and 280-760px tall, keyboard friendly. Must be fully working, bug-free, with clear labels in ${ul}${ul === 'English' ? '' : ' (dir="rtl")'}. Use <canvas> for games/simulations with requestAnimationFrame.`;
  let pend = false, chars = 0;
  const out = await LZ.chat([...msgs.slice(0, -1), {role:'system', content: sys}, msgs[msgs.length - 1]], {tier: ctx.tier, turnId: ctx.turnId || '', level: Math.min(ctx.level, 1), signal, maxTokens: 7000, timeout: 90000, minWriteMs: 0, onStatus: x => work.log(x),
    onToken: (d, full) => { chars = full.length; if (!pend){ pend = true; setTimeout(() => { pend = false; work.now && work.now(t('Writing code') + ' · ' + Math.round(chars / 100) / 10 + 'k'); }, 400); } }});
  const title = ((out.match(/TITLE:\s*([^\n]+)/i) || [])[1] || 'Interactive app').replace(/[*`#]/g, '').trim();
  let html = (out.match(/```(?:html|loki-html)?\s*\n([\s\S]*?)(```|$)/i) || [])[1] || '';
  const i = html.search(/<!doctype|<html/i); if (i > 0) html = html.slice(i);
  const summary = ((out.match(/SUMMARY:\s*([\s\S]+)$/i) || [])[1] || '').trim();
  if (!/<(html|body|div|canvas|script)/i.test(html)) return {content: out};
  html = ensureHtmlDocument(html, title);
  work.log('Checking the widget code');
  let verified = false;
  let v = await verifyWidgetHtmlClient(html, signal);
  if (v.ok){ verified = !v.skipped; }
  else {
    work.log('Fixing a syntax error in the widget');
    try {
      html = ensureHtmlDocument(await repairWidgetOnce(html, v.errors, ctx), title);
      v = await verifyWidgetHtmlClient(html, signal);
      verified = v.ok && !v.skipped;
      if (!v.ok) work.log('Widget still has a syntax issue — showing it anyway');
    } catch (e){
      if (e && e.name === 'AbortError') throw e;
      work.log('Could not auto-fix the widget; showing the first version');
    }
  }
  work.log('Rendering the custom interactive UI');
  return {content: summary, widget: {title, html}, widgetVerified: verified};
}
function widgetEl(w){
  const box = el('div', 'widget-card');
  const html = ensureHtmlDocument(String((w && w.html) || ''), (w && w.title) || 'Interactive app');
  if (html.length > MAX_WIDGET_HTML) toast('This interactive app is very large and may run slowly.');
  box.innerHTML = `<div class="wg-head"><span class="wg-ic">✦</span><b dir="auto"></b><span class="wg-tag">Interactive</span><span class="wg-acts"><button data-a="copy" title="Copy code">⧉</button><button data-a="full" title="Fullscreen">⤢</button><button data-a="tab" title="Open in new tab">↗</button><button data-a="dl" title="Download">⤓</button></span></div><iframe sandbox="allow-scripts allow-modals" loading="lazy" title="Interactive widget"></iframe>`;
  $('b', box).textContent = (w && w.title) || 'Interactive app';
  const fr = $('iframe', box);
  fr.style.height = WIDGET_HEIGHT_MIN + 'px';
  const onMsg = ev => {
    if (ev.source !== fr.contentWindow) return;
    const d = ev.data;
    if (!d || d.type !== 'lz-widget-height') return;
    if (box.classList.contains('full')) return;
    fr.style.height = clampWidgetHeight(d.height) + 'px';
  };
  addEventListener('message', onMsg);
  fr.srcdoc = withWidgetAutoHeight(html);
  const exitFull = () => { box.classList.remove('full'); document.removeEventListener('keydown', esc2); };
  const esc2 = e => { if (e.key === 'Escape' && !dangerOpen) exitFull(); };
  box.querySelector('.wg-acts').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'copy') copyText(html);
    if (b.dataset.a === 'full'){ if (box.classList.toggle('full')) document.addEventListener('keydown', esc2); else exitFull(); }
    if (b.dataset.a === 'tab'){ const u = URL.createObjectURL(new Blob([html], {type:'text/html'})); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 60000); }
    if (b.dataset.a === 'dl') download(html, ((w && w.title) || 'widget').replace(/[\\/:*?"<>|]+/g, '').slice(0, 50) + '.html', 'text/html');
  };
  return box;
}
const PPTX_URL = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
async function toolSlides(text, ctx){
  const {work, signal, level} = ctx;
  const count = [7, 8, 10, 12][level] || 8;
  work.log('Planning a custom design for this deck');
  await LZ.loadScript('/deck-designer.js');
  const j = await LZ.chatJSON([{role:'system', content: LZDeck.PLAN_PROMPT(count)}, {role:'user', content: text}], {tier:'stark', turnId: ctx.turnId || '', level: Math.min(level, 1), signal, maxTokens: 4000, onStatus: t => work.log(t)});
  if (!j || !Array.isArray(j.slides)) throw Object.assign(new Error('Could not design the slides, please try again.'), {userFacing:true});
  work.log(`Designing ${j.slides.length + 2} slides`);
  work.log('Loading presentation engine');
  await LZ.loadScript(PPTX_URL);
  work.log('Building the deck');
  const pptx = LZDeck.buildDeck(PptxGenJS, j);
  work.log('Packaging .pptx file');
  const blob = await pptx.write({outputType:'blob'});
  const dataUrl = await LZ.blobToDataURL(blob);
  const name = (j.title || 'presentation').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) + '.pptx';
  const outline = j.slides.map((x, i) => `${i + 2}. ${x.title || x.kicker || ''}`).join('\n');
  return {content: (j.summary || '') + '\n\n**' + (j.title || '') + '**\n\n' + outline, files: [{name, mime:'application/vnd.openxmlformats-officedocument.presentationml.presentation', dataUrl, size: blob.size, desc: (j.slides.length + 2) + ' slides · PowerPoint'}]};
}
async function toolModel3d(text, ctx){
  const {work, signal} = ctx;
  work.log('Designing the 3D model (Blender script)');
  const tok = localStorage.getItem('lz.authToken');
  const headers = {'Content-Type': 'application/json'};
  if (tok) headers['x-lz-token'] = tok;
  const t1 = setTimeout(() => work.log('Building geometry and checking parts connect'), 15000);
  const t2 = setTimeout(() => work.log('Rendering the preview in Blender'), 40000);
  let r, j;
  try {
    r = await fetch('/api/model3d/generate', {method:'POST', headers, body: JSON.stringify({prompt: text, turnId: ctx.turnId || ''}), signal});
    j = await r.json().catch(() => ({}));
  } finally { clearTimeout(t1); clearTimeout(t2); }
  if (!r.ok || !j.ok){
    if (j && /GUEST_|LIMIT/.test(String(j.code || j.error || ''))) throw LZ.limitReachedErr ? LZ.limitReachedErr(j) : Object.assign(new Error(j.message || 'Sign up to create 3D models.'), {userFacing:true});
    throw Object.assign(new Error((j && (j.message || j.error)) || 'Could not build the 3D model, please try again.'), {userFacing:true});
  }
  work.log('Packaging .blend, .fbx and .glb files');
  const st = j.stats || {};
  const he = isHeb(text);
  const dims = Array.isArray(st.dims) ? st.dims.map(v => (+v).toFixed(2)).join(' × ') + ' m' : '';
  const content = (he ? `הנה המודל התלת־ממדי: **${j.title}**. מצורפים קבצי Blender ‏(.blend), ‏FBX ו־GLB, ותמונת תצוגה מקדימה.` : `Here is your 3D model: **${j.title}**. Attached are the Blender (.blend), FBX and GLB files, plus a rendered preview.`) + (dims ? `\n\n${he ? 'מידות' : 'Size'}: ${dims} · ${st.objects || '?'} ${he ? 'חלקים' : 'parts'} · ${(st.triangles || 0).toLocaleString()} ${he ? 'משולשים' : 'triangles'}` : '');
  return {content, images: j.preview ? [{dataUrl: j.preview, prompt: j.title}] : [], files: (j.files || []).map(f => ({name: f.name, mime: f.mime, dataUrl: f.dataUrl, size: f.size, desc: f.desc || ''}))};
}
const MIME = {csv:'text/csv', json:'application/json', md:'text/markdown', html:'text/html', txt:'text/plain', js:'text/javascript', py:'text/x-python', xml:'application/xml', svg:'image/svg+xml', css:'text/css'};
async function toolFile(msgs, text, ctx){
  const {work} = ctx;
  work.log('Planning the file');
  const sys = 'The app will turn your reply into a downloadable file. Respond EXACTLY in this format and nothing else:\nFILENAME: <name.ext>\n```<lang>\n<complete file content>\n```\nDESCRIPTION: <one short sentence in the user\'s language>';
  const out = await LZ.chat([...msgs.slice(0, -1), {role:'system', content: sys}, msgs[msgs.length - 1]], {tier:'stark', turnId: ctx.turnId || '', level: ctx.level, signal: ctx.signal, maxTokens: 6000, onStatus: t => work.log(t)});
  work.log('Writing file contents');
  const fn = (out.match(/FILENAME:\s*([^\n]+)/i) || [])[1];
  const body = (out.match(/```[\w+-]*\n([\s\S]*?)```/) || [])[1];
  const desc = (out.match(/DESCRIPTION:\s*([^\n]+)/i) || [])[1] || '';
  if (!body) return {content: out};
  const name = (fn || 'file.txt').trim().replace(/[`*"]/g, '').replace(/[\\/:?<>|]+/g, '-');
  const ext = (name.split('.').pop() || 'txt').toLowerCase();
  work.log('Packaging ' + name);
  const preview = body.split('\n').slice(0, 14).join('\n');
  return {content: desc + '\n\n```' + (EXT[ext] ? ext : '') + '\n' + preview + (body.split('\n').length > 14 ? '\n…' : '') + '\n```', files: [{name, mime: MIME[ext] || 'text/plain', text: body, size: new Blob([body]).size}]};
}

/* ================= SLASH COMMANDS (/) FOR LAB TOOLS ================= */
const SLASH_ALIASES = {
  'mini mind': 'mindmap',
  'minimind': 'mindmap',
  'mind map': 'mindmap',
  'mindmap': 'mindmap',
  'deep research': 'research',
  'research': 'research',
  'voice mode': 'voice',
  'voice': 'voice',
  'prompt enhancer': 'enhance',
  'enhance': 'enhance',
  'site builder': 'site',
  'site': 'site',
  'chart studio': 'chart',
  'chart': 'chart',
  'math solver': 'math',
  'math': 'math',
  'formula calculator': 'formula',
  'formula': 'formula',
  'formulas': 'formula',
  'translator': 'translate',
  'translate': 'translate',
  'document qa': 'docqa',
  'document q&a': 'docqa',
  'docqa': 'docqa',
  'url summarizer': 'url',
  'url': 'url',
  'regex tester': 'regexlab',
  'regex': 'regexlab',
  'image tools': 'imgtools',
  'converter': 'converter',
  'qr code': 'qrlab',
  'qr code maker': 'qrlab',
  'timers': 'timerlab',
  'timer': 'timerlab'
};

function getSlashCatalog(){
  const items = [];
  const seen = new Set();
  if (window.LZCapabilities && Array.isArray(window.LZCapabilities.CAPABILITIES)) {
    window.LZCapabilities.CAPABILITIES.forEach(c => {
      seen.add(c.id);
      items.push({
        id: c.id,
        cmd: c.cmd,
        altCmd: '/' + c.id,
        icon: c.icon,
        name: c.name,
        desc: c.desc,
        both: true,
        isCapability: true,
      });
    });
  }
  seen.add('quiz');
  items.push({
    id: 'quiz',
    cmd: '/test ',
    altCmd: '/quiz ',
    icon: '📝',
    name: 'Interactive Test & Quiz (5–20 Qs)',
    desc: 'Generate a 5–20 question test with multiple-choice & open written questions + end-of-test score',
    both: true,
    isCapability: true,
  });
  // Ensure "/mini mind" and "/deep research" are prominent alongside all Labs features
  LABS.forEach(l => {
    if (seen.has(l.id)) return;
    seen.add(l.id);
    const cmdName = l.id === 'mindmap' ? 'mini mind' : l.name.toLowerCase();
    items.push({
      id: l.id,
      cmd: '/' + cmdName,
      altCmd: '/' + l.name.toLowerCase(),
      icon: l.icon || '✦',
      name: l.id === 'mindmap' ? 'Mini Mind (Mind Map)' : l.name,
      desc: l.desc || '',
      both: !!l.both
    });
  });
  return items;
}

let slashIdx = 0;
function updateSlashMenu(){
  if (window.LZPlugins && typeof window.LZPlugins.onComposerUpdate === 'function' && window.LZPlugins.onComposerUpdate()) return;
  const menu = $('#slashMenu');
  const ta = $('#prompt');
  if (!menu || !ta) return;
  const val = ta.value;
  if (!val.startsWith('/')){
    menu.hidden = true;
    return;
  }
  const query = val.slice(1).trim().toLowerCase();
  const catalog = getSlashCatalog();
  const matches = catalog.filter(item =>
    !query ||
    item.cmd.slice(1).includes(query) ||
    item.altCmd.slice(1).includes(query) ||
    item.name.toLowerCase().includes(query) ||
    item.id.toLowerCase().includes(query) ||
    item.desc.toLowerCase().includes(query)
  );
  if (!matches.length){
    menu.hidden = true;
    return;
  }
  if (slashIdx >= matches.length) slashIdx = 0;
  menu.innerHTML = `<div class="slash-head"><span>✦ Slash Commands — Lab Tools</span><small>Click or press Tab/Enter</small></div>` +
    `<div class="slash-list">` +
    matches.map((item, i) => `
      <button type="button" class="slash-opt${i === slashIdx ? ' active' : ''}" data-cmd="${esc(item.cmd)}" data-id="${esc(item.id)}">
        <span class="slash-ic">${item.icon}</span>
        <span class="slash-info">
          <b><code class="slash-cmd">${esc(item.cmd)}</code> · ${esc(t(item.name))}</b>
          <small>${esc(t(item.desc))}</small>
        </span>
        <span class="slash-tag">${item.both ? 'Fera + Stark' : 'Stark'}</span>
      </button>
    `).join('') +
    `</div>`;
  menu.hidden = false;

  $$('.slash-opt', menu).forEach(btn => {
    btn.onclick = () => {
      ta.value = btn.dataset.cmd;
      menu.hidden = true;
      autosize();
      updateSend();
      ta.focus();
    };
  });
}

function resolveSlashCommand(text){
  if (!text || !text.startsWith('/')) return null;
  const raw = text.slice(1).trim();
  const lower = raw.toLowerCase();
  const catalog = getSlashCatalog();

  // Check exact or prefix match against aliases first
  const aliasKeys = Object.keys(SLASH_ALIASES).sort((a, b) => b.length - a.length);
  for (const key of aliasKeys){
    if (lower === key || lower.startsWith(key + ' ')){
      const id = SLASH_ALIASES[key];
      const arg = raw.slice(key.length).trim();
      return {id, arg};
    }
  }
  // Check catalog items
  for (const item of catalog){
    const c1 = item.cmd.slice(1);
    const c2 = item.altCmd.slice(1);
    if (lower === c1 || lower.startsWith(c1 + ' ')){
      return {id: item.id, arg: raw.slice(c1.length).trim()};
    }
    if (lower === c2 || lower.startsWith(c2 + ' ')){
      return {id: item.id, arg: raw.slice(c2.length).trim()};
    }
  }
  // Partial match if single word
  const partial = catalog.find(item => item.cmd.slice(1).startsWith(lower) || item.altCmd.slice(1).startsWith(lower) || item.id.startsWith(lower));
  if (partial) return {id: partial.id, arg: ''};
  return null;
}

/* ================= SEND / RUN ================= */
async function send(){
  if (state.busy){ stop(); return; }
  const ta = $('#prompt'); const text = ta.value.trim();
  if (!text && !state.attachments.length) return;

  // Handle "/" Slash Command to open floating Lab UI (skip our inline chat capabilities & /test /quiz so send() runs them in chat!)
  const inlineCapHit = window.LZCapabilities && typeof LZCapabilities.detectCommand === 'function'
    ? LZCapabilities.detectCommand(text)
    : null;
  const isInlineQuizCmd = /^\s*\/(test|quiz|exam)\b/i.test(text);
  if (text.startsWith('/') && !inlineCapHit && !isInlineQuizCmd){
    const match = resolveSlashCommand(text);
    const menu = $('#slashMenu');
    if (menu) menu.hidden = true;
    if (match && match.id !== 'quiz'){
      ta.value = '';
      autosize();
      updateSend();
      sound('send');
      openLab(match.id, match.arg);
      return;
    }
  }

  if (!state.current){ state.current = newConv(); state.convs.unshift(state.current); }
  const c = state.current;
  if (!c.messages.length) $('#messages').innerHTML = '';
  const um = {id: uid(), role:'user', content: text, attachments: state.attachments, ts: Date.now()};
  if (state.pendingMeta){ um.meta = state.pendingMeta; state.pendingMeta = null; }
  // Deep research only for the turn where the user explicitly activated it.
  if (state.deepSearch && state.mode === 'search') um.deep = true;
  state.deepSearch = false;
  c.messages.push(um);
  if (c.title === 'New chat') c.title = (text || um.attachments[0].name).replace(/\s+/g, ' ').slice(0, 48) || 'New chat';
  ta.value = ''; state.attachments = []; renderTray(); autosize();
  const mode = state.mode; setMode(null); $('#prompt').placeholder = 'Message Lokizenith… (type / for tools)';
  $('#messages').appendChild(renderMsg(um)); scrollDown(true);
  sound('send'); persist(c); renderHistory();
  await runAssistant(mode);
}
function stop(){ if (state.ctl) state.ctl.abort(); }
async function runAssistant(mode){
  const c = state.current; const conv = c;
  const um = [...c.messages].reverse().find(m => m.role === 'user'); if (!um) return;
  if (window.LZ && LZ.Usage && !LZ.Usage.canUse()){
    const lm = {id: uid(), role:'assistant', type:'limit-reached', content: "It's not possible because your limit has reached the maximum.", ts: Date.now()};
    c.messages.push(lm); $('#messages').appendChild(renderMsg(lm)); scrollDown(true); persist(c);
    if (window.Mascot) Mascot.set('oops'); sound('error'); return;
  }
  if (isStarkLockedForUser() && state.model === 'stark'){
    setModel('fera', true);
  }
  const tier = isStarkLockedForUser() ? 'fera' : state.model;
  const level = state.level;
  const turnId = uid();
  const hasImages = (um.attachments || []).some(a => a.kind === 'image');
  const hasVideo = (um.attachments || []).some(a => a.kind === 'video');
  const hasFiles = (um.attachments || []).some(a => a.kind === 'file');
  const isEdit = isPhotoEditRequest(um.content, hasImages);
  const tool = mode ? (FEATURE_BUILTIN.includes(mode) ? null : findTool('', mode)) : findTool(um.content || '', null, hasImages);
  const intent = tool ? 'tool' : (isEdit ? 'photo-edit' : (mode || detectIntent(um.content || '', hasImages, hasVideo)));

  const candyHit = !hasImages && !hasVideo && !hasFiles ? detectCandyPromptClient(um.content || '') : null;
  if (candyHit){
    const cm = {
      id: uid(),
      role: 'assistant',
      content: candyHit.reply,
      candyButton: true,
      candyLang: candyHit.lang,
      ts: Date.now(),
      tier: state.model
    };
    c.messages.push(cm);
    $('#messages').appendChild(renderMsg(cm));
    scrollDown(true);
    sound('done');
    persist(c);
    renderHistory();
    return;
  }

  const gameHit = !hasImages && !hasVideo && !hasFiles && window.LZGames && LZGames.detectPrompt
    ? LZGames.detectPrompt(um.content || '')
    : null;
  if (gameHit){
    const gm = {
      id: uid(),
      role: 'assistant',
      content: gameHit.reply,
      gamePicker: true,
      gameLang: gameHit.lang,
      ts: Date.now(),
      tier: state.model
    };
    c.messages.push(gm);
    $('#messages').appendChild(renderMsg(gm));
    scrollDown(true);
    sound('done');
    persist(c);
    renderHistory();
    if (gameHit.suggestedGameId && LZGames.openGame){
      setTimeout(() => LZGames.openGame(gameHit.suggestedGameId, { lang: gameHit.lang }), 240);
    }
    return;
  }

  const inlineCapHit = !hasImages && !hasVideo && !hasFiles && window.LZCapabilities && typeof LZCapabilities.detectCommand === 'function'
    ? LZCapabilities.detectCommand(um.content || '')
    : null;
  if (inlineCapHit && window.LZCapabilities && typeof LZCapabilities.runCapability === 'function'){
    const bmCap = { id: uid(), role: 'assistant', content: '', ts: Date.now(), tier: state.model, pending: true };
    c.messages.push(bmCap);
    const capRow = el('div', 'msg bot busy'); capRow.dataset.id = bmCap.id;
    capRow.innerHTML = `<div class="avatar">${LOGO_SVG}</div><div class="bubble-col"><div class="work-row"><span class="orb"></span><span class="work-status">${isHeb(um.content || '') ? 'מפעיל כלי AI אינטראקטיבי...' : 'Running interactive AI tool...'}</span></div></div>`;
    $('#messages').appendChild(capRow);
    scrollDown(true);
    state.busy = true;
    try {
      const capRes = await LZCapabilities.runCapability(inlineCapHit.id, inlineCapHit.arg, { conv: c, um });
      bmCap.pending = false;
      bmCap.content = (capRes && capRes.content) || '';
      if (capRes && capRes.capabilityCard) bmCap.capabilityCard = capRes.capabilityCard;
      const fresh = renderMsg(bmCap);
      capRow.replaceWith(fresh);
      sound('done');
    } catch (capErr) {
      bmCap.pending = false;
      bmCap.error = true;
      bmCap.content = '⚠️ ' + (capErr && capErr.message ? capErr.message : 'Could not run interactive tool.');
      const fresh = renderMsg(bmCap);
      capRow.replaceWith(fresh);
    } finally {
      state.busy = false;
      updateSend();
      persist(c);
      renderHistory();
      scrollDown(true);
    }
    return;
  }

  if (tool && tool.stark && tier === 'fera'){
    const m = {id: uid(), role:'assistant', type:'upgrade', feature: tool.id, ts: Date.now(), mode: tool.id};
    c.messages.push(m); $('#messages').appendChild(renderMsg(m)); scrollDown(true); persist(c); if (window.Mascot) Mascot.set('oops'); return;
  }
  // Fera trying a Stark feature → upgrade card (widgets work on both)
  if (tier === 'fera' && intent && intent !== 'widget' && intent !== 'tool'){
    const m = {id: uid(), role:'assistant', type:'upgrade', feature: (isEdit || intent === 'photo-edit') ? 'image' : intent, ts: Date.now(), mode: (isEdit || intent === 'photo-edit') ? 'image' : intent};
    c.messages.push(m); $('#messages').appendChild(renderMsg(m)); scrollDown(true); persist(c); return;
  }

  // Lock the composer and show a Working row BEFORE any network await.
  // Quota checks used to hang here with busy still false, so messages appeared
  // with no reply and the user could send more.
  const bm = {id: uid(), role:'assistant', content:'', ts: Date.now(), tier: state.model, pending: true};
  c.messages.push(bm);
  const row = el('div', 'msg bot busy'); row.dataset.id = bm.id;
  const col = el('div', 'bubble-col'); row.append(el('div', 'avatar', LOGO_SVG), col);
  $('#messages').appendChild(row); scrollDown(true);
  const work = Work(col, {onLog: () => scrollDown()});
  const turn = {convId: c.id, conv: c, bm, row, ctl: new AbortController()};
  state.turns.set(c.id, turn);
  state.busy = true; state.ctl = turn.ctl; updateSend(); renderHistory();
  const isFg = () => !!(state.current && state.current.id === conv.id);
  const endTurn = () => {
    if (state.turns.get(conv.id) === turn) state.turns.delete(conv.id);
    if (isFg()) syncBusy();
  };
  const abortPendingTurn = () => {
    const idx = c.messages.indexOf(bm);
    if (idx >= 0) c.messages.splice(idx, 1);
    try { row.remove(); } catch(_){}
    endTurn();
    if (isFg() && state._rerenderAfterBusy){ state._rerenderAfterBusy = false; renderMessages(); }
  };

  // Stark quota is enforced atomically by the server on /api/chat/stream (0 extra round-trips on chat!).
  // Only pre-check synchronously via cached state above (isStarkLockedForUser) or for non-chat creation tasks.
  const isFastChatTurn = (level === 0 || level === 4) && !(tool || isEdit || intent === 'video' || intent === 'image' || intent === 'slides' || intent === 'model3d' || intent === 'file' || intent === 'widget');
  if (tier === 'stark' && !isFastChatTurn){
    const curUser = window.LZAuth && LZAuth.getUser ? LZAuth.getUser() : null;
    const isExemptStark = !curUser || curUser.isUnlimited || curUser.starkAuthorized || getUserPlanTier() === 'ultimate';
    if (!isExemptStark && window.LZAuth && LZAuth.consumeFeatureQuota){
      const qRes = await LZAuth.consumeFeatureQuota('stark_msg', 1, turnId);
      if (qRes && qRes.allowed === false){
        const plan = getUserPlanTier();
        const lim = plan === 'pro' ? 85 : 10;
        setModel('fera', true);
        const isH = isHeb(um.content || '');
        const msgTxt = isH
          ? `🔒 הגעת למגבלת ההודעות של **Lokizen 4.0 Stark** בתוכנית שלך (**${lim}/${lim} הודעות** · מתאפס כל 6 שעות). הועברת אוטומטית למודל **Lokizenith 3.5 Fera**, ומודל Stark נעול כעת עד לאיפוס או לשדרוג התוכנית שלך.`
          : `🔒 You have reached your **Lokizen 4.0 Stark** message limit (**${lim}/${lim} messages** · resets every 6 hours). You have been switched to **Lokizenith 3.5 Fera** and **Lokizen 4.0 Stark** is locked until reset. Upgrade your plan for more Stark access!`;
        abortPendingTurn();
        const m = {
          id: uid(),
          role: 'assistant',
          content: msgTxt,
          upgradePlanCard: { buttonText: '💎 Upgrade Plan for More Stark' },
          ts: Date.now()
        };
        c.messages.push(m); $('#messages').appendChild(renderMsg(m)); scrollDown(true); persist(c);
        return;
      }
      renderModelMenu();
    }
  }

  // Enforce Daily Image Generation Limit (Free: 8 / 16h, Pro: 15 / 16h, Ultimate: Unlimited)
  if (intent === 'image' || isEdit){
    if (window.LZAuth && LZAuth.consumeFeatureQuota){
      const qRes = await LZAuth.consumeFeatureQuota('image_gen', 1, turnId);
      if (qRes && qRes.allowed === false){
        const plan = getUserPlanTier();
        const lim = plan === 'pro' ? 15 : 8;
        const isH = isHeb(um.content || '');
        const msgTxt = isH
          ? `הגעת למספר המקסימלי של תמונות יומיות בתוכנית שלך (**${lim}/${lim} תמונות** · מתאפס כל 16 שעות). כדי להמשיך ליצור תמונות נוספות כעת, שדרג את התוכנית שלך ל-**Loki Pro** (15 תמונות ביום) או ל-**Loki Ultimate** (ללא הגבלה ∞)!`
          : `You have reached the maximum number of daily images on your current plan (**${lim}/${lim} images** · Daily = 16 hours). Please upgrade your plan to **Loki Pro** (15 daily images) or **Loki Ultimate** (Unlimited ∞ images) to continue generating images!`;
        abortPendingTurn();
        const m = {
          id: uid(),
          role: 'assistant',
          content: msgTxt,
          upgradePlanCard: { buttonText: '💎 Upgrade Plan' },
          ts: Date.now()
        };
        c.messages.push(m); $('#messages').appendChild(renderMsg(m)); scrollDown(true); persist(c);
        if (window.Mascot) Mascot.set('oops'); sound('error');
        return;
      }
    }
  }
  let ph = null;
  const isCreationTask = !!(tool || isEdit || intent === 'video' || intent === 'image' || intent === 'slides' || intent === 'model3d' || intent === 'file' || intent === 'widget');
  // Always keep the Working indicator visible while the AI works on any answer or creation task
  work.root.hidden = false;
  if (intent === 'video'){
    const durMatch = (um.content || '').match(/\b([1-8])\s*(?:s|sec|secs|seconds?|שניות)\b/i);
    const dur = durMatch ? parseInt(durMatch[1], 10) : 4;
    let r = '16:9';
    if (/\b9:16\b|portrait|vertical|reels|tiktok|shorts|סטורי|טיקטוק/i.test(um.content || '')) r = '9:16';
    else if (/\b1:1\b|square|ריבוע|אינסטגרם/i.test(um.content || '')) r = '1:1';
    else if (/\b4:3\b/i.test(um.content || '')) r = '4:3';
    ph = VideoPlaceholder(col, dur, r);
    ph.step(t('Directing AI scene & camera motion…'));
    scrollDown(true);
  } else if (intent === 'image' || isEdit){
    ph = ImagePlaceholder(col, level >= 3 && !isEdit ? 2 : 1);
    ph.step(isEdit ? t('Analyzing photo…') : t('Composing scene…'));
    scrollDown(true);
  }
  // busy + AbortController already set before quota awaits
  // Real-time live streaming render for answers/questions (never streams raw prose for creation tasks)
  let sb = null, latest = '', pend = 0, lastPaint = 0, rafId = 0, turnFinished = false;
  const paint = () => {
    pend = 0; rafId = 0; lastPaint = performance.now();
    if (turnFinished || !row.isConnected || isCreationTask) return;
    if (!sb){ sb = el('div', 'bubble streaming'); col.appendChild(sb); work.root.classList.add('streaming'); }
    renderLiveStreamingBubble(sb, latest);
    if (S.autoScroll) scrollDown();
  };
  const onToken = isCreationTask ? undefined : (d, full) => {
    if (turnFinished) return;
    if (!latest && full && isFg()) sound('start');
    latest = full;
    if (pend || rafId) return;
    const gap = level === 4 ? 16 : (latest.length > 8000 ? 60 : 22);
    pend = setTimeout(() => { pend = 0; if (turnFinished) return; if (document.hidden) { paint(); return; } rafId = requestAnimationFrame(paint); }, Math.max(0, gap - (performance.now() - lastPaint)));
  };
  const signedIn = !!(window.LZAuth && LZAuth.getUser && LZAuth.getUser());
  const bg = signedIn ? {convId: c.id, msgId: bm.id, title: c.title, userMsg: {id: um.id, content: String(um.content || '').slice(0, 20000), ts: um.ts}} : undefined;
  const ctx = {tier, level, turnId, work, signal: turn.ctl.signal, onToken, ph, um, conv: c, scrollDown: (...a) => { if (isFg()) scrollDown(...a); }, deep: !!um.deep, bg};
  let result;
  let didSearch = false;
  try {
    work.log(
      isCreationTask
        ? (intent === 'image' || isEdit ? 'Preparing AI image generator…' : intent === 'video' ? 'Preparing AI video generator…' : 'Analyzing task & planning build…')
        : (['Thinking · Low (Turbo 10×)', 'Thinking · Medium', 'Thinking · High — careful reasoning', 'Thinking · Extra High — draft + self-review', 'Thinking · Ultra'][level] || 'Analyzing request & planning')
    );
    // Recall relevant facts from the AI Self-Learning Community Knowledge Base (skip pre-hop in Turbo/Ultra for 0ms startup)
    let learnedKnowledgeCtx = '';
    if (!(level === 0 || level === 4) && !isSmallTalk(um.content) && String(um.content || '').trim().length >= 8){
      try {
        const knCtl = new AbortController();
        const knTimer = setTimeout(() => knCtl.abort(), 220);
        const kr = await fetch('/api/knowledge/query', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          signal: knCtl.signal,
          body: JSON.stringify({ query: String(um.content || '').slice(0, 600), limit: 4 })
        });
        clearTimeout(knTimer);
        if (kr.ok){
          const kj = await kr.json();
          if (kj && kj.contextPrompt) learnedKnowledgeCtx = kj.contextPrompt;
        }
      } catch(_e){}
    }
    const {msgs} = apiHistory(c, state.model, learnedKnowledgeCtx);
    if (tool) result = await tool.run(um.content || '', ctx, msgs);
    else if (isEdit) {
      const srcImg = (um.attachments || []).find(a => a.kind === 'image')?.dataUrl || (um.attachments || []).find(a => a.kind === 'image')?.url;
      result = await toolEditPhoto(um.content, srcImg, ctx);
    }
    else if (intent === 'video') result = await toolVideo(um.content || '', ctx);
    else if (intent === 'image') result = await toolImage(um.content, ctx);
    else if (intent === 'slides') result = await toolSlides(um.content, ctx);
    else if (intent === 'model3d') result = await toolModel3d(um.content, ctx);
    else if (intent === 'file') result = await toolFile(msgs, um.content, ctx);
    else if (intent === 'widget') result = await toolWidget(msgs, um.content, ctx);
    else if (hasImages && /\b(photo\s*insights?|image\s*insights?|scene\s*summary|detect\s*objects|photo\s*metadata|deep\s*image\s*analysis)\b|תובנות\s*תמונה|נתח\s*תמונה\s*לעומק/i.test(um.content || '')){
      result = await toolAnalyzePhoto(msgs, um, ctx);
    } else {
      let sources = null, m2 = msgs;
      const implicitSearchHit = RX.liveFacts.test(um.content || '');
      if (hasImages || hasVideo) {
        const nImg = (um.attachments || []).filter(a => a.kind === 'image').length;
        work.log(hasVideo
          ? 'Analyzing video keyframes and audio…'
          : (nImg > 1 ? 'Reading all ' + nImg + ' photos in parallel…' : 'Reading attached image…'));
        const visionTaskSys = '\n\n[IMAGE & TASK EXECUTION DIRECTIVE: The user attached media. Read all text, numbers, code, diagrams, or visual details with 100% precision. If there are several photos, answer each one in its own section (Photo 1, Photo 2, …) and finish with a comparison and summary. If a video is attached, describe what happens on a timeline. If the media contains a task, question, homework problem, math equation, or coding challenge, solve it step-by-step in the user\'s language.]';
        m2 = [{role:'system', content: (msgs[0]?.content || '') + visionTaskSys}, ...msgs.slice(1)];
      } else if (ctx.deep || intent === 'search' || (!isSmallTalk(um.content) && implicitSearchHit)){
        didSearch = true;
        work.root.hidden = false;
        const explicitSearch = intent === 'search' || ctx.deep;
        ctx.explicitSearch = explicitSearch;
        const implicitBudgetMs = (level === 0 || level === 4) ? 1000 : 1400;
        sources = explicitSearch
          ? await webResearch(um.content, ctx)
          : await Promise.race([
              turboResearch(um.content, ctx, {readMs: (level === 0 || level === 4) ? 550 : 900}).catch(() => []),
              new Promise(r => setTimeout(() => r([]), implicitBudgetMs))
            ]);
        const liveGrounding = ctx.deepConclusion || ctx.groundedAnswer || '';
        if ((sources && sources.length) || liveGrounding){
          work.log(`Verified ${(sources && sources.length) || 0} live websites & writing grounded answer`);
          const groundingBrief = liveGrounding
            ? ('\n\nLIVE GOOGLE SEARCH GROUNDED BRIEF (Real-time facts verified across the live web right now — use these concrete facts, numbers, dates and names in your answer, formatted naturally in the user\'s language and citing [n] from the sources list):\n' + liveGrounding)
            : '';
          m2 = [{role:'system', content: msgs[0].content + '\n\n' + sourcesContext(sources || []) + groundingBrief}, ...msgs.slice(1)];
        }
      }
      if (hasFiles) work.log('Reading your file' + ((um.attachments || []).filter(x => x.kind === 'file').length > 1 ? 's' : '') + '…');
      let content;
      if (hasImages || hasVideo) {
        const vAtt = (um.attachments || []).find(a => a.kind === 'video');
        const lengthId = normalizeAnswerLength(state.answerLength);
        const visMax = (typeof ANSWER_LENGTH_TOKENS !== 'undefined' && ANSWER_LENGTH_TOKENS[lengthId]) || 2400;
        content = await LZ.vision(m2, {
          signal: ctx.signal,
          onToken,
          turnId: turnId || '',
          maxTokens: visMax,
          prompt: um.content || '',
          images: (um.attachments || []).filter(a => a.kind === 'image').map(a => ({name: a.name, dataUrl: a.dataUrl})),
          files: (um.attachments || []).filter(a => a.kind === 'file').map(a => ({name: a.name, text: a.text, pages: a.pages})),
          video: vAtt ? {name: vAtt.name, durationSec: vAtt.duration, transcript: vAtt.transcript, keyframes: vAtt.keyframes} : undefined
        });
      } else {
        content = await deliberate(m2, ctx);
      }


      // Extract optional [WEB_IMAGE: query] tags and fetch verified topic photos
      const webImageQueries = [];
      content = String(content || '').replace(/\[WEB_IMAGE:\s*([^\]]+?)\s*\]/gi, (_, q) => {
        const cleanQ = String(q || '').trim();
        if (cleanQ && webImageQueries.length < 2 && !webImageQueries.includes(cleanQ)) {
          webImageQueries.push(cleanQ);
        }
        return '';
      }).replace(/\n{3,}/g, '\n\n').trim();

      let webImages = [];
      if (webImageQueries.length && !state.onReply) {
        work.log(`Fetching portrait image for: ${webImageQueries.join(', ')}`);
        try {
          const imgCtl = new AbortController();
          const imgTimer = setTimeout(() => imgCtl.abort(), 1200);
          const onOuterAbort = () => imgCtl.abort();
          turn.ctl.signal.addEventListener('abort', onOuterAbort, { once: true });
          const batches = await Promise.all(webImageQueries.map(q =>
            fetch('/api/images/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: imgCtl.signal,
              body: JSON.stringify({ query: q, limit: 1 })
            }).then(r => r.ok ? r.json() : { images: [] }).catch(() => ({ images: [] }))
          ));
          clearTimeout(imgTimer);
          turn.ctl.signal.removeEventListener('abort', onOuterAbort);
          const seenUrls = new Set();
          for (const b of batches) {
            for (const im of (b.images || []).slice(0, 1)) {
              if (im && im.url && !seenUrls.has(im.url) && webImages.length < 2) {
                seenUrls.add(im.url);
                webImages.push(im);
              }
            }
          }
        } catch (_e) {}
      }

      if (!state.onReply) {
        content = autoComposeInteractiveBlocks(um.content || '', content);
      }
      const verifiedSrcs = sources && sources.length
        ? dedupeAndVerifyClientSources(sources).map(s => ({
            title: s.title,
            url: s.url,
            domain: s.domain,
            snippet: s.snippet,
            engine: s.engine,
            trustScore: s.trustScore,
            trustTier: s.trustTier,
            trustLabel: s.trustLabel,
            trustColor: s.trustColor,
            trustReason: s.trustReason,
            verified: s.verified
          }))
        : undefined;
      result = {
        content,
        webImages: webImages.length ? webImages : undefined,
        sourcesVerdict: ctx.sourcesVerdict || undefined,
        sources: verifiedSrcs
      };
    }
    work.log('Done');
  } catch(e){
    if (e.code === 'LIMIT_REACHED'){
      result = {type: 'limit-reached', content: e.message || "It's not possible because your limit has reached the maximum."};
    } else if (e.code === 'STARK_LIMIT_REACHED'){
      setModel('fera', true);
      result = {
        content: e.message || '🔒 You have reached your **Lokizen 4.0 Stark** message limit. Switched to **Lokizenith 3.5 Fera** — upgrade your plan to unlock more Stark access!',
        upgradePlanCard: { buttonText: '💎 Upgrade Plan for More Stark' }
      };
    } else if (e.code === 'IMAGE_LIMIT_REACHED'){
      result = {
        content: e.message || 'You have reached the maximum number of daily images on your current plan. Please upgrade to continue generating images!',
        upgradePlanCard: { buttonText: '💎 Upgrade Plan' }
      };
    } else if (latest && latest.trim().length > 0){
      result = {content: e.name === 'AbortError' ? (latest + '\n\n_' + t('(stopped)') + '_') : latest};
    } else {
      result = {error: e.name === 'AbortError' ? 'Stopped.' : (e.userFacing ? e.message : 'Something went wrong — please try again.')};
    }
    if (e.name !== 'AbortError') console.warn(e);
    sound('error');
  }
  turnFinished = true;
  window.__lzLastTurnFinishedAt = Date.now();
  clearTimeout(pend); pend = 0;
  if (rafId){ cancelAnimationFrame(rafId); rafId = 0; }
  // Never let an empty final result erase text that was already streamed live to the user
  if (!result || typeof result !== 'object') result = {};
  const hasRichPayload = !!(result.error || (result.images && result.images.length) || result.video || result.slides || result.file || result.widget || result.model3d || result.candyButton || result.upgradePlanCard);
  if ((!result.content || !String(result.content).trim()) && !hasRichPayload){
    if (latest && latest.trim()){
      result.content = latest.replace(/\[WEB_IMAGE:[^\]]*\]?/gi, '').trim();
    } else {
      result.error = 'No response received — please try again.';
    }
  }
  const {secs, log} = work.done();
  work.root.hidden = false;
  work.root.classList.remove('streaming');
  Object.assign(bm, result, {worked: secs, log});
  delete bm.pending;
  // Record completed AI message in session-level anti-disappear safety vault
  try {
    if (!window.__lzCompletedVault) window.__lzCompletedVault = new Map();
    const convVault = window.__lzCompletedVault.get(conv.id) || new Map();
    convVault.set(bm.id, bm);
    window.__lzCompletedVault.set(conv.id, convVault);
  } catch(_){}
  row.classList.remove('busy');
  const wasFg = isFg();
  const safeFillBot = (targetCol, msgObj) => {
    try {
      fillBot(targetCol, msgObj);
    } catch (fillErr) {
      console.warn('fillBot fallback:', fillErr);
      if (msgObj && msgObj.content) {
        const fb = el('div', 'bubble');
        fb.dir = 'auto';
        fb.innerHTML = mdToHtml(msgObj.content);
        targetCol.appendChild(fb);
      }
    }
  };
  // Ensure the completed message is anchored in EVERY live conversation reference BEFORE releasing busy lock
  const ensureMsgInConv = (target) => {
    if (!target || !Array.isArray(target.messages)) return;
    const idx = target.messages.findIndex(m => m && m.id === bm.id);
    if (idx >= 0) target.messages[idx] = bm;
    else {
      target.messages.push(bm);
      target.messages.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
    }
    target.updated = Math.max(Number(target.updated || 0), Date.now());
  };
  ensureMsgInConv(conv);
  const liveConv = convById(conv.id);
  if (liveConv && liveConv !== conv) ensureMsgInConv(liveConv);
  if (state.current && state.current.id === conv.id && state.current !== conv && state.current !== liveConv){
    ensureMsgInConv(state.current);
  }
  if (sb) sb.remove();
  // Belt and braces: never leave a streaming bubble or a duplicate row for this turn.
  col.querySelectorAll('.bubble.streaming').forEach(x => x.remove());
  document.querySelectorAll('#messages .msg.bot[data-id="' + bm.id + '"]').forEach(x => { if (x !== row) x.remove(); });
  if (ph){
    if (bm.video){
      const g = await ph.reveal(bm.video);
      const tmp = {...bm, video: null}; safeFillBot(col, tmp);
      const bubble = $('.bubble', col); if (bubble) col.insertBefore(bubble, g);
    } else if (bm.images && bm.images.length){
      const imgs = bm.images; const g = await ph.reveal(imgs);
      const tmp = {...bm, images: []}; safeFillBot(col, tmp);
      const bubble = $('.bubble', col); if (bubble) col.insertBefore(bubble, g);
    } else { ph.remove(); safeFillBot(col, bm); }
  } else safeFillBot(col, bm);
  // Guarantee the rendered message row is actually connected to #messages (never lost in a detached node)
  if (isFg() && !row.isConnected){
    const msgBox = $('#messages');
    if (msgBox){
      const existingRow = msgBox.querySelector('.msg.bot[data-id="' + bm.id + '"]');
      if (existingRow) existingRow.replaceWith(row);
      else msgBox.appendChild(row);
    }
  }
  window.__lzLastTurnFinishedAt = Date.now();
  endTurn();
  if (window.Mascot) Mascot.set(bm.error ? 'oops' : 'happy');
  if (!bm.error){
    if (wasFg && isFg()){ sound(intent === 'image' || isEdit ? 'image' : intent === 'model3d' ? 'image' : 'done'); if (S.autoSpeak || state.voiceActive) speak(bm.content); }
    else { sound('bgdone'); toast(t('Answer ready') + ' · ' + (conv.title || '')); }
    // AI Self-Learning Loop: distill non-personal factual insights from conversations into the shared knowledge base
    if (!bm.candyButton && bm.content && bm.content.length >= 60 && um.content && um.content.length >= 10){
      try {
        const kHeaders = {'Content-Type': 'application/json'};
        const kTok = localStorage.getItem('lz.authToken');
        if (kTok) kHeaders['x-lz-token'] = kTok;
        fetch('/api/knowledge/learn', {
          method: 'POST',
          headers: kHeaders,
          body: JSON.stringify({
            question: String(um.content || '').slice(0, 1200),
            answer: plain(String(bm.content || '')).slice(0, 3200)
          })
        }).catch(() => {});
      } catch(_e){}
    }
  }
  if (S.autoScroll && isFg()) scrollDown();
  const finalConv = (liveConv && liveConv !== conv) ? liveConv : conv;
  persist(finalConv); renderHistory();
  if (isFg() && state._rerenderAfterBusy){
    state._rerenderAfterBusy = false;
    // Re-confirm bm is inside state.current before any deferred re-render
    if (state.current && state.current.id === conv.id) ensureMsgInConv(state.current);
    renderMessages();
  }
  if (state.onReply) state.onReply(bm);
}
function regenerate(m){
  if (state.busy) return;
  const c = state.current; if (!c) return;
  while (c.messages.length && c.messages[c.messages.length - 1].role !== 'user') c.messages.pop();
  renderMessages(); runAssistant();
}
function switchAndRetry(){
  if (isStarkLockedForUser()){
    toast('🔒 Lokizen 4.0 Stark limit reached! Upgrade to Loki Pro or Ultimate to unlock Stark.', 'err');
    showView('benches');
    return;
  }
  const c = state.current; if (!c) return;
  const last = c.messages[c.messages.length - 1];
  const mode = last && last.type === 'upgrade' ? last.mode : null;
  if (last && last.type === 'upgrade') c.messages.pop();
  setModel('stark'); renderMessages(); runAssistant(mode);
}
function editMessage(m){
  if (state.busy) return;
  const row = $(`.msg[data-id="${m.id}"]`); if (!row) return;
  const col = $('.bubble-col', row); const box = el('div', 'edit-box', '<textarea dir="auto"></textarea><div class="row"><button class="btn-ghost">Cancel</button><button class="btn-primary">Save & send</button></div>');
  $('textarea', box).value = m.content; col.innerHTML = ''; col.appendChild(box); $('textarea', box).focus();
  const [cancel, save] = $$('button', box);
  cancel.onclick = () => renderMessages();
  save.onclick = () => {
    const c = state.current; const i = c.messages.indexOf(m);
    m.content = $('textarea', box).value.trim(); c.messages = c.messages.slice(0, i + 1);
    renderMessages(); runAssistant();
  };
}

/* ================= VOICE (Realistic Male Voice Engine) ================= */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function langOfText(text){
  const s = String(text || '');
  if (/[\u0590-\u05FF]/.test(s)) return 'he';
  if (/[\u0600-\u06FF]/.test(s)) return 'ar';
  if (/[\u0400-\u04FF]/.test(s)) return 'ru';
  if (/\b(hola|gracias|por favor|cómo|qué|buenos días)\b/i.test(s)) return 'es';
  if (/\b(bonjour|merci|comment|pourquoi|avec|très)\b/i.test(s)) return 'fr';
  if (/\b(hallo|danke|bitte|warum|wie geht)\b/i.test(s)) return 'de';
  return 'en';
}
const BCP = {he:'he-IL', ar:'ar-SA', ru:'ru-RU', es:'es-ES', fr:'fr-FR', de:'de-DE', en:'en-US'};
window.__lzActiveUtterances = [];
window.__lzActiveAudio = null;
window.__lzAudioCtx = null;

function ensureAudioUnlocked(){
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      if (!window.__lzAudioCtx) window.__lzAudioCtx = new Ctx();
      if (window.__lzAudioCtx.state === 'suspended') window.__lzAudioCtx.resume();
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      if (speechSynthesis.paused) speechSynthesis.resume();
    }
  } catch(_){}
}
document.addEventListener('click', ensureAudioUnlocked, { passive: true });
document.addEventListener('touchstart', ensureAudioUnlocked, { passive: true });

/* Pick the best matching Male or Female voice available for a language */
function bestVoice(lang, wantGender = 'male'){
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices(); if (!vs.length) return null;
  if (S.voiceName && !wantGender){ const v = vs.find(v => v.name === S.voiceName && v.lang.toLowerCase().startsWith(lang)); if (v) return v; }
  const cand = vs.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(lang === 'he' ? 'he' : lang) || (lang === 'he' && v.lang.toLowerCase().startsWith('iw')));
  const pool = cand.length ? cand : vs.filter(v => v.lang.toLowerCase().startsWith('en'));
  const maleNames = /guy|christopher|eric|andrew|steffan|roger|brian|matthew|daniel|david|mark|alex|thomas|george|james|ryan|liam|noah|oliver|avi|asaf|avri|hamed|naayf|\bmale\b|\bman\b|uk english male|us english male/i;
  const femaleNames = /female|woman|zira|hazel|susan|aria|jenny|michelle|sonia|samantha|victoria|karen|moira|tessa|fiona|veena|hila|carmit|zariyah|joanna|amy|salli|uk english female|us english female/i;
  const score = v => {
    const genderScore = wantGender === 'female'
      ? (femaleNames.test(v.name) ? 28 : 0) - (maleNames.test(v.name) ? 20 : 0)
      : (maleNames.test(v.name) ? 28 : 0) - (femaleNames.test(v.name) ? 20 : 0);
    return genderScore +
      (/natural|neural|online/i.test(v.name) ? 10 : 0) +
      (/google/i.test(v.name) ? 6 : 0) +
      (/premium|enhanced|siri/i.test(v.name) ? 6 : 0) +
      (/microsoft/i.test(v.name) ? 4 : 0) +
      (v.localService ? 0 : 2);
  };
  return pool.sort((a, b) => score(b) - score(a))[0] || vs[0] || null;
}

function utter(text, lang, opts = {}){
  const u = new SpeechSynthesisUtterance(text);
  u.lang = BCP[lang] || 'en-US';
  const wantGender = opts.gender || 'male';
  const v = bestVoice(lang, wantGender);
  if (v) u.voice = v;
  const isKnownFemale = v && /female|woman|zira|hazel|susan|aria|jenny|michelle|sonia|samantha|victoria|karen|hila|carmit/i.test(v.name);
  const defaultPitch = wantGender === 'female' ? (isKnownFemale ? 1.08 : 1.24) : (isKnownFemale ? 0.78 : 0.92);
  u.rate = opts.rate || (+S.voiceRate > 1 ? +S.voiceRate : 1.18);
  u.pitch = opts.pitch || defaultPitch;
  u.volume = 1;
  return u;
}

async function speakCloudVoice(text, lang, onEnd, opts = {}){
  try {
    ensureAudioUnlocked();
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.slice(0, 600),
        lang,
        voice: opts.voice || 'Matthew'
      })
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data || !data.audioBase64) return false;

    const bin = atob(data.audioBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      if (!window.__lzAudioCtx) window.__lzAudioCtx = new Ctx();
      const ctx = window.__lzAudioCtx;
      if (ctx.state === 'suspended') await ctx.resume();
      const audioBuf = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const src = ctx.createBufferSource();
      src.buffer = audioBuf;
      const rateMult = opts.rate || (+S.voiceRate > 1 ? +S.voiceRate : 1.22);
      const wantFemale = (opts.gender || data.gender) === 'female';
      if (!data.isNativeVoice) {
        if (src.detune) src.detune.value = wantFemale ? 140 : -240;
        src.playbackRate.value = Math.max(0.95, Math.min(1.85, rateMult * (wantFemale ? 1.04 : 0.98)));
      } else {
        if (src.detune && opts.detune) src.detune.value = opts.detune;
        src.playbackRate.value = Math.max(0.9, Math.min(1.9, rateMult));
      }
      const gain = ctx.createGain();
      gain.gain.value = 1.15;
      src.connect(gain);
      gain.connect(ctx.destination);
      window.__lzActiveAudio = { stop: () => { try { src.stop(); } catch(_){} } };
      src.onended = () => {
        window.__lzActiveAudio = null;
        if (onEnd) onEnd();
      };
      src.start(0);
      return true;
    }
  } catch(_){}
  return false;
}

function speakBrowserVoice(text, lang, onEnd, opts = {}){
  if (!('speechSynthesis' in window)){ onEnd && onEnd(); return; }
  try { speechSynthesis.cancel(); if (speechSynthesis.paused) speechSynthesis.resume(); } catch(_){}
  window.__lzActiveUtterances = [];
  const parts = (text.match(/[^.!?؟\n]+[.!?؟]*\s*/g) || [text]).map(s => s.trim()).filter(Boolean);
  if (!parts.length){ onEnd && onEnd(); return; }
  let finished = false;
  const done = () => { if (finished) return; finished = true; window.__lzActiveUtterances = []; onEnd && onEnd(); };
  parts.forEach((p, i) => {
    const u = utter(p, lang, opts);
    window.__lzActiveUtterances.push(u);
    if (i === parts.length - 1){
      u.onend = done;
      u.onerror = done;
    }
    speechSynthesis.speak(u);
  });
  if (speechSynthesis.paused) speechSynthesis.resume();
}

function speak(md, onEnd, opts = {}){
  stopAudioOnly();
  const text = plain(md).replace(/https?:\/\/\S+/g, '').trim().slice(0, 2500);
  if (!text){ onEnd && onEnd(); return; }
  const lang = opts.lang || langOfText(text);
  if (window.Mascot && Mascot.setSpeaking) Mascot.setSpeaking(true);
  const done = () => {
    if (window.Mascot && Mascot.setSpeaking) Mascot.setSpeaking(false);
    if (onEnd) onEnd();
  };
  speakCloudVoice(text, lang, done, opts).then(ok => {
    if (!ok) speakBrowserVoice(text, lang, done, opts);
  });
}

function stopAudioOnly(){
  if (window.Mascot && Mascot.setSpeaking) Mascot.setSpeaking(false);
  if (window.__lzActiveAudio) {
    try { window.__lzActiveAudio.stop(); } catch(_){}
    window.__lzActiveAudio = null;
  }
  window.__lzActiveUtterances = [];
  if ('speechSynthesis' in window) {
    try { speechSynthesis.cancel(); } catch(_){}
  }
}

function recLang(){ return S.voiceLang !== 'auto' ? S.voiceLang : (BCP[S.lang] || navigator.language || 'en-US'); }
let dictation = null;
async function toggleDictation(){
  const mic = $('#micBtn');
  if (dictation){
    dictation.stop();
    return;
  }

  if (!SR && !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)){
    toast('Voice input is not supported in this browser — try Chrome', 'err');
    return;
  }

  const promptEl = $('#prompt');
  const baseText = promptEl.value.trim();
  let stopped = false;
  let stream = null;
  let audioCtx = null;
  let vadTimer = null;
  let recObj = null;
  let recorder = null;
  const audioChunks = [];
  let hasSpoken = false;
  let committedSpeech = '';
  let latestSpeech = '';
  let lastTranscriptAt = Date.now();

  const cleanup = () => {
    if (vadTimer){ clearInterval(vadTimer); vadTimer = null; }
    if (audioCtx){ try { audioCtx.close(); } catch(_){} audioCtx = null; }
    if (stream){ try { stream.getTracks().forEach(tr => tr.stop()); } catch(_){} stream = null; }
    if (mic){ mic.classList.remove('rec'); mic.title = 'Voice input'; }
    dictation = null;
  };

  const applyText = (spoken) => {
    const clean = String(spoken || '').trim();
    promptEl.value = baseText ? (clean ? baseText + ' ' + clean : baseText) : clean;
    autosize();
    updateSend();
  };

  const stopAll = async (reason) => {
    if (stopped) return;
    stopped = true;
    if (recObj){ try { recObj.stop(); } catch(_){} recObj = null; }
    const mrStopPromise = (recorder && recorder.state !== 'inactive')
      ? new Promise(resolve => {
          recorder.onstop = () => resolve();
          try { recorder.stop(); } catch(_){ resolve(); }
        })
      : Promise.resolve();
    await mrStopPromise;
    cleanup();

    const finalText = (committedSpeech + ' ' + latestSpeech).trim();
    if (!finalText && hasSpoken && audioChunks.length){
      try {
        toast('Transcribing speech…');
        const mime = (recorder && recorder.mimeType) || 'audio/webm';
        const blob = new Blob(audioChunks, { type: mime });
        const reader = new FileReader();
        const b64 = await new Promise((resolve) => {
          reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
        if (b64){
          const r = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: b64, mime, lang: recLang() })
          });
          if (r.ok){
            const j = await r.json();
            if (j && j.text) applyText(j.text);
          }
        }
      } catch(_){}
    } else if (finalText){
      applyText(finalText);
    }

    if (reason === 'auto') toast('✓ Finished listening', 'ok');
    promptEl.focus();
  };

  dictation = { stop: () => stopAll('manual') };
  mic.classList.add('rec');
  mic.title = 'Listening… click or pause speaking to finish';

  // Start Web Audio VAD + backup MediaRecorder
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      if (stopped){
        stream.getTracks().forEach(tr => tr.stop());
        return;
      }
      if (window.MediaRecorder){
        try {
          recorder = new MediaRecorder(stream);
          recorder.ondataavailable = ev => { if (ev.data && ev.data.size > 0) audioChunks.push(ev.data); };
          recorder.start(250);
        } catch(_){}
      }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx){
        audioCtx = new Ctx();
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        const srcNode = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        srcNode.connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        const startedAt = Date.now();
        let lastVoiceAt = startedAt;
        let baselineSamples = [];
        let noiseFloor = 0.01;
        vadTimer = setInterval(() => {
          if (stopped) return;
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          const now = Date.now();
          if (now - startedAt < 280){
            baselineSamples.push(rms);
            const avg = baselineSamples.reduce((a, b) => a + b, 0) / baselineSamples.length;
            noiseFloor = Math.max(0.008, Math.min(0.06, avg * 1.4));
            return;
          }
          const speechThresh = Math.max(0.018, noiseFloor * 2.2);
          if (rms > speechThresh){
            hasSpoken = true;
            lastVoiceAt = now;
          } else if (hasSpoken){
            const silenceMs = now - lastVoiceAt;
            const transcriptQuietMs = now - lastTranscriptAt;
            if (silenceMs >= 1300 && transcriptQuietMs >= 900){
              stopAll('auto');
            }
          } else if (now - startedAt > 7500 && !committedSpeech && !latestSpeech){
            stopAll('timeout');
          }
        }, 90);
      }
    } catch(_){}
  }

  // Start continuous live SpeechRecognition
  if (SR && !stopped){
    try {
      const r = new SR();
      r.lang = recLang();
      r.interimResults = true;
      r.continuous = true;
      r.onresult = e => {
        if (stopped) return;
        let finalChunk = '';
        let interimChunk = '';
        for (let i = e.resultIndex; i < e.results.length; i++){
          const res = e.results[i];
          const tr = (res[0] && res[0].transcript) || '';
          if (res.isFinal) finalChunk += (finalChunk ? ' ' : '') + tr.trim();
          else interimChunk += tr;
        }
        if (finalChunk){
          committedSpeech = (committedSpeech + ' ' + finalChunk).trim();
          latestSpeech = '';
          hasSpoken = true;
        }
        if (interimChunk){
          latestSpeech = interimChunk.trim();
          hasSpoken = true;
        }
        lastTranscriptAt = Date.now();
        applyText((committedSpeech + ' ' + latestSpeech).trim());
      };
      r.onend = () => {
        if (!stopped){
          // Stop cleanly once SpeechRecognition signals speech ended or final text exists
          if (hasSpoken || committedSpeech || latestSpeech) stopAll('auto');
          else stopAll('ended');
        }
      };
      r.onerror = e => {
        if (stopped) return;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed'){
          toast('Microphone permission denied', 'err');
          stopAll('error');
        }
      };
      recObj = r;
      r.start();
    } catch(_){
      if (!recorder) stopAll('error');
    }
  }
}

/* ================= MODALS ================= */
function openModal(id){ const m = $('#' + id); if (m.hidden) sound('menu'); m.hidden = false; m.classList.remove('closing'); }
function closeModal(id){
  const m = $('#' + id); if (!m || m.hidden) return;
  if (id === 'settings') stopBgLibraryPreviews();
  m.classList.add('closing'); setTimeout(() => { m.hidden = true; m.classList.remove('closing'); if (id === 'labModal'){ $('#labBody').innerHTML = ''; stopVoice(); } }, 240);
}

/* ================= DANGER CONFIRM ================= */
let dangerOpen = false, dangerResolve = null, dangerPrevFocus = null;
function isHebish(s){ return /[\u0590-\u08FF]/.test(String(s || '')); }
function confirmDanger(opts){
  opts = opts || {};
  const m = $('#confirmDanger');
  if (!m) return Promise.resolve(typeof window.confirm === 'function' ? window.confirm([opts.title, opts.name, opts.body].filter(Boolean).join('\n')) : false);
  return new Promise(resolve => {
    if (dangerResolve) dangerResolve(false);
    dangerOpen = true; dangerResolve = resolve;
    dangerPrevFocus = document.activeElement;
    const title = opts.title || t('Delete this chat?');
    const name = opts.name || '';
    const body = opts.body || '';
    $('#dangerTitle').textContent = title;
    const nameEl = $('#dangerName');
    if (name){ nameEl.hidden = false; nameEl.textContent = name; nameEl.dir = 'auto'; }
    else { nameEl.hidden = true; nameEl.textContent = ''; }
    const bodyEl = $('#dangerBody') || $('#dangerDesc');
    if (body){ bodyEl.hidden = false; bodyEl.textContent = body; bodyEl.dir = 'auto'; }
    else { bodyEl.hidden = true; bodyEl.textContent = ''; }
    $('#dangerConfirm').textContent = opts.confirmLabel || t('Delete');
    $('#dangerCancel').textContent = opts.cancelLabel || t('Cancel');
    const card = $('.danger-card', m);
    const rtl = (S.lang === 'he' || S.lang === 'ar') || isHebish(name) || isHebish(title);
    card.dir = rtl ? 'rtl' : 'ltr';
    m.hidden = false; m.classList.remove('closing');
    requestAnimationFrame(() => { try { $('#dangerConfirm').focus(); } catch(_){} });
  });
}
function closeDanger(ok){
  if (!dangerOpen) return;
  dangerOpen = false;
  const r = dangerResolve; dangerResolve = null;
  const m = $('#confirmDanger');
  if (m && !m.hidden){
    m.classList.add('closing');
    setTimeout(() => { m.hidden = true; m.classList.remove('closing'); }, 220);
  }
  if (dangerPrevFocus && dangerPrevFocus.focus){ try { dangerPrevFocus.focus(); } catch(_){} }
  if (r) r(!!ok);
}
function bindDangerModal(){
  const m = $('#confirmDanger'); if (!m || m._bound) return; m._bound = true;
  $('#dangerCancel').onclick = () => closeDanger(false);
  $('#dangerConfirm').onclick = () => closeDanger(true);
  m.addEventListener('click', e => { if (e.target === m) closeDanger(false); });
  document.addEventListener('keydown', e => {
    if (!dangerOpen || m.hidden) return;
    if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); closeDanger(false); }
    else if (e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); e.stopPropagation(); closeDanger(true); }
    else if (e.key === 'Tab'){
      const btns = [$('#dangerCancel'), $('#dangerConfirm')].filter(x => x);
      if (!btns.length) return;
      e.preventDefault();
      const i = btns.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? btns.length - 1 : i - 1) : (i === btns.length - 1 || i < 0 ? 0 : i + 1);
      btns[next].focus();
    }
  }, true);
}

/* ================= BACKGROUND LIBRARY ================= */
function backgroundCatalog(){
  const items = [
    {id: 'flow', name: 'Flow'},
    {id: 'matrix', name: 'Matrix'},
    {id: 'net', name: 'Network'}
  ];
  Object.entries(BGX).forEach(([id, b]) => { if (b && !b.hidden) items.push({id, name: b.name || id}); });
  items.push({id: 'off', name: t('None')});
  return items;
}
const bgLib = {raf: 0, last: 0, running: false, cards: [], sel: null};
function stopBgLibraryPreviews(){
  bgLib.running = false;
  if (bgLib.raf){ cancelAnimationFrame(bgLib.raf); bgLib.raf = 0; }
  bgLib.cards = [];
}
function seedBuiltinPreview(id, e){
  const s = e.state, n = id === 'net' ? 18 : 28;
  s.n = n; s.x = new Float32Array(n); s.y = new Float32Array(n); s.vx = new Float32Array(n); s.vy = new Float32Array(n);
  for (let i = 0; i < n; i++){ s.x[i] = Math.random() * e.W; s.y[i] = Math.random() * e.H; s.vx[i] = (Math.random() - .5) * (id === 'flow' ? 1.2 : .35); s.vy[i] = (Math.random() - .5) * (id === 'flow' ? 1.2 : .35); }
  if (id === 'matrix') s.cols = Array.from({length: Math.ceil(e.W / 8)}, () => Math.random() * e.H);
}
function drawBuiltinPreview(id, e){
  const {ctx, W, H, t, state: s, rgb} = e;
  if (id === 'flow'){
    ctx.fillStyle = 'rgba(3,8,6,0.18)'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = `rgba(${rgb},.45)`; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < s.n; i++){ const ang = Math.sin(s.x[i] * .05 + t * .04) + Math.cos(s.y[i] * .04 - t * .03); s.x[i] += Math.cos(ang) * 1.4; s.y[i] += Math.sin(ang) * 1.4;
      if (s.x[i] < -4 || s.x[i] > W + 4 || s.y[i] < -4 || s.y[i] > H + 4){ s.x[i] = Math.random() * W; s.y[i] = Math.random() * H; }
      ctx.moveTo(s.x[i], s.y[i]); ctx.lineTo(s.x[i] - Math.cos(ang) * 6, s.y[i] - Math.sin(ang) * 6); }
    ctx.stroke();
  } else if (id === 'matrix'){
    ctx.fillStyle = 'rgba(3,8,6,0.18)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = `rgba(${rgb},.7)`; ctx.font = '8px monospace';
    const glyphs = '01アカサタナ<>*+';
    for (let i = 0; i < s.cols.length; i++){ s.cols[i] += 3.2; if (s.cols[i] > H + 8) s.cols[i] = -10; ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * 8, s.cols[i]); }
  } else if (id === 'net'){
    ctx.fillStyle = '#030806'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < s.n; i++){ s.x[i] += s.vx[i]; s.y[i] += s.vy[i]; if (s.x[i] < 0 || s.x[i] > W) s.vx[i] *= -1; if (s.y[i] < 0 || s.y[i] > H) s.vy[i] *= -1; }
    ctx.strokeStyle = `rgba(${rgb},.28)`; ctx.beginPath();
    const max = 3600;
    for (let i = 0; i < s.n; i++) for (let j = i + 1; j < s.n; j++){ const dx = s.x[i] - s.x[j], dy = s.y[i] - s.y[j]; if (dx * dx + dy * dy < max){ ctx.moveTo(s.x[i], s.y[i]); ctx.lineTo(s.x[j], s.y[j]); } }
    ctx.stroke(); ctx.fillStyle = `rgba(${rgb},.7)`; ctx.beginPath();
    for (let i = 0; i < s.n; i++){ ctx.moveTo(s.x[i] + 1.4, s.y[i]); ctx.arc(s.x[i], s.y[i], 1.4, 0, Math.PI * 2); }
    ctx.fill();
  }
}
function startBgLibraryPreviews(root){
  stopBgLibraryPreviews();
  if (!root) return;
  const rgb = getComputedStyle(document.documentElement).getPropertyValue('--acc-rgb').trim() || '0,255,156';
  $$('.bg-lib-card', root).forEach(card => {
    const id = card.dataset.id; if (id === 'off') return;
    const cv = $('canvas', card); if (!cv) return;
    const ctx = cv.getContext('2d', {alpha: false});
    const env = {ctx, W: cv.width, H: cv.height, k: Math.min(1.15, S.bgIntensity || 1), rgb, t: 0, perf: true, state: {}};
    ctx.fillStyle = '#030806'; ctx.fillRect(0, 0, env.W, env.H);
    try {
      if (BGX[id] && BGX[id].init) BGX[id].init(env);
      else seedBuiltinPreview(id, env);
    } catch(_){}
    bgLib.cards.push({id, env});
  });
  const paint = () => {
    for (const c of bgLib.cards){
      c.env.t++;
      try {
        if (BGX[c.id] && BGX[c.id].draw) BGX[c.id].draw(c.env);
        else drawBuiltinPreview(c.id, c.env);
      } catch(_){}
    }
  };
  for (let i = 0; i < 20; i++) paint();
  if (S.reduceMotion) return;
  bgLib.running = true; bgLib.last = 0;
  const interval = S.perfMode ? 100 : 66;
  const frame = ts => {
    if (!bgLib.running) return;
    bgLib.raf = requestAnimationFrame(frame);
    if (ts - bgLib.last < interval) return;
    bgLib.last = ts; paint();
  };
  bgLib.raf = requestAnimationFrame(frame);
}
function bgLibraryHtml(selected){
  const free = getUserPlanTier() === 'free';
  const cards = backgroundCatalog().map(item => {
    const locked = free && item.id !== 'off';
    const on = item.id === selected ? ' on' : '';
    const preview = item.id === 'off'
      ? `<div class="bg-lib-preview none"><span>${esc(t('None'))}</span></div>`
      : `<div class="bg-lib-preview"><canvas width="192" height="120" aria-hidden="true"></canvas></div>`;
    return `<button type="button" class="bg-lib-card${on}" data-id="${esc(item.id)}" aria-pressed="${item.id === selected ? 'true' : 'false'}" title="${esc(item.name)}">${preview}<b>${esc(item.name)}</b>${locked ? '<span class="lock">PRO+</span>' : ''}</button>`;
  }).join('');
  return `<div class="bg-lib" id="bgLibrary" role="listbox" aria-label="${esc(t('Animated backgrounds'))}">${cards}</div>
    <div class="bg-lib-actions"><button type="button" class="btn-primary" id="bgLibApply">${esc(t('Apply'))}</button></div>`;
}
function bindBgLibrary(root){
  const lib = $('#bgLibrary', root); if (!lib) return;
  let pending = S.bgStyle || 'flow';
  if (!backgroundCatalog().some(x => x.id === pending)) pending = 'flow';
  const paintSel = () => $$('.bg-lib-card', lib).forEach(c => { const on = c.dataset.id === pending; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  paintSel();
  lib.onclick = e => {
    const card = e.target.closest('.bg-lib-card'); if (!card) return;
    pending = card.dataset.id; paintSel();
  };
  const applyBtn = $('#bgLibApply', root);
  if (applyBtn) applyBtn.onclick = () => {
    if (pending !== 'off' && getUserPlanTier() === 'free'){
      toast('🔒 Animated backgrounds are unlocked in Loki Pro and Loki Ultimate!', 'err');
      closeModal('settings');
      showView('benches');
      return;
    }
    S.bgStyle = pending;
    saveSettings(); applySettings();
    toast(t('Background applied'));
  };
  const appearOn = activeSettingsTab === 1;
  if (appearOn) startBgLibraryPreviews(root);
}

/* ================= LABS ================= */
const LABS = [
  {id:'voice',    icon:'🎙', name:'Voice Mode',      desc:'Talk hands-free and hear replies aloud', both:true},
  {id:'enhance',  icon:'✨', name:'Prompt Enhancer', desc:'Turn a rough idea into a pro prompt', both:true},
  {id:'research', icon:'🔭', name:'Deep Research',   desc:'Multi-source cited report + .md export'},
  {id:'site',     icon:'🏗', name:'Site Builder',    desc:'Full web page, live preview, download'},
  {id:'chart',    icon:'📈', name:'Chart Studio',    desc:'Describe or paste CSV → beautiful chart'}
];
function renderLabsMenu(){
  const m = $('#labsMenu'); m.innerHTML = '';
  LABS.forEach(l => {
    const locked = !l.both && state.model !== 'stark';
    const b = el('button', 'lab-opt' + (locked ? ' locked' : '') + (l.isNew ? ' is-new' : ''), `<span class="li">${l.icon}</span><span><b>${esc(t(l.name))}${l.isNew ? ' <i class="new-pill">' + t('New') + '</i>' : ''}</b><small>${esc(t(l.desc))}</small></span><span class="tag">${l.both ? 'Fera + Stark' : 'Stark'}</span>`);
    b.onclick = () => { toggleMenu('labs', false); openLab(l.id); };
    m.appendChild(b);
  });
}
function openLab(id, preset){
  const l = LABS.find(x => x.id === id);
  if (!l) return;
  if (!l.both && isStarkLockedForUser()){
    toast('🔒 Lokizen 4.0 Stark limit reached! Upgrade your plan to unlock this Stark Lab.', 'err');
    showView('benches');
    return;
  }
  const body = $('#labBody');
  $('#labTitle').innerHTML = l.icon + ' ' + esc(t(l.name)) + ' <span class="stark-badge" style="margin-left:4px">' + (l.both ? 'Labs' : 'Stark') + '</span>';
  body.innerHTML = '';
  openModal('labModal');
  if (!l.both && state.model !== 'stark'){
    setModel('stark', true);
  }
  if (l.fn) {
    l.fn(body, preset);
  } else {
    ({voice: labVoice, enhance: labEnhance, research: labResearch, site: labSite, chart: labChart})[id](body, preset);
  }
  if (preset) {
    requestAnimationFrame(() => {
      const inp = body.querySelector('input[type="text"], input[type="url"], input:not([type]), textarea');
      if (inp) { inp.value = preset; inp.focus(); }
    });
  }
}
function labVoice(body){
  body.innerHTML = `<div class="voice-stage"><div class="voice-orb" id="vOrb">🎙</div><div class="voice-status" id="vStatus">Tap the orb and start talking (Realistic Male Voice)</div><div class="voice-transcript" id="vText"></div>
  <div class="lab-row"><select class="lab-select" id="vLang"><option value="auto">Auto language</option><option value="he-IL">עברית</option><option value="en-US">English</option></select><label class="lc-check"><input type="checkbox" id="vLoop" checked> Keep listening after replies</label></div>
  <div class="lab-row" style="width:100%;max-width:560px"><input class="lab-input" id="vType" placeholder="Or type a message and press Enter to hear it spoken aloud…"></div></div>`;
  $('#vLang').value = S.voiceLang;
  $('#vLang').onchange = e => { S.voiceLang = e.target.value; saveSettings(); };
  const orb = $('#vOrb'), st = $('#vStatus'), tx = $('#vText');
  const setSt = (cls, t) => { if (orb) orb.className = 'voice-orb ' + cls; if (st) st.textContent = t; };
  const ask = text => {
    ensureAudioUnlocked();
    tx.textContent = '“' + text + '”'; setSt('thinking', 'Thinking…');
    $('#prompt').value = text; state.voiceActive = false;
    state.onReply = m => {
      state.onReply = null;
      const replyText = plain(m.content || m.error || '');
      tx.textContent = replyText.slice(0, 320);
      setSt('speaking', 'Speaking (Male Voice)…');
      speak(m.content || m.error, () => {
        if ($('#vOrb') && $('#vLoop') && $('#vLoop').checked && SR) listen();
        else if ($('#vOrb')) setSt('', 'Tap the orb to talk again');
      });
    };
    send();
  };
  const listen = () => {
    if (!SR) return;
    stopAudioOnly();
    const r = new SR(); r.lang = recLang(); r.interimResults = true;
    let final = '';
    r.onresult = e => { let t = ''; for (const res of e.results){ t += res[0].transcript; if (res.isFinal) final = t; } tx.textContent = t; };
    r.onend = () => { state.voiceRec = null; if (final) ask(final); else if ($('#vOrb')) setSt('', 'Tap the orb and start talking'); };
    r.onerror = e => { if ($('#vStatus')) st.textContent = 'Mic: ' + e.error; };
    state.voiceRec = r; setSt('listening', 'Listening…'); r.start();
  };
  orb.onclick = () => { ensureAudioUnlocked(); stopAudioOnly(); if (state.voiceRec) state.voiceRec.stop(); else if (SR) listen(); else $('#vType') && $('#vType').focus(); };
  const vt = $('#vType'); if (vt) vt.onkeydown = e => { if (e.key === 'Enter' && vt.value.trim()){ ask(vt.value.trim()); vt.value = ''; } };
}
function stopVoice(){ if (state.voiceRec) try { state.voiceRec.abort(); } catch(_){} state.voiceRec = null; state.onReply = null; stopAudioOnly(); }
function labEnhance(body, preset){
  body.innerHTML = `<div class="lab-grid"><p class="lab-desc">Write a rough idea. I'll rewrite it into a precise, detailed prompt that gets much better answers.</p>
  <textarea class="lab-input" id="peIn" rows="4" dir="auto" placeholder="e.g. help me write an email to my boss about a raise"></textarea>
  <div class="lab-row"><button class="btn-primary" id="peGo">✨ Enhance</button></div><div id="peWork"></div><div class="lab-out md" id="peOut" hidden></div>
  <div class="lab-row" id="peActs" hidden><button class="btn-primary" id="peUse">➜ Use in chat</button><button class="btn-ghost" id="peCopy">⧉ Copy</button></div></div>`;
  $('#peIn').value = preset || $('#prompt').value;
  $('#peGo').onclick = async () => {
    const t = $('#peIn').value.trim(); if (!t) return;
    $('#peWork').innerHTML = ''; const w = Work($('#peWork'), {open:true}); $('#peGo').disabled = true;
    try {
      w.log('Analyzing intent & missing details');
      const out = await LZ.chat([{role:'system', content:'You are an expert prompt engineer. Rewrite the user\'s rough prompt into an excellent prompt for an AI assistant: clear goal, context, constraints, desired format, tone and length. Keep the user\'s language. Output ONLY the improved prompt text.'}, {role:'user', content: t}], {tier: state.model, maxTokens: 900, onStatus: x => w.log(x)});
      w.log('Polished'); w.done();
      $('#peOut').hidden = false; $('#peOut').textContent = out; $('#peOut').dir = 'auto'; $('#peActs').hidden = false;
      $('#peUse').onclick = () => { $('#prompt').value = out; autosize(); updateSend(); closeModal('labModal'); showView('chat'); $('#prompt').focus(); };
      $('#peCopy').onclick = () => copyText(out);
    } catch(e){
      w.done();
      if (e && ['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED'].includes(e.code)){
        refreshPlanLocks();
        if (window.LZ?.Usage?.createLimitBlock) $('#peWork').appendChild(window.LZ.Usage.createLimitBlock(e.message));
        else toast(e.message, 'err');
      } else {
        toast(e.userFacing ? e.message : 'Could not enhance right now', 'err');
      }
    }
    $('#peGo').disabled = false;
  };
}
function labResearch(body){
  const engList = (LZ.SEARCH_ENGINES || [
    { id: 'ddg', name: 'DuckDuckGo', icon: '🦆' },
    { id: 'wiki', name: 'Wikipedia', icon: '📚' },
    { id: 'arxiv', name: 'ArXiv Papers', icon: '🔬' },
    { id: 'hn', name: 'HackerNews', icon: '🟧' },
    { id: 'so', name: 'StackOverflow', icon: '💻' },
    { id: 'gh', name: 'GitHub Repos', icon: '🐙' },
    { id: 'openalex', name: 'OpenAlex Scholar', icon: '🎓' },
    { id: 'reddit', name: 'Reddit Discussions', icon: '💬' }
  ]);
  body.innerHTML = `<div class="lab-grid"><p class="lab-desc">Ask any question or give me a topic. I'll search 100+ websites in parallel, read and rank the pages, and write a cited research report as quickly as possible.</p>
  <div class="dr-engines" id="drEngines">${engList.map(e => `<button type="button" class="dr-eng on" data-eng="${e.id}">${e.icon} ${esc(e.name)}</button>`).join('')}</div>
  <div class="lab-row"><input class="lab-input" id="drIn" dir="auto" style="flex:1" placeholder="e.g. When was Israel founded? or State of solid-state batteries in 2026"><button class="btn-primary" id="drGo">🔭 Research</button></div>
  <div id="drWork"></div><div class="lab-out md bubble" id="drOut" hidden></div><div id="drSrc"></div>
  <div class="lab-row" id="drActs" hidden><button class="btn-primary" id="drDl">⤓ Download .md</button><button class="btn-ghost" id="drCopy">⧉ Copy</button><button class="btn-ghost" id="drChat">➜ Send to chat</button></div></div>`;
  $$('#drEngines .dr-eng', body).forEach(b => { b.onclick = () => { b.classList.toggle('on'); if (!$$('#drEngines .dr-eng.on', body).length) b.classList.add('on'); }; });
  $('#drIn').onkeydown = e => { if (e.key === 'Enter') $('#drGo').click(); };
  $('#drGo').onclick = async () => {
    const topic = $('#drIn').value.trim(); if (!topic) return;
    const enabledEngines = $$('#drEngines .dr-eng.on', body).map(b => b.dataset.eng);
    $('#drGo').disabled = true; $('#drWork').innerHTML = ''; $('#drOut').hidden = true; $('#drActs').hidden = true; $('#drSrc').innerHTML = '';
    const w = Work($('#drWork'), {open:true}); const ctl = new AbortController();
    try {
      const ctx = {tier:'stark', level: Math.max(2, state.level), work: w, signal: ctl.signal, engines: enabledEngines};
      const sources = await webResearch(topic, ctx, true);
      w.log(`Synthesizing cited research report`);
      const langName = isHeb(topic) ? 'Hebrew' : /[\u0600-\u06FF]/.test(topic) ? 'Arabic' : (LANG_NAME[S.lang] || 'English');
      const researchSys = [
        `You are Lokizen 4.0 Stark, an expert research assistant made by Lokiz Studios.`,
        `CRITICAL: Directly and accurately answer the user's EXACT question ("${topic}") in ${langName} using the provided web & academic sources.`,
        `- Start your response by directly answering the question in the very first sentence with specific facts, dates, and numbers cited with [1], [2], etc.`,
        `- Then provide well-organized ## sections covering key context, historical/technical evidence, and verified facts from the sources.`,
        `- Do NOT output "Executive Takeaway —", do NOT answer a different question, and do NOT output fenced JSON chart/widget blocks unless the user explicitly asked for a chart.`,
        sourcesContext(sources)
      ].join('\n\n');
      const report = await LZ.chat([{role:'system', content: researchSys}, {role:'user', content: topic}], {tier:'stark', level:2, maxTokens: 3600, signal: ctl.signal, onStatus: x => w.log(x)});
      w.log(`Report ready`); w.done();
      const srcs = sources.map(s => ({title: s.title, url: s.url, engine: s.engine}));
      renderMarkdown($('#drOut'), report, srcs); $('#drOut').hidden = false; $('#drSrc').appendChild(sourcesEl(srcs)); $('#drActs').hidden = false;
      const mdFull = report + `\n\n## Sources\n` + srcs.slice(0, 60).map((s, i) => `${i + 1}. [${s.title}](${s.url})${s.engine ? ' (' + s.engine + ')' : ''}`).join('\n') + '\n\n_Made with Lokizen 4.0 Stark · Lokiz Studios_';
      $('#drDl').onclick = () => download(mdFull, topic.replace(/[^\w\u0590-\u05FF -]+/g, '').slice(0, 50) + ' - research.md', 'text/markdown');
      $('#drCopy').onclick = () => copyText(mdFull);
      $('#drChat').onclick = () => {
        if (!state.current){ state.current = newConv(); state.convs.unshift(state.current); }
        const c = state.current; if (c.title === 'New chat') c.title = 'Research: ' + topic.slice(0, 40);
        c.messages.push({id: uid(), role:'user', content:'Deep Research: ' + topic, ts: Date.now()}, {id: uid(), role:'assistant', content: report, sources: srcs, log: w.entries, worked: 0, ts: Date.now()});
        persist(c); renderMessages(); renderHistory(); closeModal('labModal'); showView('chat');
      };
    } catch(e){
      w.done();
      if (e && ['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED'].includes(e.code)){
        refreshPlanLocks();
        if (window.LZ?.Usage?.createLimitBlock) $('#drWork').appendChild(window.LZ.Usage.createLimitBlock(e.message));
        else toast(e.message, 'err');
      } else {
        toast(e.userFacing ? e.message : 'Research failed — try again', 'err');
      }
    }
    $('#drGo').disabled = false;
  };
}
function labSite(body){
  body.innerHTML = `<div class="lab-grid"><p class="lab-desc">Describe a website. I'll build a complete, responsive page you can preview live and download.</p>
  <textarea class="lab-input" id="sbIn" rows="3" dir="auto" placeholder="e.g. Landing page for a vegan bakery in Tel Aviv with menu, gallery and contact form"></textarea>
  <div class="lab-row"><select class="lab-select" id="sbStyle"><option>Modern & bold</option><option>Minimal & elegant</option><option>Dark neon</option><option>Playful & colorful</option><option>Corporate</option></select><button class="btn-primary" id="sbGo">🏗 Build site</button></div>
  <div id="sbWork"></div><iframe class="lab-frame" id="sbFrame" sandbox="allow-scripts allow-forms allow-modals" hidden title="Site preview"></iframe>
  <div class="lab-row" id="sbActs" hidden><input class="lab-input" id="sbRefine" dir="auto" style="flex:1" placeholder="Ask for a change… e.g. make the header sticky"><button class="btn-ghost" id="sbRefGo">↻ Refine</button><button class="btn-primary" id="sbDl">⤓ Download .html</button><button class="btn-ghost" id="sbLc">‹/› Open in LokiCode</button></div></div>`;
  let html = '';
  const build = async (instr) => {
    $('#sbGo').disabled = true; $('#sbWork').innerHTML = ''; const w = Work($('#sbWork'), {open:true});
    try {
      w.log(instr ? 'Applying your change' : 'Planning layout & sections');
      const sys = 'You are a senior web designer/developer. Output ONE complete, production-quality, responsive HTML document (<!DOCTYPE html> … </html>) with all CSS in <style> and any JS in <script>. Use modern layout, beautiful typography (Google Fonts allowed), smooth animations, real-looking content in the user\'s language (set dir="rtl" for Hebrew), and images from https://picsum.photos/ if needed. Output ONLY the HTML, no explanations.';
      const msgs = [{role:'system', content: sys}, {role:'user', content: $('#sbIn').value.trim() + '\nStyle: ' + $('#sbStyle').value}];
      if (instr) msgs.push({role:'assistant', content: html}, {role:'user', content: 'Change request: ' + instr + '\nReturn the full updated HTML document only.'});
      w.log('Writing HTML, CSS & JavaScript');
      const out = await LZ.chat(msgs, {tier:'stark', level: Math.min(state.level, 1), maxTokens: 9000, timeout: 90000, onStatus: x => w.log(x)});
      html = (out.match(/```(?:html)?\s*([\s\S]*?)```/i) || [, out])[1].trim();
      const a = html.search(/<!doctype|<html/i); if (a > 0) html = html.slice(a);
      w.log('Rendering live preview'); w.done();
      $('#sbFrame').hidden = false; $('#sbFrame').srcdoc = html; $('#sbActs').hidden = false;
    } catch(e){
      w.done();
      if (e && ['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED'].includes(e.code)){
        refreshPlanLocks();
        if (window.LZ?.Usage?.createLimitBlock) $('#sbWork').appendChild(window.LZ.Usage.createLimitBlock(e.message));
        else toast(e.message, 'err');
      } else {
        toast(e.userFacing ? e.message : 'Build failed — try again', 'err');
      }
    }
    $('#sbGo').disabled = false;
  };
  $('#sbGo').onclick = () => { if ($('#sbIn').value.trim()) build(); };
  $('#sbRefGo').onclick = () => { const r = $('#sbRefine').value.trim(); if (r){ build(r); $('#sbRefine').value = ''; } };
  $('#sbDl').onclick = () => download(html, 'site.html', 'text/html');
  $('#sbLc').onclick = () => { closeModal('labModal'); window.LokiCode && LokiCode.open({code: html, lang:'html'}); };
}
function labChart(body){
  body.innerHTML = `<div class="lab-grid"><p class="lab-desc">Describe the chart you want, or paste CSV data. I'll design it and render it — download as PNG.</p>
  <textarea class="lab-input" id="chIn" rows="5" dir="auto" placeholder="e.g. Population of the 6 largest cities in Israel&#10;— or paste CSV —&#10;month,sales&#10;Jan,120&#10;Feb,180"></textarea>
  <div class="lab-row"><select class="lab-select" id="chType"><option value="auto">Auto type</option><option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option><option value="doughnut">Doughnut</option><option value="radar">Radar</option><option value="polarArea">Polar area</option></select><button class="btn-primary" id="chGo">📈 Create chart</button><button class="btn-ghost" id="chDl" hidden>⤓ Download PNG</button></div>
  <div id="chWork"></div><div class="chart-box" id="chBox" hidden><canvas id="chCanvas"></canvas></div></div>`;
  let chart;
  $('#chGo').onclick = async () => {
    const t = $('#chIn').value.trim(); if (!t) return;
    $('#chGo').disabled = true; $('#chWork').innerHTML = ''; const w = Work($('#chWork'), {open:true});
    try {
      w.log('Loading chart engine');
      await LZ.loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js');
      w.log('Interpreting your data');
      const type = $('#chType').value;
      const j = await LZ.chatJSON([{role:'system', content:'Turn the request or CSV into chart data. Return ONLY JSON {"type":"bar|line|pie|doughnut|radar|polarArea","title":"","labels":[...],"datasets":[{"label":"","data":[numbers]}],"xLabel":"","yLabel":""}. Use real, accurate figures (state approximate if unsure in the title). Keep the user\'s language for text.' + (type !== 'auto' ? ' The type MUST be "' + type + '".' : '')}, {role:'user', content: t}], {tier:'stark', maxTokens: 1500, onStatus: x => w.log(x)});
      w.log('Rendering chart'); w.done();
      $('#chBox').hidden = false; $('#chDl').hidden = false;
      const accRgb = getComputedStyle(document.documentElement).getPropertyValue('--acc-rgb').trim();
      const pal = [`rgba(${accRgb},.85)`, 'rgba(125,255,207,.8)', 'rgba(0,170,110,.85)', 'rgba(180,255,120,.8)', 'rgba(60,220,255,.75)', 'rgba(255,209,102,.8)', 'rgba(255,123,147,.75)', 'rgba(170,140,255,.75)'];
      const round = ['pie', 'doughnut', 'polarArea'].includes(j.type);
      const ds = (j.datasets || []).map((d, i) => ({label: d.label, data: (d.data || []).map(Number), backgroundColor: round ? pal : pal[i % pal.length], borderColor: round ? '#06100b' : pal[i % pal.length].replace(/[\d.]+\)$/, '1)'), borderWidth: 2, tension: .35, fill: j.type === 'line' ? false : true, borderRadius: j.type === 'bar' ? 8 : 0}));
      if (chart) chart.destroy();
      Chart.defaults.color = '#cfeee0'; Chart.defaults.font.family = 'Inter';
      chart = new Chart($('#chCanvas'), {type: j.type || 'bar', data: {labels: j.labels || [], datasets: ds},
        options: {responsive:true, maintainAspectRatio:false, animation:{duration:1200, easing:'easeOutQuart'},
          plugins: {title:{display:!!j.title, text:j.title, font:{size:18, weight:'700'}, color:'#fff'}, legend:{labels:{color:'#cfeee0'}}},
          scales: round || j.type === 'radar' ? {} : {x:{grid:{color:'rgba(255,255,255,.06)'}, title:{display:!!j.xLabel, text:j.xLabel}}, y:{grid:{color:'rgba(255,255,255,.06)'}, title:{display:!!j.yLabel, text:j.yLabel}}}},
        plugins: [{id:'bgfill', beforeDraw: c => { const x = c.ctx; x.save(); x.globalCompositeOperation = 'destination-over'; x.fillStyle = '#06100b'; x.fillRect(0, 0, c.width, c.height); x.restore(); }}]});
      $('#chDl').onclick = () => download(chart.toBase64Image('image/png', 1), (j.title || 'chart').slice(0, 40) + '.png');
    } catch(e){
      w.done();
      if (e && ['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED'].includes(e.code)){
        refreshPlanLocks();
        if (window.LZ?.Usage?.createLimitBlock) $('#chWork').appendChild(window.LZ.Usage.createLimitBlock(e.message));
        else toast(e.message, 'err');
      } else {
        toast(e.userFacing ? e.message : 'Could not build the chart', 'err');
      }
    }
    $('#chGo').disabled = false;
  };
}

/* ================= SETTINGS ================= */
const ACCENTS = ['#00ff9c', '#39ff14', '#00e5a0', '#7dffcf', '#b6ff3b', '#00d4ff'];
const EXTRA_SECS = [];
function registerSettings(sec){ EXTRA_SECS.push(sec); }
let activeSettingsTab = 0;
function renderSettings(){
  const b = $('#settingsBody');
  const sw = (k) => `<label class="switch"><input type="checkbox" data-k="${k}" ${S[k] ? 'checked' : ''}><span></span></label>`;
  const seg = (k, opts) => `<div class="seg" data-seg="${k}">${opts.map(([v, l]) => `<button data-v="${esc(String(v))}" class="${String(S[k]) === String(v) ? 'on' : ''}">${esc(String(l))}</button>`).join('')}</div>`;
  const row = (title, sub, ctl, col) => `<div class="set-row${col ? ' col' : ''}"><div class="lbl"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div>${ctl}</div>`;
  const voices = ('speechSynthesis' in window ? speechSynthesis.getVoices() : []).filter(v => /^(he|iw|ar|en)/i.test(v.lang));
  const secIcons = ['🌐', '🎨', '⚡', '🧠', '🎙️', '✨', '💾'];
  const allTabs = [
    { title: 'Language', icon: '🌐', sub: 'Interface & reply language' },
    { title: 'Appearance', icon: '🎨', sub: 'Theme, fonts & animations' },
    { title: 'Performance', icon: '⚡', sub: 'Speed & rendering mode' },
    { title: 'Behavior', icon: '🧠', sub: 'Default model & controls' },
    { title: 'Voice', icon: '🎙️', sub: 'Speech & live call audio' },
    { title: 'Personalization', icon: '✨', sub: 'Custom instructions & memory' },
    { title: 'Data', icon: '💾', sub: 'Export, reset & shortcuts' },
    ...EXTRA_SECS.map((x, idx) => ({
      title: x.title,
      icon: x.icon || (/design/i.test(x.title) ? '🎭' : /locat/i.test(x.title) ? '📍' : secIcons[idx % secIcons.length] || '⚙️'),
      sub: x.sub || (/design/i.test(x.title) ? 'Ultimate AI UI & theme designer' : /locat/i.test(x.title) ? 'Region & timezone preferences' : 'Module settings')
    }))
  ];
  if (activeSettingsTab >= allTabs.length) activeSettingsTab = 0;
  b.innerHTML = `
  <div class="set-paged-layout">
    <div class="set-tabs set-sidebar-nav" role="tablist">
      ${allTabs.map((item, i) => `
        <button type="button" data-tab="${i}" role="tab" aria-selected="${i === activeSettingsTab ? 'true' : 'false'}" class="set-nav-btn ${i === activeSettingsTab ? 'on' : ''}">
          <span class="set-nav-ic">${item.icon}</span>
          <span class="set-nav-txt"><b>${esc(t(item.title))}</b><small>${esc(t(item.sub))}</small></span>
        </button>
      `).join('')}
    </div>
    <div class="set-pages-viewport">
      <div class="set-sec set-page ${activeSettingsTab === 0 ? 'active-page' : ''}" data-sec="0" ${activeSettingsTab === 0 ? '' : 'hidden'}><h3>🌐 Language</h3>
        ${row('Interface language', 'Menus, buttons and labels', `<div class="seg" data-seg="lang"><button data-v="en" class="${S.lang === 'en' ? 'on' : ''}">English</button><button data-v="he" class="${S.lang === 'he' ? 'on' : ''}">עברית</button><button data-v="ar" class="${S.lang === 'ar' ? 'on' : ''}">العربية</button></div>`)}
        ${row('Reply in my language', 'The assistant answers in the interface language by default', sw('replyInLang'))}
      </div>
      <div class="set-sec set-page ${activeSettingsTab === 1 ? 'active-page' : ''}" data-sec="1" ${activeSettingsTab === 1 ? '' : 'hidden'}><h3>🎨 Appearance</h3>
        ${row('Accent color', 'Glows, buttons and highlights', `<div class="swatches">${ACCENTS.map(c => `<button class="swatch ${S.accent === c ? 'on' : ''}" style="background:${c};--sw:${c}" data-c="${c}"></button>`).join('')}<input type="color" id="setColor" value="${S.accent}"></div>`)}
        ${row(t('Animated backgrounds') + (getUserPlanTier() === 'free' ? ' <span class="lz-plan-tag pro sm">PRO+</span>' : ''), getUserPlanTier() === 'free' ? 'Animated backgrounds require Loki Pro or Ultimate' : 'Living backdrop style — select a preview, then Apply', bgLibraryHtml(S.bgStyle), true)}
        ${row('Animation intensity', 'Particles & glow strength', `<input type="range" min="0.3" max="2" step="0.1" data-k="bgIntensity" value="${S.bgIntensity}">`)}
        ${row('Animation speed', 'UI transitions', seg('animSpeed', [['0.6', 'Slow'], ['1', 'Normal'], ['1.6', 'Fast']]))}
        ${row('Reduce motion', 'Calmer UI, fewer animations', sw('reduceMotion'))}
        ${row('Font', '', seg('fontFamily', [['inter', 'Inter'], ['rubik', 'Rubik'], ['system', 'System'], ['mono', 'Mono']]))}
        ${row('Font size', S.fontSize + 'px', `<input type="range" min="13" max="19" step="1" data-k="fontSize" value="${S.fontSize}">`)}
        ${row('Bubble style', '', seg('bubbleStyle', [['glass', 'Glass'], ['solid', 'Solid'], ['minimal', 'Minimal']]))}
        ${row('Working indicator style', 'Choose from 3 new animated designs or the previous classic style', seg('workStyle', [['nebula', '🌌 Nebula Core'], ['cyber', '⚡ Cyber HUD'], ['aurora', '✨ Liquid Aurora'], ['classic', '🟢 Classic (Previous)']]))}
        <div id="setWorkPreview" class="set-work-preview"></div>
        ${row('Compact mode', 'Tighter spacing, more on screen', sw('compact'))}
        ${row('Chat width', '', seg('chatWidth', [['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide']]))}
      </div>
      <div class="set-sec set-page ${activeSettingsTab === 2 ? 'active-page' : ''}" data-sec="2" ${activeSettingsTab === 2 ? '' : 'hidden'}><h3>⚡ Performance</h3>
        ${row('Performance mode', 'Lighter background, no blur or glow effects — best for older devices', sw('perfMode'))}
        ${row('Live streaming text', 'Smooth typing as the answer streams in (never slows answers down)', sw('typewriter'))}
      </div>
      <div class="set-sec set-page ${activeSettingsTab === 3 ? 'active-page' : ''}" data-sec="3" ${activeSettingsTab === 3 ? '' : 'hidden'}><h3>🧠 Behavior</h3>
        ${row('Send with Enter', 'Shift+Enter for a new line', sw('sendOnEnter'))}
        ${row('Auto-scroll', 'Follow new text while it streams', sw('autoScroll'))}
        ${row('Sounds', 'Soft chimes for send, answers, background answers, tools & LokiBot', sw('sounds'))}
        ${row('Sound volume', Math.round((S.soundVolume ?? 0.6) * 100) + '%', `<input type="range" min="0" max="1" step="0.05" data-k="soundVolume" value="${S.soundVolume ?? 0.6}">`)}
        ${row('Default model', '', seg('defaultModel', [['fera', '3.5 Fera'], ['stark', '4.0 Stark']]))}
        ${row('Default thinking', '', seg('defaultLevel', LEVELS.map((l, i) => [i, (i === 4 && getUserPlanTier() !== 'ultimate' ? '🔒 ' : '') + l])))}
        ${row('Default answer length', 'Short, medium (a bit detailed), detailed, or long', seg('answerLength', ANSWER_LENGTHS.map(a => [a.id, a.name])))}
      </div>
      <div class="set-sec set-page ${activeSettingsTab === 4 ? 'active-page' : ''}" data-sec="4" ${activeSettingsTab === 4 ? '' : 'hidden'}><h3>🎙️ Voice</h3>
        ${row('Read replies aloud', 'Auto text-to-speech', sw('autoSpeak'))}
        ${row('Voice', 'Most natural voice is picked automatically', `<select data-k="voiceName"><option value="">Auto (best available)</option>${voices.map(v => `<option value="${esc(v.name)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join('')}</select>`)}
        ${row('Voice speed', (+S.voiceRate).toFixed(1) + '×', `<input type="range" min="0.6" max="1.6" step="0.1" data-k="voiceRate" value="${S.voiceRate}">`)}
        ${row('Voice pitch', (+S.voicePitch).toFixed(1), `<input type="range" min="0.6" max="1.4" step="0.1" data-k="voicePitch" value="${S.voicePitch}">`)}
        ${row('Speech recognition language', '', `<select data-k="voiceLang"><option value="auto">Auto</option><option value="he-IL">עברית</option><option value="en-US">English</option><option value="ar-SA">العربية</option></select>`)}
        ${row('Live call: end-of-speech pause', (+S.callSilence).toFixed(1) + 's', `<input type="range" min="0.6" max="2.5" step="0.1" data-k="callSilence" value="${S.callSilence}">`)}
        ${row('Live call captions', 'Show what you and the assistant say', sw('callCaptions'))}
        <div class="set-row"><div class="lbl"><b>Test voice</b></div><button class="btn-ghost" id="setTestVoice">🔊 Play sample</button></div>
      </div>
      <div class="set-sec set-page ${activeSettingsTab === 5 ? 'active-page' : ''}" data-sec="5" ${activeSettingsTab === 5 ? '' : 'hidden'}><h3>✨ Personalization Studio</h3>
        <div class="pers-card">
          ${row('Your name', 'How Lokizenith should greet & address you', `<input type="text" data-pers="name" value="${esc(S.name || '')}" placeholder="e.g. Elad" dir="auto">`)}
          ${row('Your role / focus', 'Student, Developer, Designer, Founder…', `<input type="text" data-pers="userRole" value="${esc(S.userRole || '')}" placeholder="e.g. Full-Stack Developer / High School Student" dir="auto">`)}
        </div>
        <div class="pers-card">
          <div class="lbl"><b>AI Personality &amp; Tone</b><small>Pick how Lokizenith communicates with you by default</small></div>
          <div class="pers-persona-grid" id="persPersonaGrid">
            ${[
              ['balanced', '⚖️ Balanced', 'Natural & smart'],
              ['direct', '⚡ Direct & Sharp', 'Zero fluff, fast'],
              ['warm', '💛 Warm & Friendly', 'Supportive tone'],
              ['teacher', '🎓 Patient Tutor', 'Step-by-step analogies'],
              ['developer', '💻 Senior Engineer', 'Clean code & architecture'],
              ['creative', '🎨 Creative Spark', 'Original & vivid'],
              ['witty', '😄 Witty & Lively', 'Clever & upbeat']
            ].map(([id, lbl, sub]) => `<button type="button" class="pers-persona-btn ${(S.persona || 'balanced') === id ? 'on' : ''}" data-pers-persona="${id}"><span>${lbl}</span><small>${sub}</small></button>`).join('')}
          </div>
        </div>
        <div class="pers-card">
          ${row('Preferred answer format', 'How responses are structured', `<div class="seg" data-pers-seg="responseFormat">${[['auto','Auto'],['bullets','Bullets'],['steps','Steps'],['concise','Concise'],['deep','In-Depth']].map(([v,l]) => `<button type="button" data-v="${v}" class="${(S.responseFormat || 'auto') === v ? 'on' : ''}">${l}</button>`).join('')}</div>`)}
          ${row('Emoji level', 'Control how expressive answers feel', `<div class="seg" data-pers-seg="emojiLevel">${[['none','None'],['light','Light'],['rich','Expressive']].map(([v,l]) => `<button type="button" data-v="${v}" class="${(S.emojiLevel || 'light') === v ? 'on' : ''}">${l}</button>`).join('')}</div>`)}
        </div>
        <div class="pers-card">
          ${row('About you', 'Background, goals, interests or tech stack', `<textarea rows="3" data-pers="aboutMe" dir="auto" placeholder="I'm a developer from Israel, I love 3D, games and AI…">${esc(S.aboutMe || '')}</textarea>`, true)}
          ${row('Custom instructions (How should I respond?)', 'Strict rules Lokizenith follows in every chat', `<textarea rows="3" data-pers="howRespond" dir="auto" placeholder="Always include runnable examples, explain clearly in Hebrew…">${esc(S.howRespond || '')}</textarea>`, true)}
          ${row('Things to avoid', 'Topics, styles or phrases to skip', `<input type="text" data-pers="avoidTopics" value="${esc(S.avoidTopics || '')}" placeholder="e.g. Long intros, overly formal language…" dir="auto">`)}
        </div>
        <div class="pers-apply-bar">
          <span class="pers-dirty-pill saved" id="persStatusPill">✓ Personalization is active &amp; saved</span>
          <div style="display:flex;gap:8px;align-items:center;">
            <button type="button" class="btn-ghost" id="persResetBtn">↺ Reset</button>
            <button type="button" class="btn-primary" id="persApplyBtn">✓ Apply &amp; Save</button>
          </div>
        </div>
      </div>
      <div class="set-sec set-page ${activeSettingsTab === 6 ? 'active-page' : ''}" data-sec="6" ${activeSettingsTab === 6 ? '' : 'hidden'}><h3>💾 Data</h3>
        ${row('Export chats', 'Download everything as JSON', '<button class="btn-ghost" id="setExport">⤓ Export</button>')}
        ${row('Reset settings', 'Back to defaults, keeps chats', '<button class="btn-ghost" id="setReset">↺ Reset</button>')}
        ${row('Clear all data', 'Deletes all chats & settings on this device', '<button class="danger-btn" id="setClear">Clear everything</button>')}
        <h3 style="margin-top:14px">Keyboard shortcuts</h3><div class="shortcuts">
        <span>New chat</span><kbd>Ctrl K</kbd><span>Focus message box</span><kbd>Ctrl /</kbd><span>Settings</span><kbd>Ctrl ,</kbd><span>LokiCode</span><kbd>Ctrl Shift L</kbd><span>Toggle sidebar</span><kbd>Ctrl B</kbd><span>Switch model</span><kbd>Alt M</kbd><span>Cycle thinking level</span><kbd>Alt T</kbd><span>Close dialogs</span><kbd>Esc</kbd></div>
      </div>
      ${EXTRA_SECS.map((x, i) => `<div class="set-sec set-page ${activeSettingsTab === (7 + i) ? 'active-page' : ''}" data-sec="${7 + i}" data-xsec="${x.id}" ${activeSettingsTab === (7 + i) ? '' : 'hidden'}></div>`).join('')}
      <div class="madeby" style="padding-top:10px">Lokizenith AI · made by <b>Lokiz Studios</b></div>
    </div>
  </div>`;
  EXTRA_SECS.forEach(x => { try { x.render($(`[data-xsec="${x.id}"]`, b)); } catch(e){ console.warn(e); } });
  $('[data-k=voiceLang]', b).value = S.voiceLang;
  $('[data-k=voiceName]', b).value = S.voiceName;
  // Single-page switcher: only 1 section page open at a time!
  $('.set-tabs', b).onclick = e => {
    const x = e.target.closest('button[data-tab]');
    if (!x) return;
    const idx = Number(x.dataset.tab) || 0;
    activeSettingsTab = idx;
    $$('.set-tabs button[data-tab]', b).forEach(y => {
      const isOn = y === x;
      y.classList.toggle('on', isOn);
      y.setAttribute('aria-selected', isOn ? 'true' : 'false');
    });
    $$('.set-sec[data-sec]', b).forEach(sec => {
      const match = Number(sec.dataset.sec) === idx;
      sec.hidden = !match;
      sec.classList.toggle('active-page', match);
    });
    const vp = $('.set-pages-viewport', b);
    if (vp) vp.scrollTop = 0;
    if (idx === 1) startBgLibraryPreviews(b);
    else stopBgLibraryPreviews();
  };
  const commit = () => { saveSettings(); applySettings(); };
  $$('input[type=checkbox][data-k]', b).forEach(i => i.onchange = () => { S[i.dataset.k] = i.checked; commit(); if (i.dataset.k === 'sounds' && i.checked) sound('toggleOn'); else sound(i.checked ? 'toggleOn' : 'toggleOff'); });
  $$('input[type=range][data-k]', b).forEach(i => i.oninput = () => {
    const k = i.dataset.k; S[k] = +i.value; const sm = i.previousElementSibling.querySelector('small');
    if (sm) sm.textContent = k === 'fontSize' ? i.value + 'px' : k === 'voiceRate' ? (+i.value).toFixed(1) + '×' : k === 'callSilence' ? (+i.value).toFixed(1) + 's' : k === 'voicePitch' ? (+i.value).toFixed(1) : k === 'soundVolume' ? Math.round(+i.value * 100) + '%' : sm.textContent;
    clearTimeout(i._t); i._t = setTimeout(() => { commit(); if (k === 'soundVolume') sound('chip'); if (k === 'bgIntensity' && $('#bgLibrary', b) && activeSettingsTab === 1) startBgLibraryPreviews(b); }, 60);
  });
  $$('input[type=text][data-k],textarea[data-k],select[data-k]', b).forEach(i => i.oninput = i.onchange = () => { S[i.dataset.k] = i.value; saveSettings(); });
  $$('[data-seg]', b).forEach(g => g.onclick = e => {
    const btn = e.target.closest('button'); if (!btn) return; const k = g.dataset.seg;
    if (k === 'bgStyle' && btn.dataset.v !== 'off' && getUserPlanTier() === 'free'){
      toast('🔒 Animated backgrounds are unlocked in Loki Pro and Loki Ultimate!', 'err');
      closeModal('settings');
      showView('benches');
      return;
    }
    if (k === 'defaultLevel' && +btn.dataset.v === 4 && getUserPlanTier() !== 'ultimate'){
      toast('👑 Ultra Thinking Mode is exclusive to Loki Ultimate!', 'err');
      closeModal('settings');
      showView('benches');
      return;
    }
    S[k] = ['defaultLevel', 'animSpeed', 'quizLength'].includes(k) ? +btn.dataset.v : btn.dataset.v;
    if (k === 'lang' || k === 'lessonLang'){
      S.lang = btn.dataset.v;
      S.lessonLang = btn.dataset.v;
      $$('[data-seg="lang"] button, [data-seg="lessonLang"] button', b).forEach(x => x.classList.toggle('on', x.dataset.v === btn.dataset.v));
    } else {
      $$('button', g).forEach(x => x.classList.toggle('on', x === btn));
    }
    commit();
    if (k === 'answerLength') setAnswerLength(btn.dataset.v, true);
    if (k === 'workStyle') renderWorkPreview();
    if (k === 'lang' || k === 'lessonLang'){ renderMessages(); renderHistory(); renderLabsMenu(); window.Lessons && Lessons.refresh(); }
  });
  function renderWorkPreview(){
    const pv = $('#setWorkPreview', b);
    if (!pv) return;
    pv.innerHTML = '';
    const wLive = Work(pv, {quiet:true, open:true, forceStyle: S.workStyle});
    wLive.stopTimer();
    $('.work-secs', wLive.root).textContent = '3.8s';
    wLive.log('Analyzing request & planning response');
    wLive.log('Cross-checking facts on wikipedia.org', 'https://en.wikipedia.org');
    wLive.log('Synthesizing verified response');
  }
  renderWorkPreview();
  bindBgLibrary(b);
  // Personalization Studio explicit Apply & Save flow
  const persDraft = {
    name: S.name || '',
    userRole: S.userRole || '',
    persona: S.persona || 'balanced',
    responseFormat: S.responseFormat || 'auto',
    emojiLevel: S.emojiLevel || 'light',
    aboutMe: S.aboutMe || '',
    howRespond: S.howRespond || '',
    avoidTopics: S.avoidTopics || ''
  };
  const markPersDirty = () => {
    const pill = $('#persStatusPill', b);
    if (pill){
      pill.classList.remove('saved');
      pill.textContent = '● Unsaved changes — click Apply & Save';
    }
  };
  $$('[data-pers]', b).forEach(inp => {
    inp.oninput = () => { persDraft[inp.dataset.pers] = inp.value; markPersDirty(); };
  });
  $$('[data-pers-persona]', b).forEach(btn => {
    btn.onclick = () => {
      persDraft.persona = btn.dataset.persPersona;
      $$('[data-pers-persona]', b).forEach(x => x.classList.toggle('on', x === btn));
      markPersDirty();
      sound('chip');
    };
  });
  $$('[data-pers-seg]', b).forEach(g => {
    g.onclick = e => {
      const btn = e.target.closest('button[data-v]'); if (!btn) return;
      persDraft[g.dataset.persSeg] = btn.dataset.v;
      $$('button', g).forEach(x => x.classList.toggle('on', x === btn));
      markPersDirty();
      sound('chip');
    };
  });
  const persApply = $('#persApplyBtn', b);
  if (persApply){
    persApply.onclick = () => {
      // Read latest values straight from DOM inputs as well for 100% reliability
      $$('[data-pers]', b).forEach(inp => { persDraft[inp.dataset.pers] = inp.value.trim(); });
      Object.assign(S, persDraft);
      saveSettings();
      applySettings();
      const pill = $('#persStatusPill', b);
      if (pill){
        pill.classList.add('saved');
        pill.textContent = '✓ Saved & Applied to all chats!';
      }
      persApply.textContent = '✓ Applied!';
      setTimeout(() => { if (persApply) persApply.textContent = '✓ Apply & Save'; }, 1800);
      sound('done');
      toast(S.lang === 'he' ? '✓ ההתאמה האישית נשמרה והוחלה בהצלחה!' : '✓ Personalization saved & applied!', 'ok');
      // Refresh empty welcome greeting if currently on a fresh chat
      if (state.current && !(state.current.messages || []).length) renderMessages();
    };
  }
  const persReset = $('#persResetBtn', b);
  if (persReset){
    persReset.onclick = () => {
      Object.assign(S, { name:'', userRole:'', persona:'balanced', responseFormat:'auto', emojiLevel:'light', aboutMe:'', howRespond:'', avoidTopics:'' });
      saveSettings();
      applySettings();
      renderSettings();
      toast(S.lang === 'he' ? 'ההתאמה האישית אופסה' : 'Personalization reset');
    };
  }
  $$('.swatch', b).forEach(x => x.onclick = () => { S.accent = x.dataset.c; $$('.swatch', b).forEach(y => y.classList.toggle('on', y === x)); $('#setColor').value = S.accent; commit(); });
  $('#setColor').oninput = e => { S.accent = e.target.value; $$('.swatch', b).forEach(x => x.classList.remove('on')); commit(); };
  $('#setTestVoice').onclick = () => speak({he:'שלום! ככה אני נשמע.', ar:'مرحبا! هكذا يبدو صوتي.', en:'Hi! This is how I sound.'}[S.lang] || 'Hi! This is how I sound.');
  $('#setExport').onclick = () => download(JSON.stringify({exported: new Date().toISOString(), app:'Lokizenith AI', chats: state.convs, lessons: safeJSON(localStorage.getItem('lz.lessons'))}, null, 2), 'lokizenith-chats.json', 'application/json');
  $('#setReset').onclick = () => { S = Object.assign({}, DEFAULTS); saveSettings(); applySettings(); renderSettings(); toast(t('Settings reset')); };
  $('#setClear').onclick = async () => {
    const ok = await confirmDanger({
      title: t('Delete ALL chats and settings? This cannot be undone.'),
      confirmLabel: t('Delete'),
      cancelLabel: t('Cancel')
    });
    if (!ok) return;
    (state.convs || []).forEach(c => recordDeletedConvId(c.id));
    await DB.clear();
    ['lz.settings', 'lz.model', 'lz.level', 'lz.code', 'lz.lessons', 'lz.imgTimes', EMERGENCY_CONVS_KEY].forEach(k => localStorage.removeItem(k));
    location.reload();
  };
}

/* ================= INIT ================= */
function bind(){
  $('#newChat').onclick = startNewChat;
  $('#openLokiCode').onclick = () => { showView(state.view === 'code' ? 'chat' : 'code'); closeSidebarMobile(); };
  $('#openLessons') && ($('#openLessons').onclick = () => { showView(state.view === 'lessons' ? 'chat' : 'lessons'); closeSidebarMobile(); });
  $('#openTeamChat') && ($('#openTeamChat').onclick = () => { showView(state.view === 'teamchat' ? 'chat' : 'teamchat'); closeSidebarMobile(); });
  $('#openLokiBot') && ($('#openLokiBot').onclick = () => { showView(state.view === 'lokibot' ? 'chat' : 'lokibot'); closeSidebarMobile(); });
  $('#openDownloadApp') && ($('#openDownloadApp').onclick = () => { showView(state.view === 'download' ? 'chat' : 'download'); closeSidebarMobile(); });
  $('#openSharedHub') && ($('#openSharedHub').onclick = () => { showView(state.view === 'sharedhub' ? 'chat' : 'sharedhub'); closeSidebarMobile(); });
  $('#benchesBtn') && ($('#benchesBtn').onclick = () => { showView(state.view === 'benches' ? 'chat' : 'benches'); closeSidebarMobile(); });
  $('#communityEventTopBtn') && ($('#communityEventTopBtn').onclick = () => { showView(state.view === 'event' ? 'chat' : 'event'); closeSidebarMobile(); });
  $('#callBtn').onclick = async () => {
    if (!window.Call && window.LZ){ try { await LZ.loadScript('/call.js'); } catch(_){} }
    if (window.Call) Call.open(); else toast('Voice call is loading…');
  };
  const clBtn = $('#openChangelog');
  if (clBtn) clBtn.onclick = async () => {
    if (!window.Changelog && window.LZ){ try { await LZ.loadScript('/changelog.js'); } catch(_){} }
    if (window.Changelog) Changelog.open();
    document.body.classList.remove('sb-open');
  };
  addEventListener('hashchange', () => { const v = location.hash.slice(1); if (['code', 'lessons', 'benches', 'teamchat', 'sharedhub', 'event', 'download', 'lokibot'].includes(v)) showView(v); });
  $('#openSettings').onclick = () => { if (window.LZRoute) LZRoute.prefetchApps(); renderSettings(); openModal('settings'); closeSidebarMobile(); };
  $('#historySearch').oninput = renderHistory;
  $('#historySearchClear') && ($('#historySearchClear').onclick = () => {
    const hs = $('#historySearch');
    if (hs){ hs.value = ''; hs.focus(); }
    renderHistory();
  });
  $$('#historyFilterTabs .sb-htab').forEach(btn => {
    btn.onclick = () => {
      activeHistoryFilter = btn.dataset.hfilter || 'all';
      $$('#historyFilterTabs .sb-htab').forEach(b => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      renderHistory();
    };
  });
  $('#toggleAppsDrawer') && ($('#toggleAppsDrawer').onclick = () => {
    const stack = $('#sbAppsStack');
    const btn = $('#toggleAppsDrawer');
    if (!stack || !btn) return;
    const collapsed = stack.classList.toggle('collapsed');
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  });
  $('#collapseSidebarBtn') && ($('#collapseSidebarBtn').onclick = () => {
    document.body.classList.add('sb-collapsed');
  });
  $('#reopenSidebarDesktop') && ($('#reopenSidebarDesktop').onclick = () => {
    document.body.classList.remove('sb-collapsed');
  });
  $('#openSidebar').onclick = () => { if (innerWidth <= 820) document.body.classList.add('sb-open'); else document.body.classList.remove('sb-collapsed'); };
  $('#closeSidebar').onclick = () => { if (innerWidth <= 820) closeSidebarMobile(); else document.body.classList.add('sb-collapsed'); };
  $('#scrim').onclick = closeSidebarMobile;
  $('#modelBtn').onclick = e => { e.stopPropagation(); toggleMenu('model'); };
  $('#thinkBtn') && ($('#thinkBtn').onclick = e => { e.stopPropagation(); toggleMenu('think'); });
  $('#lengthBtn') && ($('#lengthBtn').onclick = e => { e.stopPropagation(); toggleMenu('length'); });
  $('#labsBtn') && ($('#labsBtn').onclick = e => { e.stopPropagation(); toggleMenu('labs'); });
  $('#plusBtn').onclick = e => { e.stopPropagation(); toggleMenu('plus'); if (window.LZRoute) LZRoute.prefetchApps(); };
  document.addEventListener('click', e => {
    if (!e.target.closest('.model-menu,.labs-menu,.plus-menu,.think-menu,#modelBtn,#thinkBtn,#lengthBtn,#labsBtn,#plusBtn')) toggleMenu(null);
    if (!e.target.closest('#slashMenu,#prompt')) { const sm = $('#slashMenu'); if (sm) sm.hidden = true; }
  });
  // Tactile ripple micro-animation on interactive buttons across the app
  document.addEventListener('pointerdown', e => {
    if (S.reduceMotion || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const btn = e.target.closest('.btn-primary,.btn-ghost,.btn-new,.btn-lokicode,.model-btn,.think-btn,.benches-top-btn,.sharedhub-top-btn,.tool-btn,.send,.lc-go,.lc-langs .lang,.followup-btn,.sb-htab,.lz-guest-btn,.m-opt');
    if (!btn || btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const rip = document.createElement('span');
    rip.className = 'lz-btn-ripple';
    const size = Math.max(rect.width, rect.height) * 1.4;
    rip.style.width = rip.style.height = size + 'px';
    rip.style.left = (e.clientX - rect.left - size / 2) + 'px';
    rip.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.classList.add('lz-ripple-host');
    btn.appendChild(rip);
    setTimeout(() => rip.remove(), 520);
  }, { passive: true });
  $$('#plusMenu button').forEach(b => b.onclick = () => {
    toggleMenu(null); const a = b.dataset.act;
    if (a === 'export') return exportCurrentChat();
    if (a === 'upload') return $('#fileInput').click();
    if (a === 'formula') return openLab('formula');
    if (a === 'games') {
      if (window.LZGames && LZGames.openGame) LZGames.openGame('chess', { lang: S.lang === 'he' ? 'he' : 'he' });
      return;
    }
    if (a === 'quiz') {
      const ta = $('#prompt');
      if (ta) {
        ta.value = S.lang === 'he'
          ? 'תעשה לי מבחן של 8 שאלות (כולל שאלות אמריקאיות ושאלות פתוחות) על '
          : 'Make me a test with 8 questions (option questions and open questions) about ';
        autosize();
        updateSend();
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
      return;
    }
    if (a === 'urlreader' || a === 'flashcards' || a === 'datachart' || a === 'decision') {
      if (window.LZCapabilities && LZCapabilities.primeComposer) LZCapabilities.primeComposer(a);
      return;
    }
    if (a === 'deep-search'){
      if (isStarkLockedForUser()){
        toast('🔒 Lokizen 4.0 Stark limit reached! Upgrade your plan to unlock Deep search.', 'err');
        showView('benches');
        return;
      }
      if (state.model !== 'stark'){
        if (!state.current){ $('#messages').innerHTML = ''; }
        const m = {id: uid(), role:'assistant', type:'upgrade', feature: 'deep-search', mode: 'search', ts: Date.now()};
        $('#messages').appendChild(renderMsg(m)); scrollDown(true);
        $('.msg:last-child .btn-primary').onclick = () => { setModel('stark'); $('.msg:last-child').remove(); setDeepSearch(true); setMode('search'); };
        return;
      }
      setDeepSearch(true);
      setMode('search');
      return;
    }
    if (isStarkLockedForUser()){
      toast('🔒 Lokizen 4.0 Stark limit reached! Upgrade your plan to unlock Stark tools.', 'err');
      showView('benches');
      return;
    }
    if (state.model !== 'stark'){
      if (!state.current){ $('#messages').innerHTML = ''; }
      const m = {id: uid(), role:'assistant', type:'upgrade', feature: a, mode: a, ts: Date.now()};
      $('#messages').appendChild(renderMsg(m)); scrollDown(true);
      $('.msg:last-child .btn-primary').onclick = () => { setModel('stark'); $('.msg:last-child').remove(); setMode(a); };
      return;
    }
    setMode(a);
    if (a === 'image-edit' && !state.attachments.some(att => att.kind === 'image')){
      $('#fileInput').click();
    }
  });
  $('#fileInput').onchange = e => { addFiles([...e.target.files]); e.target.value = ''; };
  const ta = $('#prompt');
  ta.addEventListener('input', () => { autosize(); updateSend(); updateSlashMenu(); });
  ta.addEventListener('keydown', e => {
    const sm = $('#slashMenu');
    if (sm && !sm.hidden){
      const opts = $$('.slash-opt', sm);
      if (e.key === 'ArrowDown'){
        e.preventDefault();
        slashIdx = (slashIdx + 1) % Math.max(1, opts.length);
        updateSlashMenu();
        const activeEl = $('.slash-opt.active', sm);
        if (activeEl) activeEl.scrollIntoView({block:'nearest'});
        return;
      }
      if (e.key === 'ArrowUp'){
        e.preventDefault();
        slashIdx = (slashIdx - 1 + Math.max(1, opts.length)) % Math.max(1, opts.length);
        updateSlashMenu();
        const activeEl = $('.slash-opt.active', sm);
        if (activeEl) activeEl.scrollIntoView({block:'nearest'});
        return;
      }
      if (e.key === 'Tab'){
        e.preventDefault();
        const activeEl = $('.slash-opt.active', sm) || opts[0];
        if (activeEl){
          ta.value = activeEl.dataset.cmd;
          sm.hidden = true;
          autosize();
          updateSend();
        }
        return;
      }
      if (e.key === 'Escape'){
        e.preventDefault();
        sm.hidden = true;
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && S.sendOnEnter){
      e.preventDefault();
      if (sm && !sm.hidden){
        const activeEl = $('.slash-opt.active', sm);
        if (activeEl && ta.value.trim() !== activeEl.dataset.cmd && !resolveSlashCommand(ta.value.trim())){
          ta.value = activeEl.dataset.cmd;
          sm.hidden = true;
          autosize();
          updateSend();
          return;
        }
      }
      if (!state.busy) send();
    }
  });
  ta.addEventListener('paste', e => { const f = [...(e.clipboardData && e.clipboardData.files || [])]; if (f.length){ e.preventDefault(); addFiles(f); } });
  $('#composer').onsubmit = e => { e.preventDefault(); send(); };
  const comp = $('#composer');
  ['dragenter', 'dragover'].forEach(ev => comp.addEventListener(ev, e => { e.preventDefault(); comp.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => comp.addEventListener(ev, e => { e.preventDefault(); comp.classList.remove('drag'); }));
  comp.addEventListener('drop', e => addFiles([...e.dataTransfer.files]));
  $('#micBtn').onclick = toggleDictation;
  $('#enhanceBtn') && ($('#enhanceBtn').onclick = () => openLab('enhance'));
  // Composer 1-click AI Prompt Enhancer button
  const peBtn = $('#promptEnhanceBtn');
  if (peBtn){
    peBtn.onclick = async () => {
      const cur = ta.value.trim();
      if (!cur){
        toast(S.lang === 'he' ? 'כתוב קודם הודעה קצרה כדי שה-AI ישדרג אותה ✨' : 'Type a short prompt first to enhance it with AI ✨', 'info');
        ta.focus();
        return;
      }
      if (peBtn.classList.contains('loading')) return;
      peBtn.classList.add('loading');
      try {
        const r = await fetch('/api/chat/enhance', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prompt: cur, lang: S.lang })
        });
        const j = r.ok ? await r.json() : null;
        if (j && j.enhanced){
          ta.value = j.enhanced;
          autosize();
          updateSend();
          sound('chip');
          toast(S.lang === 'he' ? '✨ הפרומפט שודרג!' : '✨ Prompt enhanced!', 'ok');
          ta.focus();
        }
      } catch(_e){
        toast('Could not enhance prompt right now.', 'err');
      } finally {
        peBtn.classList.remove('loading');
      }
    };
  }

  // Quick Command Palette (Alt+K / Ctrl+Shift+K / Topbar Button)
  function openCommandPalette(){
    const old = $('#lzCmdPaletteOverlay');
    if (old){ old.remove(); return; }
    const isH = S.lang === 'he';
    const items = [
      { ic: '💬', title: isH ? 'שיחה חדשה' : 'New Chat', sub: 'Start a fresh conversation', kbd: 'Ctrl+K', run: () => startNewChat() },
      { ic: '✨', title: isH ? 'התאמה אישית (Personalization)' : 'Open Personalization Studio', sub: 'Customize AI tone, persona & instructions', kbd: 'Settings', run: () => { activeSettingsTab = 5; renderSettings(); openModal('settings'); } },
      { ic: '🎨', title: isH ? 'יצירת תמונה עם AI' : 'Generate AI Image', sub: 'Switch composer to Image Generation mode', kbd: 'Stark', run: () => { setModel('stark'); setMode('image'); showView('chat'); $('#prompt').focus(); } },
      { ic: '🎬', title: isH ? 'יצירת סרטון AI (LTX / Wan 2.1 / Veo)' : 'Generate AI Video', sub: 'Multi-provider neural video studio', kbd: 'Stark', run: () => { setModel('stark'); setMode('video'); showView('chat'); $('#prompt').focus(); } },
      { ic: '</>', title: 'LokiCode Studio', sub: '11-language AI IDE + live compiler', kbd: 'Ctrl+Shift+L', run: () => showView('code') },
      { ic: '💎', title: isH ? 'תוכניות ומחירים' : 'Subscription Plans', sub: 'Free, Pro & Ultimate features', kbd: 'Plans', run: () => showView('benches') },
      { ic: '⬇', title: 'Download App', sub: 'Windows Desktop & Android APK', kbd: 'App', run: () => showView('download') },
      { ic: '🌐', title: 'Shared Hub', sub: 'Community chats & code snippets', kbd: 'Hub', run: () => showView('sharedhub') },
      { ic: '⚙', title: isH ? 'הגדרות' : 'Open Settings', sub: 'Language, theme, voice & behavior', kbd: 'Ctrl+,', run: () => $('#openSettings').click() },
      { ic: '🍬', title: isH ? 'תביא לי סוכריה!' : 'Ask AI for Candy 🍬', sub: 'Try the Admin Voice Candy surprise', kbd: 'Fun', run: () => sendText(isH ? 'תביא לי סוכריה' : 'give me candy') },
      { ic: '♟️', title: isH ? 'שחק משחקים נגד ה-AI' : 'Play 2-Player Games vs AI', sub: isH ? 'שחמט, איקס עיגול, 4 בשורה, דמקה ועוד' : 'Chess, Tic-Tac-Toe, Connect 4, Checkers & more', kbd: 'Play', run: () => sendText(isH ? 'תשחק איתי' : 'play with me') }
    ];
    const ov = el('div', 'lz-cmd-overlay');
    ov.id = 'lzCmdPaletteOverlay';
    ov.innerHTML = `
      <div class="lz-cmd-card" role="dialog" aria-modal="true">
        <div class="lz-cmd-input-wrap">
          <span>⌘</span>
          <input type="text" id="lzCmdSearch" placeholder="${isH ? 'חפש פעולה, כלי או עמוד…' : 'Search commands, tools, or views…'}" autocomplete="off">
          <kbd style="font-size:.72rem;padding:2px 6px;border-radius:6px;background:rgba(255,255,255,.08);color:#94a3b8;">ESC</kbd>
        </div>
        <div class="lz-cmd-list" id="lzCmdList"></div>
      </div>
    `;
    document.body.appendChild(ov);
    let selIdx = 0;
    const inp = $('#lzCmdSearch', ov);
    const listEl = $('#lzCmdList', ov);
    const closeCmd = () => ov.remove();
    ov.onclick = e => { if (e.target === ov) closeCmd(); };

    const renderList = () => {
      const q = inp.value.trim().toLowerCase();
      const filtered = items.filter(it => !q || `${it.title} ${it.sub} ${it.kbd}`.toLowerCase().includes(q));
      if (selIdx >= filtered.length) selIdx = 0;
      listEl.innerHTML = filtered.length
        ? filtered.map((it, idx) => `
          <button type="button" class="lz-cmd-item ${idx === selIdx ? 'active' : ''}" data-cidx="${idx}">
            <span class="lci-left">
              <span class="lci-ic">${it.ic}</span>
              <span><b>${esc(it.title)}</b><span class="lci-sub">${esc(it.sub)}</span></span>
            </span>
            <kbd>${esc(it.kbd)}</kbd>
          </button>
        `).join('')
        : `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:.86rem;">No matching commands</div>`;
      $$('.lz-cmd-item', listEl).forEach(btn => {
        btn.onclick = () => {
          const picked = filtered[Number(btn.dataset.cidx)];
          closeCmd();
          if (picked) picked.run();
        };
      });
    };
    renderList();
    inp.oninput = () => { selIdx = 0; renderList(); };
    inp.onkeydown = e => {
      const q = inp.value.trim().toLowerCase();
      const filtered = items.filter(it => !q || `${it.title} ${it.sub} ${it.kbd}`.toLowerCase().includes(q));
      if (e.key === 'Escape'){ e.preventDefault(); closeCmd(); }
      else if (e.key === 'ArrowDown'){ e.preventDefault(); selIdx = (selIdx + 1) % Math.max(1, filtered.length); renderList(); }
      else if (e.key === 'ArrowUp'){ e.preventDefault(); selIdx = (selIdx - 1 + Math.max(1, filtered.length)) % Math.max(1, filtered.length); renderList(); }
      else if (e.key === 'Enter' && filtered[selIdx]){ e.preventDefault(); const p = filtered[selIdx]; closeCmd(); p.run(); }
    };
    setTimeout(() => inp.focus(), 20);
  }
  $('#cmdPaletteBtn') && ($('#cmdPaletteBtn').onclick = openCommandPalette);

  // Floating Scroll-to-Bottom Button for long chats
  const msgContainer = $('#messages');
  if (msgContainer && !$('#scrollBottomFab')){
    const fab = el('button', 'scroll-bottom-fab');
    fab.id = 'scrollBottomFab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Scroll to latest message');
    fab.title = 'Jump to latest message';
    fab.innerHTML = '↓';
    fab.onclick = () => scrollDown(true);
    const stage = msgContainer.parentElement;
    if (stage) stage.appendChild(fab);
    const updateFab = () => {
      const dist = msgContainer.scrollHeight - msgContainer.scrollTop - msgContainer.clientHeight;
      fab.classList.toggle('show', dist > 260);
    };
    msgContainer.addEventListener('scroll', updateFab, { passive: true });
    updateFab();
  }

  bindDangerModal();
  $$('.modal').forEach(m => { m.addEventListener('click', e => { if (m.id === 'bannedUserModal' || m.id === 'confirmDanger') return; if (e.target === m || e.target.closest('[data-close]')) closeModal(m.id); }); });
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.key === 'Escape'){
      const cmdOv = $('#lzCmdPaletteOverlay'); if (cmdOv){ cmdOv.remove(); return; }
      const repOv = $('#aiReportModalOverlay'); if (repOv){ repOv.remove(); return; }
      if (dangerOpen) return;
      $$('.modal:not([hidden])').forEach(m => { if (m.id !== 'bannedUserModal' && m.id !== 'confirmDanger') closeModal(m.id); });
      toggleMenu(null); $('.lightbox') && $('.lightbox').remove(); closeSidebarMobile();
    }
    else if ((e.altKey && k === 'k') || (mod && e.shiftKey && k === 'k')){ e.preventDefault(); openCommandPalette(); }
    else if (mod && k === 'k'){ e.preventDefault(); startNewChat(); }
    else if (mod && k === '/'){ e.preventDefault(); showView('chat'); $('#prompt').focus(); }
    else if (mod && k === ','){ e.preventDefault(); $('#openSettings').click(); }
    else if (mod && e.shiftKey && k === 'l'){ e.preventDefault(); showView(state.view === 'code' ? 'chat' : 'code'); }
    else if (mod && k === 'b'){ e.preventDefault(); if (innerWidth <= 820) document.body.classList.toggle('sb-open'); else document.body.classList.toggle('sb-collapsed'); }
    else if (e.altKey && k === 'm'){ e.preventDefault(); setModel(state.model === 'stark' ? 'fera' : 'stark'); }
    else if (e.altKey && k === 't'){ e.preventDefault(); setLevel((state.level + 1) % 5); }
  });
  const top = $('.topbar');
  const setTop = () => document.documentElement.style.setProperty('--top-h', top.offsetHeight + 'px');
  new ResizeObserver(setTop).observe(top); setTop();
  addEventListener('resize', () => setLevel(state.level, true));
}
let __lzApplySyncChain = Promise.resolve();
function applyServerUserData(data){
  __lzApplySyncChain = __lzApplySyncChain.then(() => _applyServerUserDataInner(data)).catch(() => {});
  return __lzApplySyncChain;
}
async function _applyServerUserDataInner(data){
  if (!data || typeof data !== 'object') return;
  if (data.settings && typeof data.settings === 'object' && Object.keys(data.settings).length){
    S = Object.assign({}, DEFAULTS, data.settings);
    localStorage.setItem('lz.settings', JSON.stringify(S));
    applySettings();
  }
  const deletedMap = Object.assign({}, getDeletedConvIds(), (data.deletedConvIds && typeof data.deletedConvIds === 'object') ? data.deletedConvIds : {});
  try {
    const cappedDel = Object.fromEntries(Object.entries(deletedMap).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0)).slice(0, 300));
    localStorage.setItem(DELETED_CONVS_KEY, JSON.stringify(cappedDel));
  } catch(_){}

  if (Array.isArray(data.convs)){
    let localDbConvs = [];
    try { localDbConvs = (await DB.all()) || []; } catch(_){}
    let emergencyConvs = [];
    try { emergencyConvs = safeJSON(localStorage.getItem(EMERGENCY_CONVS_KEY)) || []; } catch(_){}

    // Snapshot live state AFTER awaits so we never race against an AI reply that just finished
    const mergedMap = new Map();
    const hasMsgPayload = m => !!(m && (!m.pending || (typeof m.content === 'string' && m.content.trim()) || (typeof m.text === 'string' && m.text.trim()) || m.error || (m.images && m.images.length) || m.video || m.widget || m.candyButton || m.gamePicker || m.upgradePlanCard || (m.cards && m.cards.length) || (m.files && m.files.length)));
    const absorbConv = c => {
      if (!c || !c.id) return;
      const cleanMsgs = (c.messages || []).filter(hasMsgPayload);
      const cand = Object.assign({}, c, { messages: cleanMsgs });
      const upd = Number(cand.updated || cand.updatedAt || cand.created || 0);
      const delAt = Number(deletedMap[cand.id] || 0);
      if (delAt > 0 && delAt >= upd){
        mergedMap.delete(cand.id);
        return;
      }
      const prev = mergedMap.get(cand.id);
      if (!prev){
        mergedMap.set(cand.id, cand);
        return;
      }
      const prevUpd = Number(prev.updated || prev.updatedAt || prev.created || 0);
      const msgSeen = new Map();
      [...(prev.messages || []), ...cleanMsgs].forEach((m, idx) => {
        const key = m.id ? `id:${m.id}` : `ts:${m.role}:${m.ts || idx}:${String(m.text ?? m.content ?? '').slice(0, 60)}`;
        const oldM = msgSeen.get(key);
        // A server-side background copy (bg) never replaces the client's finished copy (sources, cards, images).
        if (oldM && m.bg && !oldM.bg) return;
        if (!oldM || (oldM.bg && !m.bg) || String(m.text ?? m.content ?? '').length >= String(oldM.text ?? oldM.content ?? '').length){
          msgSeen.set(key, m);
        }
      });
      const combinedMsgs = Array.from(msgSeen.values()).sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
      const newer = upd >= prevUpd ? Object.assign({}, prev, cand) : Object.assign({}, cand, prev);
      newer.messages = combinedMsgs;
      newer.updated = Math.max(prevUpd, upd);
      mergedMap.set(cand.id, newer);
    };

    emergencyConvs.forEach(absorbConv);
    localDbConvs.forEach(absorbConv);
    (state.convs || []).forEach(absorbConv);
    if (state.current && state.current.id) absorbConv(state.current);
    data.convs.forEach(absorbConv);

    // Restore any recently completed session AI replies from the anti-disappear safety vault
    if (window.__lzCompletedVault instanceof Map){
      for (const [cid, vaultMsgs] of window.__lzCompletedVault.entries()){
        const target = mergedMap.get(cid);
        if (!target || !Array.isArray(target.messages)) continue;
        const ids = new Set(target.messages.map(m => m && m.id));
        let restored = false;
        for (const [mid, vm] of vaultMsgs.entries()){
          if (vm && !vm.pending && !ids.has(mid)){
            target.messages.push(vm);
            restored = true;
          }
        }
        if (restored) target.messages.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
      }
    }

    state.convs = Array.from(mergedMap.values()).sort((a, b) => Number(b.updated || b.created || 0) - Number(a.updated || a.created || 0));
    const activeId = state.current && state.current.id;
    // Chats with an answer still running in the background keep their live object too.
    for (const [cid, tr] of state.turns){
      if (!tr.conv || cid === activeId) continue;
      const merged = mergedMap.get(cid);
      if (merged){
        const liveIds = new Set(tr.conv.messages.map(m => m.id));
        (merged.messages || []).forEach(m => { if (m.id && !liveIds.has(m.id)) tr.conv.messages.push(m); });
        tr.conv.messages.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
      }
      mergedMap.set(cid, tr.conv);
      state.convs = state.convs.map(c => c.id === cid ? tr.conv : c);
    }
    // Server-finished background answers: stop showing them as "still thinking".
    for (const [gid, g] of state.remoteGens){ const mc = mergedMap.get(g.convId); if (mc && (mc.messages || []).some(m => m.id === gid)) state.remoteGens.delete(gid); }
    const prevCur = state.current;
    const prevCurMsgIds = new Set((prevCur && prevCur.messages || []).filter(m => !m.pending).map(m => m.id));
    if ((state.busy || state.turns.size > 0) && state.current && activeId){
      const merged = mergedMap.get(activeId);
      if (merged){
        const liveIds = new Set(state.current.messages.map(m => m.id));
        (merged.messages || []).forEach(m => { if (m.id && !liveIds.has(m.id)) state.current.messages.push(m); });
        state.current.messages.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
      }
      mergedMap.set(activeId, state.current);
      state.convs = state.convs.map(c => c.id === activeId ? state.current : c);
      state._rerenderAfterBusy = true;
    } else if (activeId) {
      const mergedActive = mergedMap.get(activeId);
      if (prevCur && prevCur.id === activeId && mergedActive){
        const mergedIds = new Set((mergedActive.messages || []).map(m => m.id));
        (prevCur.messages || []).forEach(m => {
          if (hasMsgPayload(m) && m.id && !mergedIds.has(m.id)){
            mergedActive.messages.push(m);
          }
        });
        mergedActive.messages.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
      }
      state.current = mergedActive || prevCur || null;
    } else {
      state.current = null;
    }
    try {
      for (const c of state.convs) await DB.put(JSON.parse(JSON.stringify(c)));
      for (const delId of Object.keys(deletedMap)){
        if (!mergedMap.has(delId)) await DB.del(delId);
      }
    } catch(_){}
    // Re-check AFTER async DB.put: NEVER wipe a newly finished AI reply or shrink the visible DOM!
    const justFinished = (Date.now() - Number(window.__lzLastTurnFinishedAt || 0)) < 8000;
    const afterCompleted = (state.current && state.current.messages || []).filter(m => !m.pending);
    const afterIds = afterCompleted.map(m => m.id);
    const hasNewRemoteMsg = afterIds.some(id => id && !prevCurMsgIds.has(id));
    const domMsgCount = document.querySelectorAll('#messages .msg:not(.busy)').length;
    saveEmergencyMirror(state.convs);
    renderHistory();
    if (!state.busy && state.turns.size === 0 && !justFinished && afterCompleted.length >= domMsgCount && (hasNewRemoteMsg || !prevCur)){
      renderMessages();
    }
  }
}

async function clearLocalAccountState(){
  state.convs = [];
  state.current = null;
  try { await DB.clear(); } catch(_){}
  ['lz.code', 'lz.code.history', DELETED_CONVS_KEY, EMERGENCY_CONVS_KEY].forEach(k => localStorage.removeItem(k));
  renderHistory();
  renderMessages();
}

function importSharedConversation(sharedConv){
  if (!sharedConv || !Array.isArray(sharedConv.messages)) return;
  const copy = {
    id: uid(),
    title: sharedConv.title || 'Shared Chat',
    pinned: false,
    created: Date.now(),
    updated: Date.now(),
    messages: sharedConv.messages.map(m => Object.assign({}, m))
  };
  state.convs.unshift(copy);
  state.current = copy;
  persist(copy);
  renderHistory();
  renderMessages();
  showView('chat');
  toast(`✓ Opened "${copy.title}"`, 'ok');
}

registerSettings({
  id: 'appearance11',
  title: 'Appearance',
  icon: '🎨',
  sub: 'Themes, accent colors & font size',
  render(root){
    const themes = [
      { id: 'emerald', name: 'Emerald Night', accent: '#00ff9c', blurb: 'Lokizenith default' },
      { id: 'midnight', name: 'Midnight', accent: '#8eb4ff', blurb: 'Cooler contrast' },
      { id: 'aurora', name: 'Aurora', accent: '#5eead4', blurb: 'Soft teal glow' }
    ];
    const accents = ['#00ff9c', '#5eead4', '#8eb4ff', '#c4b5fd', '#f9a8d4', '#fbbf24'];
    const paint = () => {
      root.innerHTML = `<h3>Appearance</h3>
        <p style="color:var(--muted);font-size:.84rem;margin:0 0 12px">Choose a theme, an accent, and a reading size. The rest of the app keeps its layout.</p>
        <div class="set-row col"><div class="lbl"><b>Theme</b><small>Applied only when you pick one</small></div>
          <div class="set-theme-grid">${themes.map(th => `<button type="button" class="set-theme-card ${ (S.uiTheme || 'emerald') === th.id ? 'on' : '' }" data-theme="${th.id}">
            <div class="set-theme-sw" style="background:linear-gradient(135deg,${th.accent},#07110d)"></div>
            <b>${th.name}</b><small style="display:block;color:var(--muted)">${th.blurb}</small>
          </button>`).join('')}</div>
        </div>
        <div class="set-row"><div class="lbl"><b>Accent color</b><small>Buttons, glows, and your name</small></div>
          <div class="swatches">${accents.map(c => `<button class="swatch ${S.accent === c ? 'on' : ''}" style="background:${c}" data-acc="${c}"></button>`).join('')}</div>
        </div>
        <div class="set-row"><div class="lbl"><b>Font size</b><small id="setFontLbl">${S.fontSize}px</small></div>
          <input type="range" min="13" max="20" step="1" id="setFontRange" value="${S.fontSize}">
        </div>
        <div class="set-font-preview" id="setFontPreview" style="font-size:${S.fontSize}px">Lokizenith stays comfortable at this size. The quick brown fox jumps.</div>`;
      root.querySelectorAll('[data-theme]').forEach(btn => btn.onclick = () => {
        const th = themes.find(t => t.id === btn.dataset.theme);
        S.uiTheme = th.id;
        S.accent = th.accent;
        saveSettings(); applySettings(); paint();
      });
      root.querySelectorAll('[data-acc]').forEach(btn => btn.onclick = () => {
        S.accent = btn.dataset.acc;
        saveSettings(); applySettings(); paint();
      });
      const range = root.querySelector('#setFontRange');
      range.oninput = () => {
        S.fontSize = +range.value;
        root.querySelector('#setFontLbl').textContent = S.fontSize + 'px';
        root.querySelector('#setFontPreview').style.fontSize = S.fontSize + 'px';
        saveSettings(); applySettings();
      };
    };
    paint();
  }
});
registerSettings({
  id: 'privacy12',
  title: 'Data & Privacy',
  icon: '🔒',
  sub: 'Export data & sign out other devices',
  render(root){
    const user = window.LZAuth && LZAuth.getUser ? LZAuth.getUser() : null;
    root.innerHTML = `<h3>Data &amp; Privacy</h3>
      <p style="color:var(--muted);font-size:.84rem;margin:0 0 12px">Download a copy of what this browser and your account hold, or sign every other session out. This device stays signed in.</p>
      <div class="set-row"><div class="lbl"><b>Export my data</b><small>Chats, settings, and profile as JSON</small></div>
        <button class="btn-ghost" id="setPrivacyExport" type="button">Download export</button>
      </div>
      <div class="set-row"><div class="lbl"><b>Log out other devices</b><small id="setSessionHint">Other sessions on this account</small></div>
        <button class="btn-primary" id="setLogoutOthers" type="button">Log out other devices</button>
      </div>
      <div class="set-row col"><div class="lbl"><b>What is included</b><small>Username ${user ? '@' + esc(user.username || '') : '(sign in to export a profile)'}, plan, chats on this account, and settings. Passwords are never exported. Team Chat messages stay on the server for the other members of those rooms.</small></div></div>`;
    root.querySelector('#setPrivacyExport').onclick = () => {
      const u = window.LZAuth && LZAuth.getUser ? LZAuth.getUser() : null;
      const safeUser = u ? { id: u.id, username: u.username, displayName: u.displayName, plan: u.plan || u.effectivePlan, createdAt: u.createdAt } : null;
      download(JSON.stringify({ exportedAt: new Date().toISOString(), app: 'Lokizenith AI', profile: safeUser, settings: S, chats: state.convs }, null, 2), 'lokizenith-data-export.json', 'application/json');
      toast('Export downloaded');
    };
    const hint = root.querySelector('#setSessionHint');
    const token = localStorage.getItem('lz.authToken') || '';
    if (token){
      fetch('/api/auth/sessions', { headers: { 'x-lz-token': token } }).then(r => r.json()).then(j => {
        if (hint && j && typeof j.others === 'number') hint.textContent = j.others === 0 ? 'No other devices are signed in' : j.others + ' other session' + (j.others === 1 ? '' : 's') + ' signed in';
      }).catch(() => {});
    }
    root.querySelector('#setLogoutOthers').onclick = async () => {
      if (!token){ toast('Sign in first', 'err'); return; }
      const okLogout = await confirmDanger({
        title: t('Sign out every other device? This browser stays signed in.'),
        confirmLabel: t('Sign out'),
        cancelLabel: t('Cancel')
      });
      if (!okLogout) return;
      try {
        const r = await fetch('/api/auth/logout-others', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-lz-token': token } });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Could not sign out other devices');
        toast(j.revokedCount ? 'Signed out ' + j.revokedCount + ' other session' + (j.revokedCount === 1 ? '' : 's') : 'No other devices were signed in');
        if (hint) hint.textContent = 'No other devices are signed in';
      } catch(err){ toast(err.message || 'Could not sign out other devices', 'err'); }
    };
  }
});
window.LZRoute = {
  hydrate(){
    const v = document.body.dataset.view || 'chat';
    if (!lzSignedIn()) return;
    if (v === 'code') ensureRouteScript('/lokicode.js').then(() => ensureRichText()).then(() => { if (window.LokiCode) LokiCode.onShow(); });
    if (v === 'benches') ensureRouteScript('/benches.js').then(() => { if (window.LokiBenches) LokiBenches.onShow(); });
    this.prefetchApps();
  },
  prefetchApps(){
    if (!lzSignedIn() || !window.LZ || window.__lzPrefetch) return;
    window.__lzPrefetch = true;
    const run = () => {
      ['/formula-fast.js', '/features.js', '/tools.js', '/places.js', '/design.js', '/changelog.js', '/call.js']
        .reduce((p, s) => p.then(() => LZ.loadScript(s).catch(() => {})), Promise.resolve());
    };
    if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1800 });
    else setTimeout(run, 600);
  }
};
async function init(){
  applySettings(); bind();
  setModel(MODELS[state.model] ? state.model : 'fera', true);
  setLevel(Math.max(0, Math.min(4, state.level ?? 2)), true);
  setAnswerLength(normalizeAnswerLength(state.answerLength), true);
  renderFeatureChips();
  try { state.convs = (await DB.all()) || []; } catch(_){ state.convs = []; }
  if (!state.convs.length){
    const em = safeJSON(localStorage.getItem(EMERGENCY_CONVS_KEY));
    if (Array.isArray(em) && em.length) state.convs = em;
  }
  state.convs.forEach(c => c.messages = (c.messages || []).filter(m => !m.pending));
  // Reload / reopen always lands on a fresh empty chat. History stays in the
  // sidebar; empty drafts are not created until the first message is sent.
  state.current = null;
  if (window.LZAuth && LZAuth.getBootData && LZAuth.getBootData()){
    await applyServerUserData(LZAuth.getBootData());
  } else {
    renderHistory(); renderMessages();
  }
  ensureRichText();
  updateSend();
  if (/^\/lokibot\/?$/.test(location.pathname)) history.replaceState(null, '', '/#lokibot');
  const hv = location.hash.slice(1); if (['code', 'benches', 'teamchat', 'sharedhub', 'event', 'download', 'lokibot'].includes(hv)) showView(hv);
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => {};
  if (document.fonts) document.fonts.ready.then(() => setLevel(state.level, true));
  // Answers that kept generating on the server while the app was closed or on another device.
  setTimeout(() => refreshRemoteGens(), 1200);
  // Shared Formula Calculator links (#formula=…) — load the calculator right away.
  if (/^#formula=/.test(location.hash) && window.LZ && LZ.loadScript){
    LZ.loadScript('/formula-fast.js').catch(() => {}).then(() => LZ.loadScript('/features.js')).catch(() => {});
  }
}

function exportCurrentChat(){
  const c = state.current;
  if (!c || !c.messages || !c.messages.length){
    toast('No chat to export yet.');
    return;
  }
  const lines = [`# ${c.title || 'Lokizenith chat'}`, '', `_Exported ${new Date().toLocaleString()}_`, ''];
  c.messages.filter(m => !m.pending && (m.content || m.sources)).forEach(m => {
    const who = m.role === 'user' ? 'You' : 'Lokizenith';
    lines.push(`## ${who}`, '', String(m.content || '').trim(), '');
    if (m.sources && m.sources.length){
      lines.push('### Sources');
      m.sources.forEach((s, i) => {
        lines.push(`${i + 1}. [${s.title || s.domain}](${s.url}) — Trust ${s.trustScore}% (${s.trustLabel})${s.trustReason ? ' · ' + s.trustReason : ''}`);
      });
      lines.push('');
    }
  });
  const name = String(c.title || 'lokizenith-chat').replace(/[\\/:*?"<>|]+/g, '').slice(0, 60) + '.md';
  download(lines.join('\n'), name, 'text/markdown');
  toast('Chat exported');
}
function lastAssistantMessage(){
  const c = state.current;
  if (!c || !c.messages) return null;
  return [...c.messages].reverse().find(m => m.role === 'assistant' && m.content && !m.error && !m.pending) || null;
}
function renderFeatureChips(){
  // Chip bar above the prompt was removed; features stay in the + menu,
  // length picker next to thinking mode, message actions, and Settings.
  const bar = document.getElementById('featureChips');
  if (bar){ bar.hidden = true; bar.innerHTML = ''; }
}
function registerLab(l){ LABS.push(l); renderLabsMenu(); }
function addConversation(title, messages){ const c = newConv(); c.title = title; c.messages = messages; state.convs.unshift(c); persist(c); renderHistory(); return c; }
window.App = {onGenEvent, refreshRemoteGens, registerBackground, BG, BGX, registerSettings, grow, registerTool, registerCard, cardEl, persistMsg, sendText, scrollDown, renderMessages, renderHistory, openLab, newConv, persist, deliberate, webResearch, sourcesContext, imagesEl, FEATURE_INFO, MODELS, LABS, ANSWER_LENGTHS, renderLabsMenu, renderSettings, startNewChat, state, settings: () => S, saveSettings, applySettings, toast, download, copyText, mdToHtml, renderMarkdown, enhance, Work, showView, upgradeCard, setModel, setLevel, setAnswerLength, setDeepSearch, exportCurrentChat, isHeb, esc, el, $, $$, sound, systemPrompt, openModal, closeModal, confirmDanger, backgroundCatalog, registerLab, addConversation, selectConv, plain, speak, utter, bestVoice, langOfText, BCP, LANG_NAME, uid, widgetEl, safeJSON, lightbox, sourcesEl, fmtDur, applyServerUserData, clearLocalAccountState, importSharedConversation, getUserPlanTier, refreshPlanLocks, getDeletedConvIds};
init();
})();
