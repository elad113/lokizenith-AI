/* Lokizenith v2.2 — Design assistant (Settings → Design).
   Describe a look ("make all buttons rounded purple glass") or a new animated background
   ("lots of changing emojis"); the assistant answers with JSON {css, background?:{name, js}, notes},
   which is checked, applied live and saved in localStorage as a Custom design (toggle · undo · delete · reset). */
(function(){
'use strict';
const A = window.App, {$, $$, el, esc} = A;
const KEY = 'lz.designs', UNDO = 'lz.designs.undo';
const load = () => { const v = A.safeJSON(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; };
let designs = load(), undo = (A.safeJSON(localStorage.getItem(UNDO)) || []).slice(-15);
const t = s => window.I18N ? I18N.t(s) : s;
function snapshot(){ undo.push({designs: JSON.parse(JSON.stringify(designs)), bg: A.settings().bgStyle}); undo = undo.slice(-15); localStorage.setItem(UNDO, JSON.stringify(undo)); }
function save(){ try { localStorage.setItem(KEY, JSON.stringify(designs)); } catch (e){ A.toast(t('Storage is full — delete an old design')); } }

/* ---------- CSS: clean + validate ---------- */
function cleanCSS(css){
  css = String(css || '').replace(/<\/?style[^>]*>/gi, '').replace(/@import[^;]*;?/gi, '').replace(/url\(\s*['"]?\s*javascript:[^)]*\)/gi, 'none').replace(/expression\s*\(/gi, '').replace(/```(css)?/g, '').trim();
  return css.slice(0, 40000);
}
function cssRules(css){ try { const sh = new CSSStyleSheet(); sh.replaceSync(css); return sh.cssRules.length; } catch (e){ return -1; } }

/* ---------- background JS: compile in a restricted scope + smoke test ---------- */
const BLOCK = ['window', 'document', 'globalThis', 'self', 'top', 'parent', 'fetch', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage', 'indexedDB', 'navigator', 'location', 'Function', 'importScripts', 'open', 'alert', 'cookieStore'];
function compileBG(js){
  const body = `"use strict";\n${js}\n;return {init: typeof init === 'function' ? init : null, draw: typeof draw === 'function' ? draw : null};`;
  const f = new Function(...BLOCK, 'OffscreenCanvas', body);
  const helper = {}; // offscreen canvas helper allowed for sprites
  const out = f(...BLOCK.map(() => undefined), typeof OffscreenCanvas !== 'undefined' ? OffscreenCanvas : undefined);
  if (!out || !out.draw) throw new Error('The background code must define draw(e).');
  return out;
}
/* the first test runs in a Worker on an OffscreenCanvas at full size, so a broken or endless loop can never freeze the page */
const WORKER_SRC = `onmessage = ev => { const {js, W, H} = ev.data; try {
  const f = new Function('window','document','localStorage','fetch','XMLHttpRequest','WebSocket', '"use strict";\\n' + js + '\\n;return {init: typeof init === "function" ? init : null, draw: typeof draw === "function" ? draw : null};');
  const def = f(); if (!def || !def.draw) throw new Error('The background code must define draw(e).');
  const c = new OffscreenCanvas(W, H), ctx = c.getContext('2d', {alpha:false});
  const e = {ctx, W, H, t:0, k:1, rgb:'0,255,156', perf:false, state:{}};
  if (def.init) def.init(e); def.draw(e);
  const t0 = performance.now(); for (let i = 1; i <= 12; i++){ e.t = i; def.draw(e); }
  postMessage({ok:true, ms:(performance.now() - t0) / 12});
} catch (err){ postMessage({ok:false, error: String(err && err.message || err)}); } };`;
function smokeWorker(js){
  return new Promise(res => {
    let w; try { w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], {type: 'text/javascript'}))); } catch (e){ return res({ok: true, skipped: true}); }
    const to = setTimeout(() => { w.terminate(); res({ok: false, error: 'The animation did not finish a frame within 4 seconds (endless loop or far too heavy).'}); }, 4000);
    w.onmessage = ev => { clearTimeout(to); w.terminate(); res(ev.data); };
    w.onerror = ev => { clearTimeout(to); w.terminate(); res({ok: false, error: ev.message || 'syntax error'}); ev.preventDefault && ev.preventDefault(); };
    w.postMessage({js, W: Math.round(innerWidth * .75) || 960, H: Math.round(innerHeight * .75) || 600});
  });
}
async function checkBG(js){
  const r = await smokeWorker(js);
  if (!r.ok) throw new Error(r.error);
  if (r.ms > 22) throw new Error(`One frame takes ${r.ms.toFixed(0)} ms at full size — too slow; use fewer objects (max ~120) and no per-frame allocations.`);
  const def = compileBG(js); /* compiles in this page too (same scope rules as when it runs) */
  const c = document.createElement('canvas'); c.width = 64; c.height = 40;
  const e = {ctx: c.getContext('2d', {alpha: false}), W: 64, H: 40, t: 0, k: 1, rgb: '0,255,156', perf: false, state: {}};
  if (def.init) def.init(e); def.draw(e);
}
function registerBG(d){
  if (!d.bg || !d.bg.js) return false;
  try { const def = compileBG(d.bg.js); A.registerBackground('x-' + d.id, {name: '✦ ' + (d.bg.name || d.name).slice(0, 24), hidden: !d.on, init: def.init, draw: def.draw}); return true; }
  catch (e){ console.warn('design bg', e); return false; }
}

/* ---------- apply ---------- */
function applyAll(){
  $$('style[data-design]').forEach(s => s.remove());
  designs.forEach(d => {
    if (A.BGX['x-' + d.id]) A.BGX['x-' + d.id].hidden = !d.on;
    if (!d.on) return;
    if (d.css){ const s = document.createElement('style'); s.dataset.design = d.id; s.textContent = d.css; document.head.appendChild(s); }
  });
}
designs.forEach(registerBG); applyAll();
function setBg(id){ const S = A.settings(); if (S.bgStyle === id) { A.BG.configure(); return; } S.bgStyle = id; A.saveSettings(); A.applySettings && A.applySettings(); A.BG.configure(); }
function toggle(d, on){
  snapshot(); d.on = on;
  if (d.bg){ if (on){ d.prevBg = A.settings().bgStyle.startsWith('x-') ? (d.prevBg || 'flow') : A.settings().bgStyle; registerBG(d); setBg('x-' + d.id); }
    else if (A.settings().bgStyle === 'x-' + d.id) setBg(d.prevBg || 'flow'); }
  save(); applyAll();
}

/* ---------- the assistant ---------- */
const SYS = `You are the design assistant of the Lokizenith web app (made by Lokiz Studios). The user describes a visual change; you reply with ONLY a JSON object:
{"name": "short name (2-4 words)", "css": "CSS to inject (may be empty)", "background": null OR {"name": "short name", "js": "JavaScript"}, "notes": "1-2 friendly sentences about what changed"}

THE APP (dark UI). CSS variables on :root: --acc (accent, default #00ff9c), --acc-rgb (e.g. 0,255,156), --acc2, --acc3, --bg, --bg2, --panel, --panel2, --line, --line2, --text, --muted, --radius, --font.
Main selectors: body, .sidebar, .main, .topbar, .messages, .msg.user .bubble (user bubble), .msg.bot .bubble-col (assistant answer), .composer (message box form), #prompt (textarea), .send (send button), .tool-btn, .chip (suggestion chips), .btn-primary, .btn-ghost, .btn-new, .btn-settings, .btn-lokicode, .btn-lessons, .labs-btn, .model-btn, .seg button, .icon-btn, .h-item (history rows), .modal-card, .set-row, .switch, .toast, .work, .hero-orb, .empty h1, .card / .widget-card.
"All buttons" = button, .btn-primary, .btn-ghost, .tool-btn, .send, .chip, .seg button, .icon-btn, .btn-new, .btn-settings, .labs-btn, .model-btn, .h-item (use them together).
CSS rules: restyle only (colors, radius, borders, shadows, backdrop-filter, fonts, transitions, keyframe animations). Never hide app content, never use display:none on app parts, never change position/size of the layout containers, never use @import or external URLs. Use !important where needed to beat existing styles. Keep text readable (contrast!). Prefer CSS variables when the request is about the accent/theme color. Glass = semi-transparent background + backdrop-filter: blur() + soft border + inner highlight.

BACKGROUND (only if the user asks for a background/backdrop/animation behind the app): "js" defines two functions, nothing else at top level:
  function init(e){ ... }   // optional, called on start/resize
  function draw(e){ ... }   // called ~30 times per second
There are NO globals: always read e.ctx, e.W, e.H, e.state etc. (destructure: const {ctx, W, H, state} = e;).
e = {ctx (CanvasRenderingContext2D, opaque), W, H (CSS pixels), t (frame counter), k (intensity 0.3-2), rgb ("0,255,156" accent), perf (bool, low-power mode), state ({} to keep your data)}.
draw MUST paint the whole canvas each frame (start with ctx.fillStyle='#030806' or a trailing-fade fillRect). Keep it dark and subtle behind text (alpha ≤ 0.5 for shapes). No DOM, no window/document, no network, no timers. Keep ≤ 150 objects (half when e.perf). Allocate arrays in init, not per frame. Emoji: ctx.font = size+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' then ctx.fillText; color emoji ignore fillStyle, so fade them with ctx.globalAlpha (reset to 1 after). "Changing" emojis = each one swaps to another emoji every few seconds (with a small pop/fade) while drifting. Keep the object count independent of screen size (e.g. 60-90).
If the request is only about colors/shapes, background is null. If it is only a background, css may be "".`;

async function ask(prompt, work, signal){
  const tier = A.state.model;
  const active = designs.filter(d => d.on && d.css).map(d => `/* ${d.name} */\n${d.css}`).join('\n').slice(0, 3000);
  const msgs = [{role: 'system', content: SYS}, {role: 'user', content: (active ? `Designs currently active (for context; your result is ADDED on top):\n${active}\n\n` : '') + 'Request: ' + prompt}];
  work.log(t('Designing'));
  let j = await LZ.chatJSON(msgs, {tier, signal, maxTokens: 3500});
  let first0 = null;
  for (let round = 0; round < 2; round++){
    const errs = [];
    j.css = cleanCSS(j.css);
    if (j.css && cssRules(j.css) <= 0) errs.push('The CSS did not parse into any rules.');
    if (j.background && j.background.js){
      try { await checkBG(String(j.background.js)); } catch (e){ errs.push('Background code error: ' + e.message); }
    } else j.background = null;
    if (!j.css && !j.background) errs.push('Nothing to apply — provide css and/or background.');
    if (!errs.length) return j;
    console.warn('design check', errs.join(' | '), String(j.background && j.background.js || '').slice(0, 1500));
    work.log(t('Fixing a problem in the design'));
    msgs.push({role: 'assistant', content: JSON.stringify(j).slice(0, 12000)}, {role: 'user', content: 'Fix these problems and reply with the full corrected JSON only:\n' + errs.join('\n')});
    const first = first0 || (first0 = {name: j.name, notes: j.notes});
    j = await LZ.chatJSON(msgs, {tier, signal, maxTokens: 3500});
    j.name = first.name || j.name; j.notes = first.notes || j.notes;
  }
  throw new Error(t('The design could not be applied safely — try describing it differently.'));
}

/* ---------- Settings UI ---------- */
let sec = null, busy = null;
let currentExamples = ['Make all buttons rounded purple glass', 'Create a new animated background with lots of changing emojis', 'Warm sunset accent with softer corners', 'Neon pink glow on my messages', 'Starry night background with shooting stars'];

async function refreshExamples(btn){
  if (!sec) return;
  if (btn){ btn.disabled = true; btn.textContent = '↻ ' + t('Thinking…'); }
  try {
    const prompt = 'Suggest 5 creative, diverse and exciting UI design prompts or animated backgrounds for Lokizenith AI (e.g. glassmorphism, cyberpunk, retro terminal, celestial, pastel, neon effects). Return ONLY a JSON array of 5 short strings.';
    const res = await LZ.chatJSON([{role:'system', content:'You are a world-class UI design director. Return JSON ["...", "...", "...", "...", "..."] with 5 short visual theme ideas.'}, {role:'user', content: prompt}], {tier: A.state.model, maxTokens: 400, level: 0, _noConsume: true});
    if (Array.isArray(res) && res.length >= 3){
      currentExamples = res.slice(0, 5).map(String);
    }
  } catch(e){
    currentExamples = [
      'Cyberpunk emerald neon with holographic borders',
      'Minimalist frosted white glass with soft shadows',
      'Floating celestial stars and gentle nebula pulse',
      'Retro vaporwave sunset grid with glowing cards',
      'Deep sapphire blue luxury theme with golden accents'
    ];
  }
  const exBox = $('.dz-ex-list', sec);
  const ta = $('#dzPrompt', sec);
  if (exBox){
    exBox.innerHTML = currentExamples.map(x => `<button type="button" class="chip-s">${esc(t(x))}</button>`).join('');
    $$('.dz-ex-list button', sec).forEach((b, i) => b.onclick = () => { ta.value = t(currentExamples[i]); A.grow(ta); ta.focus(); });
  }
  if (btn){ btn.disabled = false; btn.textContent = '↻ ' + t('AI Suggestions'); }
}

function renderList(){
  if (!sec) return; const box = $('.dz-list', sec);
  $('.dz-undo', sec).disabled = !undo.length;
  if (!designs.length){ box.innerHTML = `<div class="dz-empty">${esc(t('No custom designs yet — describe one above.'))}</div>`; return; }
  box.innerHTML = '';
  designs.slice().reverse().forEach(d => {
    const r = el('div', 'dz-item' + (d.on ? ' on' : ''));
    r.innerHTML = `<div class="dz-meta"><b dir="auto"></b><small dir="auto"></small><span class="dz-tags">${d.css ? '<i>CSS</i>' : ''}${d.bg ? `<i>${esc(t('Background'))}</i>` : ''}</span></div>
      <label class="switch" title="${esc(t('On / off'))}"><input type="checkbox" ${d.on ? 'checked' : ''}><span></span></label>
      <button class="icon-btn dz-del" title="${esc(t('Delete'))}" aria-label="${esc(t('Delete'))}">🗑</button>`;
    $('b', r).textContent = d.name; $('small', r).textContent = d.notes || d.prompt;
    $('input', r).onchange = e => { toggle(d, e.target.checked); renderList(); };
    $('.dz-del', r).onclick = () => { snapshot(); if (d.bg && A.settings().bgStyle === 'x-' + d.id) setBg(d.prevBg || 'flow'); delete A.BGX['x-' + d.id]; designs = designs.filter(x => x !== d); save(); applyAll(); renderList(); A.toast(t('Design deleted — Undo is available')); };
    box.appendChild(r);
  });
}
async function run(prompt){
  if (busy || !prompt.trim()) return;
  const host = $('.dz-work', sec); host.innerHTML = ''; const ac = new AbortController(); busy = ac;
  const btn = $('.dz-go', sec); btn.disabled = true; btn.textContent = t('Designing…');
  const work = A.Work(host, {open: false});
  try {
    const j = await ask(prompt, work, ac.signal);
    snapshot();
    const d = {id: A.uid(), name: String(j.name || prompt).slice(0, 40), prompt, css: j.css || '', bg: j.background ? {name: String(j.background.name || j.name || 'Custom').slice(0, 30), js: String(j.background.js)} : null, notes: String(j.notes || '').slice(0, 300), on: true, ts: Date.now()};
    designs.push(d); save();
    if (d.bg){ d.prevBg = A.settings().bgStyle.startsWith('x-') ? 'flow' : A.settings().bgStyle; registerBG(d); setBg('x-' + d.id); save(); }
    applyAll(); work.log(t('Applied')); work.done();
    const n = el('div', 'dz-note'); n.dir = 'auto'; n.textContent = '✨ ' + (d.notes || t('Applied')); host.appendChild(n);
    window.Mascot && Mascot.set('happy');
    $('#dzPrompt', sec).value = ''; A.grow($('#dzPrompt', sec)); renderList();
  } catch (e){
    work.done(); const n = el('div', 'dz-note err'); n.textContent = '⚠️ ' + (e.message || e); host.appendChild(n); window.Mascot && Mascot.set('oops');
  } finally { busy = null; btn.disabled = false; btn.textContent = t('Design it'); }
}
A.registerSettings({id: 'design', title: 'Design', render(s){
  sec = s;
  s.innerHTML = `<h3>${esc(t('Design assistant'))}</h3>
  <p class="dz-intro">${esc(t('Describe a look or a new animated background — it is applied live and saved below.'))}</p>
  <form class="dz-form"><textarea id="dzPrompt" rows="1" dir="auto" placeholder="${esc(t('e.g. make all buttons rounded purple glass'))}"></textarea><button class="btn-primary dz-go" type="submit">${esc(t('Design it'))}</button></form>
  <div class="dz-ex-wrap" style="display:flex;align-items:center;gap:8px;margin-top:10px">
    <div class="dz-ex-list" style="display:flex;flex-wrap:wrap;gap:6px;flex:1">
      ${currentExamples.map(x => `<button type="button" class="chip-s">${esc(t(x))}</button>`).join('')}
    </div>
    <button type="button" class="btn-ghost dz-refresh" id="dzRefresh" title="Get fresh AI design suggestions" style="white-space:nowrap;font-size:0.78rem;padding:6px 10px">↻ ${esc(t('AI Suggestions'))}</button>
  </div>
  <div class="dz-work"></div>
  <div class="dz-head"><b>${esc(t('Custom designs'))}</b><span><button type="button" class="btn-ghost dz-undo">↶ ${esc(t('Undo'))}</button><button type="button" class="btn-ghost dz-reset">${esc(t('Reset to default'))}</button></span></div>
  <div class="dz-list"></div>`;
  const ta = $('#dzPrompt', s); ta.addEventListener('input', () => A.grow(ta));
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); run(ta.value); } });
  $('.dz-form', s).onsubmit = e => { e.preventDefault(); run(ta.value); };
  $$('.dz-ex-list button', s).forEach((b, i) => b.onclick = () => { ta.value = t(currentExamples[i]); A.grow(ta); ta.focus(); });
  $('#dzRefresh', s).onclick = e => refreshExamples(e.target);
  $('.dz-undo', s).onclick = () => { const u = undo.pop(); if (!u) return; localStorage.setItem(UNDO, JSON.stringify(undo)); designs = u.designs; save(); designs.forEach(registerBG); applyAll(); setBg(u.bg); renderList(); A.toast(t('Undone')); };
  $('.dz-reset', s).onclick = () => { snapshot(); designs.forEach(d => d.on = false); save(); applyAll(); if (A.settings().bgStyle.startsWith('x-')) setBg('flow'); renderList(); A.toast(t('Back to the default look — your designs are kept (switched off)')); };
  renderList();
}});
window.Design = {run: p => run(p), list: () => designs, applyAll};
})();
