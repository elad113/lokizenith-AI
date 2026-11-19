/* Lokizenith Labs — new tools. Made by Lokiz Studios. */
(function(){
'use strict';
const A = window.App, {$, $$, el, esc} = A;
const t = s => window.I18N ? I18N.t(s) : s;
const tier = () => A.state.model;
const loadCSS = href => { if (!document.querySelector(`link[href="${href}"]`)){ const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); } };
const fail = (w, e, msg) => { w && w.done(); if (e && e.name === 'AbortError') return; A.toast(e && e.userFacing ? e.message : t(msg), 'err'); console.warn(e); };

/* ---------- 1. Math Solver (Fera + Stark) ---------- */
const KX = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/';
async function katex(){ loadCSS(KX + 'katex.min.css'); await LZ.loadScript(KX + 'katex.min.js'); }
function tex(s, display){ try { return window.katex.renderToString(String(s || ''), {throwOnError:false, displayMode: !!display}); } catch(_){ return esc(s); } }
// safe expression → function (whitelisted tokens only)
function compile(expr){
  let e = String(expr || '').toLowerCase().replace(/\s+/g, '').replace(/^y=|^f\(x\)=/, '').replace(/\*\*/g, '^').replace(/π|pi/g, '(PI)');
  if (!/^[0-9x+\-*/^().,a-z()PI]*$/i.test(e)) return null;
  const words = e.match(/[a-z]+/g) || [];
  const ok = ['x', 'sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'ln', 'exp', 'asin', 'acos', 'atan', 'pi', 'e'];
  if (words.some(w => !ok.includes(w))) return null;
  e = e.replace(/(\d)(x|\()/g, '$1*$2').replace(/\)(x|\d|\()/g, ')*$1').replace(/x\(/g, 'x*(')
       .replace(/\bln\(/g, 'log(').replace(/\b(sin|cos|tan|sqrt|abs|log|exp|asin|acos|atan)\(/g, 'Math.$1(').replace(/\be\b/g, 'Math.E').replace(/PI/g, 'Math.PI').replace(/\^/g, '**');
  try { const f = new Function('x', '"use strict";return (' + e + ');'); f(1); return f; } catch(_){ return null; }
}
function plot(canvas, f, x0, x1, accent){
  const dpr = Math.min(2, devicePixelRatio || 1), W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const c = canvas.getContext('2d'); c.scale(dpr, dpr);
  const N = 400, ys = [];
  for (let i = 0; i <= N; i++){ const x = x0 + (x1 - x0) * i / N; let y; try { y = f(x); } catch(_){ y = NaN; } ys.push(Number.isFinite(y) ? y : NaN); }
  const fin = ys.filter(Number.isFinite).sort((a, b) => a - b);
  let y0 = fin.length ? fin[Math.floor(fin.length * .03)] : -5, y1 = fin.length ? fin[Math.ceil(fin.length * .97) - 1] : 5;
  if (y1 - y0 < 1e-6){ y0 -= 1; y1 += 1; } const pad = (y1 - y0) * .12; y0 -= pad; y1 += pad;
  const X = x => (x - x0) / (x1 - x0) * W, Y = y => H - (y - y0) / (y1 - y0) * H;
  c.fillStyle = '#040b07'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(255,255,255,.06)'; c.lineWidth = 1;
  const step = v => { const r = Math.pow(10, Math.floor(Math.log10(v / 6))); return [1, 2, 5, 10].map(k => k * r).find(s => v / s <= 10); };
  const sx = step(x1 - x0), sy = step(y1 - y0);
  c.font = '11px Inter, sans-serif'; c.fillStyle = 'rgba(207,238,224,.55)';
  for (let x = Math.ceil(x0 / sx) * sx; x <= x1; x += sx){ c.beginPath(); c.moveTo(X(x), 0); c.lineTo(X(x), H); c.stroke(); c.fillText(+x.toFixed(6), X(x) + 3, Math.min(H - 4, Math.max(12, Y(0) - 4))); }
  for (let y = Math.ceil(y0 / sy) * sy; y <= y1; y += sy){ c.beginPath(); c.moveTo(0, Y(y)); c.lineTo(W, Y(y)); c.stroke(); if (Math.abs(y) > 1e-9) c.fillText(+y.toFixed(6), Math.min(W - 30, Math.max(3, X(0) + 4)), Y(y) - 3); }
  c.strokeStyle = 'rgba(207,238,224,.45)'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(0, Y(0)); c.lineTo(W, Y(0)); c.moveTo(X(0), 0); c.lineTo(X(0), H); c.stroke();
  c.strokeStyle = accent; c.lineWidth = 2.6; c.shadowColor = accent; c.shadowBlur = 8; c.beginPath();
  let pen = false;
  ys.forEach((y, i) => { const x = x0 + (x1 - x0) * i / N; if (!Number.isFinite(y) || y < y0 - (y1 - y0) * 3 || y > y1 + (y1 - y0) * 3){ pen = false; return; } pen ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)); pen = true; });
  c.stroke(); c.shadowBlur = 0;
}
function labMath(body){
  body.innerHTML = `<div class="lab-grid"><p class="lab-desc">${t('Type any math problem — equations, word problems, derivatives, geometry. You get a clear step-by-step solution, typeset math and a graph when it helps.')}</p>
  <textarea class="lab-input" id="msIn" rows="3" dir="auto" placeholder="${esc(t('e.g. Solve x² − 5x + 6 = 0 and draw the parabola'))}"></textarea>
  <div class="lab-row"><button class="btn-primary" id="msGo">🧮 ${t('Solve')}</button><span class="ms-ex">${['x^2-5x+6=0', 'd/dx (x^3·sin x)', '2x+3y=12, x-y=1', 'y = 2^x - 3'].map(x => `<button class="chip" data-x="${esc(x)}">${esc(x)}</button>`).join('')}</span></div>
  <div id="msWork"></div><div id="msOut" class="ms-out"></div></div>`;
  $$('.ms-ex .chip', body).forEach(b => b.onclick = () => { $('#msIn').value = b.dataset.x; $('#msGo').click(); });
  $('#msGo').onclick = async () => {
    const q = $('#msIn').value.trim(); if (!q) return;
    $('#msGo').disabled = true; $('#msOut').innerHTML = ''; $('#msWork').innerHTML = '';
    const w = A.Work($('#msWork'), {open: true});
    try {
      w.log(t('Loading math typesetting')); const kp = katex();
      w.log(t('Solving step by step'));
      const j = await LZ.chatJSON([{role:'system', content:`You are a precise math tutor. Solve the problem and return ONLY JSON:
{"problem_latex":"the problem in LaTeX","steps":[{"text":"short explanation in the user's language","latex":"LaTeX for this step (no $ signs)"}],"answer_latex":"final answer in LaTeX","answer_text":"final answer in words, user's language","plot":{"expr":"a single-variable function of x in plain JS-like syntax using ^ (e.g. x^2-5*x+6), or empty string if a graph doesn't help","xmin":-10,"xmax":10}}
Double-check every computation. 3-8 steps.`}, {role:'user', content: q}], {tier: tier(), level: Math.max(1, A.state.level), maxTokens: 3500, onStatus: x => w.log(x)});
      await kp;
      w.log(t('Typesetting')); w.done();
      const out = $('#msOut');
      out.innerHTML = `<div class="ms-prob">${tex(j.problem_latex || q, true)}</div><ol class="ms-steps">${(j.steps || []).map((s, i) => `<li style="animation-delay:${i * 90}ms"><div class="ms-t" dir="auto">${esc(s.text || '')}</div>${s.latex ? `<div class="ms-l">${tex(s.latex, true)}</div>` : ''}</li>`).join('')}</ol>
        <div class="ms-ans"><span>✓ ${t('Answer')}</span>${tex(j.answer_latex || '', true)}<div dir="auto">${esc(j.answer_text || '')}</div></div>`;
      const f = j.plot && j.plot.expr ? compile(j.plot.expr) : null;
      if (f){
        const x0 = Number.isFinite(+j.plot.xmin) ? +j.plot.xmin : -10, x1 = Number.isFinite(+j.plot.xmax) && +j.plot.xmax > x0 ? +j.plot.xmax : x0 + 20;
        const g = el('div', 'ms-plot', `<div class="ms-ph"><b>y = ${esc(j.plot.expr)}</b><button class="btn-ghost" id="msDl">⤓ PNG</button></div><canvas></canvas>`);
        out.appendChild(g);
        const cv = $('canvas', g);
        requestAnimationFrame(() => plot(cv, f, x0, x1, A.settings().accent || '#00ff9c'));
        $('#msDl').onclick = () => A.download(cv.toDataURL('image/png'), 'graph.png');
      }
    } catch(e){ fail(w, e, 'Could not solve that — try rephrasing'); }
    $('#msGo').disabled = false;
  };
}

/* ---------- 2. Translator (Fera + Stark) ---------- */
const TL = [['auto', 'Detect language'], ['he', 'עברית'], ['en', 'English'], ['ar', 'العربية'], ['ru', 'Русский'], ['fr', 'Français'], ['es', 'Español'], ['de', 'Deutsch'], ['it', 'Italiano'], ['pt', 'Português'], ['am', 'አማርኛ'], ['zh', '中文'], ['ja', '日本語'], ['hi', 'हिन्दी'], ['tr', 'Türkçe']];
function labTranslate(body){
  const opts = (skipAuto) => TL.filter(x => !(skipAuto && x[0] === 'auto')).map(([v, l]) => `<option value="${v}">${v === 'auto' ? t(l) : l}</option>`).join('');
  body.innerHTML = `<div class="tr-wrap"><div class="tr-bar"><select class="lab-select" id="trFrom">${opts(false)}</select><button class="btn-ghost tr-swap" id="trSwap" title="${t('Swap')}">⇄</button><select class="lab-select" id="trTo">${opts(true)}</select>
    <select class="lab-select" id="trTone"><option value="natural">${t('Natural')}</option><option value="formal">${t('Formal')}</option><option value="casual">${t('Casual')}</option><option value="literal">${t('Literal')}</option></select></div>
    <div class="tr-panes"><div class="tr-pane"><textarea id="trIn" dir="auto" placeholder="${esc(t('Type or paste text…'))}"></textarea><div class="tr-foot"><span id="trCount">0</span><button class="btn-ghost" id="trSpeakIn">🔊</button></div></div>
    <div class="tr-pane out"><div id="trOut" dir="auto" class="tr-out"></div><div class="tr-foot"><span id="trNote"></span><span><button class="btn-ghost" id="trCopy">⧉</button><button class="btn-ghost" id="trSpeak">🔊</button></span></div></div></div>
    <div class="lab-row"><button class="btn-primary" id="trGo">🌐 ${t('Translate')}</button><label class="lc-check"><input type="checkbox" id="trLive" checked> ${t('Translate as I type')}</label></div>
    <div id="trAlt" class="tr-alt"></div></div>`;
  $('#trTo').value = A.settings().lang === 'en' ? 'he' : 'en';
  let ctl = null, timer = 0, last = '';
  const go = async () => {
    const txt = $('#trIn').value.trim(); if (!txt){ $('#trOut').textContent = ''; return; }
    const key = txt + '|' + $('#trFrom').value + $('#trTo').value + $('#trTone').value; if (key === last) return; last = key;
    if (ctl) ctl.abort(); ctl = new AbortController(); const my = ctl;
    const to = TL.find(x => x[0] === $('#trTo').value)[1], from = $('#trFrom').value;
    $('#trOut').classList.add('typing'); $('#trAlt').innerHTML = '';
    try {
      const out = await LZ.chat([{role:'system', content:`You are a professional translator. Translate the user's text ${from === 'auto' ? '' : 'from ' + TL.find(x => x[0] === from)[1] + ' '}into ${to}. Tone: ${$('#trTone').value}. Preserve meaning, names, formatting, line breaks and emojis. Output ONLY the translation.`}, {role:'user', content: txt}], {tier: tier(), level: 0, maxTokens: 2500, signal: my.signal, onToken: (d, f) => { if (my === ctl) $('#trOut').textContent = f; }});
      if (my !== ctl) return;
      $('#trOut').textContent = out; $('#trOut').classList.remove('typing');
      $('#trNote').textContent = '✓';
      if (txt.length < 140){
        LZ.chatJSON([{role:'system', content:`Give 2 alternative translations into ${to} of the user's text with different nuance, and a 1-line note on usage in the user's interface language (${A.LANG_NAME[A.settings().lang] || 'English'}). Return ONLY JSON {"alts":[{"text":"","note":""}]}`}, {role:'user', content: txt}], {tier: tier(), maxTokens: 600, signal: my.signal}).then(j => {
          if (my !== ctl || !j || !j.alts) return;
          $('#trAlt').innerHTML = `<h4>${t('Alternatives')}</h4>` + j.alts.slice(0, 3).map(a => `<button class="tr-a"><b dir="auto">${esc(a.text)}</b><small dir="auto">${esc(a.note || '')}</small></button>`).join('');
          $$('.tr-a', body).forEach(b => b.onclick = () => { $('#trOut').textContent = $('b', b).textContent; });
        }).catch(() => {});
      }
    } catch(e){ if (e.name !== 'AbortError'){ $('#trOut').classList.remove('typing'); A.toast(t('Translation failed — try again'), 'err'); last = ''; } }
  };
  $('#trIn').oninput = () => { $('#trCount').textContent = $('#trIn').value.length; if ($('#trLive').checked){ clearTimeout(timer); timer = setTimeout(go, 650); } };
  $('#trGo').onclick = () => { last = ''; go(); };
  ['#trFrom', '#trTo', '#trTone'].forEach(s => $(s).onchange = () => { last = ''; go(); });
  $('#trSwap').onclick = () => { const f = $('#trFrom').value, to = $('#trTo').value; if (f !== 'auto') $('#trTo').value = f; $('#trFrom').value = to; const o = $('#trOut').textContent; if (o){ $('#trIn').value = o; } last = ''; go(); };
  $('#trCopy').onclick = () => A.copyText($('#trOut').textContent);
  $('#trSpeak').onclick = () => A.speak($('#trOut').textContent);
  $('#trSpeakIn').onclick = () => A.speak($('#trIn').value);
}

/* ---------- 3. Mind Map (Fera + Stark) — own SVG renderer ---------- */
function labMindMap(body){
  body.innerHTML = `<div class="lab-grid"><p class="lab-desc">${t('Any topic → a beautiful radial mind map. Click a branch to expand it deeper. Export as SVG or PNG.')}</p>
  <div class="lab-row"><input class="lab-input" id="mmIn" dir="auto" placeholder="${esc(t('e.g. The French Revolution, photosynthesis, starting a startup…'))}"><button class="btn-primary" id="mmGo">🧠 ${t('Map it')}</button></div>
  <div id="mmWork"></div><div class="mm-stage" id="mmStage" hidden><svg id="mmSvg" xmlns="http://www.w3.org/2000/svg"></svg></div>
  <div class="lab-row" id="mmActs" hidden><button class="btn-ghost" id="mmSvgDl">⤓ SVG</button><button class="btn-ghost" id="mmPngDl">⤓ PNG</button></div></div>`;
  let tree = null;
  const pal = ['#00ff9c', '#7dffcf', '#b6ff3b', '#3ce0ff', '#ffd166', '#c79bff', '#ff8fa3', '#5effc1'];
  function draw(){
    const svg = $('#mmSvg'), W = 1000, H = 720, cx = W / 2, cy = H / 2;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const br = tree.branches || [], n = br.length;
    let s = `<defs><filter id="mmg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="${W}" height="${H}" fill="#040b07"/>`;
    const nodes = [];
    br.forEach((b, i) => {
      const a = -Math.PI / 2 + i / n * Math.PI * 2, col = pal[i % pal.length];
      const bx = cx + Math.cos(a) * 205, by = cy + Math.sin(a) * 170;
      s += `<path class="mm-l" style="--d:${i * 80}ms" d="M${cx},${cy} Q${cx + Math.cos(a) * 90},${cy + Math.sin(a) * 60} ${bx},${by}" stroke="${col}" stroke-width="3" fill="none" opacity=".75"/>`;
      const kids = b.children || [], m = kids.length;
      kids.forEach((k, j) => {
        const spread = Math.min(1.1, 2.6 / n + .25), ka = a + (m > 1 ? (j / (m - 1) - .5) * spread : 0);
        const kx = cx + Math.cos(ka) * 375, ky = cy + Math.sin(ka) * 300;
        s += `<path class="mm-l" style="--d:${300 + i * 80 + j * 40}ms" d="M${bx},${by} Q${(bx + kx) / 2 + Math.cos(a) * 18},${(by + ky) / 2 + Math.sin(a) * 18} ${kx},${ky}" stroke="${col}" stroke-width="1.6" fill="none" opacity=".5"/>`;
        nodes.push({x: kx, y: ky, text: typeof k === 'string' ? k : k.label, col, small: true, d: 400 + i * 80 + j * 40});
      });
      nodes.push({x: bx, y: by, text: b.label, col, d: 150 + i * 80, idx: i});
    });
    const pill = (nd) => {
      const fs = nd.small ? 13 : 15, w = Math.min(nd.small ? 170 : 200, String(nd.text).length * fs * .58 + 26), h = nd.small ? 28 : 36;
      return `<g class="mm-n${nd.idx != null ? ' mm-b' : ''}" ${nd.idx != null ? `data-i="${nd.idx}"` : ''} style="--d:${nd.d}ms" transform="translate(${nd.x},${nd.y})"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#07140d" stroke="${nd.col}" stroke-width="${nd.small ? 1.2 : 2}"/><text text-anchor="middle" dy="${fs * .36}" font-size="${fs}" fill="${nd.small ? '#cfeee0' : '#fff'}" font-family="Inter,Rubik,sans-serif" font-weight="${nd.small ? 500 : 700}">${esc(String(nd.text).slice(0, nd.small ? 26 : 30))}</text></g>`;
    };
    s += nodes.map(pill).join('');
    s += `<g class="mm-n" style="--d:0ms" transform="translate(${cx},${cy})"><circle r="74" fill="#06100b" stroke="#00ff9c" stroke-width="3" filter="url(#mmg)"/><foreignObject x="-66" y="-40" width="132" height="80"><div xmlns="http://www.w3.org/1999/xhtml" style="height:80px;display:flex;align-items:center;justify-content:center;text-align:center;color:#fff;font:700 16px Inter,Rubik,sans-serif;line-height:1.2" dir="auto">${esc(tree.center || '')}</div></foreignObject></g>`;
    svg.innerHTML = s;
    $$('.mm-b', svg).forEach(g => g.onclick = () => expand(+g.dataset.i));
  }
  async function build(topic, focus){
    const w = A.Work($('#mmWork'), {open: false});
    try {
      w.log(t('Mapping ideas'));
      const j = await LZ.chatJSON([{role:'system', content:'Build a mind map. Return ONLY JSON {"center":"short topic (max 4 words)","branches":[{"label":"max 3 words","children":["max 3 words", "..."]}]}. 5-7 branches, 2-4 children each. Use the user\'s language.'}, {role:'user', content: focus ? `Topic: ${topic}. Focus deeper on: ${focus}` : topic}], {tier: tier(), maxTokens: 1500, onStatus: x => w.log(x)});
      w.done(); $('#mmWork').innerHTML = '';
      if (!j || !Array.isArray(j.branches) || !j.branches.length) throw new Error('bad');
      tree = j; $('#mmStage').hidden = false; $('#mmActs').hidden = false; draw();
    } catch(e){ fail(w, e, 'Could not build the mind map'); }
  }
  const expand = i => { const b = tree.branches[i]; if (b) build(tree.center, b.label); };
  $('#mmGo').onclick = async () => { const v = $('#mmIn').value.trim(); if (!v) return; $('#mmGo').disabled = true; $('#mmWork').innerHTML = ''; await build(v); $('#mmGo').disabled = false; };
  $('#mmIn').onkeydown = e => { if (e.key === 'Enter') $('#mmGo').click(); };
  const svgText = () => new XMLSerializer().serializeToString($('#mmSvg'));
  $('#mmSvgDl').onclick = () => A.download(svgText(), 'mind-map.svg', 'image/svg+xml');
  $('#mmPngDl').onclick = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = 2000; c.height = 1440; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 2000, 1440); A.download(c.toDataURL('image/png'), 'mind-map.png'); }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText().replace(/<foreignObject[\s\S]*?<\/foreignObject>/, `<text x="500" y="366" text-anchor="middle" font-size="16" font-weight="700" fill="#fff" font-family="Inter,sans-serif">${esc(tree.center)}</text>`)); };
}

