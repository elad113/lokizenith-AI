/* ==========================================================================
   Lokizenith Live Voice Call — Studio Edition
   - Side Panel with 6 Voices: 3 Male (Matthew, Brian, Joey) + 3 Female (Joanna, Amy, Salli)
   - Faster Talk Speed by default (1.25×) + Live Speed Selector (1.0×, 1.25×, 1.5×, 1.75×)
   - Automatic Spoken Language Detection (English, Hebrew, Arabic, Russian, Spanish, French, German)
     & responds + speaks in the exact language the user spoke
   - Mute & Quiet Toggle Buttons: morph SVG icon + turn whole button glowing RED with animation
   - Extra Features: AI Call Persona Modes, 24-Bar Audio Spectrum, Live Transcript Drawer + Save to Chat, Quick Voice Chips
   ========================================================================== */
(function(){
const A = window.App || window._Loki;
if (!A) return;
const {$, $$, el, esc, state, toast, plain, speak} = A;
const S = new Proxy({}, { get: (_, k) => (A.settings ? A.settings()[k] : undefined) });
const t = s => window.I18N ? I18N.t(s) : s;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

const VOICE_PROFILES = [
  { id: 'male-matthew',  name: 'Matthew', gender: 'male',   polly: 'Matthew', badge: '♂ Male · Warm Studio',     pitch: 0.94, detune: 0 },
  { id: 'male-brian',    name: 'Brian',   gender: 'male',   polly: 'Brian',   badge: '♂ Male · Deep British',    pitch: 0.88, detune: -110 },
  { id: 'male-joey',     name: 'Joey',    gender: 'male',   polly: 'Joey',    badge: '♂ Male · Energetic Fast',  pitch: 0.98, detune: 55 },
  { id: 'female-joanna', name: 'Joanna',  gender: 'female', polly: 'Joanna',  badge: '♀ Female · Natural Studio',pitch: 1.08, detune: 0 },
  { id: 'female-amy',    name: 'Amy',     gender: 'female', polly: 'Amy',     badge: '♀ Female · Crisp British', pitch: 1.12, detune: 65 },
  { id: 'female-salli',  name: 'Salli',   gender: 'female', polly: 'Salli',   badge: '♀ Female · Warm Expressive',pitch: 1.05, detune: -35 }
];

const PERSONAS = [
  { id: 'companion', icon: '⚡', name: 'Smart Companion',   prompt: 'Be warm, witty, sharp, and helpful.' },
  { id: 'coach',     icon: '💻', name: 'Coding Architect',  prompt: 'Act as a senior software architect and coding coach. Give clear technical insights.' },
  { id: 'tutor',     icon: '🎓', name: 'Language & Study Tutor', prompt: 'Act as an encouraging tutor. Explain concepts simply and help the user practice.' },
  { id: 'debate',    icon: '🔥', name: 'Debate Partner',    prompt: 'Challenge assumptions constructively with sharp counter-arguments and logic.' },
  { id: 'exec',      icon: '💼', name: 'Executive Advisor', prompt: 'Give high-level strategic, business, and product advice with zero fluff.' }
];

const LANG_META = {
  en: { code: 'en', bcp: 'en-US', label: 'English',  sys: 'Respond 100% in natural spoken English.' },
  he: { code: 'he', bcp: 'he-IL', label: 'עברית (Hebrew)', sys: 'ענה אך ורק בעברית טבעית וזורמת.' },
  ar: { code: 'ar', bcp: 'ar-SA', label: 'العربية (Arabic)', sys: 'أجب باللغة العربية الطبيعية فقط.' },
  ru: { code: 'ru', bcp: 'ru-RU', label: 'Русский (Russian)', sys: 'Отвечай полностью на естественном русском языке.' },
  es: { code: 'es', bcp: 'es-ES', label: 'Español (Spanish)', sys: 'Responde completamente en español natural.' },
  fr: { code: 'fr', bcp: 'fr-FR', label: 'Français (French)', sys: 'Réponds entièrement en français naturel.' },
  de: { code: 'de', bcp: 'de-DE', label: 'Deutsch (German)', sys: 'Antworte vollständig auf natürlichem Deutsch.' }
};

function detectSpokenLanguage(text, fallback = 'en'){
  const s = String(text || '').trim();
  if (!s) return LANG_META[fallback] || LANG_META.en;
  if (/[\u0590-\u05FF]/.test(s)) return LANG_META.he;
  if (/[\u0600-\u06FF]/.test(s)) return LANG_META.ar;
  if (/[\u0400-\u04FF]/.test(s)) return LANG_META.ru;
  if (/[¿¡ñáéíóú]/i.test(s) || /\b(hola|gracias|por favor|cómo|qué|buenos días|puedes|quiero)\b/i.test(s)) return LANG_META.es;
  if (/[çœæ]/i.test(s) || /\b(bonjour|salut|merci|comment|pourquoi|avec|très|je voudrais)\b/i.test(s)) return LANG_META.fr;
  if (/[äöüß]/i.test(s) || /\b(hallo|danke|bitte|warum|wie geht|können|ich möchte)\b/i.test(s)) return LANG_META.de;
  if (/[a-zA-Z]{2,}/.test(s)) return LANG_META.en;
  return LANG_META[fallback] || LANG_META.en;
}

const MIC_ON_SVG = `<svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"/></svg>`;
const MIC_OFF_SVG = `<svg viewBox="0 0 24 24"><path d="M9 9v2a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v3M8 22h8"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;

const SPK_ON_SVG = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>`;
const SPK_OFF_SVG = `<svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;

const C = {
  open: false,
  muted: false,
  quiet: false,
  phase: 'idle',
  voiceId: localStorage.getItem('lz.call.voice') || 'male-matthew',
  speed: parseFloat(localStorage.getItem('lz.call.speed') || '1.25') || 1.25,
  persona: localStorage.getItem('lz.call.persona') || 'companion',
  detectedLang: 'en',
  stream: null, track: null, ctx: null, analyser: null, data: null, freqData: null, raf: 0,
  sr: null, srBuf: '',
  rec: null, chunks: [], recMime: '',
  speaking: false, talkFrames: 0, silFrames: 0, floor: 0.008,
  abort: null, history: [], transcript: [], startedAt: 0, timerId: 0,
  lastSpokenReply: '',
  bargeFrames: 0, spokenUpTo: 0, sayQueue: [], sayBusy: false, streamDone: true, turnSeq: 0
};

/* ---- Windows app bridge: report call state to the floating bar, route speech to Computer use ---- */
const DESK = () => window.LokizenithDesktop || null;
function reportState(caption){
  const d = DESK(); if (!d || !d.call) return;
  try { d.call.setState({ active: C.open, muted: C.muted, phase: C.phase, caption: caption != null ? String(caption).slice(0, 140) : '' }); } catch(_){}
}
async function cuStatus(){
  const d = DESK(); if (!d || !d.computerUse) return null;
  try { return await d.computerUse.status(); } catch(_){ return null; }
}
const CU_START_RE = /^(?:(?:please|can you|could you|hey)\s+)*(?:(?:use|start)\s+computer use|computer use|take control(?: of my (?:pc|computer))?|on my (?:pc|computer)|control my (?:pc|computer))[\s,:-]*/i;
const CU_INLINE_RE = /\b(on my (?:pc|computer|screen)|take control|control my (?:pc|computer)|computer use)\b/i;

function currentVoice(){
  return VOICE_PROFILES.find(v => v.id === C.voiceId) || VOICE_PROFILES[0];
}
function currentPersona(){
  return PERSONAS.find(p => p.id === C.persona) || PERSONAS[0];
}

function buildOverlay(){
  if ($('#callOverlay')) return;
  const ov = el('div', 'call-ov');
  ov.id = 'callOverlay';
  ov.innerHTML = `
    <div class="call-amb"><div class="call-blob b1"></div><div class="call-blob b2"></div></div>
    <header class="call-top">
      <div class="call-top-left">
        <span class="call-live"><i></i><span id="callModelLbl">Lokizen 4.0 · Matthew (♂)</span></span>
        <span class="call-lang-pill" id="callLangBadge" title="Automatically detects the language you speak and replies in that language">🌐 Auto-Lang: English</span>
      </div>
      <div class="call-top-right">
        <span class="call-timer" id="callTimer">00:00</span>
        <button class="icon-btn" id="callSideToggleBtn" title="Toggle Voice & Studio Side Panel">🎛</button>
        <button class="icon-btn" id="callMinBtn" title="Minimize">⤡</button>
      </div>
    </header>

    <div class="call-layout">
      <!-- Main Center Stage -->
      <div class="call-stage co-stage">
        <div class="call-orb-wrap" id="callOrbWrap" title="Tap to interrupt or speak now">
          <div class="call-ring r1"></div><div class="call-ring r2"></div><div class="call-ring r3"></div>
          <div class="call-orb co-orb" id="callOrb" data-state="idle">
            <div class="core"></div>
            <svg viewBox="0 0 64 64" class="call-crest"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#c4b5fd"/></linearGradient></defs><path d="M32 8L12 20v24l20 12 20-12V20L32 8zm0 8l13 7.8v16.4L32 48 19 40.2V23.8L32 16z" fill="url(#cg)"/></svg>
          </div>
        </div>

        <!-- 24-Bar Live Audio Spectrum Visualizer -->
        <div class="call-spectrum" id="callSpectrum" aria-hidden="true">${'<i></i>'.repeat(24)}</div>

        <div class="call-state" id="callState">Connecting…</div>
        <div class="call-sub" id="callSub">Speak in any language — I'll detect it and answer at 1.25× speed</div>
        <div class="call-caption" id="callCaption" dir="auto"></div>

        <!-- Quick Voice Topic Chips -->
        <div class="call-chips" id="callQuickChips">
          <button type="button" data-q="Give me a quick 20-second briefing on quantum computing">⚡ Quantum Briefing</button>
          <button type="button" data-q="Let's brainstorm a startup idea together">🚀 Startup Idea</button>
          <button type="button" data-q="בוא נדבר בעברית! ספר לי משהו מרתק על חלל">🇮🇱 דבר בעברית</button>
          <button type="button" data-q="למד אותי טריק מתקדם ב-Python או LSL">💻 Coding Tip</button>
        </div>

        <div class="call-quick-row">
          <input id="callTypeInput" type="text" dir="auto" placeholder="Type in any language & press Enter to hear voice reply…" />
          <button id="callReplayBtn" type="button" title="Speak reply out loud again">🔊 Replay</button>
        </div>
      </div>

      <!-- Side Panel: 3 Male + 3 Female Voices, Talk Speed, Persona & Live Transcript -->
      <aside class="call-side" id="callSidePanel">
        <div class="cs-sec">
          <div class="cs-title">🎙 Choose Voice (3 Male · 3 Female)</div>
          <div class="cs-voice-group">
            <div class="cs-v-lbl">♂ Male Voices</div>
            <div class="cs-voices" id="callMaleVoices"></div>
            <div class="cs-v-lbl" style="margin-top:8px">♀ Female Voices</div>
            <div class="cs-voices" id="callFemaleVoices"></div>
          </div>
        </div>

        <div class="cs-sec">
          <div class="cs-title">⚡ Talk Speed <span id="callSpeedLbl">1.25× (Fast)</span></div>
          <div class="cs-speeds" id="callSpeedBtns">
            <button type="button" data-spd="1.0">1.0×</button>
            <button type="button" data-spd="1.25" class="on">1.25×</button>
            <button type="button" data-spd="1.5">1.5×</button>
            <button type="button" data-spd="1.75">1.75×</button>
          </div>
        </div>

        <div class="cs-sec">
          <div class="cs-title">🎭 AI Call Persona</div>
          <div class="cs-personas" id="callPersonaBtns"></div>
        </div>

        <div class="cs-sec cs-trans-sec">
          <div class="cs-title">
            <span>📝 Live Transcript</span>
            <button type="button" class="cs-save-btn" id="callSaveChatBtn" title="Save call transcript to chat">➜ Save to Chat</button>
          </div>
          <div class="cs-trans-list" id="callTranscriptList">
            <div class="cs-trans-empty">Conversation lines will appear here…</div>
          </div>
        </div>
      </aside>
    </div>

    <footer class="call-dock">
      <button class="call-btn" id="callMuteBtn" type="button" aria-pressed="false" title="Toggle Microphone Mute">
        <span class="cb-ico" id="callMuteIco">${MIC_ON_SVG}</span>
        <span id="callMuteTxt">Mute</span>
      </button>
      <button class="call-btn end" id="callEndBtn" type="button" title="End call">
        <span class="cb-ico"><svg viewBox="0 0 24 24"><path d="M3 15c3.5-4 14.5-4 18 0l-2.5 3.5a2 2 0 0 1-2.6.3l-2.4-1.8a1 1 0 0 0-.6-.2h-1.8a1 1 0 0 0-.6.2l-2.4 1.8a2 2 0 0 1-2.6-.3L3 15z"/></svg></span>
        <span>End Call</span>
      </button>
      <button class="call-btn" id="callSpeakerBtn" type="button" aria-pressed="false" title="Toggle Quiet Mode (Silence AI Voice Output)">
        <span class="cb-ico" id="callQuietIco">${SPK_ON_SVG}</span>
        <span id="callQuietTxt">Quiet</span>
      </button>
    </footer>`;
  ov.hidden = true;
  document.body.appendChild(ov);

  renderSideControls();

  $('#callEndBtn').onclick = end;
  $('#callMuteBtn').onclick = toggleMute;
  $('#callSpeakerBtn').onclick = toggleQuiet;
  $('#callSideToggleBtn').onclick = () => ov.classList.toggle('hide-side');
  $('#callOrbWrap').onclick = () => {
    if (C.phase === 'speaking' || C.phase === 'thinking') {
      bargeIn();
    } else if (C.speaking && C.rec && C.rec.state === 'recording') {
      C.speaking = false;
      try { C.rec.stop(); } catch(_){}
    }
  };
  $('#callMinBtn').onclick = () => ov.classList.toggle('mini');

  const inp = $('#callTypeInput');
  if (inp) {
    inp.onkeydown = e => {
      if (e.key === 'Enter' && inp.value.trim()) {
        const q = inp.value.trim();
        inp.value = '';
        stopSpeaking();
        respond(q);
      }
    };
  }
  const rep = $('#callReplayBtn');
  if (rep) {
    rep.onclick = () => {
      const txt = C.lastSpokenReply || ($('#callCaption') && $('#callCaption').textContent) || '';
      if (txt) {
        if (C.quiet) {
          C.quiet = false;
          syncMuteQuietUI();
        }
        speakAloud(txt);
      }
    };
  }
  $$('#callQuickChips button', ov).forEach(b => {
    b.onclick = () => {
      stopSpeaking();
      respond(b.dataset.q);
    };
  });
  const saveBtn = $('#callSaveChatBtn');
  if (saveBtn) {
    saveBtn.onclick = () => {
      if (!C.transcript.length) { toast('No call transcript yet', 'err'); return; }
      if (A.addConversation) {
        const msgs = C.transcript.map(item => ({
          id: A.uid(),
          role: item.role,
          content: item.text,
          ts: Date.now()
        }));
        A.addConversation('🎙 Voice Call (' + currentVoice().name + ')', msgs);
        toast('Call transcript saved to chat history!');
      }
    };
  }
}

function renderSideControls(){
  const mBox = $('#callMaleVoices');
  const fBox = $('#callFemaleVoices');
  if (mBox && fBox){
    const renderBtn = v => `<button type="button" class="cs-voice-btn${C.voiceId === v.id ? ' on' : ''}" data-vid="${v.id}">
      <span class="v-avatar ${v.gender}">${v.gender === 'male' ? '♂' : '♀'}</span>
      <span class="v-info"><b>${esc(v.name)}</b><small>${esc(v.badge.replace(/^[♂♀]\s*(Male|Female)\s*·\s*/, ''))}</small></span>
    </button>`;
    mBox.innerHTML = VOICE_PROFILES.filter(v => v.gender === 'male').map(renderBtn).join('');
    fBox.innerHTML = VOICE_PROFILES.filter(v => v.gender === 'female').map(renderBtn).join('');
    $$('.cs-voice-btn', $('#callSidePanel')).forEach(btn => {
      btn.onclick = () => {
        C.voiceId = btn.dataset.vid;
        localStorage.setItem('lz.call.voice', C.voiceId);
        renderSideControls();
        updateHeaderBadge();
        const v = currentVoice();
        toast(`Switched voice to ${v.name} (${v.gender === 'male' ? 'Male' : 'Female'})`);
        if (!C.quiet) {
          const sample = C.detectedLang === 'he' ? `שלום! כאן ${v.name}.`
                       : C.detectedLang === 'ar' ? `مرحباً! أنا ${v.name}.`
                       : `Hi, I'm ${v.name}! Ready to talk.`;
          speakAloud(sample);
        }
      };
    });
  }

  $$('#callSpeedBtns button').forEach(b => {
    const spd = parseFloat(b.dataset.spd);
    b.classList.toggle('on', Math.abs(spd - C.speed) < 0.02);
    b.onclick = () => {
      C.speed = spd;
      localStorage.setItem('lz.call.speed', String(spd));
      const lbl = $('#callSpeedLbl');
      if (lbl) lbl.textContent = spd + '×' + (spd >= 1.5 ? ' (Turbo)' : spd >= 1.2 ? ' (Fast)' : ' (Normal)');
      renderSideControls();
      toast(`Voice speed set to ${spd}×`);
    };
  });

  const pBox = $('#callPersonaBtns');
  if (pBox){
    pBox.innerHTML = PERSONAS.map(p => `<button type="button" class="cs-pers-btn${C.persona === p.id ? ' on' : ''}" data-pid="${p.id}">${p.icon} <span>${esc(p.name)}</span></button>`).join('');
    $$('.cs-pers-btn', pBox).forEach(b => {
      b.onclick = () => {
        C.persona = b.dataset.pid;
        localStorage.setItem('lz.call.persona', C.persona);
        renderSideControls();
        toast(`Call persona: ${currentPersona().name}`);
      };
    });
  }
}

