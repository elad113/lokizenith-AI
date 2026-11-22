/* LokiBot workspace — Lokiz Studios. Vanilla JS; talks to /api/lokibot/* (keys stay server-side). */
(function(){
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const M = window.LokiMascots;
const COLORS = ['#10e39a','#7c5cff','#ff6b6b','#f59f00','#228be6','#e64980','#15aabf','#82c91e'];
const S = { bots: [], groups: [], computer: { connected: false }, usage: null, maxBots: 6, sel: null, busy: false, ctl: null, viewBot: null, streams: {}, mission: null, missionOff: null, moods: {}, lastSeq: 0 };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const EMBED = new URLSearchParams(location.search).has('embed') || window.top !== window;
if (EMBED) document.body.classList.add('lb-embed');
/* Back to the Lokizenith chat: inside the app, switch the parent view; standalone, go home. */
document.querySelectorAll('a[href="/"]').forEach((a) => a.addEventListener('click', (e) => {
  if (!EMBED) return; e.preventDefault();
  try { window.parent.postMessage({ type: a.closest('#lbGate') ? 'lokibot:signin' : 'lokibot:back' }, location.origin); } catch (_) { location.href = '/'; }
}));

function headers(json = true){ const h = {}; if (json) h['Content-Type'] = 'application/json'; const t = localStorage.getItem('lz.authToken'); if (t) h['x-lz-token'] = t; return h; }
async function api(path, opts = {}){
  const r = await fetch('/api/lokibot' + path, { method: opts.method || (opts.body ? 'POST' : 'GET'), headers: headers(), body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: 'same-origin' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || ('HTTP ' + r.status)); e.status = r.status; e.code = j.code; throw e; }
  return j;
}
/** Read an SSE response (POST or GET) and call onEvent per JSON event. */
async function readSSE(path, opts, onEvent, signal){
  const r = await fetch('/api/lokibot' + path, { method: opts.method || 'POST', headers: headers(), body: opts.body ? JSON.stringify(opts.body) : undefined, signal, credentials: 'same-origin' });
  const ct = r.headers.get('content-type') || '';
  if (!r.ok || !ct.includes('event-stream')) { const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || ('HTTP ' + r.status)), { status: r.status }); return j; }
  const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
  for (;;) {
    const { value, done } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i; while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      for (const line of chunk.split('\n')) if (line.startsWith('data: ')) { try { onEvent(JSON.parse(line.slice(6))); } catch (_) {} }
    }
  }
}
// BUI-21: LokiBot sounds (shared kit in /sfx.js; Settings → Sounds + volume in the main app).
const sfx = (k) => { try { window.LZSfx && window.LZSfx.play(k); } catch (_) {} };
const missionDoneCount = {};
function toast(msg){ const t = $('#lbToast'); t.textContent = msg; t.hidden = false; t.classList.remove('in'); void t.offsetWidth; t.classList.add('in'); clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3800); }

/* ---------- markdown-lite ---------- */
function md(s){
  let h = esc(s);
  h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, l, c) => '<pre><code>' + c + '</code></pre>');
  h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|\s)\*([^*\n]+)\*/g, '$1<i>$2</i>');
  h = h.replace(/^#{1,3} (.+)$/gm, '<b class="lb-h">$1</b>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  h = h.replace(/(^|\s)@([\w\u0590-\u05ff-]+)/g, '$1<span class="lb-at">@$2</span>');
  return h;
}

/* ---------- mascots & moods ---------- */
const botById = (id) => S.bots.find((b) => b.id === id);
function avatar(bot, size){
  const el = M.el(bot ? bot.mascot : 'orbit', bot ? bot.color : '#10e39a', (bot && S.moods[bot.id]) || 'idle');
  if (bot) el.dataset.bot = bot.id;
  if (size) { el.style.width = el.style.height = size + 'px'; }
  return el;
}
function setMood(botId, mood, ms){
  if (!botId) return;
  S.moods[botId] = mood;
  $$('.lb-av[data-bot="' + botId + '"]').forEach((a) => { a.className = a.className.replace(/st-\w+/, 'st-' + mood); });
  clearTimeout(setMood['t' + botId]);
  if (ms) setMood['t' + botId] = setTimeout(() => setMood(botId, 'idle'), ms);
}
function confetti(x, y){
  if (reduce) return;
  const host = document.createElement('div'); host.className = 'lb-confetti';
  host.style.left = (x ?? innerWidth / 2) + 'px'; host.style.top = (y ?? innerHeight / 3) + 'px';
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('i');
    const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 180;
    p.style.setProperty('--x', Math.cos(a) * d + 'px'); p.style.setProperty('--y', (Math.sin(a) * d - 60) + 'px');
    p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    p.style.background = COLORS[i % COLORS.length]; p.style.animationDelay = (Math.random() * 0.12) + 's';
    if (i % 3 === 0) p.classList.add('star');
    host.appendChild(p);
  }
  document.body.appendChild(host); setTimeout(() => host.remove(), 1700);
}

