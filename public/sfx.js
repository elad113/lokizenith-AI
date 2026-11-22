/* Lokizenith UI sounds (BUI-21) — original, synthesized live with WebAudio (no audio files, no
   copyrighted samples). Short, soft and throttled. Settings: lz.settings.sounds (on/off) and
   lz.settings.soundVolume (0–1). Works in the main app and on the LokiBot page.
   Made by Lokiz Studios. */
(function (root) {
  'use strict';
  // Each sound: list of notes [freqHz, startSec, durSec, type?, gain?, slideToHz?]
  const N = (f, t, d, type, g, to) => [f, t, d, type || 'sine', g == null ? 1 : g, to || 0];
  const SOUNDS = {
    send:      [N(660, 0, .09, 'sine', .8, 760), N(990, .055, .12, 'sine', .55)],
    done:      [N(523.25, 0, .16), N(659.25, .07, .16), N(783.99, .14, .26, 'sine', .9)],
    bgdone:    [N(783.99, 0, .14, 'triangle', .8), N(1046.5, .09, .16, 'triangle', .75), N(1318.5, .19, .34, 'sine', .7), N(1567.98, .19, .34, 'sine', .25)],
    start:     [N(440, 0, .12, 'sine', .45, 520)],
    click:     [N(1200, 0, .035, 'triangle', .5)],
    chip:      [N(880, 0, .06, 'triangle', .6), N(1320, .04, .08, 'sine', .45)],
    toggleOn:  [N(620, 0, .06, 'triangle', .55), N(930, .045, .08, 'triangle', .5)],
    toggleOff: [N(930, 0, .06, 'triangle', .5), N(620, .045, .08, 'triangle', .45)],
    menu:      [N(740, 0, .05, 'sine', .45, 880)],
    close:     [N(700, 0, .06, 'sine', .4, 520)],
    newchat:   [N(392, 0, .1, 'sine', .55, 523), N(784, .07, .14, 'sine', .45)],
    error:     [N(330, 0, .14, 'triangle', .7, 290), N(247, .12, .2, 'triangle', .6, 220)],
    image:     [N(523.25, 0, .12, 'sine', .6), N(783.99, .06, .14, 'sine', .6), N(1046.5, .12, .16, 'sine', .55), N(1567.98, .18, .3, 'triangle', .35)],
    calc:      [N(1046.5, 0, .045, 'sine', .35)],
    saved:     [N(659.25, 0, .08, 'sine', .6), N(987.77, .06, .16, 'sine', .55)],
    copy:      [N(1318.5, 0, .05, 'triangle', .45), N(1760, .04, .06, 'sine', .35)],
    botReply:  [N(587.33, 0, .09, 'sine', .55), N(880, .06, .12, 'sine', .45)],
    stepDone:  [N(698.46, 0, .07, 'triangle', .5), N(1046.5, .05, .1, 'triangle', .45)],
    mission:   [N(523.25, 0, .14), N(659.25, .1, .14), N(783.99, .2, .14), N(1046.5, .3, .42, 'triangle', .85)],
    computer:  [N(220, 0, .18, 'sawtooth', .18, 440), N(660, .14, .1, 'sine', .5), N(880, .22, .16, 'sine', .45)],
  };
  // Minimum gap per kind (ms) so bursts never turn into noise.
  const GAP = { calc: 140, click: 60, chip: 120, botReply: 900, stepDone: 500, menu: 90, toggleOn: 80, toggleOff: 80, copy: 150, start: 400 };
  let ctx = null, master = null;
  const last = Object.create(null);
  let lastAny = 0;

  function settings() {
    try { return JSON.parse(root.localStorage.getItem('lz.settings') || '{}') || {}; } catch (_) { return {}; }
  }
  function enabled() { const s = settings(); return s.sounds !== false; }
  function volume() {
    const v = Number(settings().soundVolume);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.6;
  }
  function audio() {
    const C = root.AudioContext || root.webkitAudioContext;
    if (!C) return null;
    if (!ctx) { ctx = new C(); master = ctx.createGain(); master.connect(ctx.destination); }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  /** Should `kind` play now? Pure helper (exported for tests). */
  function allow(kind, now, lastMap, lastAnyTs) {
    const gap = GAP[kind] == null ? 70 : GAP[kind];
    if (now - (lastMap[kind] || 0) < gap) return false;
    if (kind !== 'bgdone' && kind !== 'error' && now - lastAnyTs < 35) return false;
    return true;
  }
  function play(kind, opts) {
    if (!SOUNDS[kind]) kind = 'click';
    if (!(opts && opts.force) && !enabled()) return false;
    if (typeof document !== 'undefined' && document.hidden && kind !== 'bgdone') return false;
    const now = Date.now();
    if (!allow(kind, now, last, lastAny)) return false;
    last[kind] = now; lastAny = now;
    const a = audio();
    if (!a) return false;
    const vol = (opts && opts.volume != null ? opts.volume : volume()) * 0.09;
    if (vol <= 0) return false;
    try {
      master.gain.value = 1;
      const t0 = a.currentTime + 0.005;
      for (const [f, st, d, type, g, to] of SOUNDS[kind]) {
        const o = a.createOscillator(), gn = a.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t0 + st);
        if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + st + d);
        const peak = Math.max(0.0002, vol * g);
        gn.gain.setValueAtTime(0.0001, t0 + st);
        gn.gain.exponentialRampToValueAtTime(peak, t0 + st + 0.012);
        gn.gain.exponentialRampToValueAtTime(0.0001, t0 + st + d);
        o.connect(gn); gn.connect(master);
        o.start(t0 + st); o.stop(t0 + st + d + 0.03);
      }
      return true;
    } catch (_) { return false; }
  }
  const api = { play, allow, kinds: Object.keys(SOUNDS), enabled, volume, GAP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LZSfx = api;
})(typeof window !== 'undefined' ? window : globalThis);
