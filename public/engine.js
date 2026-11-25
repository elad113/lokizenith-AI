/* Lokizenith engine — model routing, vision, images, web, files.
   Internal only: nothing in here is shown to the user by name. */
(function(){
'use strict';
const BASE = 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1';
const M = {
  big:'gpt-oss-120b', llama:'Meta-Llama-3_3-70B-Instruct',
  mid:'Mistral-Small-3.2-24B-Instruct-2506', small:'gpt-oss-20b',
  vision:'Qwen/Qwen2.5-VL-72B-Instruct', image:'stable-diffusion-xl-base-v10'
};
// ordered for instant streaming first-byte and zero 429 rate-limit bursts
const ORDER = {
  stark:[M.mid, M.llama, M.big, M.small],
  fera:[M.mid, M.small, M.llama, M.big]
};
const ORDER_DEEP = {
  stark:[M.llama, M.mid, M.big, M.small],
  fera:[M.mid, M.llama, M.big, M.small]
};
let rrIdx = 0;
const cooldown = {};          // model -> ms timestamp when usable again
const lastPolli = {t:0};
// Keep internal model reasoning_effort low so upstream never stalls for 20s before first token;
// Ultra/Extra-High depth is handled by our fast parallel blueprint + structured synthesis.
const EFFORT = ['low','low','low','low','low'];
const NOOP = () => {};

const sleep = (ms, signal) => new Promise((res, rej) => {
  const t = setTimeout(res, ms);
  if (signal) signal.addEventListener('abort', () => { clearTimeout(t); rej(abortErr()); }, {once:true});
});
function abortErr(){ const e = new Error('Stopped'); e.name = 'AbortError'; return e; }

/* fetch with timeout that also honours an outer AbortSignal */
async function tfetch(url, opts = {}, ms = 30000, outer){
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  const onAbort = () => ctl.abort();
  if (outer){ if (outer.aborted) throw abortErr(); outer.addEventListener('abort', onAbort, {once:true}); }
  try { return await fetch(url, {...opts, signal: ctl.signal}); }
  catch(e){ if (outer && outer.aborted) throw abortErr(); const err = new Error(ms && !outer?.aborted ? 'timeout' : e.message); err.cause = e; throw err; }
  finally { clearTimeout(timer); if (outer) outer.removeEventListener('abort', onAbort); }
}

function clean(text){
  if (!text) return '';
  return String(text).replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^\s*<\/?think>\s*/gi,'').trim();
}

/* ---- one OpenAI-style call ---- */
async function callOpenAI(url, body, ms, signal){
  const r = await tfetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)}, ms, signal);
  if (r.status === 429){ const e = new Error('busy'); e.status = 429; throw e; }
  if (!r.ok){ const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
  const j = await r.json();
  const msg = j.choices && j.choices[0] && j.choices[0].message;
  const out = clean(msg && msg.content);
  if (!out){ const e = new Error('empty'); e.empty = true; throw e; }
  return out;
}

/* ---- streaming call (SSE). Calls onToken(delta, full). Rejects if nothing arrives. ---- */
async function streamOpenAI(url, body, ms, signal, onToken){
  const ctl = new AbortController();
  const onAbort = () => ctl.abort();
  if (signal){ if (signal.aborted) throw abortErr(); signal.addEventListener('abort', onAbort, {once:true}); }
  let idle = setTimeout(() => ctl.abort(), Math.max(ms || 14000, 12000));
  const bump = (t) => { clearTimeout(idle); idle = setTimeout(() => ctl.abort(), t); };
  let full = '', raw = '';
  try {
    const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...body, stream:true}), signal: ctl.signal});
    if (r.status === 429){ const e = new Error('busy'); e.status = 429; throw e; }
    if (!r.ok || !r.body){ const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    const reader = r.body.getReader(), dec = new TextDecoder();
    let buf = '', inThink = false;
    for (;;){
      const {value, done} = await reader.read();
      if (done) break;
      bump(10000);
      buf += dec.decode(value, {stream:true});
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0){
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        let j; try { j = JSON.parse(data); } catch(_){ continue; }
        const d = j.choices && j.choices[0] && j.choices[0].delta;
        let c = d && d.content; if (!c) continue;
        raw += c;
        // hide <think> blocks some models emit
        if (raw.includes('<think>') && !raw.includes('</think>')){ inThink = true; continue; }
        if (inThink){ inThink = false; c = clean(raw).slice(full.length); }
        if (!c) continue;
        full += c; onToken(c, full);
      }
    }
  } catch(e){
    if (signal && signal.aborted) throw abortErr();
    if (full && full.trim().length > 20) return clean(full); // partial but useful
    if (e && e.name === 'AbortError'){ throw new Error('timeout'); }
    throw e;
  } finally { clearTimeout(idle); if (signal) signal.removeEventListener('abort', onAbort); }
  const out = clean(full);
  if (!out){ const e = new Error('empty'); e.empty = true; throw e; }
  return out;
}

function buildBody(model, messages, opts, level){
  const isOss = model.startsWith('gpt-oss');
  const maxTokens = opts.maxTokens || 2400;
  const body = {model, messages, temperature: opts.temperature ?? 0.6, max_tokens: isOss ? maxTokens + 800 : maxTokens};
  if (isOss) body.reasoning_effort = EFFORT[level] || 'low';
  if (opts.json && !isOss) body.response_format = {type:'json_object'};
  return body;
}
function linked(signal){
  const c = new AbortController();
  if (signal){ if (signal.aborted) c.abort(); else signal.addEventListener('abort', () => c.abort(), {once:true}); }
  return c;
}
function failModel(model, e){ cooldown[model] = Date.now() + (e.status === 429 ? 8000 : e.empty ? 3000 : 12000); }

function estimateTokens(messages, out){
  let inChars = 0;
  for (const m of (messages || [])){
    if (typeof m.content === 'string') inChars += m.content.length;
    else if (Array.isArray(m.content)) m.content.forEach(p => { if (p.text) inChars += p.text.length; });
  }
  const outChars = String(out || '').length;
  return Math.max(50, Math.round((inChars + outChars) / 4));
}

function limitReachedErr(j){
  const code = (j && j.code) || 'LIMIT_REACHED';
  const defaultMsg = code === 'STARK_LIMIT_REACHED'
    ? 'You have reached your Lokizen 4.0 Stark limit. Switched to Lokizenith 3.5 Fera.'
    : code === 'IMAGE_LIMIT_REACHED'
    ? 'You have reached your maximum daily image generation limit.'
    : "It's not possible because your limit has reached the maximum.";
  const e = new Error((j && (j.message || j.error)) || defaultMsg);
  e.userFacing = true;
  e.code = code;
  if (/^GUEST_/.test(code)){
    // Guest trial: treat like a hard limit so every lane stops, and show the sign-up card.
    e.guestCode = code; e.code = 'LIMIT_REACHED'; e.guest = true;
    if (window.LZAuth && LZAuth.refreshGuestStatus) try { LZAuth.refreshGuestStatus(0); } catch(_){}
  }
  if (j && j.account && window.LZAuth && typeof window.LZAuth.updateAccountState === 'function'){
    try { window.LZAuth.updateAccountState(j.account); } catch(_){}
  }
  return e;
}

function isQuotaHardLockErr(e){
  return !!(e && (e.code === 'LIMIT_REACHED' || e.code === 'STARK_LIMIT_REACHED' || e.code === 'IMAGE_LIMIT_REACHED'));
}

function checkQuotaOrThrow(){
  if (window.LZ && window.LZ.Usage && !window.LZ.Usage.canUse()){
    throw limitReachedErr();
  }
}

function consumeAfterCall(messages, out, opts, baseWeight = 0){
  if (opts && opts._noConsume) return;
  const est = Math.max(baseWeight || 0, estimateTokens(messages, out));
  if (window.LZ && window.LZ.Usage && typeof window.LZ.Usage.consume === 'function'){
    window.LZ.Usage.consume(est);
  }
}