function updateHeaderBadge(){
  const v = currentVoice();
  const lbl = $('#callModelLbl');
  if (lbl) lbl.textContent = `${state.model === 'stark' ? 'Lokizen 4.0 Stark' : 'Lokizen 3.5 Fera'} · ${v.name} (${v.gender === 'male' ? '♂' : '♀'})`;
  const langInfo = LANG_META[C.detectedLang] || LANG_META.en;
  const lb = $('#callLangBadge');
  if (lb) lb.textContent = `🌐 Auto-Detected: ${langInfo.label}`;
}

function syncMuteQuietUI(){
  const mBtn = $('#callMuteBtn');
  const mIco = $('#callMuteIco');
  const mTxt = $('#callMuteTxt');
  if (mBtn && mIco && mTxt){
    mBtn.classList.toggle('on', C.muted);
    mBtn.classList.toggle('active-red', C.muted);
    mBtn.setAttribute('aria-pressed', C.muted ? 'true' : 'false');
    mIco.innerHTML = C.muted ? MIC_OFF_SVG : MIC_ON_SVG;
    mTxt.textContent = C.muted ? t('Muted') : t('Mute');
  }

  const qBtn = $('#callSpeakerBtn');
  const qIco = $('#callQuietIco');
  const qTxt = $('#callQuietTxt');
  if (qBtn && qIco && qTxt){
    qBtn.classList.toggle('on', C.quiet);
    qBtn.classList.toggle('active-red', C.quiet);
    qBtn.setAttribute('aria-pressed', C.quiet ? 'true' : 'false');
    qIco.innerHTML = C.quiet ? SPK_OFF_SVG : SPK_ON_SVG;
    qTxt.textContent = C.quiet ? t('Quiet On') : t('Quiet');
  }
}