/* ---------- state ---------- */
async function load(){
  let st;
  try { st = await api('/state'); }
  catch (e) { if (e.status === 401) return showGate(); toast(e.message); return; }
  S.bots = st.bots; S.groups = st.groups; S.computer = st.computer; S.usage = st.usage; S.maxBots = st.maxBots;
  renderSide(); renderUsage();
  const want = location.hash.slice(1).split(':');
  if (want[0] === 'group' && S.groups.some((g) => g.id === want[1])) select('group', want[1]);
  else if (want[0] === 'bot' && S.bots.some((b) => b.id === want[1])) select('bot', want[1]);
  else if (S.bots[0]) select('bot', S.bots[0].id);
  else renderEmpty();
  banner();
}
function showGate(){ const g = $('#lbGate'); g.hidden = false; $('#lbGateMascot').appendChild(M.el('pebble', '#10e39a', 'happy')); }
function banner(){
  const b = $('#lbBanner');
  if (!S.computer.connected) { b.hidden = false; b.innerHTML = '🔌 <b>Computer not connected.</b> The server has no cloud-computer key yet, so bots can chat but cannot use a Linux computer.'; }
  else b.hidden = true;
}
function renderUsage(){
  const u = S.usage; if (!u) return;
  const pct = Math.min(100, (u.usedHours / u.limitHours) * 100);
  $('#lbUsage').innerHTML = `Computer time this month<br><b>${u.usedHours} h</b> of ${u.limitHours} h<div class="bar"><i style="width:${pct}%"></i></div>`;
}

/* ---------- sidebar ---------- */
function renderSide(){
  const bl = $('#lbBots'); bl.innerHTML = '';
  S.bots.forEach((b, i) => {
    const it = document.createElement('button'); it.className = 'lb-item'; it.style.animationDelay = (i * 40) + 'ms';
    if (S.sel && S.sel.type === 'bot' && S.sel.id === b.id) it.classList.add('on');
    it.appendChild(avatar(b));
    it.insertAdjacentHTML('beforeend', `<span class="t"><b>${esc(b.name)}</b><small>${esc(b.persona || M.names[b.mascot] || '')}</small></span>${b.running ? '<span class="lb-run" title="Computer running"></span>' : ''}`);
    it.onclick = () => select('bot', b.id);
    bl.appendChild(it);
  });
  if (!S.bots.length) bl.innerHTML = '<p class="lb-note" style="padding:4px 8px">No bots yet — create your first one.</p>';
  const gl = $('#lbGroups'); gl.innerHTML = '';
  S.groups.forEach((g) => {
    const it = document.createElement('button'); it.className = 'lb-item';
    if (S.sel && S.sel.type === 'group' && S.sel.id === g.id) it.classList.add('on');
    const st = document.createElement('span'); st.className = 'lb-stack';
    g.botIds.slice(0, 4).forEach((id) => { const b = botById(id); if (b) st.appendChild(avatar(b)); });
    it.appendChild(st);
    const live = g.mission && ['planning', 'running', 'paused'].includes(g.mission.status);
    it.insertAdjacentHTML('beforeend', `<span class="t"><b>${esc(g.name)}</b><small>${live ? (g.mission.status === 'paused' ? '⏸ mission paused' : '⚡ mission running') : g.botIds.length + ' bots'}</small></span>`);
    it.onclick = () => select('group', g.id);
    gl.appendChild(it);
  });
}