async function streamBackendChat(messages, opts = {}, signal){
  const headers = Object.assign({'Content-Type': 'application/json'}, authHeaders());
  const ctl = new AbortController();
  const onAbort = () => ctl.abort();
  if (signal){
    if (signal.aborted) throw abortErr();
    signal.addEventListener('abort', onAbort, {once:true});
  }
  let watchdog = setTimeout(() => ctl.abort(), opts.timeout || 26000);
  const bumpWatchdog = (ms = 12000) => {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => ctl.abort(), ms);
  };
  let full = '';
  let genId = '';
  try {
    const r = await fetch('/api/chat/stream', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages,
        temperature: opts.temperature ?? 0.25,
        maxTokens: opts.maxTokens || 6144,
        level: opts.level ?? 1,
        mode: opts.level === 4 ? 'ultra' : (opts.level === 0 ? 'fast' : 'auto'),
        tier: opts.tier || 'fera',
        turnId: opts.turnId || '',
        answerLength: opts.answerLength || undefined,
        bg: opts.bg || undefined
      }),
      signal: ctl.signal
    });
    if (r.status === 403 || r.status === 401){
      const j = await r.json().catch(() => ({}));
      if (['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED', 'GUEST_LIMIT_REACHED', 'GUEST_SIGNUP_REQUIRED'].includes(j.code)){
        throw limitReachedErr(j);
      }
    }
    if (!r.ok || !r.body) throw new Error('stream ' + r.status);
    bumpWatchdog(14000);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;){
      const {value, done} = await reader.read();
      if (done) break;
      bumpWatchdog(12000);
      buf += dec.decode(value, {stream:true});
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0){
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const j = JSON.parse(data);
          if (j.gen){ genId = j.gen; if (typeof opts.onGen === 'function') opts.onGen(j.gen); }
          if (j.delta){
            full += j.delta;
            if (typeof opts.onToken === 'function') opts.onToken(j.delta, full);
          }
        } catch(_){}
      }
    }
  } catch (e) {
    if (signal && signal.aborted){ if (genId) cancelGen(genId); throw abortErr(); }
    if (isQuotaHardLockErr(e)) throw e;
    // BUI-18: the server keeps generating when this connection drops (offline, network switch, sleep).
    // Re-attach to the same answer instead of starting over.
    if (genId){
      try {
        const rest = await resumeGen(genId, full.length, {signal, onToken: (d) => { full += d; if (typeof opts.onToken === 'function') opts.onToken(d, full); }});
        if (rest.done && full.trim()) return clean(full);
      } catch(e2){ if (signal && signal.aborted) throw abortErr(); }
      if (full && full.trim().length > 20) return clean(full);
      cancelGen(genId);
    }
    if (full && full.trim().length > 20) return clean(full);
    throw new Error(e && e.name === 'AbortError' ? 'stream_timeout' : (e?.message || 'stream_failed'));
  } finally {
    clearTimeout(watchdog);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
  const out = clean(full);
  if (!out) throw new Error('empty');
  return out;
}

/* ---- BUI-18: background generations (server keeps writing when the client is gone) ---- */
function authHeaders(){
  const h = {}; const tok = localStorage.getItem('lz.authToken'); if (tok) h['x-lz-token'] = tok;
  try { const u = window.LZAuth && LZAuth.getUser && LZAuth.getUser(); if (u && (u.id || u.username)) h['x-lz-user-backup'] = JSON.stringify({id: u.id || '', username: u.username || '', googleEmail: u.googleEmail || ''}); } catch(_){}
  return h;
}
function cancelGen(id){
  try { fetch('/api/chat/gen/' + encodeURIComponent(id) + '/cancel', {method:'POST', headers: authHeaders(), keepalive: true}).catch(() => {}); } catch(_){}
}
async function listGens(recentMs){
  const r = await fetch('/api/chat/gens' + (recentMs ? '?recentMs=' + recentMs : ''), {headers: authHeaders(), cache: 'no-store'});
  if (!r.ok) return [];
  const j = await r.json().catch(() => ({}));
  return Array.isArray(j.gens) ? j.gens : [];
}
/**
 * Re-attach to a server-side answer from character offset `from`. Retries through network drops
 * (waits for `online`) until the answer is done, the job is gone (404) or `maxMs` passes.
 * Resolves {done, gone, text} where text is everything received by this call.
 */
async function resumeGen(id, from, o = {}){
  const deadline = Date.now() + (o.maxMs || 8 * 60_000);
  let got = '', offset = from || 0, tries = 0;
  while (Date.now() < deadline){
    if (o.signal && o.signal.aborted) throw abortErr();
    if (typeof navigator !== 'undefined' && navigator.onLine === false){
      await new Promise(res => { const t = setTimeout(res, 4000); window.addEventListener('online', () => { clearTimeout(t); res(); }, {once:true}); });
      continue;
    }
    try {
      const ctl = new AbortController();
      const onAbort = () => ctl.abort();
      if (o.signal) o.signal.addEventListener('abort', onAbort, {once:true});
      let idle = setTimeout(() => ctl.abort(), 40000);
      try {
        const r = await fetch('/api/chat/gen/' + encodeURIComponent(id) + '?from=' + offset, {headers: authHeaders(), signal: ctl.signal, cache: 'no-store'});
        if (r.status === 404 || (r.status === 401 && tries >= 1)) return {done: false, gone: true, text: got};
        if (!r.ok || !r.body) throw new Error('resume ' + r.status);
        const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '', finished = false;
        for (;;){
          const {value, done} = await reader.read();
          if (done) break;
          clearTimeout(idle); idle = setTimeout(() => ctl.abort(), 40000);
          buf += dec.decode(value, {stream:true});
          let nl;
          while ((nl = buf.indexOf('\n')) >= 0){
            const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]'){ finished = true; continue; }
            try {
              const j = JSON.parse(data);
              if (j.delta && (j.offset == null || j.offset === offset)){ offset += j.delta.length; got += j.delta; if (o.onToken) o.onToken(j.delta, got); }
              else if (j.delta && j.offset < offset){ const skip = offset - j.offset; if (skip < j.delta.length){ const d = j.delta.slice(skip); offset += d.length; got += d; if (o.onToken) o.onToken(d, got); } }
              if (j.error && j.error !== 'cancelled') { /* server finished with an error; keep partial text */ }
            } catch(_){}
          }
        }
        if (finished) return {done: true, gone: false, text: got};
      } finally {
        clearTimeout(idle);
        if (o.signal) o.signal.removeEventListener('abort', onAbort);
      }
    } catch(e){
      if (o.signal && o.signal.aborted) throw abortErr();
    }
    tries++;
    await sleep(Math.min(8000, 600 * tries), o.signal).catch(e => { throw e; });
  }
  return {done: false, gone: false, text: got};
}

async function callBackendGemini(messages, opts, signal){
  const tok = localStorage.getItem('lz.authToken');
  const headers = {'Content-Type': 'application/json'};
  if (tok) headers['x-lz-token'] = tok;
  const r = await tfetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      temperature: opts.temperature ?? 0.6,
      maxTokens: opts.maxTokens || 4096,
      json: !!opts.json,
      level: opts.level ?? 1,
      mode: opts.level === 4 ? 'ultra' : (opts.level === 0 ? 'fast' : 'auto'),
      tier: opts.tier || 'fera',
      turnId: opts.turnId || '',
      answerLength: opts.answerLength || undefined
    })
  }, opts.timeout || 32000, signal);
  if (r.status === 403 || r.status === 401){
    const j = await r.json().catch(() => ({}));
    if (['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED', 'GUEST_LIMIT_REACHED', 'GUEST_SIGNUP_REQUIRED'].includes(j.code)){
      throw limitReachedErr(j);
    }
  }
  if (!r.ok) throw new Error('backend ' + r.status);
  const j = await r.json();
  const out = clean(j.text);
  if (!out) throw new Error('empty');
  if (typeof opts.onToken === 'function'){
    opts.onToken(out, out);
  }
  return out;
}

/** Typed-reveal window for buffered/finished text so answers always type visibly and smoothly in real time. */
function typewriterDurationMs(charCount, minMs = 450, maxMs = 2400){
  if (!(minMs > 0)) return 0;
  const lo = Math.max(0, minMs);
  const hi = Math.max(lo, maxMs);
  const n = Math.max(0, Number(charCount) || 0);
  if (n <= 80) return Math.max(220, Math.round(n * 4.5));
  if (n >= 2600) return hi;
  return Math.round(lo + ((n - 80) / (2600 - 80)) * (hi - lo));
}

/**
 * Real-time smooth live typing: starts rendering immediately on the first tokens and smoothly types out
 * word-by-word/character-by-character as the AI generates, never dumping a huge block in one flash.
 */