function animateToggleBtn(btn){
  if (!btn) return;
  btn.classList.remove('btn-anim-pop');
  void btn.offsetWidth;
  btn.classList.add('btn-anim-pop');
}

function addTranscriptLine(role, text){
  const clean = String(text || '').trim();
  if (!clean) return;
  C.transcript.push({ role, text: clean, lang: C.detectedLang });
  const box = $('#callTranscriptList');
  if (!box) return;
  const emp = $('.cs-trans-empty', box);
  if (emp) emp.remove();
  const row = el('div', 'cs-tr-item ' + role);
  const v = currentVoice();
  row.innerHTML = `<div class="cs-tr-head"><b>${role === 'user' ? '🗣 You' : ('🤖 ' + esc(v.name))}</b><button type="button" class="cs-tr-play" title="Speak this line">🔊</button></div><div class="cs-tr-txt" dir="auto">${esc(clean)}</div>`;
  $('.cs-tr-play', row).onclick = () => {
    if (C.quiet) { C.quiet = false; syncMuteQuietUI(); }
    speakAloud(clean);
  };
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
}

function setPhase(p, sub){
  C.phase = p;
  const ov = $('#callOverlay'); if (!ov) return;
  ov.dataset.phase = p;
  ov.dataset.state = p;
  const orb = $('#callOrb');
  if (orb) orb.dataset.state = C.muted && p === 'listening' ? 'muted' : (p === 'user' ? 'recording' : p);
  if (window.Mascot && window.Mascot.setCallPhase) window.Mascot.setCallPhase(p);
  const v = currentVoice();
  const titles = {
    connecting: t('Connecting…'),
    listening:  C.muted ? t('Microphone Muted') : t('Listening…'),
    user:       t('Hearing you…'),
    thinking:   t('Thinking…'),
    speaking:   `${t('Speaking')} (${v.name} · ${C.speed}×)…`
  };
  $('#callState').textContent = titles[p] || p;
  if (sub !== undefined) $('#callSub').textContent = sub;
  reportState(p === 'speaking' ? (C.lastSpokenReply || '').slice(0, 120) : (titles[p] || p));
}