/* ---------- selection & chat ---------- */
function cur(){ if (!S.sel) return null; return S.sel.type === 'bot' ? botById(S.sel.id) : S.groups.find((g) => g.id === S.sel.id); }
function select(type, id){
  if (S.busy && S.ctl) { /* keep running turn; switching view is fine */ }
  if (S.missionOff) { S.missionOff.abort(); S.missionOff = null; }
  S.sel = { type, id }; location.hash = type + ':' + id;
  const main = $('.lb-main'); main.classList.remove('enter'); void main.offsetWidth; main.classList.add('enter');
  renderSide(); renderHead(); renderMsgs(); renderMission();
  if (type === 'bot') S.viewBot = id; else { const g = cur(); S.viewBot = (g && g.botIds.includes(S.viewBot)) ? S.viewBot : g && g.botIds[0]; }
  renderPanel();
  $('#lbInput').placeholder = type === 'group' ? 'Give the team a mission — they keep working on their own. Use @name to ask one bot.' : `Message ${cur().name}…`;
  if (type === 'group') { const g = cur(); if (g.mission && ['planning', 'running', 'paused'].includes(g.mission.status)) followMission(g); }
  $('#lbApp').classList.remove('side-open');
}
function renderHead(){
  const h = $('#lbHeadWho'); h.innerHTML = ''; const c = cur(); if (!c) return;
  if (S.sel.type === 'bot') { h.appendChild(avatar(c, 38)); h.insertAdjacentHTML('beforeend', `<span><b>${esc(c.name)}</b><small>${esc(c.persona || 'LokiBot · ' + M.names[c.mascot])}</small></span>`); $('#lbEditBot').hidden = false; $('#lbEditBot').textContent = 'Edit'; }
  else { const st = document.createElement('span'); st.className = 'lb-stack big'; c.botIds.forEach((id) => { const b = botById(id); if (b) st.appendChild(avatar(b, 30)); }); h.appendChild(st); h.insertAdjacentHTML('beforeend', `<span><b>${esc(c.name)}</b><small>${c.botIds.map((id) => '@' + esc((botById(id) || {}).name)).join(' · ')}</small></span>`); $('#lbEditBot').hidden = false; $('#lbEditBot').textContent = 'Delete team'; }
}
function renderEmpty(){
  $('#lbHeadWho').innerHTML = ''; $('#lbEditBot').hidden = true;
  const box = $('#lbMsgs'); box.innerHTML = '';
  const e = document.createElement('div'); e.className = 'lb-empty';
  const row = document.createElement('div'); row.className = 'lb-hero';
  ['pebble', 'comet', 'crystal', 'ember', 'sprout', 'orbit'].forEach((k, i) => { const a = M.el(k, COLORS[i], 'idle'); row.appendChild(a); });
  e.appendChild(row);
  e.insertAdjacentHTML('beforeend', '<h2>Meet LokiBot</h2><p>AI bots that each get their <b>own real Linux computer</b>. Chat with one, or put a few in a team and give them a mission — they keep working together until it’s done.</p>');
  const b = document.createElement('button'); b.className = 'lb-btn'; b.textContent = '＋ Create your first bot'; b.onclick = () => openBotDlg();
  e.appendChild(b); box.appendChild(e);
  renderPanel();
}
function msgEl(m, group){
  const bot = m.botId ? botById(m.botId) : null;
  if (m.role === 'tool') return toolEl({ tool: m.tool, output: m.text.replace(/^[\w_]+: /, ''), ok: !/exit [1-9]|error|failed/i.test(m.text) }, bot);
  const w = document.createElement('div'); w.className = 'lb-m ' + (m.role === 'user' ? 'user' : 'bot');
  if (m.role !== 'user') w.appendChild(bot ? avatar(bot) : M.el('orbit', '#10e39a', 'idle'));
  const bub = document.createElement('div'); bub.className = 'lb-bub';
  if (m.role !== 'user' && group) bub.innerHTML = `<div class="lb-who">${esc(bot ? bot.name : 'Team')}</div>`;
  bub.insertAdjacentHTML('beforeend', '<div class="lb-txt">' + md(m.text) + '</div>');
  w.appendChild(bub); return w;
}
function renderMsgs(){
  const box = $('#lbMsgs'); box.innerHTML = ''; const c = cur(); if (!c) return renderEmpty();
  if (!c.messages.length) {
    const e = document.createElement('div'); e.className = 'lb-empty';
    if (S.sel.type === 'bot') {
      e.appendChild(avatar(c, 96));
      e.insertAdjacentHTML('beforeend', `<h2>Hi, I’m ${esc(c.name)}</h2><p>I have my own Linux computer. Ask me to do something real on it.</p>`);
      const sg = document.createElement('div'); sg.className = 'lb-sugg';
      ['What Linux is on your computer? Show me with a command', 'Write a Python script that prints the first 20 primes and run it', 'Open Firefox on your desktop and go to lokizenith.com'].forEach((t) => { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { $('#lbInput').value = t; send(); }; sg.appendChild(b); });
      e.appendChild(sg);
    } else {
      const st = document.createElement('div'); st.className = 'lb-hero'; c.botIds.forEach((id) => { const b = botById(id); if (b) st.appendChild(avatar(b, 72)); }); e.appendChild(st);
      e.insertAdjacentHTML('beforeend', `<h2>${esc(c.name)}</h2><p>Describe a mission. The coordinator makes a checklist, splits it across the team, and the bots keep working and talking to each other until it’s finished — no more prompts needed. Pause, stop or jump in anytime.</p>`);
      const sg = document.createElement('div'); sg.className = 'lb-sugg';
      ['Build a small Python CLI that converts CSV to JSON, test it, and document it', 'Research the 3 most popular JS frameworks: check their latest versions with npm and compare them'].forEach((t) => { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { $('#lbInput').value = t; send(); }; sg.appendChild(b); });
      e.appendChild(sg);
    }
    box.appendChild(e); return;
  }
  c.messages.forEach((m) => box.appendChild(msgEl(m, S.sel.type === 'group')));
  box.scrollTop = box.scrollHeight;
}
function scrollDown(){ const b = $('#lbMsgs'); if (b.scrollHeight - b.scrollTop - b.clientHeight < 260) b.scrollTo({ top: b.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }); }
function toolEl(e, bot){
  const w = document.createElement('div'); w.className = 'lb-tool';
  const icon = { shell: '⌨', screenshot: '📸', open_app: '🪟', open: '🔗', click: '🖱', double_click: '🖱', type: '⌨', key: '⌨', scroll: '↕', write_file: '📝', read_file: '📄', remember: '🧠', cursor_agent: '🛠' }[e.tool] || '⚙';
  const arg = e.args ? (e.args.cmd || e.args.command || e.args.path || e.args.app || e.args.target || e.args.url || e.args.text || e.args.key || e.args.fact || '') : '';
  w.innerHTML = `<details${e.image ? ' open' : ''}><summary class="${e.ok === false ? 'bad' : ''}">${icon} ${bot ? esc(bot.name) + ' · ' : ''}<b>${esc(e.tool)}</b> ${arg ? '<code>' + esc(String(arg).slice(0, 90)) + '</code>' : ''}</summary>${e.image ? `<img src="${e.image}" alt="screenshot">` : ''}<pre>${esc(e.output || '')}</pre></details>`;
  return w;
}
function typing(bot){ const w = document.createElement('div'); w.className = 'lb-m bot lb-typing-row'; w.appendChild(bot ? avatar(bot) : M.el('orbit', '#10e39a', 'thinking')); w.insertAdjacentHTML('beforeend', '<div class="lb-bub lb-typing"><span></span><span></span><span></span></div>'); return w; }
function status(text, bot){ const s = document.createElement('div'); s.className = 'lb-status'; s.textContent = (bot ? bot.name + ': ' : '') + text; return s; }
async function typeOut(el, text){
  const html = md(text);
  if (reduce || text.length > 1800) { el.innerHTML = html; return; }
  const words = text.split(/(\s+)/); let acc = '';
  const step = Math.max(1, Math.ceil(words.length / 90));
  for (let i = 0; i < words.length; i += step) { acc += words.slice(i, i + step).join(''); el.innerHTML = md(acc) + '<span class="lb-caret"></span>'; scrollDown(); await new Promise((r) => setTimeout(r, 16)); }
  el.innerHTML = html;
}
function addTask(e, bot){
  const t = $('#lbTasks'); if (!t) return;
  const d = document.createElement('div'); d.className = 'lb-task ' + (e.ok === false ? 'bad' : 'ok');
  d.innerHTML = `<b>${esc(e.tool)}</b> ${bot ? '· ' + esc(bot.name) : ''}<small>${esc(String(e.output || '').slice(0, 160))}</small>`;
  t.prepend(d);
}
/** Render one streamed agent event into the chat. */
function onAgentEvent(e, ctx){
  const bot = e.botId ? botById(e.botId) : ctx.bot;
  const box = $('#lbMsgs');
  if (ctx.typingEl && e.type !== 'status') { ctx.typingEl.remove(); ctx.typingEl = null; }
  if (e.type === 'status' && e.text) { setMood(bot && bot.id, 'thinking'); box.appendChild(status(e.text, S.sel.type === 'group' ? bot : null)); }
  else if (e.type === 'plan') box.appendChild(status('🧭 ' + e.text));
  else if (e.type === 'bot') { setMood(bot && bot.id, 'thinking'); box.appendChild(status('▶ ' + (e.text || '').slice(0, 200), bot)); }
  else if (e.type === 'tool') {
    setMood(bot && bot.id, 'working');
    box.appendChild(toolEl(e, S.sel.type === 'group' ? bot : null)); addTask(e, bot);
    if (bot && ['shell', 'screenshot', 'open_app', 'open', 'click', 'type', 'key', 'write_file'].includes(e.tool)) { bot.running = true; bot.hasComputer = true; if (S.viewBot === bot.id) renderPanel(); }
    if (e.tool === 'shell' && S.viewBot === (bot && bot.id)) termAppend(`$ ${e.args && (e.args.cmd || e.args.command) || ''}`, 'c'), termAppend(e.output || '');
    if (e.image && S.viewBot === (bot && bot.id) && !$('#lbScreen iframe')) showShot(e.image);
  }
  else if (e.type === 'reply') {
    sfx('botReply');
    const el = msgEl({ role: 'bot', text: '', botId: bot && bot.id }, S.sel.type === 'group' && !!bot);
    box.appendChild(el); typeOut($('.lb-txt', el), e.text || '');
    if (bot) { setMood(bot.id, 'happy', 2600); const a = $('.lb-av', el); const r = a && a.getBoundingClientRect(); confetti(r ? r.left + 20 : undefined, r ? r.top : undefined); }
    else confetti();
  }
  else if (e.type === 'error') { sfx('error'); box.appendChild(status('⚠ ' + (e.text || 'error'), bot)); if (bot) setMood(bot.id, 'idle'); }
  scrollDown();
}

