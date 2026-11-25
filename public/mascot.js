/* Loki — the Lokizenith mascot (original SVG/CSS character by Lokiz Studios).
   States: idle · curious · thinking · talking · happy · oops · surprised · waving · love · sleepy
           + dancing · coding · calling · celebrating · juggling · salute.
   Features:
   - Draggable anywhere on screen by holding & moving (pointer events with viewport clamping)
   - Live situational animation: real-time mouth & hand movement during Voice Call, TTS speech, LokiCode coding, and Chat streaming
   - Full localization (English, Hebrew, Arabic) */
(function(){
'use strict';
const A = window.App, {$, $$, el, esc} = A;
const KEY = 'lz.mascot';
const cfg = () => Object.assign({on: true, wander: true, customPos: null}, A.safeJSON(localStorage.getItem(KEY)) || {});
const saveCfg = o => { localStorage.setItem(KEY, JSON.stringify(Object.assign(cfg(), o))); apply(); };
const lang = () => (A.settings().lang || document.documentElement.lang || 'en').slice(0, 2);
const reduced = () => A.settings().reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;

const TRANSIENT = {
  happy: 2600, oops: 3000, surprised: 1400, waving: 2400, curious: 2200, love: 2400,
  dancing: 3600, celebrating: 3200, juggling: 3200, salute: 2400, coding: 3000
};

const SAY = {
  en: {
    hi: ["Hi! I'm Loki 👋", 'Hehe, that tickles!', 'Need a hand? Just ask ✨', 'Boop! 💚', "I'm on it!", 'Ready when you are 🚀', 'Drag me anywhere on screen! 🛸'],
    done: ['Done! ✨', 'Ta-da!', 'Here you go 💚', 'Nailed it! 🎉'],
    oops: ['Oops… let’s try again', 'Hmm, that didn’t work 😕'],
    wake: 'Welcome back!',
    drag: ['Wheee! Moving around! 🛸', 'Hold & drag me anywhere! ✨', 'Nice spot! 💚'],
    callSpeak: ['Talking live! 🎙️', 'Listening & speaking! 🔊']
  },
  he: {
    hi: ['היי! אני לוקי 👋', 'חחח, זה מדגדג!', 'צריכים עזרה? רק תבקשו ✨', 'בופ! 💚', 'אני על זה!', 'מוכן כשאתם מוכנים 🚀', 'אפשר לגרור אותי לכל מקום! 🛸'],
    done: ['סיימתי! ✨', 'טה-דה!', 'בבקשה 💚', 'בוצע בהצלחה! 🎉'],
    oops: ['אופס… ננסה שוב', 'הממ, זה לא עבד 😕'],
    wake: 'ברוכים השבים!',
    drag: ['ווייי! זזים! 🛸', 'אפשר לגרור אותי לכל מקום! ✨', 'מקום מעולה! 💚'],
    callSpeak: ['מדבר בלייב! 🎙️', 'מקשיב ומדבר! 🔊']
  },
  ar: {
    hi: ['مرحبًا! أنا لوكي 👋', 'هههه، هذا يدغدغ!', 'تحتاج مساعدة؟ فقط اسأل ✨', 'بوب! 💚', 'أنا جاهز! 🚀', 'اسحبني إلى أي مكان على الشاشة! 🛸'],
    done: ['تم بنجاح! ✨', 'تفضل 💚', 'أنجزت المهمة! 🎉'],
    oops: ['عذرًا… لنحاول مجددًا', 'همم، لم ينجح ذلك 😕'],
    wake: 'أهلًا بعودتك!',
    drag: ['يا سلااام! أتحرك بحرية! 🛸', 'مكان رائع! 💚'],
    callSpeak: ['أتحدث مباشرة! 🎙️', 'أستمع وأتحدث! 🔊']
  }
};
const say = k => { const s = SAY[lang()] || SAY.en; const v = s[k] || SAY.en[k]; return Array.isArray(v) ? v[Math.random() * v.length | 0] : v; };

let uidN = 0;
function svg(){
  const u = 'mz' + (++uidN);
  return `<svg class="mz-svg" viewBox="0 0 120 132" aria-hidden="true">
  <defs>
    <linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5dffc0"/><stop offset=".55" stop-color="var(--acc,#00ff9c)"/><stop offset="1" stop-color="#00a86b"/></linearGradient>
    <linearGradient id="${u}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9ffe9"/><stop offset="1" stop-color="#3ddc97"/></linearGradient>
    <radialGradient id="${u}v" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#0c2c1f"/><stop offset="1" stop-color="#020b07"/></radialGradient>
    <filter id="${u}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <ellipse class="mz-shadow" cx="60" cy="126" rx="30" ry="4.5"/>
  <g class="mz-think"><circle cx="94" cy="20" r="3"/><circle cx="103" cy="11" r="4"/><circle cx="113" cy="3" r="2.5"/></g>
  <g class="mz-spark"><path d="M14 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M104 40l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z"/><path d="M98 100l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z"/></g>
  <g class="mz-notes"><text x="12" y="28">♪</text><text x="100" y="24">♫</text></g>
  <g class="mz-code-glyphs"><text x="10" y="34">&lt;/&gt;</text><text x="94" y="30">{}</text></g>
  <g class="mz-z"><text x="92" y="26">z</text><text x="101" y="16">z</text></g>
  <g class="mz-body">
    <g class="mz-arm l"><path d="M26 80 q-13 3 -15 16" fill="none" stroke="url(#${u}b)" stroke-width="9" stroke-linecap="round"/><circle class="mz-hand l" cx="11" cy="96" r="5" fill="#5dffc0"/></g>
    <g class="mz-arm r"><path d="M94 80 q13 3 15 16" fill="none" stroke="url(#${u}b)" stroke-width="9" stroke-linecap="round"/><circle class="mz-hand r" cx="109" cy="96" r="5" fill="#5dffc0"/></g>
    <path class="mz-horn l" d="M40 30 C29 22 27 9 35 2 C36 11 41 18 50 24 Z" fill="url(#${u}h)"/>
    <path class="mz-horn r" d="M80 30 C91 22 93 9 85 2 C84 11 79 18 70 24 Z" fill="url(#${u}h)"/>
    <rect x="18" y="20" width="84" height="98" rx="40" fill="url(#${u}b)"/>
    <ellipse cx="44" cy="34" rx="14" ry="6" fill="#fff" opacity=".28" transform="rotate(-18 44 34)"/>
    <ellipse cx="60" cy="104" rx="16" ry="6" fill="#003d27" opacity=".18"/>
    <rect class="mz-visor" x="28" y="40" width="64" height="44" rx="21" fill="url(#${u}v)"/>
    <g class="mz-face">
      <g class="mz-brows"><path class="mz-brow l" d="M38 48 q8 -4 15 0"/><path class="mz-brow r" d="M67 48 q7 -4 15 0"/></g>
      <g class="mz-eye l"><g class="mz-lid"><ellipse class="mz-ew" cx="45.5" cy="60" rx="7" ry="8.5" filter="url(#${u}g)"/><circle class="mz-pu" cx="45.5" cy="61" r="3.4"/><circle class="mz-gl" cx="48" cy="57.5" r="1.6"/></g><path class="mz-he" d="M38.5 62 q7 -9 14 0"/><path class="mz-xe" d="M40 56 l11 9 M51 56 l-11 9"/></g>
      <g class="mz-eye r"><g class="mz-lid"><ellipse class="mz-ew" cx="74.5" cy="60" rx="7" ry="8.5" filter="url(#${u}g)"/><circle class="mz-pu" cx="74.5" cy="61" r="3.4"/><circle class="mz-gl" cx="77" cy="57.5" r="1.6"/></g><path class="mz-he" d="M67.5 62 q7 -9 14 0"/><path class="mz-xe" d="M69 56 l11 9 M80 56 l-11 9"/></g>
      <ellipse class="mz-cheek l" cx="35" cy="72" rx="5" ry="3"/><ellipse class="mz-cheek r" cx="85" cy="72" rx="5" ry="3"/>
      <path class="mz-m smile" d="M53 73 q7 6 14 0"/>
      <path class="mz-m grin" d="M51 71 q9 13 18 0 z"/>
      <ellipse class="mz-m o" cx="60" cy="75" rx="3.6" ry="4.6"/>
      <path class="mz-m frown" d="M53 77 q7 -6 14 0"/>
      <path class="mz-m flat" d="M53 75 q3.5 -2.5 7 0 t7 0"/>
      <ellipse class="mz-m talk" cx="60" cy="74" rx="6.2" ry="4.2"/>
    </g>
    <path class="mz-sweat" d="M95 38 q5 8 0 11 q-5 -3 0 -11z"/>
  </g>
  </svg>`;
}

const ALL = new Set();
let base = 'idle', trans = null, transT = 0, lastPointer = 0, px = innerWidth / 2, py = innerHeight / 2;
let externalSpeaking = false;
let currentCallPhase = 'idle';

/* ---- Hold & Drag support for any Loki Mascot instance (Full 2D X + Y anywhere on screen) ---- */
function promoteToFreeRoam(w, x, y){
  w.classList.add('free-roam');
  const mv = $('.mz-move', w);
  if (mv){
    mv.style.transition = 'none';
    mv.style.setProperty('--x', '0px');
    mv.style.transform = 'none';
  }
  if (w.parentElement !== document.body){
    document.body.appendChild(w);
  }
  const sz = w.offsetWidth || 52;
  const nx = Math.max(8, Math.min(innerWidth - sz - 8, x));
  const ny = Math.max(8, Math.min(innerHeight - sz - 8, y));
  w.style.setProperty('position', 'fixed', 'important');
  w.style.setProperty('left', Math.round(nx) + 'px', 'important');
  w.style.setProperty('top', Math.round(ny) + 'px', 'important');
  w.style.setProperty('right', 'auto', 'important');
  w.style.setProperty('bottom', 'auto', 'important');
  w.style.setProperty('inset-inline-start', 'auto', 'important');
  w.style.setProperty('inset-inline-end', 'auto', 'important');
  w.style.setProperty('transform', 'none', 'important');
}

function makeDraggable(w){
  let dragging = false, activeDown = false, startX = 0, startY = 0, origLeft = 0, origTop = 0, pointerId = null;

  const onMove = e => {
    if (!activeDown) return;
    if (pointerId !== null && e.pointerId !== undefined && e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!dragging && Math.hypot(dx, dy) > 4){
      dragging = true;
      w._justDragged = true;
      w.classList.add('dragging');
      w.classList.remove('walk');
      promoteToFreeRoam(w, origLeft, origTop);
      set('juggling', 1800);
      bubble(w, say('drag'), 1800);
    }
    if (dragging){
      if (e.cancelable) e.preventDefault();
      promoteToFreeRoam(w, origLeft + dx, origTop + dy);
    }
  };

  const endDrag = e => {
    if (!activeDown) return;
    if (pointerId !== null && e.pointerId !== undefined && e.pointerId !== pointerId) return;
    activeDown = false;
    try { if (pointerId !== null) w.releasePointerCapture(pointerId); } catch(_){}
    pointerId = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    if (dragging){
      dragging = false;
      w.classList.remove('dragging');
      const rect = w.getBoundingClientRect();
      if (w === dock || w.id === 'lokiMascot'){
        localStorage.setItem(KEY, JSON.stringify(Object.assign(cfg(), {
          customPos: { x: Math.round(rect.left), y: Math.round(rect.top) }
        })));
      }
      set('happy', 1800);
      setTimeout(() => { w._justDragged = false; }, 120);
    }
  };

  w.addEventListener('pointerdown', e => {
    if (e.target.closest('.mz-say')) return;
    if (e.button && e.button !== 0) return;
    activeDown = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    dragging = false;
    const rect = w.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top;
    try { w.setPointerCapture(e.pointerId); } catch(_){}
    window.addEventListener('pointermove', onMove, {passive: false});
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  });
}

function mount(host, opts = {}){
  const w = el('div', 'mz ' + (opts.cls || ''));
  if (opts.id) w.id = opts.id;
  w.innerHTML = `<div class="mz-move"><div class="mz-flip">${svg()}</div><div class="mz-say" data-noi18n hidden></div></div>`;
  w.setAttribute('role', 'button');
  w.setAttribute('aria-label', 'Loki Mascot (Click or Drag)');
  w.title = 'Click for animation · Hold & drag to move Loki anywhere!';
  w.tabIndex = 0;
  w.dataset.s = 'idle';
  w.style.setProperty('--size', (opts.size || 56) + 'px');
  w._o = opts;
  host.appendChild(w);
  ALL.add(w);
  render(w);
  makeDraggable(w);

  const poke = e => {
    if (w._justDragged) { e.stopPropagation(); return; }
    e.stopPropagation();
    react(w);
  };
  w.addEventListener('click', poke);
  w.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); poke(e); } });
  const b = $('.mz-say', w);
  if (b){
    b.addEventListener('click', e => {
      e.stopPropagation();
      const txt = (b.textContent || '').trim();
      const m = txt.match(/["“](.+?)["”]/);
      const toInsert = m ? m[1] : txt.replace(/^(Try asking:|Ask me:|Need an idea\?|Give me a task:|שאל אותי:|נסה לשאול:|צריך רעיון\?|רוצה שנעשה משהו\?|جرّب أن تسأل:|اسألني:|هل تريد فكرة\?)\s*/i, '');
      const inp = $('#prompt');
      if (inp && toInsert){
        inp.value = toInsert;
        inp.focus();
        A.grow && A.grow();
        A.toast && A.toast('Copied to prompt: ' + toInsert.slice(0, 35) + '…');
      }
    });
  }
  return w;
}