function setCaption(txt, role){
  const c = $('#callCaption'); if (!c) return;
  c.dataset.role = role || '';
  c.textContent = txt || '';
}

/* Speak text out loud using the selected Male/Female Voice Profile, faster speed, and detected language */
function speakAloud(text, onDone){
  const clean = plain(text || '').trim();
  if (!clean) { if (onDone) onDone(); return; }
  C.lastSpokenReply = clean;
  setCaption(clean.slice(0, 320), 'ai');

  // If Quiet Mode is toggled ON, skip audio output and stay in listening mode!
  if (C.quiet){
    setPhase('listening', t('Quiet mode active — text reply shown above'));
    if (onDone) onDone();
    else armTurn();
    return;
  }

  // Pause the speech recognizer while AI speaks. The mic track itself stays on (echo-cancelled)
  // so you can interrupt by just talking (barge-in); without echo cancellation it is paused.
  const aec = C.track && C.track.getSettings && C.track.getSettings().echoCancellation;
  if (C.track) C.track.enabled = !!aec && !C.muted;
  C.bargeFrames = 0;
  if (C.sr) { try { C.sr.abort(); } catch(_){} C.sr = null; }
  if (C.rec && C.rec.state === 'recording') { C.chunks = []; try { C.rec.stop(); } catch(_){} }

  const v = currentVoice();
  const detLang = detectSpokenLanguage(clean, C.detectedLang).code;
  setPhase('speaking', `${v.name} (${v.gender === 'male' ? '♂' : '♀'}) speaking at ${C.speed}× — tap orb to interrupt`);

  speak(clean, () => {
    if (!C.open) return;
    if (!C.muted && C.track) C.track.enabled = true;
    if (onDone) onDone();
    else {
      setPhase('listening', t('Your turn — speak in any language'));
      armTurn();
    }
  }, {
    voice: v.polly,
    gender: v.gender,
    rate: C.speed,
    pitch: v.pitch,
    detune: v.detune,
    lang: detLang
  });
}

