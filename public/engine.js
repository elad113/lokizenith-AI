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
  const tok = localStorage.getItem('lz.authToken');
  const headers = {'Content-Type': 'application/json'};
  if (tok) headers['x-lz-token'] = tok;
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
        turnId: opts.turnId || ''
      }),
      signal: ctl.signal
    });
    if (r.status === 403){
      const j = await r.json().catch(() => ({}));
      if (['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED'].includes(j.code)){
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
      turnId: opts.turnId || ''
    })
  }, opts.timeout || 32000, signal);
  if (r.status === 403){
    const j = await r.json().catch(() => ({}));
    if (['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED'].includes(j.code)){
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

/**
 * Wraps an upstream streaming call so that the text is revealed smoothly
 * with fast typewriter pacing over at least `minWriteMs` (3,100ms = 3.1s)
 * instead of dumping all at once.
 */
async function runWithTypewriterPacer(upstreamFn, userOnToken, signal, minWriteMs = 3100){
  if (typeof userOnToken !== 'function') {
    return await upstreamFn(NOOP);
  }
  let targetText = '';
  let shownLen = 0;
  let firstArrivalAt = 0;
  let upstreamFinished = false;
  const TICK_MS = 35;

  const advanceTick = () => {
    if (!targetText.length || shownLen >= targetText.length) return;
    const now = performance.now();
    const elapsed = firstArrivalAt ? (now - firstArrivalAt) : 0;
    let nextLen;
    if (!upstreamFinished) {
      // While upstream is still generating or streaming, pace smoothly toward targetText.length over minWriteMs
      const progress = Math.min(0.92, Math.max(0.03, elapsed / minWriteMs));
      const allowedLen = Math.max(shownLen + 1, Math.floor(targetText.length * progress));
      const step = Math.max(1, Math.ceil((allowedLen - shownLen) * 0.35));
      nextLen = Math.min(targetText.length, shownLen + step);
    } else {
      const remTime = Math.max(TICK_MS, minWriteMs - elapsed);
      const ticksLeft = Math.max(1, Math.ceil(remTime / TICK_MS));
      const remChars = targetText.length - shownLen;
      const step = Math.max(1, Math.ceil(remChars / ticksLeft));
      nextLen = Math.min(targetText.length, shownLen + step);
    }
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
      if (!firstArrivalAt) firstArrivalAt = performance.now();
      targetText = clean(fullSoFar);
    });
    const finalOut = clean(rawOut);
    if (!firstArrivalAt) firstArrivalAt = performance.now();
    targetText = finalOut;
    upstreamFinished = true;

    // Continue smooth fast typing until all characters are revealed and at least minWriteMs has elapsed
    while (shownLen < targetText.length) {
      if (signal && signal.aborted) throw abortErr();
      advanceTick();
      if (shownLen < targetText.length) {
        await sleep(TICK_MS, signal);
      }
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
  // Ultra mode streams with 0ms artificial typewriter throttling (faster than Turbo!)
  const defaultMinWrite = isUltra ? 0 : (level === 0 ? 450 : 950);
  const minWriteMs = opts.minWriteMs ?? defaultMinWrite;

  const executeChatCore = async (internalOnToken) => {
    // 1. Always try server-side SSE stream first for non-JSON requests
    if (!opts.json && stream){
      try {
        const out = await streamBackendChat(messages, {...opts, onToken: internalOnToken, tier, level, timeout: 26000}, signal);
        if (out) return out;
      } catch(e){
        if ((signal && signal.aborted) || isQuotaHardLockErr(e)) throw e;
      }
    } else {
      try {
        const out = await callBackendGemini(messages, {...opts, onToken: internalOnToken, tier, level, timeout: 28000}, signal);
        if (out) return out;
      } catch(e){
        if ((signal && signal.aborted) || isQuotaHardLockErr(e)) throw e;
      }
    }

    const baseOrder = (level >= 1 && level !== 4 ? ORDER_DEEP : ORDER)[tier].slice();
    const rot = rrIdx++ % 2;
    let order = rot === 1 ? [baseOrder[1], baseOrder[0], ...baseOrder.slice(2)] : baseOrder;
    if (opts.prefer) order = [opts.prefer, ...order.filter(m => m !== opts.prefer)];
    if (opts.lane != null){ const fast = ORDER[tier].slice(0, 2), pick = fast[opts.lane % 2]; order = [pick, ...order.filter(m => m !== pick)]; }
    const ms = opts.timeout || (isTurbo ? 14000 : 24000);

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
      }
    }

    // 3. Server-side /api/chat guaranteed multi-layer fallback
    try {
      const out = await callBackendGemini(messages, {...opts, onToken: internalOnToken, tier, level, timeout: 32000}, signal);
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
      }, 15000, signal);
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
  for (let i = 0; i < 2; i++){
    txt = await chat(messages, {...opts, onToken: undefined, json:true, temperature: opts.temperature ?? 0.4});
    const j = parseJSON(txt);
    if (j) return j;
  }
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
async function vision(messages, opts = {}){
  if (!opts._noConsume) checkQuotaOrThrow();
  // 1. Try backend vision/chat
  try {
    const res = await callBackendGemini(messages, opts, opts.signal);
    // If output is not an evasive refusal, return it
    if (res && !/cannot see|can't see|text-based AI|unable to see|don't have eyes/i.test(res)) {
      consumeAfterCall(messages, res, opts, 300);
      return res;
    }
  } catch(e){
    if (e.name === 'AbortError' || isQuotaHardLockErr(e)) throw e;
  }

  // 2. Direct Kepler Qwen2.5-VL-72B-Instruct multimodal fallback
  const models = ['Qwen/Qwen2.5-VL-72B-Instruct', 'Qwen2.5-VL-72B-Instruct'];
  for (const m of models){
    try {
      const out = await callOpenAI(BASE + '/chat/completions', {model: m, messages, max_tokens: opts.maxTokens || 2200, temperature: 0.4}, 50000, opts.signal);
      if (out) { consumeAfterCall(messages, out, opts, 300); return out; }
    } catch(e){
      if (e.name === 'AbortError' || isQuotaHardLockErr(e)) throw e;
      await sleep(800, opts.signal);
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
  // 1. Try server-side multi-provider generator (Gemini Imagen -> Kepler SDXL -> AI Horde)
  try {
    const r = await tfetch('/api/image/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({prompt, width: 1024, height: 1024, turnId: opts.turnId || ''})
    }, 32000, opts.signal);
    if (r.status === 403){
      const j = await r.json().catch(() => ({}));
      if (['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED'].includes(j.code)){
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

  // 2. Direct Kepler SDXL endpoint fallback
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

/* ---- video generation engine ---- */
async function generateVideo(prompt, opts = {}){
  const signal = opts.signal;
  const onStatus = opts.onStatus || (() => {});

  onStatus('Generating cinematic scene keyframe…');
  let keyframeUrl = opts.sourceImageUrl;
  if (!keyframeUrl) {
    keyframeUrl = await generateImage(prompt + ', wide angle, 16:9 cinematic film scene, 8k, photorealistic', { signal, onStatus, turnId: opts.turnId || '' });
  }

  onStatus('Rendering cinematic motion & camera paths…');
  const img = await loadImg(keyframeUrl);

  const ratio = opts.ratio || '16:9';
  let width = 768, height = 432;
  if (ratio === '9:16') { width = 432; height = 768; }
  else if (ratio === '1:1') { width = 576; height = 576; }
  else if (ratio === '4:3') { width = 640; height = 480; }

  const durationSec = Math.min(8, Math.max(2, parseInt(opts.duration, 10) || 4));
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
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

      const recordingPromise = new Promise((resolve, reject) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };
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
        const zoom = 1.0 + ease * 0.16;
        const panX = Math.sin(progress * Math.PI) * (width * 0.03);
        const panY = ease * (height * 0.02);

        ctx.save();
        ctx.clearRect(0, 0, width, height);
        ctx.translate(width / 2 + panX, height / 2 + panY);
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
        ctx.restore();

        // Atmospheric cinematic lighting flare
        const grad = ctx.createRadialGradient(
          width * (0.25 + progress * 0.5), height * 0.25, 20,
          width / 2, height / 2, width * 0.8
        );
        grad.addColorStop(0, `rgba(255, 235, 190, ${0.1 * Math.sin(progress * Math.PI)})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Cinematic crop bars (only for landscape)
        if (ratio === '16:9') {
          ctx.fillStyle = '#050505';
          ctx.fillRect(0, 0, width, 16);
          ctx.fillRect(0, height - 16, width, 16);
        }

        await sleep(1000 / fps, signal);
      }

      recorder.stop();
      const videoBlob = await recordingPromise;
      const videoDataUrl = await blobToDataURL(videoBlob);
      return {
        dataUrl: videoDataUrl,
        keyframeUrl,
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
    duration: durationSec,
    ratio,
    width,
    height,
    isAnimatedPoster: true
  };
}
function blobToDataURL(blob){ return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); }); }
function loadImg(src){ return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
async function recompress(dataUrl, max = 1024, q = 0.88){
  const img = await loadImg(dataUrl);
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
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

async function searchBackendAggregator(query, n = 250, signal){
  try {
    const r = await tfetch('/api/search', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query, limit: Math.max(245, n)})
    }, 12000, signal);
    if (r.ok){
      const j = await r.json();
      if (j && Array.isArray(j.results)) return j.results;
    }
  } catch(e){ if (e && e.name === 'AbortError') throw e; }
  return [];
}

async function search(query, n = 240, signal, opts = {}){
  const cleanQuery = String(query || '').replace(/^\/(?:search|web|research|factcheck)\s+/i, '').trim() || String(query || '').trim();
  const target = Math.max(240, n || 240);
  const enabled = opts.engines || ['wiki', 'hn'];
  const tasks = [searchBackendAggregator(cleanQuery, target, signal)];
  // Only run CORS-friendly live browser fallbacks; Reddit, ArXiv, OpenAlex, Crossref, DDG, Bing are already aggregated server-side in /api/search
  if (enabled.includes('wiki')) tasks.push(searchWikipedia(cleanQuery, 20, signal));
  if (enabled.includes('hn')) tasks.push(searchHackerNews(cleanQuery, 20, signal));

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
  // Backend verified results first (already deduplicated & credibility-ranked), then client live engines
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
  return out.slice(0, target);
}
async function readPage(url, max = 4000, signal){
  try {
    const r = await tfetch(JINA + url, {headers:{Accept:'application/json'}}, 25000, signal);
    if (!r.ok) return '';
    const j = await r.json();
    let t = (j.data && j.data.content) || '';
    t = t.replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/\n{3,}/g,'\n\n').trim();
    return t.slice(0, max);
  } catch(e){ if (e.name === 'AbortError') throw e; return ''; }
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

window.LZ = {Usage, transcribe, chat, chatJSON, parseJSON, vision, generateImage, generateVideo, editImage, recompress, blobToDataURL, search, SEARCH_ENGINES, searchDuckDuckGo, searchWikipedia, searchHackerNews, searchArxiv, searchStackOverflow, searchGitHub, searchOpenAlex, searchReddit, readPage, domainOf, favicon, loadScript, pdfText, sleep, abortErr, tfetch, streamBackendChat, streamOpenAI, BASE, M, limitReachedErr};
})();
