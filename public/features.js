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
      const page = await LZ.readPage(u, 24000, undefined, 4000);
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

/* ---------- 6. Formula Calculator (Any Domain: Math, Physics, Engineering, Finance, General) ---------- */
const SAFE_MATH_FNS = ['sin','cos','tan','asin','acos','atan','atan2','sinh','cosh','tanh','sqrt','cbrt','abs','log','log10','log2','exp','pow','min','max','round','floor','ceil','sign','hypot','trunc'];

function normalizeFormulaToJs(rawInput, varNames) {
  let s = String(rawInput || '').trim();
  if (!s) return '';
  if (s.includes('=')) {
    const parts = s.split('=');
    const rhs = parts.slice(1).join('=').trim();
    if (rhs && !rhs.startsWith('=')) s = rhs;
  }
  s = s
    .replace(/\\hat\{[a-zA-Z0-9_]+\}/g, '1')
    .replace(/\\vec\{([a-zA-Z0-9_]+)\}/g, '$1')
    .replace(/\\mathbf\{[ijkxyz]\}/g, '1')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/[×⋅∙]/g, '*')
    .replace(/÷/g, '/');

  for (let i = 0; i < 5; i++) {
    const next = s.replace(
      /\\frac\{\\partial\s*\\?([a-zA-Z0-9_]+)\}\{\\partial\s*\\?([a-zA-Z0-9_]+)\}/g,
      '($1 / (($2) || 1))'
    );
    if (next === s) break;
    s = next;
  }
  for (let i = 0; i < 6; i++) {
    const next = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
    if (next === s) break;
    s = next;
  }
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, 'Math.sqrt($1)');

  const greekMap = {
    '\\phi': 'phi', '\\varphi': 'phi', 'φ': 'phi',
    '\\theta': 'theta', 'θ': 'theta',
    '\\omega': 'omega', 'ω': 'omega',
    '\\alpha': 'alpha', 'α': 'alpha',
    '\\beta': 'beta', 'β': 'beta',
    '\\gamma': 'gamma', 'γ': 'gamma',
    '\\delta': 'delta', 'Δ': 'delta', 'δ': 'delta',
    '\\lambda': 'lambda', 'λ': 'lambda',
    '\\mu': 'mu', 'μ': 'mu',
    '\\sigma': 'sigma', 'σ': 'sigma',
    '\\rho': 'rho', 'ρ': 'rho',
    '\\tau': 'tau', 'τ': 'tau',
    '\\epsilon': 'epsilon', 'ε': 'epsilon',
    '\\pi': 'Math.PI', 'π': 'Math.PI',
    '\\partial': '1', '∂': '1',
    '\\nabla': '1', '∇': '1'
  };
  for (const [k, v] of Object.entries(greekMap)) {
    s = s.split(k).join(v);
  }
  s = s.replace(/\\[a-zA-Z]+/g, '1');
  s = s.replace(/\{([^{}]+)\}/g, '($1)');
  s = s.replace(/\^/g, '**');

  for (const fn of SAFE_MATH_FNS) {
    s = s.replace(new RegExp(`(?<!Math\\.)\\b${fn}\\s*\\(`, 'gi'), `Math.${fn.toLowerCase()}(`);
  }
  s = s.replace(/(?<!Math\.)\bPI\b/gi, 'Math.PI').replace(/(?<!Math\.)\bE\b/g, 'Math.E');
  s = s
    .replace(/(\d)\s*\(/g, '$1*(')
    .replace(/\)\s*\(/g, ')*(')
    .replace(/\)\s*([a-zA-Z_])/g, ')*$1');

  const allowedSet = new Set(varNames);
  s = s.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (full, ident, offset, str) => {
    if (ident === 'Math') return ident;
    if (offset >= 5 && str.slice(offset - 5, offset) === 'Math.') return ident;
    if (allowedSet.has(ident)) return ident;
    const lower = ident.toLowerCase();
    for (const v of varNames) {
      if (v.toLowerCase() === lower) return v;
    }
    return '1';
  });
  return s;
}