function stopSpeaking(){
  if (A.stopVoice) A.stopVoice();
  if ('speechSynthesis' in window) {
    try { speechSynthesis.cancel(); } catch(_){}
  }
  if (!C.muted && C.track) C.track.enabled = true;
}

/* ---- Start / End ---- */
async function start(){
  buildOverlay();
  try {
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      speechSynthesis.cancel();
      if (speechSynthesis.paused) speechSynthesis.resume();
    }
  } catch(_){}

  const ov = $('#callOverlay'); ov.hidden = false; ov.classList.add('open'); ov.classList.remove('mini');
  if (window.Mascot && window.Mascot.setCallPhase) window.Mascot.setCallPhase('listening');
  C.open = true; C.muted = false; C.quiet = false; C.history = []; C.transcript = []; C.floor = 0.008;
  C.detectedLang = ['en', 'he', 'ar'].includes(S.lang) ? S.lang : 'en';
  const trBox = $('#callTranscriptList');
  if (trBox) trBox.innerHTML = `<div class="cs-trans-empty">Conversation lines will appear here…</div>`;

  syncMuteQuietUI();
  updateHeaderBadge();
  renderSideControls();
  setCaption('', '');
  setPhase('connecting', t('Allow microphone access or type below'));

  try {
    C.stream = await navigator.mediaDevices.getUserMedia({
      audio: {echoCancellation:true, noiseSuppression:true, autoGainControl:true}
    });
    C.track = C.stream.getAudioTracks()[0];
    C.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (C.ctx.state === 'suspended') await C.ctx.resume();
    const src = C.ctx.createMediaStreamSource(C.stream);
    C.analyser = C.ctx.createAnalyser(); C.analyser.fftSize = 256; C.analyser.smoothingTimeConstant = 0.72;
    src.connect(C.analyser);
    C.data = new Uint8Array(C.analyser.fftSize);
    C.freqData = new Uint8Array(C.analyser.frequencyBinCount);
  } catch (_e) {
    // Still start spectrum animation loop for AI speech even if mic is denied
  }

  C.startedAt = Date.now();
  clearInterval(C.timerId);
  C.timerId = setInterval(() => {
    const s = Math.floor((Date.now() - C.startedAt) / 1000);
    const timerEl = $('#callTimer');
    if (timerEl) timerEl.textContent = String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
  }, 1000);

  loop();
  greet();
}