let clicks = 0, clickT = 0;
function react(w){
  clicks++; clearTimeout(clickT); clickT = setTimeout(() => clicks = 0, 900);
  if (clicks >= 3){
    clicks = 0;
    w.classList.remove('spin'); void w.offsetWidth; w.classList.add('spin');
    setTimeout(() => w.classList.remove('spin'), 900);
    set('celebrating');
    bubble(w, '🌀🎉 Wheee! Super Loki!');
    return;
  }
  const moods = ['happy', 'waving', 'surprised', 'love', 'dancing', 'celebrating', 'juggling', 'salute'];
  const r = moods[Math.random() * moods.length | 0];
  set(r);
  bubble(w, say('hi'));
}

function bubble(w, text, ms = 2400){
  const b = $('.mz-say', w); if (!b || !w.isConnected) return;
  b.textContent = text; b.dir = 'auto'; b.hidden = false;
  b.classList.remove('in'); void b.offsetWidth; b.classList.add('in');
  clearTimeout(b._t);
  b._t = setTimeout(() => {
    b.classList.remove('in');
    setTimeout(() => { if (!b.classList.contains('in')) b.hidden = true; }, 300);
  }, ms);
}

function shown(){ return trans || base; }
function render(w){ const s = w._force || shown(); if (w.dataset.s !== s) w.dataset.s = s; }
function renderAll(){ ALL.forEach(w => { if (!w.isConnected){ ALL.delete(w); return; } render(w); }); }
function set(s, ms){
  if (s === 'sad') s = 'oops';
  if (TRANSIENT[s] || ms){
    trans = s;
    clearTimeout(transT);
    transT = setTimeout(() => { trans = null; renderAll(); }, ms || TRANSIENT[s]);
    if (s === 'happy' || s === 'oops') base = 'idle';
  } else {
    base = s;
    if (s === 'thinking' || s === 'talking' || s === 'calling' || s === 'coding'){
      trans = null;
      clearTimeout(transT);
    }
  }
  renderAll();
  if (s === 'happy' && dock && Math.random() < .5) bubble(dock, say('done'), 1600);
  if (s === 'oops' && dock) bubble(dock, say('oops'), 2200);
}