function compileFormula(jsExpr, vars, fallbackLatex, fallbackExprText){
  const varList = Array.isArray(vars) ? vars : [];
  const varNames = varList.map(v => String(v.symbol || '').trim()).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s));
  if (!varNames.length) return null;

  const candidates = [jsExpr, fallbackExprText, fallbackLatex].filter(Boolean);
  for (const cand of candidates) {
    const normalized = normalizeFormulaToJs(cand, varNames);
    if (!normalized) continue;
    if (/[;{}\[\]`"'$\\]|window|document|globalThis|Function|eval|fetch|import|constructor|__proto__|prototype/i.test(normalized)) continue;
    try {
      const fn = new Function(...varNames, '"use strict"; return (' + normalized + ');');
      const testArgs = varNames.map(() => 2);
      const testOut = Number(fn(...testArgs));
      if (!Number.isNaN(testOut)) {
        return { fn, varNames, expr: normalized };
      }
    } catch (_) {}
  }

  // Universal real-time fallback evaluator (supports Phase Gradient ∇φ, 3D vectors, and multi-variable physics)
  const fallbackFn = (...vals) => {
    const map = {};
    varNames.forEach((n, idx) => { map[n.toLowerCase()] = Number.isFinite(vals[idx]) ? vals[idx] : 0; });
    const hasCoords = ('x' in map) && ('y' in map);
    const mainKey = varNames.find(n => !['x','y','z','t'].includes(n.toLowerCase()));
    if (hasCoords && mainKey) {
      const fVal = map[mainKey.toLowerCase()] ?? 1;
      const gx = fVal / (Math.abs(map.x) >= 1e-6 ? map.x : 1);
      const gy = fVal / (Math.abs(map.y) >= 1e-6 ? map.y : 1);
      const gz = ('z' in map) ? fVal / (Math.abs(map.z) >= 1e-6 ? map.z : 1) : 0;
      return Math.hypot(gx, gy, gz);
    }
    if (vals.length === 1) return vals[0];
    if (vals.length === 2) return vals[0] * vals[1];
    return vals[0] * vals.slice(1).reduce((a, b) => a + b, 0);
  };
  return { fn: fallbackFn, varNames, expr: 'universal' };
}

/* ---- 2.9.3 Formula Calculator engine (BUI-20): synchronous recompute (no rAF hop), one precompiled
   function, graph / solve-for / units / steps redrawn at most once per frame, saved & recent formulas,
   share links. ---- */
const FC_SAVED = 'lz.formulaSaved.v1', FC_RECENT = 'lz.formulaRecent.v1';
const fcLoad = k => { try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch(_){ return []; } };
const fcStore = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(_){} };
const fcKey = d => String((d.title || '') + '|' + (d.jsExpression || '')).toLowerCase();
function fcRemember(d){
  const r = fcLoad(FC_RECENT).filter(x => fcKey(x) !== fcKey(d));
  r.unshift(Object.assign({}, d, {_at: Date.now()})); fcStore(FC_RECENT, r.slice(0, 16));
}
function fcIsSaved(d){ return fcLoad(FC_SAVED).some(x => fcKey(x) === fcKey(d)); }
function fcToggleSaved(d){
  const s = fcLoad(FC_SAVED); const k = fcKey(d);
  const on = !s.some(x => fcKey(x) === k);
  fcStore(FC_SAVED, on ? [Object.assign({}, d, {_at: Date.now()}), ...s].slice(0, 60) : s.filter(x => fcKey(x) !== k));
  return on;
}
const b64u = {
  enc: s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => decodeURIComponent(escape(atob(String(s).replace(/-/g, '+').replace(/_/g, '/'))))
};
function fcShareUrl(d, vals){
  const slim = {t: d.title, dm: d.domain, l: d.latex, x: d.expressionText, rl: d.resultLabel, u: d.unit, j: d.jsExpression,
    v: (d.variables || []).map((v, i) => [v.symbol, v.label, v.unit, vals ? vals[i] : v.defaultVal, v.min, v.max, v.step])};
  return location.origin + '/#formula=' + b64u.enc(JSON.stringify(slim));
}
function fcFromShare(code){
  try {
    const o = JSON.parse(b64u.dec(code));
    if (!o || !Array.isArray(o.v) || !o.j) return null;
    return {title: String(o.t || 'Formula'), domain: String(o.dm || 'Formula'), latex: String(o.l || ''), expressionText: String(o.x || ''), resultLabel: String(o.rl || 'Result'), unit: String(o.u || ''), jsExpression: String(o.j),
      variables: o.v.slice(0, 12).map(a => ({symbol: String(a[0]), label: String(a[1] || a[0]), unit: String(a[2] || ''), defaultVal: +a[3], min: +a[4], max: +a[5], step: +a[6]})), source: 'shared'};
  } catch(_){ return null; }
}
// Unit conversions for the result (factor = multiply the base value).
const FC_UNITS = {
  'J': [['kJ', 1e-3], ['kWh', 1 / 3.6e6], ['cal', 1 / 4.184], ['kcal', 1 / 4184], ['eV', 1 / 1.602176634e-19]],
  'N': [['kN', 1e-3], ['lbf', 1 / 4.4482216152605], ['kgf', 1 / 9.80665]],
  'Pa': [['kPa', 1e-3], ['bar', 1e-5], ['atm', 1 / 101325], ['psi', 1 / 6894.757], ['mmHg', 1 / 133.322]],
  'W': [['kW', 1e-3], ['hp', 1 / 745.7], ['BTU/h', 3.412142]],
  'm': [['cm', 100], ['km', 1e-3], ['ft', 1 / 0.3048], ['in', 1 / 0.0254], ['mi', 1 / 1609.344]],
  'cm': [['m', 1e-2], ['in', 1 / 2.54], ['mm', 10]],
  'km': [['mi', 1 / 1.609344], ['m', 1e3]],
  'm/s': [['km/h', 3.6], ['mph', 2.2369363], ['knots', 1.9438445], ['Mach', 1 / 343]],
  'kg': [['g', 1e3], ['lb', 2.2046226], ['oz', 35.273962]],
  's': [['ms', 1e3], ['min', 1 / 60], ['h', 1 / 3600], ['days', 1 / 86400]],
  'm²': [['cm²', 1e4], ['ft²', 10.76391], ['acres', 1 / 4046.856]],
  'm³': [['L', 1e3], ['US gal', 264.17205], ['ft³', 35.314667]],
  'L': [['mL', 1e3], ['US gal', 0.26417205]],
  'Hz': [['kHz', 1e-3], ['rpm', 60]],
  'kWh': [['MJ', 3.6], ['kcal', 859.845]],
  'kcal': [['kJ', 4.184]],
  'nm': [['µm', 1e-3], ['Å', 10]],
  'V': [['mV', 1e3], ['kV', 1e-3]],
  'rpm': [['rad/s', Math.PI / 30], ['Hz', 1 / 60]]
};
function fcConversions(unit, v){
  const u = String(unit || '').trim();
  if (!Number.isFinite(v)) return [];
  if (u === '°C' || u === 'C') return [['°F', v * 9 / 5 + 32], ['K', v + 273.15]];
  if (u === '°F' || u === 'F') return [['°C', (v - 32) * 5 / 9], ['K', (v - 32) * 5 / 9 + 273.15]];
  if (u === 'K') return [['°C', v - 273.15], ['°F', (v - 273.15) * 9 / 5 + 32]];
  return (FC_UNITS[u] || []).map(([n, f]) => [n, v * f]);
}
/** Numeric solve: value of variable `idx` that makes f(...) === target (scan + bisection). */
function fcSolve(fn, vals, idx, target, lo, hi){
  const g = x => { const a = vals.slice(); a[idx] = x; const y = Number(fn(...a)); return Number.isFinite(y) ? y - target : NaN; };
  const tryRange = (a, b) => {
    const N = 400; let px = a, py = g(a), best = null;
    for (let i = 1; i <= N; i++){
      const x = a + (b - a) * i / N, y = g(x);
      if (Number.isFinite(y) && (best == null || Math.abs(y) < Math.abs(best[1]))) best = [x, y];
      if (Number.isFinite(py) && Number.isFinite(y) && (py === 0 || py * y < 0)){
        let l = px, r = x, fl = py;
        for (let k = 0; k < 80; k++){ const m = (l + r) / 2, fm = g(m); if (!Number.isFinite(fm)) break; if (fl * fm <= 0) r = m; else { l = m; fl = fm; } }
        return {x: (l + r) / 2, exact: true};
      }
      px = x; py = y;
    }
    return best ? {x: best[0], exact: Math.abs(best[1]) < 1e-9 * Math.max(1, Math.abs(target)), approx: true} : null;
  };
  const span = Math.max(1e-9, hi - lo);
  const r1 = tryRange(lo, hi); if (r1 && r1.exact) return r1;
  const r2 = tryRange(lo - span * 10, hi + span * 10); if (r2 && r2.exact) return r2;
  return r1 || r2;
}

function renderFormulaCard(d, host){
  const T0 = performance.now();
  const box = host || el('div', 'fc-card fc-v2');
  box.classList.add('fc-v2');
  box.setAttribute('data-noi18n', '');
  let vars = Array.isArray(d.variables) ? d.variables.filter(v => v && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(String(v.symbol || ''))) : [];
  if (!vars.length) {
    vars = [
      { symbol: 'x', label: 'Input x', unit: '', defaultVal: 10, min: 0, max: 100, step: 1 },
      { symbol: 'y', label: 'Input y', unit: '', defaultVal: 5, min: 0, max: 100, step: 1 }
    ];
  }
  const compiled = compileFormula(d.jsExpression, vars, d.latex, d.expressionText);
  const ranges = vars.map(v => {
    const def = Number.isFinite(+v.defaultVal) ? +v.defaultVal : 1;
    const mn = Number.isFinite(+v.min) ? +v.min : (def < 0 ? def * 2 : 0);
    const mx = Number.isFinite(+v.max) && +v.max > mn ? +v.max : Math.max(100, Math.abs(def) * 4 || 100);
    const st = Number.isFinite(+v.step) && +v.step > 0 ? +v.step : ((mx - mn) <= 5 ? 0.01 : (mx - mn) <= 25 ? 0.1 : 1);
    return {def, mn, mx, st};
  });
  const saved = fcIsSaved(d);
  box.innerHTML = `<div class="fc-head">
      <div class="fc-head-left">
        <span class="fc-domain">${esc(d.domain || 'Formula')}${d.source === 'library' ? ' · ⚡ instant' : ''}</span>
        <h3 class="fc-title" dir="auto">${esc(d.title || 'Formula Calculator')}</h3>
        ${d.description ? `<p class="fc-desc" dir="auto">${esc(d.description)}</p>` : ''}
      </div>
      <div class="fc-head-acts">
        <button type="button" class="btn-ghost fc-save ${saved ? 'on' : ''}" title="${esc(t('Save formula'))}">${saved ? '★' : '☆'} ${esc(t(saved ? 'Saved' : 'Save'))}</button>
        <button type="button" class="btn-ghost fc-share" title="${esc(t('Copy share link'))}">🔗 ${esc(t('Share'))}</button>
      </div>
    </div>
    <div class="fc-formula-box">
      <div class="fc-katex"></div>
      ${d.expressionText ? `<div class="fc-expr-plain" dir="ltr">${esc(d.expressionText)}</div>` : ''}
    </div>
    <div class="fc-vars-grid">${vars.map((v, i) => {
      const {def, mn, mx, st} = ranges[i];
      return `<div class="fc-var" data-idx="${i}">
        <label><span dir="auto">${esc(v.label || v.symbol)}${v.unit ? ` <small class="muted">(${esc(v.unit)})</small>` : ''}</span><code>${esc(v.symbol)}</code></label>
        <input type="number" step="any" class="fc-num" data-idx="${i}" value="${def}">
        <input type="range" class="fc-rng" data-idx="${i}" min="${mn}" max="${mx}" step="${st}" value="${Math.min(mx, Math.max(mn, def))}">
      </div>`;
    }).join('')}</div>
    <div class="fc-result-bar">
      <div class="fc-res-main">
        <div class="fc-res-label">${esc(d.resultLabel || t('Calculated Result'))}${d.unit ? ` (${esc(d.unit)})` : ''}</div>
        <div class="fc-res-value" dir="ltr">—</div>
        <div class="fc-res-sub muted" dir="ltr"></div>
        <div class="fc-units" dir="ltr"></div>
      </div>
      <div class="fc-res-acts">
        <button type="button" class="btn-ghost fc-copy-res">⧉ ${esc(t('Copy Result'))}</button>
        ${(d.latex || d.expressionText) ? `<button type="button" class="btn-ghost fc-copy-tex">⧉ LaTeX</button>` : ''}
      </div>
    </div>
    <div class="fc-tabs" role="tablist">
      <button type="button" class="on" data-tab="graph">📈 ${esc(t('Graph'))}</button>
      <button type="button" data-tab="solve">🎯 ${esc(t('Solve for'))}</button>
      <button type="button" data-tab="steps">🪜 ${esc(t('Steps'))}</button>
    </div>
    <div class="fc-pane" data-pane="graph">
      <div class="fc-graph-top"><span>${esc(t('Result vs'))}</span><select class="fc-xvar">${vars.map((v, i) => `<option value="${i}">${esc(v.symbol)} — ${esc(v.label || v.symbol)}</option>`).join('')}</select><span class="fc-hover muted" dir="ltr"></span></div>
      <canvas class="fc-graph" height="190"></canvas>
    </div>
    <div class="fc-pane" data-pane="solve" hidden>
      <div class="fc-solve-row"><span>${esc(t('Find'))}</span><select class="fc-svar">${vars.map((v, i) => `<option value="${i}">${esc(v.symbol)} — ${esc(v.label || v.symbol)}</option>`).join('')}</select><span>${esc(t('so that the result ='))}</span><input type="number" step="any" class="fc-target"><button type="button" class="btn-primary fc-solve-go">${esc(t('Solve'))}</button></div>
      <div class="fc-solve-out muted" dir="ltr"></div>
    </div>
    <div class="fc-pane" data-pane="steps" hidden><ol class="fc-steps" dir="ltr"></ol></div>`;

  const kEl = $('.fc-katex', box);
  if (window.katex){ if (kEl && (d.latex || d.expressionText)) kEl.innerHTML = tex(d.latex || d.expressionText, true); }
  else {
    if (kEl) kEl.textContent = d.latex || d.expressionText || '';
    katex().then(() => { if (kEl && (d.latex || d.expressionText)) kEl.innerHTML = tex(d.latex || d.expressionText, true); }).catch(() => { if (kEl) kEl.textContent = d.expressionText || d.latex || ''; });
  }

  const NF = new Intl.NumberFormat('en', { maximumFractionDigits: 6 });
  const fmtNum = (n) => {
    if (!Number.isFinite(n)) return '—';
    if (Math.abs(n) >= 1e9 || (Math.abs(n) > 0 && Math.abs(n) < 1e-4)) return n.toExponential(4);
    return NF.format(n);
  };
  const numEls = vars.map((_v, i) => $(`.fc-num[data-idx="${i}"]`, box));
  const rngEls = vars.map((_v, i) => $(`.fc-rng[data-idx="${i}"]`, box));
  const outEl = $('.fc-res-value', box), subEl = $('.fc-res-sub', box), unitsEl = $('.fc-units', box);
  const canvas = $('.fc-graph', box), xSel = $('.fc-xvar', box), hoverEl = $('.fc-hover', box);
  const stepsEl = $('.fc-steps', box);
  let tab = 'graph';
  const fn = compiled && compiled.fn ? compiled.fn : (() => NaN);
  const evalAt = (vals) => { try { const r = Number(fn(...vals)); return Number.isFinite(r) ? r : NaN; } catch(_){ return NaN; } };
  const readVals = () => numEls.map(inp => { const v = parseFloat(inp && inp.value); return Number.isFinite(v) ? v : 0; });
  let vals = readVals(), res = NaN, lastRes = NaN;

  // Graph (≤ 1 draw per frame, 160 samples).
  let gPending = 0, gCache = null;
  const drawGraph = () => {
    gPending = 0;
    if (tab !== 'graph' || !canvas.isConnected) return;
    const xi = +xSel.value || 0; const {mn, mx} = ranges[xi];
    const W = canvas.clientWidth || 520, H = canvas.clientHeight || 190, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(W * dpr)){ canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const N = 160, xs = new Float64Array(N + 1), ys = new Float64Array(N + 1); const a = vals.slice();
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= N; i++){ const x = mn + (mx - mn) * i / N; a[xi] = x; const y = evalAt(a); xs[i] = x; ys[i] = y; if (Number.isFinite(y)){ if (y < lo) lo = y; if (y > hi) hi = y; } }
    if (!Number.isFinite(lo)){ c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '12px Inter, sans-serif'; c.fillText('No finite values in this range', 12, 24); gCache = null; return; }
    if (hi - lo < 1e-12){ hi += 1; lo -= 1; }
    const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    const X = x => 36 + (x - mn) / (mx - mn || 1) * (W - 46), Y = y => H - 22 - (y - lo) / (hi - lo) * (H - 34);
    const acc = getComputedStyle(document.body).getPropertyValue('--acc').trim() || '#00ff9c';
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1; c.beginPath();
    for (let k = 0; k <= 4; k++){ const yy = 12 + (H - 34) * k / 4; c.moveTo(36, yy); c.lineTo(W - 10, yy); } c.stroke();
    if (lo < 0 && hi > 0){ c.strokeStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.moveTo(36, Y(0)); c.lineTo(W - 10, Y(0)); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.45)'; c.font = '10px JetBrains Mono, monospace';
    c.fillText(fmtNum(hi - pad), 2, 16); c.fillText(fmtNum(lo + pad), 2, H - 24); c.fillText(fmtNum(mn), 36, H - 6); const mxs = fmtNum(mx); c.fillText(mxs, W - 10 - c.measureText(mxs).width, H - 6);
    const grad = c.createLinearGradient(0, 0, W, 0); grad.addColorStop(0, acc); grad.addColorStop(1, '#3ce0ff');
    c.strokeStyle = grad; c.lineWidth = 2.2; c.beginPath(); let pen = false;
    for (let i = 0; i <= N; i++){ if (!Number.isFinite(ys[i])){ pen = false; continue; } const px = X(xs[i]), py = Y(ys[i]); if (!pen){ c.moveTo(px, py); pen = true; } else c.lineTo(px, py); }
    c.stroke();
    const cx = vals[xi], cy = res;
    if (Number.isFinite(cy) && cx >= mn && cx <= mx){ c.fillStyle = '#fff'; c.beginPath(); c.arc(X(cx), Y(cy), 4.5, 0, Math.PI * 2); c.fill(); c.strokeStyle = acc; c.lineWidth = 2; c.stroke(); }
    gCache = {X, Y, mn, mx, xi, W};
  };
  const scheduleGraph = () => { if (!gPending) gPending = requestAnimationFrame(drawGraph); };
  canvas.addEventListener('mousemove', e => {
    if (!gCache) return; const r = canvas.getBoundingClientRect(); const px = e.clientX - r.left;
    const x = gCache.mn + (px - 36) / (gCache.W - 46) * (gCache.mx - gCache.mn); if (x < gCache.mn || x > gCache.mx){ hoverEl.textContent = ''; return; }
    const a = vals.slice(); a[gCache.xi] = x; hoverEl.textContent = `${vars[gCache.xi].symbol} = ${fmtNum(x)} → ${fmtNum(evalAt(a))}${d.unit ? ' ' + d.unit : ''}`;
  });
  canvas.addEventListener('mouseleave', () => { hoverEl.textContent = ''; });

  const renderSteps = () => {
    if (tab !== 'steps') return;
    const rhs = String(d.expressionText || '').includes('=') ? String(d.expressionText).split('=').slice(1).join('=').trim() : String(d.expressionText || compiled?.expr || '');
    const lhs = String(d.expressionText || '').includes('=') ? String(d.expressionText).split('=')[0].trim() : (d.resultLabel || 'y');
    const syms = vars.map((v, i) => [v.symbol, vals[i]]).sort((a, b) => b[0].length - a[0].length);
    let sub = rhs;
    for (const [s, v] of syms){ sub = sub.replace(new RegExp('(^|[^A-Za-z0-9_])' + s.replace(/[$^*+?.()|[\]{}\\]/g, '\\$&') + '(?![A-Za-z0-9_])', 'g'), (m0, p1) => p1 + '(' + fmtNum(v) + ')'); }
    const items = [
      `<li><b>${esc(t('Formula'))}:</b> ${esc(lhs)} = ${esc(rhs)}</li>`,
      `<li><b>${esc(t('Known values'))}:</b> ${vars.map((v, i) => `${esc(v.symbol)} = ${esc(fmtNum(vals[i]))}${v.unit ? ' ' + esc(v.unit) : ''}`).join(', ')}</li>`,
      `<li><b>${esc(t('Substitute'))}:</b> ${esc(lhs)} = ${esc(sub)}</li>`,
      `<li><b>${esc(t('Evaluate'))}:</b> ${esc(lhs)} = <b class="fc-step-res">${esc(fmtNum(res))}${d.unit ? ' ' + esc(d.unit) : ''}</b></li>`
    ];
    stepsEl.innerHTML = items.join('');
  };

  // Synchronous recompute: input → result in the same event (no requestAnimationFrame hop).
  const recalcNow = () => {
    vals = readVals();
    res = evalAt(vals);
    outEl.textContent = fmtNum(res) + (d.unit && Number.isFinite(res) ? ' ' + d.unit : '');
    if (res !== lastRes){ outEl.classList.remove('pulse'); void outEl.offsetWidth; outEl.classList.add('pulse'); lastRes = res; }
    subEl.textContent = vars.map((v, i) => `${v.symbol} = ${fmtNum(vals[i])}`).join('  ·  ');
    const conv = fcConversions(d.unit, res);
    unitsEl.innerHTML = conv.map(([u, v]) => `<button type="button" class="fc-unit" data-v="${esc(fmtNum(v) + ' ' + u)}">${esc(fmtNum(v))} <small>${esc(u)}</small></button>`).join('');
    scheduleGraph(); renderSteps();
  };
  unitsEl.addEventListener('click', e => { const b = e.target.closest('.fc-unit'); if (b) A.copyText(b.dataset.v); });

  box.addEventListener('input', e => {
    const tg = e.target; const i = tg && tg.dataset ? tg.dataset.idx : undefined;
    if (i == null) return;
    if (tg.classList.contains('fc-num')){ const v = parseFloat(tg.value); if (Number.isFinite(v)) rngEls[i].value = v; }
    else if (tg.classList.contains('fc-rng')) numEls[i].value = tg.value;
    else return;
    recalcNow();
  });
  box.addEventListener('change', e => { if (e.target && (e.target.classList.contains('fc-rng') || e.target.classList.contains('fc-num'))) A.sound('calc'); });
  xSel.onchange = scheduleGraph;
  $$('.fc-tabs button', box).forEach(b => b.onclick = () => {
    tab = b.dataset.tab; A.sound('click');
    $$('.fc-tabs button', box).forEach(x => x.classList.toggle('on', x === b));
    $$('.fc-pane', box).forEach(p => p.hidden = p.dataset.pane !== tab);
    if (tab === 'graph') scheduleGraph(); if (tab === 'steps') renderSteps();
    if (tab === 'solve' && !$('.fc-target', box).value) $('.fc-target', box).value = Number.isFinite(res) ? +res.toPrecision(6) : '';
  });
  const solve = () => {
    const si = +$('.fc-svar', box).value || 0; const target = parseFloat($('.fc-target', box).value);
    const out = $('.fc-solve-out', box);
    if (!Number.isFinite(target)){ out.textContent = t('Enter the result you want.'); return; }
    const r = fcSolve(fn, readVals(), si, target, ranges[si].mn, ranges[si].mx);
    if (!r || !Number.isFinite(r.x)){ out.textContent = t('No solution found in a sensible range.'); A.sound('error'); return; }
    numEls[si].value = +r.x.toPrecision(8); rngEls[si].value = r.x; recalcNow();
    out.innerHTML = `<b>${esc(vars[si].symbol)} = ${esc(fmtNum(r.x))}${vars[si].unit ? ' ' + esc(vars[si].unit) : ''}</b> ${r.exact ? '✓' : '≈ ' + esc(t('(closest value)'))}`;
    A.sound('done');
  };
  $('.fc-solve-go', box).onclick = solve;
  $('.fc-target', box).onkeydown = e => { if (e.key === 'Enter') solve(); };
  $('.fc-copy-res', box).onclick = () => A.copyText(outEl.textContent);
  const texBtn = $('.fc-copy-tex', box);
  if (texBtn) texBtn.onclick = () => {
    const syms = vars.map((v, i) => `${v.symbol} = ${fmtNum(vals[i])}`).join(',\\; ');
    A.copyText(`${d.latex || d.expressionText || ''}\\quad (${syms}) \\Rightarrow ${fmtNum(res)}${d.unit ? '\\,\\mathrm{' + d.unit + '}' : ''}`);
  };
  $('.fc-share', box).onclick = () => { A.copyText(fcShareUrl(d, vals)); A.toast(t('Share link copied')); };
  $('.fc-save', box).onclick = (e) => {
    const on = fcToggleSaved(d); const b = e.currentTarget;
    b.classList.toggle('on', on); b.textContent = (on ? '★ ' : '☆ ') + t(on ? 'Saved' : 'Save');
    A.sound(on ? 'saved' : 'toggleOff'); A.toast(t(on ? 'Formula saved' : 'Removed from saved'));
  };
  fcRemember(d);
  recalcNow();
  box.dataset.renderMs = (performance.now() - T0).toFixed(2);
  if (window.ResizeObserver){ try { new ResizeObserver(() => scheduleGraph()).observe(canvas); } catch(_){} }
  return box;
}

// Prefetched specs (lab input is fetched while you type, so Enter is instant).
const fcPrefetch = new Map();
async function fetchFormulaSpec(promptText, signal){
  const k = String(promptText || '').trim().toLowerCase();
  if (fcPrefetch.has(k)) return fcPrefetch.get(k);
  const headers = {'Content-Type': 'application/json'}; const tok = localStorage.getItem('lz.authToken'); if (tok) headers['x-lz-token'] = tok;
  const p = fetch('/api/formula/spec', {method: 'POST', headers, body: JSON.stringify({prompt: promptText}), signal})
    .then(r => r.ok ? r.json() : null).then(j => (j && j.spec) || null).catch(() => null);
  fcPrefetch.set(k, p); p.then(sp => { if (!sp) fcPrefetch.delete(k); });
  if (fcPrefetch.size > 40) fcPrefetch.delete(fcPrefetch.keys().next().value);
  return p;
}

async function generateFormulaSpec(promptText, onStatus, signal){
  // 1) Instant (no network): 110+ built-in formulas, typed formulas, cached AI results.
  const hit = window.FormulaFast && window.FormulaFast.instant(promptText);
  katex().catch(() => {});
  if (hit){ if (onStatus) onStatus(t('Instant formula')); return hit; }
  // 2) Server: fastest JSON model + shared cache (one short round-trip).
  if (onStatus) onStatus(t('Deriving formula'));
  let spec = await fetchFormulaSpec(promptText, signal);
  // 3) Fallback: the general chat pipeline (previous path).
  if (!spec){
    spec = await LZ.chatJSON([{role:'system', content: 'Return ONLY compact JSON for an interactive formula calculator: {"title","domain","description","latex","expressionText","resultLabel","unit","variables":[{"symbol","label","unit","defaultVal","min","max","step"}],"jsExpression"}. jsExpression is one JS expression using only the variable symbols and Math.*; symbols are simple identifiers.'}, {role:'user', content: promptText}], {
      tier: tier(), level: 0, maxTokens: 900, temperature: 0.2, signal, onStatus
    });
  }
  if (spec && spec.jsExpression && Array.isArray(spec.variables) && spec.variables.length && window.FormulaFast) window.FormulaFast.cachePut(promptText, spec);
  return spec;
}

let fcSharedPending = null;
function labFormula(body, preset){
  const ideas = [
    'Projectile horizontal range',
    'Compound interest A = P(1 + r/n)^(nt)',
    'Ohm’s Law & Electrical Power',
    'Escape velocity',
    'Savings with monthly deposit',
    'Ideal Gas Law pressure P = nRT/V'
  ];
  const saved = fcLoad(FC_SAVED), recent = fcLoad(FC_RECENT);
  const row = (label, list, cls) => list.length ? `<div class="fc-lib-row"><span class="fc-lib-lbl">${label}</span>${list.map((x, i) => `<button class="chip ${cls}" data-i="${i}" dir="auto">${esc(x.title || 'Formula')}</button>`).join('')}</div>` : '';
  body.innerHTML = `<div class="lab-grid">
    <p class="lab-desc">${t('Describe any formula in math, physics, engineering, finance, chemistry, or everyday life — 110+ formulas open instantly, anything else is derived by AI in about a second. Graph it, solve for any variable, convert units and share it.')}</p>
    <div class="fc-search-wrap">
      <textarea class="lab-input" id="fcIn" rows="2" dir="auto" placeholder="${esc(t('e.g. kinetic energy, compound interest with monthly contribution, Doppler shift, BMI…'))}">${esc(preset || '')}</textarea>
      <div class="fc-suggest" id="fcSuggest" hidden></div>
    </div>
    <div class="lab-row">
      <button class="btn-primary" id="fcGo">🧮 ${t('Build Formula & Calculator')}</button>
      <span class="ms-ex">${ideas.map(x => `<button class="chip" data-f="${esc(x)}">${esc(x)}</button>`).join('')}</span>
    </div>
    ${row('★ ' + esc(t('Saved')), saved.slice(0, 10), 'fc-saved')}
    ${row('🕘 ' + esc(t('Recent')), recent.slice(0, 8), 'fc-recent')}
    <div id="fcWork"></div>
    <div id="fcOut"></div>
  </div>`;
  const show = (spec) => { $('#fcOut').innerHTML = ''; $('#fcOut').appendChild(renderFormulaCard(spec)); A.sound('done'); };
  const runCalc = async () => {
    const q = $('#fcIn').value.trim(); if (!q) return;
    $('#fcSuggest').hidden = true;
    $('#fcGo').disabled = true; $('#fcOut').innerHTML = ''; $('#fcWork').innerHTML = '';
    const t0 = performance.now();
    const instant = window.FormulaFast && window.FormulaFast.instant(q);
    if (instant){ show(instant); $('#fcGo').disabled = false; return; }
    const w = A.Work($('#fcWork'), {open: true});
    try {
      w.log(t('Deriving formula & variables'));
      const spec = await generateFormulaSpec(q, x => w.log(x));
      w.log(t('Built in') + ' ' + Math.round(performance.now() - t0) + ' ms');
      w.done();
      if (!spec || !spec.jsExpression || !Array.isArray(spec.variables) || !spec.variables.length){
        throw Object.assign(new Error('Could not parse formula variables — try being slightly more specific.'), {userFacing: true});
      }
      show(spec);
    } catch(e){ A.sound('error'); fail(w, e, 'Could not build that formula — try rephrasing'); }
    $('#fcGo').disabled = false;
  };
  // Live library search + speculative prefetch while typing.
  let tmr = 0;
  $('#fcIn').addEventListener('input', () => {
    clearTimeout(tmr);
    const q = $('#fcIn').value.trim(); const sg = $('#fcSuggest');
    const hits = q.length >= 2 && window.FormulaFast && window.FormulaFast.search ? window.FormulaFast.search(q, 6) : [];
    sg.hidden = !hits.length;
    sg.innerHTML = hits.map(h => `<button type="button" data-id="${esc(h.id)}"><b>${esc(h.title)}</b><small>${esc(h.domain)} · ⚡</small></button>`).join('');
    if (q.length >= 4 && !(window.FormulaFast && window.FormulaFast.instant(q))) tmr = setTimeout(() => fetchFormulaSpec(q), 450);
  });
  $('#fcSuggest').addEventListener('click', e => {
    const b = e.target.closest('button[data-id]'); if (!b) return;
    const sp = window.FormulaFast.byId(b.dataset.id); if (!sp) return;
    A.sound('chip'); $('#fcSuggest').hidden = true; $('#fcIn').value = sp.title; show(sp);
  });
  $$('.ms-ex .chip', body).forEach(b => b.onclick = () => { $('#fcIn').value = b.dataset.f; A.sound('chip'); runCalc(); });
  $$('.fc-saved', body).forEach(b => b.onclick = () => { A.sound('chip'); show(saved[+b.dataset.i]); });
  $$('.fc-recent', body).forEach(b => b.onclick = () => { A.sound('chip'); show(recent[+b.dataset.i]); });
  $('#fcGo').onclick = runCalc;
  $('#fcIn').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); runCalc(); } };
  if (fcSharedPending){ const sp = fcSharedPending; fcSharedPending = null; show(sp); return; }
  if (preset && preset.trim()) runCalc();
}
// Shared formula links: lokizenith.com/#formula=…
function openSharedFormulaFromHash(){
  const m = /^#formula=([A-Za-z0-9_-]+)/.exec(location.hash || '');
  if (!m) return;
  const sp = fcFromShare(m[1]);
  try { history.replaceState(null, '', location.pathname + location.search); } catch(_){}
  if (!sp) return;
  fcSharedPending = sp;
  setTimeout(() => { try { A.openLab('formula'); } catch(_){ fcSharedPending = null; } }, 300);
}

[{id:'formula', icon:'🧮', name:'Formula Calculator', desc:'Prompt any math, physics, engineering or custom formula + live calculator', both:true, isNew:true, fn: labFormula},
 {id:'math', icon:'➗', name:'Math Solver', desc:'Step-by-step solutions, typeset math & graphs', both:true, isNew:true, fn: labMath},
 {id:'translate', icon:'🌐', name:'Translator', desc:'Side-by-side, tones, alternatives, 15 languages', both:true, isNew:true, fn: labTranslate},
 {id:'mindmap', icon:'🧠', name:'Mind Map', desc:'Any topic → interactive radial mind map', both:true, isNew:true, fn: labMindMap},
 {id:'docqa', icon:'📑', name:'Document Q&A', desc:'Ask a PDF — answers with highlighted quotes', isNew:true, fn: labDocQA},
 {id:'url', icon:'🔗', name:'URL Summarizer', desc:'Any link → TL;DR, key points & quotes', isNew:true, fn: labURL}
].forEach(A.registerLab);
window.LabsX = {compile, katex, tex, compileFormula, renderFormulaCard, generateFormulaSpec, fcSolve, fcConversions, fcShareUrl, fcFromShare};
openSharedFormulaFromHash();
addEventListener('hashchange', openSharedFormulaFromHash);
})();