async function runWithTypewriterPacer(upstreamFn, userOnToken, signal, minWriteMs = 1000){
  if (typeof userOnToken !== 'function' || !(minWriteMs > 0)) {
    return await upstreamFn(userOnToken || NOOP);
  }
  const isFastPacer = minWriteMs <= 300;
  let targetText = '';
  let shownLen = 0;
  let upstreamFinished = false;
  let doneAt = 0;
  let remainingAtDone = 0;
  const TICK_MS = isFastPacer ? 14 : 20;

  const advanceTick = () => {
    if (!targetText.length || shownLen >= targetText.length) return;
    let nextLen;
    if (shownLen === 0) {
      // Paint an immediate crisp opening slice so live typing begins on frame 1 with zero stall
      nextLen = Math.min(targetText.length, isFastPacer ? 18 : 10);
    } else if (!upstreamFinished) {
      const rem = targetText.length - shownLen;
      const step = isFastPacer
        ? (rem > 120 ? Math.ceil(rem / 4) : rem > 30 ? Math.ceil(rem / 2.5) : rem)
        : (rem > 240 ? Math.ceil(rem / 10) : rem > 60 ? Math.ceil(rem / 6) : Math.max(2, Math.ceil(rem / 3)));
      nextLen = shownLen + Math.max(2, step);
    } else {
      const drainMin = isFastPacer ? Math.min(120, minWriteMs) : 420;
      const drainMax = isFastPacer ? Math.min(300, Math.max(180, minWriteMs)) : 2400;
      const totalWin = typewriterDurationMs(remainingAtDone || (targetText.length - shownLen), drainMin, drainMax);
      const left = Math.max(TICK_MS, totalWin - (performance.now() - doneAt));
      const ticksLeft = Math.max(1, Math.ceil(left / TICK_MS));
      nextLen = shownLen + Math.max(isFastPacer ? 12 : 3, Math.ceil((targetText.length - shownLen) / ticksLeft));
    }
    nextLen = Math.min(targetText.length, nextLen);
    if (nextLen > shownLen) {
      const delta = targetText.slice(shownLen, nextLen);
      shownLen = nextLen;
      userOnToken(delta, targetText.slice(0, shownLen));
    }
  };

  const ticker = setInterval(() => {
    if (signal && signal.aborted) return;
    advanceTick();
  }, TICK_MS);

  try {
    const rawOut = await upstreamFn((_delta, fullSoFar) => {
      const wasEmpty = !targetText.length;
      targetText = clean(fullSoFar);
      if (wasEmpty) advanceTick();
    });
    const finalOut = clean(rawOut);
    targetText = finalOut;
    upstreamFinished = true;
    doneAt = performance.now();
    remainingAtDone = Math.max(0, targetText.length - shownLen);
    const hardStop = doneAt + (isFastPacer ? 360 : 3200);
    while (shownLen < targetText.length) {
      if (signal && signal.aborted) throw abortErr();
      if (performance.now() > hardStop || document.hidden) {
        userOnToken(targetText.slice(shownLen), targetText);
        shownLen = targetText.length;
        break;
      }
      advanceTick();
      if (shownLen < targetText.length) await sleep(TICK_MS, signal);
    }
    return finalOut;
  } finally {
    clearInterval(ticker);
  }
}

/**
 * chat(messages, opts) -> string
 * opts: tier, maxTokens, temperature, level (0..4), signal, onStatus(fn), onToken(delta, full) for streaming, json(bool), race(bool)
 */
async function chat(messages, opts = {}){
  if (!opts._noConsume) checkQuotaOrThrow();
  const tier = opts.tier === 'stark' ? 'stark' : 'fera';
  const level = opts.level ?? 1;
  const signal = opts.signal;
  const stream = typeof opts.onToken === 'function';
  const isUltra = level === 4;
  const isTurbo = level === 0 || isUltra;
  // Smooth typing that never delays text (see runWithTypewriterPacer).
  const defaultMinWrite = 180;
  const minWriteMs = opts.minWriteMs ?? defaultMinWrite;

  const executeChatCore = async (internalOnToken) => {
    const customMs = Number(opts.timeout) > 0 ? Number(opts.timeout) : 0;
    const fastFail = !!opts.fastFail;
    // 1. Always try server-side SSE stream first for non-JSON requests
    if (!opts.json && stream){
      try {
        const out = await streamBackendChat(messages, {...opts, onToken: internalOnToken, tier, level, timeout: customMs || 26000}, signal);
        if (out) return out;
      } catch(e){
        if ((signal && signal.aborted) || isQuotaHardLockErr(e)) throw e;
      }
    } else {
      try {
        const out = await callBackendGemini(messages, {...opts, onToken: internalOnToken, tier, level, timeout: customMs || 28000}, signal);
        if (out) return out;
      } catch(e){
        if ((signal && signal.aborted) || isQuotaHardLockErr(e)) throw e;
      }
    }

    if (fastFail && customMs) {
      throw new Error('Fast grading timeout');
    }

    const baseOrder = (level >= 1 && level !== 4 ? ORDER_DEEP : ORDER)[tier].slice();
    const rot = rrIdx++ % 2;
    let order = rot === 1 ? [baseOrder[1], baseOrder[0], ...baseOrder.slice(2)] : baseOrder;
    if (opts.prefer) order = [opts.prefer, ...order.filter(m => m !== opts.prefer)];
    if (opts.lane != null){ const fast = ORDER[tier].slice(0, 2), pick = fast[opts.lane % 2]; order = [pick, ...order.filter(m => m !== pick)]; }
    const ms = customMs || (isTurbo ? 14000 : 24000);

    // 2. Live streaming AI cluster (Mistral-Small-3.2-24B, Meta-Llama-3.3-70B, gpt-oss-120b, gpt-oss-20b)
    const now = Date.now();
    const ready = order.filter(m => !(cooldown[m] > now));
    const candidates = ready.length ? ready : order;
    for (const model of candidates){
      if (signal && signal.aborted) throw abortErr();
      try {
        const body = buildBody(model, messages, opts, level);
        const out = await streamOpenAI(BASE + '/chat/completions', body, ms, signal, stream ? internalOnToken : NOOP);
        if (out) return out;
      } catch(e){
        if ((signal && signal.aborted) || isQuotaHardLockErr(e)) throw e;
        failModel(model, e);
        if (fastFail) break;
      }
    }

    if (fastFail) {
      throw new Error('Fast grading timeout');
    }

    // 3. Server-side /api/chat guaranteed multi-layer fallback
    try {
      const out = await callBackendGemini(messages, {...opts, onToken: internalOnToken, tier, level, timeout: customMs || 32000}, signal);
      if (out) return out;
    } catch(e){
      if ((signal && signal.aborted) || isQuotaHardLockErr(e)) throw e;
    }

    // 4. Secondary live OpenAI-compatible backup with unique seed
    try {
      const out = await callOpenAI('https://text.pollinations.ai/openai', {
        model: 'openai',
        seed: Math.floor(Math.random() * 1e9),
        messages: flatten(messages)
      }, customMs || 15000, signal);
      if (stream && out) internalOnToken(out, out);
      if (out) return out;
    } catch(e){
      if ((signal && signal.aborted) || isQuotaHardLockErr(e)) throw e;
    }

    const e = new Error('Connection busy — please try again.'); e.userFacing = true; throw e;
  };

  const finalOut = (stream && !opts.json && minWriteMs > 0)
    ? await runWithTypewriterPacer(executeChatCore, opts.onToken, signal, minWriteMs)
    : await executeChatCore(opts.onToken || NOOP);

  consumeAfterCall(messages, finalOut, opts);
  return finalOut;
}
/* backup lanes get plain-text content only */
function flatten(messages){
  return messages.map(m => ({role:m.role, content: Array.isArray(m.content) ? m.content.filter(p => p.type === 'text').map(p => p.text).join('\n') : m.content}));
}

/* chat that must return JSON */
async function chatJSON(messages, opts = {}){
  let txt = '';
  const attempts = opts.fastFail ? 1 : 2;
  for (let i = 0; i < attempts; i++){
    txt = await chat(messages, {...opts, onToken: undefined, json:true, temperature: opts.temperature ?? 0.4});
    const j = parseJSON(txt);
    if (j) return j;
  }
  if (opts.fastFail) throw new Error('Could not understand the structured response.');
  // repair pass: ask a model to fix the broken JSON
  try {
    const fixed = await chat([{role:'system', content:'Fix this into strictly valid JSON. Output ONLY the JSON.'}, {role:'user', content: String(txt).slice(0, 12000)}], {...opts, onToken: undefined, json:true, temperature:0, level:0, _noConsume:true});
    const j = parseJSON(fixed); if (j) return j;
  } catch(e){ if (e.name === 'AbortError') throw e; }
  throw new Error('Could not understand the structured response.');
}
function parseJSON(txt){
  if (!txt) return null;
  let s = txt.trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'');
  try { return JSON.parse(s); } catch(_){}
  try { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1')); } catch(_){}
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a){ const x = s.slice(a, b+1); try { return JSON.parse(x); } catch(_){} try { return JSON.parse(x.replace(/,\s*([}\]])/g, '$1').replace(/[\u201c\u201d]/g, '"')); } catch(_){} }
  const c = s.indexOf('['), d = s.lastIndexOf(']');
  if (c >= 0 && d > c){ try { return JSON.parse(s.slice(c, d+1)); } catch(_){} }
  return null;
}

/* ---- vision ---- */
const visionMemCache = new Map(); // hash -> {text, exp}
function visionAuthHeaders(){
  const headers = {'Content-Type': 'application/json'};
  const tok = localStorage.getItem('lz.authToken');
  if (tok) headers['x-lz-token'] = tok;
  return headers;
}
function isVisionRefusal(text){
  return /cannot see|can't see|text-based AI|unable to see|don't have eyes/i.test(String(text || ''));
}
async function sha256HexBrowser(s){
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return (h >>> 0).toString(16);
  }
}
async function streamBackendVision(body, opts = {}, signal){
  const ctl = new AbortController();
  const onAbort = () => ctl.abort();
  if (signal){
    if (signal.aborted) throw abortErr();
    signal.addEventListener('abort', onAbort, {once:true});
  }
  let watchdog = setTimeout(() => ctl.abort(), opts.timeout || 22000);
  const bump = (ms = 10000) => { clearTimeout(watchdog); watchdog = setTimeout(() => ctl.abort(), ms); };
  let full = '';
  try {
    const r = await fetch('/api/vision/stream', {
      method: 'POST',
      headers: visionAuthHeaders(),
      body: JSON.stringify(body),
      signal: ctl.signal
    });
    if (r.status === 403 || r.status === 401){
      const j = await r.json().catch(() => ({}));
      if (['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED', 'GUEST_LIMIT_REACHED', 'GUEST_SIGNUP_REQUIRED'].includes(j.code)) throw limitReachedErr(j);
    }
    if (!r.ok || !r.body) throw new Error('vision stream ' + r.status);
    bump(12000);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;){
      const {value, done} = await reader.read();
      if (done) break;
      bump(10000);
      buf += dec.decode(value, {stream:true});
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0){
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const j = JSON.parse(data);
          if (j.delta){
            full += j.delta;
            if (typeof opts.onToken === 'function') opts.onToken(j.delta, full);
          }
        } catch(_){}
      }
    }
  } catch (e) {
    if (signal && signal.aborted) throw abortErr();
    if (isQuotaHardLockErr(e)) throw e;
    if (full && full.trim().length > 12 && !isVisionRefusal(full)) return clean(full);
    throw e;
  } finally {
    clearTimeout(watchdog);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
  const out = clean(full);
  if (!out) throw new Error('empty');
  return out;
}