/* ---- eyes: follow the pointer, or look around on their own ---- */
let auto = {x: 0, y: 0}, autoT = 0;
function lookAround(){
  const s = shown();
  if (Date.now() - lastPointer > 2500 && (s === 'idle' || s === 'curious')){
    const r = Math.random();
    auto = r < .2 ? {x: 0, y: 0} : {x: (Math.random() * 2 - 1) * 4.2, y: (Math.random() * 2 - 1) * 2.6};
    ALL.forEach(w => { w.style.setProperty('--px', auto.x.toFixed(2)); w.style.setProperty('--py', auto.y.toFixed(2)); w.style.setProperty('--tilt', (auto.x * 1.3).toFixed(1) + 'deg'); });
    if (Math.random() < .12 && !trans) set('curious');
  }
  autoT = setTimeout(lookAround, 1300 + Math.random() * 2000);
}
let raf = 0;
function track(){
  raf = 0;
  ALL.forEach(w => {
    const s = shown();
    if (s === 'thinking' || s === 'sleepy'){
      w.style.setProperty('--px', '2.5'); w.style.setProperty('--py', '-2.8'); w.style.setProperty('--tilt', '-4deg');
      return;
    }
    const r = w.getBoundingClientRect(); if (!r.width) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height * .45, dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 260);
    w.style.setProperty('--px', (dx / d * 4.2 * k).toFixed(2));
    w.style.setProperty('--py', (dy / d * 3 * k).toFixed(2));
    w.style.setProperty('--tilt', (dx / d * 5 * k).toFixed(1) + 'deg');
  });
}
addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; lastPointer = Date.now(); wakeUp(); if (!raf) raf = requestAnimationFrame(track); }, {passive: true});

