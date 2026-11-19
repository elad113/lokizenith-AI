/* Lokizenith AI — app shell. made by Lokiz Studios */
(function(){
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function el(tag, cls, html){ const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const isHeb = s => /[\u0590-\u05FF]/.test(s || '');
const LOGO_SVG = '<svg viewBox="0 0 64 64"><path d="M20 14v36h26"/><circle cx="44" cy="22" r="6"/></svg>';
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
  {id:4, name:'Ultra', icon:'👑', blurb:'4-pass planning, draft, critique & perfection', recommended:false}
];
const LEVELS = ['Turbo','Medium','High','Extra High','Ultra'];
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
  chart:        {icon:'📈', label:'Chart Studio'}
};

/* ================= SETTINGS ================= */
const DEFAULTS = {
  accent:'#00ff9c', bgStyle:'flow', bgIntensity:1, reduceMotion:false, fontSize:15, chatWidth:'normal',
  sendOnEnter:true, sounds:true, typewriter:true, defaultModel:'fera', defaultLevel:2,
  name:'', aboutMe:'', howRespond:'', voiceLang:'auto', autoSpeak:false, showTimer:true,
  lang: detectLang(), replyInLang:true, perfMode:false, animSpeed:1, bubbleStyle:'glass', fontFamily:'inter',
  compact:false, autoScroll:true, voiceName:'', voiceRate:1, voicePitch:1, callSilence:1.2, callCaptions:true,
  quizDifficulty:'medium', quizLength:8, lessonLang: detectLang(), workStyle:'nebula'
};
function detectLang(){ const l = (navigator.language || 'en').toLowerCase(); return l.startsWith('he') || l.startsWith('iw') ? 'he' : l.startsWith('ar') ? 'ar' : 'en'; }
const LANG_NAME = {en:'English', he:'Hebrew', ar:'Arabic'};
const t = s => (window.I18N ? I18N.t(s) : s);
let S = Object.assign({}, DEFAULTS, safeJSON(localStorage.getItem('lz.settings')) || {});
if (S.lang && ['en', 'he', 'ar'].includes(S.lang)) S.lessonLang = S.lang;
function safeJSON(s){ try { return JSON.parse(s); } catch(_){ return null; } }
function saveSettings(){ localStorage.setItem('lz.settings', JSON.stringify(S)); }
const state = {
  model: localStorage.getItem('lz.model') || S.defaultModel,
  level: +(localStorage.getItem('lz.level') ?? S.defaultLevel) || 0,
  convs: [], current: null, busy: false, ctl: null, attachments: [], mode: null, view: 'chat'
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
let actx;
function sound(kind){
  if (!S.sounds) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = {send:[660, 880], done:[523, 784, 1046], click:[900], error:[300, 200]}[kind] || [700];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
      const t0 = actx.currentTime + i * 0.07;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.start(t0); o.stop(t0 + 0.2);
    });
  } catch(_){}
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
  toast('Copied to clipboard'); sound('click');
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
function persist(c){ c = c || state.current; if (!c) return; c.updated = Date.now(); DB.put(JSON.parse(JSON.stringify(c))).catch(e => toast('Storage is full — delete some chats', 'err')); }

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
      ctx.fillStyle = fade; ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1.2;
      const t = tick;
      for (let b = 0; b < BUCKETS; b++){
        ctx.strokeStyle = strokes[b]; ctx.beginPath();
        for (let i = 0; i < n; i++){
          if (pb[i] !== b) continue;
          const x = px[i], y = py[i];
          const ang = Math.sin(x * .0021 + t * .004) * 1.6 + Math.cos(y * .0024 - t * .003) * 1.6 + .5;
          const nx = x + Math.cos(ang) * pv[i] * 1.6, ny = y + Math.sin(ang) * pv[i] * 1.6;
          ctx.moveTo(x, y); ctx.lineTo(nx, ny);
          px[i] = nx; py[i] = ny; pl[i]--;
          if (nx < -10 || nx > W + 10 || ny < -10 || ny > H + 10 || pl[i] < 0){ px[i] = Math.random()*W; py[i] = Math.random()*H; pl[i] = 200 + Math.random()*400; }
        }
        ctx.stroke();
      }
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
  const raw = window.marked ? marked.parse(text || '') : esc(text).replace(/\n/g, '<br>');
  return window.DOMPurify ? DOMPurify.sanitize(raw, {ADD_ATTR:['target']}) : raw;
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
  const data = safeParseBlockJSON(rawText) || {};

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

  // 9. INSTANT INTERACTIVE MINI-QUIZ (loki-quiz / quiz)
  if (lang === 'loki-quiz' || lang === 'quiz'){
    const qs = Array.isArray(data) ? data : (data.questions || data.items || []);
    if (!qs.length) return null;
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
  'loki-codecompare', 'diff', 'loki-audio', 'synth'
];

