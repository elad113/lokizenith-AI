/* Lokizenith Deck Designer — a custom design system per presentation. Made by Lokiz Studios.
   buildDeck(PptxGenJS, spec) -> pptx. spec = AI plan: {title, subtitle, design:{theme, palette, fonts, motif}, slides:[...]}
   Every deck gets its own palette, font pairing, motif and layout rhythm derived from its topic.
   Works in the browser (window.LZDeck) and in Node (globalThis.LZDeck) for tests. */
(function (root) {
  'use strict';
  const W = 13.333, H = 7.5;
  const THEMES = {
    midnight:  { bg: '0B1020', surface: '161E3A', primary: '5B8CFF', accent: '22D3EE', text: 'F4F7FF', muted: '9AA6C8', head: 'Segoe UI', body: 'Segoe UI', motif: 'orbs', dark: true },
    editorial: { bg: 'F6F1E7', surface: 'FFFFFF', primary: '1F3A5F', accent: 'D9643A', text: '1B1B1B', muted: '6B6458', head: 'Georgia', body: 'Calibri', motif: 'frame', dark: false },
    forest:    { bg: '0F2A1F', surface: '173A2B', primary: '7BC47F', accent: 'F2C14E', text: 'EEF6EE', muted: 'A9C4B0', head: 'Trebuchet MS', body: 'Calibri', motif: 'waves', dark: true },
    sunset:    { bg: '1A0F1F', surface: '2A1630', primary: 'FF6B6B', accent: 'FFD166', text: 'FFF5F0', muted: 'CDB3C0', head: 'Arial Black', body: 'Arial', motif: 'diagonal', dark: true },
    corporate: { bg: 'FFFFFF', surface: 'F2F5F9', primary: '0F62FE', accent: '00A6A6', text: '161616', muted: '5A6472', head: 'Segoe UI', body: 'Segoe UI', motif: 'bands', dark: false },
    ocean:     { bg: '06283D', surface: '0B3A57', primary: '47B5FF', accent: '7CF0D6', text: 'EAF6FF', muted: '98B8CC', head: 'Century Gothic', body: 'Calibri', motif: 'orbs', dark: true },
    noir:      { bg: '0E0E0E', surface: '1B1B1B', primary: 'C9A227', accent: 'E8D9A8', text: 'F5F1E6', muted: 'A39E91', head: 'Garamond', body: 'Gill Sans MT', motif: 'frame', dark: true },
    pastel:    { bg: 'FFF7F0', surface: 'FFFFFF', primary: '7C5CFF', accent: 'FF7EB6', text: '2B2140', muted: '6E6585', head: 'Trebuchet MS', body: 'Verdana', motif: 'dots', dark: false },
    lab:       { bg: 'F3F7FA', surface: 'FFFFFF', primary: '0B7285', accent: 'E8590C', text: '0B1F2A', muted: '51636E', head: 'Cambria', body: 'Calibri', motif: 'grid', dark: false },
    heritage:  { bg: '2B0F0E', surface: '3D1A17', primary: 'D4483B', accent: 'E9C46A', text: 'FBEFE8', muted: 'C9A79E', head: 'Palatino Linotype', body: 'Calibri', motif: 'frame', dark: true },
    mint:      { bg: 'F1FAF5', surface: 'FFFFFF', primary: '1B998B', accent: 'F46036', text: '12312B', muted: '4F6F66', head: 'Century Gothic', body: 'Calibri', motif: 'orbs', dark: false },
    neon:      { bg: '07070D', surface: '13131F', primary: '00F5A0', accent: 'B14CFF', text: 'E9E9FF', muted: '8F8FB3', head: 'Segoe UI Black', body: 'Segoe UI', motif: 'grid', dark: true },
  };
  const SAFE_FONTS = ['Segoe UI', 'Segoe UI Black', 'Segoe UI Semibold', 'Calibri', 'Cambria', 'Georgia', 'Arial', 'Arial Black', 'Trebuchet MS', 'Verdana', 'Century Gothic', 'Garamond', 'Gill Sans MT', 'Palatino Linotype', 'Tahoma', 'Franklin Gothic Medium', 'Rockwell', 'Corbel', 'Candara', 'Constantia', 'Consolas', 'Aptos', 'Aptos Display', 'Book Antiqua', 'Lucida Sans', 'Impact'];
  const MOTIFS = ['orbs', 'frame', 'waves', 'diagonal', 'bands', 'dots', 'grid'];

  const hex = (v, d) => { const s = String(v || '').replace('#', '').trim().toUpperCase(); return /^[0-9A-F]{6}$/.test(s) ? s : d; };
  const lum = (h) => { const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (a, b, t) => { const p = (h, i) => parseInt(h.slice(i, i + 2), 16); return [0, 2, 4].map((i) => Math.round(p(a, i) * (1 - t) + p(b, i) * t).toString(16).padStart(2, '0')).join('').toUpperCase(); };
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const onColor = (bgc, a = '111111', b = 'FFFFFF') => (contrast(bgc, a) >= contrast(bgc, b) ? a : b);

  function resolveTheme(spec) {
    const d = (spec && spec.design) || {};
    const seed = hash((spec && spec.title) || 'deck');
    const keys = Object.keys(THEMES);
    const base = THEMES[d.theme] || THEMES[keys[seed % keys.length]];
    const p = d.palette || {};
    const t = Object.assign({}, base);
    t.bg = hex(p.bg || p.background, base.bg);
    t.surface = hex(p.surface || p.card, base.surface);
    t.primary = hex(p.primary, base.primary);
    t.accent = hex(p.accent || p.secondary, base.accent);
    t.text = hex(p.text, base.text);
    t.muted = hex(p.muted, base.muted);
    // guard readability: fall back to the preset if the AI palette is low-contrast
    if (contrast(t.text, t.bg) < 7) { t.text = onColor(t.bg, '141414', 'F7F7F7'); }
    if (contrast(t.muted, t.bg) < 3.2) t.muted = mix(t.text, t.bg, 0.35);
    if (contrast(t.text, t.surface) < 6) t.surface = mix(t.bg, t.text, lum(t.bg) < 0.4 ? 0.08 : 0.04);
    if (contrast(t.primary, t.bg) < 2.2) t.primary = base.primary;
    t.dark = lum(t.bg) < 0.35;
    const f = d.fonts || {};
    t.head = SAFE_FONTS.includes(f.heading) ? f.heading : base.head;
    t.body = SAFE_FONTS.includes(f.body) ? f.body : base.body;
    t.motif = MOTIFS.includes(d.motif) ? d.motif : base.motif;
    if (spec && spec._rtl) { t.head = 'Arial'; t.body = 'Arial'; }
    t.seed = seed;
    t.onPrimary = onColor(t.primary);
    t.soft = mix(t.primary, t.bg, 0.82);
    t.line = mix(t.text, t.bg, 0.82);
    return t;
  }

  const clampTxt = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
  const sizeFor = (s, big, small, longAt) => { const n = String(s || '').length; if (n <= longAt * 0.5) return big; if (n >= longAt * 1.6) return small; return Math.round(big - (big - small) * ((n - longAt * 0.5) / (longAt * 1.1))); };
  const splitLead = (b) => { const s = String(b || ''); const m = s.match(/^(.{2,48}?)[:—–-]\s+(.+)$/); return m ? [m[1].trim(), m[2].trim()] : ['', s]; };

  /** Repair common AI plan mistakes so every layout renders with content. */
  function normalizeSpec(spec) {
    spec = Object.assign({}, spec || {});
    spec.slides = (Array.isArray(spec.slides) ? spec.slides : []).filter(Boolean).slice(0, 16).map((sl) => {
      sl = Object.assign({}, sl);
      const lay = String(sl.layout || 'bullets').toLowerCase();
      if (!String(sl.title || '').trim()) {
        if (sl.kicker) { sl.title = sl.kicker; sl.kicker = ''; }
        else if (lay === 'agenda') sl.title = /[\u0590-\u05FF]/.test(JSON.stringify(sl)) ? 'סדר היום' : 'Agenda';
        else if (sl.left && sl.right && sl.left.heading && sl.right.heading) sl.title = sl.left.heading + ' vs. ' + sl.right.heading;
        else if (sl.visual && sl.visual.caption) sl.title = sl.visual.caption;
      }
      const bl = Array.isArray(sl.bullets) ? sl.bullets.filter(Boolean).map(String) : [];
      sl.bullets = bl.map((b) => b.replace(/^(lead|detail|point|bullet)\s*\d*\s*[:—–-]\s*/i, ''));
      if ((lay === 'two' || lay === 'comparison') && !(sl.left && sl.right)) {
        const groups = {};
        bl.forEach((b) => { const [lead, rest] = splitLead(b); if (lead) (groups[lead] = groups[lead] || []).push(rest); });
        const keys = Object.keys(groups);
        if (keys.length === 2) { sl.left = { heading: keys[0], bullets: groups[keys[0]] }; sl.right = { heading: keys[1], bullets: groups[keys[1]] }; }
        else if (bl.length >= 2) { const h = Math.ceil(bl.length / 2); sl.left = { heading: sl.leftHeading || '', bullets: bl.slice(0, h) }; sl.right = { heading: sl.rightHeading || '', bullets: bl.slice(h) }; }
        else sl.layout = 'bullets';
      }
      if (lay === 'stats' && !(Array.isArray(sl.stats) && sl.stats.length)) sl.layout = 'bullets';
      if (lay === 'timeline' && !(Array.isArray(sl.steps) && sl.steps.length)) sl.layout = 'bullets';
      if (lay === 'quote' && !sl.quote) sl.layout = sl.statement ? 'big' : 'bullets';
      ['subtitle', 'takeaway', 'statement'].forEach((k) => { if (sl[k]) sl[k] = String(sl[k]).replace(/^(lead|detail)\s*[:—–-]\s*/i, ''); });
      return sl;
    });
    return spec;
  }

  function buildDeck(PptxGenJS, spec, opts) {
    opts = opts || {};
    spec = normalizeSpec(spec);
    const rtl = !!opts.rtl || /[\u0590-\u05FF\u0600-\u06FF]/.test(String(spec.title || '') + (spec.slides || []).slice(0, 2).map((s) => s.title).join(''));
    spec._rtl = rtl;
    const T = resolveTheme(spec);
    const X = (x, w) => (rtl ? W - x - w : x); // mirror a box horizontally for right-to-left decks
    const AL = rtl ? 'right' : 'left';
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.title = spec.title || 'Presentation';
    pptx.company = 'Lokiz Studios';
    pptx.author = 'Lokizenith AI';
    pptx.theme = { headFontFace: T.head, bodyFontFace: T.body };
    const S = pptx.ShapeType;
    const tx = (o) => Object.assign({ fontFace: T.body, color: T.text, align: AL, rtlMode: rtl, valign: 'top', margin: 0, fit: 'shrink' }, o);
    const hd = (o) => tx(Object.assign({ fontFace: T.head, bold: true }, o));
    const total = (spec.slides || []).length + 1;
    let pageNo = 1;

    function motif(s, variant) {
      const v = (T.seed + variant) % 3;
      const P = T.primary, A = T.accent;
      if (T.motif === 'orbs') {
        s.addShape(S.ellipse, { x: W - 3.6 + v * 0.3, y: -1.9, w: 5.2, h: 5.2, fill: { color: P, transparency: 84 }, line: { type: 'none' } });
        s.addShape(S.ellipse, { x: W - 1.9, y: H - 2.2 - v * 0.4, w: 3.2, h: 3.2, fill: { color: A, transparency: 86 }, line: { type: 'none' } });
        s.addShape(S.ellipse, { x: -1.4, y: H - 1.5, w: 2.8, h: 2.8, fill: { color: P, transparency: 90 }, line: { type: 'none' } });
      } else if (T.motif === 'frame') {
        s.addShape(S.rect, { x: 0.28, y: 0.28, w: W - 0.56, h: H - 0.56, fill: { type: 'none' }, line: { color: T.line, width: 1 } });
        s.addShape(S.rect, { x: 0.28, y: 0.28, w: 0.9, h: 0.06, fill: { color: A }, line: { type: 'none' } });
      } else if (T.motif === 'waves') {
        for (let i = 0; i < 3; i++) s.addShape(S.ellipse, { x: -2 + i * 1.6, y: H - 1.0 + i * 0.18, w: W + 4, h: 3.2, fill: { color: i === 1 ? A : P, transparency: 88 + i * 3 }, line: { type: 'none' } });
      } else if (T.motif === 'diagonal') {
        s.addShape(S.rtTriangle, { x: W - 4.2, y: 0, w: 4.2, h: 2.6, flipH: true, fill: { color: P, transparency: 80 }, line: { type: 'none' } });
        s.addShape(S.rtTriangle, { x: W - 2.4, y: 0, w: 2.4, h: 1.5, flipH: true, fill: { color: A, transparency: 70 }, line: { type: 'none' } });
      } else if (T.motif === 'bands') {
        s.addShape(S.rect, { x: 0, y: 0, w: W, h: 0.12, fill: { color: P }, line: { type: 'none' } });
        s.addShape(S.rect, { x: 0, y: 0.12, w: W * 0.32, h: 0.05, fill: { color: A }, line: { type: 'none' } });
      } else if (T.motif === 'dots') {
        for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) s.addShape(S.ellipse, { x: W - 2.3 + c * 0.32, y: 0.45 + r * 0.32, w: 0.09, h: 0.09, fill: { color: (r + c + v) % 4 ? P : A, transparency: 35 }, line: { type: 'none' } });
      } else if (T.motif === 'grid') {
        for (let i = 1; i < 12; i++) s.addShape(S.line, { x: i * (W / 12), y: 0, w: 0, h: H, line: { color: T.line, width: 0.5, transparency: 55 } });
        for (let j = 1; j < 7; j++) s.addShape(S.line, { x: 0, y: j * (H / 7), w: W, h: 0, line: { color: T.line, width: 0.5, transparency: 55 } });
      }
    }
    function base(variant, opt) {
      const s = pptx.addSlide();
      s.background = { color: (opt && opt.bg) || T.bg };
      if (!(opt && opt.noMotif)) motif(s, variant || 0);
      return s;
    }
    function footer(s, onDark) {
      pageNo++;
      const col = onDark ? mix(onDark, T.primary, 0.3) : T.muted;
      s.addText(clampTxt(spec.title, 60), tx({ x: rtl ? W - 6.6 : 0.6, y: H - 0.5, w: 6, h: 0.3, fontSize: 10, color: col }));
      s.addText(`${String(pageNo).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, tx({ x: rtl ? 0.6 : W - 1.9, y: H - 0.5, w: 1.3, h: 0.3, fontSize: 10, color: col, align: rtl ? 'left' : 'right' }));
    }
    function header(s, sl, y) {
      y = y == null ? 0.55 : y;
      if (sl.kicker) s.addText(clampTxt(sl.kicker, 40).toUpperCase(), tx({ x: 0.75, y, w: W - 1.5, h: 0.32, fontSize: 12, bold: true, color: T.accent, charSpacing: rtl ? 0 : 3 }));
      const ty = y + (sl.kicker ? 0.36 : 0);
      s.addText(clampTxt(sl.title, 90), hd({ x: 0.75, y: ty, w: W - 1.5, h: 0.95, fontSize: sizeFor(sl.title, 34, 24, 50), color: T.text, valign: 'middle' }));
      s.addShape(S.rect, { x: rtl ? W - 0.75 - 1.1 : 0.75, y: ty + 1.0, w: 1.1, h: 0.06, fill: { color: T.primary }, line: { type: 'none' } });
      return ty + 1.35;
    }
    const notes = (s, sl) => { if (sl.notes) s.addNotes(String(sl.notes)); };
    const card = (s, x, y, w, h, opt) => s.addShape(S.roundRect, Object.assign({ x, y, w, h, rectRadius: 0.12, fill: { color: T.surface }, line: { color: T.line, width: 0.75 }, shadow: { type: 'outer', blur: 8, offset: 2, angle: 90, color: '000000', opacity: T.dark ? 0.35 : 0.12 } }, opt || {}));

    // ---------- cover ----------
    (function cover() {
      const s = base(0);
      const big = sizeFor(spec.title, 54, 36, 40);
      s.addShape(S.rect, { x: rtl ? W - 0.95 : 0.75, y: 2.05, w: 0.14, h: 2.5, fill: { color: T.primary }, line: { type: 'none' } });
      if (spec.kicker || (spec.design && spec.design.mood)) s.addText(clampTxt(spec.kicker || spec.design.mood, 50).toUpperCase(), tx({ x: X(1.15, 8), y: 1.45, w: 8, h: 0.4, fontSize: 13, bold: true, color: T.accent, charSpacing: rtl ? 0 : 4 }));
      s.addText(clampTxt(spec.title, 90), hd({ x: X(1.15, 8.0), y: 1.95, w: 8.0, h: 1.9, fontSize: big, valign: 'middle' }));
      s.addText(clampTxt(spec.subtitle, 160), tx({ x: X(1.15, 8.0), y: 3.95, w: 8.0, h: 0.9, fontSize: 19, color: T.muted }));
      // hero art
      const cx = rtl ? 1.0 : 9.55, cy = 1.75;
      s.addShape(S.ellipse, { x: cx, y: cy, w: 3.2, h: 3.2, fill: { color: T.primary, transparency: 10 }, line: { type: 'none' } });
      s.addShape(S.ellipse, { x: cx + 1.75, y: cy + 1.9, w: 1.7, h: 1.7, fill: { color: T.accent, transparency: 5 }, line: { type: 'none' } });
      s.addShape(S.ellipse, { x: cx - 0.35, y: cy + 2.55, w: 0.8, h: 0.8, fill: { type: 'none' }, line: { color: T.accent, width: 2.5 } });
      if (spec.icon) s.addText(String(spec.icon).slice(0, 4), tx({ x: cx, y: cy + 0.65, w: 3.2, h: 1.9, fontSize: 72, align: 'center', valign: 'middle', color: T.onPrimary, fit: undefined }));
      s.addText(opts.byline || 'Made with Lokizenith AI', tx({ x: X(1.15, 6), y: H - 0.95, w: 6, h: 0.35, fontSize: 11, color: T.muted }));
      if (spec.coverNotes) s.addNotes(String(spec.coverNotes));
    })();

    let sectionNo = 0;
    (spec.slides || []).forEach((sl, idx) => {
      const lay = String(sl.layout || 'bullets').toLowerCase();
      const variant = idx + 1;
      const bullets = (Array.isArray(sl.bullets) ? sl.bullets : []).slice(0, 5).map((b) => clampTxt(b, 150));

      if (lay === 'section') {
        sectionNo++;
        const s = base(variant, { bg: T.primary, noMotif: true });
        const on = T.onPrimary;
        s.addShape(S.ellipse, { x: W - 4.8, y: -1.2, w: 6.5, h: 6.5, fill: { color: on, transparency: 92 }, line: { type: 'none' } });
        s.addShape(S.ellipse, { x: W - 2.6, y: H - 2.6, w: 3.6, h: 3.6, fill: { color: T.accent, transparency: 30 }, line: { type: 'none' } });
        s.addText(String(sectionNo).padStart(2, '0'), hd({ x: X(0.8, 4), y: 1.3, w: 4, h: 1.8, fontSize: 96, color: on, fit: undefined }));
        s.addText(clampTxt(sl.title, 70), hd({ x: X(0.8, 8.8), y: 3.25, w: 8.8, h: 1.4, fontSize: sizeFor(sl.title, 44, 30, 36), color: on, valign: 'middle' }));
        if (sl.subtitle || bullets[0]) s.addText(clampTxt(sl.subtitle || bullets[0], 140), tx({ x: X(0.8, 8.5), y: 4.7, w: 8.5, h: 0.9, fontSize: 18, color: mix(on, T.primary, 0.25) }));
        footer(s, on); notes(s, sl); return;
      }
      if (lay === 'big' || lay === 'statement') {
        const s = base(variant);
        const txt = clampTxt(sl.statement || sl.title, 160);
        s.addShape(S.rect, { x: W / 2 - 0.6, y: 1.45, w: 1.2, h: 0.08, fill: { color: T.accent }, line: { type: 'none' } });
        s.addText(txt, hd({ x: 1.2, y: 1.8, w: W - 2.4, h: 3.2, fontSize: sizeFor(txt, 44, 28, 80), align: 'center', valign: 'middle' }));
        if (sl.subtitle || bullets[0]) s.addText(clampTxt(sl.subtitle || bullets[0], 160), tx({ x: 1.6, y: 5.1, w: W - 3.2, h: 0.9, fontSize: 18, color: T.muted, align: 'center' }));
        footer(s); notes(s, sl); return;
      }
      if (lay === 'quote') {
        const s = base(variant);
        s.addText('“', hd({ x: 0.9, y: 0.6, w: 2, h: 2, fontSize: 160, color: T.primary, fit: undefined }));
        const q = clampTxt(sl.quote || sl.title, 260);
        s.addText(q, tx({ x: 1.6, y: 1.9, w: W - 3.2, h: 3.0, fontSize: sizeFor(q, 32, 22, 150), italic: true, fontFace: T.head, valign: 'middle' }));
        s.addShape(S.rect, { x: 1.6, y: 5.15, w: 0.6, h: 0.05, fill: { color: T.accent }, line: { type: 'none' } });
        if (sl.author) s.addText(clampTxt(sl.author, 80), tx({ x: 2.35, y: 4.98, w: 8, h: 0.4, fontSize: 16, bold: true, color: T.accent }));
        footer(s); notes(s, sl); return;
      }
      const s = base(variant);
      let y = header(s, sl);
      const bodyH = H - y - 0.85;

      if (lay === 'agenda') {
        const items = (bullets.length ? bullets : (spec.slides || []).filter((x) => x.layout === 'section').map((x) => x.title)).slice(0, 6);
        const cols = items.length > 3 ? 2 : 1, rows = Math.ceil(items.length / cols);
        const cw = (W - 1.5 - (cols - 1) * 0.4) / cols, ch = Math.min(1.45, (bodyH - (rows - 1) * 0.25) / rows);
        const y0 = y + Math.max(0, (bodyH - (rows * ch + (rows - 1) * 0.25)) / 2);
        items.forEach((it, i) => {
          const c = rtl ? cols - 1 - Math.floor(i / rows) : Math.floor(i / rows), r = i % rows; const x = 0.75 + c * (cw + 0.4), yy = y0 + r * (ch + 0.25);
          card(s, x, yy, cw, ch);
          s.addShape(S.rect, { x: rtl ? x + cw - 0.1 : x, y: yy, w: 0.1, h: ch, fill: { color: i % 2 ? T.accent : T.primary }, line: { type: 'none' } });
          s.addText(String(i + 1).padStart(2, '0'), hd({ x: rtl ? x + cw - 1.4 : x + 0.3, y: yy, w: 1.1, h: ch, fontSize: 32, color: i % 2 ? T.accent : T.primary, valign: 'middle', align: 'center' }));
          s.addText(clampTxt(it, 80), tx({ x: rtl ? x + 0.25 : x + 1.4, y: yy, w: cw - 1.65, h: ch, fontSize: 19, valign: 'middle' }));
        });
      } else if (lay === 'stats' && Array.isArray(sl.stats) && sl.stats.length) {
        const st = sl.stats.slice(0, 4), gap = 0.4, cw = (W - 1.5 - gap * (st.length - 1)) / st.length;
        const hasTake = !!(sl.takeaway || bullets[0]);
        const chh = Math.min(3.6, bodyH - (hasTake ? 0.9 : 0.2));
        const y0 = y + Math.max(0.1, (bodyH - chh - (hasTake ? 0.85 : 0)) / 2);
        st.forEach((x, i) => {
          const cx = 0.75 + (rtl ? st.length - 1 - i : i) * (cw + gap);
          const col = i % 2 ? T.accent : T.primary;
          card(s, cx, y0, cw, chh);
          s.addShape(S.rect, { x: cx, y: y0, w: cw, h: 0.12, fill: { color: col }, line: { type: 'none' } });
          s.addText(clampTxt(x.value, 12), hd({ x: cx + 0.2, y: y0 + chh * 0.14, w: cw - 0.4, h: chh * 0.42, fontSize: st.length > 3 ? 44 : st.length > 2 ? 54 : 66, color: col, align: 'center', valign: 'middle' }));
          s.addShape(S.rect, { x: cx + cw / 2 - 0.3, y: y0 + chh * 0.6, w: 0.6, h: 0.04, fill: { color: T.line }, line: { type: 'none' } });
          s.addText(clampTxt(x.label, 90), tx({ x: cx + 0.3, y: y0 + chh * 0.66, w: cw - 0.6, h: chh * 0.3, fontSize: st.length > 2 ? 15 : 18, color: T.muted, align: 'center' }));
        });
        if (hasTake) s.addText(clampTxt(sl.takeaway || bullets[0], 160), tx({ x: 0.75, y: y0 + chh + 0.25, w: W - 1.5, h: 0.6, fontSize: 17, italic: true, color: T.text, align: 'center' }));
      } else if ((lay === 'two' || lay === 'comparison') && (sl.left || sl.right)) {
        const cols = [sl.left || {}, sl.right || {}], cw = (W - 1.5 - 0.45) / 2;
        cols.forEach((col, i) => {
          const x = 0.75 + i * (cw + 0.45);
          const head = i === 0 ? T.primary : T.accent;
          card(s, x, y, cw, bodyH);
          s.addShape(S.roundRect, { x, y, w: cw, h: 0.75, rectRadius: 0.12, fill: { color: head }, line: { type: 'none' } });
          s.addShape(S.rect, { x, y: y + 0.45, w: cw, h: 0.3, fill: { color: head }, line: { type: 'none' } });
          s.addText(clampTxt(col.heading, 50), hd({ x: x + 0.3, y, w: cw - 0.6, h: 0.75, fontSize: 20, color: onColor(head), valign: 'middle' }));
          const mark = lay === 'comparison' ? (i === 0 ? '✓' : '✗') : '•';
          const items = (col.bullets || []).slice(0, 5).map((b) => ({ text: clampTxt(b, 120), options: { bullet: { characterCode: mark === '•' ? '25CF' : (mark === '✓' ? '2713' : '2717') }, paraSpaceAfter: 12, color: T.text, breakLine: true } }));
          s.addText(items.length ? items : [{ text: '' }], tx({ x: x + 0.35, y: y + 0.95, w: cw - 0.7, h: bodyH - 1.15, fontSize: sizeFor(items.map((b) => b.text).join(' '), 18, 14, 260) }));
        });
      } else if (lay === 'timeline' && Array.isArray(sl.steps) && sl.steps.length) {
        const st = sl.steps.slice(0, 6), n = st.length, x0 = 1.9, x1 = W - 1.9, ly = y + Math.max(1.25, bodyH * 0.38);
        if (rtl) st.reverse();
        s.addShape(S.line, { x: x0, y: ly, w: x1 - x0, h: 0, line: { color: T.line, width: 3 } });
        st.forEach((p, i) => {
          const cx = x0 + (n === 1 ? 0.5 : i / (n - 1)) * (x1 - x0);
          const col = i % 2 ? T.accent : T.primary;
          s.addShape(S.ellipse, { x: cx - 0.24, y: ly - 0.24, w: 0.48, h: 0.48, fill: { color: col }, line: { color: T.bg, width: 3 } });
          const bw = Math.min(2.9, n > 1 ? (x1 - x0) / (n - 1) - 0.15 : 4);
          s.addText(clampTxt(p.label, 18), hd({ x: cx - bw / 2, y: ly - 1.0, w: bw, h: 0.55, fontSize: 18, color: col, align: 'center', valign: 'bottom' }));
          s.addText(clampTxt(p.title, 40), hd({ x: cx - bw / 2, y: ly + 0.45, w: bw, h: 0.7, fontSize: 16, align: 'center' }));
          if (p.text) s.addText(clampTxt(p.text, 120), tx({ x: cx - bw / 2, y: ly + 1.2, w: bw, h: 1.6, fontSize: 13, color: T.muted, align: 'center' }));
        });
      } else if (lay === 'imagetext' || lay === 'visual') {
        const vw = 4.9, vx = rtl ? W - 0.75 - vw : 0.75, txX = rtl ? 0.75 : 0.75 + vw + 0.5, txW = W - 1.5 - vw - 0.5;
        const vis = sl.visual || {};
        s.addShape(S.roundRect, { x: vx, y, w: vw, h: bodyH, rectRadius: 0.18, fill: { color: T.primary }, line: { type: 'none' } });
        s.addShape(S.ellipse, { x: vx + vw - 2.2, y: y - 0.6, w: 2.8, h: 2.8, fill: { color: T.onPrimary, transparency: 88 }, line: { type: 'none' } });
        s.addShape(S.ellipse, { x: vx - 0.5, y: y + bodyH - 1.6, w: 2.2, h: 2.2, fill: { color: T.accent, transparency: 35 }, line: { type: 'none' } });
        s.addText(String(vis.emoji || sl.icon || '✦').slice(0, 4), tx({ x: vx, y: y + 0.4, w: vw, h: bodyH - 1.5, fontSize: 96, align: 'center', valign: 'middle', color: T.onPrimary, fit: undefined }));
        if (vis.caption) s.addText(clampTxt(vis.caption, 70), tx({ x: vx + 0.3, y: y + bodyH - 1.0, w: vw - 0.6, h: 0.7, fontSize: 15, bold: true, color: T.onPrimary, align: 'center', valign: 'middle' }));
        const its = bullets.length ? bullets : [sl.subtitle, sl.takeaway, vis.caption].filter(Boolean).map((b) => clampTxt(b, 150));
        rows(s, its, txX, y + 0.1, txW, bodyH - 0.1);
      } else {
        rows(s, bullets, 0.75, y + 0.1, W - 1.5, bodyH - 0.1);
      }
      footer(s); notes(s, sl);
    });

    function rows(s, items, x, y, w, h) {
      if (!items.length) return;
      const n = items.length, gap = 0.22, rh = Math.min(n <= 2 ? 1.7 : 1.4, (h - gap * (n - 1)) / n);
      const y0 = y + Math.max(0, (h - (n * rh + (n - 1) * gap)) / 2);
      items.forEach((b, i) => {
        const yy = y0 + i * (rh + gap);
        const [lead, rest] = splitLead(b);
        const col = i % 2 ? T.accent : T.primary;
        card(s, x, yy, w, rh, { shadow: undefined });
        s.addShape(S.rect, { x: rtl ? x + w - 0.1 : x, y: yy, w: 0.1, h: rh, fill: { color: col }, line: { type: 'none' } });
        s.addText(String(i + 1), hd({ x: rtl ? x + w - 0.95 : x + 0.25, y: yy, w: 0.6, h: rh, fontSize: 22, color: col, align: 'center', valign: 'middle' }));
        const parts = lead ? [{ text: lead + '  ', options: { bold: true, color: T.text, fontFace: T.head } }, { text: rest, options: { color: T.muted } }] : [{ text: rest, options: { color: T.text } }];
        s.addText(parts, tx({ x: rtl ? x + 0.3 : x + 1.0, y: yy, w: w - 1.3, h: rh, fontSize: sizeFor(b, n <= 2 ? 20 : 18, 13.5, 120), valign: 'middle' }));
      });
    }

    // ---------- closing ----------
    if (spec.closing !== false) {
      const s = base(99, { bg: T.dark ? T.surface : T.primary, noMotif: true });
      const on = T.dark ? T.text : T.onPrimary;
      s.addShape(S.ellipse, { x: -1.6, y: -1.6, w: 5, h: 5, fill: { color: T.accent, transparency: 70 }, line: { type: 'none' } });
      s.addShape(S.ellipse, { x: W - 3.4, y: H - 3.0, w: 4.6, h: 4.6, fill: { color: T.primary, transparency: T.dark ? 40 : 80 }, line: { type: 'none' } });
      const c = spec.closingSlide || {};
      s.addText(clampTxt(c.title || (rtl ? 'תודה!' : 'Thank you'), 60), hd({ x: 1.2, y: 2.0, w: W - 2.4, h: 1.5, fontSize: 54, color: on, align: 'center', valign: 'middle' }));
      if (c.subtitle || spec.takeaway) s.addText(clampTxt(c.subtitle || spec.takeaway, 180), tx({ x: 1.8, y: 3.6, w: W - 3.6, h: 1.1, fontSize: 20, color: on, align: 'center' }));
      s.addText(opts.byline || 'Made with Lokizenith AI', tx({ x: 1.2, y: H - 1.0, w: W - 2.4, h: 0.35, fontSize: 11, color: mix(on, T.bg, 0.4), align: 'center' }));
      if (c.notes) s.addNotes(String(c.notes));
    }
    pptx._lzTheme = T;
    return pptx;
  }

  const THEME_IDS = Object.keys(THEMES);
  const PLAN_PROMPT = (count) => `You are an award-winning presentation designer and storyteller. Plan a ${count}-slide deck (excluding the cover and closing slides) for the user's request, written in the SAME language as the user.
Design a UNIQUE visual identity that fits the topic: pick the closest base theme, then tune the palette (hex colors) and font pairing to the topic's mood.
Return ONLY JSON:
{"title":"","subtitle":"","kicker":"2-4 word eyebrow","icon":"one emoji for the topic",
 "design":{"theme":"one of ${THEME_IDS.join('|')}","mood":"3-5 words","palette":{"bg":"#hex","surface":"#hex","primary":"#hex","accent":"#hex","text":"#hex","muted":"#hex"},"fonts":{"heading":"one of ${SAFE_FONTS.slice(0, 22).join('|')}","body":"one of Calibri|Segoe UI|Arial|Verdana|Gill Sans MT|Corbel|Tahoma"},"motif":"one of ${MOTIFS.join('|')}"},
 "slides":[{"layout":"agenda|section|bullets|two|comparison|imagetext|stats|quote|timeline|big","kicker":"1-3 word eyebrow","title":"REQUIRED 3-8 word slide title",
   "bullets":["Short bold phrase: one crisp supporting line (max 18 words)"],
   "stats":[{"value":"72%","label":""}],"takeaway":"",
   "quote":"","author":"",
   "left":{"heading":"","bullets":[]},"right":{"heading":"","bullets":[]},
   "steps":[{"label":"2019","title":"","text":""}],
   "visual":{"emoji":"","caption":""},
   "statement":"","subtitle":"",
   "notes":"2-4 sentences of natural speaker notes"}],
 "closingSlide":{"title":"","subtitle":"one-line key takeaway or call to action"},
 "summary":"2 short sentences describing the deck"}
LAYOUT FIELDS (fill the fields the layout needs, omit the rest):
- agenda: bullets (3-6 section names). section: title + subtitle. bullets: 3-4 bullets.
- two / comparison: left {heading, 3 bullets} AND right {heading, 3 bullets} (required).
- imagetext: visual {emoji, caption} + 2-4 bullets. stats: 3-4 stats {value, label} + takeaway.
- timeline: 3-6 steps {label (year/phase), title, text}. quote: quote + author. big: statement + subtitle.
Example bullet: "Personalized pacing: AI adapts every lesson to each student's level."
RULES: slide 1 is an agenda. Use a rich mix: 1-2 section dividers, at least one stats (real, sourced-sounding numbers only if you are confident; otherwise qualitative), one timeline or comparison, one imagetext, one big statement or quote. Max 4 bullets per slide, each "Lead: detail". No walls of text. Palette must have strong text/background contrast. Every slide needs notes.`;

  const api = { buildDeck, resolveTheme, THEMES, SAFE_FONTS, MOTIFS, PLAN_PROMPT, contrast };
  root.LZDeck = api;
})(typeof window !== 'undefined' ? window : globalThis);