async function send(){
  const inp = $('#lbInput'); const text = inp.value.trim(); const c = cur();
  if (!text || !c) return;
  if (S.busy && S.sel.type === 'bot') return toast('Wait for the bot to finish (or press Stop).');
  inp.value = ''; autosize(); sfx('send');
  const box = $('#lbMsgs'); if ($('.lb-empty', box)) box.innerHTML = '';
  const um = { role: 'user', text, ts: Date.now() }; c.messages.push(um); box.appendChild(msgEl(um)); scrollDown();
  if (S.sel.type === 'group') return sendGroup(c, text);
  const ctx = { bot: c, typingEl: typing(c) }; box.appendChild(ctx.typingEl); setMood(c.id, 'thinking');
  S.busy = true; S.ctl = new AbortController(); $('#lbStop').hidden = false; $('#lbSend').disabled = true;
  try {
    await readSSE('/bots/' + c.id + '/chat', { body: { text } }, (e) => {
      if (e.type === 'done') return;
      onAgentEvent(e, ctx);
      if (e.type === 'reply') c.messages.push({ role: 'bot', text: e.text, botId: c.id, ts: Date.now() });
      if (e.type === 'tool') c.messages.push({ role: 'tool', tool: e.tool, text: e.tool + ': ' + String(e.output || '').slice(0, 1500), botId: c.id });
    }, S.ctl.signal);
  } catch (e) { if (e.name !== 'AbortError') { box.appendChild(status('⚠ ' + e.message)); } setMood(c.id, 'idle'); }
  finally { if (ctx.typingEl) ctx.typingEl.remove(); S.busy = false; S.ctl = null; $('#lbStop').hidden = true; $('#lbSend').disabled = false; refreshUsage(); renderSide(); }
}
async function sendGroup(g, text){
  const box = $('#lbMsgs');
  const mentioned = g.botIds.map(botById).filter((b) => b && new RegExp('@' + b.name.split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])', 'i').test(text));
  if (mentioned.length) {
    const ctx = { bot: null, typingEl: typing(mentioned[0]) }; box.appendChild(ctx.typingEl);
    try { await readSSE('/groups/' + g.id + '/chat', { body: { text } }, (e) => { if (e.type === 'done') return; onAgentEvent(e, ctx); if (e.type === 'reply') g.messages.push({ role: 'bot', text: e.text, botId: e.botId }); }); }
    catch (e) { box.appendChild(status('⚠ ' + e.message)); }
    finally { if (ctx.typingEl) ctx.typingEl.remove(); }
    return;
  }
  try {
    const r = await api('/groups/' + g.id + '/chat', { body: { text } });
    g.mission = r.mission;
    if (r.interjected) toast('Sent to the team — they’ll take it into account.');
    renderMission(); renderSide(); followMission(g);
  } catch (e) { box.appendChild(status('⚠ ' + e.message)); }
}

