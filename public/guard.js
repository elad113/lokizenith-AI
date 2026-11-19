/* ============================================================================
   Lokizenith Model & Thinking Mode Tuning + Auth Header Injection
   ============================================================================ */
(function(){
  const A = window.App || window._Loki;
  if (!A) return;
  const {state} = A;

  function isUnlimited(){ return Boolean(window.LZAuth?.usage?.isUnlimited?.()); }
  function setUnlimited(){ return false; }
  function tokensLeft(){ return window.LZ?.Usage ? window.LZ.Usage.remaining() : 25000; }
  function addTokens(){ return tokensLeft(); }
  function isExhausted(){ return !isUnlimited() && tokensLeft() <= 0; }

  /* ---- Mode instruction & token tuning per model + thinking mode ---- */
  const MODE_PROFILES = {
    'fera:fast':  { max_tokens: 900,  temperature: 0.55, sys: 'MODE: FAST (Lokizen 3.5 Fera). Reply in 1–4 short, direct sentences. No preamble, no filler.' },
    'fera:auto':  { max_tokens: 1800, temperature: 0.65, sys: 'MODE: AUTO (Lokizen 3.5 Fera). Clear, balanced, practical answers with clean formatting.' },
    'fera:pro':   { max_tokens: 2800, temperature: 0.7,  sys: 'MODE: PRO (Lokizen 3.5 Fera). Structured, thorough response with examples and edge cases.' },
    'stark:fast': { max_tokens: 1400, temperature: 0.5,  sys: 'MODE: FAST (Lokizen 4.0 Stark). Give a sharp, high-density, accurate answer immediately. When tables are requested, use clean Markdown tables (| col |). Maximum signal, zero fluff.' },
    'stark:auto': { max_tokens: 3200, temperature: 0.65, sys: 'MODE: AUTO (Lokizen 4.0 Stark — Astra 6 Flagship Tier). Flagship intelligence, nuanced comprehension, and creative depth. Always format requested tables or data grids as clean in-text Markdown tables (| col |), never as raw arrays or code blocks.' },
    'stark:pro':  { max_tokens: 4400, temperature: 0.7,  sys: 'MODE: PRO (Lokizen 4.0 Stark). Expert-level analysis, rigorous structure, production-ready code and complete explanations. Use Markdown tables for tabular comparisons.' },
    'stark:xhigh':{ max_tokens: 6144, temperature: 0.72, sys: 'MODE: EXTRA HIGH (Lokizen 4.0 Stark — Deep Thinking & Verified Reasoning). Perform exhaustive multi-step reasoning, verify every assumption, cover edge cases, provide master-level output with rich in-text Markdown tables for structured data.' }
  };

  const origFetch = window.fetch.bind(window);
  window.fetch = async function(url, opts){
    const uStr = typeof url === 'string' ? url : (url && url.url) || '';
    if (uStr.startsWith('/api/')){
      const tok = localStorage.getItem('lz.authToken');
      if (tok){
        const nextHeaders = Object.assign({}, (opts && opts.headers) || {});
        if (!nextHeaders['x-lz-token'] && !nextHeaders['Authorization']){
          nextHeaders['x-lz-token'] = tok;
        }
        opts = Object.assign({}, opts, { headers: nextHeaders });
      }
    }
    if (uStr.includes('/api/chat') && !uStr.includes('/api/chat/stream') && opts && opts.method && opts.method.toUpperCase() === 'POST'){
      try {
        const body = JSON.parse(opts.body || '{}');
        const mdl = body.model || (state && state.model) || 'stark';
        const md  = body.mode  || (state && state.mode)  || 'auto';
        const prof = MODE_PROFILES[`${mdl}:${md}`] || MODE_PROFILES['stark:auto'];
        body.max_tokens = body.max_tokens || prof.max_tokens;
        body.temperature = body.temperature ?? prof.temperature;
        opts = Object.assign({}, opts, { body: JSON.stringify(body) });
      } catch(_){}
    }
    return origFetch(url, opts);
  };

  window._LokiGuard = { isUnlimited, setUnlimited, tokensLeft, addTokens, isExhausted };
})();