/* ---- blinking ---- */
function blink(){ ALL.forEach(w => { if (Math.random() < .85){ w.classList.add('blink'); setTimeout(() => w.classList.remove('blink'), 150); } }); setTimeout(blink, 2200 + Math.random() * 3200); }

/* ---- sleepy after 90 s without activity ---- */
let idleSince = Date.now();
function wakeUp(){ idleSince = Date.now(); if (base === 'sleepy'){ base = 'idle'; renderAll(); if (dock) bubble(dock, say('wake'), 1500); } }
addEventListener('keydown', wakeUp, {passive: true}); addEventListener('touchstart', wakeUp, {passive: true});
setInterval(() => { if (base === 'idle' && !trans && Date.now() - idleSince > 90000 && !document.querySelector('.msg.bot.busy')){ base = 'sleepy'; renderAll(); } }, 5000);

/* ---- Live Situational Animation Engine (Voice Call + Speech + LokiCode + Streaming) ---- */
let lastLen = 0, lastGrow = 0;
function setSpeaking(on){
  externalSpeaking = !!on;
  if (on) wakeUp();
}
function setCallPhase(phase){
  currentCallPhase = phase || 'idle';
  placeCall();
}

setInterval(() => {
  if (document.hidden || !cfg().on) return;
  const now = Date.now();
  const callOv = $('#callOverlay');
  const inVoiceCall = !!(callOv && !callOv.hidden);
  const callPhase = inVoiceCall ? (callOv.dataset.phase || currentCallPhase || 'listening') : 'idle';
  const lcWork = $('#lcWorking');
  const isCodingNow = !!(lcWork && !lcWork.hidden && $('#codeView.active'));
  const busy = document.querySelector('.msg.bot.busy, #lessonsView .ls-working');
  const browserSpeaking = !!(window.speechSynthesis && speechSynthesis.speaking);
  const isSpeakingNow = externalSpeaking || browserSpeaking || (inVoiceCall && callPhase === 'speaking');

  if (busy){
    const streamNode = $('.md, .bubble .content, .msg-body', busy);
    const len = streamNode && streamNode.textContent ? streamNode.textContent.length : 0;
    if (len > lastLen + 2) lastGrow = now;
    lastLen = len;
  } else {
    lastLen = 0;
  }
  const streaming = !!(busy && (now - lastGrow < 800));

  let want = null;
  if (inVoiceCall){
    if (callPhase === 'speaking' || isSpeakingNow) want = 'calling';
    else if (callPhase === 'thinking') want = 'thinking';
    else want = 'listening';
  } else if (isSpeakingNow || streaming){
    want = 'talking';
  } else if (isCodingNow){
    want = 'coding';
  } else if (busy){
    want = 'thinking';
  }

  if (want && base !== want){
    base = want;
    renderAll();
    idleSince = now;
  } else if (!want && (base === 'talking' || base === 'thinking' || base === 'calling' || base === 'coding' || base === 'listening')){
    base = 'idle';
    renderAll();
  }

  // Real-time mouth articulation & expressive hand gestures by situation
  ALL.forEach(w => {
    if (!w.isConnected){ ALL.delete(w); return; }
    const s = w.dataset.s || shown();
    if (s === 'calling' || s === 'talking' || isSpeakingNow){
      const mouthOpen = 0.45 + Math.abs(Math.sin(now / 85)) * 0.75 + Math.abs(Math.cos(now / 53)) * 0.45;
      const armL = Math.sin(now / 190) * 42 + 24;
      const armR = Math.cos(now / 165) * -46 - 24;
      w.style.setProperty('--mouth-open', mouthOpen.toFixed(2));
      w.style.setProperty('--arm-l', armL.toFixed(1) + 'deg');
      w.style.setProperty('--arm-r', armR.toFixed(1) + 'deg');
    } else if (s === 'coding'){
      const armL = 32 + Math.sin(now / 45) * 22;
      const armR = -32 + Math.cos(now / 45) * 22;
      w.style.setProperty('--mouth-open', '0.8');
      w.style.setProperty('--arm-l', armL.toFixed(1) + 'deg');
      w.style.setProperty('--arm-r', armR.toFixed(1) + 'deg');
    } else if (s === 'listening' && inVoiceCall){
      const armL = 14 + Math.sin(now / 420) * 10;
      const armR = -14 - Math.sin(now / 420) * 10;
      w.style.setProperty('--mouth-open', '0.5');
      w.style.setProperty('--arm-l', armL.toFixed(1) + 'deg');
      w.style.setProperty('--arm-r', armR.toFixed(1) + 'deg');
    } else if (w._hadAnimProps) {
      w._hadAnimProps = false;
      w.style.removeProperty('--mouth-open');
      w.style.removeProperty('--arm-l');
      w.style.removeProperty('--arm-r');
      return;
    } else {
      return;
    }
    w._hadAnimProps = true;
  });
}, 140);