/* ---------- missions ---------- */
function followMission(g){
  if (S.missionOff) S.missionOff.abort();
  const ctl = new AbortController(); S.missionOff = ctl;
  const ctx = { bot: null };
  const run = async () => {
    let since = 0;
    for (let tries = 0; tries < 30 && !ctl.signal.aborted; tries++) {
      try {
        await readSSE('/groups/' + g.id + '/mission/stream?since=' + since, { method: 'GET' }, (e) => {
          if (e.seq) since = e.seq;
          if (e.kind === 'mission' && e.mission !== undefined) { if (e.mission) { g.mission = e.mission; renderMission(); renderSide(); } return; }
          if (S.sel && S.sel.type === 'group' && S.sel.id === g.id) {
            onAgentEvent(e, ctx);
            if (e.type === 'reply') g.messages.push({ role: 'bot', text: e.text, botId: e.botId });
          }
        }, ctl.signal);
      } catch (e) { if (ctl.signal.aborted) return; }
      if (!g.mission || !['planning', 'running', 'paused'].includes(g.mission.status)) return;
      await new Promise((r) => setTimeout(r, 1500));
    }
  };
  run();
}
function renderMission(){
  let card = $('#lbMission');
  const g = S.sel && S.sel.type === 'group' ? cur() : null;
  const m = g && g.mission;
  if (!m) { if (card) card.remove(); $('#lbInput').placeholder = g ? 'Give the team a mission — they keep working on their own. Use @name to ask one bot.' : $('#lbInput').placeholder; return; }
  if (!card) { card = document.createElement('div'); card.id = 'lbMission'; card.className = 'lb-mission'; $('.lb-main').insertBefore(card, $('#lbMsgs')); }
  const live = ['planning', 'running', 'paused'].includes(m.status);
  const done = m.checklist.filter((i) => i.status === 'done').length, total = m.checklist.length || 1;
  const pct = m.status === 'done' ? 100 : Math.round((done / total) * 100);
  const label = { planning: '🧭 Planning', running: '⚡ Running on its own', paused: '⏸ Paused', stopped: '⏹ Stopped', done: '✅ Complete', failed: '⚠ Failed' }[m.status];
  card.className = 'lb-mission st-' + m.status;
  card.innerHTML = `<div class="lb-mis-top"><span class="lb-mis-st">${label}</span><span class="lb-mis-goal">${esc(m.goal)}</span><span class="lb-grow"></span>
    <span class="lb-mis-meta">${m.turns}/${m.maxTurns} turns · ~${Math.round(m.tokens / 1000)}k tokens</span>
    ${live ? (m.status === 'paused' ? '<button class="lb-btn sm" data-op="resume">Resume</button>' : '<button class="lb-btn sm ghost" data-op="pause">Pause</button>') + '<button class="lb-btn sm ghost danger" data-op="stop">Stop</button>' : ''}
    <button class="lb-mini" data-op="fold" title="Show/hide checklist">${card.dataset.fold ? '▾' : '▴'}</button></div>
    <div class="lb-prog"><i style="width:${pct}%"></i></div>
    <ol class="lb-check" ${card.dataset.fold ? 'hidden' : ''}></ol>${m.reason && !live ? `<div class="lb-note">${esc(m.reason)}</div>` : ''}`;
  const ol = $('.lb-check', card);
  m.checklist.forEach((it) => {
    const li = document.createElement('li'); li.className = 'ck-' + it.status;
    const b = botById(it.botId); if (b) li.appendChild(avatar(b, 22));
    li.insertAdjacentHTML('beforeend', `<span class="ck-box">${it.status === 'done' ? '✓' : it.status === 'doing' ? '' : it.status === 'blocked' ? '!' : ''}</span><span class="ck-t">${esc(it.text)}</span>`);
    ol.appendChild(li);
  });
  $$('button[data-op]', card).forEach((b) => b.onclick = async () => {
    const op = b.dataset.op;
    if (op === 'fold') { card.dataset.fold = card.dataset.fold ? '' : '1'; return renderMission(); }
    try { const r = await api('/groups/' + g.id + '/mission/' + op, { body: {} }); if (r.mission) g.mission = r.mission; renderMission(); renderSide(); } catch (e) { toast(e.message); }
  });
  const mk = g.id + ':' + (m.id || m.startedAt || '');
  if (missionDoneCount[mk] != null && done > missionDoneCount[mk] && m.status !== 'done') sfx('stepDone');
  missionDoneCount[mk] = done;
  if (m.status === 'done' && !card.dataset.cheered) { card.dataset.cheered = '1'; confetti(); sfx('mission'); }
  $('#lbInput').placeholder = live ? 'Jump in: tell the team something while they work…' : 'Give the team a new mission…';
}