async function vision(messages, opts = {}){
  if (!opts._noConsume) checkQuotaOrThrow();
  const payload = {
    messages,
    temperature: opts.temperature ?? 0.2,
    maxTokens: opts.maxTokens || 2048,
    prompt: opts.prompt || '',
    images: opts.images || undefined,
    files: opts.files || undefined,
    video: opts.video || undefined,
    turnId: opts.turnId || '',
    system: opts.system || undefined
  };
  const cacheSeed = JSON.stringify({
    p: payload.prompt,
    m: (messages || []).map(x => typeof x.content === 'string' ? x.content : (Array.isArray(x.content) ? x.content.map(p => p.type === 'text' ? p.text : (p.image_url && p.image_url.url || '').slice(0, 80)).join('|') : '')),
    v: payload.video && (payload.video.transcript || '') + (payload.video.durationSec || ''),
    f: (payload.files || []).map(f => (f.text || '').slice(0, 200))
  });
  const ck = await sha256HexBrowser(cacheSeed);
  const hit = visionMemCache.get(ck);
  if (hit && hit.exp > Date.now()){
    if (typeof opts.onToken === 'function') opts.onToken(hit.text, hit.text);
    consumeAfterCall(messages, hit.text, opts, 80);
    return hit.text;
  }
  try {
    const out = await streamBackendVision(payload, opts, opts.signal);
    if (out && !isVisionRefusal(out)){
      visionMemCache.set(ck, {text: out, exp: Date.now() + 10 * 60 * 1000});
      consumeAfterCall(messages, out, opts, 200);
      return out;
    }
  } catch(e){
    if (e.name === 'AbortError' || isQuotaHardLockErr(e)) throw e;
  }
  // JSON fallback (same fast server path, no stream)
  try {
    const r = await tfetch('/api/vision', {method:'POST', headers: visionAuthHeaders(), body: JSON.stringify(payload)}, opts.timeout || 20000, opts.signal);
    if (r.status === 403 || r.status === 401){
      const j = await r.json().catch(() => ({}));
      if (['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED', 'GUEST_LIMIT_REACHED', 'GUEST_SIGNUP_REQUIRED'].includes(j.code)) throw limitReachedErr(j);
    }
    if (r.ok){
      const j = await r.json();
      const out = clean(j.text);
      if (out && !isVisionRefusal(out)){
        if (typeof opts.onToken === 'function') opts.onToken(out, out);
        visionMemCache.set(ck, {text: out, exp: Date.now() + 10 * 60 * 1000});
        consumeAfterCall(messages, out, opts, 200);
        return out;
      }
    }
  } catch(e){
    if (e.name === 'AbortError' || isQuotaHardLockErr(e)) throw e;
  }
  // Legacy Kepler Qwen-VL fallback
  const models = ['Qwen/Qwen2.5-VL-72B-Instruct', 'Qwen2.5-VL-72B-Instruct'];
  for (const m of models){
    try {
      const out = await callOpenAI(BASE + '/chat/completions', {model: m, messages, max_tokens: opts.maxTokens || 2200, temperature: 0.4}, 20000, opts.signal);
      if (out) { consumeAfterCall(messages, out, opts, 300); return out; }
    } catch(e){
      if (e.name === 'AbortError' || isQuotaHardLockErr(e)) throw e;
    }
  }
  const e = new Error('Image understanding is busy right now. Please try again shortly.'); e.userFacing = true; throw e;
}