/* ---- placements ---- */
let dock = null, dockWrap = null;
function placeDock(){
  const cw = $('.composer-wrap'); if (!cw) return;
  if (!dockWrap){
    dockWrap = el('div', 'mz-dock');
    cw.prepend(dockWrap);
    dock = mount(dockWrap, {size: 48, cls: 'docked', id: 'lokiMascot'});
    const savedPos = cfg().customPos;
    if (savedPos && Number.isFinite(savedPos.x) && Number.isFinite(savedPos.y)){
      promoteToFreeRoam(dock, savedPos.x, savedPos.y);
    }
  }
  dockWrap.hidden = !cfg().on;
  if (dock && dock.classList.contains('free-roam')) dock.hidden = !cfg().on;
}

let walkT = 0, wx = 0;
function wander(){
  clearTimeout(walkT); walkT = setTimeout(wander, 7000 + Math.random() * 9000);
  if (!dock || !cfg().on || !cfg().wander || reduced() || dockWrap.hidden || document.hidden) return;
  if (dock.classList.contains('free-roam') || dock.classList.contains('dragging')) return;
  const s = shown(); if (s !== 'idle' && s !== 'curious') return;
  const W = dockWrap.clientWidth - 56; if (W < 60) return;
  const nx = Math.round(Math.random() * Math.min(W, 260));
  const dir = nx > wx ? 1 : -1, dist = Math.abs(nx - wx); if (dist < 20) return;
  const mv = $('.mz-move', dock); dock.classList.add('walk'); dock.style.setProperty('--dir', dir);
  const dur = Math.max(.8, dist / 70); mv.style.transition = `transform ${dur}s cubic-bezier(.45,.05,.55,.95)`; mv.style.setProperty('--x', (document.dir === 'rtl' ? -nx : nx) + 'px');
  wx = nx; setTimeout(() => { dock.classList.remove('walk'); }, dur * 1000);
}