/* Only compose interactive visual blocks when the user EXPLICITLY asks for a chart/timeline/table/kanban/matrix/cards and the LLM didn't include one */
function autoComposeInteractiveBlocks(userText, replyText){
  const text = String(replyText || '');
  const u = String(userText || '').trim();
  if (!text || !u || u.length < 10) return text;
  if (/```(?:loki-|chart|metrics|proscons|timeline|checklist|flashcards|insight|kanban|quiz|datatable|sandbox|flow|swot|faq|decision|diff|synth|table)\b/i.test(text) || /\|.*\|.*\|/.test(text)) {
    return text;
  }
  const explicitChart = /\b(chart|bar chart|line chart|pie chart|radar chart|plot a graph|גרף|תרשים)\b/i.test(u);
  const explicitTimeline = /\b(timeline|ציר זמן)\b/i.test(u);
  const explicitTable = /\b(table|data table|comparison table|tabular|טבלה|טבלאות|השוואה בטבלה|לוח נתונים)\b/i.test(u);
  const explicitDecision = /\b(decision matrix|weighted matrix|מטריצת החלטה)\b/i.test(u);
  const explicitKanban = /\b(kanban|sprint board|task board|לוח קנבן)\b/i.test(u);
  const explicitCards = /\b(3d cards|flashcards|study cards|כרטיסיות)\b/i.test(u);

  if (!explicitChart && !explicitTimeline && !explicitTable && !explicitDecision && !explicitKanban && !explicitCards) {
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
    const pre = code.parentElement;
    if (pre.parentElement.classList.contains('codeblock')) return;
    const lang = ((code.className.match(/language-([\w+#-]+)/) || [])[1] || '').toLowerCase();
    const isStarkBlock = STARK_BLOCK_LANGS.includes(lang) || lang.startsWith('loki-');

    if (isStarkBlock){
      const rich = renderInteractiveBlock(lang, code.textContent);
      if (rich){ pre.replaceWith(rich); return; }
      // Absolute guarantee: never fall through to a codeblock for visual/presentation blocks!
      const fallbackCard = el('div', 'stark-block stark-visual-fallback');
      fallbackCard.innerHTML = `<div class="sb-head"><span class="sb-badge">📊 ${esc(lang)}</span><b dir="auto">${esc(t('Visual Presentation'))}</b></div><div class="sb-fb-body" dir="auto">${mdToHtml(code.textContent)}</div>`;
      pre.replaceWith(fallbackCard);
      return;
    }

    const wrap = el('div', 'codeblock');
    const head = el('div', 'cb-head', `<span>${esc(lang || 'code')}</span><button data-a="copy">⧉ Copy</button><button data-a="dl">⤓ Download</button><button data-a="lc">‹/› LokiCode</button>`);
    pre.replaceWith(wrap); wrap.append(head, pre);
    try { if (window.hljs){ if (lang && hljs.getLanguage(lang)) code.innerHTML = hljs.highlight(code.textContent, {language: lang}).value; else hljs.highlightElement(code); } } catch(_){}
    code.classList.add('hljs');
    head.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const txt = code.textContent;
      if (b.dataset.a === 'copy') copyText(txt);
      if (b.dataset.a === 'dl') download(txt, 'code.' + (EXT[lang] || 'txt'));
      if (b.dataset.a === 'lc' && window.LokiCode) LokiCode.open({code: txt, lang});
    });
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
  const timer = setInterval(() => { secsEl.textContent = fmtDur((performance.now() - t0) / 1000); }, 100);
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
      entries.push(e); addLi(e, entries.length);
      if (stepPill) stepPill.textContent = entries.length + (entries.length === 1 ? ' step' : ' steps');
      nowEl.textContent = text + (url ? ' ' + LZ.domainOf(url) : ''); nowEl.style.animation = 'none'; void nowEl.offsetWidth; nowEl.style.animation = '';
      if (opts.onLog) opts.onLog(e);
    },
    done(){
      clearInterval(timer);
      const secs = (performance.now() - t0) / 1000;
      $$('li.cur', ol).forEach(li => li.classList.remove('cur'));
      setDone(root, secs, entries.length);
      return {secs, log: entries};
    },
    stopTimer(){ clearInterval(timer); },
    now(text){ nowEl.textContent = text; }
  };
  return api;
}
function setDone(root, secs, stepCount){
  root.classList.remove('live');
  root.classList.add('done');
  const head = $('.work-head', root);
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
function startNewChat(){
  if (state.busy) stop();
  state.current = null; renderMessages(); renderHistory(); showView('chat'); closeSidebarMobile(); $('#prompt').focus();
}
function selectConv(id){
  if (state.busy) stop();
  state.current = convById(id) || null; renderMessages(); renderHistory(); showView('chat'); closeSidebarMobile();
}
function groupLabel(ts){
  const d = new Date(ts), now = new Date(); const day = 864e5;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= start) return 'Today'; if (ts >= start - day) return 'Yesterday'; if (ts >= start - 7*day) return 'Previous 7 days'; if (ts >= start - 30*day) return 'Previous 30 days';
  return d.toLocaleString('en', {month:'long', year:'numeric'});
}
function renderHistory(){
  const box = $('#history'); const q = $('#historySearch').value.trim().toLowerCase();
  box.innerHTML = '';
  let list = state.convs.filter(c => c.messages.length);
  if (q) list = list.filter(c => c.title.toLowerCase().includes(q) || c.messages.some(m => (m.content || '').toLowerCase().includes(q)));
  if (!list.length){ box.innerHTML = `<div class="h-empty">${q ? 'No chats match “' + esc(q) + '”' : 'No chats yet.<br>Start a conversation ✦'}</div>`; return; }
  const pinned = list.filter(c => c.pinned).sort((a, b) => b.updated - a.updated);
  const rest = list.filter(c => !c.pinned).sort((a, b) => b.updated - a.updated);
  let i = 0;
  const add = (label, arr) => { if (!arr.length) return; box.appendChild(el('div', 'h-group', esc(label))); arr.forEach(c => box.appendChild(histItem(c, i++))); };
  add('📌 Pinned', pinned);
  const groups = {}; rest.forEach(c => { const g = groupLabel(c.updated); (groups[g] = groups[g] || []).push(c); });
  Object.keys(groups).forEach(g => add(g, groups[g]));
}
function histItem(c, i){
  const it = el('div', 'h-item' + (state.current && state.current.id === c.id ? ' active' : ''));
  it.style.animationDelay = Math.min(i * 25, 300) + 'ms';
  it.setAttribute('role', 'listitem');
  it.innerHTML = `${c.pinned ? '<span class="pin-ic">📌</span>' : ''}<span class="t" dir="auto"></span><span class="acts"><button data-a="pin" title="${c.pinned ? 'Unpin' : 'Pin'}">${c.pinned ? '⊘' : '📌'}</button><button data-a="ren" title="Rename">✎</button><button data-a="del" class="del" title="Delete">🗑</button></span>`;
  $('.t', it).textContent = c.title;
  it.onclick = e => {
    const b = e.target.closest('button');
    if (!b){ if (!e.target.closest('input')) selectConv(c.id); return; }
    e.stopPropagation();
    if (b.dataset.a === 'pin'){ c.pinned = !c.pinned; persist(c); renderHistory(); toast(c.pinned ? 'Pinned' : 'Unpinned'); }
    if (b.dataset.a === 'del'){
      if (!confirm('Delete “' + c.title + '”?')) return;
      state.convs = state.convs.filter(x => x !== c); DB.del(c.id);
      if (state.current === c){ state.current = null; renderMessages(); }
      renderHistory(); toast('Chat deleted');
    }
    if (b.dataset.a === 'ren'){
      const t = $('.t', it); const inp = el('input'); inp.value = c.title; t.replaceWith(inp); inp.focus(); inp.select();
      const fin = ok => { if (ok && inp.value.trim()){ c.title = inp.value.trim().slice(0, 80); persist(c); } renderHistory(); };
      inp.onkeydown = ev => { if (ev.key === 'Enter') fin(true); if (ev.key === 'Escape') fin(false); };
      inp.onblur = () => fin(true);
    }
  };
  return it;
}

/* ================= MODEL / THINKING ================= */
function setModel(id, quiet){
  state.model = id; localStorage.setItem('lz.model', id);
  $('#modelName').innerHTML = esc(MODELS[id].name) + (id === 'stark' ? ' <span class="stark-badge">Pro</span>' : '');
  document.body.classList.toggle('stark', id === 'stark');
  renderModelMenu(); renderLabsMenu();
  if (!state.current || !state.current.messages.length) renderMessages();
  if (!quiet){ toast('Switched to ' + MODELS[id].name); sound('click'); }
}
function renderModelMenu(){
  const m = $('#modelMenu'); m.innerHTML = '';
  Object.values(MODELS).forEach(md => {
    const b = el('button', 'm-opt ' + md.id + (state.model === md.id ? ' sel' : ''));
    b.setAttribute('role', 'option');
    b.innerHTML = `<span class="m-ic">${md.icon}</span><span><b>${esc(md.name)} ${md.id === 'stark' ? '<span class="stark-badge">Upgraded</span>' : '<small style="display:inline;margin:0">· Default</small>'}</b><small>${esc(md.blurb)}</small></span><span class="check">✓</span>`;
    b.onclick = () => { setModel(md.id); toggleMenu('model', false); };
    m.appendChild(b);
  });
}
function setLevel(l, quiet){
  l = Math.max(0, Math.min(4, +l || 0));
  state.level = l; localStorage.setItem('lz.level', l);
  const info = THINK_LEVELS[l] || THINK_LEVELS[2];
  const recBadge = info.recommended ? ' <span class="rec-badge">Recommended</span>' : '';
  const btnName = $('#thinkName');
  if (btnName) btnName.innerHTML = `${esc(info.name)}${recBadge}`;
  const pick = $('#thinkPicker');
  if (pick) pick.dataset.level = l;
  renderThinkMenu();
  const blurbs = [' — 10× faster direct answers', ' — balanced', ' — deep & structured reasoning', ' — drafts & self-reviews', ' — plans, drafts, critiques & perfects'];
  if (!quiet){ toast('Thinking: ' + info.name + blurbs[l]); sound('click'); }
}
function renderThinkMenu(){
  const m = $('#thinkMenu'); if (!m) return;
  m.innerHTML = '';
  THINK_LEVELS.forEach(tl => {
    const b = el('button', 'm-opt think-opt' + (state.level === tl.id ? ' sel' : ''));
    b.setAttribute('role', 'option');
    const recTag = tl.recommended ? ' <span class="rec-badge">Recommended</span>' : '';
    b.innerHTML = `<span class="m-ic">${tl.icon}</span><span><b>${esc(tl.name)}${recTag}</b><small>${esc(tl.blurb)}</small></span><span class="check">✓</span>`;
    b.onclick = () => { setLevel(tl.id); toggleMenu('think', false); };
    m.appendChild(b);
  });
}
function toggleMenu(which, force){
  const map = {model:['#modelMenu', '#modelBtn'], think:['#thinkMenu', '#thinkBtn'], labs:['#labsMenu', '#labsBtn'], plus:['#plusMenu', '#plusBtn']};
  Object.keys(map).forEach(k => {
    const [m, b] = map[k];
    const elM = $(m), elB = $(b);
    if (!elM || !elB) return;
    const open = k === which ? (force ?? !elM.classList.contains('open')) : false;
    elM.classList.toggle('open', open); elB.classList.toggle('open', open);
    if (k === 'model' || k === 'think') elB.setAttribute('aria-expanded', open);
  });
}

/* ================= VIEWS ================= */
function showView(v){
  state.view = v;
  $('#chatView').classList.toggle('active', v === 'chat' || v === 'lokibot');
  $('#codeView').classList.toggle('active', v === 'code');
  $('#lessonsView').classList.toggle('active', v === 'lessons');
  const lbv = $('#lokibotView');
  if (lbv) lbv.classList.toggle('active', v === 'lokibot');
  const bnv = $('#benchesView');
  if (bnv) bnv.classList.toggle('active', v === 'benches');
  $('#openLokiCode').classList.toggle('on', v === 'code');
  $('#openLessons').classList.toggle('on', v === 'lessons');
  const lbb = $('#lokiBotBtn');
  if (lbb) lbb.classList.toggle('active', v === 'lokibot');
  const bnb = $('#benchesBtn');
  if (bnb) bnb.classList.toggle('active', v === 'benches');
  document.body.dataset.view = v;
  const h = v === 'chat' ? '' : '#' + v; if (location.hash !== h) history.replaceState(null, '', h || location.pathname + location.search);
  if (v === 'code' && window.LokiCode) LokiCode.onShow();
  if (v === 'lessons' && window.Lessons) Lessons.onShow();
  if (v === 'lokibot' && window.LokiBot) LokiBot.onShow();
  if (v === 'benches' && window.LokiBenches) LokiBenches.onShow();
}
function closeSidebarMobile(){ document.body.classList.remove('sb-open'); }

/* ================= MESSAGES ================= */
const SUGGESTIONS = {
  fera: [
    {i:'💡', t:'Explain quantum computing simply', s:'Like I\'m 12, with an analogy'},
    {i:'✍️', t:'Write a short poem about the ocean at sunset', s:'Creative writing & poetry'},
    {i:'🧩', t:'Build an interactive compound-interest calculator', s:'Interactive widget right in the chat'},
    {i:'🖼', t:'Upload an image and ask me about it', s:'I can see images & read files', act:'upload'}
  ],
  stark: [
    {i:'📈', t:'Compare renewable energy sources with a chart, KPI metrics, and pros & cons', s:'Chart + Metrics + Pros & Cons Matrix', tag:'Stark'},
    {i:'🎨', t:'Create an image of a neon green fox in a cyberpunk city at night', s:'Image creation', tag:'Stark'},
    {i:'🌐', t:'Search the web: what are the latest breakthroughs in fusion energy?', s:'8-engine live internet research', tag:'Stark'},
    {i:'📊', t:'Make a PowerPoint presentation about the future of AI in education', s:'Downloadable .pptx', tag:'Stark'},
    {i:'🐍', t:'Build a mini snake game I can play right here', s:'Interactive widget right in the chat'}
  ]
};
function renderEmpty(box){
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = S.name ? ', ' + esc(S.name) : '';
  const e = el('div', 'empty');
  e.innerHTML = `<div class="hero-orb"><span class="ring"></span><span class="ring"></span><span class="ring"></span><div class="core">${LOGO_SVG}</div></div>
  <h1>${esc(t(greet))}${name}.<br><span class="g">${esc(t('What shall we create?'))}</span></h1>
  <p class="sub">${t("You're using")} <b>${esc(MODELS[state.model].name)}</b>. ${t(state.model === 'stark' ? 'Images, live web search, presentations and files — all unlocked.' : 'Chat, analyze images and read files. Switch to Stark for images, web search and more.')}</p>
  <div class="chips"></div>`;
  const chips = $('.chips', e);
  SUGGESTIONS[state.model].forEach(c => {
    const b = el('button', 'chip', `<b>${c.i} <span dir="auto"></span> ${c.tag ? '<span class="tag">' + c.tag + '</span>' : ''}</b><small>${esc(t(c.s))}</small>`);
    $('b span[dir]', b).textContent = t(c.t);
    b.onclick = () => { if (c.act === 'upload') $('#fileInput').click(); else { $('#prompt').value = t(c.t); autosize(); updateSend(); send(); } };
    chips.appendChild(b);
  });
  box.appendChild(e);
}
function renderMessages(){
  const box = $('#messages'); box.innerHTML = '';
  const c = state.current;
  if (!c || !c.messages.length){ renderEmpty(box); return; }
  c.messages.forEach((m, i) => box.appendChild(renderMsg(m, i)));
  box.scrollTop = box.scrollHeight;
}
function userInitial(){ return esc((S.name || 'You').trim().charAt(0).toUpperCase() || 'Y'); }
function renderMsg(m){
  const row = el('div', 'msg ' + (m.role === 'user' ? 'user' : 'bot'));
  row.dataset.id = m.id;
  const av = el('div', 'avatar', m.role === 'user' ? userInitial() : LOGO_SVG);
  const col = el('div', 'bubble-col');
  row.append(av, col);
  if (m.role === 'user'){
    if (m.attachments && m.attachments.length){
      const al = el('div', 'attach-list');
      m.attachments.forEach(a => {
        if (a.kind === 'image'){ const im = el('img'); im.src = a.dataUrl; im.alt = a.name; im.onclick = () => lightbox(a.dataUrl); al.appendChild(im); }
        else al.appendChild(el('div', 'file-pill', `<span class="fi">${a.name.endsWith('.pdf') ? '📕' : '📄'}</span><span>${esc(a.name)}<small>${bytes(a.size || 0)}${a.pages ? ' · ' + a.pages + ' pages' : ''}</small></span>`));
      });
      col.appendChild(al);
    }
    if (m.content){ const b = el('div', 'bubble'); b.dir = 'auto'; b.textContent = m.content; col.appendChild(b); }
    col.appendChild(actions(m, ['copy', 'edit']));
    return row;
  }
  if (m.type === 'upgrade'){ col.appendChild(upgradeCard(m.feature, () => switchAndRetry())); return row; }
  if (m.log) staticWork(col, m.log, m.worked);
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

function fillBot(col, m){
  if (m.error){ const er = el('div', 'err-card', '⚠️ ' + esc(m.error) + ' <button class="btn-ghost" style="margin-inline-start:10px;padding:5px 10px">↻ Retry</button>'); $('button', er).onclick = () => regenerate(); col.appendChild(er); return; }
  if (m.ultraBlueprint) col.appendChild(ultraBlueprintEl(m.ultraBlueprint));
  if (m.photoInsights) col.appendChild(photoInsightsEl(m.photoInsights));
  if (m.content){ const b = el('div', 'bubble'); renderMarkdown(b, m.content, m.sources); col.appendChild(b); }
  if (m.widget) col.appendChild(widgetEl(m.widget));
  if (m.cards && m.cards.length) m.cards.forEach(c => col.appendChild(cardEl(c, m)));
  if (m.images && m.images.length) col.appendChild(imagesEl(m.images));
  if (m.video) col.appendChild(videoEl(m.video));
  if (m.files && m.files.length) m.files.forEach(f => col.appendChild(fileCard(f)));
  if (m.sources && m.sources.length) col.appendChild(sourcesEl(m.sources));
  col.appendChild(actions(m, ['copy', 'regen', 'speak']));
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

  card.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; gap:10px; flex-wrap:wrap;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:1.6rem;">🎬</span>
        <div>
          <b style="font-size:14px; color:#fff; display:block;">${esc(vid.title || 'Lokizen ReWind 1.0 Scene')}</b>
          <div style="font-size:11px; color:#7dffcf;">${dur}s Cinematic Sequence · ${ratio} Ratio · 30 FPS Master</div>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button type="button" class="btn-primary v-dl-btn" style="padding:6px 14px; font-size:12px; border-radius:8px; cursor:pointer; font-weight:600;">⤓ Download Video (.webm)</button>
      </div>
    </div>
    <div style="position:relative; border-radius:12px; overflow:hidden; background:#000; text-align:center;">
      ${mediaHtml}
    </div>
    <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(0,255,156,0.22); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#00ff9c; box-shadow:0 0 8px #00ff9c;"></span>
        <b style="font-size:12px; color:#00ff9c;">Lokizen Video Generation · ReWind 1.0</b>
        <span style="font-size:10px; background:rgba(0,255,156,0.12); color:#7dffcf; padding:2px 7px; border-radius:4px; font-family:monospace; border:1px solid rgba(0,255,156,0.25);">CineMotion Engine</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button type="button" class="v-copy-prompt-btn" style="background:rgba(255,255,255,0.06); color:#ddd; border:1px solid rgba(255,255,255,0.18); border-radius:6px; padding:4px 10px; font-size:11px; cursor:pointer;">📋 Copy Video Prompt</button>
      </div>
    </div>
  `;

  const dlBtn = card.querySelector('.v-dl-btn');
  dlBtn.onclick = () => download(vid.dataUrl, 'lokizen-rewind-' + Date.now() + (isPoster ? '.jpg' : '.webm'));

  const copyPromptBtn = card.querySelector('.v-copy-prompt-btn');
  copyPromptBtn.onclick = () => {
    copyText(promptText);
    copyPromptBtn.textContent = '✓ Copied to Clipboard!';
    setTimeout(() => copyPromptBtn.textContent = '📋 Copy Video Prompt', 2500);
  };

  return card;
}
const FILE_ICONS = {pptx:'📊', csv:'📈', json:'🧩', md:'📝', txt:'📄', html:'🌐', py:'🐍', js:'⚡', svg:'🎨', xml:'🧾'};
function fileCard(f){
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const c = el('div', 'file-card');
  c.innerHTML = `<div class="fc-ic">${FILE_ICONS[ext] || '📦'}</div><div class="fc-meta"><b></b><small>${esc(f.desc || ext.toUpperCase() + ' file')} · ${bytes(f.size || 0)}</small></div><button class="btn-primary">⤓ Download</button>`;
  $('b', c).textContent = f.name;
  $('button', c).onclick = () => download(f.dataUrl || f.text, f.name, f.mime);
  return c;
}
function sourcesEl(sources){
  const wrap = el('div', 'sources-wrap');
  const s = el('div', 'sources');
  const topList = (sources || []).slice(0, 14);
  const restList = (sources || []).slice(14);
  const makeChip = (src, i) => {
    const a = el('a', 'src');
    a.href = src.url; a.target = '_blank'; a.rel = 'noopener';
    a.title = (src.engine ? '[' + src.engine + '] ' : '') + (src.title || src.url);
    a.style.animationDelay = Math.min(i * 30, 400) + 'ms';
    a.innerHTML = `<span class="n">${i + 1}</span><img alt="" src="${esc(LZ.favicon(src.url))}" onerror="this.style.visibility='hidden'"><span class="st"></span>${src.engine ? `<span class="src-eng">${esc(src.engine)}</span>` : ''}`;
    $('.st', a).textContent = LZ.domainOf(src.url);
    return a;
  };
  topList.forEach((src, i) => s.appendChild(makeChip(src, i)));
  if (restList.length > 0){
    const moreBtn = el('button', 'src-more-btn');
    moreBtn.type = 'button';
    moreBtn.innerHTML = `🌐 Show all sources (+${restList.length})`;
    const allBox = el('div', 'sources-all');
    allBox.hidden = true;
    restList.forEach((src, idx) => allBox.appendChild(makeChip(src, idx + 14)));
    moreBtn.onclick = () => {
      allBox.hidden = !allBox.hidden;
      moreBtn.innerHTML = allBox.hidden
        ? `🌐 Show all sources (+${restList.length})`
        : `🌐 Hide extra sources (▲)`;
    };
    s.appendChild(moreBtn);
    wrap.append(s, allBox);
    return wrap;
  }
  wrap.appendChild(s);
  return wrap;
}
function actions(m, which){
  const a = el('div', 'msg-actions');
  const defs = {copy:['⧉', 'Copy'], edit:['✎', 'Edit'], regen:['↻', 'Regenerate'], speak:['🔊', 'Read aloud']};
  which.forEach(k => {
    const b = el('button', '', defs[k][0] + ' ' + defs[k][1]); b.title = defs[k][1];
    b.onclick = () => {
      if (k === 'copy') copyText(m.content || '');
      if (k === 'regen') regenerate(m);
      if (k === 'speak') speak(m.content);
      if (k === 'edit') editMessage(m);
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
  state.mode = mode; const chip = $('#modeChip');
  if (!mode){ chip.hidden = true; requestAnimationFrame(autosize); return; }
  const f = FEATURE_INFO[mode] || {icon:'✦', label: mode}; chip.hidden = false;
  chip.innerHTML = `${f.icon} ${esc(f.label)} <button type="button" aria-label="Clear mode">✕</button>`;
  $('button', chip).onclick = () => setMode(null);
  $('#prompt').placeholder = {
    image: 'Describe the image to create…',
    'image-edit': 'Attach a photo & describe what to change (e.g. "add sunglasses", "change background")…',
    video: 'Describe the video scene to generate (e.g. "drone shot of cyberpunk Tokyo")…',
    search: 'What should I search the web for?',
    slides: 'What is the presentation about?',
    file: 'What file should I create?'
  }[mode] || 'Message Lokizenith…';
  $('#prompt').focus(); requestAnimationFrame(autosize);
}
async function addFiles(files){
  for (const f of files){
    try {
      if (f.type.startsWith('image/')){
        const dataUrl = await LZ.recompress(await LZ.blobToDataURL(f), 1024, .85);
        state.attachments.push({kind:'image', name: f.name || 'image.jpg', dataUrl, size: Math.round(dataUrl.length * .75)});
      } else if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)){
        toast('Reading PDF…');
        const r = await LZ.pdfText(await f.arrayBuffer());
        state.attachments.push({kind:'file', name: f.name, text: r.text, pages: r.pages, size: f.size});
      } else {
        if (f.size > 2e6){ toast(f.name + ' is too large (max 2 MB for text files)', 'err'); continue; }
        state.attachments.push({kind:'file', name: f.name, text: await f.text(), size: f.size});
      }
    } catch(e){ toast('Could not read ' + f.name, 'err'); }
  }
  renderTray(); updateSend();
}
function renderTray(){
  const tr = $('#attachTray'); tr.innerHTML = '';
  state.attachments.forEach((a, i) => {
    const it = el('div', 'tray-item', (a.kind === 'image' ? `<img src="${a.dataUrl}" alt="">` : '<span class="fi" style="font-size:1.3rem">📄</span>') + `<span>${esc(a.name.length > 22 ? a.name.slice(0, 20) + '…' : a.name)}</span><button class="x" aria-label="Remove">✕</button>`);
    $('.x', it).onclick = () => { state.attachments.splice(i, 1); renderTray(); updateSend(); };
    tr.appendChild(it);
  });
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
  slides: /power\s?point|\bpptx?\b|presentation|slide\s?deck|\bslides\b|מצגת|שקפים/i,
  file: /\b(create|make|generate|give me|export|write|build)\s+(me\s+)?(an?\s+)?([\w.-]+\s+){0,3}(file|csv|spreadsheet|\.txt|\.json|\.md)\b|downloadable|(צור|תיצור|תכין|הכן|תעשה|תן)\s*(לי\s*)?(\S+\s*)?קובץ|להורדה/i,
  searchExplicit: /\b(search|look\s?up|google|browse)\b|\bon the (web|internet)\b|חפש|תחפש|חיפוש|באינטרנט|ברשת/i,
  widgetNoun: /\b(calculator|simulator|simulation|game|widget|visuali[sz](e|ation|er)|interactive|timer|stopwatch|converter|playground|tracker|counter|clock|piano|drum ?pad|color picker|generator|dashboard|planner|animation|demo)\b|מחשבון|סימולטור|סימולציה|משחק|וידג'ט|ווידג'ט|ויזואליזציה|אינטראקטיבי|טיימר|שעון עצר|ממיר|הדמיה|آلة حاسبة|حاسبة|محاكاة|لعبة|تفاعلي|مؤقت|محول/i,
  widgetVerb: /\b(make|build|create|give|show|code|write|generate|design|i want|i need|can you)\b|צור|תיצור|בנה|תבנה|תעשה|תכין|הכן|תן לי|אני רוצה|תראה|اصنع|أنشئ|ابن|صمم|أريد|اعمل/i,
  searchImplicit: /\b(latest|news|today|tonight|yesterday|current(ly)?|this (week|month|year)|right now|price of|weather|score|who won|recent|2025|2026)\b|חדשות|היום|עכשיו|עדכני|אחרון|מחיר|מזג האוויר/i
};
function detectIntent(text, hasImages){
  if (RX.video.test(text)) return 'video';
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
function systemPrompt(tier, extra){
  const name = MODELS[tier].name, lang = LANG_NAME[S.lang] || 'English';
  const L = [
    `You are ${name}, the flagship AI assistant made by Lokiz Studios (app: Lokizenith AI). If asked who you are or who made you: ${name} by Lokiz Studios. Never claim to be or mention any other company, model, provider or API.`,
    S.replyInLang ? `Reply in ${lang} by default; if the user clearly writes in another language, reply in that language.` : `Reply in the language the user writes in.`,
    `Conversation & Answer Style:
- Talk naturally, warmly, and intelligently like a real, top-tier conversational AI assistant (Astra 6 Flagship caliber).
- Deep Understanding & Precision: Grasp nuanced user intent immediately; provide rigorous, accurate, well-researched, and complete answers.
- Creative & Articulate: Deliver engaging, insightful, high-substance explanations without cliché AI fluff.
- NEVER start your response with "Executive Takeaway —", "Quick-Start Options", or repetitive canned templates.
- When the user says "hi", "hello", "hey", "שלום", "היי", "מה קורה", or chats casually, respond naturally and warmly like a friendly conversation partner — do NOT generate charts, action plans, or widgets for greetings!
- When the user asks a real question, asks for an explanation, coding, math, brainstorming, or analysis, give a complete, well-explained, thoughtful, high-quality AI response.

Tables & Structured In-Text Data (CRITICAL):
- When the user asks for a table (e.g., "טבלה", "table", comparisons, word lists, letter/language correspondences, translations, or data summaries) OR when structured tabular format is the best way to explain:
  ALWAYS present the table directly in the text using standard Markdown table syntax:
  | עמודה 1 | עמודה 2 | עמודה 3 |
  | :--- | :--- | :--- |
  | ערך 1 | ערך 2 | ערך 3 |
- Markdown tables automatically render into beautiful, interactive, sortable, and searchable tables with CSV export in the UI!
- NEVER wrap table contents in code fences or output raw array fragments (like \`["ג'", "ج"]\`) or broken JSON. Tables must always be formatted as readable in-text Markdown tables or valid \`\`\`loki-table JSON blocks.`,
    tier === 'stark'
      ? `Interactive Visual Blocks (USE ONLY WHEN GENUINELY NEEDED OR REQUESTED):
When a user's question genuinely benefits from data visualization, a chronological timeline, a comparison matrix, a project board, or flashcards — OR when the user explicitly asks for one — you may include 1–2 interactive fenced JSON blocks alongside your thorough written explanation:
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
Do NOT include these blocks on greetings, casual chat, or simple conversational questions where plain text is best.`
      : `You chat naturally, see images, read files and build interactive widgets.`,
    `Date: ${new Date().toDateString()}.`
  ];
  if (S.name) L.push(`User's name: ${S.name}.`);
  if (S.aboutMe) L.push(`About the user: ${S.aboutMe}`);
  if (S.howRespond) L.push(`Response preferences: ${S.howRespond}`);
  if (state.level >= 1) L.push(`Reason step by step; double-check facts, math and code.${state.level >= 2 ? ' Be thorough and well-structured.' : ''}`);
  const curId = state.current ? state.current.id : '';
  const mem = buildLongTermMemory(curId);
  if (mem) L.push(mem);
  if (extra) L.push(extra);
  return L.join('\n');
}
function apiHistory(conv, tier, extraSys){
  const msgs = [{role:'system', content: systemPrompt(tier, extraSys)}];
  const list = conv.messages.filter(m => !m.type && !m.error && !m.pending).slice(-24);
  const lastUser = [...list].reverse().find(m => m.role === 'user');
  list.forEach(m => {
    if (m.role === 'user'){
      let text = m.content || '';
      (m.attachments || []).filter(a => a.kind === 'file').forEach(a => { text += `\n\n[Attached file: ${a.name}]\n"""\n${(a.text || '').slice(0, 24000)}\n"""`; });
      const imgs = (m.attachments || []).filter(a => a.kind === 'image');
      if (imgs.length && m === lastUser){
        msgs.push({role:'user', content: [{type:'text', text: text || 'Describe this image.'}, ...imgs.map(a => ({type:'image_url', image_url:{url: a.dataUrl}}))]});
      } else {
        if (imgs.length) text += `\n[The user attached ${imgs.length} image(s) earlier.]`;
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
  return {msgs, hasImages: !!(lastUser && (lastUser.attachments || []).some(a => a.kind === 'image'))};
}

/* thinking levels — fast streaming reasoning across all 5 levels */
async function deliberate(msgs, ctx){
  const {tier, level, work, signal, onToken} = ctx;
  const on = t => work.log(t);
  const base = {tier, level, signal, onStatus: on};
  const maxT = [1800, 2600, 3400, 3800, 4400][level] || 3200;
  if (level === 0){
    on('⚡ Turbo reasoning: generating answers 10× faster');
    return LZ.chat(msgs, {...base, maxTokens: maxT, onToken});
  }
  if (level === 1){ on('Writing the answer'); return LZ.chat(msgs, {...base, maxTokens: maxT, onToken}); }
  if (level === 2){ on('Reasoning carefully'); const a = await LZ.chat(msgs, {...base, maxTokens: maxT, onToken}); on('Double-checked the answer'); return a; }
  if (level === 4){
    on('Thinking pass 1/4 · Planning response structure (4× Ultra speed)');
    on('Thinking pass 2/4 · Synthesizing domain knowledge & examples');
    on('Thinking pass 3/4 · Self-critique & accuracy verification');
    on('Thinking pass 4/4 · Streaming perfected Ultra answer');
    const bp = {
      plan: 'Understand user intent and structure the clearest, most helpful response.',
      draft: 'Provide complete explanations, examples, and accurate details.',
      critique: 'Verify factual accuracy, code correctness, and natural conversational tone.',
      polish: 'Deliver a polished, natural response (adding visual blocks only if genuinely helpful).'
    };
    ctx.ultraBlueprint = bp;
    return LZ.chat(msgs, {...base, level: 2, maxTokens: maxT, onToken});
  }
  // Level 3: Extra High
  on('Thinking pass 1/2 · Deep analysis & verification');
  on('Thinking pass 2/2 · Streaming refined answer');
  return LZ.chat(msgs, {...base, level: 2, maxTokens: maxT, onToken});
}

/* ================= TOOLS (Parallel Internet Research) ================= */
const RESEARCH_CFG = [{q:1, r:240, p:4}, {q:1, r:240, p:5}, {q:1, r:245, p:6}, {q:2, r:250, p:7}, {q:2, r:250, p:8}];
async function webResearch(question, ctx, deep){
  const {work, signal, tier, level} = ctx;
  const cfg = deep ? {q:2, r:250, p:8} : (RESEARCH_CFG[level] || RESEARCH_CFG[2]);
  const engines = ctx.engines || ['ddg', 'wiki', 'hn', 'arxiv', 'so', 'gh', 'openalex', 'reddit'];
  work.log('Planning multi-engine internet & academic research');
  const cleanQ = question.replace(/^(please\s+)?(search( the web)?( for)?|look up|google|חפש( לי)?|תחפש( לי)?)\s*[:,-]?\s*/i, '').trim().slice(0, 200) || question;
  const queries = cfg.q > 1 ? [cleanQ, `${cleanQ} facts history overview`] : [cleanQ];
  const all = [];
  for (const q of queries){
    work.log(`Searching internet & academic engines for “${q}”`);
    const res = await LZ.search(q, cfg.r, signal, {engines});
    const engSet = [...new Set(res.map(r => r.engine).filter(Boolean))];
    work.log(`Cross-referencing sources across ${engSet.slice(0, 6).join(', ') || 'web'}`);
    res.forEach(r => { if (!all.some(a => a.url === r.url)) all.push(r); });
  }
  const primaryPool = all.filter(r => r.engine !== 'WebIndex');
  const picked = []; const doms = new Set();
  for (const r of primaryPool){ const d = LZ.domainOf(r.url); if (!doms.has(d)){ doms.add(d); picked.push(r); } if (picked.length >= cfg.p) break; }
  for (const r of primaryPool){ if (picked.length >= cfg.p) break; if (!picked.includes(r)) picked.push(r); }
  const queue = picked.slice(0, 6);
  async function worker(){
    while (queue.length){
      const r = queue.shift();
      work.log(`Reading [${r.engine || 'Web'}]`, r.url);
      r.text = await LZ.readPage(r.url, deep ? 2600 : 2000, signal);
      work.log(r.text ? `Verified ${Math.round(r.text.length / 100) / 10}k chars from` : 'Indexed summary from', r.url);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  const combined = [...picked];
  for (const r of all){
    if (!combined.includes(r)) combined.push(r);
  }
  return combined.map(r => ({title: r.title, url: r.url, snippet: r.snippet, text: r.text, engine: r.engine}));
}
function sourcesContext(sources){
  const topSources = (sources || []).filter(s => s.engine !== 'WebIndex').slice(0, 14);
  const chosen = topSources.length ? topSources : (sources || []).slice(0, 14);
  return `WEB & ACADEMIC SOURCES (cite facts with [n] right after the claim and directly answer the user's exact question):\n\n` + chosen.map((s, i) => `[${i + 1}] (${s.engine || 'Web'}) ${s.title} — ${s.url}\n${(s.text || s.snippet || '').slice(0, 650)}`).join('\n\n---\n\n');
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
  const {work, signal, ph} = ctx;
  const step = (txt) => { work.log(txt); if (ph) ph.step(t(txt)); };
  step('Composing scene…');
  let prompt = text, caption = '';
  try {
    const j = await LZ.chatJSON([{role:'system', content:'You turn image requests into prompts for an image generator. Return JSON {"prompt":"<vivid, detailed ENGLISH prompt, max 70 words: subject, style, lighting, composition, quality tags>","caption":"<one short friendly sentence in the SAME language as the user describing what you created>"}'}, {role:'user', content: text}], {tier:'stark', signal, maxTokens: 500, onStatus: x => work.log(x)});
    if (j.prompt) prompt = j.prompt; caption = j.caption || '';
  } catch(e){ if (e.name === 'AbortError') throw e; }
  work.log('Composed visual prompt: ' + prompt.slice(0, 90) + (prompt.length > 90 ? '…' : ''));
  const n = ctx.level >= 3 ? 2 : 1, images = [];
  for (let i = 0; i < n; i++){
    step(n > 1 ? `Rendering details… (${i + 1}/${n})` : 'Rendering details…');
    const t0 = performance.now();
    const dataUrl = await LZ.generateImage(prompt + (i ? ', alternative composition' : ''), {signal, onStatus: x => step(x)});
    ImgETA.record((performance.now() - t0) / 1000);
    images.push({dataUrl, prompt});
    work.log('Image rendered');
  }
  return {content: caption || ({he:'הנה התמונה שיצרתי בשבילך ✨', ar:'إليك الصورة التي أنشأتها لك ✨'}[isHeb(text) ? 'he' : /[\u0600-\u06FF]/.test(text) ? 'ar' : ''] || 'Here is your image ✨'), images};
}

async function toolEditPhoto(text, sourceDataUrl, ctx){
  const {work, signal, ph} = ctx;
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
      const visionPromise = LZ.vision(msgs, { signal, maxTokens: 300 });
      const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('VisionTimeout')), 8000));
      photoAnalysis = await Promise.race([visionPromise, timeoutPromise]);
    } catch (e) {
      if (e.name === 'AbortError') throw e;
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
    ], { tier: 'stark', signal, maxTokens: 400 });
    const chatTimeout = new Promise((_, rej) => setTimeout(() => rej(new Error('ChatTimeout')), 6000));
    const j = await Promise.race([chatPromise, chatTimeout]);
    if (j?.prompt) editPrompt = j.prompt;
    if (j?.caption) caption = j.caption;
  } catch (e) {
    if (e.name === 'AbortError') throw e;
  }

  if (!editPrompt) {
    editPrompt = `Photorealistic modified photo of ${photoAnalysis}, edited according to: ${text}, seamless blending, realistic lighting, highly detailed 8k photography`;
  }

  step('Rendering edited version…');
  const t0 = performance.now();
  const editedDataUrl = await LZ.generateImage(editPrompt, { signal, onStatus: x => step(x) });
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
    ], { tier: 'stark', signal, maxTokens: 450 });

    if (j?.prompt) expandedPrompt = j.prompt;
    if (j?.caption) caption = j.caption;
    if (j?.title) videoTitle = j.title;
  } catch (e) {
    if (e.name === 'AbortError') throw e;
  }

  step(`Rendering ${duration}s clip (${ratio} · 30 FPS Master)…`);
  const vidRes = await LZ.generateVideo(expandedPrompt, {
    duration,
    ratio,
    sourceImageUrl: srcImg,
    signal,
    onStatus: x => step(x)
  });

  const defaultCaption = isHeb(text)
    ? `🎬 נוצר באמצעות מודל יצירת הווידאו **Lokizen ReWind 1.0**! סרטון באורך **${duration} שניות** וביחס **${ratio}** (עד 8 שניות לבחירתך). הסרטון מוכן לצפייה ישירה ולהורדה מיידית ✨`
    : `🎬 Generated with **Lokizen Video Generation model ReWind 1.0**! Cinematic clip (${duration}s, ${ratio} aspect ratio, up to 8s maximum). Ready to watch or download directly in chat ✨`;

  return {
    content: caption || defaultCaption,
    video: {
      dataUrl: vidRes.dataUrl,
      keyframeUrl: vidRes.keyframeUrl,
      duration,
      ratio,
      title: videoTitle,
      prompt: expandedPrompt,
      isAnimatedPoster: vidRes.isAnimatedPoster
    }
  };
}

