/* LokiCode v2 — snippets, live diagnostics, versions, explain, command palette. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => (window.App && App.esc ? App.esc(String(s ?? '')) : String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));

  let snippets = [];
  let diagTimer = 0;
  let lastErrors = [];
  const palette = { open: false, items: [], active: 0 };

  function toast(msg, kind) {
    if (window.App && App.toast) App.toast(msg, kind || 'ok');
  }

  function showNotice(text) {
    const el = $('#lcProviderNotice');
    if (!el) return;
    if (!text) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.classList.toggle('is-fast', /fast model/i.test(text));
    el.innerHTML = `<span>${esc(text)}</span><button type="button" aria-label="Dismiss">✕</button>`;
    el.querySelector('button').onclick = () => { el.hidden = true; };
  }

  function setProvider(provider, model) {
    const chip = $('#lcProviderChip');
    if (!chip) return;
    const label = model ? `${provider} · ${model.replace('openai/', '')}` : provider;
    chip.textContent = label;
  }

  function setTiming(timing) {
    if (!timing) return;
    const chip = $('#lcProviderChip');
    if (chip && timing.provider) chip.textContent = `${timing.provider}${timing.ms ? ' · ' + (timing.ms / 1000).toFixed(1) + 's' : ''}`;
  }

  function parseDiags(errors, warnings) {
    const map = (list, severity) => (list || []).map((msg) => {
      const m = String(msg).match(/^Line (\d+):\s*(.*)$/);
      return { line: m ? Number(m[1]) : 0, message: m ? m[2] : String(msg), severity };
    });
    return [...map(errors, 'error'), ...map(warnings, 'warning')];
  }

  function highlightLines(diags) {
    const code = $('#lcCode');
    if (!code) return;
    const bad = new Set(diags.filter((d) => d.severity === 'error' && d.line).map((d) => d.line));
    const warn = new Set(diags.filter((d) => d.severity === 'warning' && d.line).map((d) => d.line));
    code.querySelectorAll('.ln').forEach((span, idx) => {
      const line = idx + 1;
      span.classList.toggle('lc-line-bad', bad.has(line));
      span.classList.toggle('lc-line-warn', !bad.has(line) && warn.has(line));
    });
  }

  function renderDiags(diags) {
    lastErrors = diags;
    const list = $('#lcErrList');
    const count = $('#lcErrCount');
    if (!list) return;
    const errs = diags.filter((d) => d.severity === 'error');
    const warns = diags.filter((d) => d.severity === 'warning');
    if (count) {
      count.textContent = errs.length ? `${errs.length} error${errs.length === 1 ? '' : 's'}` : (warns.length ? `${warns.length} notes` : 'Clean');
      count.classList.toggle('has-err', errs.length > 0);
    }
    if (!diags.length) {
      list.innerHTML = '<li class="lc-err-empty">No issues on the finished lines. The checker runs again about every 150ms while LSL streams in.</li>';
      highlightLines([]);
      return;
    }
    list.innerHTML = diags.slice(0, 40).map((d, i) => {
      const cls = d.severity === 'warning' ? 'lc-warn-item' : 'lc-err-item';
      const where = d.line ? `Line ${d.line}` : 'Script';
      const fix = d.severity === 'error' ? `<button type="button" class="lc-fix-btn" data-fix="${i}">Fix with AI</button>` : '';
      return `<li class="${cls}"><b>${esc(where)}</b><div>${esc(d.message)}</div>${fix}</li>`;
    }).join('');
    highlightLines(diags);
    list.querySelectorAll('[data-fix]').forEach((btn) => {
      btn.onclick = () => fixWithAi(diags[Number(btn.dataset.fix)]);
    });
  }

  async function refreshDiagnostics(code, streaming) {
    const lang = window.LokiCode?.getState?.().lang;
    if (lang !== 'lsl') {
      const list = $('#lcErrList');
      const count = $('#lcErrCount');
      if (count) { count.textContent = 'LSL only'; count.classList.remove('has-err'); }
      if (list) list.innerHTML = '<li class="lc-err-empty">Switch to LSL to check each finished line while the model writes.</li>';
      return;
    }
    try {
      const res = await fetch('/api/lokicode/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: 'lsl', code, streaming: !!streaming })
      });
      if (!res.ok) return;
      const data = await res.json();
      renderDiags(parseDiags(data.errors, data.warnings));
    } catch (_e) {}
  }

  function onCodePaint(code, lang) {
    if (lang !== 'lsl') return;
    clearTimeout(diagTimer);
    diagTimer = setTimeout(() => refreshDiagnostics(code, true), 150);
  }

  async function fixWithAi(diag) {
    if (!diag || !window.LokiCode?.stream) return;
    const st = window.LokiCode.getState();
    const lines = String(st.code || '').split('\n');
    const box = $('#lcWorking');
    if (box) { box.hidden = false; box.classList.add('is-live'); }
    const status = $('#lcWorkStatus');
    if (status) status.textContent = 'Repairing';
    let raw = '';
    try {
      raw = await window.LokiCode.stream({
        lang: 'lsl',
        repair: true,
        errors: [{ line: diag.line, message: diag.message, text: diag.line ? (lines[diag.line - 1] || '') : '' }]
      }, (_d, full) => { raw = full; }, '/api/lokicode/repair');
      const next = window.LokiCode.applyLineRepairs(st.code, raw || '');
      window.LokiCode.setCode(next, false);
      await refreshDiagnostics(next, false);
      toast('Repair pass applied. Check the diagnostics panel.', 'ok');
    } catch (_e) {
      toast('Could not reach the repair model.', 'err');
    } finally {
      if (box) box.classList.remove('is-live');
      if (status) status.textContent = 'Worked';
    }
  }

  async function loadSnippets() {
    try {
      const res = await fetch('/api/lokicode/snippets');
      if (!res.ok) return;
      const data = await res.json();
      snippets = Array.isArray(data.snippets) ? data.snippets : [];
      renderRail();
    } catch (_e) {}
  }

  function renderRail() {
    const rail = $('#lcSnippetRail');
    if (!rail) return;
    const lang = window.LokiCode?.getState?.().lang;
    if (lang !== 'lsl' || !snippets.length) {
      rail.hidden = true;
      return;
    }
    rail.hidden = false;
    rail.innerHTML = snippets.map((s, i) => `
      <button type="button" class="lc-snippet-card" data-snip="${i}">
        <b>${esc(s.title)}</b>
        <small>${esc(s.description)}</small>
      </button>`).join('');
    rail.querySelectorAll('[data-snip]').forEach((btn) => {
      btn.onclick = () => insertSnippet(snippets[Number(btn.dataset.snip)]);
    });
  }

  function insertSnippet(snippet) {
    if (!snippet || !window.LokiCode) return;
    window.LokiCode.open({ code: snippet.code, lang: 'lsl' });
    const prompt = $('#lcPrompt');
    if (prompt && !prompt.value.trim()) prompt.value = snippet.title;
    toast(`Inserted ${snippet.title}`, 'ok');
    refreshDiagnostics(snippet.code, false);
  }

  function openSnippets() {
    if (window.App) App.showView('code');
    renderRail();
    const rail = $('#lcSnippetRail');
    if (rail) rail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function selectionInsideEditor() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return '';
    const code = $('#lcCode');
    if (!code) return '';
    const node = sel.anchorNode;
    if (!node || !code.contains(node)) return '';
    return sel.toString();
  }

  async function openExplain(text) {
    const dock = $('#lcExplainDock');
    const quote = $('#lcExplainQuote');
    const body = $('#lcExplainBody');
    const title = $('#lcExplainTitle');
    if (!dock || !body) return;
    const snippet = (text || selectionInsideEditor() || window.LokiCode?.getState?.().code || '').trim();
    if (!snippet) {
      toast('Highlight some code first, or generate a script.', 'info');
      return;
    }
    dock.hidden = false;
    if (title) title.textContent = selectionInsideEditor() ? 'Explain selection' : 'Explain script';
    if (quote) quote.textContent = snippet.slice(0, 1800);
    body.textContent = 'Reading the selection…';
    let acc = '';
    try {
      const headers = { 'Content-Type': 'application/json' };
      const tok = window.LZAuth?.getToken?.();
      if (tok) headers['x-lz-token'] = tok;
      const res = await fetch('/api/lokicode/explain', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lang: window.LokiCode?.getState?.().lang || 'lsl',
          code: snippet.slice(0, 12000)
        })
      });
      if (!res.ok || !res.body) throw new Error('explain failed');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          const d = line.slice(5).trim();
          if (d === '[DONE]') continue;
          try {
            const j = JSON.parse(d);
            if (j.notice) showNotice(j.notice);
            if (j.provider) setProvider(j.provider, j.model);
            if (j.delta) {
              acc += j.delta;
              body.textContent = acc;
            }
          } catch (_e) {}
        }
      }
      if (!acc) body.textContent = 'No explanation came back.';
    } catch (_e) {
      body.textContent = 'Could not explain that selection right now.';
    }
  }

  function fmtWhen(ts) {
    try { return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (_e) { return ''; }
  }

  function lineDiff(a, b) {
    const as = String(a || '').split('\n');
    const bs = String(b || '').split('\n');
    const n = Math.max(as.length, bs.length);
    let left = '';
    let right = '';
    for (let i = 0; i < n; i++) {
      const changed = as[i] !== bs[i];
      const cls = changed ? ' class="chg"' : '';
      left += `<div${cls}>${esc(as[i] ?? '')}</div>`;
      right += `<div${cls}>${esc(bs[i] ?? '')}</div>`;
    }
    return `<div class="lc-diff-grid"><div class="lc-diff-col">${left}</div><div class="lc-diff-col">${right}</div></div>`;
  }

  function openVersions(item) {
    if (!item) return;
    let host = $('#lcVersionStudio');
    if (!host) {
      host = document.createElement('div');
      host.id = 'lcVersionStudio';
      host.className = 'lc-version-studio';
      document.body.appendChild(host);
    }
    const versions = [
      { id: 'current', label: 'Current', code: item.code, savedAt: item.updatedAt },
      ...((item.versions || []).map((v, i) => ({ ...v, label: `Save ${i + 1}` })))
    ];
    const opts = versions.map((v, i) => `<option value="${i}">${esc(v.label)} · ${fmtWhen(v.savedAt)} · ${String(v.code || '').split('\n').length} lines</option>`).join('');
    host.hidden = false;
    host.innerHTML = `
      <div class="lc-version-card" role="dialog" aria-label="Script versions">
        <h3>Versions · ${esc(item.title || 'Script')}</h3>
        <p style="color:#9fb5aa;margin-top:0">Compare two saves side by side, then restore either one into the editor.</p>
        <div class="lc-version-picks">
          <label>Left <select id="lcVerA">${opts}</select></label>
          <label>Right <select id="lcVerB">${opts}</select></label>
          <span class="lc-version-actions">
            <button type="button" id="lcVerRestore">Restore right side</button>
            <button type="button" id="lcVerClose">Close</button>
          </span>
        </div>
        <div id="lcVerDiff"></div>
      </div>`;
    const a = $('#lcVerA');
    const b = $('#lcVerB');
    if (versions.length > 1) b.value = '1';
    const draw = () => {
      const left = versions[Number(a.value)] || versions[0];
      const right = versions[Number(b.value)] || versions[0];
      $('#lcVerDiff').innerHTML = lineDiff(left.code, right.code);
    };
    a.onchange = draw;
    b.onchange = draw;
    draw();
    $('#lcVerClose').onclick = () => { host.hidden = true; };
    host.onclick = (e) => { if (e.target === host) host.hidden = true; };
    $('#lcVerRestore').onclick = () => {
      const right = versions[Number(b.value)] || versions[0];
      window.LokiCode.setCode(right.code, false);
      if (item.lang) window.LokiCode.getState().lang = item.lang;
      window.LokiCode.saveCodeToHistory({ notify: true, explicitTitle: item.title });
      host.hidden = true;
      toast('Restored that version into the editor', 'ok');
    };
  }

  function paletteItems() {
    const items = [
      { kind: 'Page', title: 'Chat', run: () => App.showView('chat') },
      { kind: 'Page', title: 'LokiCode', run: () => App.showView('code') },
      { kind: 'Page', title: 'Team Chat', run: () => App.showView('teamchat') },
      { kind: 'Page', title: 'Plans', run: () => App.showView('benches') },
      { kind: 'Page', title: 'LokiBot', run: () => App.showView('lokibot') },
      { kind: 'Page', title: 'Shared Hub', run: () => App.showView('sharedhub') },
      { kind: 'Page', title: 'Community event', run: () => App.showView('event') },
      { kind: 'Page', title: 'Settings', run: () => $('#openSettings')?.click() },
      { kind: 'Action', title: 'New chat', run: () => App.startNewChat() },
      { kind: 'Action', title: 'LSL snippet library', run: openSnippets },
      { kind: 'Action', title: 'Script version history', run: () => { App.showView('code'); $('#lcHistoryBtn')?.click(); } },
      { kind: 'Action', title: 'Explain selection', run: () => { App.showView('code'); openExplain(); } }
    ];
    const convs = (window.App && App.state && App.state.convs) || [];
    convs.slice(0, 40).forEach((c) => {
      items.push({ kind: 'Chat', title: c.title || 'Untitled chat', run: () => App.selectConv(c.id) });
    });
    const hist = window.LokiCode?.getHistory?.() || [];
    hist.slice(0, 40).forEach((s) => {
      items.push({
        kind: 'Script',
        title: s.title || 'Script',
        run: () => window.LokiCode.open({ code: s.code, lang: s.lang })
      });
    });
    return items;
  }

  function renderPalette() {
    const list = $('#lzPaletteList');
    const q = ($('#lzPaletteInput')?.value || '').trim().toLowerCase();
    palette.items = paletteItems().filter((item) => !q || `${item.kind} ${item.title}`.toLowerCase().includes(q));
    if (palette.active >= palette.items.length) palette.active = 0;
    if (!list) return;
    if (!palette.items.length) {
      list.innerHTML = '<li class="lc-err-empty">Nothing matches.</li>';
      return;
    }
    list.innerHTML = palette.items.map((item, i) => `
      <li><button type="button" class="lz-pal-item${i === palette.active ? ' active' : ''}" data-i="${i}">
        <span>${esc(item.title)}</span><small>${esc(item.kind)}</small>
      </button></li>`).join('');
    list.querySelectorAll('button').forEach((btn) => {
      btn.onclick = () => choosePalette(Number(btn.dataset.i));
    });
  }

  function openPalette() {
    const root = $('#lzPalette');
    if (!root) return;
    palette.open = true;
    palette.active = 0;
    root.hidden = false;
    const input = $('#lzPaletteInput');
    if (input) { input.value = ''; input.focus(); }
    renderPalette();
  }

  function closePalette() {
    palette.open = false;
    const root = $('#lzPalette');
    if (root) root.hidden = true;
  }

  function choosePalette(index) {
    const item = palette.items[index];
    closePalette();
    if (item) item.run();
  }

  async function demoLive() {
    const sample = [
      'integer gChan = -44021;',
      'integer gHandle = 0;',
      'key gOwner;',
      '',
      'default',
      '{',
      '    state_entry()',
      '    {',
      '        gOwner = llGetOwner();',
      '        llSetText("Door", <0.2, 1.0, 0.7>, 1.0);',
      '        llOwnerSay("Ready")',
      '    }',
      '',
      '    touch_start(integer total_number)',
      '    {',
      '        llRegionSayTo(llDetectedKey(0), 0, "Open");',
      '        llSetTimerEvent(4.0);',
      '    }',
      '',
      '    timer()',
      '    {',
      '        llSetTimerEvent(0.0);',
      '        llOwnerSay("Closed");',
      '    }',
      '}'
    ];
    if (window.LokiCode) {
      window.LokiCode.open({ code: '', lang: 'lsl' });
    }
    const box = $('#lcWorking');
    const drawer = $('#lcWorkDrawer');
    if (box) { box.hidden = false; box.classList.add('is-live', 'open'); }
    if (drawer) drawer.hidden = false;
    const status = $('#lcWorkStatus');
    if (status) status.textContent = 'Working';
    setProvider('groq', 'openai/gpt-oss-120b');
    const started = performance.now();
    let acc = '';
    for (let i = 0; i < sample.length; i++) {
      acc += (i ? '\n' : '') + sample[i];
      const codeEl = $('#lcCode');
      if (codeEl) codeEl.textContent = acc;
      const live = $('#lcLiveLines');
      if (live) live.textContent = (i + 1) + ' lines';
      const timer = $('#lcWorkTimer');
      if (timer) timer.textContent = ((performance.now() - started) / 1000).toFixed(1) + 's';
    const cur = $('#lcWorkCur');
    if (cur) cur.textContent = 'Writing LSL and checking finished lines…';
    const curBox = $('#lcCurrentlyBox');
    if (curBox) curBox.textContent = 'Checking finished LSL lines';
    const fin = $('#lcFinishedList');
    if (fin) fin.innerHTML = '<li><span class="t-check">✓</span><span class="t-txt">Stream opened</span></li>';
    const count = $('#lcFinishedCount');
    if (count) count.textContent = '1';
      if (window.LokiCode) window.LokiCode.getState().code = acc;
      await new Promise((r) => setTimeout(r, 30));
    }
    if (window.LokiCode) window.LokiCode.setCode(acc, false);
    await refreshDiagnostics(acc, false);
    const timer = $('#lcWorkTimer');
    if (timer) timer.textContent = ((performance.now() - started) / 1000).toFixed(1) + 's';
  }

  function bootPreview() {
    const params = new URLSearchParams(location.search);
    const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (params.get('lcpreview') !== '1' || !local) return;
    const hide = () => {
      const ov = $('#authOverlay');
      if (ov) ov.hidden = true;
    };
    hide();
    setInterval(hide, 500);
    if (window.App) App.showView('code');
  }

  function init() {
    loadSnippets();
    $('#lcSnippetsBtn') && ($('#lcSnippetsBtn').onclick = openSnippets);
    $('#lcExplainClose') && ($('#lcExplainClose').onclick = () => { $('#lcExplainDock').hidden = true; });
    const explainBtn = $('#lcExplain');
    if (explainBtn) explainBtn.onclick = () => openExplain(selectionInsideEditor());
    $('#lcLangs') && $('#lcLangs').addEventListener('click', () => setTimeout(renderRail, 0));
    const input = $('#lzPaletteInput');
    if (input) {
      input.addEventListener('input', () => { palette.active = 0; renderPalette(); });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); palette.active = Math.min(palette.items.length - 1, palette.active + 1); renderPalette(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); palette.active = Math.max(0, palette.active - 1); renderPalette(); }
        else if (e.key === 'Enter') { e.preventDefault(); choosePalette(palette.active); }
        else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
      });
    }
    $('#lzPalette') && $('#lzPalette').addEventListener('click', (e) => { if (e.target.id === 'lzPalette') closePalette(); });
    if (window.LokiCode && typeof window.LokiCode.onShow === 'function') {
      const prev = window.LokiCode.onShow;
      window.LokiCode.onShow = function () {
        prev.apply(this, arguments);
        renderRail();
      };
    }
    bootPreview();
  }

  window.LCStudio = {
    onCodePaint,
    showNotice,
    setProvider,
    setTiming,
    showDiagnostics: (errors, warnings) => renderDiags(parseDiags(errors, warnings)),
    openVersions,
    openSnippets,
    demoLive
  };
  window.LZPalette = {
    toggle() { palette.open ? closePalette() : openPalette(); },
    open: openPalette,
    close: closePalette,
    isOpen: () => palette.open
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
