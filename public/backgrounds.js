/* Lokizenith v2.2 — 8 extra animated backgrounds.
   They plug into the app's background engine (App.registerBackground), so they inherit its
   performance rules: reduced internal resolution (device pixel ratio capped/ignored), ~30 fps
   (15 in performance mode), and a full stop while the tab is hidden or "Reduce motion" is on. */
(function(){
'use strict';
const A = window.App; if (!A || !A.registerBackground) return;
const R = Math.random, TAU = Math.PI * 2;
const BGC = '#030806';
const cnt = (e, base) => Math.max(8, Math.round(base * Math.min(1.6, e.k) * (e.perf ? .55 : 1) * Math.max(.45, Math.min(e.W * e.H / 1e6, 2))));
const rgba = (e, a) => `rgba(${e.rgb},${a.toFixed(3)})`;

/* 1. Aurora — slow curtains of light */
A.registerBackground('aurora', {name: 'Aurora',
  init(e){ const s = e.state; s.bands = [0, 1, 2, 3].map(i => ({y: e.H * (.18 + i * .12), amp: 30 + R() * 50, f: .002 + R() * .002, sp: .006 + R() * .01, ph: R() * 9, hue: i})); s.g = s.bands.map((b, i) => { const g = e.ctx.createLinearGradient(0, b.y - 160, 0, b.y + 120); const a = .12 * Math.min(1.5, e.k); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.55, i % 2 ? `rgba(80,200,255,${a * .7})` : rgba(e, a)); g.addColorStop(1, 'rgba(0,0,0,0)'); return g; }); },
  draw(e){ const {ctx, W, H, t, state: s} = e; ctx.fillStyle = 'rgba(3,8,6,0.35)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    s.bands.forEach((b, i) => { ctx.fillStyle = s.g[i]; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + 20; x += 20){ const y = b.y + Math.sin(x * b.f + t * b.sp + b.ph) * b.amp + Math.sin(x * b.f * 2.3 - t * b.sp * 1.7) * b.amp * .4; ctx.lineTo(x, y - 140); }
      for (let x = W + 20; x >= 0; x -= 20){ const y = b.y + Math.sin(x * b.f + t * b.sp + b.ph) * b.amp + Math.sin(x * b.f * 2.3 - t * b.sp * 1.7) * b.amp * .4; ctx.lineTo(x, y + 60); }
      ctx.closePath(); ctx.fill(); });
    ctx.globalCompositeOperation = 'source-over'; }});

