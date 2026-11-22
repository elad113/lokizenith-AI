/* Lokizenith — extra animated backgrounds.
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

/* 9. Starfield — calm parallax night sky with twinkles and rare meteors */
A.registerBackground('starfield', {name: 'Starfield',
  init(e){ const s = e.state, n = cnt(e, 180); s.n = n; s.x = new Float32Array(n); s.y = new Float32Array(n); s.z = new Float32Array(n); s.ph = new Float32Array(n);
    for (let i = 0; i < n; i++){ s.x[i] = R() * e.W; s.y[i] = R() * e.H; s.z[i] = .35 + R() * 1.8; s.ph[i] = R() * TAU; }
    s.mx = -1; s.my = 0; s.mvx = 0; s.mvy = 0; s.mlife = 0; },
  draw(e){ const {ctx, W, H, t, state: s} = e; ctx.fillStyle = 'rgba(2,5,10,0.42)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#dff6ff';
    for (let i = 0; i < s.n; i++){ s.x[i] += .015 * s.z[i]; if (s.x[i] > W + 2) s.x[i] = -2;
      const tw = .35 + .65 * Math.max(0, Math.sin(t * .04 + s.ph[i])); if (tw < .12) continue;
      ctx.globalAlpha = tw * .7 * Math.min(1.3, e.k); const r = .5 + s.z[i] * .7;
      ctx.beginPath(); ctx.arc(s.x[i], s.y[i], r, 0, TAU); ctx.fill();
      if (s.z[i] > 1.6 && tw > .85){ ctx.globalAlpha = tw * .18; ctx.beginPath(); ctx.arc(s.x[i], s.y[i], r * 3.2, 0, TAU); ctx.fill(); } }
    ctx.globalAlpha = 1;
    if (s.mlife <= 0 && !e.perf && R() < .008){ s.mx = R() * W * .7; s.my = R() * H * .45; s.mvx = 8 + R() * 7; s.mvy = 3 + R() * 4; s.mlife = 22 + R() * 10; }
    if (s.mlife > 0){ const a = Math.min(1, s.mlife / 8) * .85; ctx.strokeStyle = `rgba(220,245,255,${a})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(s.mx, s.my); ctx.lineTo(s.mx - s.mvx * 2.2, s.my - s.mvy * 2.2); ctx.stroke();
      s.mx += s.mvx; s.my += s.mvy; s.mlife--; } }});

/* 10. Nebula — slow color clouds of gas */
A.registerBackground('nebula', {name: 'Nebula',
  init(e){ const n = e.perf ? 5 : 7; e.state.c = Array.from({length: n}, (_, i) => ({
      x: R() * e.W, y: R() * e.H, r: Math.max(e.W, e.H) * (.18 + R() * .22),
      vx: (R() - .5) * .18, vy: (R() - .5) * .18, ph: R() * TAU,
      col: i % 3 === 0 ? e.rgb : i % 3 === 1 ? '140,90,255' : '40,180,255'
    })); },
  draw(e){ const {ctx, W, H, t, state: s} = e; ctx.fillStyle = '#05030c'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const c of s.c){ c.x += c.vx; c.y += c.vy; if (c.x < -c.r) c.x = W + c.r; else if (c.x > W + c.r) c.x = -c.r; if (c.y < -c.r) c.y = H + c.r; else if (c.y > H + c.r) c.y = -c.r;
      const a = (.07 + .05 * Math.sin(t * .015 + c.ph)) * Math.min(1.4, e.k); const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      g.addColorStop(0, `rgba(${c.col},${(a * 1.6).toFixed(3)})`); g.addColorStop(.45, `rgba(${c.col},${(a * .55).toFixed(3)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(8,4,16,0.12)'; ctx.fillRect(0, 0, W, H); }});

/* 11. Liquid — morphing soft blobs */
A.registerBackground('liquid', {name: 'Liquid',
  init(e){ const n = e.perf ? 5 : 7; e.state.b = Array.from({length: n}, () => ({
      x: R() * e.W, y: R() * e.H, r: 70 + R() * 110, vx: (R() - .5) * .7, vy: (R() - .5) * .7, ph: R() * TAU
    })); },
  draw(e){ const {ctx, W, H, t, state: s} = e; ctx.fillStyle = 'rgba(3,10,8,0.4)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of s.b){ b.x += b.vx; b.y += b.vy; if (b.x < 0 || b.x > W) b.vx *= -1; if (b.y < 0 || b.y > H) b.vy *= -1;
      const rr = b.r * (1 + .08 * Math.sin(t * .03 + b.ph)); const a = .16 * Math.min(1.5, e.k);
      const g = ctx.createRadialGradient(b.x - rr * .15, b.y - rr * .15, rr * .05, b.x, b.y, rr);
      g.addColorStop(0, `rgba(200,255,230,${(a * 1.1).toFixed(3)})`); g.addColorStop(.35, rgba(e, a)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over'; }});

/* 12. Synthwave — neon sun over a retro perspective grid */
A.registerBackground('synthwave', {name: 'Synthwave',
  init(e){ const {ctx, W, H} = e, hy = H * .56; e.state.hy = hy;
    const sky = ctx.createLinearGradient(0, 0, 0, hy); sky.addColorStop(0, '#080016'); sky.addColorStop(.55, '#2a0850'); sky.addColorStop(1, '#4a1030'); e.state.sky = sky;
    const sun = ctx.createLinearGradient(0, hy - H * .28, 0, hy); sun.addColorStop(0, 'rgba(255,90,180,.95)'); sun.addColorStop(.55, 'rgba(255,180,80,.85)'); sun.addColorStop(1, 'rgba(255,80,200,.2)'); e.state.sun = sun; },
  draw(e){ const {ctx, W, H, t, state: s} = e, hy = s.hy, cx = W / 2;
    ctx.fillStyle = s.sky; ctx.fillRect(0, 0, W, hy); ctx.fillStyle = '#05010c'; ctx.fillRect(0, hy, W, H - hy);
    const r = Math.min(W, H) * .2; ctx.save(); ctx.beginPath(); ctx.arc(cx, hy, r, Math.PI, 0); ctx.fillStyle = s.sun; ctx.globalAlpha = .7 * Math.min(1.3, e.k); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#05010c'; for (let i = 0; i < 7; i++){ const yy = hy - r * (.1 + i * .13); ctx.fillRect(cx - r, yy, r * 2, 2 + i); } ctx.restore();
    ctx.strokeStyle = `rgba(255,70,200,${.42 * Math.min(1.3, e.k)})`; ctx.lineWidth = 1.15; ctx.beginPath();
    for (let i = -16; i <= 16; i++){ ctx.moveTo(cx + i * 16, hy); ctx.lineTo(cx + i * W * .18, H + 20); }
    const off = (t * .014) % 1; for (let j = 0; j < 16; j++){ const z = (j + off) / 16, y = hy + (H - hy) * z * z; ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke(); ctx.strokeStyle = `rgba(80,240,255,${.7 * Math.min(1.3, e.k)})`; ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke(); }});

/* 13. Constellation — drifting stars linked into a network */
A.registerBackground('constellation', {name: 'Constellation',
  init(e){ const n = cnt(e, 56); e.state.n = n; e.state.x = new Float32Array(n); e.state.y = new Float32Array(n); e.state.vx = new Float32Array(n); e.state.vy = new Float32Array(n);
    for (let i = 0; i < n; i++){ e.state.x[i] = R() * e.W; e.state.y[i] = R() * e.H; e.state.vx[i] = (R() - .5) * .22; e.state.vy[i] = (R() - .5) * .22; } },
  draw(e){ const {ctx, W, H, state: s} = e; ctx.fillStyle = '#04070c'; ctx.fillRect(0, 0, W, H);
    const maxd = Math.min(W, H) * (e.perf ? .22 : .28), maxd2 = maxd * maxd;
    ctx.lineWidth = 1;
    for (let i = 0; i < s.n; i++){ s.x[i] += s.vx[i]; s.y[i] += s.vy[i]; if (s.x[i] < 0 || s.x[i] > W) s.vx[i] *= -1; if (s.y[i] < 0 || s.y[i] > H) s.vy[i] *= -1; }
    ctx.beginPath();
    for (let i = 0; i < s.n; i++) for (let j = i + 1; j < s.n; j++){ const dx = s.x[i] - s.x[j], dy = s.y[i] - s.y[j], d = dx * dx + dy * dy; if (d < maxd2){ ctx.moveTo(s.x[i], s.y[i]); ctx.lineTo(s.x[j], s.y[j]); } }
    ctx.strokeStyle = rgba(e, .22 * Math.min(1.3, e.k)); ctx.stroke();
    ctx.fillStyle = rgba(e, .75 * Math.min(1.3, e.k)); ctx.beginPath();
    for (let i = 0; i < s.n; i++){ ctx.moveTo(s.x[i] + 1.8, s.y[i]); ctx.arc(s.x[i], s.y[i], 1.6, 0, TAU); }
    ctx.fill(); }});

/* 14. Plasma — low-res sine color field, scaled up cheaply */
A.registerBackground('plasma', {name: 'Plasma',
  init(e){ const s = e.state; s.cw = e.perf ? 64 : 96; s.ch = Math.max(36, Math.round(s.cw * e.H / Math.max(1, e.W)));
    s.cv = document.createElement('canvas'); s.cv.width = s.cw; s.cv.height = s.ch; s.ctx = s.cv.getContext('2d', {alpha:false}); s.img = s.ctx.createImageData(s.cw, s.ch); },
  draw(e){ const {t, state: s} = e, d = s.img.data, cw = s.cw, ch = s.ch, [r0, g0, b0] = e.rgb.split(',').map(Number);
    const t1 = t * .04, t2 = t * .027;
    for (let y = 0, i = 0; y < ch; y++){ const yn = y / ch;
      for (let x = 0; x < cw; x++, i += 4){ const xn = x / cw; const v = .5 + .5 * Math.sin(xn * 6.2 + t1) * Math.cos(yn * 5.1 - t2) + .25 * Math.sin((xn + yn) * 8 + t1 * .7);
        const k = Math.max(0, Math.min(1, v)); d[i] = (r0 * k + 20) | 0; d[i + 1] = (g0 * k + 8) | 0; d[i + 2] = (b0 * k + 40 * (1 - k)) | 0; d[i + 3] = 255; } }
    s.ctx.putImageData(s.img, 0, 0); e.ctx.imageSmoothingEnabled = true; e.ctx.drawImage(s.cv, 0, 0, e.W, e.H); }});

/* 15. Embers — rising sparks and ash */
A.registerBackground('embers', {name: 'Embers',
  init(e){ const n = cnt(e, 90); e.state.n = n; e.state.x = new Float32Array(n); e.state.y = new Float32Array(n); e.state.vy = new Float32Array(n); e.state.sz = new Float32Array(n); e.state.ph = new Float32Array(n);
    for (let i = 0; i < n; i++){ e.state.x[i] = R() * e.W; e.state.y[i] = R() * e.H; e.state.vy[i] = .4 + R() * 1.3; e.state.sz[i] = .8 + R() * 2.4; e.state.ph[i] = R() * TAU; } },
  draw(e){ const {ctx, W, H, t, state: s} = e; ctx.fillStyle = 'rgba(8,3,1,0.32)'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < s.n; i++){ s.y[i] -= s.vy[i]; s.x[i] += Math.sin(t * .03 + s.ph[i]) * .45; if (s.y[i] < -8){ s.y[i] = H + 8; s.x[i] = R() * W; }
      const flick = .4 + .6 * Math.max(0, Math.sin(t * .08 + s.ph[i])); const a = flick * .45 * Math.min(1.4, e.k);
      ctx.fillStyle = i % 5 === 0 ? `rgba(255,220,140,${a})` : `rgba(255,120,40,${a})`;
      ctx.beginPath(); ctx.arc(s.x[i], s.y[i], s.sz[i], 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over'; }});

/* 16. Ripples — expanding rings on dark water */
A.registerBackground('ripples', {name: 'Ripples',
  init(e){ e.state.p = []; e.state.next = 0; },
  draw(e){ const {ctx, W, H, t, state: s} = e; ctx.fillStyle = 'rgba(2,8,12,0.28)'; ctx.fillRect(0, 0, W, H);
    if (t >= s.next){ s.p.push({x: R() * W, y: R() * H, t0: t}); s.next = t + (e.perf ? 28 : 16) + R() * 20; if (s.p.length > 8) s.p.shift(); }
    ctx.lineWidth = 1.4;
    for (const p of s.p){ const age = t - p.t0, max = 140; if (age > max) continue;
      const r = age * 2.1, a = (1 - age / max) * .45 * Math.min(1.4, e.k);
      ctx.strokeStyle = rgba(e, a); ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
      if (age > 10){ ctx.strokeStyle = rgba(e, a * .45); ctx.beginPath(); ctx.arc(p.x, p.y, r * .62, 0, TAU); ctx.stroke(); } } }});

/* 17. Emerald Neural — obsidian-emerald neural lattice with synaptic light pulses */
A.registerBackground('emerald-neural', {name: 'Emerald Neural',
  init(e){
    const n = cnt(e, 48), s = e.state;
    s.n = n;
    s.x = new Float32Array(n); s.y = new Float32Array(n);
    s.vx = new Float32Array(n); s.vy = new Float32Array(n);
    s.ph = new Float32Array(n);
    for (let i = 0; i < n; i++){
      s.x[i] = R() * e.W; s.y[i] = R() * e.H;
      s.vx[i] = (R() - .5) * .36; s.vy[i] = (R() - .5) * .36;
      s.ph[i] = R() * TAU;
    }
    s.pulses = [];
  },
  draw(e){
    const {ctx, W, H, t, state: s} = e;
    ctx.fillStyle = 'rgba(2,9,7,0.34)'; ctx.fillRect(0, 0, W, H);
    const maxd = Math.min(W, H) * (e.perf ? .22 : .27), maxd2 = maxd * maxd;
    for (let i = 0; i < s.n; i++){
      s.x[i] += s.vx[i]; s.y[i] += s.vy[i];
      if (s.x[i] < 0 || s.x[i] > W) s.vx[i] *= -1;
      if (s.y[i] < 0 || s.y[i] > H) s.vy[i] *= -1;
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(e, .19 * Math.min(1.4, e.k));
    ctx.beginPath();
    for (let i = 0; i < s.n; i++){
      for (let j = i + 1; j < s.n; j++){
        const dx = s.x[i] - s.x[j], dy = s.y[i] - s.y[j], d = dx * dx + dy * dy;
        if (d < maxd2){
          ctx.moveTo(s.x[i], s.y[i]); ctx.lineTo(s.x[j], s.y[j]);
          if (s.pulses.length < 10 && R() < 0.0012){
            s.pulses.push({a: i, b: j, p: 0, sp: .028 + R() * .03});
          }
        }
      }
    }
    ctx.stroke();
    // Traveling synaptic light pulses
    ctx.globalCompositeOperation = 'lighter';
    for (let k = s.pulses.length - 1; k >= 0; k--){
      const pu = s.pulses[k]; pu.p += pu.sp;
      if (pu.p >= 1){ s.pulses.splice(k, 1); continue; }
      const px = s.x[pu.a] + (s.x[pu.b] - s.x[pu.a]) * pu.p;
      const py = s.y[pu.a] + (s.y[pu.b] - s.y[pu.a]) * pu.p;
      ctx.fillStyle = `rgba(120,255,220,${(Math.sin(pu.p * Math.PI) * .85).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(px, py, 2.6, 0, TAU); ctx.fill();
    }
    // Glowing emerald & cyan nodes
    for (let i = 0; i < s.n; i++){
      const glow = .45 + .55 * Math.sin(t * .045 + s.ph[i]);
      ctx.fillStyle = i % 4 === 0 ? `rgba(56,225,255,${(.55 * glow).toFixed(3)})` : rgba(e, .72 * glow);
      ctx.beginPath(); ctx.arc(s.x[i], s.y[i], 1.7 + glow * 1.1, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }});

/* 18. Prism Silk — volumetric obsidian-emerald & teal silk ribbons */
A.registerBackground('prism-silk', {name: 'Prism Silk',
  init(e){
    e.state.ribbons = [0, 1, 2, 3, 4].map(i => ({
      y: e.H * (.16 + i * .17),
      amp: 28 + i * 11,
      freq: .0024 + i * .0006,
      sp: .009 + i * .0022,
      ph: i * 1.4,
      cyan: i % 2 === 1
    }));
  },
  draw(e){
    const {ctx, W, H, t, state: s} = e;
    ctx.fillStyle = 'rgba(2,8,6,0.34)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const r of s.ribbons){
      const a = .13 * Math.min(1.4, e.k);
      ctx.strokeStyle = r.cyan ? `rgba(0,224,255,${(a * 1.8).toFixed(3)})` : rgba(e, a * 2.2);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = 0; x <= W + 18; x += 18){
        const y = r.y + Math.sin(x * r.freq + t * r.sp + r.ph) * r.amp + Math.cos(x * r.freq * 1.8 - t * r.sp * .8) * (r.amp * .45);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.lineTo(W + 18, H); ctx.lineTo(0, H); ctx.closePath();
      const grad = ctx.createLinearGradient(0, r.y - r.amp, 0, r.y + 150);
      grad.addColorStop(0, r.cyan ? `rgba(0,215,255,${(a * .85).toFixed(3)})` : rgba(e, a));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad; ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }});

/* 19. Quantum Grid — undulating emerald cyber-wave perspective mesh */
A.registerBackground('quantum-grid', {name: 'Quantum Grid',
  init(e){ e.state.rows = e.perf ? 10 : 15; e.state.cols = e.perf ? 14 : 22; },
  draw(e){
    const {ctx, W, H, t, state: s} = e;
    ctx.fillStyle = '#020806'; ctx.fillRect(0, 0, W, H);
    const hy = H * .36;
    ctx.lineWidth = 1;
    for (let r = 0; r < s.rows; r++){
      const z = (r + ((t * .02) % 1)) / s.rows;
      const yBase = hy + Math.pow(z, 1.85) * (H - hy + 30);
      const alpha = Math.min(1, z * 1.1) * .36 * Math.min(1.4, e.k);
      ctx.strokeStyle = r % 3 === 0 ? `rgba(0,225,255,${(alpha * .85).toFixed(3)})` : rgba(e, alpha);
      ctx.beginPath();
      for (let c = 0; c <= s.cols; c++){
        const u = c / s.cols;
        const spread = .4 + z * .9;
        const x = W * .5 + (u - .5) * W * spread;
        const wave = Math.sin(u * 9 + t * .045 + r * .55) * (6 + z * 18);
        const y = yBase + wave;
        c ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }});

/* 20. Zenith Rings — concentric orbital emerald rings echoing the Lokizenith emblem */
A.registerBackground('zenith-rings', {name: 'Zenith Rings',
  init(e){
    e.state.rings = Array.from({length: e.perf ? 5 : 8}, (_, i) => ({
      r: 75 + i * 68,
      sp: (i % 2 ? -1 : 1) * (.004 + i * .0014),
      arc: .9 + R() * 1.5,
      ph: R() * TAU,
      cyan: i % 3 === 1
    }));
  },
  draw(e){
    const {ctx, W, H, t, state: s} = e;
    const cx = W * .56, cy = H * .48, sc = Math.max(W, H) / 1180;
    ctx.fillStyle = 'rgba(2,8,6,0.3)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const o of s.rings){
      const r = o.r * sc;
      const a0 = o.ph + t * o.sp;
      ctx.strokeStyle = o.cyan ? `rgba(0,220,255,${(.22 * Math.min(1.4, e.k)).toFixed(3)})` : rgba(e, .26 * Math.min(1.4, e.k));
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + o.arc); ctx.stroke();
      // Orbiting energy node at arc tip
      const nx = cx + Math.cos(a0 + o.arc) * r, ny = cy + Math.sin(a0 + o.arc) * r;
      ctx.fillStyle = o.cyan ? 'rgba(130,245,255,0.85)' : 'rgba(135,255,212,0.9)';
      ctx.beginPath(); ctx.arc(nx, ny, 2.5, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }});
})();