function end(){
  C.open = false;
  cancelAnimationFrame(C.raf); clearTimeout(C.bgTimer); clearInterval(C.timerId);
  C.sayQueue = []; C.sayBusy = false; C.turnSeq++;
  if (C.abort) try { C.abort.abort(); } catch(_){}
  if (C.sr) try { C.sr.abort(); } catch(_){} C.sr = null;
  if (C.rec && C.rec.state !== 'inactive') try { C.rec.stop(); } catch(_){} C.rec = null;
  stopSpeaking();
  if (window.Mascot && window.Mascot.setSpeaking) window.Mascot.setSpeaking(false);
  if (window.Mascot && window.Mascot.setCallPhase) window.Mascot.setCallPhase('idle');
  if (C.stream) C.stream.getTracks().forEach(t => t.stop()); C.stream = null; C.track = null;
  if (C.ctx) try { C.ctx.close(); } catch(_){} C.ctx = null;
  const ov = $('#callOverlay'); if (ov){ ov.classList.remove('open'); ov.hidden = true; }
  reportState('');
}

function toggleMute(){
  C.muted = !C.muted;
  setTimeout(() => reportState(C.muted ? 'Muted' : ''), 0);
  if (C.track) C.track.enabled = !C.muted && C.phase !== 'speaking';
  syncMuteQuietUI();
  animateToggleBtn($('#callMuteBtn'));
  if (C.muted){
    if (C.sr) try { C.sr.abort(); } catch(_){}
    setPhase('listening', t('Microphone muted — click Mute again to unmute'));
  } else {
    setPhase('listening', t('Microphone active — speak in any language'));
    armTurn();
  }
}

function toggleQuiet(){
  C.quiet = !C.quiet;
  syncMuteQuietUI();
  animateToggleBtn($('#callSpeakerBtn'));
  if (C.quiet){
    stopSpeaking();
    setPhase('listening', t('Quiet mode ON (voice muted) — click Quiet again to hear voice'));
    armTurn();
  } else {
    setPhase('listening', t('Voice output enabled — listening'));
    if (C.lastSpokenReply) speakAloud(C.lastSpokenReply);
    else armTurn();
  }
}

/* ---- Audio level + 24-Bar Spectrum + VAD loop ---- */
function loop(){
  if (!C.open) return;
  let rms = 0;
  if (C.analyser && C.data){
    C.analyser.getByteTimeDomainData(C.data);
    let sum = 0;
    for (let i = 0; i < C.data.length; i++){ const v = (C.data[i] - 128) / 128; sum += v * v; }
    rms = Math.sqrt(sum / C.data.length);
  }
  const now = Date.now();
  const level = C.phase === 'speaking' ? (0.32 + Math.sin(now / 95) * 0.18) : Math.min(1, rms * 9);
  const orb = $('#callOrbWrap');
  if (orb) orb.style.setProperty('--lvl', level.toFixed(3));

  // Animate 24-bar audio spectrum
  const bars = $$('#callSpectrum i');
  if (bars.length){
    for (let i = 0; i < bars.length; i++){
      let h = 14;
      if (C.phase === 'speaking' && !C.quiet){
        h = 18 + Math.round((Math.sin(now / 75 + i * 0.55) * 0.5 + 0.5) * 38);
      } else if (!C.muted && rms > 0.01){
        h = Math.min(54, Math.round(12 + rms * 340 * (0.5 + Math.abs(Math.sin(i * 0.7)))));
      } else {
        h = 10 + Math.round(Math.sin(now / 320 + i * 0.4) * 4);
      }
      bars[i].style.height = h + 'px';
    }
  }

  // Barge-in: you start talking while Lokizenith speaks -> it stops and listens.
  if (C.analyser && !C.muted && C.phase === 'speaking' && C.track && C.track.enabled && !C.quiet){
    const bthr = Math.max(0.075, C.floor * 6);
    if (rms > bthr){ if (++C.bargeFrames >= 7){ C.bargeFrames = 0; bargeIn(); } }
    else C.bargeFrames = Math.max(0, C.bargeFrames - 1);
  }

  if (C.analyser && !C.muted && C.phase !== 'speaking' && C.phase !== 'thinking'){
    if (!C.speaking) C.floor = C.floor * 0.995 + rms * 0.005;
    const thr = Math.max(0.018, C.floor * 3.0);

    if (C.phase === 'listening' || C.phase === 'user'){
      if (rms > thr){
        C.talkFrames++; C.silFrames = 0;
        if (!C.speaking && C.talkFrames >= 3){
          C.speaking = true;
          setPhase('user', t('Listening to you…'));
        }
      } else if (C.speaking){
        C.silFrames++;
        if (C.silFrames >= (document.hidden ? 8 : 20)){
          C.speaking = false; C.talkFrames = 0; C.silFrames = 0;
          finishTurn();
        }
      } else {
        C.talkFrames = 0;
      }
    }
  }
  // requestAnimationFrame pauses when the window is minimized (e.g. while Lokizenith controls the PC),
  // so fall back to a timer to keep listening in the background.
  if (document.hidden) { C.raf = 0; C.bgTimer = setTimeout(loop, 50); }
  else C.raf = requestAnimationFrame(loop);
}