/* 2. Warp — a starfield rushing past */
A.registerBackground('warp', {name: 'Warp',
  init(e){ const n = cnt(e, 260), s = e.state; s.n = n; s.x = new Float32Array(n); s.y = new Float32Array(n); s.z = new Float32Array(n); for (let i = 0; i < n; i++){ s.x[i] = (R() - .5) * 2; s.y[i] = (R() - .5) * 2; s.z[i] = R(); } },
  draw(e){ const {ctx, W, H, state: s} = e, cx = W / 2, cy = H / 2, f = Math.max(W, H) * .5;
    ctx.fillStyle = 'rgba(3,8,6,0.4)'; ctx.fillRect(0, 0, W, H); ctx.lineCap = 'round';
    for (let b = 0; b < 3; b++){ ctx.strokeStyle = b === 2 ? 'rgba(220,255,240,.75)' : rgba(e, .25 + b * .25); ctx.lineWidth = .8 + b * .7; ctx.beginPath();
      for (let i = b; i < s.n; i += 3){ const z0 = s.z[i]; s.z[i] -= .006 * (1 + (1 - z0) * 2); if (s.z[i] < .02){ s.z[i] = 1; s.x[i] = (R() - .5) * 2; s.y[i] = (R() - .5) * 2; continue; }
        const x1 = cx + s.x[i] / z0 * f * .35, y1 = cy + s.y[i] / z0 * f * .35, x2 = cx + s.x[i] / s.z[i] * f * .35, y2 = cy + s.y[i] / s.z[i] * f * .35; ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
      ctx.stroke(); } }});

/* 3. Bokeh — soft out-of-focus lights drifting upward */
A.registerBackground('bokeh', {name: 'Bokeh',
  init(e){ const s = e.state, n = Math.min(60, cnt(e, 34)); s.p = Array.from({length: n}, () => ({x: R() * e.W, y: R() * e.H, r: 10 + R() * 46, vy: .15 + R() * .45, vx: (R() - .5) * .2, a: .04 + R() * .12, ph: R() * TAU, c: R() < .25 ? '120,200,255' : R() < .15 ? '255,220,140' : e.rgb})); },
  draw(e){ const {ctx, W, H, t, state: s} = e; ctx.fillStyle = BGC; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
    for (const p of s.p){ p.y -= p.vy; p.x += p.vx + Math.sin(t * .01 + p.ph) * .2; if (p.y < -p.r){ p.y = H + p.r; p.x = R() * W; }
      const a = p.a * (.7 + .3 * Math.sin(t * .03 + p.ph)) * Math.min(1.6, e.k); ctx.fillStyle = `rgba(${p.c},${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(${p.c},${(a * 1.4).toFixed(3)})`; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over'; }});

/* 4. Waves — layered glowing ocean lines */
A.registerBackground('waves', {name: 'Waves',
  init(e){ e.state.L = Math.round(e.perf ? 9 : 14); },
  draw(e){ const {ctx, W, H, t, state: s} = e; ctx.fillStyle = BGC; ctx.fillRect(0, 0, W, H); ctx.lineWidth = 1.3;
    for (let l = 0; l < s.L; l++){ const k = l / s.L, base = H * (.45 + k * .55), amp = 10 + k * 34, a = (.05 + k * .3) * Math.min(1.3, e.k);
      ctx.strokeStyle = rgba(e, a); ctx.beginPath();
      for (let x = 0; x <= W + 16; x += 16){ const y = base + Math.sin(x * .006 + t * .03 * (1 + k) + l) * amp + Math.sin(x * .013 - t * .02 + l * 2) * amp * .35; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); } }});

/* 5. Horizon — retro perspective grid with a rising sun */
A.registerBackground('horizon', {name: 'Horizon',
  init(e){ const {ctx, W, H} = e, hy = H * .58; e.state.hy = hy; const g = ctx.createLinearGradient(0, hy - 220, 0, hy); g.addColorStop(0, 'rgba(255,90,200,.55)'); g.addColorStop(1, rgba(e, .6)); e.state.sun = g; const sky = ctx.createLinearGradient(0, 0, 0, hy); sky.addColorStop(0, BGC); sky.addColorStop(1, 'rgba(30,10,40,1)'); e.state.sky = sky; },
  draw(e){ const {ctx, W, H, t, state: s} = e, hy = s.hy, cx = W / 2;
    ctx.fillStyle = s.sky; ctx.fillRect(0, 0, W, hy); ctx.fillStyle = BGC; ctx.fillRect(0, hy, W, H - hy);
    const r = Math.min(W, H) * .18; ctx.save(); ctx.beginPath(); ctx.arc(cx, hy, r, Math.PI, 0); ctx.fillStyle = s.sun; ctx.globalAlpha = .55 * Math.min(1.4, e.k); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = BGC; for (let i = 0; i < 6; i++){ const yy = hy - r * (.12 + i * .15); ctx.fillRect(cx - r, yy, r * 2, 2 + i * .8); } ctx.restore();
    ctx.strokeStyle = rgba(e, .35 * Math.min(1.4, e.k)); ctx.lineWidth = 1; ctx.beginPath();
    for (let i = -14; i <= 14; i++){ ctx.moveTo(cx + i * 18, hy); ctx.lineTo(cx + i * W * .16, H); }
    const off = (t * .012) % 1; for (let j = 0; j < 14; j++){ const z = (j + off) / 14, y = hy + (H - hy) * z * z; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke(); ctx.strokeStyle = rgba(e, .7); ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke(); }});

/* 6. Fireflies — wandering, blinking glows */
A.registerBackground('fireflies', {name: 'Fireflies',
  init(e){ const s = e.state, n = cnt(e, 70); s.n = n; s.x = new Float32Array(n); s.y = new Float32Array(n); s.a = new Float32Array(n); s.ph = new Float32Array(n); for (let i = 0; i < n; i++){ s.x[i] = R() * e.W; s.y[i] = R() * e.H; s.a[i] = R() * TAU; s.ph[i] = R() * TAU; }
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), rg = g.createRadialGradient(16, 16, 0, 16, 16, 16); rg.addColorStop(0, 'rgba(230,255,200,1)'); rg.addColorStop(.25, `rgba(${e.rgb},.8)`); rg.addColorStop(1, `rgba(${e.rgb},0)`); g.fillStyle = rg; g.fillRect(0, 0, 32, 32); s.sprite = c; },
  draw(e){ const {ctx, W, H, t, state: s} = e; ctx.fillStyle = 'rgba(3,8,6,0.3)'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < s.n; i++){ s.a[i] += (R() - .5) * .3; s.x[i] += Math.cos(s.a[i]) * .7; s.y[i] += Math.sin(s.a[i]) * .7 - .05;
      if (s.x[i] < -20) s.x[i] = W + 20; else if (s.x[i] > W + 20) s.x[i] = -20; if (s.y[i] < -20) s.y[i] = H + 20; else if (s.y[i] > H + 20) s.y[i] = -20;
      const b = Math.max(0, Math.sin(t * .05 + s.ph[i])); if (b < .05) continue; ctx.globalAlpha = b * Math.min(1, .6 * e.k); const z = 10 + b * 14; ctx.drawImage(s.sprite, s.x[i] - z / 2, s.y[i] - z / 2, z, z); }
    ctx.globalAlpha = 1; }});

/* 7. Hex pulse — a honeycomb lit by travelling pulses */
A.registerBackground('hex', {name: 'Hex pulse',
  init(e){ const s = e.state, r = e.perf ? 34 : 26; s.r = r; s.cells = []; const w = Math.sqrt(3) * r; for (let row = -1, y = 0; y < e.H + r * 2; row++, y = row * r * 1.5) for (let x = (row & 1 ? w / 2 : 0) - w; x < e.W + w; x += w) s.cells.push([x, y]); s.p = []; s.next = 0; },
  draw(e){ const {ctx, W, H, t, state: s} = e; ctx.fillStyle = BGC; ctx.fillRect(0, 0, W, H);
    if (t >= s.next){ s.p.push({x: R() * W, y: R() * H, t0: t}); s.next = t + 40 + R() * 60; if (s.p.length > 4) s.p.shift(); }
    const r = s.r * .92; ctx.lineWidth = 1;
    const B = [[], [], [], []];
    for (const c of s.cells){ let v = 0; for (const p of s.p){ const d = Math.hypot(c[0] - p.x, c[1] - p.y), front = (t - p.t0) * 6; const dd = Math.abs(d - front); if (dd < 70) v = Math.max(v, (1 - dd / 70) * Math.max(0, 1 - front / 900)); } B[Math.min(3, v * 4 | 0)].push(c); }
    B.forEach((list, b) => { if (!list.length) return; ctx.strokeStyle = rgba(e, (.06 + b * .2) * Math.min(1.4, e.k)); ctx.fillStyle = rgba(e, b * .05); ctx.beginPath();
      for (const [x, y] of list){ for (let k = 0; k < 6; k++){ const an = Math.PI / 6 + k * Math.PI / 3, px = x + Math.cos(an) * r, py = y + Math.sin(an) * r; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); }
      if (b) ctx.fill(); ctx.stroke(); }); }});

/* 8. Orbits — a slowly turning orrery of dots */
A.registerBackground('orbits', {name: 'Orbits',
  init(e){ const s = e.state; s.rings = Array.from({length: e.perf ? 6 : 9}, (_, i) => ({r: 60 + i * 55, n: 8 + i * 5, sp: (i % 2 ? -1 : 1) * (.0025 + R() * .003) * (9 / (i + 3)), ph: R() * TAU})); },
  draw(e){ const {ctx, W, H, t, state: s} = e, cx = W * .62, cy = H * .48, sc = Math.max(W, H) / 1100;
    ctx.fillStyle = 'rgba(3,8,6,0.32)'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = rgba(e, .07); ctx.lineWidth = 1; ctx.beginPath(); for (const o of s.rings){ ctx.moveTo(cx + o.r * sc, cy); ctx.ellipse(cx, cy, o.r * sc, o.r * sc * .55, -.35, 0, TAU); } ctx.stroke();
    ctx.fillStyle = rgba(e, .55 * Math.min(1.3, e.k)); ctx.beginPath();
    for (const o of s.rings){ const a0 = o.ph + t * o.sp; for (let i = 0; i < o.n; i++){ const a = a0 + i * TAU / o.n, ex = Math.cos(a) * o.r * sc, ey = Math.sin(a) * o.r * sc * .55, x = cx + ex * Math.cos(-.35) - ey * Math.sin(-.35), y = cy + ex * Math.sin(-.35) + ey * Math.cos(-.35), z = 1.2 + (Math.sin(a) + 1) * 1.1; ctx.moveTo(x + z, y); ctx.arc(x, y, z, 0, TAU); } }
    ctx.fill(); ctx.fillStyle = rgba(e, .9); ctx.beginPath(); ctx.arc(cx, cy, 6 * sc + 3, 0, TAU); ctx.fill(); }});
})();