function placeHero(){
  const h = $('#messages .empty .hero-orb'); if (!h || h._mz || !cfg().on) return;
  h._mz = true; h.classList.add('has-mz'); const w = mount(h, {size: 112, cls: 'hero'});
  setTimeout(() => { set('waving'); bubble(w, say('hi'), 2600); }, 500);
}

function placeCall(){
  const st = $('#callOrbWrap') || $('.co-stage') || $('.call-stage');
  if (!st || st._mz || !cfg().on) return;
  st._mz = true;
  st.classList.add('has-mz');
  const w = mount(st, {size: 136, cls: 'incall'});
  const orb = $('#callOrb', st) || $('.co-orb', st) || st;
  const map = {speaking:'calling', thinking:'thinking', listening:'listening', recording:'listening', user:'listening', muted:'sleepy', off:'oops'};
  const sync = () => {
    const rawState = orb.dataset.state || ($('#callOverlay') && $('#callOverlay').dataset.phase) || 'listening';
    const s = map[rawState];
    w._force = s || 'listening';
    render(w);
  };
  new MutationObserver(sync).observe(orb, {attributes: true, attributeFilter: ['data-state']});
  const ov = $('#callOverlay');
  if (ov) new MutationObserver(sync).observe(ov, {attributes: true, attributeFilter: ['data-phase', 'data-state', 'hidden']});
  sync();
}