/* ---------- right panel: computer / terminal / tasks / memory ---------- */
function panelBot(){ return S.viewBot ? botById(S.viewBot) : null; }
function renderPanel(){
  const b = panelBot();
  const g = S.sel && S.sel.type === 'group' ? cur() : null;
  let chips = $('#lbCompChips');
  if (!chips) { chips = document.createElement('div'); chips.id = 'lbCompChips'; chips.className = 'lb-chips'; $('[data-pane="computer"]').prepend(chips); }
  chips.innerHTML = '';
  if (g) g.botIds.forEach((id) => { const x = botById(id); if (!x) return; const c = document.createElement('button'); c.className = 'lb-chip' + (id === S.viewBot ? ' on' : ''); c.appendChild(avatar(x, 20)); c.insertAdjacentHTML('beforeend', esc(x.name)); c.onclick = () => { S.viewBot = id; renderPanel(); }; chips.appendChild(c); });
  const dot = $('#lbCompDot'), st = $('#lbCompState'), note = $('#lbCompNote');
  const screen = $('#lbScreen'), empty = $('#lbScreenEmpty');
  const stream = b && S.streams[b.id];
  $('#lbCompStart').disabled = $('#lbCompShot').disabled = $('#lbCompPause').disabled = !b || !S.computer.connected;
  if (!S.computer.connected) { dot.className = 'lb-dot'; st.textContent = 'Computer not connected'; note.textContent = 'The server has no cloud-computer key, so no Linux computer can start.'; }
  else if (!b) { dot.className = 'lb-dot'; st.textContent = 'No bot selected'; note.textContent = ''; }
  else if (b.running) { dot.className = 'lb-dot on'; st.innerHTML = `<b>${esc(b.name)}</b>’s computer is <b class="lb-live">LIVE</b>`; note.textContent = `Real Ubuntu desktop in the cloud (${S.computer.provider}). It stops by itself after ${S.computer.idleMinutes} min idle.`; }
  else { dot.className = 'lb-dot'; st.innerHTML = `<b>${esc(b.name)}</b>’s computer is ${b.hasComputer ? 'stopped' : 'not created yet'}`; note.textContent = 'Press Start to boot it, or just ask the bot to do something.'; }
  screen.classList.toggle('live', !!(b && b.running));
  const frame = $('iframe', screen);
  if (stream && b.running) { if (!frame || frame.dataset.bot !== b.id) { $$('iframe,img', screen).forEach((x) => x.remove()); const f = document.createElement('iframe'); f.src = stream; f.dataset.bot = b.id; f.allow = 'clipboard-read; clipboard-write'; screen.appendChild(f); } empty.hidden = true; }
  else { if (frame && (!b || frame.dataset.bot !== b.id || !b.running)) frame.remove(); empty.hidden = !!$('img', screen) && b && b.running; empty.innerHTML = ''; if (b) empty.appendChild(avatar(b, 64)); empty.insertAdjacentHTML('beforeend', !S.computer.connected ? '<span>Computer not connected</span>' : b ? (b.running ? '<span>Computer running — press Start to watch the live desktop</span>' : '<span>Computer is off</span>') : '<span>Select a bot</span>'); }
  renderMemory();
}
function showShot(src){ const s = $('#lbScreen'); $$('img', s).forEach((x) => x.remove()); const i = document.createElement('img'); i.src = src; s.appendChild(i); $('#lbScreenEmpty').hidden = true; }
async function compStart(){
  const b = panelBot(); if (!b) return;
  const btn = $('#lbCompStart'); btn.disabled = true; $('#lbCompDot').className = 'lb-dot busy'; $('#lbCompState').textContent = 'Booting a real Linux computer…'; setMood(b.id, 'working');
  try {
    const r = await api('/bots/' + b.id + '/computer/start', { body: {} });
    S.streams[b.id] = r.streamUrl; b.running = true; b.hasComputer = true; if (r.usage) { S.usage = r.usage; renderUsage(); }
    setMood(b.id, 'happy', 2000); renderPanel(); renderSide(); sfx('computer');
  } catch (e) { toast(e.message); sfx('error'); setMood(b.id, 'idle'); renderPanel(); }
  finally { btn.disabled = false; }
}
async function compShot(){ const b = panelBot(); if (!b) return; try { const r = await api('/bots/' + b.id + '/computer/screenshot', { body: {} }); b.running = true; const f = $('#lbScreen iframe'); if (f) f.remove(); showShot(r.image); renderPanel(); } catch (e) { toast(e.message); } }
async function compPause(){ const b = panelBot(); if (!b) return; try { await api('/bots/' + b.id + '/computer/pause', { body: {} }); b.running = false; delete S.streams[b.id]; $$('#lbScreen img').forEach((x) => x.remove()); renderPanel(); renderSide(); toast(b.name + '’s computer stopped.'); } catch (e) { toast(e.message); } }
function termAppend(text, cls){ const t = $('#lbTerm'); const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text + '\n'; t.appendChild(s); t.scrollTop = t.scrollHeight; }
async function termRun(ev){
  ev.preventDefault(); const b = panelBot(); const inp = $('#lbTermInput'); const cmd = inp.value.trim(); if (!b || !cmd) return;
  inp.value = ''; termAppend('$ ' + cmd, 'c'); setMood(b.id, 'working');
  try { const r = await api('/bots/' + b.id + '/computer/exec', { body: { cmd } }); termAppend((r.stdout || '') + (r.stderr ? r.stderr : '') + (r.exitCode ? `[exit ${r.exitCode}]` : ''), r.exitCode ? 'e' : ''); b.running = true; renderPanel(); setMood(b.id, 'idle'); }
  catch (e) { termAppend(e.message, 'e'); setMood(b.id, 'idle'); }
}
function renderMemory(){
  const b = panelBot(); const ul = $('#lbMem'); ul.innerHTML = '';
  if (!b) return;
  if (!b.memory.length) ul.innerHTML = '<li class="lb-note"><span>Nothing remembered yet.</span></li>';
  b.memory.forEach((f, i) => { const li = document.createElement('li'); li.innerHTML = `<span>${esc(f)}</span><button title="Forget">✕</button>`; $('button', li).onclick = () => saveMemory(b, b.memory.filter((_, j) => j !== i)); ul.appendChild(li); });
}
async function saveMemory(b, mem){ try { const r = await api('/bots/' + b.id, { method: 'PATCH', body: { memory: mem } }); Object.assign(b, { memory: r.bot.memory }); renderMemory(); } catch (e) { toast(e.message); } }
async function refreshUsage(){ try { const st = await api('/state'); S.usage = st.usage; renderUsage(); st.bots.forEach((nb) => { const b = botById(nb.id); if (b) { b.running = nb.running; b.memory = nb.memory; } }); renderPanel(); } catch (_) {} }