/* ---- images & editing ---- */
async function generateImage(prompt, opts = {}){
  if (!opts._noConsume) checkQuotaOrThrow();
  const tok = localStorage.getItem('lz.authToken');
  const headers = {'Content-Type': 'application/json'};
  if (tok) headers['x-lz-token'] = tok;
  // 1. Server-side 12-tier multi-provider image chain (Gemini -> Fal -> HF ZeroGPU FLUX.1-Schnell / SD 3.5 Turbo / Z-Image-Turbo -> Pollinations -> Stable Horde -> Kepler SDXL)
  try {
    const r = await tfetch('/api/image/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({prompt, width: opts.width || 1024, height: opts.height || 1024, turnId: opts.turnId || ''})
    }, 68000, opts.signal);
    if (r.status === 403 || r.status === 401){
      const j = await r.json().catch(() => ({}));
      if (['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED', 'GUEST_LIMIT_REACHED', 'GUEST_SIGNUP_REQUIRED'].includes(j.code)){
        throw limitReachedErr(j);
      }
    }
    if (r.ok){
      const j = await r.json();
      if (j.dataUrl) {
        consumeAfterCall([{role:'user', content: prompt}], '', opts, 900);
        return await recompress(j.dataUrl);
      }
    }
  } catch(e){
    if (e.name === 'AbortError' || isQuotaHardLockErr(e)) throw e;
  }

  // 2. Direct client Pollinations Turbo fallback
  try {
    const seed = Math.floor(Math.random() * 1e9);
    const pUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(String(prompt || '').slice(0, 600))}?width=1024&height=1024&model=turbo&nologo=true&seed=${seed}`;
    const r = await tfetch(pUrl, {}, 20000, opts.signal);
    if (r.ok){
      const blob = await r.blob();
      if (blob && blob.size > 2000){
        const du = await blobToDataURL(blob);
        consumeAfterCall([{role:'user', content: prompt}], '', opts, 900);
        return await recompress(du);
      }
    }
  } catch(e){
    if (e.name === 'AbortError' || isQuotaHardLockErr(e)) throw e;
  }

  // 3. Direct Kepler SDXL endpoint fallback
  try {
    const r = await tfetch(BASE + '/images/generations', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({model:M.image || 'stable-diffusion-xl-base-v10', prompt, n:1, size:'1024x1024', response_format:'b64_json'})
    }, 28000, opts.signal);
    if (r.ok){
      const j = await r.json();
      const b64 = j.data && j.data[0] && j.data[0].b64_json;
      if (b64) {
        consumeAfterCall([{role:'user', content: prompt}], '', opts, 900);
        return await recompress('data:image/png;base64,' + b64);
      }
    }
  } catch(e){
    if (e.name === 'AbortError' || isQuotaHardLockErr(e)) throw e;
  }

  throw Object.assign(new Error('Image generation is busy right now. Please try again shortly.'), {userFacing:true});
}

async function editImage(sourceDataUrl, instructions, opts = {}){
  return await generateImage(instructions, opts);
}

/* ---- AI neural video generation engine (multi-provider chain + multi-keyframe fallback) ---- */
async function generateVideo(prompt, opts = {}){
  const signal = opts.signal;
  const onStatus = opts.onStatus || (() => {});
  const ratio = opts.ratio || '16:9';
  const durationSec = Math.min(8, Math.max(2, parseInt(opts.duration, 10) || 4));
  const tok = localStorage.getItem('lz.authToken');
  const headers = {'Content-Type': 'application/json'};
  if (tok) headers['x-lz-token'] = tok;

  onStatus('Connecting to AI video providers (LTX-Video · Wan 2.1 · Veo · Seedance)…');
  let serverKeyframes = [];
  let serverProvider = 'ReWind 2.0 Neural Engine';
  let serverModel = 'rewind-2.0';

  // 1. Try server-side multi-provider Neural AI Video Generation Chain
  try {
    const r = await tfetch('/api/video/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        duration: durationSec,
        ratio,
        sourceImageUrl: opts.sourceImageUrl || undefined,
        turnId: opts.turnId || ''
      })
    }, 95000, signal);

    if (r.status === 403 || r.status === 401){
      const j = await r.json().catch(() => ({}));
      if (['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED', 'GUEST_LIMIT_REACHED', 'GUEST_SIGNUP_REQUIRED'].includes(j.code)){
        throw limitReachedErr(j);
      }
    }

    if (r.ok){
      const j = await r.json();
      serverProvider = j.provider || serverProvider;
      serverModel = j.model || serverModel;
      // Direct real neural video (.mp4 / .webm) from Fal Wan 2.1, Replicate, Luma Ray 2, Pollinations Seedance/Veo, Lightricks LTX-Video, Wan 2.1 Fast, or Airforce!
      if (j.isNeuralVideo && j.dataUrl){
        consumeAfterCall([{role:'user', content: prompt}], '', opts, 1400);
        return {
          dataUrl: j.dataUrl,
          keyframeUrl: j.keyframeUrl || undefined,
          mimeType: j.mimeType || 'video/mp4',
          provider: serverProvider,
          model: serverModel,
          isNeuralVideo: true,
          duration: j.duration || durationSec,
          ratio: j.ratio || ratio,
          width: j.width || 704,
          height: j.height || 512
        };
      }
      if (Array.isArray(j.keyframes) && j.keyframes.length){
        serverKeyframes = j.keyframes;
      } else if (j.keyframeUrl || j.dataUrl){
        serverKeyframes = [j.keyframeUrl || j.dataUrl];
      }
    }
  } catch (e){
    if (e.name === 'AbortError' || isQuotaHardLockErr(e)) throw e;
  }

  // 2. Multi-Keyframe AI Storyboard fallback (renders smooth crossfading 30fps WebM across generated keyframes)
  onStatus('Generating cinematic multi-scene keyframes…');
  let keyframeUrl = opts.sourceImageUrl || serverKeyframes[0];
  if (!keyframeUrl) {
    keyframeUrl = await generateImage(prompt + ', wide angle, 16:9 cinematic film scene, 8k, photorealistic', { signal, onStatus, turnId: opts.turnId || '' });
  }
  const secondFrameUrl = serverKeyframes[1] || keyframeUrl;

  onStatus('Rendering 30 FPS cinematic motion sequence…');
  const img1 = await loadImg(keyframeUrl);
  const img2 = secondFrameUrl !== keyframeUrl ? await loadImg(secondFrameUrl).catch(() => img1) : img1;

  let width = 768, height = 432;
  if (ratio === '9:16') { width = 432; height = 768; }
  else if (ratio === '1:1') { width = 576; height = 576; }
  else if (ratio === '4:3') { width = 640; height = 480; }

  const fps = 30;
  const totalFrames = durationSec * fps;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  let stream = null;
  try {
    if (typeof canvas.captureStream === 'function') {
      stream = canvas.captureStream(fps);
    }
  } catch (_e) {
    stream = null;
  }

  if (stream && typeof MediaRecorder !== 'undefined') {
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

    try {
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2600000 });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

      const recordingPromise = new Promise((resolve, reject) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
        recorder.onerror = reject;
      });

      recorder.start();

      for (let frame = 0; frame < totalFrames; frame++) {
        if (signal && signal.aborted) {
          try { recorder.stop(); } catch (_e) {}
          throw abortErr();
        }

        const progress = frame / totalFrames;
        const ease = progress * progress * (3 - 2 * progress);
        const zoom1 = 1.0 + ease * 0.14;
        const panX1 = Math.sin(progress * Math.PI) * (width * 0.035);
        const panY1 = ease * (height * 0.02);

        ctx.save();
        ctx.clearRect(0, 0, width, height);
        ctx.translate(width / 2 + panX1, height / 2 + panY1);
        ctx.scale(zoom1, zoom1);
        ctx.drawImage(img1, -width / 2, -height / 2, width, height);
        ctx.restore();

        // Smooth crossfade into scene 2 across second half
        if (img2 !== img1 && progress > 0.35) {
          const blend = Math.min(1, (progress - 0.35) / 0.45);
          const zoom2 = 1.08 - blend * 0.06;
          ctx.save();
          ctx.globalAlpha = blend * blend * (3 - 2 * blend);
          ctx.translate(width / 2 - panX1 * 0.5, height / 2 - panY1 * 0.4);
          ctx.scale(zoom2, zoom2);
          ctx.drawImage(img2, -width / 2, -height / 2, width, height);
          ctx.restore();
        }

        // Subtle atmospheric flare
        const grad = ctx.createRadialGradient(
          width * (0.25 + progress * 0.5), height * 0.25, 20,
          width / 2, height / 2, width * 0.8
        );
        grad.addColorStop(0, `rgba(255, 235, 190, ${0.09 * Math.sin(progress * Math.PI)})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        if (ratio === '16:9') {
          ctx.fillStyle = '#050505';
          ctx.fillRect(0, 0, width, 14);
          ctx.fillRect(0, height - 14, width, 14);
        }

        await sleep(1000 / fps, signal);
      }

      recorder.stop();
      const videoBlob = await recordingPromise;
      const videoDataUrl = await blobToDataURL(videoBlob);
      return {
        dataUrl: videoDataUrl,
        keyframeUrl,
        mimeType,
        provider: serverProvider,
        model: serverModel,
        isNeuralVideo: false,
        duration: durationSec,
        ratio,
        width,
        height
      };
    } catch (_recErr) {}
  }

  return {
    dataUrl: keyframeUrl,
    keyframeUrl,
    provider: serverProvider,
    model: serverModel,
    duration: durationSec,
    ratio,
    width,
    height,
    isAnimatedPoster: true
  };
}
function blobToDataURL(blob){ return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); }); }
function loadImg(src){ return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
async function recompress(dataUrl, max = 1024, q = 0.82){
  const img = await loadImg(dataUrl);
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.width * s));
  c.height = Math.max(1, Math.round(img.height * s));
  const ctx = c.getContext('2d', {alpha: false});
  ctx.drawImage(img, 0, 0, c.width, c.height);
  // Prefer compact WebP when the browser supports it; fall back to JPEG.
  try {
    const webp = c.toDataURL('image/webp', q);
    if (webp.startsWith('data:image/webp') && webp.length < 50 + (c.width * c.height)) return webp;
  } catch(_){}
  return c.toDataURL('image/jpeg', q);
}
async function recompressFile(file, max = 1024, q = 0.82){
  const url = URL.createObjectURL(file);
  try { return await recompress(url, max, q); }
  finally { URL.revokeObjectURL(url); }
}
function planKeyframeTimes(durationSec, maxFrames = 12){
  const dur = Math.max(0, Number(durationSec) || 0);
  const cap = Math.max(1, Math.min(12, maxFrames | 0));
  if (dur <= 0) return [0];
  if (dur < 1.2) return [0, dur];
  const n = Math.min(cap, Math.max(3, Math.round(dur / 2) + 1));
  const times = [];
  for (let i = 0; i < n; i++) times.push(i === n - 1 ? dur : (i * dur) / (n - 1));
  return Array.from(new Set(times.map(t => Math.round(Math.min(dur, Math.max(0, t)) * 1000) / 1000)));
}
function frameSignature(ctx, w, h){
  const stepX = Math.max(1, Math.floor(w / 16));
  const stepY = Math.max(1, Math.floor(h / 16));
  const data = ctx.getImageData(0, 0, w, h).data;
  let s = 0;
  for (let y = 0; y < h; y += stepY){
    for (let x = 0; x < w; x += stepX){
      const i = (y * w + x) * 4;
      s = (s * 33 + data[i] + data[i+1] * 3 + data[i+2] * 5) >>> 0;
    }
  }
  return s;
}
async function extractVideoAnalysis(file, opts = {}){
  const onProgress = opts.onProgress || (() => {});
  const signal = opts.signal;
  const maxEdge = 768;
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  const wait = (ev) => new Promise((res, rej) => {
    const onErr = () => rej(new Error('Could not read video'));
    video.addEventListener(ev, () => res(), {once:true});
    video.addEventListener('error', onErr, {once:true});
  });
  try {
    await Promise.race([wait('loadedmetadata'), sleep(8000, signal)]);
    const duration = Number(video.duration) || 0;
    if (duration > 180) onProgress('Using the first 3 minutes of this video');
    const useDur = Math.min(duration || 0, 180);
    const times = planKeyframeTimes(useDur, opts.maxFrames || 12);
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth || maxEdge, video.videoHeight || maxEdge));
    canvas.width = Math.max(2, Math.round((video.videoWidth || 640) * scale));
    canvas.height = Math.max(2, Math.round((video.videoHeight || 360) * scale));
    const ctx = canvas.getContext('2d', {alpha:false, willReadFrequently:true});
    const keyframes = [];
    let prevSig = 0;
    for (let i = 0; i < times.length; i++){
      if (signal && signal.aborted) throw abortErr();
      const t = Math.min(times[i], Math.max(0, (duration || 0) - 0.05));
      onProgress(`Grabbing frame ${i + 1}/${times.length} at ${t.toFixed(1)}s`);
      video.currentTime = t;
      try { await Promise.race([wait('seeked'), sleep(3000, signal)]); } catch(_){}
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const sig = frameSignature(ctx, canvas.width, canvas.height);
      const isEdge = i === 0 || i === times.length - 1;
      if (!isEdge && prevSig && Math.abs(sig - prevSig) < 80) continue; // skip near-duplicate scene
      prevSig = sig;
      let dataUrl = '';
      try {
        dataUrl = canvas.toDataURL('image/webp', 0.75);
        if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', 0.78);
      } catch(_){ dataUrl = canvas.toDataURL('image/jpeg', 0.78); }
      keyframes.push({timeSec: t, dataUrl, name: `frame-${i + 1}`});
    }
    const poster = (keyframes[0] && keyframes[0].dataUrl) || '';
    onProgress('Transcribing audio…');
    let transcript = '';
    try {
      let audioBlob = null;
      if (file.size <= 12 * 1024 * 1024) audioBlob = file;
      else audioBlob = await grabVideoAudio(video, Math.min(useDur, 45), signal);
      if (audioBlob){
        const dataUrl = await blobToDataURL(audioBlob);
        const m = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
        if (m){
          const headers = visionAuthHeaders();
          const r = await tfetch('/api/media/transcribe', {
            method:'POST', headers,
            body: JSON.stringify({audio: m[2], mime: (audioBlob.type || m[1] || 'video/mp4'), name: file.name, lang: opts.lang || ''})
          }, 20000, signal);
          if (r.ok){
            const j = await r.json();
            transcript = String(j.text || '').trim();
          }
          if (!transcript){
            const r2 = await tfetch('/api/transcribe', {
              method:'POST', headers,
              body: JSON.stringify({audio: m[2], mime: audioBlob.type || m[1] || 'video/mp4', lang: opts.lang || ''})
            }, 20000, signal);
            if (r2.ok){
              const j = await r2.json();
              transcript = String(j.text || '').trim();
            }
          }
        }
      }
    } catch(_){}
    return {
      kind: 'video',
      name: file.name || 'video.mp4',
      size: file.size,
      duration: duration,
      width: video.videoWidth || canvas.width,
      height: video.videoHeight || canvas.height,
      poster,
      keyframes,
      transcript,
      mime: file.type || 'video/mp4'
    };
  } finally {
    URL.revokeObjectURL(url);
    try { video.src = ''; video.load(); } catch(_){}
  }
}
async function grabVideoAudio(video, maxSec, signal){
  try {
    if (typeof video.captureStream !== 'function' || typeof MediaRecorder === 'undefined') return null;
    const stream = video.captureStream();
    const aTracks = stream.getAudioTracks();
    if (!aTracks.length) return null;
    const recStream = new MediaStream(aTracks);
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/webm';
    const rec = new MediaRecorder(recStream, {mimeType});
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise((res) => { rec.onstop = () => res(new Blob(chunks, {type: mimeType})); rec.onerror = () => res(null); });
    video.muted = false;
    rec.start();
    try { await video.play(); } catch(_){}
    await sleep(Math.max(400, Math.min(maxSec, 45) * 1000), signal);
    try { rec.stop(); video.pause(); } catch(_){}
    return await done;
  } catch(_){ return null; }
}