function bargeIn(){
  C.sayQueue = []; C.sayBusy = false; C.turnSeq++;
  stopSpeaking();
  if (C.abort){ try { C.abort.abort(); } catch(_){} C.abort = null; }
  setPhase('listening', t('Go ahead — listening'));
  armTurn();
}

function greet(){
  const v = currentVoice();
  const g = C.detectedLang === 'he' ? `היי, כאן ${v.name}. אני מקשיב.`
          : C.detectedLang === 'ar' ? `أهلاً، أنا ${v.name}. أنا أستمع.`
          : `Hi, ${v.name} here. I'm listening.`;
  addTranscriptLine('assistant', g);
  speakAloud(g);
}

/* ---- Turn capture ---- */
function recLang(){
  if (S.voiceLang && S.voiceLang !== 'auto') return S.voiceLang;
  const info = LANG_META[C.detectedLang] || LANG_META[S.lang] || LANG_META.en;
  return info.bcp;
}

function armTurn(){
  if (!C.open || C.muted || C.phase === 'speaking') return;
  C.srBuf = ''; C.speaking = false; C.talkFrames = 0; C.silFrames = 0;
  if (C.track) C.track.enabled = true;

  if (SR){
    if (C.sr) try { C.sr.abort(); } catch(_){}
    try {
      const r = new SR();
      r.lang = recLang(); r.continuous = true; r.interimResults = true;
      r.onresult = e => {
        let interim = '', final = '';
        for (let i = 0; i < e.results.length; i++){
          const tr = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += tr + ' '; else interim += tr;
        }
        C.srBuf = (final + interim).trim();
        if (C.srBuf){
          const det = detectSpokenLanguage(C.srBuf, C.detectedLang);
          if (det.code !== C.detectedLang){
            C.detectedLang = det.code;
            updateHeaderBadge();
          }
          setCaption(C.srBuf, 'user');
        }
      };
      r.onerror = () => {};
      r.onend = () => {
        if (C.open && !C.muted && (C.phase === 'listening' || C.phase === 'user')){
          if (C.srBuf && !C.speaking){ const tx = C.srBuf; C.srBuf = ''; respond(tx); }
          else if (C.phase === 'listening') try { r.start(); } catch(_){}
        }
      };
      C.sr = r; r.start();
    } catch(_){}
  }

  if (window.MediaRecorder && C.stream){
    try {
      const mime = ['audio/webm;codecs=opus','audio/webm','audio/mp4',''].find(m => !m || MediaRecorder.isTypeSupported(m));
      C.recMime = mime || 'audio/webm';
      C.chunks = [];
      C.rec = new MediaRecorder(C.stream, mime ? {mimeType: mime} : {});
      C.rec.ondataavailable = e => { if (e.data && e.data.size) C.chunks.push(e.data); };
      C.rec.onstop = onRecStop;
      C.rec.start();
    } catch(_){}
  }
}

function finishTurn(){
  const srText = C.srBuf.trim(); C.srBuf = '';
  if (C.sr) try { C.sr.stop(); } catch(_){}
  if (srText){
    if (C.rec && C.rec.state === 'recording'){ C.chunks = []; try { C.rec.stop(); } catch(_){} }
    respond(srText);
    return;
  }
  if (C.rec && C.rec.state === 'recording') try { C.rec.stop(); } catch(_){}
  else armTurn();
}

async function onRecStop(){
  if (!C.open || !C.chunks.length){ if (C.phase === 'user') { setPhase('listening'); armTurn(); } return; }
  const blob = new Blob(C.chunks, {type: C.recMime}); C.chunks = [];
  if (blob.size < 1800){ setPhase('listening'); armTurn(); return; }
  setPhase('thinking', t('Transcribing…'));
  try {
    const b64 = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1]);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
    const r = await fetch('/api/transcribe', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({audio: b64, mime: C.recMime, lang: C.detectedLang})
    }).then(r => r.json());
    const text = (r.text || '').trim();
    if (text){ setCaption(text, 'user'); respond(text); }
    else { setPhase('listening', t("Didn't catch that — try again")); armTurn(); }
  } catch (_e) {
    setPhase('listening', t('Tap or speak again')); armTurn();
  }
}

/* ---- Detect language, stream reply in that exact language, and speak it at selected speed ---- */
async function routeToComputer(userText, det){
  const d = DESK(); if (!d || !d.computerUse) return false;
  const st = await cuStatus();
  const he = det.code === 'he';
  if (st && st.running){
    const r = await d.computerUse.say(userText).catch(() => null);
    const reply = r && r.stopped ? (he ? 'עצרתי.' : 'Stopped.') : (he ? 'הבנתי, מוסיף את זה למשימה.' : 'Got it, I\'m adding that to the task.');
    addTranscriptLine('assistant', reply); speakAloud(reply);
    return true;
  }
  if (CU_START_RE.test(userText) || CU_INLINE_RE.test(userText)){
    const goal = userText.replace(CU_START_RE, '').replace(/^(and|then)\s+/i, '').trim() || userText;
    const r = await d.computerUse.start(goal, { source: 'voice' }).catch((e) => ({ ok: false, error: String(e && e.message || e) }));
    const reply = r && r.ok === false ? (r.error || 'I could not take control.') : (he ? 'לוקיזניט לוקח שליטה עכשיו. תגיד עצור בכל רגע.' : 'Taking control now. Say stop any time.');
    addTranscriptLine('assistant', reply); speakAloud(reply);
    return true;
  }
  return false;
}