/* ---------- 4. Document Q&A with highlighting (Stark) ---------- */
function labDocQA(body){
  body.innerHTML = `<div class="dq-wrap"><div class="dq-left"><div class="lab-row"><label class="btn-ghost dq-up">📄 ${t('Upload PDF / TXT / MD')}<input type="file" id="dqFile" accept=".pdf,.txt,.md,.csv,.json,.html,text/*,application/pdf" hidden></label><span id="dqName" class="dq-name"></span></div>
    <textarea class="lab-input" id="dqPaste" rows="4" dir="auto" placeholder="${esc(t('…or paste the document text here'))}"></textarea>
    <div class="dq-doc" id="dqDoc" dir="auto" hidden></div></div>
    <div class="dq-right"><div class="dq-chat" id="dqChat"><p class="lab-desc">${t('Ask anything about your document. Answers quote the exact passages and highlight them in the text.')}</p></div>
    <div class="lab-row"><input class="lab-input" id="dqQ" dir="auto" placeholder="${esc(t('Ask about the document…'))}"><button class="btn-primary" id="dqGo">${t('Ask')}</button></div></div></div>`;
  let doc = '';
  const showDoc = () => { const d = $('#dqDoc'); d.hidden = !doc; d.textContent = doc.slice(0, 60000); };
  $('#dqFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return; $('#dqName').textContent = '⏳ ' + f.name;
    try { doc = /pdf$/i.test(f.name) || f.type === 'application/pdf' ? await LZ.pdfText(await f.arrayBuffer(), 60) : await f.text(); $('#dqName').textContent = '✓ ' + f.name + ' · ' + Math.round(doc.length / 1000) + 'k'; $('#dqPaste').value = ''; showDoc(); }
    catch(err){ $('#dqName').textContent = ''; A.toast(t('Could not read that file'), 'err'); }
  };
  $('#dqPaste').oninput = () => { doc = $('#dqPaste').value; showDoc(); };
  const ask = async () => {
    const q = $('#dqQ').value.trim(); if (!q) return;
    if (!doc.trim()){ A.toast(t('Add a document first'), 'err'); return; }
    $('#dqQ').value = ''; $('#dqGo').disabled = true;
    const chat = $('#dqChat');
    chat.insertAdjacentHTML('beforeend', `<div class="dq-q" dir="auto">${esc(q)}</div>`);
    const holder = el('div', 'dq-a'); chat.appendChild(holder);
    const w = A.Work(holder);
    try {
      w.log(t('Reading the document'));
      const j = await LZ.chatJSON([{role:'system', content:'Answer the question using ONLY the document. Return ONLY JSON {"answer":"clear answer in the user\'s language (Markdown ok)","quotes":["EXACT verbatim sentences or phrases copied from the document that support the answer (1-4, each under 200 chars)"],"found":true|false}. If the document does not contain the answer, set found false and say so.'}, {role:'user', content: `DOCUMENT:\n"""\n${doc.slice(0, 48000)}\n"""\n\nQUESTION: ${q}`}], {tier: 'stark', level: Math.max(1, A.state.level), maxTokens: 2000, onStatus: x => w.log(x)});
      w.done(); w.root.remove();
      const ans = el('div', 'bubble md'); A.renderMarkdown(ans, j.answer || ''); holder.appendChild(ans);
      const quotes = (j.quotes || []).filter(x => x && x.length > 3);
      if (quotes.length){
        // highlight in the document
        let html = esc(doc.slice(0, 60000)); let first = true, hits = 0;
        quotes.forEach((qt, k) => {
          const needle = esc(qt.trim()); let i = html.indexOf(needle);
          if (i < 0){ const short = esc(qt.trim().slice(0, 60)); i = html.indexOf(short); if (i >= 0){ html = html.slice(0, i) + `<mark data-k="${k}">` + short + '</mark>' + html.slice(i + short.length); hits++; } }
          else { html = html.slice(0, i) + `<mark data-k="${k}">` + needle + '</mark>' + html.slice(i + needle.length); hits++; }
        });
        const d = $('#dqDoc'); d.hidden = false; d.innerHTML = html;
        const qs = el('div', 'dq-quotes'); quotes.forEach((qt, k) => { const b = el('button', 'dq-quote'); b.dir = 'auto'; b.textContent = '“' + qt + '”'; b.onclick = () => { const m = $(`mark[data-k="${k}"]`, d); if (m){ m.scrollIntoView({block:'center', behavior:'smooth'}); m.classList.remove('flash'); void m.offsetWidth; m.classList.add('flash'); } }; qs.appendChild(b); });
        holder.appendChild(qs);
        const m0 = $('mark', d); if (m0) m0.scrollIntoView({block:'center', behavior:'smooth'});
        if (!hits) holder.insertAdjacentHTML('beforeend', `<small class="muted">${t('Quotes could not be located verbatim in the text.')}</small>`);
      }
      chat.scrollTop = chat.scrollHeight;
    } catch(e){ fail(w, e, 'Could not answer — try again'); holder.remove(); }
    $('#dqGo').disabled = false;
  };
  $('#dqGo').onclick = ask; $('#dqQ').onkeydown = e => { if (e.key === 'Enter') ask(); };
}