/* ---------- dialogs ---------- */
let dlgBot = null, pick = { mascot: 'pebble', color: COLORS[0] };
function openBotDlg(bot){
  dlgBot = bot || null; const f = $('#lbBotForm');
  $('#lbBotDlgT').textContent = bot ? 'Edit ' + bot.name : 'New bot';
  f.name.value = bot ? bot.name : ''; f.persona.value = bot ? bot.persona : '';
  pick = { mascot: bot ? bot.mascot : M.kinds[S.bots.length % M.kinds.length], color: bot ? bot.color : COLORS[S.bots.length % COLORS.length] };
  $('#lbBotDel').hidden = !bot; drawPick(); $('#lbBotDlg').showModal(); f.name.focus();
}
function drawPick(){
  const mp = $('#lbMascotPick'); mp.innerHTML = '';
  M.kinds.forEach((k) => { const b = document.createElement('button'); b.type = 'button'; b.title = M.names[k]; b.className = k === pick.mascot ? 'on' : ''; b.appendChild(M.el(k, pick.color, k === pick.mascot ? 'happy' : 'idle')); b.onclick = () => { pick.mascot = k; drawPick(); }; mp.appendChild(b); });
  const cp = $('#lbColorPick'); cp.innerHTML = '';
  COLORS.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.className = c === pick.color ? 'on' : ''; b.innerHTML = `<span class="sw" style="background:${c}"></span>`; b.onclick = () => { pick.color = c; drawPick(); }; cp.appendChild(b); });
  const pv = $('#lbPickPreview'); if (pv) { pv.innerHTML = ''; pv.appendChild(M.el(pick.mascot, pick.color, 'happy')); }
}
$('#lbBotDlg').addEventListener('close', async () => {
  const v = $('#lbBotDlg').returnValue; const f = $('#lbBotForm');
  if (v === 'delete' && dlgBot) {
    if (!confirm(`Delete ${dlgBot.name} and its computer?`)) return;
    try { await api('/bots/' + dlgBot.id, { method: 'DELETE' }); S.bots = S.bots.filter((b) => b.id !== dlgBot.id); S.groups.forEach((g) => g.botIds = g.botIds.filter((x) => x !== dlgBot.id)); S.sel = null; renderSide(); S.bots[0] ? select('bot', S.bots[0].id) : renderEmpty(); } catch (e) { toast(e.message); }
    return;
  }
  if (v !== 'ok') return;
  const body = { name: f.name.value.trim(), persona: f.persona.value.trim(), mascot: pick.mascot, color: pick.color };
  try {
    if (dlgBot) { const r = await api('/bots/' + dlgBot.id, { method: 'PATCH', body }); Object.assign(dlgBot, r.bot); renderSide(); renderHead(); }
    else { const r = await api('/bots', { body }); S.bots.push(r.bot); select('bot', r.bot.id); setMood(r.bot.id, 'happy', 2500); const a = $('.lb-item.on .lb-av'); const rc = a && a.getBoundingClientRect(); confetti(rc && rc.left + 16, rc && rc.top + 10); }
  } catch (e) { toast(e.message); }
});
function openGroupDlg(){
  if (S.bots.length < 2) return toast('Create at least 2 bots to make a team.');
  const box = $('#lbGroupBots'); box.innerHTML = '';
  S.bots.forEach((b) => { const l = document.createElement('label'); l.innerHTML = `<input type="checkbox" value="${b.id}" checked>`; l.appendChild(avatar(b, 28)); l.insertAdjacentHTML('beforeend', `<span>${esc(b.name)}</span>`); box.appendChild(l); });
  $('#lbGroupForm').name.value = ''; $('#lbGroupDlg').showModal();
}
$('#lbGroupDlg').addEventListener('close', async () => {
  if ($('#lbGroupDlg').returnValue !== 'ok') return;
  const ids = $$('#lbGroupBots input:checked').map((i) => i.value);
  try { const r = await api('/groups', { body: { name: $('#lbGroupForm').name.value.trim(), botIds: ids } }); S.groups.push(r.group); select('group', r.group.id); } catch (e) { toast(e.message); }
});