/* Speak finished sentences while the rest of the answer is still streaming (much faster first audio). */
function pumpSay(seq){
  if (seq !== C.turnSeq || C.sayBusy) return;
  const next = C.sayQueue.shift();
  if (next == null){
    if (C.streamDone && C.open){ if (!C.muted && C.track) C.track.enabled = true; setPhase('listening', t('Your turn — just speak')); armTurn(); }
    return;
  }
  C.sayBusy = true;
  speakAloud(next, () => { C.sayBusy = false; if (seq === C.turnSeq) pumpSay(seq); });
}
function queueSentences(full, final, seq){
  const text = plain(full);
  let rest = text.slice(C.spokenUpTo);
  const out = [];
  for (;;){
    const m = rest.match(/^[\s\S]*?[.!?…。؟](?=\s|$)/);
    if (!m || (m[0].trim().length < 12 && !final)) break;
    out.push(m[0].trim()); C.spokenUpTo += m[0].length; rest = text.slice(C.spokenUpTo);
  }
  if (final && rest.trim()){ out.push(rest.trim()); C.spokenUpTo = text.length; }
  if (out.length){ C.sayQueue.push(...out); pumpSay(seq); }
}

async function respond(userText){
  if (!C.open || !userText) return;
  const det = detectSpokenLanguage(userText, C.detectedLang);
  C.detectedLang = det.code;
  updateHeaderBadge();
  setCaption(userText, 'user');
  addTranscriptLine('user', userText);
  if (await routeToComputer(userText, det)) return;
  setPhase('thinking', `${t('Thinking')} (${det.label})…`);
  C.history.push({role:'user', content: userText});
  if (C.history.length > 14) C.history.splice(0, C.history.length - 14);

  const ctrl = new AbortController(); C.abort = ctrl;
  let full = '';
  const seq = ++C.turnSeq; C.spokenUpTo = 0; C.sayQueue = []; C.sayBusy = false; C.streamDone = false;
  const v = currentVoice();
  const p = currentPersona();
  const sysMsg = `You are ${v.name} (Lokizen 4.0 Stark) in a live real-time voice call with the user, developed by Lokizenith Studios.
Persona: ${p.name} — ${p.prompt}
CRITICAL LANGUAGE RULE: The user just spoke in ${det.label}. ${det.sys} Match the exact language the user used!
Reply in natural spoken language ONLY — 1 to 3 concise, punchy sentences, no markdown, no code blocks, no bullet lists, no symbols or emojis.`;
  const msgs = [{role:'system', content: sysMsg}, ...C.history];
  try {
    if (window.LZ && window.LZ.chat){
      full = await window.LZ.chat(msgs, {
        tier: state.model || 'stark',
        level: 0,
        maxTokens: 280,
        signal: ctrl.signal,
        onToken: (_d, f) => {
          full = f;
          if (C.phase !== 'speaking') setCaption(plain(full).slice(-280), 'ai');
          if (!C.quiet && seq === C.turnSeq) queueSentences(full, false, seq);
        }
      });
    } else {
      const res = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'}, signal: ctrl.signal,
        body: JSON.stringify({ model: state.model, mode: 'fast', messages: msgs, maxTokens: 280 })
      });
      if (res.ok){
        const j = await res.json();
        full = j.text || '';
      }
    }
    const spoken = plain(full).trim();
    C.history.push({role:'assistant', content: spoken});
    C.streamDone = true;
    if (spoken && seq === C.turnSeq) {
      addTranscriptLine('assistant', spoken);
      if (C.quiet) speakAloud(spoken);
      else { queueSentences(full, true, seq); pumpSay(seq); }
    } else if (seq !== C.turnSeq) {
      /* interrupted */
    } else {
      setPhase('listening', t('Your turn — just speak'));
      armTurn();
    }
  } catch (e) {
    if (e.name !== 'AbortError'){ setPhase('listening', t('Speak or type again')); armTurn(); }
  } finally { C.abort = null; }
}

document.addEventListener('keydown', (e) => {
  if (!C.open) return;
  const typing = e.target && (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable);
  if (e.key === 'Escape' && !typing){ e.preventDefault(); end(); }
  else if ((e.key === 'm' || e.key === 'M') && !typing && !e.ctrlKey && !e.metaKey){ e.preventDefault(); toggleMute(); }
  else if (e.key === ' ' && !typing && (C.phase === 'speaking' || C.phase === 'thinking')){ e.preventDefault(); bargeIn(); }
});
if (DESK() && DESK().computerUse && DESK().computerUse.onEvent){
  DESK().computerUse.onEvent((ev) => {
    if (!C.open || !ev) return;
    if (ev.kind === 'done' || ev.kind === 'stopped'){
      const msg = String(ev.text || (ev.ok ? 'Done.' : 'Stopped.')).slice(0, 300);
      addTranscriptLine('assistant', msg);
      if (C.phase !== 'speaking') speakAloud(msg);
    } else if (ev.kind === 'say' && ev.text && C.phase === 'listening'){
      setCaption(ev.text, 'ai');
    }
  });
}

window.Call = {start, open: start, end, toggleMute, isOpen: () => C.open, VOICE_PROFILES, detectSpokenLanguage};
const btn = $('#callBtn'); if (btn) btn.onclick = start;
})();