/* ---- fast file text (PDF already in pdfText; docx/xlsx via unzip) ---- */
async function inflateRaw(buf){
  if (typeof DecompressionStream === 'function'){
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(buf);
    writer.close();
    const ab = await new Response(ds.readable).arrayBuffer();
    return new Uint8Array(ab);
  }
  throw new Error('no inflater');
}
function u16(v, o){ return v[o] | (v[o+1] << 8); }
function u32(v, o){ return (v[o] | (v[o+1] << 8) | (v[o+2] << 16) | (v[o+3] << 24)) >>> 0; }
async function unzipEntries(arrayBuffer){
  const v = new Uint8Array(arrayBuffer);
  const out = {};
  let eocd = -1;
  for (let i = v.length - 22; i >= Math.max(0, v.length - 65557); i--){
    if (u32(v, i) === 0x06054b50){ eocd = i; break; }
  }
  if (eocd < 0) return out;
  const count = u16(v, eocd + 10);
  let p = u32(v, eocd + 16);
  const dec = new TextDecoder();
  for (let i = 0; i < count && p + 46 <= v.length; i++){
    if (u32(v, p) !== 0x02014b50) break;
    const method = u16(v, p + 10);
    const compSize = u32(v, p + 20);
    const nameLen = u16(v, p + 28);
    const extraLen = u16(v, p + 30);
    const commentLen = u16(v, p + 32);
    const localOff = u32(v, p + 42);
    const name = dec.decode(v.subarray(p + 46, p + 46 + nameLen));
    if (u32(v, localOff) === 0x04034b50){
      const lName = u16(v, localOff + 26);
      const lExtra = u16(v, localOff + 28);
      const dataStart = localOff + 30 + lName + lExtra;
      const compressed = v.subarray(dataStart, dataStart + compSize);
      try {
        let data;
        if (method === 0) data = compressed;
        else if (method === 8) data = await inflateRaw(compressed);
        if (data) out[name] = dec.decode(data);
      } catch(_){}
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
function xmlTexts(xml, tag){
  if (!xml) return [];
  const re = new RegExp('<' + tag + '[^>]*>([^<]*)</' + tag + '>', 'g');
  const out = [];
  let m; while ((m = re.exec(xml))) out.push(m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"'));
  return out;
}
async function extractDocxTextClient(arrayBuffer){
  const zip = await unzipEntries(arrayBuffer);
  const xml = zip['word/document.xml'] || '';
  return xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, '$1').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
}
async function extractXlsxTextClient(arrayBuffer){
  const zip = await unzipEntries(arrayBuffer);
  const shared = [];
  const ss = zip['xl/sharedStrings.xml'] || '';
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let sm; while ((sm = siRe.exec(ss))) shared.push(xmlTexts(sm[1], 't').join(''));
  const sheets = Object.keys(zip).filter(k => /xl\/worksheets\/sheet\d+\.xml$/i.test(k)).sort();
  const lines = [];
  for (const name of sheets.slice(0, 6)){
    lines.push('# ' + name.replace(/^.*\//, ''));
    const xml = zip[name] || '';
    const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    let row, n = 0;
    while ((row = rowRe.exec(xml)) && n++ < 250){
      const cells = [];
      const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
      let c;
      while ((c = cellRe.exec(row[1]))){
        const t = /\bt="(\w+)"/.exec(c[1])?.[1] || '';
        if (t === 's'){ const v = /<v>(\d+)<\/v>/.exec(c[2]); cells.push(v ? (shared[Number(v[1])] || '') : ''); }
        else if (t === 'inlineStr') cells.push(xmlTexts(c[2], 't').join(''));
        else { const v = /<v>([^<]*)<\/v>/.exec(c[2]); cells.push(v ? v[1] : ''); }
      }
      if (cells.some(x => String(x).trim())) lines.push(cells.join('\t'));
    }
  }
  return lines.join('\n').trim();
}
async function extractFileText(file, opts = {}){
  const name = file.name || 'file';
  const mime = file.type || '';
  const lower = name.toLowerCase();
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)){
    const r = await pdfText(await file.arrayBuffer(), opts.maxPages || 40);
    return {kind:'file', name, text: r.text, pages: r.pages, size: file.size, mime: 'application/pdf'};
  }
  if (/\.docx$/i.test(lower)){
    try {
      const text = await extractDocxTextClient(await file.arrayBuffer());
      if (text) return {kind:'file', name, text, size: file.size, mime: mime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
    } catch(_){}
  }
  if (/\.xlsx$/i.test(lower) || /\.xls$/i.test(lower)){
    try {
      const text = await extractXlsxTextClient(await file.arrayBuffer());
      if (text) return {kind:'file', name, text, size: file.size, mime: mime || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
    } catch(_){}
  }
  if (file.size <= 2e6 && (/text\//.test(mime) || /\.(txt|md|csv|json|js|ts|py|html|css|xml|ya?ml|log|java|c|cpp|cs|go|rs|rb|php|sql|sh)$/i.test(lower))){
    let text = await file.text();
    if (/\.csv$/i.test(lower)){
      const rows = text.split(/\r?\n/).filter(Boolean);
      if (rows.length > 200) text = rows.slice(0, 200).join('\n') + '\n\n[' + rows.length + ' rows total, showing first 200]';
    }
    return {kind:'file', name, text, size: file.size, mime};
  }
  // Server fallback for office docs the client could not parse
  if (file.size <= 8e6){
    try {
      const dataUrl = await blobToDataURL(file);
      const r = await tfetch('/api/media/extract', {method:'POST', headers: visionAuthHeaders(), body: JSON.stringify({name, mime, dataUrl})}, 15000, opts.signal);
      if (r.ok){
        const j = await r.json();
        if (j && j.text) return {kind:'file', name, text: j.text, pages: j.pages, size: file.size, mime};
      }
    } catch(_){}
  }
  throw new Error('Could not read ' + name);
}

/* ---- web & multi-engine internet research ---- */
const JINA = 'https://r.jina.ai/';
const SEARCH_ENGINES = [
  { id: 'ddg', name: 'DuckDuckGo', icon: '🦆' },
  { id: 'wiki', name: 'Wikipedia', icon: '📚' },
  { id: 'arxiv', name: 'ArXiv Papers', icon: '🔬' },
  { id: 'hn', name: 'HackerNews', icon: '🟧' },
  { id: 'so', name: 'StackOverflow', icon: '💻' },
  { id: 'gh', name: 'GitHub Repos', icon: '🐙' },
  { id: 'openalex', name: 'OpenAlex Scholar', icon: '🎓' },
  { id: 'reddit', name: 'Reddit Discussions', icon: '💬' },
];

async function searchDuckDuckGo(query, n = 6, signal){
  const out = [];
  try {
    const r = await tfetch(JINA + 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), {headers:{Accept:'application/json'}}, 14000, signal);
    if (r.ok){
      const j = await r.json();
      const md = (j.data && j.data.content) || '';
      const blocks = md.split(/\n(?=## \[)/);
      for (const b of blocks){
        const m = b.match(/^## \[([^\]]+)\]\((https?:\/\/duckduckgo\.com\/l\/\?uddg=([^&)]+)[^)]*)\)/);
        if (!m) continue;
        let url; try { url = decodeURIComponent(m[3]); } catch(_){ continue; }
        if (/duckduckgo\.com\/y\.js|bing\.com\/aclick/.test(url)) continue;
        let snippet = '';
        const re = /\[([^\]]{40,})\]\(https?:\/\/duckduckgo\.com\/l\/[^)]*\)/g; let s;
        while ((s = re.exec(b))) { if (s[1].length > snippet.length && !s[1].startsWith('![')) snippet = s[1]; }
        snippet = snippet.replace(/\*\*/g,'').replace(/\s+/g,' ').trim();
        const title = m[1].replace(/\*\*/g,'').trim();
        if (!out.some(o => o.url === url)) out.push({title, url, snippet, engine: 'DuckDuckGo'});
        if (out.length >= n) break;
      }
    }
  } catch(e){ if (e.name === 'AbortError') throw e; }
  return out;
}

async function searchWikipedia(query, n = 4, signal){
  const out = [];
  try {
    const lang = /[\u0590-\u05FF]/.test(query) ? 'he' : /[\u0600-\u06FF]/.test(query) ? 'ar' : 'en';
    const r = await tfetch('https://' + lang + '.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=' + n + '&srsearch=' + encodeURIComponent(query), {}, 10000, signal);
    if (r.ok){
      const j = await r.json();
      for (const it of (j.query && j.query.search) || []){
        const url = 'https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(it.title.replace(/ /g,'_'));
        out.push({title: it.title, url, snippet: (it.snippet || '').replace(/<[^>]+>/g,''), engine: 'Wikipedia'});
      }
    }
  } catch(e){ if (e.name === 'AbortError') throw e; }
  return out;
}

async function searchHackerNews(query, n = 3, signal){
  const out = [];
  try {
    const r = await tfetch('https://hn.algolia.com/api/v1/search?hitsPerPage=' + n + '&query=' + encodeURIComponent(query), {}, 8000, signal);
    if (r.ok){
      const j = await r.json();
      for (const hit of (j.hits || [])){
        const title = hit.title || hit.story_title;
        const url = hit.url || ('https://news.ycombinator.com/item?id=' + hit.objectID);
        if (!title) continue;
        const snippet = (hit.story_text || hit.comment_text || ('Points: ' + (hit.points || 0) + ' · Comments: ' + (hit.num_comments || 0) + ' · Author: ' + (hit.author || 'hn'))).replace(/<[^>]+>/g, ' ').slice(0, 260);
        out.push({title, url, snippet, engine: 'HackerNews'});
      }
    }
  } catch(e){ if (e.name === 'AbortError') throw e; }
  return out;
}

async function searchArxiv(query, n = 3, signal){
  const out = [];
  try {
    const r = await tfetch('https://export.arxiv.org/api/query?search_query=all:' + encodeURIComponent(query) + '&start=0&max_results=' + n, {}, 9000, signal);
    if (r.ok){
      const xml = await r.text();
      const entries = xml.split('<entry>').slice(1);
      for (const ent of entries){
        const title = (ent.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
        const summary = (ent.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1];
        const id = (ent.match(/<id>([\s\S]*?)<\/id>/) || [])[1];
        if (title && id){
          out.push({
            title: title.replace(/\s+/g, ' ').trim(),
            url: id.trim(),
            snippet: (summary || '').replace(/\s+/g, ' ').trim().slice(0, 280),
            engine: 'ArXiv'
          });
        }
      }
    }
  } catch(e){ if (e.name === 'AbortError') throw e; }
  return out;
}

async function searchStackOverflow(query, n = 3, signal){
  const out = [];
  try {
    const r = await tfetch('https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&site=stackoverflow&pagesize=' + n + '&q=' + encodeURIComponent(query), {}, 8000, signal);
    if (r.ok){
      const j = await r.json();
      for (const it of (j.items || [])){
        if (!it.link || !it.title) continue;
        const tags = (it.tags || []).slice(0, 4).join(', ');
        const snippet = 'StackOverflow (' + (it.score || 0) + ' votes, ' + (it.answer_count || 0) + ' answers' + (it.is_answered ? ', ✓ Answered' : '') + ') — Tags: ' + tags;
        out.push({title: it.title, url: it.link, snippet, engine: 'StackOverflow'});
      }
    }
  } catch(e){ if (e.name === 'AbortError') throw e; }
  return out;
}

async function searchGitHub(query, n = 3, signal){
  const out = [];
  try {
    const r = await tfetch('https://api.github.com/search/repositories?sort=stars&order=desc&per_page=' + n + '&q=' + encodeURIComponent(query), {headers:{Accept:'application/vnd.github+json'}}, 8000, signal);
    if (r.ok){
      const j = await r.json();
      for (const repo of (j.items || [])){
        if (!repo.html_url) continue;
        const snippet = (repo.description || 'Open-source repository') + ' · ★ ' + (repo.stargazers_count || 0) + (repo.language ? ' · ' + repo.language : '');
        out.push({title: repo.full_name, url: repo.html_url, snippet, engine: 'GitHub'});
      }
    }
  } catch(e){ if (e.name === 'AbortError') throw e; }
  return out;
}

async function searchOpenAlex(query, n = 3, signal){
  const out = [];
  try {
    const r = await tfetch('https://api.openalex.org/works?per-page=' + n + '&search=' + encodeURIComponent(query), {}, 8500, signal);
    if (r.ok){
      const j = await r.json();
      for (const w of (j.results || [])){
        const title = w.title || w.display_name;
        const url = (w.primary_location && w.primary_location.landing_page_url) || w.doi || w.id;
        if (!title || !url) continue;
        const year = w.publication_year ? ' (' + w.publication_year + ')' : '';
        const cites = w.cited_by_count != null ? ' · Cited by ' + w.cited_by_count : '';
        const venue = (w.primary_location && w.primary_location.source && w.primary_location.source.display_name) || 'Academic Work';
        out.push({title: title + year, url, snippet: venue + cites, engine: 'OpenAlex'});
      }
    }
  } catch(e){ if (e.name === 'AbortError') throw e; }
  return out;
}

async function searchReddit(query, n = 3, signal){
  const out = [];
  try {
    const r = await tfetch('https://www.reddit.com/search.json?limit=' + n + '&sort=relevance&q=' + encodeURIComponent(query), {}, 8000, signal);
    if (r.ok){
      const j = await r.json();
      const children = (j.data && j.data.children) || [];
      for (const c of children){
        const d = c.data;
        if (!d || !d.title) continue;
        const url = d.permalink ? ('https://www.reddit.com' + d.permalink) : d.url;
        const snippet = (d.selftext ? d.selftext.replace(/\s+/g, ' ').slice(0, 220) : ('r/' + (d.subreddit || 'all') + ' · ↑' + (d.score || 0) + ' · ' + (d.num_comments || 0) + ' comments'));
        out.push({title: d.title + ' (r/' + (d.subreddit || 'all') + ')', url, snippet, engine: 'Reddit'});
      }
    }
  } catch(e){ if (e.name === 'AbortError') throw e; }
  return out;
}

async function searchBackendAggregator(query, n = 140, signal, fast = false, extra = {}){
  try {
    const body = fast
      ? {query, limit: n, fast: true}
      : {query, limit: Math.max(120, n), ...(extra.deep ? {deep: true} : {})};
    const r = await tfetch('/api/search', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    }, extra.deep ? 20000 : (fast ? 6800 : 14000), signal);
    if (r.ok){
      const j = await r.json();
      if (j && Array.isArray(j.results)) {
        if (extra && typeof extra.onMeta === 'function') {
          extra.onMeta({
            groundedAnswer: j.groundedAnswer || '',
            queriesUsed: j.queriesUsed || [],
            enginesUsed: j.enginesUsed || [],
            scannedCount: j.scannedCount || j.results.length,
            uniqueCount: j.uniqueCount || j.results.length,
            distinctDomains: j.distinctDomains || 0,
            avgTrust: j.avgTrust || 0,
            elapsedMs: j.elapsedMs || 0
          });
        }
        return j.results;
      }
    }
  } catch(e){ if (e && e.name === 'AbortError') throw e; }
  return [];
}

async function search(query, n = 140, signal, opts = {}){
  const cleanQuery = String(query || '').replace(/^\/(?:search|web|research|factcheck)\s+/i, '').trim() || String(query || '').trim();
  const target = opts.fast ? Math.max(25, n || 60) : Math.max(120, n || 140);
  const enabled = opts.fast ? [] : (opts.engines || ['wiki', 'hn']);
  let backendMeta = null;
  const tasks = [searchBackendAggregator(cleanQuery, target, signal, !!opts.fast, {
    deep: !!opts.deep,
    onMeta: (m) => { backendMeta = m; if (opts.onMeta) opts.onMeta(m); }
  })];
  // Only run CORS-friendly live browser fallbacks; Google Search Grounding, Bing, DuckDuckGo, Google News, Reddit, OpenAlex, Crossref are already aggregated server-side in /api/search
  if (enabled.includes('wiki')) tasks.push(searchWikipedia(cleanQuery, 15, signal));
  if (enabled.includes('hn')) tasks.push(searchHackerNews(cleanQuery, 15, signal));

  const groups = await Promise.all(tasks.map(p => p.catch(e => { if (e && e.name === 'AbortError') throw e; return []; })));
  const canonKey = (rawUrl) => {
    try {
      const u = new URL(String(rawUrl || '').trim());
      const host = u.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
      const kept = [];
      u.searchParams.forEach((v, k) => {
        const lk = k.toLowerCase();
        if (!lk.startsWith('utm_') && !['ref', 'fbclid', 'gclid', 'si', 'source', 'share'].includes(lk)) kept.push(lk + '=' + v);
      });
      kept.sort();
      const p = (u.pathname || '/').replace(/\/+$/, '') || '/';
      return host + p + (kept.length ? '?' + kept.join('&') : '');
    } catch (_) {
      return String(rawUrl || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/#.*$/, '').replace(/\/+$/, '');
    }
  };
  const seen = new Set();
  const out = [];
  const pushUnique = (item) => {
    if (!item || !item.url || item.engine === 'WebIndex') return;
    const key = canonKey(item.url);
    if (!seen.has(key)){
      seen.add(key);
      out.push(item);
    }
  };
  // Backend verified results first (Google Search Grounding + Bing + DDG + Google News + Wiki/Tech)
  for (const item of (groups[0] || [])){
    if (out.length >= target) break;
    pushUnique(item);
  }
  const clientGroups = groups.slice(1);
  const maxLen = Math.max(0, ...clientGroups.map(g => g.length));
  for (let i = 0; i < maxLen && out.length < target; i++){
    for (const g of clientGroups){
      if (i < g.length) pushUnique(g[i]);
    }
  }
  const finalArr = out.slice(0, target);
  if (backendMeta) finalArr._meta = backendMeta;
  return finalArr;
}

async function deepSearch(query, opts = {}){
  const signal = opts.signal;
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
  const cleanQuery = String(query || '').replace(/^\/(?:search|web|research|factcheck|deep)\s+/i, '').trim() || String(query || '').trim();
  let result = null;
  try {
    const r = await fetch('/api/search/deep', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ query: cleanQuery }),
      signal
    });
    if (r.ok && r.body && r.body.getReader){
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true){
        const {value, done} = await reader.read();
        if (done) break;
        buf += dec.decode(value, {stream:true});
        const parts = buf.split('\n\n');
        buf = parts.pop() || '';
        for (const part of parts){
          let ev = 'message';
          const dataLines = [];
          for (const line of part.split('\n')){
            if (line.startsWith('event:')) ev = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
          }
          if (!dataLines.length) continue;
          try {
            const data = JSON.parse(dataLines.join('\n'));
            if (ev === 'progress' && onProgress) onProgress(data);
            if (ev === 'result') result = data;
          } catch(_){}
        }
      }
      if (buf.trim()){
        try {
          const lines = buf.split('\n');
          let ev = 'message';
          const dataLines = [];
          for (const line of lines){
            if (line.startsWith('event:')) ev = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
          }
          if (dataLines.length){
            const data = JSON.parse(dataLines.join('\n'));
            if (ev === 'progress' && onProgress) onProgress(data);
            if (ev === 'result') result = data;
          }
        } catch(_){}
      }
    }
  } catch(e){
    if (e && e.name === 'AbortError') throw e;
  }
  if (!result){
    const fallback = await searchBackendAggregator(cleanQuery, 250, signal, false, {deep: true});
    result = { results: fallback, sources: fallback, scannedCount: fallback.length, uniqueCount: fallback.length, readCount: 0, conclusion: '', deep: true };
  }
  if (onProgress && result) onProgress({ stage: 'done', found: result.scannedCount, unique: result.uniqueCount, read: result.readCount, message: 'Deep search complete' });
  return result;
}

/* Page text for web research: read server-side (one hard deadline), batched when several pages are read at once. */
let readBatch = null;
function readPage(url, max = 4000, signal, timeoutMs = 2500){
  if (!readBatch){
    const b = readBatch = {urls: [], max, timeoutMs};
    setTimeout(async () => {
      readBatch = null;
      let pages = {};
      try {
        const r = await tfetch('/api/read', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({urls: b.urls, max: b.max, timeoutMs: b.timeoutMs})}, b.timeoutMs + 1200, signal);
        if (r.ok) pages = (await r.json()).pages || {};
      } catch(_){}
      b.pages = pages;
      b.done.forEach(f => f());
    }, 0);
    b.done = [];
  }
  const b = readBatch;
  b.max = Math.max(b.max, max); b.timeoutMs = Math.min(4000, Math.max(b.timeoutMs, timeoutMs));
  if (b.urls.length < 6) b.urls.push(url);
  return new Promise(res => b.done.push(() => res(String((b.pages || {})[url] || '').slice(0, max))));
}
function domainOf(u){ try { return new URL(u).hostname.replace(/^www\./,''); } catch(_){ return u; } }
function favicon(u){ return 'https://icons.duckduckgo.com/ip3/' + domainOf(u) + '.ico'; }

/* ---- lazy libraries ---- */
const libs = {};
function loadScript(src){
  if (!libs[src]) libs[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete libs[src]; rej(new Error('Could not load a component')); }; document.head.appendChild(s); });
  return libs[src];
}
async function pdfText(arrayBuffer, maxPages = 40){
  await loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
  const pdfjs = window.pdfjsLib;
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const doc = await pdfjs.getDocument({data: arrayBuffer}).promise;
  let text = '';
  for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++){
    const p = await doc.getPage(i);
    const c = await p.getTextContent();
    text += '\n--- page ' + i + ' ---\n' + c.items.map(it => it.str).join(' ');
  }
  return {text: text.trim(), pages: doc.numPages};
}

