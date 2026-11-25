/* ==========================================================================
   LOKIZENITH AI — INTERACTIVE 2-PLAYER GAMES ARENA (7 Games vs AI)
   Chat Game Picker Card + Floating Game Board + Live AI Commentary & Chat
   ========================================================================== */
(function () {
  'use strict';

  const GAMES = [
    {
      id: 'chess',
      nameHe: 'שחמט',
      nameEn: 'Chess',
      descHe: 'קרב אסטרטגי 8×8 מלא עם שח, מט, הצרחה והכתרה',
      descEn: 'Full 8×8 strategy with check, checkmate, castling & promotion',
      timeHe: '5–15 דק׳',
      timeEn: '5–15 min',
      catHe: 'אסטרטגיה',
      catEn: 'Strategy',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21h6"/><path d="M7 21h10l-1-3H8l-1 3z"/><path d="M9 18c0-3 1.5-5 1.5-8h3c0 3 1.5 5 1.5 8"/><path d="M9.5 10l-1.5-3 2.5 1L12 5l1.5 3L16 7l-1.5 3h-5z"/></svg>`,
    },
    {
      id: 'tictactoe',
      nameHe: 'איקס עיגול',
      nameEn: 'Tic-Tac-Toe',
      descHe: 'קלאסיקה מהירה 3×3 מול AI חד במיוחד',
      descEn: 'Fast 3×3 classic against a sharp minimax AI',
      timeHe: '1–2 דק׳',
      timeEn: '1–2 min',
      catHe: 'מהיר',
      catEn: 'Quick',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l6 6M10 4l-6 6"/><circle cx="17" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><path d="M14 14l6 6M20 14l-6 6"/></svg>`,
    },
    {
      id: 'connect4',
      nameHe: 'ארבע בשורה',
      nameEn: 'Connect Four',
      descHe: 'הפל דיסקיות ללוח 6×7 וצור רצף של 4 לפני ה-AI',
      descEn: 'Drop discs into a 6×7 board to link four first',
      timeHe: '2–5 דק׳',
      timeEn: '2–5 min',
      catHe: 'טקטיקה',
      catEn: 'Tactics',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="10" r="1.6" fill="currentColor"/><circle cx="12" cy="10" r="1.6"/><circle cx="16" cy="10" r="1.6" fill="currentColor"/><circle cx="8" cy="15" r="1.6"/><circle cx="12" cy="15" r="1.6" fill="currentColor"/><circle cx="16" cy="15" r="1.6" fill="currentColor"/></svg>`,
    },
    {
      id: 'checkers',
      nameHe: 'דמקה',
      nameEn: 'Checkers',
      descHe: 'לוח 8×8 עם אכילות חובה, שרשרת קפיצות ומלכים',
      descEn: '8×8 draughts with forced captures and king crowns',
      timeHe: '4–10 דק׳',
      timeEn: '4–10 min',
      catHe: 'לוח קלאסי',
      catEn: 'Classic',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M9 12l1.5-2 1.5 1.5L13.5 10 15 12" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    },
    {
      id: 'reversi',
      nameHe: 'רברסי (אותלו)',
      nameEn: 'Reversi (Othello)',
      descHe: 'לכוד והפוך אבני יריב כדי לכבוש את לוח 8×8',
      descEn: 'Outflank and flip opponent discs across the 8×8 board',
      timeHe: '4–8 דק׳',
      timeEn: '4–8 min',
      catHe: 'שליטה',
      catEn: 'Territory',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 3v18M3 12h18" opacity=".45"/><circle cx="8" cy="8" r="2.2" fill="currentColor"/><circle cx="16" cy="16" r="2.2" fill="currentColor"/><circle cx="16" cy="8" r="2.2"/><circle cx="8" cy="16" r="2.2"/></svg>`,
    },
    {
      id: 'battleship',
      nameHe: 'צוללות',
      nameEn: 'Battleship',
      descHe: 'קרב ימי 7×7 — אתר והטבע את צי ה-AI לפני שיטביע אותך',
      descEn: '7×7 naval duel — hunt and sink the AI fleet first',
      timeHe: '3–6 דק׳',
      timeEn: '3–6 min',
      catHe: 'קרב ימי',
      catEn: 'Naval Duel',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/></svg>`,
    },
    {
      id: 'nim',
      nameHe: 'נים אסטרטגי',
      nameEn: 'Strategic Nim',
      descHe: 'אסוף קריסטלים משורה אחת — מי שלוקח את האחרון מנצח',
      descEn: 'Take crystals from one row — take the last crystal to win',
      timeHe: '1–3 דק׳',
      timeEn: '1–3 min',
      catHe: 'מתמטיקה',
      catEn: 'Logic',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l3.5 6.5L12 16l-3.5-6.5L12 3z"/><path d="M6 12l2.2 4.2L6 20.5 3.8 16.2 6 12z"/><path d="M18 12l2.2 4.2L18 20.5l-2.2-4.3L18 12z"/></svg>`,
    },
  ];

  const SPECIFIC_RX = [
    { id: 'chess', rx: /\bchess\b|שחמט|שח-מט/i },
    { id: 'tictactoe', rx: /\btic[\s-]*tac[\s-]*toe\b|איקס[\s-]*עיגול|x[\s-]*o\b/i },
    { id: 'connect4', rx: /\bconnect[\s-]*(?:4|four)\b|ארבע\s+בשורה|4\s+בשורה/i },
    { id: 'checkers', rx: /\bcheckers?\b|\bdraughts\b|דמקה/i },
    { id: 'reversi', rx: /\breversi\b|\bothello\b|רברסי|אותלו/i },
    { id: 'battleship', rx: /\bbattleships?\b|צוללות/i },
    { id: 'nim', rx: /\bnim\b|נים/i },
  ];

  function isHebText(s) {
    return (String(s || '').match(/[\u0590-\u05FF]/g) || []).length >= 2;
  }

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function detectPrompt(text) {
    const raw = String(text || '').trim();
    if (!raw || raw.length > 220) return null;
    if (
      /\b(code|script|html|css|python|javascript|typescript|react|unity|godot|tutorial|algorithm|how\s+to\s+build|create\s+a\s+website|rules\s+of|history\s+of|who\s+invented|who\s+won|championship|grandmaster|rating)\b|תכתוב\s+קוד|בנה\s+אפליקציה|קוד\s+למשחק|תכנת|חוקי\s+המשחק|איך\s+מכינים|היסטוריה\s+של|מי\s+המציא|אליפות\s+העולם/i.test(
        raw,
      )
    ) {
      return null;
    }

    let suggestedGameId = null;
    for (const item of SPECIFIC_RX) {
      if (item.rx.test(raw)) {
        suggestedGameId = item.id;
        break;
      }
    }

    const heTrigger =
      /(?:תשחק|שחק|נשחק|לשחק|משחקים)\s*(?:איתי|אתך|איתך|ביחד|נגדך|נגדי|משחק|במשחק|שחמט|איקס|דמקה|רברסי|צוללות|ארבע|נים|משהו)?|(?:בוא|בא\s*לי|רוצה|אפשר|תציע|תפתח|תפעיל|תביא|תשים|תן\s*לי|שים\s*לי|פתח\s*לי|נעשה)\s*(?:לנו\s*)?(?:נשחק|לשחק|איזה\s*)?(?:משחק|משחקים|שחמט|דמקה|רברסי|צוללות|איקס|ארבע\s+בשורה|נים)|משחק\s+(?:נגדך|איתך|לשניים|כיף|מהיר|חדש|אסטרטגיה|קצר)|^(?:משחק|משחקים|בוא\s+נשחק|תשחק\s+איתי|שחק\s+איתי|שחמט|דמקה|רברסי|אותלו|צוללות|איקס[\s-]*עיגול|ארבע\s+בשורה|4\s+בשורה|נים)[!?.🎮♟️🎲\s]*$/i;
    const enTrigger =
      /\b(?:play\s+(?:with\s+me|against\s+me|a\s+game|some\s+games?|games|chess|tic[\s-]*tac[\s-]*toe|connect\s*(?:4|four)|checkers|draughts|reversi|othello|battleships?|nim)|let'?s\s+play|wanna\s+play|want\s+to\s+play|open\s+(?:a\s+)?games?|start\s+(?:a\s+)?games?|launch\s+(?:a\s+)?games?|give\s+me\s+a\s+game|challenge\s+you|game\s+mode|game\s+arena|two[\s-]*player\s+games?)\b|^(?:games?|play|chess|checkers|reversi|othello|battleship|tic[\s-]*tac[\s-]*toe|connect\s*(?:4|four)|nim)[!?.🎮♟️🎲\s]*$/i;

    const isDirectNamedShort = suggestedGameId && raw.length <= 48 && !/\?|מה\s+זה|what\s+is|explain|הסבר/i.test(raw);
    if (!heTrigger.test(raw) && !enTrigger.test(raw) && !isDirectNamedShort) return null;

    const lang = isHebText(raw) ? 'he' : 'en';
    const reply =
      lang === 'he'
        ? 'יאללה, אני לגמרי בעניין! בחר אחד מ-7 המשחקים לשניים נגדי למטה — ברגע שתלחץ ייפתח לך לוח משחק צף צבעוני עם טיימר, בחירת צבע וצ׳אט חי אמיתי בינינו:'
        : 'I’m in! Pick any of the 7 two-player games against me below — clicking launches a rich interactive game board with live AI conversation:';

    return { lang, reply, suggestedGameId };
  }

  /* ========================================================================
     GENTLE WEB AUDIO SYNTH SFX
     ======================================================================== */
  let audioCtx = null;
  let muted = false;

  function playSfx(kind) {
    if (muted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const tone = (freq, dur, type, vol, delay) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, now + (delay || 0));
        gain.gain.setValueAtTime(0.0001, now + (delay || 0));
        gain.gain.exponentialRampToValueAtTime(vol || 0.06, now + (delay || 0) + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (delay || 0) + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + (delay || 0));
        osc.stop(now + (delay || 0) + dur + 0.02);
      };
      if (kind === 'move') tone(440, 0.08, 'triangle', 0.045, 0);
      else if (kind === 'ai') tone(340, 0.09, 'sine', 0.04, 0);
      else if (kind === 'capture') {
        tone(520, 0.09, 'triangle', 0.06, 0);
        tone(680, 0.11, 'sine', 0.05, 0.06);
      } else if (kind === 'win') {
        tone(523, 0.12, 'triangle', 0.06, 0);
        tone(659, 0.12, 'triangle', 0.06, 0.11);
        tone(784, 0.22, 'triangle', 0.07, 0.22);
      } else if (kind === 'lose') {
        tone(340, 0.14, 'sawtooth', 0.035, 0);
        tone(255, 0.22, 'sawtooth', 0.035, 0.13);
      }
    } catch (_) {}
  }

  /* ========================================================================
     GAME PICKER CARD IN CHAT MESSAGE
     ======================================================================== */
  function renderGamePickerCard(m) {
    const isHe = m.gameLang === 'he' || isHebText(m.content || '') || (window.S && window.S.lang === 'he');
    const wrap = document.createElement('div');
    wrap.className = 'lz-games-card';
    wrap.setAttribute('dir', isHe ? 'rtl' : 'ltr');

    wrap.innerHTML = `
      <div class="lz-gc-head">
        <div class="lz-gc-title-wrap">
          <span class="lz-gc-icon-badge" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4"/><circle cx="15.5" cy="11" r="1" fill="currentColor"/><circle cx="18" cy="13" r="1" fill="currentColor"/></svg>
          </span>
          <div>
            <h3 class="lz-gc-title">${isHe ? 'זירת המשחקים של Lokizenith AI' : 'Lokizenith AI Game Arena'}</h3>
            <p class="lz-gc-sub">${isHe ? '7 משחקים לשניים נגד ה-AI · לחץ על משחק לפתיחת לוח צף + צ׳אט חי' : '7 two-player games vs AI · Tap any game to launch the floating board & live banter'}</p>
          </div>
        </div>
      </div>
      <div class="lz-gc-grid">
        ${GAMES.map(
          (g, idx) => `
          <button type="button" class="lz-gc-item" data-game-id="${g.id}" data-game="${g.id}" style="animation-delay:${idx * 40}ms">
            <span class="lz-gc-item-ic" aria-hidden="true">${g.svg}</span>
            <span class="lz-gc-item-body">
              <span class="lz-gc-item-top">
                <b>${isHe ? g.nameHe : g.nameEn}</b>
                <span class="lz-gc-meta">${isHe ? g.catHe + ' · ' + g.timeHe : g.catEn + ' · ' + g.timeEn}</span>
              </span>
              <small>${isHe ? g.descHe : g.descEn}</small>
            </span>
            <span class="lz-gc-play" aria-hidden="true">${isHe ? 'שחק ←' : 'Play →'}</span>
          </button>`,
        ).join('')}
      </div>
    `;

    wrap.querySelectorAll('.lz-gc-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const gid = btn.getAttribute('data-game-id');
        openGame(gid, { lang: isHe ? 'he' : 'en' });
      });
    });

    return wrap;
  }

  /* ========================================================================
     PURE BOARD RULES (MIRRORING src/utils/gameEngine.ts)
     ======================================================================== */
  // --- Chess ---
  const CHESS_GLYPHS = {
    K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
    k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
  };
  const CHESS_NAME_HE = { p: 'חייל', n: 'פרש', b: 'רץ', r: 'צריח', q: 'מלכה', k: 'מלך' };
  const CHESS_NAME_EN = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };
  const CHESS_VAL = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 20000 };
  const PST_P = [
    [0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[12,12,20,32,32,20,12,12],[6,6,12,27,27,12,6,6],
    [0,0,4,24,24,4,0,0],[5,-4,-8,2,2,-8,-4,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0],
  ];
  const PST_N = [
    [-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,4,4,0,-20,-40],[-30,4,14,18,18,14,4,-30],[-30,6,18,24,24,18,6,-30],
    [-30,4,16,22,22,16,4,-30],[-30,6,12,16,16,12,6,-30],[-40,-20,0,6,6,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50],
  ];
  const PST_B = [
    [-20,-10,-10,-10,-10,-10,-10,-20],[-10,4,0,0,0,0,4,-10],[-10,8,8,12,12,8,8,-10],[-10,4,12,14,14,12,4,-10],
    [-10,6,8,14,14,8,6,-10],[-10,10,10,10,10,10,10,-10],[-10,6,0,0,0,0,6,-10],[-20,-10,-10,-10,-10,-10,-10,-20],
  ];
  const PST_R = [
    [0,0,2,6,6,2,0,0],[8,12,12,12,12,12,12,8],[-4,0,0,0,0,0,0,-4],[-4,0,0,0,0,0,0,-4],
    [-4,0,0,0,0,0,0,-4],[-4,0,0,0,0,0,0,-4],[-4,0,0,0,0,0,0,-4],[0,0,4,10,10,4,0,0],
  ];
  const PST_Q = [
    [-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,6,6,6,6,0,-10],[-5,0,6,8,8,6,0,-5],
    [0,0,6,8,8,6,0,-5],[-10,4,6,6,6,6,0,-10],[-10,0,4,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20],
  ];
  const PST_KM = [
    [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[18,22,0,0,0,0,22,18],[22,32,12,0,0,12,32,22],
  ];
  const PST_KE = [
    [-40,-25,-20,-15,-15,-20,-25,-40],[-25,-10,0,4,4,0,-10,-25],[-20,0,14,20,20,14,0,-20],[-15,4,20,28,28,20,4,-15],
    [-15,4,20,28,28,20,4,-15],[-20,0,14,20,20,14,0,-20],[-25,-10,0,4,4,0,-10,-25],[-40,-25,-20,-15,-15,-20,-25,-40],
  ];
  const PASSED_PAWN_BONUS = [0, 14, 24, 42, 74, 118, 178, 0];
  const CHESS_BOOK = {
    'w:rnbqkbnr/pppppppp/......../......../......../......../PPPPPPPP/RNBQKBNR': ['e2e4', 'd2d4', 'g1f3', 'c2c4'],
    'b:rnbqkbnr/pppppppp/......../......../....P.../......../PPPP.PPP/RNBQKBNR': ['c7c5', 'e7e5', 'c7c6', 'e7e6'],
    'b:rnbqkbnr/pppppppp/......../......../...P..../......../PPP.PPPP/RNBQKBNR': ['g8f6', 'd7d5', 'e7e6'],
    'b:rnbqkbnr/pppppppp/......../......../..P...../......../PP.PPPPP/RNBQKBNR': ['e7e5', 'g8f6', 'c7c5'],
    'b:rnbqkbnr/pppppppp/......../......../......../.....N../PPPPPPPP/RNBQKB.R': ['d7d5', 'g8f6', 'c7c5'],
    'w:rnbqkbnr/pppp.ppp/......../....p.../....P.../......../PPPP.PPP/RNBQKBNR': ['g1f3', 'f1c4'],
    'b:rnbqkbnr/pppp.ppp/......../....p.../....P.../.....N../PPPP.PPP/RNBQKB.R': ['b8c6', 'g8f6'],
    'w:r.bqkbnr/pppp.ppp/..n...../....p.../....P.../.....N../PPPP.PPP/RNBQKB.R': ['f1b5', 'f1c4', 'd2d4'],
    'b:r.bqkbnr/pppp.ppp/..n...../.B..p.../....P.../.....N../PPPP.PPP/RNBQK..R': ['a7a6', 'g8f6'],
    'b:r.bqkbnr/pppp.ppp/..n...../....p.../..B.P.../.....N../PPPP.PPP/RNBQK..R': ['g8f6', 'f8c5'],
    'b:rnbqkbnr/pppp.ppp/......../....p.../..B.P.../......../PPPP.PPP/RNBQK.NR': ['g8f6', 'b8c6'],
    'b:rnbqkbnr/pppp.ppp/......../....p..Q/....P.../......../PPPP.PPP/RNB.KBNR': ['b8c6'],
    'w:rnbqkbnr/pp.ppppp/......../..p...../....P.../......../PPPP.PPP/RNBQKBNR': ['g1f3', 'b1c3'],
    'b:rnbqkbnr/pp.ppppp/......../..p...../....P.../.....N../PPPP.PPP/RNBQKB.R': ['d7d6', 'b8c6', 'e7e6'],
    'w:rnbqkbnr/pp..pppp/...p..../..p...../....P.../.....N../PPPP.PPP/RNBQKB.R': ['d2d4'],
    'w:r.bqkbnr/pp.ppppp/..n...../..p...../....P.../.....N../PPPP.PPP/RNBQKB.R': ['d2d4', 'f1b5'],
    'w:rnbqkbnr/pppp.ppp/....p.../......../....P.../......../PPPP.PPP/RNBQKBNR': ['d2d4'],
    'b:rnbqkbnr/pppp.ppp/....p.../......../...PP.../......../PPP..PPP/RNBQKBNR': ['d7d5'],
    'w:rnbqkbnr/pp.ppppp/..p...../......../....P.../......../PPPP.PPP/RNBQKBNR': ['d2d4'],
    'b:rnbqkbnr/pp.ppppp/..p...../......../...PP.../......../PPP..PPP/RNBQKBNR': ['d7d5'],
    'w:rnbqkbnr/ppp.pppp/......../...p..../...P..../......../PPP.PPPP/RNBQKBNR': ['c2c4', 'g1f3', 'c1f4'],
    'b:rnbqkbnr/ppp.pppp/......../...p..../..PP..../......../PP..PPPP/RNBQKBNR': ['e7e6', 'c7c6'],
    'w:rnbqkb.r/pppppppp/.....n../......../...P..../......../PPP.PPPP/RNBQKBNR': ['c2c4', 'g1f3', 'c1f4'],
    'b:rnbqkb.r/pppppppp/.....n../......../..PP..../......../PP..PPPP/RNBQKBNR': ['e7e6', 'g7g6'],
  };

  function in8(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
  function pCol(p) { return !p ? null : (p === p.toUpperCase() ? 'w' : 'b'); }
  function sqName(rc) { return 'abcdefgh'[rc[1]] + (8 - rc[0]); }
  function formatClock(ms) {
    const cl = Math.max(0, Math.floor(ms));
    if (cl < 10000) return '0:' + String(Math.floor(cl / 1000)).padStart(2, '0') + '.' + Math.floor((cl % 1000) / 100);
    const s = Math.ceil(cl / 1000);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function formatAlgebraic(piece, mv, afterBoard, oppCol) {
    if (mv.castleSide === 'K') return 'O-O';
    if (mv.castleSide === 'Q') return 'O-O-O';
    const t = piece.toLowerCase();
    const prefix = t === 'p' ? (mv.capture ? 'abcdefgh'[mv.from[1]] : '') : t.toUpperCase();
    const cap = mv.capture ? 'x' : '';
    const promo = mv.promotion ? '=Q' : '';
    const chk = inCheck(afterBoard, oppCol) ? '+' : '';
    return prefix + cap + sqName(mv.to) + promo + chk;
  }

  function initChess(playerSide, timerSec) {
    const pSide = playerSide === 'b' ? 'b' : 'w';
    const tSec = Number.isFinite(timerSec) ? timerSec : (session && session.chessTimerSec) || 0;
    const initMs = tSec > 0 ? tSec * 1000 : 0;
    return {
      board: [
        ['r','n','b','q','k','b','n','r'],
        ['p','p','p','p','p','p','p','p'],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['P','P','P','P','P','P','P','P'],
        ['R','N','B','Q','K','B','N','R'],
      ],
      turn: 'w',
      playerSide: pSide,
      aiSide: pSide === 'w' ? 'b' : 'w',
      castle: { wK: true, wQ: true, bK: true, bQ: true },
      enPassant: null,
      selected: null,
      lastMove: null,
      capturedByPlayer: [],
      capturedByAi: [],
      history: [],
      winner: null,
      winReason: '',
      movesCount: 0,
      evalCp: 0,
      timerSec: tSec,
      clocks: { w: initMs, b: initMs },
      clockStarted: false,
      lastTickAt: 0,
    };
  }

  function findKing(board, col) {
    const k = col === 'w' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c] === k) return [r, c];
    return null;
  }

  function isAttacked(board, r, c, by) {
    const pd = by === 'w' ? 1 : -1, pc = by === 'w' ? 'P' : 'p';
    for (const dc of [-1, 1]) if (in8(r + pd, c + dc) && board[r + pd][c + dc] === pc) return true;
    const kn = by === 'w' ? 'N' : 'n';
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      if (in8(r + dr, c + dc) && board[r + dr][c + dc] === kn) return true;
    }
    const kg = by === 'w' ? 'K' : 'k';
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if ((dr || dc) && in8(r + dr, c + dc) && board[r + dr][c + dc] === kg) return true;
    }
    const rk = by === 'w' ? 'R' : 'r', qn = by === 'w' ? 'Q' : 'q', bs = by === 'w' ? 'B' : 'b';
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let nr = r + dr, nc = c + dc;
      while (in8(nr, nc)) {
        const p = board[nr][nc];
        if (p) { if (p === rk || p === qn) return true; break; }
        nr += dr; nc += dc;
      }
    }
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let nr = r + dr, nc = c + dc;
      while (in8(nr, nc)) {
        const p = board[nr][nc];
        if (p) { if (p === bs || p === qn) return true; break; }
        nr += dr; nc += dc;
      }
    }
    return false;
  }

  function inCheck(board, col) {
    const k = findKing(board, col);
    return k ? isAttacked(board, k[0], k[1], col === 'w' ? 'b' : 'w') : false;
  }

  function applyChess(st, mv) {
    const board = st.board.map((row) => row.slice());
    const [fr, fc] = mv.from, [tr, tc] = mv.to;
    const piece = board[fr][fc];
    board[fr][fc] = '';
    if (mv.isEnPassant) board[fr][tc] = '';
    board[tr][tc] = mv.promotion || piece;
    if (mv.castleSide === 'K') { const rw = piece === 'K' ? 7 : 0; board[rw][5] = board[rw][7]; board[rw][7] = ''; }
    if (mv.castleSide === 'Q') { const rw = piece === 'K' ? 7 : 0; board[rw][3] = board[rw][0]; board[rw][0] = ''; }
    const castle = { ...st.castle };
    if (piece === 'K') { castle.wK = false; castle.wQ = false; }
    if (piece === 'k') { castle.bK = false; castle.bQ = false; }
    if ((fr === 7 && fc === 7) || (tr === 7 && tc === 7)) castle.wK = false;
    if ((fr === 7 && fc === 0) || (tr === 7 && tc === 0)) castle.wQ = false;
    if ((fr === 0 && fc === 7) || (tr === 0 && tc === 7)) castle.bK = false;
    if ((fr === 0 && fc === 0) || (tr === 0 && tc === 0)) castle.bQ = false;
    const enPassant = (piece === 'P' || piece === 'p') && Math.abs(tr - fr) === 2 ? [(fr + tr) / 2, fc] : null;
    return { ...st, board, turn: st.turn === 'w' ? 'b' : 'w', castle, enPassant };
  }

  function chessMoves(st, col) {
    const pseudo = [], enemy = col === 'w' ? 'b' : 'w', b = st.board;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (!p || pCol(p) !== col) continue;
        const t = p.toLowerCase();
        if (t === 'p') {
          const dir = col === 'w' ? -1 : 1, sr = col === 'w' ? 6 : 1, pr = col === 'w' ? 0 : 7, pp = col === 'w' ? 'Q' : 'q';
          if (in8(r + dir, c) && !b[r + dir][c]) {
            pseudo.push({ from: [r, c], to: [r + dir, c], promotion: r + dir === pr ? pp : null });
            if (r === sr && !b[r + dir * 2][c]) pseudo.push({ from: [r, c], to: [r + dir * 2, c] });
          }
          for (const dc of [-1, 1]) {
            const nr = r + dir, nc = c + dc;
            if (!in8(nr, nc)) continue;
            if (b[nr][nc] && pCol(b[nr][nc]) === enemy) {
              pseudo.push({ from: [r, c], to: [nr, nc], capture: b[nr][nc], promotion: nr === pr ? pp : null });
            } else if (st.enPassant && st.enPassant[0] === nr && st.enPassant[1] === nc) {
              const ep = b[r][nc];
              if (ep && pCol(ep) === enemy && ep.toLowerCase() === 'p') {
                pseudo.push({ from: [r, c], to: [nr, nc], capture: ep, isEnPassant: true });
              }
            }
          }
        } else if (t === 'n') {
          for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
            const nr = r + dr, nc = c + dc;
            if (in8(nr, nc) && (!b[nr][nc] || pCol(b[nr][nc]) === enemy)) pseudo.push({ from: [r, c], to: [nr, nc], capture: b[nr][nc] || null });
          }
        } else if (t === 'b' || t === 'r' || t === 'q') {
          const dirs = [];
          if (t !== 'r') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
          if (t !== 'b') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
          for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (in8(nr, nc)) {
              const tg = b[nr][nc];
              if (!tg) pseudo.push({ from: [r, c], to: [nr, nc] });
              else { if (pCol(tg) === enemy) pseudo.push({ from: [r, c], to: [nr, nc], capture: tg }); break; }
              nr += dr; nc += dc;
            }
          }
        } else if (t === 'k') {
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const nr = r + dr, nc = c + dc;
            if (in8(nr, nc) && (!b[nr][nc] || pCol(b[nr][nc]) === enemy)) pseudo.push({ from: [r, c], to: [nr, nc], capture: b[nr][nc] || null });
          }
          const hr = col === 'w' ? 7 : 0;
          if (r === hr && c === 4 && !inCheck(b, col)) {
            if ((col === 'w' ? st.castle.wK : st.castle.bK) && !b[hr][5] && !b[hr][6] && !isAttacked(b, hr, 5, enemy) && !isAttacked(b, hr, 6, enemy)) {
              pseudo.push({ from: [hr, 4], to: [hr, 6], castleSide: 'K' });
            }
            if ((col === 'w' ? st.castle.wQ : st.castle.bQ) && !b[hr][3] && !b[hr][2] && !b[hr][1] && !isAttacked(b, hr, 3, enemy) && !isAttacked(b, hr, 2, enemy)) {
              pseudo.push({ from: [hr, 4], to: [hr, 2], castleSide: 'Q' });
            }
          }
        }
      }
    }
    return pseudo.filter((mv) => !inCheck(applyChess(st, mv).board, col));
  }

  // Grandmaster Tapered Evaluation from White's perspective (+ = White better, - = Black better)
  function evalChessCp(b) {
    let mg = 0, eg = 0, wB = 0, bB = 0, phase = 0, wMat = 0, bMat = 0;
    const wPF = [0,0,0,0,0,0,0,0], bPF = [0,0,0,0,0,0,0,0];
    let wK = null, bK = null;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = b[r][c]; if (!p) continue;
      const isW = pCol(p) === 'w', t = p.toLowerCase();
      if (t === 'n' || t === 'b') phase += 1;
      else if (t === 'r') phase += 2;
      else if (t === 'q') phase += 4;
      if (t === 'p') { if (isW) wPF[c]++; else bPF[c]++; }
      else if (t === 'k') { if (isW) wK = [r, c]; else bK = [r, c]; }
      else { if (isW) wMat += CHESS_VAL[t] || 0; else bMat += CHESS_VAL[t] || 0; }
    }
    const mgP = Math.min(24, phase), egP = 24 - mgP;

    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = b[r][c]; if (!p) continue;
      const isW = pCol(p) === 'w', t = p.toLowerCase(), pr = isW ? r : 7 - r;
      const base = CHESS_VAL[t] || 0;
      let mP = 0, eP = 0;
      if (t === 'p') {
        mP = PST_P[pr][c];
        eP = PST_P[pr][c] + (6 - pr) * 4;
        let passed = true;
        if (isW) {
          for (let fc = Math.max(0, c - 1); fc <= Math.min(7, c + 1) && passed; fc++) {
            for (let rr = r - 1; rr >= 1; rr--) if (b[rr][fc] === 'p') { passed = false; break; }
          }
          if (passed) { const adv = 7 - r; mP += Math.round(PASSED_PAWN_BONUS[adv] * 0.75); eP += Math.round(PASSED_PAWN_BONUS[adv] * 1.25); }
          if (r < 7 && ((c > 0 && b[r + 1][c - 1] === 'P') || (c < 7 && b[r + 1][c + 1] === 'P'))) { mP += 10; eP += 8; }
        } else {
          for (let fc = Math.max(0, c - 1); fc <= Math.min(7, c + 1) && passed; fc++) {
            for (let rr = r + 1; rr <= 6; rr++) if (b[rr][fc] === 'P') { passed = false; break; }
          }
          if (passed) { mP += Math.round(PASSED_PAWN_BONUS[r] * 0.75); eP += Math.round(PASSED_PAWN_BONUS[r] * 1.25); }
          if (r > 0 && ((c > 0 && b[r - 1][c - 1] === 'p') || (c < 7 && b[r - 1][c + 1] === 'p'))) { mP += 10; eP += 8; }
        }
      } else if (t === 'n') { mP = PST_N[pr][c]; eP = PST_N[pr][c] - 8; }
      else if (t === 'b') { mP = PST_B[pr][c]; eP = PST_B[pr][c] + 6; if (isW) wB++; else bB++; }
      else if (t === 'r') {
        mP = PST_R[pr][c]; eP = PST_R[pr][c];
        const ownP = isW ? wPF[c] : bPF[c], oppP = isW ? bPF[c] : wPF[c];
        if (ownP === 0 && oppP === 0) { mP += 26; eP += 18; }
        else if (ownP === 0) { mP += 14; eP += 10; }
        if ((isW && r === 1) || (!isW && r === 6)) { mP += 24; eP += 32; }
      } else if (t === 'q') { mP = PST_Q[pr][c]; eP = PST_Q[pr][c]; }
      else if (t === 'k') {
        mP = PST_KM[pr][c]; eP = PST_KE[pr][c];
        const sr = isW ? r - 1 : r + 1, op = isW ? 'P' : 'p';
        if (sr >= 0 && sr < 8) {
          let sh = 0;
          for (let fc = Math.max(0, c - 1); fc <= Math.min(7, c + 1); fc++) if (b[sr][fc] === op) sh++;
          mP += sh * 13;
        }
        if ((isW ? wPF[c] : bPF[c]) === 0) mP -= 18;
      }
      if (isW) { mg += base + mP; eg += base + eP; }
      else { mg -= base + mP; eg -= base + eP; }
    }

    for (let c = 0; c < 8; c++) {
      if (wPF[c] > 1) { const pen = (wPF[c] - 1) * 16; mg -= pen; eg -= pen; }
      if (bPF[c] > 1) { const pen = (bPF[c] - 1) * 16; mg += pen; eg += pen; }
      if (wPF[c] > 0 && (c === 0 || wPF[c - 1] === 0) && (c === 7 || wPF[c + 1] === 0)) { mg -= 14; eg -= 16; }
      if (bPF[c] > 0 && (c === 0 || bPF[c - 1] === 0) && (c === 7 || bPF[c + 1] === 0)) { mg += 14; eg += 16; }
    }
    if (wB >= 2) { mg += 38; eg += 48; }
    if (bB >= 2) { mg -= 38; eg -= 48; }

    if (egP >= 14 && wK && bK) {
      const diff = wMat - bMat;
      if (Math.abs(diff) >= 250) {
        const dk = Math.abs(wK[0] - bK[0]) + Math.abs(wK[1] - bK[1]);
        if (diff > 0) {
          const be = Math.max(3 - bK[0], bK[0] - 4, 3 - bK[1], bK[1] - 4);
          eg += be * 14 + (14 - dk) * 6;
        } else {
          const we = Math.max(3 - wK[0], wK[0] - 4, 3 - wK[1], wK[1] - 4);
          eg -= we * 14 + (14 - dk) * 6;
        }
      }
    }
    return Math.round((mg * mgP + eg * egP) / 24);
  }

  function mvUci(mv) { return sqName(mv.from) + sqName(mv.to) + (mv.promotion ? 'q' : ''); }

  function chessTTKey(st) {
    const c = (st.castle.wK ? 'K' : '') + (st.castle.wQ ? 'Q' : '') + (st.castle.bK ? 'k' : '') + (st.castle.bQ ? 'q' : '');
    const ep = st.enPassant ? st.enPassant[0] + '' + st.enPassant[1] : '-';
    return st.turn + ':' + c + ':' + ep + ':' + st.board.map((r) => r.map((x) => x || '.').join('')).join('/');
  }

  function orderChessMv(b, mv, ttUci, ply, ctx) {
    const uci = mvUci(mv);
    if (ttUci && uci === ttUci) return 2000000;
    let s = 0;
    if (mv.promotion) s += 190000;
    if (mv.capture) {
      const a = b[mv.from[0]][mv.from[1]].toLowerCase();
      const v = mv.capture.toLowerCase();
      s += 100000 + (CHESS_VAL[v] || 100) * 12 - (CHESS_VAL[a] || 100);
    } else if (ctx) {
      const k = ctx.killers[ply];
      if (k) {
        if (k[0] === uci) s += 55000;
        else if (k[1] === uci) s += 45000;
      }
      s += Math.min(35000, ctx.history.get(uci) || 0);
    }
    if (mv.castleSide) s += 900;
    if (mv.to[0] >= 2 && mv.to[0] <= 5 && mv.to[1] >= 2 && mv.to[1] <= 5) s += 28;
    return s;
  }

  function hasNonPawn(b, col) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p || pCol(p) !== col) continue;
      const t = p.toLowerCase();
      if (t !== 'p' && t !== 'k') return true;
    }
    return false;
  }

  function qChess(st, a, bt, col, qd, ctx) {
    ctx.nodes++;
    if ((ctx.nodes & 255) === 0 && Date.now() > ctx.dl) { ctx.aborted = true; return a; }
    const chk = inCheck(st.board, col);
    if (!chk) {
      const stand = (col === 'w' ? 1 : -1) * evalChessCp(st.board);
      if (stand >= bt) return bt;
      if (stand > a) a = stand;
      if (qd <= 0) return a;
      if (stand + 980 < a) return a;
    } else if (qd <= -2) {
      return (col === 'w' ? 1 : -1) * evalChessCp(st.board);
    }
    const legal = chessMoves(st, col);
    if (!legal.length) return chk ? -88000 : 0;
    const cands = chk ? legal : legal.filter((m) => m.capture || m.promotion);
    cands.sort((x, y) => orderChessMv(st.board, y, '', 0, null) - orderChessMv(st.board, x, '', 0, null));
    const opp = col === 'w' ? 'b' : 'w';
    for (const mv of cands) {
      const sc = -qChess(applyChess(st, mv), -bt, -a, opp, qd - 1, ctx);
      if (ctx.aborted) return a;
      if (sc >= bt) return bt;
      if (sc > a) a = sc;
    }
    return a;
  }

  function negaChess(st, d, ply, a, bt, col, ctx, allowNull) {
    ctx.nodes++;
    if ((ctx.nodes & 255) === 0 && Date.now() > ctx.dl) { ctx.aborted = true; return 0; }
    const origA = a;
    const key = chessTTKey(st);
    const hit = ctx.tt.get(key);
    if (hit && hit.depth >= d) {
      if (hit.flag === 0) return hit.score;
      if (hit.flag === 1 && hit.score > a) a = hit.score;
      else if (hit.flag === 2 && hit.score < bt) bt = hit.score;
      if (a >= bt) return hit.score;
    }
    const chk = inCheck(st.board, col);
    const ed = chk && ply < 10 ? d + 1 : d;
    if (ed <= 0) return qChess(st, a, bt, col, ctx.maxQ, ctx);

    const opp = col === 'w' ? 'b' : 'w';
    if (allowNull && !chk && ed >= 3 && bt < 80000 && hasNonPawn(st.board, col)) {
      const nSt = { board: st.board, turn: opp, castle: st.castle, enPassant: null };
      const r = ed >= 5 ? 3 : 2;
      const nSc = -negaChess(nSt, ed - 1 - r, ply + 1, -bt, -bt + 1, opp, ctx, false);
      if (ctx.aborted) return 0;
      if (nSc >= bt) return bt;
    }

    const ms = chessMoves(st, col);
    if (!ms.length) return chk ? -90000 + ply * 10 : 0;
    const ttUci = hit ? hit.bestUci : '';
    ms.sort((x, y) => orderChessMv(st.board, y, ttUci, ply, ctx) - orderChessMv(st.board, x, ttUci, ply, ctx));

    let best = -Infinity, bestUci = mvUci(ms[0]);
    for (let i = 0; i < ms.length; i++) {
      const mv = ms[i];
      const next = applyChess(st, mv);
      const quiet = !mv.capture && !mv.promotion;
      let sc;
      if (i >= 4 && ed >= 3 && !chk && quiet && !inCheck(next.board, opp)) {
        sc = -negaChess(next, ed - 2, ply + 1, -a - 1, -a, opp, ctx, true);
        if (!ctx.aborted && sc > a) sc = -negaChess(next, ed - 1, ply + 1, -bt, -a, opp, ctx, true);
      } else if (i > 0) {
        sc = -negaChess(next, ed - 1, ply + 1, -a - 1, -a, opp, ctx, true);
        if (!ctx.aborted && sc > a && sc < bt) sc = -negaChess(next, ed - 1, ply + 1, -bt, -a, opp, ctx, true);
      } else {
        sc = -negaChess(next, ed - 1, ply + 1, -bt, -a, opp, ctx, true);
      }
      if (ctx.aborted) return 0;
      if (sc > best) { best = sc; bestUci = mvUci(mv); }
      if (sc > a) a = sc;
      if (a >= bt) {
        if (quiet) {
          if (!ctx.killers[ply]) ctx.killers[ply] = ['', ''];
          if (ctx.killers[ply][0] !== bestUci) { ctx.killers[ply][1] = ctx.killers[ply][0]; ctx.killers[ply][0] = bestUci; }
          ctx.history.set(bestUci, (ctx.history.get(bestUci) || 0) + ed * ed * 16);
        }
        break;
      }
    }
    if (ctx.tt.size > 35000) ctx.tt.clear();
    ctx.tt.set(key, { depth: ed, score: best, flag: best <= origA ? 2 : best >= bt ? 1 : 0, bestUci });
    return best;
  }

  function pickChessAi(st, diff, aiCol) {
    const side = aiCol || st.aiSide || st.turn || 'b';
    const moves = chessMoves(st, side);
    if (!moves.length) return null;
    if (moves.length === 1) return moves[0];
    if (diff === 'easy') {
      const caps = moves.filter((m) => m.capture);
      if (caps.length && Math.random() < 0.6) return caps[Math.floor(Math.random() * caps.length)];
      return moves[Math.floor(Math.random() * moves.length)];
    }
    const key = side + ':' + st.board.map((r) => r.map((x) => x || '.').join('')).join('/');
    const bk = CHESS_BOOK[key];
    if (bk && bk.length) {
      const uci = bk[Math.floor(Math.random() * bk.length)];
      const hit = moves.find((m) => sqName(m.from) + sqName(m.to) === uci);
      if (hit) return hit;
    }
    const isPro = diff === 'pro';
    const maxD = isPro ? 6 : 3;
    const budget = isPro ? 440 : 150;
    const ctx = {
      dl: Date.now() + budget,
      aborted: false,
      nodes: 0,
      tt: new Map(),
      killers: [],
      history: new Map(),
      maxQ: isPro ? 6 : 4,
    };
    const opp = side === 'w' ? 'b' : 'w';
    let best = moves[0], bestUci = '';

    for (let depth = 1; depth <= maxD; depth++) {
      ctx.aborted = false;
      const ord = moves.slice().sort((a, b) => orderChessMv(st.board, b, bestUci, 0, ctx) - orderChessMv(st.board, a, bestUci, 0, ctx));
      let iBest = ord[0], iBestV = -Infinity, alpha = -Infinity;
      for (let i = 0; i < ord.length; i++) {
        const mv = ord[i];
        const next = applyChess(st, mv);
        let v;
        if (i === 0) {
          v = -negaChess(next, depth - 1, 1, -Infinity, -alpha, opp, ctx, true);
        } else {
          v = -negaChess(next, depth - 1, 1, -alpha - 1, -alpha, opp, ctx, true);
          if (!ctx.aborted && v > alpha) v = -negaChess(next, depth - 1, 1, -Infinity, -alpha, opp, ctx, true);
        }
        if (ctx.aborted) break;
        if (!isPro && depth === maxD) v += (Math.random() - 0.5) * 6;
        if (v > iBestV) { iBestV = v; iBest = mv; }
        if (v > alpha) alpha = v;
      }
      if (!ctx.aborted) {
        best = iBest;
        bestUci = mvUci(iBest);
        if (iBestV >= 85000) break;
      } else break;
      if (Date.now() > ctx.dl - 25) break;
    }
    return best;
  }

  // --- Tic-Tac-Toe ---
  const TTT_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function evalTtt(b) {
    for (const [a, x, c] of TTT_LINES) if (b[a] && b[a] === b[x] && b[a] === b[c]) return { winner: b[a], line: [a, x, c] };
    return b.every((v) => v) ? { winner: 'draw', line: null } : { winner: null, line: null };
  }
  function tttMini(b, isAi, d) {
    const r = evalTtt(b);
    if (r.winner === 'O') return 10 - d;
    if (r.winner === 'X') return d - 10;
    if (r.winner === 'draw') return 0;
    let best = isAi ? -99 : 99;
    for (let i = 0; i < 9; i++) if (!b[i]) {
      b[i] = isAi ? 'O' : 'X';
      const s = tttMini(b, !isAi, d + 1);
      b[i] = '';
      best = isAi ? Math.max(best, s) : Math.min(best, s);
    }
    return best;
  }
  function pickTttAi(b, diff) {
    const em = b.map((v, i) => (!v ? i : -1)).filter((i) => i >= 0);
    if (!em.length) return -1;
    for (const i of em) { const c = b.slice(); c[i] = 'O'; if (evalTtt(c).winner === 'O') return i; }
    if (diff === 'easy') return em[Math.floor(Math.random() * em.length)];
    for (const i of em) { const c = b.slice(); c[i] = 'X'; if (evalTtt(c).winner === 'X') return i; }
    if (diff === 'medium') {
      if (!b[4]) return 4;
      const cr = [0,2,6,8].filter((i) => !b[i]);
      return cr.length ? cr[Math.floor(Math.random() * cr.length)] : em[0];
    }
    let best = -99, bm = em[0], cp = b.slice();
    for (const i of em) { cp[i] = 'O'; const s = tttMini(cp, false, 0); cp[i] = ''; if (s > best) { best = s; bm = i; } }
    return bm;
  }

  // --- Connect 4 ---
  function initC4() { return { board: Array.from({ length: 6 }, () => Array(7).fill(0)), turn: 1, winner: null, winCells: null, lastDrop: null }; }
  function dropC4(b, col, pl) {
    for (let r = 5; r >= 0; r--) if (b[r][col] === 0) { const nb = b.map((x) => x.slice()); nb[r][col] = pl; return { row: r, board: nb }; }
    return null;
  }
  function evalC4(b) {
    for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
      const p = b[r][c]; if (!p) continue;
      for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
        const ln = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k, nc = c + dc * k;
          if (nr < 0 || nr >= 6 || nc < 0 || nc >= 7 || b[nr][nc] !== p) break;
          ln.push([nr, nc]);
        }
        if (ln.length === 4) return { winner: p, cells: ln };
      }
    }
    return b[0].every((x) => x !== 0) ? { winner: 'draw', cells: null } : { winner: null, cells: null };
  }
  function scoreC4(b) {
    let sc = 0;
    for (let r = 0; r < 6; r++) { if (b[r][3] === 2) sc += 4; if (b[r][3] === 1) sc -= 3; }
    const win = (w) => {
      const a = w.filter((x) => x === 2).length, p = w.filter((x) => x === 1).length, e = w.filter((x) => x === 0).length;
      if (a === 4) return 1000; if (a === 3 && e === 1) return 14; if (a === 2 && e === 2) return 3;
      if (p === 3 && e === 1) return -18; if (p === 2 && e === 2) return -2; return 0;
    };
    for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) sc += win([b[r][c], b[r][c+1], b[r][c+2], b[r][c+3]]);
    for (let c = 0; c < 7; c++) for (let r = 0; r < 3; r++) sc += win([b[r][c], b[r+1][c], b[r+2][c], b[r+3][c]]);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      sc += win([b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]]);
      sc += win([b[r+3][c], b[r+2][c+1], b[r+1][c+2], b[r][c+3]]);
    }
    return sc;
  }
  function c4AB(b, d, a, bt, max) {
    const ev = evalC4(b);
    if (ev.winner === 2) return 10000 + d;
    if (ev.winner === 1) return -10000 - d;
    if (ev.winner === 'draw' || d === 0) return scoreC4(b);
    const ord = [3,2,4,1,5,0,6];
    let v = max ? -Infinity : Infinity;
    for (const c of ord) {
      const res = dropC4(b, c, max ? 2 : 1);
      if (!res) continue;
      const sc = c4AB(res.board, d - 1, a, bt, !max);
      if (max) { v = Math.max(v, sc); a = Math.max(a, v); } else { v = Math.min(v, sc); bt = Math.min(bt, v); }
      if (a >= bt) break;
    }
    return v;
  }
  function pickC4Ai(b, diff) {
    const cols = [3,2,4,1,5,0,6].filter((c) => b[0][c] === 0);
    if (!cols.length) return -1;
    for (const c of cols) { const r = dropC4(b, c, 2); if (r && evalC4(r.board).winner === 2) return c; }
    for (const c of cols) { const r = dropC4(b, c, 1); if (r && evalC4(r.board).winner === 1) return c; }
    if (diff === 'easy') return cols[Math.floor(Math.random() * cols.length)];
    const depth = diff === 'pro' ? 4 : 2;
    let bc = cols[0], bs = -Infinity;
    for (const c of cols) {
      const r = dropC4(b, c, 2);
      const s = c4AB(r.board, depth - 1, -Infinity, Infinity, false);
      if (s > bs) { bs = s; bc = c; }
    }
    return bc;
  }

  // --- Checkers ---
  function initCheckers() {
    const b = Array.from({ length: 8 }, () => Array(8).fill(0));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = -1;
    for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = 1;
    return { board: b, turn: 1, selected: null, winner: null, lastMove: null };
  }
  function checkersMoves(b, side) {
    const caps = [], regs = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = b[r][c]; if (!p || Math.sign(p) !== side) continue;
      const dirs = Math.abs(p) === 2 ? [-1, 1] : side === 1 ? [-1] : [1];
      for (const dr of dirs) for (const dc of [-1, 1]) {
        const nr = r + dr, nc = c + dc;
        if (!in8(nr, nc)) continue;
        if (b[nr][nc] === 0) regs.push({ from: [r, c], to: [nr, nc] });
        else if (Math.sign(b[nr][nc]) === -side) {
          const jr = nr + dr, jc = nc + dc;
          if (in8(jr, jc) && b[jr][jc] === 0) caps.push({ from: [r, c], to: [jr, jc], captured: [nr, nc] });
        }
      }
    }
    return caps.length ? caps : regs;
  }
  function applyCheckers(b, mv) {
    const nb = b.map((x) => x.slice());
    let p = nb[mv.from[0]][mv.from[1]];
    nb[mv.from[0]][mv.from[1]] = 0;
    if (mv.captured) nb[mv.captured[0]][mv.captured[1]] = 0;
    if (p === 1 && mv.to[0] === 0) p = 2;
    if (p === -1 && mv.to[0] === 7) p = -2;
    nb[mv.to[0]][mv.to[1]] = p;
    return nb;
  }
  function pickCheckersAi(b, diff) {
    const ms = checkersMoves(b, -1);
    if (!ms.length) return null;
    if (diff === 'easy') return ms[Math.floor(Math.random() * ms.length)];
    let best = ms[0], bs = -Infinity;
    for (const mv of ms) {
      const nb = applyCheckers(b, mv);
      let sc = mv.captured ? 3.5 : 0;
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const v = nb[r][c];
        if (v < 0) sc += Math.abs(v) === 2 ? 5 : 2 + r * 0.12;
        if (v > 0) sc -= Math.abs(v) === 2 ? 5 : 2 + (7 - r) * 0.12;
      }
      if (diff === 'pro' && checkersMoves(nb, 1).some((m) => m.captured)) sc -= 2.8;
      if (sc > bs) { bs = sc; best = mv; }
    }
    return best;
  }

  // --- Reversi ---
  const REV_W = [
    [100,-20,10,5,5,10,-20,100],[-20,-40,-2,-2,-2,-2,-40,-20],[10,-2,5,1,1,5,-2,10],[5,-2,1,0,0,1,-2,5],
    [5,-2,1,0,0,1,-2,5],[10,-2,5,1,1,5,-2,10],[-20,-40,-2,-2,-2,-2,-40,-20],[100,-20,10,5,5,10,-20,100],
  ];
  function initReversi() {
    const b = Array.from({ length: 8 }, () => Array(8).fill(0));
    b[3][3] = 2; b[4][4] = 2; b[3][4] = 1; b[4][3] = 1;
    return { board: b, turn: 1, winner: null, lastMove: null };
  }
  function revFlips(b, r, c, pl) {
    if (!in8(r, c) || b[r][c] !== 0) return [];
    const opp = pl === 1 ? 2 : 1, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const ln = []; let nr = r + dr, nc = c + dc;
      while (in8(nr, nc) && b[nr][nc] === opp) { ln.push([nr, nc]); nr += dr; nc += dc; }
      if (ln.length && in8(nr, nc) && b[nr][nc] === pl) out.push(...ln);
    }
    return out;
  }
  function revMoves(b, pl) {
    const m = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const f = revFlips(b, r, c, pl);
      if (f.length) m.push({ r, c, flips: f });
    }
    return m;
  }
  function applyRev(b, r, c, pl) {
    const f = revFlips(b, r, c, pl);
    if (!f.length) return null;
    const nb = b.map((x) => x.slice());
    nb[r][c] = pl;
    f.forEach(([fr, fc]) => { nb[fr][fc] = pl; });
    return nb;
  }
  function pickRevAi(b, diff) {
    const ms = revMoves(b, 2);
    if (!ms.length) return null;
    if (diff === 'easy') return ms[Math.floor(Math.random() * ms.length)];
    let best = ms[0], bs = -Infinity;
    for (const m of ms) {
      const sc = REV_W[m.r][m.c] + m.flips.length * (diff === 'pro' ? 2.5 : 1.5);
      if (sc > bs) { bs = sc; best = m; }
    }
    return best;
  }

  // --- Battleship ---
  function makeFleet(n) {
    const lens = [4, 3, 3, 2];
    const ships = Array.from({ length: n }, () => Array(n).fill(0));
    const shots = Array.from({ length: n }, () => Array(n).fill(0));
    lens.forEach((len, idx) => {
      const id = idx + 1;
      for (let t = 0; t < 200; t++) {
        const hz = Math.random() < 0.5;
        const r = Math.floor(Math.random() * (hz ? n : n - len + 1));
        const c = Math.floor(Math.random() * (hz ? n - len + 1 : n));
        let ok = true;
        for (let k = 0; k < len; k++) if (ships[hz ? r : r + k][hz ? c + k : c] !== 0) { ok = false; break; }
        if (ok) { for (let k = 0; k < len; k++) ships[hz ? r : r + k][hz ? c + k : c] = id; break; }
      }
    });
    return { ships, shots };
  }
  function fireBs(grid, r, c) {
    if (grid.shots[r][c] !== 0) return { outcome: 'already', allSunk: false };
    const sid = grid.ships[r][c];
    if (!sid) { grid.shots[r][c] = 1; return { outcome: 'miss', allSunk: false }; }
    grid.shots[r][c] = 2;
    let shipRem = 0, totRem = 0;
    for (let i = 0; i < grid.ships.length; i++) for (let j = 0; j < grid.ships[i].length; j++) {
      if (grid.ships[i][j] > 0 && grid.shots[i][j] !== 2) {
        totRem++;
        if (grid.ships[i][j] === sid) shipRem++;
      }
    }
    return { outcome: shipRem === 0 ? 'sunk' : 'hit', allSunk: totRem === 0 };
  }
  function pickBsAi(pGrid, diff) {
    const n = pGrid.shots.length;
    if (diff !== 'easy') {
      const adj = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (pGrid.shots[r][c] === 2) {
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < n && nc >= 0 && nc < n && pGrid.shots[nr][nc] === 0) adj.push([nr, nc]);
        }
      }
      if (adj.length) return adj[Math.floor(Math.random() * adj.length)];
    }
    const unk = [], par = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (pGrid.shots[r][c] === 0) {
      unk.push([r, c]); if ((r + c) % 2 === 0) par.push([r, c]);
    }
    if (!unk.length) return null;
    const pool = diff === 'pro' && par.length ? par : unk;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // --- Strategic Nim ---
  function pickNimAi(piles, diff) {
    const nz = piles.map((v, i) => ({ i, v })).filter((x) => x.v > 0);
    if (!nz.length) return null;
    if (diff === 'easy') {
      const p = nz[Math.floor(Math.random() * nz.length)];
      return { row: p.i, take: Math.max(1, Math.ceil(Math.random() * Math.min(2, p.v))) };
    }
    const xor = piles.reduce((a, b) => a ^ b, 0);
    if (xor !== 0 && (diff === 'pro' || Math.random() < 0.7)) {
      for (let i = 0; i < piles.length; i++) {
        const tgt = piles[i] ^ xor;
        if (tgt < piles[i]) return { row: i, take: piles[i] - tgt };
      }
    }
    const big = nz.slice().sort((a, b) => b.v - a.v)[0];
    return { row: big.i, take: 1 };
  }

  /* ========================================================================
     FLOATING GAME ARENA CONTROLLER & LIVE AI COMMENTARY
     ======================================================================== */
  let rootEl = null;
  let pillEl = null;
  let aiTimer = null;
  let chessClockTimer = null;

  const session = {
    open: false,
    minimized: false,
    gameId: 'chess',
    lang: 'he',
    difficulty: 'pro',
    chessSide: 'w',
    chessTimerSec: 0,
    thinking: false,
    state: null,
    chat: [],
    lastMoveDesc: '',
    wins: { player: 0, ai: 0, draws: 0 },
  };

  function gameMeta(id) {
    return GAMES.find((g) => g.id === id) || GAMES[0];
  }

  function pickRand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function addChat(who, text) {
    session.chat.push({ who, text, ts: Date.now() });
    if (session.chat.length > 40) session.chat.shift();
    renderChat();
  }

  function clearAiTimer() {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
  }

  function stopChessClock() {
    if (chessClockTimer) {
      clearInterval(chessClockTimer);
      chessClockTimer = null;
    }
  }

  function syncChessClockDom() {
    if (!rootEl || session.gameId !== 'chess' || !session.state || !session.state.timerSec) return;
    const st = session.state;
    const pClockEl = rootEl.querySelector('#lzgClockPlayer');
    const aClockEl = rootEl.querySelector('#lzgClockAi');
    if (pClockEl) {
      const pMs = st.clocks[st.playerSide];
      pClockEl.textContent = formatClock(pMs);
      pClockEl.parentElement.classList.toggle('active', !st.winner && st.turn === st.playerSide);
      pClockEl.parentElement.classList.toggle('low', pMs > 0 && pMs <= 30000);
    }
    if (aClockEl) {
      const aMs = st.clocks[st.aiSide];
      aClockEl.textContent = formatClock(aMs);
      aClockEl.parentElement.classList.toggle('active', !st.winner && st.turn === st.aiSide);
      aClockEl.parentElement.classList.toggle('low', aMs > 0 && aMs <= 30000);
    }
  }

  function startChessClockIfNeeded() {
    stopChessClock();
    if (session.gameId !== 'chess' || !session.state || !session.state.timerSec || session.state.winner) return;
    const st = session.state;
    st.clockStarted = true;
    st.lastTickAt = Date.now();
    chessClockTimer = setInterval(() => {
      if (!session.open || session.minimized || session.gameId !== 'chess' || !session.state || session.state.winner) {
        if (session.state && session.state.winner) stopChessClock();
        return;
      }
      const now = Date.now();
      const dt = Math.min(500, Math.max(0, now - (st.lastTickAt || now)));
      st.lastTickAt = now;
      const active = st.turn;
      st.clocks[active] = Math.max(0, st.clocks[active] - dt);
      syncChessClockDom();
      if (st.clocks[active] <= 0) {
        stopChessClock();
        clearAiTimer();
        session.thinking = false;
        const isHe = session.lang === 'he';
        if (active === st.playerSide) {
          st.winner = st.aiSide;
          st.winReason = 'timeout';
          session.wins.ai++;
          playSfx('lose');
          addChat('ai', isHe ? '⏰ נגמר לך הזמן בשעון! ניצחון שלי על הזמן — רוצה סיבוב חוזר?' : '⏰ Flag fall — you ran out of time! Want a rematch?');
        } else {
          st.winner = st.playerSide;
          st.winReason = 'timeout';
          session.wins.player++;
          playSfx('win');
          addChat('ai', isHe ? '⏰ נגמר לי הזמן! ניצחון שלך על השעון — כל הכבוד!' : '⏰ I flagged on time! Victory is yours — well played!');
        }
        renderAll();
      }
    }, 120);
  }

  function getBoardSummary() {
    const st = session.state;
    if (!st) return '';
    if (session.gameId === 'chess') {
      const sideStr = st.playerSide === 'w' ? 'Player=White, AI=Black' : 'Player=Black, AI=White';
      const evalStr = ((st.evalCp || 0) / 100).toFixed(1);
      const recent = (st.history || []).slice(-8).join(' ');
      const clockStr = st.timerSec
        ? `, clocks: Player=${formatClock(st.clocks[st.playerSide])}, AI=${formatClock(st.clocks[st.aiSide])}`
        : '';
      const chk = inCheck(st.board, st.turn) ? ', IN CHECK' : '';
      return `Chess (${sideStr}), turn=${st.turn === st.playerSide ? 'Player' : 'AI'}${chk}, moves=${st.movesCount}, eval=${evalStr} (White+ / Black-), recentMoves=[${recent || 'start'}]${clockStr}, capturedByPlayer=${st.capturedByPlayer.length}, capturedByAi=${st.capturedByAi.length}, winner=${st.winner || 'playing'}`;
    }
    if (session.gameId === 'reversi') {
      let p = 0, a = 0;
      st.board.flat().forEach((v) => { if (v === 1) p++; else if (v === 2) a++; });
      return `Reversi score Player ${p} vs AI ${a}`;
    }
    if (session.gameId === 'nim') return `Nim piles: [${st.piles.join(', ')}]`;
    if (session.gameId === 'battleship') return `Battleship playerHits=${st.pHits}/12, aiHits=${st.aHits}/12`;
    return `${session.gameId} turn=${st.turn}, winner=${st.winner || 'playing'}`;
  }

  function initGameState(id) {
    clearAiTimer();
    stopChessClock();
    session.thinking = false;
    session.lastMoveDesc = '';
    if (id === 'chess') session.state = initChess(session.chessSide, session.chessTimerSec);
    else if (id === 'tictactoe') session.state = { board: Array(9).fill(''), turn: 'X', winner: null, winLine: null };
    else if (id === 'connect4') session.state = initC4();
    else if (id === 'checkers') session.state = initCheckers();
    else if (id === 'reversi') session.state = initReversi();
    else if (id === 'battleship') session.state = { aiFleet: makeFleet(7), playerFleet: makeFleet(7), turn: 'p', winner: null, pHits: 0, aHits: 0, viewTab: 'enemy' };
    else if (id === 'nim') session.state = { piles: [1, 3, 5, 7], turn: 1, winner: null };
  }

  function openingBanter(id) {
    const isHe = session.lang === 'he';
    const m = gameMeta(id);
    if (isHe) {
      const map = {
        chess: session.chessSide === 'b'
          ? '♚ יאללה שחמט! בחרת לשחק בשחור — אני פותח בלבן ראשון. תתכונן לקרב אמיתי!'
          : '♔ יאללה שחמט! אתה בלבן ומתחיל ראשון (אפשר גם לעבור לשחור או להפעיל טיימר למעלה). בוא נראה את הפתיחה שלך!',
        tictactoe: '✕ איקס עיגול! אתה X (קורל) ואני O (תכלת). בוא נראה אם תצליח להפתיע אותי!',
        connect4: '🔴 ארבע בשורה! הפל דיסקית אדומה לאחת העמודות — אני משחק בזהב וכבר מתכנן מלכודת.',
        checkers: '♛ דמקה! האבנים האדומות שלך למטה ואני בכסף-אובסידיאן. קפוץ חכם לפני שאני מכתיר מלך!',
        reversi: '⚫ רברסי! אתה בשחור ואני בפנינה לבנה. הנקודות המוזהבות מראות איפה מותר להניח אבן — הפינות הן הזהב!',
        battleship: '🎯 צוללות! בחר משבצת ברדאר האויב כדי לירות. תנסה למצוא את הצי שלי לפני שאני מוצא את שלך!',
        nim: '💎 נים אסטרטגי! לחץ על קריסטל סגול כדי לקחת אותו ואת כל מה שמימינו בשורה. מי שלוקח את האחרון מנצח!',
      };
      return map[id] || `🎮 התחלנו ${m.nameHe}! תורך לשחק ראשון.`;
    }
    const mapEn = {
      chess: session.chessSide === 'b'
        ? '♚ Chess is on! You chose Black — I will open as White. Get ready for a sharp match!'
        : '♔ Chess is on! You play White and move first (you can switch to Black or add a chess clock above). Show me your opening!',
      tictactoe: '✕ Tic-Tac-Toe! You are Coral X and I am Sky O. Let’s see if you can crack my defense!',
      connect4: '🔴 Connect Four! Drop your Crimson disc — I play Gold and I’m already setting a trap.',
      checkers: '♛ Checkers! You play Ruby Red at the bottom vs my Obsidian-Silver discs. Race me for the first King!',
      reversi: '⚫ Reversi! You play Obsidian Black vs my Pearl White discs. Gold dots show legal flips — fight for the corners!',
      battleship: '🎯 Battleship! Tap any cell on Enemy Radar to fire. Sink my 4 ships before I sink yours!',
      nim: '💎 Strategic Nim! Click any crystal to take it and the ones after it in that row. Take the last crystal to win!',
    };
    return mapEn[id] || `🎮 ${m.nameEn} started! Your turn first.`;
  }

  function ensureShell() {
    if (rootEl) return;

    rootEl = document.createElement('div');
    rootEl.id = 'lzGameFloat';
    rootEl.className = 'lz-game-float';
    rootEl.hidden = true;
    rootEl.setAttribute('role', 'dialog');
    rootEl.setAttribute('aria-modal', 'false');
    rootEl.innerHTML = `
      <div class="lzg-window" id="lzgWindow">
        <div class="lzg-header" id="lzgDragHandle">
          <div class="lzg-head-left">
            <span class="lzg-head-ic" id="lzgHeadIcon"></span>
            <div class="lzg-head-titles">
              <b id="lzgTitle">שחמט</b>
              <small id="lzgStatus">תורך לשחק</small>
            </div>
          </div>
          <div class="lzg-head-actions">
            <select id="lzgGameSwitch" class="lzg-select" aria-label="Switch game"></select>
            <select id="lzgDiff" class="lzg-select" aria-label="Difficulty"></select>
            <button type="button" class="lzg-hbtn" id="lzgMuteBtn" title="Toggle sound" aria-label="Toggle sound">🔊</button>
            <button type="button" class="lzg-hbtn" id="lzgRestartBtn" title="Restart game" aria-label="Restart game">↻</button>
            <button type="button" class="lzg-hbtn" id="lzgMinBtn" title="Minimize" aria-label="Minimize">—</button>
            <button type="button" class="lzg-hbtn close" id="lzgCloseBtn" title="Close" aria-label="Close">✕</button>
          </div>
        </div>

        <div class="lzg-body">
          <div class="lzg-board-pane">
            <div class="lzg-score-strip" id="lzgScoreStrip"></div>
            <div class="lzg-board-stage" id="lzgBoardStage"></div>
            <div class="lzg-board-foot" id="lzgBoardFoot"></div>
          </div>

          <div class="lzg-chat-pane">
            <div class="lzg-chat-head">
              <span class="lzg-ai-dot" aria-hidden="true"></span>
              <b id="lzgChatTitle">הערות וצ׳אט חי עם ה-AI</b>
            </div>
            <div class="lzg-chat-feed" id="lzgChatFeed" aria-live="polite"></div>
            <div class="lzg-quick-chips" id="lzgQuickChips"></div>
            <form class="lzg-chat-form" id="lzgChatForm">
              <input type="text" id="lzgChatInput" autocomplete="off" maxlength="220" placeholder="תגיב ל-AI או בקש רמז..." />
              <button type="submit" id="lzgChatSend" aria-label="Send">➤</button>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(rootEl);

    pillEl = document.createElement('button');
    pillEl.type = 'button';
    pillEl.id = 'lzGameMinPill';
    pillEl.className = 'lz-game-min-pill';
    pillEl.hidden = true;
    pillEl.addEventListener('click', () => {
      session.minimized = false;
      pillEl.hidden = true;
      rootEl.hidden = false;
    });
    document.body.appendChild(pillEl);

    // Header actions
    rootEl.querySelector('#lzgCloseBtn').addEventListener('click', closeGame);
    rootEl.querySelector('#lzgMinBtn').addEventListener('click', minimizeGame);
    rootEl.querySelector('#lzgRestartBtn').addEventListener('click', () => {
      initGameState(session.gameId);
      addChat('ai', session.lang === 'he' ? '🔄 לוח חדש! הפעם אני משחק עוד יותר חד — בוא נצא לדרך!' : '🔄 Fresh board! I’m playing even sharper this round — let’s go!');
      renderAll();
      if (session.gameId === 'chess' && session.state && session.state.turn === session.state.aiSide) {
        triggerChessAiTurn();
      }
    });
    rootEl.querySelector('#lzgMuteBtn').addEventListener('click', (e) => {
      muted = !muted;
      e.currentTarget.textContent = muted ? '🔇' : '🔊';
    });
    rootEl.querySelector('#lzgGameSwitch').addEventListener('change', (e) => {
      openGame(e.target.value, { lang: session.lang });
    });
    rootEl.querySelector('#lzgDiff').addEventListener('change', (e) => {
      session.difficulty = e.target.value;
      const isHe = session.lang === 'he';
      const lbl =
        session.difficulty === 'pro'
          ? isHe ? 'מאסטר 🔥' : 'Master 🔥'
          : session.difficulty === 'easy'
            ? isHe ? 'רגוע 😊' : 'Easy 😊'
            : isHe ? 'בינוני ⚡' : 'Medium ⚡';
      addChat('ai', isHe ? `⚙️ עברתי לרמת קושי: ${lbl}. בהצלחה!` : `⚙️ Switched AI difficulty to ${lbl}. Good luck!`);
    });

    // Chat form submit
    rootEl.querySelector('#lzgChatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = rootEl.querySelector('#lzgChatInput');
      const txt = inp.value.trim();
      if (!txt) return;
      inp.value = '';
      sendPlayerGameChat(txt);
    });

    // Desktop drag support on header
    const handle = rootEl.querySelector('#lzgDragHandle');
    const win = rootEl.querySelector('#lzgWindow');
    let drag = null;
    handle.addEventListener('pointerdown', (e) => {
      if (window.innerWidth <= 820) return;
      if (e.target.closest('button, select, input')) return;
      const rect = win.getBoundingClientRect();
      drag = { sx: e.clientX, sy: e.clientY, left: rect.left, top: rect.top };
      win.style.position = 'fixed';
      win.style.margin = '0';
      win.style.left = rect.left + 'px';
      win.style.top = rect.top + 'px';
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const nx = Math.max(8, Math.min(window.innerWidth - 120, drag.left + (e.clientX - drag.sx)));
      const ny = Math.max(8, Math.min(window.innerHeight - 80, drag.top + (e.clientY - drag.sy)));
      win.style.left = nx + 'px';
      win.style.top = ny + 'px';
    });
    handle.addEventListener('pointerup', () => { drag = null; });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && session.open && !session.minimized) {
        minimizeGame();
      }
    });
  }

  function openGame(gameId, opts) {
    ensureShell();
    const g = gameMeta(gameId);
    session.gameId = g.id;
    session.lang = (opts && opts.lang) || (window.S && window.S.lang === 'he' ? 'he' : 'he');
    session.open = true;
    session.minimized = false;
    session.chat = [];

    // Reset floating window position cleanly & apply per-game theme attribute
    const win = rootEl.querySelector('#lzgWindow');
    win.setAttribute('data-game', g.id);
    win.style.position = '';
    win.style.left = '';
    win.style.top = '';
    win.style.margin = '';

    initGameState(g.id);
    rootEl.setAttribute('dir', session.lang === 'he' ? 'rtl' : 'ltr');
    rootEl.hidden = false;
    pillEl.hidden = true;

    populateSelects();
    addChat('ai', openingBanter(g.id));
    renderAll();

    // If Chess and player chose Black, AI plays White opening move immediately
    if (g.id === 'chess' && session.state && session.state.turn === session.state.aiSide) {
      triggerChessAiTurn();
    }
  }

  function closeGame() {
    clearAiTimer();
    stopChessClock();
    session.open = false;
    session.minimized = false;
    if (rootEl) rootEl.hidden = true;
    if (pillEl) pillEl.hidden = true;
  }

  function minimizeGame() {
    session.minimized = true;
    if (rootEl) rootEl.hidden = true;
    const g = gameMeta(session.gameId);
    if (pillEl) {
      pillEl.setAttribute('data-game', g.id);
      pillEl.innerHTML = `<span class="lzg-mp-dot"></span> ${session.lang === 'he' ? 'חזור למשחק: ' + g.nameHe : 'Resume: ' + g.nameEn}`;
      pillEl.hidden = false;
    }
  }

  function populateSelects() {
    const isHe = session.lang === 'he';
    const sw = rootEl.querySelector('#lzgGameSwitch');
    sw.innerHTML = GAMES.map((g) => `<option value="${g.id}" ${g.id === session.gameId ? 'selected' : ''}>${isHe ? g.nameHe : g.nameEn}</option>`).join('');
    const df = rootEl.querySelector('#lzgDiff');
    df.innerHTML = [
      { v: 'easy', l: isHe ? 'קל' : 'Easy' },
      { v: 'medium', l: isHe ? 'בינוני' : 'Medium' },
      { v: 'pro', l: isHe ? 'מאסטר' : 'Master' },
    ]
      .map((d) => `<option value="${d.v}" ${d.v === session.difficulty ? 'selected' : ''}>${d.l}</option>`)
      .join('');

    rootEl.querySelector('#lzgChatTitle').textContent = isHe ? 'הערות וצ׳אט חי עם ה-AI' : 'Live AI Commentary & Chat';
    rootEl.querySelector('#lzgChatInput').placeholder = isHe ? 'כתוב תגובה ל-AI או בקש רמז...' : 'Reply to the AI or ask for a hint...';

    const chips = rootEl.querySelector('#lzgQuickChips');
    const qList = isHe
      ? ['💡 תן לי רמז', '😏 אני הולך לנצח', '🔥 מהלך חזק!']
      : ['💡 Give me a hint', '😏 I’m going to win', '🔥 Nice move!'];
    chips.innerHTML = qList.map((q) => `<button type="button" class="lzg-qchip">${q}</button>`).join('');
    chips.querySelectorAll('.lzg-qchip').forEach((b) => {
      b.addEventListener('click', () => sendPlayerGameChat(b.textContent));
    });
  }

  async function sendPlayerGameChat(userText) {
    const historySnapshot = session.chat
      .filter((c) => !c.typing && c.text)
      .slice(-10)
      .map((c) => ({ who: c.who, text: c.text }));

    addChat('user', userText);
    const isHe = session.lang === 'he';
    const g = gameMeta(session.gameId);

    // Show subtle typing indicator
    const typingId = 'lzgTyping_' + Date.now();
    session.chat.push({ who: 'ai', text: isHe ? 'חושב ועונה...' : 'Thinking...', typing: true, id: typingId });
    renderChat();

    try {
      const resp = await fetch('/api/games/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: session.gameId,
          gameTitle: isHe ? g.nameHe : g.nameEn,
          lang: session.lang,
          difficulty: session.difficulty,
          scoreSummary: `Player ${session.wins.player} - AI ${session.wins.ai} (Draws ${session.wins.draws})`,
          boardSummary: getBoardSummary(),
          lastMove: session.lastMoveDesc,
          history: historySnapshot,
          userMessage: userText,
        }),
      });
      const data = await resp.json();
      session.chat = session.chat.filter((c) => c.id !== typingId);
      if (data && data.reply) {
        addChat('ai', data.reply);
      } else {
        addChat('ai', isHe ? 'אני איתך! תשאל אותי על המשחק או על כל דבר שבא לך תוך כדי.' : 'I’m right here! Ask me anything about the match or chat while we play.');
      }
    } catch (_) {
      session.chat = session.chat.filter((c) => c.id !== typingId);
      addChat('ai', isHe ? 'הייתה תקלת תקשורת רגעית — נסה לשלוח שוב, אני כאן!' : 'Brief connection hiccup — send that again, I’m right here!');
    }
  }

  function renderChat() {
    if (!rootEl) return;
    const feed = rootEl.querySelector('#lzgChatFeed');
    const isHe = session.lang === 'he';
    feed.innerHTML = session.chat
      .map(
        (m) => `
        <div class="lzg-msg ${m.who}${m.typing ? ' typing' : ''}">
          <span class="lzg-msg-who">${m.who === 'ai' ? 'Lokizenith AI' : isHe ? 'אתה' : 'You'}</span>
          <div class="lzg-msg-txt">${escHtml(m.text)}</div>
        </div>`,
      )
      .join('');
    feed.scrollTop = feed.scrollHeight;
  }

  function renderHeaderAndScore() {
    const isHe = session.lang === 'he';
    const g = gameMeta(session.gameId);
    rootEl.querySelector('#lzgHeadIcon').innerHTML = g.svg;
    rootEl.querySelector('#lzgTitle').textContent = isHe ? g.nameHe : g.nameEn;

    const st = session.state;
    const playerWonChess = session.gameId === 'chess' && st.winner === st.playerSide;
    let statusTxt = '';
    if (st.winner) {
      if (playerWonChess || st.winner === 'player' || st.winner === 'X' || st.winner === 1) {
        statusTxt = isHe ? '🏆 ניצחת!' : '🏆 You Won!';
      } else if (st.winner === 'draw') {
        statusTxt = isHe ? '🤝 תיקו!' : '🤝 Draw!';
      } else {
        statusTxt = isHe ? '🤖 ה-AI ניצח!' : '🤖 AI Won!';
      }
    } else if (session.thinking) {
      statusTxt = isHe ? 'ה-AI חושב על מהלך...' : 'AI is thinking...';
    } else {
      statusTxt = isHe ? 'תורך לשחק' : 'Your Turn';
    }
    rootEl.querySelector('#lzgStatus').textContent = statusTxt;

    const strip = rootEl.querySelector('#lzgScoreStrip');
    let extra = '';
    if (session.gameId === 'reversi') {
      let p = 0, a = 0;
      st.board.flat().forEach((v) => { if (v === 1) p++; else if (v === 2) a++; });
      extra = `<span class="lzg-sc-extra">${isHe ? `אבנים: אתה ${p} · AI ${a}` : `Discs: You ${p} · AI ${a}`}</span>`;
    } else if (session.gameId === 'chess') {
      const capP = st.capturedByPlayer.map((x) => CHESS_GLYPHS[x]).join('');
      const capA = st.capturedByAi.map((x) => CHESS_GLYPHS[x]).join('');
      extra = `<span class="lzg-sc-extra">${capP || '—'} | ${capA || '—'}</span>`;
    } else if (session.gameId === 'battleship') {
      extra = `<span class="lzg-sc-extra">${isHe ? `פגיעות שלך: ${st.pHits}/12 · של ה-AI: ${st.aHits}/12` : `Your hits: ${st.pHits}/12 · AI hits: ${st.aHits}/12`}</span>`;
    }
    strip.innerHTML = `
      <span class="lzg-sc-stat">${isHe ? 'אתה' : 'You'}: <b>${session.wins.player}</b></span>
      <span class="lzg-sc-sep">·</span>
      <span class="lzg-sc-stat">AI: <b>${session.wins.ai}</b></span>
      ${extra}
    `;
  }

  function renderAll() {
    if (!rootEl || !session.open) return;
    renderHeaderAndScore();
    const stage = rootEl.querySelector('#lzgBoardStage');
    const foot = rootEl.querySelector('#lzgBoardFoot');
    foot.innerHTML = '';

    if (session.gameId === 'chess') renderChess(stage, foot);
    else if (session.gameId === 'tictactoe') renderTtt(stage, foot);
    else if (session.gameId === 'connect4') renderC4(stage, foot);
    else if (session.gameId === 'checkers') renderCheckers(stage, foot);
    else if (session.gameId === 'reversi') renderReversi(stage, foot);
    else if (session.gameId === 'battleship') renderBattleship(stage, foot);
    else if (session.gameId === 'nim') renderNim(stage, foot);
  }

  /* ========================================================================
     INDIVIDUAL BOARD RENDERERS & AI TURN HANDLERS
     ======================================================================== */
  // 1. CHESS (White/Black Side Choice + Dual Chess Clocks + Eval Bar + Coordinates + Move History + Upgraded Alpha-Beta AI)
  function renderChess(stage, foot) {
    const st = session.state;
    const isHe = session.lang === 'he';
    const pSide = st.playerSide || 'w';
    const aSide = st.aiSide || 'b';
    const flipped = pSide === 'b';
    const legal = st.winner || st.turn !== pSide ? [] : chessMoves(st, pSide);
    const selMoves = st.selected ? legal.filter((m) => m.from[0] === st.selected[0] && m.from[1] === st.selected[1]) : [];
    const targetMap = new Map(selMoves.map((m) => [m.to[0] + ',' + m.to[1], m]));
    const whiteInCheck = inCheck(st.board, 'w');
    const blackInCheck = inCheck(st.board, 'b');
    const playerInCheck = pSide === 'w' ? whiteInCheck : blackInCheck;

    const wrap = document.createElement('div');
    wrap.className = 'lzg-chess-suite';

    // Top control bar: Play as White/Black + Live Switch Color + Chess Timer selector
    const ctlBar = document.createElement('div');
    ctlBar.className = 'lzg-chess-controls';
    ctlBar.innerHTML = `
      <div class="lzg-side-group">
        <div class="lzg-side-toggle" role="group" aria-label="${isHe ? 'בחר צבע בשחמט' : 'Choose chess side'}">
          <button type="button" class="lzg-side-btn${pSide === 'w' ? ' on' : ''}" data-side="w">♔ ${isHe ? 'לבן' : 'White'}</button>
          <button type="button" class="lzg-side-btn${pSide === 'b' ? ' on' : ''}" data-side="b">♚ ${isHe ? 'שחור' : 'Black'}</button>
        </div>
        <button type="button" class="lzg-flip-btn" id="lzgChessFlipBtn" title="${isHe ? 'החלף צבע עכשיו' : 'Switch color now'}">⇄ ${isHe ? 'החלף צבע' : 'Switch Color'}</button>
      </div>
      <div class="lzg-timer-picker">
        <span class="lzg-timer-lbl">⏱</span>
        <select class="lzg-timer-select" id="lzgChessTimerSelect" aria-label="${isHe ? 'טיימר שחמט' : 'Chess timer'}">
          <option value="0"${st.timerSec === 0 ? ' selected' : ''}>${isHe ? 'ללא טיימר' : 'No Timer'}</option>
          <option value="180"${st.timerSec === 180 ? ' selected' : ''}>3:00 ${isHe ? 'בליץ' : 'Blitz'}</option>
          <option value="300"${st.timerSec === 300 ? ' selected' : ''}>5:00 ${isHe ? 'בליץ' : 'Blitz'}</option>
          <option value="600"${st.timerSec === 600 ? ' selected' : ''}>10:00 ${isHe ? 'ראפיד' : 'Rapid'}</option>
          <option value="900"${st.timerSec === 900 ? ' selected' : ''}>15:00 ${isHe ? 'קלאסי' : 'Classic'}</option>
        </select>
      </div>
    `;
    function switchChessColorTo(chosen) {
      if (chosen === st.playerSide && !st.winner) return;
      clearAiTimer();
      session.thinking = false;
      session.chessSide = chosen;
      if (st.winner || st.movesCount === 0) {
        initGameState('chess');
        addChat(
          'ai',
          chosen === 'b'
            ? (isHe ? '♚ מעולה! החלפנו צדדים — אתה משחק בשחור והלוח התהפך לטובתך. אני פותח בלבן!' : '♚ Awesome! Board flipped — you play Black and I will open as White!')
            : (isHe ? '♔ עברת לשחק בלבן! אתה פותח את המשחק ראשון.' : '♔ Switched to White! Your opening move.'),
        );
        renderAll();
        if (chosen === 'b') triggerChessAiTurn();
        return;
      }
      // Mid-game live side swap: keep the live board, flip orientation, swap sides & captures
      st.playerSide = chosen;
      st.aiSide = chosen === 'w' ? 'b' : 'w';
      st.selected = null;
      const tmpCap = st.capturedByPlayer;
      st.capturedByPlayer = st.capturedByAi;
      st.capturedByAi = tmpCap;
      addChat(
        'ai',
        chosen === 'b'
          ? (isHe ? '⇄ החלפנו צבעים באמצע המשחק! עכשיו אתה משחק בשחור ואני לוקח את הלבן.' : '⇄ Swapped colors mid-game! You now command Black and I take White.')
          : (isHe ? '⇄ החלפנו צבעים באמצע המשחק! עכשיו אתה משחק בלבן ואני לוקח את השחור.' : '⇄ Swapped colors mid-game! You now command White and I take Black.'),
      );
      renderAll();
      if (st.turn === st.aiSide) triggerChessAiTurn();
    }
    ctlBar.querySelectorAll('.lzg-side-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchChessColorTo(btn.getAttribute('data-side')));
    });
    ctlBar.querySelector('#lzgChessFlipBtn').addEventListener('click', () => {
      switchChessColorTo(st.playerSide === 'w' ? 'b' : 'w');
    });
    ctlBar.querySelector('#lzgChessTimerSelect').addEventListener('change', (e) => {
      const sec = parseInt(e.target.value, 10) || 0;
      session.chessTimerSec = sec;
      initGameState('chess');
      addChat(
        'ai',
        sec > 0
          ? (isHe ? `⏱️ הופעל שעון שחמט של ${Math.round(sec / 60)} דקות לכל צד! משחק חדש יצא לדרך.` : `⏱️ Chess clock set to ${Math.round(sec / 60)} min per side! New game started.`)
          : (isHe ? '⏱️ הטיימר כובה — משחק חופשי ללא הגבלת זמן.' : '⏱️ Chess clock disabled — untimed game started.'),
      );
      renderAll();
      if (session.chessSide === 'b') triggerChessAiTurn();
    });
    wrap.appendChild(ctlBar);

    // Dual Chess Clocks bar (when timer active)
    if (st.timerSec > 0) {
      const clocksBar = document.createElement('div');
      clocksBar.className = 'lzg-clocks-bar';
      const pMs = st.clocks[pSide];
      const aMs = st.clocks[aSide];
      clocksBar.innerHTML = `
        <div class="lzg-clock-box${!st.winner && st.turn === aSide ? ' active' : ''}${aMs <= 30000 ? ' low' : ''}">
          <span class="lzg-clock-who">${aSide === 'w' ? '♔' : '♚'} AI</span>
          <b class="lzg-clock-val" id="lzgClockAi">${formatClock(aMs)}</b>
        </div>
        <div class="lzg-clock-box player${!st.winner && st.turn === pSide ? ' active' : ''}${pMs <= 30000 ? ' low' : ''}">
          <span class="lzg-clock-who">${pSide === 'w' ? '♔' : '♚'} ${isHe ? 'אתה' : 'You'}</span>
          <b class="lzg-clock-val" id="lzgClockPlayer">${formatClock(pMs)}</b>
        </div>
      `;
      wrap.appendChild(clocksBar);
    }

    // Board + Live Evaluation Advantage Bar
    const boardRow = document.createElement('div');
    boardRow.className = 'lzg-chess-board-row';
    boardRow.setAttribute('dir', 'ltr');

    // Eval Bar
    const cp = st.evalCp || 0;
    const clampedCp = Math.max(-900, Math.min(900, cp));
    const whitePct = Math.round(50 + (clampedCp / 900) * 46);
    const evalScoreTxt = Math.abs(cp) >= 80000 ? 'M' : (cp >= 0 ? '+' : '') + (cp / 100).toFixed(1);
    const evalWrap = document.createElement('div');
    evalWrap.className = 'lzg-eval-bar' + (flipped ? ' flipped' : '');
    evalWrap.title = isHe ? `הערכת עמדה: ${evalScoreTxt}` : `Position eval: ${evalScoreTxt}`;
    evalWrap.innerHTML = `
      <div class="lzg-eval-white" style="height:${whitePct}%"></div>
      <span class="lzg-eval-txt">${evalScoreTxt}</span>
    `;
    boardRow.appendChild(evalWrap);

    const grid = document.createElement('div');
    grid.className = 'lzg-chess-grid';
    grid.setAttribute('dir', 'ltr');

    for (let vr = 0; vr < 8; vr++) {
      for (let vc = 0; vc < 8; vc++) {
        const r = flipped ? 7 - vr : vr;
        const c = flipped ? 7 - vc : vc;
        const p = st.board[r][c];
        const btn = document.createElement('button');
        btn.type = 'button';
        const isDark = (r + c) % 2 === 1;
        const key = r + ',' + c;
        const isSel = st.selected && st.selected[0] === r && st.selected[1] === c;
        const mv = targetMap.get(key);
        const isLast =
          st.lastMove &&
          ((st.lastMove.from[0] === r && st.lastMove.from[1] === c) || (st.lastMove.to[0] === r && st.lastMove.to[1] === c));
        const isKingDanger = (p === 'K' && whiteInCheck) || (p === 'k' && blackInCheck);

        btn.className =
          'lzg-ch-sq ' +
          (isDark ? 'dark' : 'light') +
          (isSel ? ' sel' : '') +
          (mv ? (mv.capture ? ' cap' : ' legal') : '') +
          (isLast ? ' last' : '') +
          (isKingDanger ? ' check' : '');
        btn.setAttribute('aria-label', `${sqName([r, c])} ${p || 'empty'}`);

        const rankLbl = vc === 0 ? `<span class="lzg-ch-coord rank">${8 - r}</span>` : '';
        const fileLbl = vr === 7 ? `<span class="lzg-ch-coord file">${'abcdefgh'[c]}</span>` : '';
        btn.innerHTML =
          rankLbl +
          fileLbl +
          (p
            ? `<span class="lzg-ch-piece ${pCol(p)}">${CHESS_GLYPHS[p]}</span>`
            : mv
              ? '<span class="lzg-ch-dot"></span>'
              : '');

        btn.addEventListener('click', () => {
          if (session.thinking || st.winner || st.turn !== pSide) return;
          if (mv) {
            executePlayerChessMove(mv);
            return;
          }
          if (p && pCol(p) === pSide) {
            st.selected = isSel ? null : [r, c];
            renderAll();
          } else {
            st.selected = null;
            renderAll();
          }
        });
        grid.appendChild(btn);
      }
    }
    boardRow.appendChild(grid);
    wrap.appendChild(boardRow);

    // Move Notation History Ribbon
    if (st.history && st.history.length) {
      const pairs = [];
      for (let i = 0; i < st.history.length; i += 2) {
        pairs.push(`${Math.floor(i / 2) + 1}. ${st.history[i]}${st.history[i + 1] ? ' ' + st.history[i + 1] : ''}`);
      }
      const histEl = document.createElement('div');
      histEl.className = 'lzg-move-hist';
      histEl.setAttribute('dir', 'ltr');
      histEl.textContent = pairs.slice(-7).join('   ');
      wrap.appendChild(histEl);
    }

    stage.innerHTML = '';
    stage.appendChild(wrap);

    if (playerInCheck && !st.winner) {
      foot.innerHTML = `<span class="lzg-alert">${isHe ? '⚠️ שח על המלך שלך! הגן עליו.' : '⚠️ Your King is in Check!'}</span>`;
    } else if (st.winReason === 'timeout') {
      foot.innerHTML = `<span class="lzg-alert">${st.winner === pSide ? (isHe ? '⏰ ניצחון שלך על הזמן!' : '⏰ You won on time!') : (isHe ? '⏰ נגמר הזמן בשעון!' : '⏰ Out of time!')}</span>`;
    } else {
      foot.innerHTML = `<span class="lzg-hint-line">${
        pSide === 'w'
          ? (isHe ? 'אתה: לבן ♔ · לחץ על כלי לראות מהלכים חוקיים (כולל הצרחה והכאה דרך הילוכו)' : 'You: White ♔ · Tap a piece to see legal moves (castling & en passant supported)')
          : (isHe ? 'אתה: שחור ♚ · הלוח מופנה אליך · לחץ על כלי שחור לשחק' : 'You: Black ♚ · Board flipped for Black · Tap a black piece to move')
      }</span>`;
    }
  }

  function executePlayerChessMove(mv) {
    const st = session.state;
    const isHe = session.lang === 'he';
    const pSide = st.playerSide || 'w';
    const aSide = st.aiSide || 'b';
    const movedPiece = st.board[mv.from[0]][mv.from[1]];
    const next = applyChess(st, mv);
    st.board = next.board;
    st.turn = next.turn;
    st.castle = next.castle;
    st.enPassant = next.enPassant;
    st.selected = null;
    st.lastMove = mv;
    st.movesCount++;
    st.evalCp = evalChessCp(st.board);
    if (mv.capture) st.capturedByPlayer.push(mv.capture);
    st.history.push(formatAlgebraic(movedPiece, mv, st.board, aSide));

    if (st.timerSec > 0 && !st.clockStarted) startChessClockIfNeeded();

    const pName = isHe ? CHESS_NAME_HE[movedPiece.toLowerCase()] : CHESS_NAME_EN[movedPiece.toLowerCase()];
    const capName = mv.capture ? (isHe ? CHESS_NAME_HE[mv.capture.toLowerCase()] : CHESS_NAME_EN[mv.capture.toLowerCase()]) : '';
    session.lastMoveDesc = `Player (${pSide === 'w' ? 'White' : 'Black'}) moved ${pName} ${sqName(mv.from)}->${sqName(mv.to)}${capName ? ' capturing ' + capName : ''}`;
    playSfx(mv.capture ? 'capture' : 'move');

    const aiLegal = chessMoves(st, aSide);
    if (!aiLegal.length) {
      stopChessClock();
      if (inCheck(st.board, aSide)) {
        st.winner = pSide;
        session.wins.player++;
        playSfx('win');
        addChat('ai', isHe ? '🤯 שח-מט!! הפלת אותי לגמרי! כל הכבוד, מהלך של אלופים.' : '🤯 Checkmate!! You completely outplayed me! Well deserved victory.');
      } else {
        st.winner = 'draw';
        session.wins.draws++;
        addChat('ai', isHe ? '🤝 פט (תיקו)! שנינו שיחקנו צמוד מאוד.' : '🤝 Stalemate! That was a razor-close battle.');
      }
      renderAll();
      return;
    }

    if (inCheck(st.board, aSide)) {
      addChat('ai', isHe ? `😬 אווץ׳! שח על המלך שלי עם ה${pName} ב-${sqName(mv.to)}! רגע, אני מחלץ אותו...` : `😬 Ouch! Check with your ${pName} on ${sqName(mv.to)}! Let me get out of this...`);
    } else if (mv.capture) {
      addChat('ai', isHe ? `😤 אכלת לי את ה${capName} ב-${sqName(mv.to)}?! חכה תראה את התגובה שלי...` : `😤 You took my ${capName} on ${sqName(mv.to)}?! Watch my counterattack...`);
    }

    triggerChessAiTurn(pName, sqName(mv.to));
  }

  function triggerChessAiTurn(lastPlayerPieceName, lastPlayerSq) {
    const st = session.state;
    const isHe = session.lang === 'he';
    const pSide = st.playerSide || 'w';
    const aSide = st.aiSide || 'b';

    if (st.timerSec > 0 && !st.clockStarted) startChessClockIfNeeded();

    session.thinking = true;
    renderAll();

    aiTimer = setTimeout(() => {
      if (!session.open || session.gameId !== 'chess' || !session.state || session.state.winner) {
        session.thinking = false;
        return;
      }
      const aiMv = pickChessAi(st, session.difficulty, aSide);
      session.thinking = false;
      if (!aiMv) {
        stopChessClock();
        st.winner = pSide;
        renderAll();
        return;
      }
      const aiP = st.board[aiMv.from[0]][aiMv.from[1]];
      const afterAi = applyChess(st, aiMv);
      st.board = afterAi.board;
      st.turn = afterAi.turn;
      st.castle = afterAi.castle;
      st.enPassant = afterAi.enPassant;
      st.lastMove = aiMv;
      st.movesCount++;
      st.evalCp = evalChessCp(st.board);
      if (aiMv.capture) st.capturedByAi.push(aiMv.capture);
      st.history.push(formatAlgebraic(aiP, aiMv, st.board, pSide));

      const aiPName = isHe ? CHESS_NAME_HE[aiP.toLowerCase()] : CHESS_NAME_EN[aiP.toLowerCase()];
      const aiCapName = aiMv.capture ? (isHe ? CHESS_NAME_HE[aiMv.capture.toLowerCase()] : CHESS_NAME_EN[aiMv.capture.toLowerCase()]) : '';
      session.lastMoveDesc = `AI (${aSide === 'w' ? 'White' : 'Black'}) moved ${aiPName} ${sqName(aiMv.from)}->${sqName(aiMv.to)}`;
      playSfx(aiMv.capture ? 'capture' : 'ai');

      const pLegal = chessMoves(st, pSide);
      if (!pLegal.length) {
        stopChessClock();
        if (inCheck(st.board, pSide)) {
          st.winner = aSide;
          session.wins.ai++;
          playSfx('lose');
          addChat('ai', isHe ? `🏆 שח-מט! ה${aiPName} שלי ב-${sqName(aiMv.to)} סגר את המשחק! רוצה סיבוב נקמה?` : `🏆 Checkmate! My ${aiPName} on ${sqName(aiMv.to)} sealed it! Want a rematch?`);
        } else {
          st.winner = 'draw';
          session.wins.draws++;
          addChat('ai', isHe ? '🤝 תיקו (פט)! אין לך מהלך חוקי — קרב נהדר!' : '🤝 Stalemate! Great fight!');
        }
      } else if (inCheck(st.board, pSide)) {
        addChat('ai', isHe ? `⚡ שח! העברתי את ה${aiPName} ל-${sqName(aiMv.to)} — המלך שלך בסכנה!` : `⚡ Check! My ${aiPName} jumps to ${sqName(aiMv.to)} — protect your King!`);
      } else if (aiMv.capture) {
        addChat('ai', isHe ? `😎 לקחתי לך את ה${aiCapName} ב-${sqName(aiMv.to)} עם ה${aiPName} שלי! מה התשובה שלך?` : `😎 Snagged your ${aiCapName} on ${sqName(aiMv.to)} with my ${aiPName}! Your move.`);
      } else if (st.movesCount === 1) {
        addChat('ai', isHe ? `♔ פתחתי עם ${aiPName} ל-${sqName(aiMv.to)}! תורך בשחור.` : `♔ Opened with ${aiPName} to ${sqName(aiMv.to)}! Your move as Black.`);
      } else if (st.movesCount % 2 === 0) {
        const linesHe = [
          `🧠 שיחקתי ${aiPName} ל-${sqName(aiMv.to)} — תופס שליטה במרכז. תורך!`,
          lastPlayerPieceName ? `👀 קראתי את ה${lastPlayerPieceName} שלך ב-${lastPlayerSq}, אז הגבתי עם ${aiPName} ל-${sqName(aiMv.to)}.` : `✨ פיתוח מדויק: ${aiPName} ל-${sqName(aiMv.to)}.`,
          `✨ מהלך מחושב: ${aiPName} ל-${sqName(aiMv.to)}. נראה אם תקרא את התוכנית שלי!`,
        ];
        const linesEn = [
          `🧠 Played ${aiPName} to ${sqName(aiMv.to)} — seizing central pressure. Your turn!`,
          lastPlayerPieceName ? `👀 Spotted your ${lastPlayerPieceName} on ${lastPlayerSq}, so I countered with ${aiPName} to ${sqName(aiMv.to)}.` : `✨ Sharp development: ${aiPName} to ${sqName(aiMv.to)}.`,
          `✨ Solid plan: ${aiPName} to ${sqName(aiMv.to)}. Let’s see how you respond!`,
        ];
        addChat('ai', pickRand(isHe ? linesHe : linesEn));
      }
      renderAll();
    }, 460);
  }

  // 2. TIC-TAC-TOE
  function renderTtt(stage, foot) {
    const st = session.state;
    const isHe = session.lang === 'he';
    const grid = document.createElement('div');
    grid.className = 'lzg-ttt-grid';
    st.board.forEach((v, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      const isWin = st.winLine && st.winLine.includes(i);
      b.className = 'lzg-ttt-cell ' + (v ? 'mark-' + v : '') + (isWin ? ' win' : '');
      b.textContent = v;
      b.setAttribute('aria-label', `Cell ${i + 1} ${v || 'empty'}`);
      b.addEventListener('click', () => {
        if (session.thinking || st.winner || v) return;
        st.board[i] = 'X';
        playSfx('move');
        const ev = evalTtt(st.board);
        if (ev.winner) {
          st.winner = ev.winner;
          st.winLine = ev.line;
          if (ev.winner === 'X') {
            session.wins.player++;
            playSfx('win');
            addChat('ai', isHe ? '🤯 וואו! הצלחת לנצח אותי באיקס עיגול! כבוד אמיתי!' : '🤯 Whoa! You beat me at Tic-Tac-Toe! Respect!');
          } else {
            session.wins.draws++;
            addChat('ai', isHe ? '🤝 תיקו מושלם! שנינו לא עשינו שום טעות.' : '🤝 Perfect draw! Neither of us blinked.');
          }
          renderAll();
          return;
        }
        session.thinking = true;
        renderAll();
        aiTimer = setTimeout(() => {
          const mv = pickTttAi(st.board, session.difficulty);
          session.thinking = false;
          if (mv >= 0) st.board[mv] = 'O';
          playSfx('ai');
          const ev2 = evalTtt(st.board);
          if (ev2.winner) {
            st.winner = ev2.winner;
            st.winLine = ev2.line;
            if (ev2.winner === 'O') {
              session.wins.ai++;
              playSfx('lose');
              addChat('ai', isHe ? '😏 שלישייה שלי! ה-AI לוקח את הסיבוב הזה — בא לך נקמה?' : '😏 Three in a row! AI takes this round — ready for a rematch?');
            } else {
              session.wins.draws++;
              addChat('ai', isHe ? '🤝 תיקו! קרב מוחות צמוד.' : '🤝 Draw! Tight battle of wits.');
            }
          } else {
            addChat(
              'ai',
              pickRand(
                isHe
                  ? ['👀 חסמתי ושמתי O בעמדה אסטרטגית — תורך!', '⚡ מהלך חד שלך! עכשיו תראה איך אני סוגר את הלוח.']
                  : ['👀 Placed my O right where it hurts — your turn!', '⚡ Sharp move! Let’s see you break my setup now.'],
              ),
            );
          }
          renderAll();
        }, 420);
      });
      grid.appendChild(b);
    });
    stage.innerHTML = '';
    stage.appendChild(grid);
    foot.innerHTML = `<span class="lzg-hint-line">${isHe ? 'אתה: X (קורל) · ה-AI: O (תכלת)' : 'You: X (Coral) · AI: O (Sky)'}</span>`;
  }

  // 3. CONNECT FOUR
  function renderC4(stage, foot) {
    const st = session.state;
    const isHe = session.lang === 'he';
    const wrap = document.createElement('div');
    wrap.className = 'lzg-c4-grid';
    wrap.setAttribute('dir', 'ltr');

    const winSet = new Set((st.winCells || []).map(([r, c]) => r + ',' + c));
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        const val = st.board[r][c];
        const btn = document.createElement('button');
        btn.type = 'button';
        const isWin = winSet.has(r + ',' + c);
        const isLast = st.lastDrop && st.lastDrop[0] === r && st.lastDrop[1] === c;
        btn.className = 'lzg-c4-cell p' + val + (isWin ? ' win' : '') + (isLast ? ' drop' : '');
        btn.setAttribute('aria-label', `Column ${c + 1} row ${r + 1}`);
        btn.addEventListener('click', () => {
          if (session.thinking || st.winner) return;
          const res = dropC4(st.board, c, 1);
          if (!res) return;
          st.board = res.board;
          st.lastDrop = [res.row, c];
          session.lastMoveDesc = `Player dropped in column ${c + 1}`;
          playSfx('move');
          const ev = evalC4(st.board);
          if (ev.winner) {
            st.winner = ev.winner;
            st.winCells = ev.cells;
            if (ev.winner === 1) {
              session.wins.player++;
              playSfx('win');
              addChat('ai', isHe ? '🏆 ארבע בשורה!! תפסת אותי לגמרי לא מוכן — ניצחון מבריק!' : '🏆 Connect Four!! You caught me completely off guard — brilliant win!');
            } else {
              session.wins.draws++;
              addChat('ai', isHe ? '🤝 הלוח התמלא — תיקו!' : '🤝 Board full — it’s a draw!');
            }
            renderAll();
            return;
          }
          session.thinking = true;
          renderAll();
          aiTimer = setTimeout(() => {
            const ac = pickC4Ai(st.board, session.difficulty);
            session.thinking = false;
            if (ac >= 0) {
              const r2 = dropC4(st.board, ac, 2);
              if (r2) {
                st.board = r2.board;
                st.lastDrop = [r2.row, ac];
                session.lastMoveDesc = `AI dropped in column ${ac + 1}`;
              }
            }
            playSfx('ai');
            const ev2 = evalC4(st.board);
            if (ev2.winner) {
              st.winner = ev2.winner;
              st.winCells = ev2.cells;
              if (ev2.winner === 2) {
                session.wins.ai++;
                playSfx('lose');
                addChat('ai', isHe ? `🔥 בום! ארבע בשורה שלי בעמודה ${ac + 1}! עוד סיבוב?` : `🔥 Boom! Connect Four in column ${ac + 1}! Ready for round two?`);
              } else {
                session.wins.draws++;
                addChat('ai', isHe ? '🤝 תיקו צמוד!' : '🤝 Close draw!');
              }
            } else {
              addChat(
                'ai',
                pickRand(
                  isHe
                    ? [`🎯 הפלתי לעמודה ${ac + 1} — שים לב לאלכסונים!`, `🧠 עמודה ${ac + 1} שלי. אהבתי את המהלך שלך בעמודה ${c + 1}!`]
                    : [`🎯 Dropped into column ${ac + 1} — watch the diagonals!`, `🧠 Column ${ac + 1} is mine. Nice pressure in column ${c + 1}!`],
                ),
              );
            }
            renderAll();
          }, 480);
        });
        wrap.appendChild(btn);
      }
    }
    stage.innerHTML = '';
    stage.appendChild(wrap);
    foot.innerHTML = `<span class="lzg-hint-line">${isHe ? 'לחץ על עמודה להפלת דיסקית אדומה · ה-AI משחק בזהב' : 'Tap any column to drop your Crimson disc · AI plays Gold'}</span>`;
  }

  // 4. CHECKERS
  function renderCheckers(stage, foot) {
    const st = session.state;
    const isHe = session.lang === 'he';
    const legal = st.winner || st.turn !== 1 ? [] : checkersMoves(st.board, 1);
    const selMoves = st.selected ? legal.filter((m) => m.from[0] === st.selected[0] && m.from[1] === st.selected[1]) : [];
    const tMap = new Map(selMoves.map((m) => [m.to[0] + ',' + m.to[1], m]));

    const grid = document.createElement('div');
    grid.className = 'lzg-chess-grid';
    grid.setAttribute('dir', 'ltr');

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const v = st.board[r][c];
        const btn = document.createElement('button');
        btn.type = 'button';
        const isDark = (r + c) % 2 === 1;
        const isSel = st.selected && st.selected[0] === r && st.selected[1] === c;
        const mv = tMap.get(r + ',' + c);
        btn.className = 'lzg-ch-sq ' + (isDark ? 'dark' : 'light') + (isSel ? ' sel' : '') + (mv ? ' legal' : '');
        if (v !== 0) {
          btn.innerHTML = `<span class="lzg-chk-disc ${v > 0 ? 'pl' : 'ai'}${Math.abs(v) === 2 ? ' king' : ''}">${Math.abs(v) === 2 ? '♛' : ''}</span>`;
        } else if (mv) {
          btn.innerHTML = '<span class="lzg-ch-dot"></span>';
        }
        btn.addEventListener('click', () => {
          if (session.thinking || st.winner || st.turn !== 1) return;
          if (mv) {
            st.board = applyCheckers(st.board, mv);
            st.selected = null;
            playSfx(mv.captured ? 'capture' : 'move');
            if (mv.captured) {
              addChat('ai', isHe ? '😮 אכלת לי כלי בדמקה! לא מוותר לך...' : '😮 Nice jump! Taking my piece like that — watch out!');
            }
            const aiMoves = checkersMoves(st.board, -1);
            if (!aiMoves.length) {
              st.winner = 1;
              session.wins.player++;
              playSfx('win');
              addChat('ai', isHe ? '🏆 ניצחת בדמקה! חיסלת לי את כל המהלכים!' : '🏆 You won at Checkers! Left me with zero moves!');
              renderAll();
              return;
            }
            st.turn = -1;
            session.thinking = true;
            renderAll();
            aiTimer = setTimeout(() => {
              const am = pickCheckersAi(st.board, session.difficulty);
              session.thinking = false;
              if (am) {
                st.board = applyCheckers(st.board, am);
                playSfx(am.captured ? 'capture' : 'ai');
                if (am.captured) addChat('ai', isHe ? '⚡ הופ! קפצתי ואכלתי לך כלי!' : '⚡ Hop! Captured your checker!');
                else addChat('ai', isHe ? '🧠 התקדמתי חכם לכיוון ההכתרה — תורך!' : '🧠 Advancing toward a King — your turn!');
              }
              const pMoves = checkersMoves(st.board, 1);
              if (!pMoves.length) {
                st.winner = -1;
                session.wins.ai++;
                playSfx('lose');
                addChat('ai', isHe ? '🤖 ניצחתי הפעם בדמקה! מוכן למשחק חוזר?' : '🤖 I took this Checkers match! Ready for a rematch?');
              } else {
                st.turn = 1;
              }
              renderAll();
            }, 500);
            return;
          }
          if (v > 0) {
            st.selected = isSel ? null : [r, c];
            renderAll();
          }
        });
        grid.appendChild(btn);
      }
    }
    stage.innerHTML = '';
    stage.appendChild(grid);
    const mustCap = legal.some((m) => m.captured);
    foot.innerHTML = `<span class="lzg-hint-line">${mustCap ? (isHe ? '⚡ יש לך אכילת חובה!' : '⚡ Forced capture available!') : (isHe ? 'אתה: אדום רובי · ה-AI: אובסידיאן-כסף · לחץ על כלי ואז על היעד' : 'You: Ruby Red · AI: Obsidian-Silver · Tap a checker then a target')}</span>`;
  }

  // 5. REVERSI
  function renderReversi(stage, foot) {
    const st = session.state;
    const isHe = session.lang === 'he';
    const legal = st.winner || st.turn !== 1 ? [] : revMoves(st.board, 1);
    const lMap = new Map(legal.map((m) => [m.r + ',' + m.c, m]));

    const grid = document.createElement('div');
    grid.className = 'lzg-chess-grid reversi';
    grid.setAttribute('dir', 'ltr');

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const v = st.board[r][c];
        const mv = lMap.get(r + ',' + c);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lzg-rev-sq' + (mv ? ' legal' : '');
        if (v) btn.innerHTML = `<span class="lzg-rev-disc p${v}"></span>`;
        else if (mv) btn.innerHTML = `<span class="lzg-ch-dot"></span>`;
        btn.addEventListener('click', () => {
          if (session.thinking || st.winner || !mv) return;
          st.board = applyRev(st.board, r, c, 1);
          playSfx(mv.flips.length >= 3 ? 'capture' : 'move');
          if (mv.flips.length >= 3) {
            addChat('ai', isHe ? `🔥 וואו, הפכת לי ${mv.flips.length} אבנים במכה אחת!` : `🔥 Whoa, you flipped ${mv.flips.length} of my discs at once!`);
          }
          runReversiAiTurn();
        });
        grid.appendChild(btn);
      }
    }
    stage.innerHTML = '';
    stage.appendChild(grid);
    foot.innerHTML = `<span class="lzg-hint-line">${isHe ? 'אתה: שחור אובסידיאן · ה-AI: פנינה לבנה · לחץ על נקודה מוזהבת להפוך אבנים' : 'You: Obsidian Black · AI: Pearl White · Tap any gold dot to flip discs'}</span>`;
  }

  function finishReversi() {
    const st = session.state;
    const isHe = session.lang === 'he';
    let p = 0, a = 0;
    st.board.flat().forEach((v) => { if (v === 1) p++; else if (v === 2) a++; });
    if (p > a) {
      st.winner = 1; session.wins.player++; playSfx('win');
      addChat('ai', isHe ? `🏆 ניצחת ברברסי ${p}–${a}! שליטה מרשימה בלוח.` : `🏆 You won Reversi ${p}–${a}! Impressive board control.`);
    } else if (a > p) {
      st.winner = 2; session.wins.ai++; playSfx('lose');
      addChat('ai', isHe ? `🤖 ניצחתי ${a}–${p} ברברסי! הפינות עשו את ההבדל.` : `🤖 I won Reversi ${a}–${p}! Those corners paid off.`);
    } else {
      st.winner = 'draw'; session.wins.draws++;
      addChat('ai', isHe ? `🤝 תיקו ${p}–${a}! איזה קרב!` : `🤝 Tie game ${p}–${a}! What a match!`);
    }
    renderAll();
  }

  function runReversiAiTurn() {
    const st = session.state;
    const isHe = session.lang === 'he';
    const aiMoves = revMoves(st.board, 2);
    if (!aiMoves.length) {
      if (!revMoves(st.board, 1).length) { finishReversi(); return; }
      addChat('ai', isHe ? '😅 אין לי מהלך חוקי — התור חוזר אליך!' : '😅 I have no legal moves — your turn again!');
      st.turn = 1;
      renderAll();
      return;
    }
    st.turn = 2;
    session.thinking = true;
    renderAll();
    aiTimer = setTimeout(() => {
      const am = pickRevAi(st.board, session.difficulty);
      session.thinking = false;
      if (am) {
        st.board = applyRev(st.board, am.r, am.c, 2);
        playSfx('ai');
        addChat('ai', isHe ? `⚫ הפכתי לך ${am.flips.length} אבנים! נראה איך תשתלט בחזרה.` : `⚫ Flipped ${am.flips.length} of your discs! Your turn.`);
      }
      if (!revMoves(st.board, 1).length) {
        if (!revMoves(st.board, 2).length) { finishReversi(); return; }
        addChat('ai', isHe ? '⚡ אין לך מהלך חוקי — אני משחק שוב!' : '⚡ No legal move for you — I go again!');
        runReversiAiTurn();
        return;
      }
      st.turn = 1;
      renderAll();
    }, 520);
  }

  // 6. BATTLESHIP
  function renderBattleship(stage, foot) {
    const st = session.state;
    const isHe = session.lang === 'he';
    const wrap = document.createElement('div');
    wrap.className = 'lzg-bs-wrap';

    const tabs = document.createElement('div');
    tabs.className = 'lzg-bs-tabs';
    tabs.innerHTML = `
      <button type="button" class="${st.viewTab === 'enemy' ? 'on' : ''}" data-t="enemy">${isHe ? '🎯 רדאר אויב (לירי)' : '🎯 Enemy Radar (Fire)'}</button>
      <button type="button" class="${st.viewTab === 'self' ? 'on' : ''}" data-t="self">${isHe ? '🚢 הצי שלך' : '🚢 Your Fleet'}</button>
    `;
    tabs.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => { st.viewTab = b.dataset.t; renderAll(); });
    });
    wrap.appendChild(tabs);

    const isEnemy = st.viewTab === 'enemy';
    const g = isEnemy ? st.aiFleet : st.playerFleet;
    const grid = document.createElement('div');
    grid.className = 'lzg-bs-grid';
    grid.setAttribute('dir', 'ltr');

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const shot = g.shots[r][c];
        const hasShip = g.ships[r][c] > 0;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className =
          'lzg-bs-sq' +
          (!isEnemy && hasShip ? ' ship' : '') +
          (shot === 1 ? ' miss' : '') +
          (shot === 2 ? ' hit' : '');
        btn.textContent = shot === 2 ? '💥' : shot === 1 ? '•' : !isEnemy && hasShip ? '▪' : '';
        if (isEnemy) {
          btn.addEventListener('click', () => {
            if (session.thinking || st.winner || shot !== 0) return;
            const res = fireBs(st.aiFleet, r, c);
            if (res.outcome === 'hit' || res.outcome === 'sunk') {
              st.pHits++;
              playSfx('capture');
              if (res.allSunk) {
                st.winner = 'player';
                session.wins.player++;
                playSfx('win');
                addChat('ai', isHe ? '🏆 הטבעת את כל הצי שלי!! אדמירל אמיתי!' : '🏆 You sank my entire fleet!! True Admiral!');
                renderAll();
                return;
              }
              addChat('ai', res.outcome === 'sunk'
                ? (isHe ? '💥 הטבעת לי ספינה שלמה!! אש עליך!' : '💥 You sank one of my ships!! Direct hit!')
                : (isHe ? '🎯 פגיעה ישירה! עלית על אחת הצוללות שלי!' : '🎯 Direct hit! You found one of my ships!'));
            } else {
              playSfx('move');
            }
            session.thinking = true;
            renderAll();
            aiTimer = setTimeout(() => {
              const tg = pickBsAi(st.playerFleet, session.difficulty);
              session.thinking = false;
              if (tg) {
                const ares = fireBs(st.playerFleet, tg[0], tg[1]);
                if (ares.outcome === 'hit' || ares.outcome === 'sunk') {
                  st.aHits++;
                  playSfx('capture');
                  if (ares.allSunk) {
                    st.winner = 'ai';
                    session.wins.ai++;
                    playSfx('lose');
                    addChat('ai', isHe ? '🤖 כל הצי שלך הוטבע! הים שייך ל-Lokizenith AI הפעם!' : '🤖 Your entire fleet is sunk! AI rules the waves this round!');
                  } else {
                    addChat('ai', isHe ? `🔥 פגעתי בצי שלך במשבצת ${String.fromCharCode(65 + tg[1])}${tg[0] + 1}!` : `🔥 Hit your fleet at ${String.fromCharCode(65 + tg[1])}${tg[0] + 1}!`);
                  }
                } else {
                  playSfx('ai');
                  addChat('ai', isHe ? `💧 פספסתי ב-${String.fromCharCode(65 + tg[1])}${tg[0] + 1}. תורך לירות!` : `💧 Missed at ${String.fromCharCode(65 + tg[1])}${tg[0] + 1}. Fire away!`);
                }
              }
              renderAll();
            }, 460);
          });
        }
        grid.appendChild(btn);
      }
    }
    wrap.appendChild(grid);
    stage.innerHTML = '';
    stage.appendChild(wrap);
    foot.innerHTML = `<span class="lzg-hint-line">${isHe ? '4 ספינות מוסתרות (4, 3, 3, 2) · לחץ על רדאר האויב לירות' : '4 hidden ships (4, 3, 3, 2) · Tap Enemy Radar to fire'}</span>`;
  }

  // 7. STRATEGIC NIM
  function renderNim(stage, foot) {
    const st = session.state;
    const isHe = session.lang === 'he';
    const wrap = document.createElement('div');
    wrap.className = 'lzg-nim-wrap';

    st.piles.forEach((count, rowIdx) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'lzg-nim-row';
      const lbl = document.createElement('span');
      lbl.className = 'lzg-nim-lbl';
      lbl.textContent = isHe ? `שורה ${rowIdx + 1}` : `Row ${rowIdx + 1}`;
      rowEl.appendChild(lbl);

      const gems = document.createElement('div');
      gems.className = 'lzg-nim-gems';
      if (count === 0) {
        gems.innerHTML = `<span class="lzg-nim-empty">${isHe ? 'ריקה' : 'Empty'}</span>`;
      } else {
        for (let k = 0; k < count; k++) {
          const takeCount = count - k;
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'lzg-nim-gem';
          b.title = isHe ? `קח ${takeCount} קריסטלים` : `Take ${takeCount} crystals`;
          b.textContent = '◆';
          b.addEventListener('click', () => {
            if (session.thinking || st.winner) return;
            st.piles[rowIdx] -= takeCount;
            playSfx('move');
            if (st.piles.every((x) => x === 0)) {
              st.winner = 1;
              session.wins.player++;
              playSfx('win');
              addChat('ai', isHe ? '🏆 לקחת את הקריסטל האחרון! גאון מתמטי — ניצחת!' : '🏆 You took the last crystal! Math master — you win!');
              renderAll();
              return;
            }
            session.thinking = true;
            renderAll();
            aiTimer = setTimeout(() => {
              const am = pickNimAi(st.piles, session.difficulty);
              session.thinking = false;
              if (am) {
                st.piles[am.row] -= am.take;
                playSfx('ai');
                if (st.piles.every((x) => x === 0)) {
                  st.winner = 2;
                  session.wins.ai++;
                  playSfx('lose');
                  addChat('ai', isHe ? `🤖 לקחתי את ${am.take} האחרונים משורה ${am.row + 1} וניצחתי! רוצה ללמוד את הטריק של Nim?` : `🤖 Took the last ${am.take} from Row ${am.row + 1} for the win! Ask me for a hint next round!`);
                } else {
                  addChat('ai', isHe ? `💎 לקחתי ${am.take} משורה ${am.row + 1}. עכשיו נראה איך תגיב!` : `💎 Took ${am.take} from Row ${am.row + 1}. Your turn!`);
                }
              }
              renderAll();
            }, 460);
          });
          gems.appendChild(b);
        }
      }
      rowEl.appendChild(gems);
      wrap.appendChild(rowEl);
    });

    stage.innerHTML = '';
    stage.appendChild(wrap);
    foot.innerHTML = `<span class="lzg-hint-line">${isHe ? 'לחץ על קריסטל כדי לקחת אותו ואת אלו שאחריו · הקריסטל האחרון מנצח' : 'Click a crystal to take it & the ones to its right · Last crystal wins'}</span>`;
  }

  window.LZGames = {
    GAMES,
    detectPrompt,
    renderGamePickerCard,
    openGame,
    closeGame,
    minimizeGame,
  };
})();