/* ---------- @mention autocomplete ---------- */
let mIdx = 0;
function mentionCands(){
  const inp = $('#lbInput'); const pos = inp.selectionStart; const before = inp.value.slice(0, pos);
  const m = before.match(/@([\w\u0590-\u05ff-]*)$/); if (!m) return null;
  const pool = S.sel && S.sel.type === 'group' ? cur().botIds.map(botById).filter(Boolean) : [];
  const q = m[1].toLowerCase(); const list = pool.filter((b) => b.name.toLowerCase().replace(/\s+/g, '').startsWith(q));
  return list.length ? { list, start: pos - m[0].length, pos } : null;
}
function renderMention(){
  const box = $('#lbMention'); const c = mentionCands();
  if (!c) { box.hidden = true; return; }
  mIdx = Math.min(mIdx, c.list.length - 1); box.innerHTML = '';
  c.list.forEach((b, i) => { const x = document.createElement('button'); x.type = 'button'; x.className = i === mIdx ? 'on' : ''; x.appendChild(avatar(b, 22)); x.insertAdjacentHTML('beforeend', '@' + esc(b.name)); x.onmousedown = (ev) => { ev.preventDefault(); applyMention(b, c); }; box.appendChild(x); });
  box.hidden = false;
}
function applyMention(b, c){ const inp = $('#lbInput'); const tag = '@' + b.name.replace(/\s+/g, '') + ' '; inp.value = inp.value.slice(0, c.start) + tag + inp.value.slice(c.pos); inp.selectionStart = inp.selectionEnd = c.start + tag.length; $('#lbMention').hidden = true; inp.focus(); }
function autosize(){ const t = $('#lbInput'); t.style.height = 'auto'; t.style.height = Math.min(180, t.scrollHeight) + 'px'; }

/* ---------- wiring ---------- */
$('#lbCompose').addEventListener('submit', (e) => { e.preventDefault(); send(); });
$('#lbInput').addEventListener('input', () => { autosize(); renderMention(); });
$('#lbInput').addEventListener('keydown', (e) => {
  const c = !$('#lbMention').hidden && mentionCands();
  if (c && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); mIdx = (mIdx + (e.key === 'ArrowDown' ? 1 : -1) + c.list.length) % c.list.length; return renderMention(); }
  if (c && (e.key === 'Tab' || e.key === 'Enter')) { e.preventDefault(); return applyMention(c.list[mIdx], c); }
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});
$('#lbStop').onclick = () => { if (S.ctl) S.ctl.abort(); };
$('#lbNewBot').onclick = () => { if (S.bots.length >= S.maxBots) return toast(`You can have up to ${S.maxBots} bots.`); openBotDlg(); };
$('#lbNewGroup').onclick = openGroupDlg;
$('#lbEditBot').onclick = async () => {
  const c = cur(); if (!c) return;
  if (S.sel.type === 'bot') return openBotDlg(c);
  if (!confirm('Delete team "' + c.name + '"? (Bots are kept.)')) return;
  try { await api('/groups/' + c.id, { method: 'DELETE' }); S.groups = S.groups.filter((g) => g.id !== c.id); S.bots[0] ? select('bot', S.bots[0].id) : renderEmpty(); } catch (e) { toast(e.message); }
};
function setPanel(open, save){
  const a = $('#lbApp'); a.classList.toggle('no-panel', !open);
  const t = $('#lbTogglePanel'); t.classList.toggle('on', open); t.setAttribute('aria-pressed', open ? 'true' : 'false');
  t.title = open ? 'Hide the computer panel' : 'Show the computer panel';
  if (save) { try { localStorage.setItem('lb.panelOpen', open ? '1' : '0'); } catch (_) {} }
}
(function(){ let v = null; try { v = localStorage.getItem('lb.panelOpen'); } catch (_) {} setPanel(v === null ? !matchMedia('(max-width:820px)').matches : v === '1', false); })();
$('#lbTogglePanel').onclick = () => setPanel($('#lbApp').classList.contains('no-panel'), true);
$('#lbPanelClose').onclick = () => setPanel(false, true);
$('#lbMenu').onclick = () => $('#lbApp').classList.toggle('side-open');
$$('#lbTabs button[data-tab]').forEach((b) => b.onclick = () => { $$('#lbTabs button[data-tab]').forEach((x) => x.classList.toggle('on', x === b)); $$('.lb-tab').forEach((p) => { const on = p.dataset.pane === b.dataset.tab; p.hidden = !on; if (on) { p.classList.remove('enter'); void p.offsetWidth; p.classList.add('enter'); } }); });
$('#lbCompStart').onclick = compStart; $('#lbCompShot').onclick = compShot; $('#lbCompPause').onclick = compPause;
$('#lbTermForm').addEventListener('submit', termRun);
$('#lbMemForm').addEventListener('submit', (e) => { e.preventDefault(); const b = panelBot(); const v = $('#lbMemInput').value.trim(); if (!b || !v) return; $('#lbMemInput').value = ''; saveMemory(b, b.memory.concat(v)); });
setInterval(() => { if (document.visibilityState === 'visible' && S.bots.some((b) => b.running)) refreshUsage(); }, 60_000);
load();
})();