/* ---- speech to text ---- */
async function transcribe(blob, lang, signal){
  const fd = new FormData();
  const ext = (blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm');
  fd.append('file', blob, 'speech.' + ext);
  fd.append('model', 'whisper-large-v3-turbo');
  if (lang) fd.append('language', lang.slice(0, 2));
  fd.append('response_format', 'json');
  const r = await tfetch(BASE + '/audio/transcriptions', {method:'POST', body: fd}, 30000, signal);
  if (!r.ok){ const e = new Error('stt ' + r.status); e.status = r.status; throw e; }
  const j = await r.json();
  return (j.text || '').trim();
}

const Usage = {
  canUse: () => {
    if (window.LZAuth && window.LZAuth.usage) return window.LZAuth.usage.canUse();
    return true;
  },
  isUnlimited: () => {
    if (window.LZAuth && window.LZAuth.usage && window.LZAuth.usage.isUnlimited) return window.LZAuth.usage.isUnlimited();
    return false;
  },
  remaining: () => {
    if (window.LZAuth && window.LZAuth.usage) return window.LZAuth.usage.remaining();
    return 25000;
  },
  limit: () => {
    if (window.LZAuth && window.LZAuth.usage) return window.LZAuth.usage.limit();
    return 25000;
  },
  percent: () => {
    if (window.LZAuth && window.LZAuth.usage) return window.LZAuth.usage.percent();
    return 100;
  },
  consume: (tokens) => {
    if (window.LZAuth && window.LZAuth.usage) return window.LZAuth.usage.consume(tokens);
  },
  openCodesModal: (tab) => {
    if (window.LZAuth && window.LZAuth.openCodesModal) return window.LZAuth.openCodesModal(tab);
  },
  createLimitBlock: (msg) => {
    if (window.LZAuth && window.LZAuth.createLimitBlock) return window.LZAuth.createLimitBlock(msg);
    return document.createElement('div');
  }
};

window.LZ = {Usage, transcribe, chat, resumeGen, listGens, cancelGen, chatJSON, parseJSON, vision, generateImage, generateVideo, editImage, recompress, recompressFile, blobToDataURL, search, deepSearch, typewriterDurationMs, SEARCH_ENGINES, searchDuckDuckGo, searchWikipedia, searchHackerNews, searchArxiv, searchStackOverflow, searchGitHub, searchOpenAlex, searchReddit, readPage, domainOf, favicon, loadScript, pdfText, extractFileText, extractVideoAnalysis, planKeyframeTimes, sleep, abortErr, tfetch, streamBackendChat, streamBackendVision, streamOpenAI, BASE, M, limitReachedErr};
})();