function resetPosition(){
  saveCfg({customPos: null});
  if (dock){
    dock.classList.remove('free-roam');
    if (dockWrap && dock.parentElement !== dockWrap) dockWrap.appendChild(dock);
    dock.style.removeProperty('position');
    dock.style.removeProperty('left');
    dock.style.removeProperty('top');
    dock.style.removeProperty('bottom');
    dock.style.removeProperty('right');
    dock.style.removeProperty('inset-inline-start');
    dock.style.removeProperty('inset-inline-end');
    dock.style.removeProperty('transform');
    const mv = $('.mz-move', dock);
    if (mv) mv.style.removeProperty('transform');
  }
}

function apply(){
  const on = cfg().on; document.documentElement.classList.toggle('mz-off', !on);
  if (on){ placeDock(); placeHero(); placeCall(); } else if (dockWrap) dockWrap.hidden = true;
}
let _mzPlaceRaf = 0;
new MutationObserver(() => {
  if (_mzPlaceRaf) return;
  _mzPlaceRaf = requestAnimationFrame(() => {
    _mzPlaceRaf = 0;
    placeHero();
    placeCall();
    if (dockWrap) dockWrap.hidden = !cfg().on;
  });
}).observe(document.body, {childList: true, subtree: true});
document.addEventListener('input', e => { if (e.target.id === 'prompt' && base === 'idle' && trans !== 'curious' && e.target.value.length % 12 === 1){ trans = null; set('curious'); } }, true);
document.addEventListener('submit', e => { if (e.target.id === 'composer'){ set('surprised', 600); } }, true);

/* ---- settings ---- */
A.registerSettings && A.registerSettings({id:'mascot', title:'Mascot', render(sec){
  const c = cfg();
  const expressions = [
    ['happy', '😄'], ['curious', '👀'], ['thinking', '🤔'], ['talking', '💬'],
    ['calling', '🎙️'], ['coding', '💻'], ['dancing', '💃'], ['celebrating', '🎉'],
    ['juggling', '🤹'], ['salute', '🫡'], ['surprised', '😮'], ['oops', '😕'],
    ['waving', '👋'], ['love', '😍'], ['sleepy', '😴']
  ];
  sec.innerHTML = `<h3>${esc(window.I18N ? I18N.t('Mascot') : 'Mascot')}</h3>
  <div class="mz-pre"></div>
  <div class="set-row"><div class="lbl"><b>Loki</b><small>${esc(t('An animated buddy that reacts while Lokizenith works (Hold & drag Loki anywhere!)'))}</small></div><label class="switch"><input type="checkbox" id="mzOn" ${c.on ? 'checked' : ''}><span></span></label></div>
  <div class="set-row"><div class="lbl"><b>${esc(t('Walk around'))}</b><small>${esc(t('Let Loki wander along the message box'))}</small></div><label class="switch"><input type="checkbox" id="mzWalk" ${c.wander ? 'checked' : ''}><span></span></label></div>
  <div class="set-row"><div class="lbl"><b>${esc(t('Position'))}</b><small>${esc(t('Hold & drag Loki anywhere on screen, or reset to dock'))}</small></div><button class="btn-ghost" id="mzResetPos">↺ ${esc(t('Reset Dock Position'))}</button></div>
  <div class="set-row col"><div class="lbl"><b>${esc(t('Try an expression'))}</b></div><div class="lab-row mz-try">${expressions.map(([s, e]) => `<button class="btn-ghost" data-s="${s}">${e} ${esc(t(s[0].toUpperCase() + s.slice(1)))}</button>`).join('')}</div></div>`;
  const pv = mount($('.mz-pre', sec), {size: 92, cls: 'preview'});
  $('#mzOn', sec).onchange = e => saveCfg({on: e.target.checked});
  $('#mzWalk', sec).onchange = e => saveCfg({wander: e.target.checked});
  const rp = $('#mzResetPos', sec);
  if (rp) rp.onclick = () => { resetPosition(); A.toast && A.toast(t('Loki returned to the dock!')); };
  $$('.mz-try button', sec).forEach(b => b.onclick = () => {
    const s = b.dataset.s;
    pv._force = s; render(pv);
    set(s, 3000);
    clearTimeout(pv._ft);
    pv._ft = setTimeout(() => { pv._force = null; render(pv); }, 3000);
  });
}});
function t(s){ return window.I18N ? I18N.t(s) : s; }