/* ---------- 5. URL Summarizer (Stark) ---------- */
function labURL(body){
  body.innerHTML = `<div class="lab-grid"><p class="lab-desc">${t('Paste any article or page link — get a TL;DR, key points, notable quotes and reading time.')}</p>
  <div class="lab-row"><input class="lab-input" id="usIn" type="url" dir="ltr" placeholder="https://…"><select class="lab-select" id="usLen"><option value="short">${t('Short')}</option><option value="medium" selected>${t('Medium')}</option><option value="detailed">${t('Detailed')}</option></select><button class="btn-primary" id="usGo">🔗 ${t('Summarize')}</button></div>
  <div id="usWork"></div><div id="usOut"></div></div>`;
  $('#usGo').onclick = async () => {
    let u = $('#usIn').value.trim(); if (!u) return; if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    $('#usGo').disabled = true; $('#usOut').innerHTML = ''; $('#usWork').innerHTML = '';
    const w = A.Work($('#usWork'), {open: true});
    try {
      w.log(t('Reading') + ' ' + LZ.domainOf(u));
      const page = await LZ.readPage(u, 24000);
      if (!page || page.length < 200) throw Object.assign(new Error(t('Could not read that page (it may block readers or need a login).')), {userFacing: true});
      const words = page.split(/\s+/).length;
      w.log(t('Summarizing') + ` · ${Math.round(words / 100) / 10}k ${t('words')}`);
      const j = await LZ.chatJSON([{role:'system', content:`Summarize the web page. Length: ${$('#usLen').value}. Reply in ${A.LANG_NAME[A.settings().lang] || 'English'}. Return ONLY JSON {"title":"","tldr":"2-3 sentences","points":["key point", "..."],"quotes":["short notable verbatim quote", "..."],"topics":["tag","tag"],"sentiment":"one word"}`}, {role:'user', content: `URL: ${u}\n\n${page}`}], {tier: 'stark', maxTokens: 2200, onStatus: x => w.log(x)});
      w.done();
      const out = $('#usOut');
      out.innerHTML = `<div class="us-card"><div class="us-head"><img src="${LZ.favicon(u)}" alt="" width="20" height="20" onerror="this.remove()"><a href="${esc(u)}" target="_blank" rel="noopener">${esc(LZ.domainOf(u))}</a><span class="us-meta">⏱ ${Math.max(1, Math.round(words / 230))} ${t('min read')}${j.sentiment ? ' · ' + esc(j.sentiment) : ''}</span></div>
      <h3 dir="auto">${esc(j.title || '')}</h3><div class="us-tldr" dir="auto"><b>TL;DR</b> ${esc(j.tldr || '')}</div>
      <ul class="us-points">${(j.points || []).map((p, i) => `<li style="animation-delay:${i * 60}ms" dir="auto">${esc(p)}</li>`).join('')}</ul>
      ${(j.quotes || []).length ? `<div class="us-quotes">${j.quotes.slice(0, 4).map(q => `<blockquote dir="auto">${esc(q)}</blockquote>`).join('')}</div>` : ''}
      <div class="us-tags">${(j.topics || []).map(x => `<span>#${esc(x)}</span>`).join('')}</div>
      <div class="lab-row"><button class="btn-ghost" id="usCopy">⧉ ${t('Copy')}</button><button class="btn-ghost" id="usChat">💬 ${t('Continue in chat')}</button></div></div>`;
      const md = `# ${j.title || ''}\n${u}\n\n**TL;DR** ${j.tldr || ''}\n\n${(j.points || []).map(p => '- ' + p).join('\n')}`;
      $('#usCopy').onclick = () => A.copyText(md);
      $('#usChat').onclick = () => { A.addConversation('🔗 ' + (j.title || LZ.domainOf(u)).slice(0, 50), [{id: A.uid(), role:'assistant', content: md, ts: Date.now(), tier:'stark'}]); const c = A.state.convs[0]; A.selectConv(c.id); A.closeModal('labModal'); };
    } catch(e){ fail(w, e, 'Could not summarize that page'); }
    $('#usGo').disabled = false;
  };
  $('#usIn').onkeydown = e => { if (e.key === 'Enter') $('#usGo').click(); };
}

[{id:'math', icon:'🧮', name:'Math Solver', desc:'Step-by-step solutions, typeset math & graphs', both:true, isNew:true, fn: labMath},
 {id:'translate', icon:'🌐', name:'Translator', desc:'Side-by-side, tones, alternatives, 15 languages', both:true, isNew:true, fn: labTranslate},
 {id:'mindmap', icon:'🧠', name:'Mind Map', desc:'Any topic → interactive radial mind map', both:true, isNew:true, fn: labMindMap},
 {id:'docqa', icon:'📑', name:'Document Q&A', desc:'Ask a PDF — answers with highlighted quotes', isNew:true, fn: labDocQA},
 {id:'url', icon:'🔗', name:'URL Summarizer', desc:'Any link → TL;DR, key points & quotes', isNew:true, fn: labURL}
].forEach(A.registerLab);
window.LabsX = {compile};
})();