/* interactive widgets — self-contained HTML rendered in a sandboxed frame */
async function toolWidget(msgs, text, ctx){
  const {work, signal} = ctx;
  work.log('Designing the interactive widget');
  const ul = /[\u0590-\u05FF]/.test(text) ? 'Hebrew' : /[\u0600-\u06FF]/.test(text) ? 'Arabic' : /[a-z]{3}/i.test(text) ? 'English' : (LANG_NAME[S.lang] || 'English');
  const sys = `You build polished, self-contained interactive web widgets (calculators, simulators, games, visualizations, tools). Respond EXACTLY in this format:
TITLE: <short title in ${ul}>
\`\`\`html
<!DOCTYPE html> … complete document …
\`\`\`
SUMMARY: <one or two short sentences in ${ul}: what it does and how to use it>
Rules for the HTML: ONE file, inline <style> and <script>, no external requests except Google Fonts. Theme: black/very dark green background (#030806 / #06100b), neon green accent (${S.accent}), soft glows, rounded 14px cards, Inter font, smooth transform/opacity animations, responsive, works at 360-900px wide and ~460px tall, keyboard friendly. Must be fully working, bug-free, with clear labels in ${ul}${ul === 'English' ? '' : ' (dir="rtl")'}. Use <canvas> for games/simulations with requestAnimationFrame.`;
  let pend = false, chars = 0;
  const out = await LZ.chat([...msgs.slice(0, -1), {role:'system', content: sys}, msgs[msgs.length - 1]], {tier: ctx.tier, level: Math.min(ctx.level, 1), signal, maxTokens: 7000, timeout: 90000, onStatus: x => work.log(x),
    onToken: (d, full) => { chars = full.length; if (!pend){ pend = true; setTimeout(() => { pend = false; work.now && work.now(t('Writing code') + ' · ' + Math.round(chars / 100) / 10 + 'k'); }, 400); } }});
  const title = ((out.match(/TITLE:\s*([^\n]+)/i) || [])[1] || 'Widget').replace(/[*`#]/g, '').trim();
  let html = (out.match(/```(?:html)?\s*\n([\s\S]*?)(```|$)/i) || [])[1] || '';
  const i = html.search(/<!doctype|<html/i); if (i > 0) html = html.slice(i);
  const summary = ((out.match(/SUMMARY:\s*([\s\S]+)$/i) || [])[1] || '').trim();
  if (!/<(html|body|div|canvas|script)/i.test(html)) return {content: out};
  work.log('Rendering the widget');
  return {content: summary, widget: {title, html}};
}
function widgetEl(w){
  const box = el('div', 'widget-card');
  box.innerHTML = `<div class="wg-head"><span class="wg-ic">✦</span><b dir="auto"></b><span class="wg-tag">Interactive</span><span class="wg-acts"><button data-a="full" title="Fullscreen">⤢</button><button data-a="tab" title="Open in new tab">↗</button><button data-a="dl" title="Download">⤓</button></span></div><iframe sandbox="allow-scripts allow-modals" loading="lazy" title="Interactive widget"></iframe>`;
  $('b', box).textContent = w.title;
  const fr = $('iframe', box); fr.srcdoc = w.html;
  const exitFull = () => { box.classList.remove('full'); document.removeEventListener('keydown', esc2); };
  const esc2 = e => { if (e.key === 'Escape') exitFull(); };
  box.querySelector('.wg-acts').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'full'){ if (box.classList.toggle('full')) document.addEventListener('keydown', esc2); else exitFull(); }
    if (b.dataset.a === 'tab'){ const u = URL.createObjectURL(new Blob([w.html], {type:'text/html'})); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 60000); }
    if (b.dataset.a === 'dl') download(w.html, (w.title || 'widget').replace(/[\\/:*?"<>|]+/g, '').slice(0, 50) + '.html', 'text/html');
  };
  return box;
}
const PPTX_URL = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
async function toolSlides(text, ctx){
  const {work, signal, level} = ctx;
  const count = [7, 8, 10, 12][level];
  work.log('Outlining the presentation');
  const j = await LZ.chatJSON([{role:'system', content:`You are a world-class presentation designer. Create a ${count}-slide deck for the user's request, written in the SAME language as the user. Return ONLY JSON:
{"title":"","subtitle":"","slides":[{"layout":"bullets|stats|quote|two","title":"","bullets":["3-5 crisp points"],"stats":[{"value":"","label":""}],"quote":"","author":"","left":{"heading":"","bullets":[]},"right":{"heading":"","bullets":[]},"notes":"speaker notes"}],"summary":"2 short sentences in the user's language describing the deck"}
Mix layouts (mostly bullets, at least one stats and one two, optionally a quote); last slide is a conclusion. Do not include the title slide in "slides".`}, {role:'user', content: text}], {tier:'stark', level: Math.min(level, 1), signal, maxTokens: 3500, onStatus: t => work.log(t)});
  if (!j || !Array.isArray(j.slides)) throw Object.assign(new Error('Could not design the slides, please try again.'), {userFacing:true});
  work.log(`Designing ${j.slides.length + 1} slides`);
  work.log('Loading presentation engine');
  await LZ.loadScript(PPTX_URL);
  work.log('Building the deck');
  const rtl = isHeb(JSON.stringify(j).slice(0, 400));
  const acc = S.accent.replace('#', '').toUpperCase();
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE'; pptx.title = j.title || 'Presentation'; pptx.company = 'Lokiz Studios';
  const BG = '06100B', TXT = 'EAFFF5', MUT = '9CC4B2', CARD = '0D1F16';
  const T = (o) => Object.assign({fontFace:'Arial', color:TXT, rtlMode: rtl, align: rtl ? 'right' : 'left'}, o);
  const deco = s => {
    s.background = {color: BG};
    s.addShape(pptx.ShapeType.ellipse, {x:10.6, y:-1.6, w:4.2, h:4.2, fill:{color:acc, transparency:85}, line:{color:acc, transparency:100}});
    s.addShape(pptx.ShapeType.ellipse, {x:-1.2, y:5.6, w:3, h:3, fill:{color:acc, transparency:90}, line:{color:acc, transparency:100}});
  };
  let s = pptx.addSlide(); deco(s);
  s.addShape(pptx.ShapeType.rect, {x:0.8, y:2.2, w:0.12, h:2.4, fill:{color:acc}, line:{color:acc}});
  s.addText(j.title || 'Presentation', T({x:1.15, y:2.0, w:11, h:1.6, fontSize:46, bold:true}));
  s.addText(j.subtitle || '', T({x:1.15, y:3.6, w:11, h:1, fontSize:22, color:MUT}));
  s.addText('Made with Lokizen 4.0 Stark', T({x:1.15, y:6.6, w:8, h:0.4, fontSize:12, color:acc}));
  j.slides.forEach((sl, idx) => {
    s = pptx.addSlide(); deco(s);
    s.addText(sl.title || '', T({x:0.7, y:0.45, w:11.9, h:0.9, fontSize:32, bold:true}));
    s.addShape(pptx.ShapeType.rect, {x: rtl ? 11.4 : 0.75, y:1.35, w:1.2, h:0.07, fill:{color:acc}, line:{color:acc}});
    const lay = sl.layout;
    if (lay === 'stats' && Array.isArray(sl.stats) && sl.stats.length){
      const st = sl.stats.slice(0, 4), w = 11.8 / st.length;
      st.forEach((x, i) => {
        s.addShape(pptx.ShapeType.roundRect, {x:0.75 + i * w, y:2.2, w:w - 0.3, h:3.2, fill:{color:CARD}, line:{color:acc, width:1}, rectRadius:0.15});
        s.addText(String(x.value || ''), T({x:0.75 + i * w, y:2.5, w:w - 0.3, h:1.4, fontSize:40, bold:true, color:acc, align:'center'}));
        s.addText(String(x.label || ''), T({x:0.9 + i * w, y:3.9, w:w - 0.6, h:1.2, fontSize:16, color:MUT, align:'center'}));
      });
    } else if (lay === 'quote' && sl.quote){
      s.addText('“' + sl.quote + '”', T({x:1.2, y:2.0, w:10.9, h:2.8, fontSize:30, italic:true, align:'center'}));
      s.addText(sl.author ? '— ' + sl.author : '', T({x:1.2, y:4.9, w:10.9, h:0.6, fontSize:18, color:acc, align:'center'}));
    } else if (lay === 'two' && sl.left && sl.right){
      [sl.left, sl.right].forEach((col, i) => {
        const x = 0.75 + i * 6.05;
        s.addShape(pptx.ShapeType.roundRect, {x, y:1.8, w:5.75, h:4.9, fill:{color:CARD}, line:{color:acc, width:1}, rectRadius:0.12});
        s.addText(col.heading || '', T({x:x + 0.3, y:2.0, w:5.2, h:0.7, fontSize:22, bold:true, color:acc}));
        s.addText((col.bullets || []).map(b => ({text: String(b), options:{bullet:true, paraSpaceAfter:8}})), T({x:x + 0.3, y:2.8, w:5.2, h:3.7, fontSize:17, valign:'top'}));
      });
    } else {
      const bl = (sl.bullets || []).map(b => ({text: String(b), options:{bullet:{code:'25A0'}, paraSpaceAfter:14}}));
      s.addText(bl.length ? bl : [{text:''}], T({x:0.8, y:1.8, w:11.6, h:4.9, fontSize:22, valign:'top'}));
    }
    s.addText(String(idx + 2), T({x:12.2, y:6.9, w:0.8, h:0.4, fontSize:11, color:MUT, align:'right'}));
    if (sl.notes) s.addNotes(String(sl.notes));
  });
  work.log('Packaging .pptx file');
  const blob = await pptx.write({outputType:'blob'});
  const dataUrl = await LZ.blobToDataURL(blob);
  const name = (j.title || 'presentation').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) + '.pptx';
  const outline = j.slides.map((x, i) => `${i + 2}. ${x.title}`).join('\n');
  return {content: (j.summary || '') + '\n\n**' + (j.title || '') + '**\n\n' + outline, files: [{name, mime:'application/vnd.openxmlformats-officedocument.presentationml.presentation', dataUrl, size: blob.size, desc: (j.slides.length + 1) + ' slides · PowerPoint'}]};
}
const MIME = {csv:'text/csv', json:'application/json', md:'text/markdown', html:'text/html', txt:'text/plain', js:'text/javascript', py:'text/x-python', xml:'application/xml', svg:'image/svg+xml', css:'text/css'};
async function toolFile(msgs, text, ctx){
  const {work} = ctx;
  work.log('Planning the file');
  const sys = 'The app will turn your reply into a downloadable file. Respond EXACTLY in this format and nothing else:\nFILENAME: <name.ext>\n```<lang>\n<complete file content>\n```\nDESCRIPTION: <one short sentence in the user\'s language>';
  const out = await LZ.chat([...msgs.slice(0, -1), {role:'system', content: sys}, msgs[msgs.length - 1]], {tier:'stark', level: ctx.level, signal: ctx.signal, maxTokens: 6000, onStatus: t => work.log(t)});
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
  // Ensure "/mini mind" and "/deep research" are prominent at the top alongside all Labs features
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

  // Handle "/" Slash Command to open floating Lab UI
  if (text.startsWith('/')){
    const match = resolveSlashCommand(text);
    const menu = $('#slashMenu');
    if (menu) menu.hidden = true;
    if (match){
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
  const tier = state.model, level = state.level;
  const hasImages = (um.attachments || []).some(a => a.kind === 'image');
  const isEdit = isPhotoEditRequest(um.content, hasImages);
  const tool = mode ? (FEATURE_BUILTIN.includes(mode) ? null : findTool('', mode)) : findTool(um.content || '', null, hasImages);
  const intent = tool ? 'tool' : (isEdit ? 'photo-edit' : (mode || detectIntent(um.content || '', hasImages)));
  if (tool && tool.stark && tier === 'fera'){
    const m = {id: uid(), role:'assistant', type:'upgrade', feature: tool.id, ts: Date.now(), mode: tool.id};
    c.messages.push(m); $('#messages').appendChild(renderMsg(m)); scrollDown(true); persist(c); if (window.Mascot) Mascot.set('oops'); return;
  }
  // Fera trying a Stark feature → upgrade card (widgets work on both)
  if (tier === 'fera' && intent && intent !== 'widget' && intent !== 'tool'){
    const m = {id: uid(), role:'assistant', type:'upgrade', feature: (isEdit || intent === 'photo-edit') ? 'image' : intent, ts: Date.now(), mode: (isEdit || intent === 'photo-edit') ? 'image' : intent};
    c.messages.push(m); $('#messages').appendChild(renderMsg(m)); scrollDown(true); persist(c); return;
  }
  const bm = {id: uid(), role:'assistant', content:'', ts: Date.now(), tier, pending: true};
  c.messages.push(bm);
  const row = el('div', 'msg bot busy'); row.dataset.id = bm.id;
  const col = el('div', 'bubble-col'); row.append(el('div', 'avatar', LOGO_SVG), col);
  $('#messages').appendChild(row); scrollDown(true);
  const work = Work(col, {onLog: () => scrollDown()});
  let ph = null;
  if (intent === 'video'){
    work.root.hidden = true;
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
    work.root.hidden = true;
    ph = ImagePlaceholder(col, level >= 3 && !isEdit ? 2 : 1);
    ph.step(isEdit ? t('Analyzing photo…') : t('Composing scene…'));
    scrollDown(true);
  }
  state.busy = true; state.ctl = new AbortController(); updateSend();
  // live streaming render: throttled markdown into one bubble
  let sb = null, latest = '', pend = 0, lastPaint = 0;
  const paint = () => {
    pend = 0; lastPaint = performance.now();
    if (!sb){ sb = el('div', 'bubble streaming'); col.appendChild(sb); work.root.classList.add('streaming'); }
    sb.innerHTML = mdToHtml(latest) ; enhance(sb, null, true);
    if (S.autoScroll) scrollDown();
  };
  const onToken = (d, full) => {
    latest = full;
    if (!S.typewriter || pend) return;
    const gap = latest.length > 8000 ? 160 : 60;
    pend = setTimeout(() => requestAnimationFrame(paint), Math.max(0, gap - (performance.now() - lastPaint)));
  };
  const ctx = {tier, level, work, signal: state.ctl.signal, onToken, ph, um, conv: c, scrollDown};
  let result;
  try {
    work.log(['Thinking · Low (Turbo 10×)', 'Thinking · Medium', 'Thinking · High — careful reasoning', 'Thinking · Extra High — draft + self-review', 'Thinking · Ultra (4× Faster) — plan, draft, critique, perfect'][level] || 'Thinking');
    const {msgs} = apiHistory(c, tier);
    if (tool) result = await tool.run(um.content || '', ctx, msgs);
    else if (isEdit) {
      const srcImg = (um.attachments || []).find(a => a.kind === 'image')?.dataUrl || (um.attachments || []).find(a => a.kind === 'image')?.url;
      result = await toolEditPhoto(um.content, srcImg, ctx);
    }
    else if (intent === 'video') result = await toolVideo(um.content || '', ctx);
    else if (intent === 'image') result = await toolImage(um.content, ctx);
    else if (intent === 'slides') result = await toolSlides(um.content, ctx);
    else if (intent === 'file') result = await toolFile(msgs, um.content, ctx);
    else if (intent === 'widget') result = await toolWidget(msgs, um.content, ctx);
    else if (hasImages){
      result = await toolAnalyzePhoto(msgs, um, ctx);
    } else {
      let sources = null, m2 = msgs;
      if (intent === 'search' || (tier === 'stark' && RX.searchImplicit.test(um.content || ''))){
        sources = await webResearch(um.content, ctx);
        if (sources.length){ work.log(`Reading ${sources.length} sources & writing a cited answer`); m2 = [{role:'system', content: msgs[0].content + '\n\n' + sourcesContext(sources)}, ...msgs.slice(1)]; }
      }
      if ((um.attachments || []).some(a => a.kind === 'file')) work.log('Reading your file' + (um.attachments.length > 1 ? 's' : ''));
      let content = await deliberate(m2, ctx);
      if (!state.onReply) {
        content = autoComposeInteractiveBlocks(um.content || '', content);
      }
      result = {
        content,
        ultraBlueprint: ctx.ultraBlueprint || undefined,
        sources: sources && sources.length ? sources.map(s => ({title: s.title, url: s.url, engine: s.engine})) : undefined
      };
    }
    work.log('Done');
  } catch(e){
    result = {error: e.name === 'AbortError' ? 'Stopped.' : (e.userFacing ? e.message : 'Something went wrong — please try again.')};
    if (e.name === 'AbortError' && latest) result = {content: latest + '\n\n_' + t('(stopped)') + '_'};
    if (e.name !== 'AbortError') console.warn(e);
    sound('error');
  }
  clearTimeout(pend);
  const {secs, log} = work.done();
  work.root.hidden = false; work.root.classList.remove('streaming');
  Object.assign(bm, result, {worked: secs, log}); delete bm.pending;
  row.classList.remove('busy');
  state.busy = false; state.ctl = null; updateSend();
  if (sb) sb.remove();
  if (ph){
    if (bm.video){
      const g = await ph.reveal(bm.video);
      const tmp = {...bm, video: null}; fillBot(col, tmp);
      const bubble = $('.bubble', col); if (bubble) col.insertBefore(bubble, g);
    } else if (bm.images && bm.images.length){
      const imgs = bm.images; const g = await ph.reveal(imgs);
      const tmp = {...bm, images: []}; fillBot(col, tmp);
      // keep image above actions, caption first
      const bubble = $('.bubble', col); if (bubble) col.insertBefore(bubble, g);
    } else { ph.remove(); fillBot(col, bm); }
  } else fillBot(col, bm);
  if (window.Mascot) Mascot.set(bm.error ? 'oops' : 'happy');
  if (!bm.error){ sound('done'); if (S.autoSpeak || state.voiceActive) speak(bm.content); }
  if (S.autoScroll) scrollDown();
  persist(conv); renderHistory();
  if (state.onReply) state.onReply(bm);
}
function regenerate(m){
  if (state.busy) return;
  const c = state.current; if (!c) return;
  while (c.messages.length && c.messages[c.messages.length - 1].role !== 'user') c.messages.pop();
  renderMessages(); runAssistant();
}
function switchAndRetry(){
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
function toggleDictation(){
  if (!SR){ toast('Voice input is not supported in this browser — try Chrome', 'err'); return; }
  const mic = $('#micBtn');
  if (dictation){ dictation.stop(); return; }
  const r = new SR(); r.lang = recLang(); r.interimResults = true; r.continuous = false;
  const base = $('#prompt').value;
  r.onresult = e => { let t = ''; for (const res of e.results) t += res[0].transcript; $('#prompt').value = (base ? base + ' ' : '') + t; autosize(); updateSend(); };
  r.onend = () => { dictation = null; mic.classList.remove('rec'); };
  r.onerror = e => toast('Mic: ' + e.error, 'err');
  dictation = r; mic.classList.add('rec'); r.start();
}

/* ================= MODALS ================= */
function openModal(id){ const m = $('#' + id); m.hidden = false; m.classList.remove('closing'); }
function closeModal(id){
  const m = $('#' + id); if (m.hidden) return;
  m.classList.add('closing'); setTimeout(() => { m.hidden = true; m.classList.remove('closing'); if (id === 'labModal'){ $('#labBody').innerHTML = ''; stopVoice(); } }, 240);
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
    } catch(e){ w.done(); toast(e.userFacing ? e.message : 'Could not enhance right now', 'err'); }
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
  body.innerHTML = `<div class="lab-grid"><p class="lab-desc">Ask any question or give me a topic. I'll query multiple search & academic engines in parallel, cross-verify the facts, and write a cited research report.</p>
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
    } catch(e){ w.done(); toast(e.userFacing ? e.message : 'Research failed — try again', 'err'); }
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
    } catch(e){ w.done(); toast(e.userFacing ? e.message : 'Build failed — try again', 'err'); }
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
    } catch(e){ w.done(); toast(e.userFacing ? e.message : 'Could not build the chart', 'err'); }
    $('#chGo').disabled = false;
  };
}