/* ---- Autonomous suggestions: Loki suggests questions / tasks in the user's selected language ---- */
const SUGGESTIONS = {
  he: [
    'נסה לשאול: "כתוב סקריפט LSL מלא לדלת אוטומטית עם חיישן"',
    'רוצה רעיון? "בנה סצנת תלת-ממד ב-Three.js עם חלקיקים זוהרים"',
    'שאל אותי: "עצב דף נחיתה מודרני בסגנון Glassmorphism"',
    'תן לי משימה: "פתח בוט דיסקורד חכם ב-Python עם פקודות Slash"',
    'נסה לשאול: "צור קוד LSL לתאורת מועדון משתנה לפי קצב"',
    'שאל אותי: "איך לבנות מערכת Authentication מאובטחת?"',
    'נסה לבקש: "צור תמונת קונספט עתידנית בסגנון Cyberpunk"',
    'תן לי משימה: "כתוב אלגוריתם מיון מהיר עם הסבר ודוגמאות"',
    'רוצה קוד מורכב? "פתח משחק ארקייד ב-Canvas עם פיזיקה מלאה"',
    'שאל אותי: "בנה סקריפט LSL לטלפורטר הולוגרפי ב-Second Life"'
  ],
  en: [
    'Try asking: "Write a complete working LSL auto-door script"',
    'Need an idea? "Build a 3D Three.js scene with glowing particles"',
    'Ask me: "Design a sleek glassmorphism landing page with Tailwind"',
    'Give me a task: "Create an autonomous AI agent loop in Python"',
    'Try asking: "Write an LSL holographic teleport pad script"',
    'Ask me: "Generate a futuristic cyberpunk synthwave wallpaper"',
    'Need some code? "Build an arcade space shooter game in HTML5 Canvas"',
    'Try asking: "Explain transformer attention mechanisms in detail"',
    'Ask me: "Write an optimized SQLite analytics query"',
    'Give me a challenge: "Create a full-stack real-time WebSocket dashboard"'
  ],
  ar: [
    'جرّب أن تسأل: "اكتب سكربت LSL كامل لباب أوتوماتيكي مع مستشعر"',
    'هل تريد فكرة؟ "صمّم مشهد ثلاثي الأبعاد باستخدام Three.js"',
    'اسألني: "صمّم صفحة هبوط عصرية بأسلوب Glassmorphism"',
    'أعطني مهمة: "برمج وكيل ذكاء اصطناعي متكامل بلغة Python"',
    'جرّب أن تسأل: "اكتب خوارزمية فرز سريع مع شرح وأمثلة"',
    'اسألني: "كيف أبني نظام مصادقة آمن لتطبيقات الويب؟"'
  ]
};

let suggestIdx = 0;

function tickAutonomousSuggestion(){
  if (document.hidden || !cfg().on) return;
  const authOv = document.getElementById('authOverlay');
  if (authOv && !authOv.hidden) return;
  const isBusy = !!document.querySelector('.msg.bot.busy, #lessonsView .ls-working');
  if (isBusy) return;

  const target = (dock && dock.isConnected && !dockWrap?.hidden) ? dock : document.querySelector('.mz.hero');
  if (!target || !target.isConnected) return;

  const pool = SUGGESTIONS[lang()] || SUGGESTIONS.en;
  const line = pool[suggestIdx % pool.length];
  suggestIdx++;

  set('talking', 3000);
  bubble(target, line, 6500);
}

// Loki mascot suggests fresh lines on his own using zero-latency local pool
setInterval(tickAutonomousSuggestion, 14000);

apply(); blink(); lookAround(); setTimeout(wander, 4000);
window.Mascot = {
  set, mount,
  say: (text, ms) => dock && bubble(dock, text, ms),
  setSpeaking,
  setCallPhase,
  resetPosition,
  tickAutonomousSuggestion,
  react,
  get state(){ return shown(); },
  config: cfg,
  setConfig: saveCfg
};
})();