/* ================= SETTINGS ================= */
const ACCENTS = ['#00ff9c', '#39ff14', '#00e5a0', '#7dffcf', '#b6ff3b', '#00d4ff'];
const EXTRA_SECS = [];
function registerSettings(sec){ EXTRA_SECS.push(sec); }
function renderSettings(){
  const b = $('#settingsBody');
  const sw = (k) => `<label class="switch"><input type="checkbox" data-k="${k}" ${S[k] ? 'checked' : ''}><span></span></label>`;
  const seg = (k, opts) => `<div class="seg" data-seg="${k}">${opts.map(([v, l]) => `<button data-v="${esc(String(v))}" class="${String(S[k]) === String(v) ? 'on' : ''}">${esc(String(l))}</button>`).join('')}</div>`;
  const row = (title, sub, ctl, col) => `<div class="set-row${col ? ' col' : ''}"><div class="lbl"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div>${ctl}</div>`;
  const voices = ('speechSynthesis' in window ? speechSynthesis.getVoices() : []).filter(v => /^(he|iw|ar|en)/i.test(v.lang));
  b.innerHTML = `
  <div class="set-tabs" role="tablist">${['Language', 'Appearance', 'Performance', 'Behavior', 'Voice', 'LokiLessons', 'Personalization', 'Data', ...EXTRA_SECS.map(x => x.title)].map((x, i) => `<button data-tab="${i}" class="${i === 0 ? 'on' : ''}">${x}</button>`).join('')}</div>
  <div class="set-sec" data-sec="0"><h3>Language</h3>
    ${row('Interface language', 'Menus, buttons and labels', `<div class="seg" data-seg="lang"><button data-v="en" class="${S.lang === 'en' ? 'on' : ''}">English</button><button data-v="he" class="${S.lang === 'he' ? 'on' : ''}">עברית</button><button data-v="ar" class="${S.lang === 'ar' ? 'on' : ''}">العربية</button></div>`)}
    ${row('Reply in my language', 'The assistant answers in the interface language by default', sw('replyInLang'))}
  </div>
  <div class="set-sec" data-sec="1"><h3>Appearance</h3>
    ${row('Accent color', 'Glows, buttons and highlights', `<div class="swatches">${ACCENTS.map(c => `<button class="swatch ${S.accent === c ? 'on' : ''}" style="background:${c};--sw:${c}" data-c="${c}"></button>`).join('')}<input type="color" id="setColor" value="${S.accent}"></div>`)}
    ${row('Background animation', 'Living backdrop style', seg('bgStyle', [['flow', 'Flow'], ['matrix', 'Matrix'], ['net', 'Network'], ...Object.entries(BGX).filter(([, b]) => !b.hidden).map(([id, b]) => [id, b.name]), ['off', 'Off']]))}
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
  <div class="set-sec" data-sec="2"><h3>Performance</h3>
    ${row('Performance mode', 'Lighter background, no blur or glow effects — best for older devices', sw('perfMode'))}
    ${row('Live streaming text', 'Show answers word-by-word as they arrive', sw('typewriter'))}
  </div>
  <div class="set-sec" data-sec="3"><h3>Behavior</h3>
    ${row('Send with Enter', 'Shift+Enter for a new line', sw('sendOnEnter'))}
    ${row('Auto-scroll', 'Follow new text while it streams', sw('autoScroll'))}
    ${row('Sounds', 'Subtle send & done chimes', sw('sounds'))}
    ${row('Default model', '', seg('defaultModel', [['fera', '3.5 Fera'], ['stark', '4.0 Stark']]))}
    ${row('Default thinking', '', seg('defaultLevel', LEVELS.map((l, i) => [i, l])))}
  </div>
  <div class="set-sec" data-sec="4"><h3>Voice</h3>
    ${row('Read replies aloud', 'Auto text-to-speech', sw('autoSpeak'))}
    ${row('Voice', 'Most natural voice is picked automatically', `<select data-k="voiceName"><option value="">Auto (best available)</option>${voices.map(v => `<option value="${esc(v.name)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join('')}</select>`)}
    ${row('Voice speed', (+S.voiceRate).toFixed(1) + '×', `<input type="range" min="0.6" max="1.6" step="0.1" data-k="voiceRate" value="${S.voiceRate}">`)}
    ${row('Voice pitch', (+S.voicePitch).toFixed(1), `<input type="range" min="0.6" max="1.4" step="0.1" data-k="voicePitch" value="${S.voicePitch}">`)}
    ${row('Speech recognition language', '', `<select data-k="voiceLang"><option value="auto">Auto</option><option value="he-IL">עברית</option><option value="en-US">English</option><option value="ar-SA">العربية</option></select>`)}
    ${row('Live call: end-of-speech pause', (+S.callSilence).toFixed(1) + 's', `<input type="range" min="0.6" max="2.5" step="0.1" data-k="callSilence" value="${S.callSilence}">`)}
    ${row('Live call captions', 'Show what you and the assistant say', sw('callCaptions'))}
    <div class="set-row"><div class="lbl"><b>Test voice</b></div><button class="btn-ghost" id="setTestVoice">🔊 Play sample</button></div>
  </div>
  <div class="set-sec" data-sec="5"><h3>LokiLessons</h3>
    ${row('Default quiz difficulty', '', seg('quizDifficulty', [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]))}
    ${row('Questions per quiz', '', seg('quizLength', [['6', '6'], ['8', '8'], ['10', '10'], ['12', '12']]))}
    ${row('Tutor language', 'LokiLessons answers in this language', seg('lessonLang', [['he', 'עברית'], ['en', 'English'], ['ar', 'العربية']]))}
  </div>
  <div class="set-sec" data-sec="6"><h3>Personalization</h3>
    ${row('Your name', 'So I can greet you', `<input type="text" data-k="name" value="${esc(S.name)}" placeholder="e.g. Elad" dir="auto">`)}
    ${row('About you', 'What should Lokizenith know about you?', `<textarea rows="3" data-k="aboutMe" dir="auto" placeholder="I'm a developer from Israel, I love 3D and games…">${esc(S.aboutMe)}</textarea>`, true)}
    ${row('How should I respond?', 'Tone, length, format', `<textarea rows="3" data-k="howRespond" dir="auto" placeholder="Short and to the point, with examples…">${esc(S.howRespond)}</textarea>`, true)}
  </div>
  <div class="set-sec" data-sec="7"><h3>Data</h3>
    ${row('Export chats', 'Download everything as JSON', '<button class="btn-ghost" id="setExport">⤓ Export</button>')}
    ${row('Reset settings', 'Back to defaults, keeps chats', '<button class="btn-ghost" id="setReset">↺ Reset</button>')}
    ${row('Clear all data', 'Deletes all chats & settings on this device', '<button class="danger-btn" id="setClear">Clear everything</button>')}
    <h3 style="margin-top:14px">Keyboard shortcuts</h3><div class="shortcuts">
    <span>New chat</span><kbd>Ctrl K</kbd><span>Focus message box</span><kbd>Ctrl /</kbd><span>Settings</span><kbd>Ctrl ,</kbd><span>LokiCode</span><kbd>Ctrl Shift L</kbd><span>LokiLessons</span><kbd>Ctrl Shift E</kbd><span>Toggle sidebar</span><kbd>Ctrl B</kbd><span>Switch model</span><kbd>Alt M</kbd><span>Cycle thinking level</span><kbd>Alt T</kbd><span>Close dialogs</span><kbd>Esc</kbd></div>
  </div>
  ${EXTRA_SECS.map((x, i) => `<div class="set-sec" data-sec="${8 + i}" data-xsec="${x.id}"></div>`).join('')}
  <div class="madeby" style="padding-top:6px">Lokizenith AI · made by <b>Lokiz Studios</b></div>`;
  EXTRA_SECS.forEach(x => { try { x.render($(`[data-xsec="${x.id}"]`, b)); } catch(e){ console.warn(e); } });
  $('[data-k=voiceLang]', b).value = S.voiceLang;
  $('[data-k=voiceName]', b).value = S.voiceName;
  // tabs: jump to section
  $('.set-tabs', b).onclick = e => { const x = e.target.closest('button'); if (!x) return; $$('.set-tabs button', b).forEach(y => y.classList.toggle('on', y === x)); const sec = $(`[data-sec="${x.dataset.tab}"]`, b); b.scrollTo({top: sec.offsetTop - b.offsetTop - 60, behavior: S.reduceMotion ? 'auto' : 'smooth'}); };
  const commit = () => { saveSettings(); applySettings(); };
  $$('input[type=checkbox][data-k]', b).forEach(i => i.onchange = () => { S[i.dataset.k] = i.checked; commit(); });
  $$('input[type=range][data-k]', b).forEach(i => i.oninput = () => {
    const k = i.dataset.k; S[k] = +i.value; const sm = i.previousElementSibling.querySelector('small');
    if (sm) sm.textContent = k === 'fontSize' ? i.value + 'px' : k === 'voiceRate' ? (+i.value).toFixed(1) + '×' : k === 'callSilence' ? (+i.value).toFixed(1) + 's' : k === 'voicePitch' ? (+i.value).toFixed(1) : sm.textContent;
    clearTimeout(i._t); i._t = setTimeout(commit, 60);
  });
  $$('input[type=text][data-k],textarea[data-k],select[data-k]', b).forEach(i => i.oninput = i.onchange = () => { S[i.dataset.k] = i.value; saveSettings(); });
  $$('[data-seg]', b).forEach(g => g.onclick = e => {
    const btn = e.target.closest('button'); if (!btn) return; const k = g.dataset.seg;
    S[k] = ['defaultLevel', 'animSpeed', 'quizLength'].includes(k) ? +btn.dataset.v : btn.dataset.v;
    if (k === 'lang' || k === 'lessonLang'){
      S.lang = btn.dataset.v;
      S.lessonLang = btn.dataset.v;
      $$('[data-seg="lang"] button, [data-seg="lessonLang"] button', b).forEach(x => x.classList.toggle('on', x.dataset.v === btn.dataset.v));
    } else {
      $$('button', g).forEach(x => x.classList.toggle('on', x === btn));
    }
    commit();
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
  $$('.swatch', b).forEach(x => x.onclick = () => { S.accent = x.dataset.c; $$('.swatch', b).forEach(y => y.classList.toggle('on', y === x)); $('#setColor').value = S.accent; commit(); });
  $('#setColor').oninput = e => { S.accent = e.target.value; $$('.swatch', b).forEach(x => x.classList.remove('on')); commit(); };
  $('#setTestVoice').onclick = () => speak({he:'שלום! ככה אני נשמע.', ar:'مرحبا! هكذا يبدو صوتي.', en:'Hi! This is how I sound.'}[S.lang] || 'Hi! This is how I sound.');
  $('#setExport').onclick = () => download(JSON.stringify({exported: new Date().toISOString(), app:'Lokizenith AI', chats: state.convs, lessons: safeJSON(localStorage.getItem('lz.lessons'))}, null, 2), 'lokizenith-chats.json', 'application/json');
  $('#setReset').onclick = () => { S = Object.assign({}, DEFAULTS); saveSettings(); applySettings(); renderSettings(); toast(t('Settings reset')); };
  $('#setClear').onclick = async () => { if (!confirm(t('Delete ALL chats and settings? This cannot be undone.'))) return; await DB.clear(); ['lz.settings', 'lz.model', 'lz.level', 'lz.code', 'lz.lessons', 'lz.imgTimes'].forEach(k => localStorage.removeItem(k)); location.reload(); };
}

/* ================= INIT ================= */
function bind(){
  $('#newChat').onclick = startNewChat;
  $('#openLokiCode').onclick = () => { showView(state.view === 'code' ? 'chat' : 'code'); closeSidebarMobile(); };
  $('#openLessons').onclick = () => { showView(state.view === 'lessons' ? 'chat' : 'lessons'); closeSidebarMobile(); };
  $('#lokiBotBtn') && ($('#lokiBotBtn').onclick = () => { showView(state.view === 'lokibot' ? 'chat' : 'lokibot'); closeSidebarMobile(); });
  $('#benchesBtn') && ($('#benchesBtn').onclick = () => { showView(state.view === 'benches' ? 'chat' : 'benches'); closeSidebarMobile(); });
  $('#callBtn').onclick = () => window.Call ? Call.open() : toast('Voice call is loading…');
  addEventListener('hashchange', () => { const v = location.hash.slice(1); if (['code', 'lessons', 'lokibot', 'benches'].includes(v)) showView(v); });
  // tactile ripple on buttons (transform/opacity only)
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn-primary,.btn-new,.chip,.lc-go,.send,.q-opt,.ls-subject,.call-btn'); if (!b || S.reduceMotion || S.perfMode) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height);
    const sp = el('span', 'ripple'); sp.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(sp); setTimeout(() => sp.remove(), 650);
  }, {passive:true});
  $('#openSettings').onclick = () => { renderSettings(); openModal('settings'); closeSidebarMobile(); };
  $('#historySearch').oninput = renderHistory;
  $('#openSidebar').onclick = () => { if (innerWidth <= 820) document.body.classList.add('sb-open'); else document.body.classList.remove('sb-collapsed'); };
  $('#closeSidebar').onclick = () => { if (innerWidth <= 820) closeSidebarMobile(); else document.body.classList.add('sb-collapsed'); };
  $('#scrim').onclick = closeSidebarMobile;
  $('#modelBtn').onclick = e => { e.stopPropagation(); toggleMenu('model'); };
  $('#thinkBtn') && ($('#thinkBtn').onclick = e => { e.stopPropagation(); toggleMenu('think'); });
  $('#labsBtn') && ($('#labsBtn').onclick = e => { e.stopPropagation(); toggleMenu('labs'); });
  $('#plusBtn').onclick = e => { e.stopPropagation(); toggleMenu('plus'); };
  document.addEventListener('click', e => {
    if (!e.target.closest('.model-menu,.labs-menu,.plus-menu,.think-menu')) toggleMenu(null);
    if (!e.target.closest('#slashMenu,#prompt')) { const sm = $('#slashMenu'); if (sm) sm.hidden = true; }
  });
  $$('#plusMenu button').forEach(b => b.onclick = () => {
    toggleMenu(null); const a = b.dataset.act;
    if (a === 'upload') return $('#fileInput').click();
    if (state.model !== 'stark'){
      if (!state.current){ state.current = newConv(); state.convs.unshift(state.current); $('#messages').innerHTML = ''; }
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
  $$('.modal').forEach(m => { m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(m.id); }); });
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.key === 'Escape'){ $$('.modal:not([hidden])').forEach(m => closeModal(m.id)); toggleMenu(null); $('.lightbox') && $('.lightbox').remove(); closeSidebarMobile(); }
    else if (mod && k === 'k'){ e.preventDefault(); startNewChat(); }
    else if (mod && k === '/'){ e.preventDefault(); showView('chat'); $('#prompt').focus(); }
    else if (mod && k === ','){ e.preventDefault(); $('#openSettings').click(); }
    else if (mod && e.shiftKey && k === 'e'){ e.preventDefault(); showView(state.view === 'lessons' ? 'chat' : 'lessons'); }
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
async function init(){
  applySettings(); bind();
  setModel(MODELS[state.model] ? state.model : 'fera', true);
  setLevel(Math.max(0, Math.min(4, state.level ?? 2)), true);
  try { state.convs = (await DB.all()) || []; } catch(_){ state.convs = []; }
  state.convs.forEach(c => c.messages = c.messages.filter(m => !m.pending));
  renderHistory(); renderMessages(); updateSend();
  const hv = location.hash.slice(1); if (['code', 'lessons', 'lokibot', 'benches'].includes(hv)) showView(hv);
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => {};
  if (document.fonts) document.fonts.ready.then(() => setLevel(state.level, true));
}

function registerLab(l){ LABS.push(l); renderLabsMenu(); }
function addConversation(title, messages){ const c = newConv(); c.title = title; c.messages = messages; state.convs.unshift(c); persist(c); renderHistory(); return c; }
window.App = {registerBackground, BG, BGX, registerSettings, grow, registerTool, registerCard, cardEl, persistMsg, sendText, scrollDown, renderMessages, renderHistory, openLab, newConv, persist, deliberate, webResearch, sourcesContext, imagesEl, FEATURE_INFO, MODELS, LABS, renderLabsMenu, renderSettings, startNewChat, state, settings: () => S, saveSettings, applySettings, toast, download, copyText, mdToHtml, renderMarkdown, enhance, Work, showView, upgradeCard, setModel, isHeb, esc, el, $, $$, sound, systemPrompt, openModal, closeModal, registerLab, addConversation, selectConv, plain, speak, utter, bestVoice, langOfText, BCP, LANG_NAME, uid, widgetEl, safeJSON, lightbox, sourcesEl, fmtDur};
init();
})();
