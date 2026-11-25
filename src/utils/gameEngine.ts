export type GameId =
  | 'chess'
  | 'tictactoe'
  | 'connect4'
  | 'checkers'
  | 'reversi'
  | 'battleship'
  | 'nim';

export type GameDifficulty = 'easy' | 'medium' | 'pro';
export type GameLang = 'he' | 'en';

export interface PlayIntentResult {
  isPlayRequest: boolean;
  lang: GameLang;
  suggestedGameId: GameId | null;
}

export interface GameCatalogItem {
  id: GameId;
  nameHe: string;
  nameEn: string;
  descHe: string;
  descEn: string;
  durationHe: string;
  durationEn: string;
  categoryHe: string;
  categoryEn: string;
}

export const GAME_CATALOG: GameCatalogItem[] = [
  {
    id: 'chess',
    nameHe: 'שחמט',
    nameEn: 'Chess',
    descHe: 'קרב אסטרטגי מלא 8×8 עם שח, מט, הצרחה והכתרה',
    descEn: 'Full 8×8 strategy with check, checkmate, castling & promotion',
    durationHe: '5–15 דק׳',
    durationEn: '5–15 min',
    categoryHe: 'אסטרטגיה',
    categoryEn: 'Strategy',
  },
  {
    id: 'tictactoe',
    nameHe: 'איקס עיגול',
    nameEn: 'Tic-Tac-Toe',
    descHe: 'קלאסיקה מהירה 3×3 — נסה לפצח את ה-AI',
    descEn: 'Fast 3×3 classic — try to outsmart the minimax AI',
    durationHe: '1–2 דק׳',
    durationEn: '1–2 min',
    categoryHe: 'מהיר',
    categoryEn: 'Quick',
  },
  {
    id: 'connect4',
    nameHe: 'ארבע בשורה',
    nameEn: 'Connect Four',
    descHe: 'הפל דיסקיות ללוח 6×7 וצור רצף של 4 לפני ה-AI',
    descEn: 'Drop discs into a 6×7 grid to connect four before the AI',
    durationHe: '2–5 דק׳',
    durationEn: '2–5 min',
    categoryHe: 'טקטיקה',
    categoryEn: 'Tactics',
  },
  {
    id: 'checkers',
    nameHe: 'דמקה',
    nameEn: 'Checkers',
    descHe: 'לוח 8×8 עם קפיצות שרשרת, אכילות והכתרת מלכים',
    descEn: '8×8 draughts with chain captures and king promotions',
    durationHe: '4–10 דק׳',
    durationEn: '4–10 min',
    categoryHe: 'לוח קלאסי',
    categoryEn: 'Classic Board',
  },
  {
    id: 'reversi',
    nameHe: 'רברסי (אותלו)',
    nameEn: 'Reversi (Othello)',
    descHe: 'לכוד והפוך את אבני ה-AI כדי לשלוט בלוח 8×8',
    descEn: 'Trap and flip the AI discs to dominate the 8×8 board',
    durationHe: '4–8 דק׳',
    durationEn: '4–8 min',
    categoryHe: 'שליטה',
    categoryEn: 'Territory',
  },
  {
    id: 'battleship',
    nameHe: 'צוללות',
    nameEn: 'Battleship',
    descHe: 'קרב ימי 7×7 — אתר והטבע את צי ה-AI לפני שיטביע אותך',
    descEn: '7×7 naval duel — hunt and sink the AI fleet first',
    durationHe: '3–6 דק׳',
    durationEn: '3–6 min',
    categoryHe: 'ניחוש וקרב',
    categoryEn: 'Naval Duel',
  },
  {
    id: 'nim',
    nameHe: 'נים אסטרטגי',
    nameEn: 'Strategic Nim',
    descHe: 'משחק קריסטלים מתמטי — קח אחרון וזכה בניצחון',
    descEn: 'Mathematical crystal strategy — take the last crystal to win',
    durationHe: '1–3 דק׳',
    durationEn: '1–3 min',
    categoryHe: 'מתמטיקה',
    categoryEn: 'Logic',
  },
];

const SPECIFIC_GAME_PATTERNS: Array<{ id: GameId; rx: RegExp }> = [
  { id: 'chess', rx: /\bchess\b|שחמט|שח-מט|שח\s*מט/i },
  { id: 'tictactoe', rx: /\btic[\s-]*tac[\s-]*toe\b|איקס[\s-]*עיגול|איקס\s+מיקס|\bx[\s-]*o\b/i },
  { id: 'connect4', rx: /\bconnect[\s-]*(?:4|four)\b|ארבע\s+בשורה|4\s+בשורה/i },
  { id: 'checkers', rx: /\bcheckers?\b|\bdraughts\b|דמקה/i },
  { id: 'reversi', rx: /\breversi\b|\bothello\b|רברסי|אותלו/i },
  { id: 'battleship', rx: /\bbattleships?\b|צוללות/i },
  { id: 'nim', rx: /\bnim\b|נים(?:\s+אסטרטגי)?/i },
];

export function detectPlayGameIntent(text: string): PlayIntentResult {
  const raw = String(text || '').trim();
  const heCount = (raw.match(/[\u0590-\u05FF]/g) || []).length;
  const lang: GameLang = heCount >= 2 ? 'he' : 'en';
  if (!raw || raw.length > 220) {
    return { isPlayRequest: false, lang, suggestedGameId: null };
  }

  // Avoid coding / tutorial / encyclopedic requests like "build a chess game in React" or "history of chess"
  if (
    /\b(code|script|html|css|python|javascript|typescript|react|unity|godot|tutorial|algorithm|how\s+to\s+build|create\s+a\s+website|history\s+of|who\s+invented|explain\s+the\s+rules|rules\s+of|review\s+of|recommend\s+pc|steam|ps5|xbox)\b|תכתוב\s+קוד|כתוב\s+קוד|בנה\s+אפליקציה|קוד\s+למשחק|תכנת|היסטוריה\s+של|מי\s+המציא|הסבר\s+(?:את\s+)?החוקים|חוקי\s+המשחק/i.test(
      raw,
    )
  ) {
    return { isPlayRequest: false, lang, suggestedGameId: null };
  }

  let suggestedGameId: GameId | null = null;
  for (const g of SPECIFIC_GAME_PATTERNS) {
    if (g.rx.test(raw)) {
      suggestedGameId = g.id;
      break;
    }
  }

  // Universal Hebrew game-launch trigger: ANY request asking to play a game, open a game, or naming one of the 7 games directly
  const heTrigger =
    /(?:תשחק|שחק|נשחק|לשחק|נעשה|תפתח|פתח|תפעיל|הפעל|תביא|תן|תציע|אפשר|רוצה|בא\s*לי|בוא|יאללה|בואי)\s*(?:לי|לנו|איתי|אתך|איתך|ביחד|נגדך|נגדי|איזה|עוד|את)?\s*(?:נשחק|לשחק|משחק|משחקים|משחקון|שחמט|שח-מט|איקס|דמקה|רברסי|אותלו|צוללות|ארבע|4\s+בשורה|נים|סיבוב)|(?:משחק|משחקים|זירת\s*משחקים)\s*(?:איתי|נגדך|נגד\s*ה-?ai|חדש|כלשהו|מהיר|לשניים|בבקשה|עכשיו)?[!?.🎮♟️\s]*$|^(?:משחק|משחקים|בוא\s+נשחק|תשחק\s+איתי|שחק\s+איתי|נשחק|לשחק|בא\s+לי\s+לשחק|משעמם\s+לי.*(?:משחק|לשחק|נשחק))[!?.🎮♟️\s]*$/i;

  // Universal English game-launch trigger
  const enTrigger =
    /\b(?:play\s+(?:with\s+me|against\s+me|a\s+game|some\s+games?|games?|something|chess|tic[\s-]*tac[\s-]*toe|connect\s*(?:4|four)|checkers|draughts|reversi|othello|battleships?|nim)|let'?s\s+play|wanna\s+play|want\s+to\s+play|open\s+(?:a\s+)?games?|start\s+(?:a\s+)?games?|launch\s+(?:a\s+)?games?|give\s+me\s+a\s+game|show\s+(?:me\s+)?games?|challenge\s+(?:you|me)|game\s+(?:mode|arena|time)|two[\s-]*player\s+games?|mini[\s-]*games?)\b|^(?:play|game|games|play\s+game)[!?.🎮♟️\s]*$/i;

  // Short direct game name request (e.g. "שחמט", "דמקה בבקשה", "chess!", "connect 4", "איקס עיגול")
  const directNamedGame = Boolean(suggestedGameId && raw.length <= 42 && !/[?؟]/.test(raw));

  const isPlayRequest = heTrigger.test(raw) || enTrigger.test(raw) || directNamedGame;
  return { isPlayRequest, lang, suggestedGameId: isPlayRequest ? suggestedGameId : null };
}

/* ============================================================================
   1. TIC-TAC-TOE ENGINE (3x3)
   ============================================================================ */
export type TttCell = '' | 'X' | 'O';

const TTT_LINES: ReadonlyArray<[number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function evaluateTtt(board: TttCell[]): { winner: 'X' | 'O' | 'draw' | null; line: number[] | null } {
  for (const [a, b, c] of TTT_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as 'X' | 'O', line: [a, b, c] };
    }
  }
  if (board.every((cell) => cell !== '')) {
    return { winner: 'draw', line: null };
  }
  return { winner: null, line: null };
}

function tttMinimax(board: TttCell[], isAi: boolean, depth: number): number {
  const res = evaluateTtt(board);
  if (res.winner === 'O') return 10 - depth;
  if (res.winner === 'X') return depth - 10;
  if (res.winner === 'draw') return 0;

  if (isAi) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        best = Math.max(best, tttMinimax(board, false, depth + 1));
        board[i] = '';
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        best = Math.min(best, tttMinimax(board, true, depth + 1));
        board[i] = '';
      }
    }
    return best;
  }
}

export function pickTttAiMove(board: TttCell[], difficulty: GameDifficulty = 'medium'): number {
  const empties = board.map((c, i) => (c === '' ? i : -1)).filter((i) => i >= 0);
  if (!empties.length) return -1;
  if (difficulty === 'easy') {
    // Still take immediate winning move 50% of the time, otherwise random
    for (const idx of empties) {
      const copy = [...board];
      copy[idx] = 'O';
      if (evaluateTtt(copy).winner === 'O') return idx;
    }
    return empties[Math.floor(Math.random() * empties.length)];
  }
  if (difficulty === 'medium') {
    // Always win or block immediate threats, then prefer center/corners
    for (const idx of empties) {
      const copy = [...board];
      copy[idx] = 'O';
      if (evaluateTtt(copy).winner === 'O') return idx;
    }
    for (const idx of empties) {
      const copy = [...board];
      copy[idx] = 'X';
      if (evaluateTtt(copy).winner === 'X') return idx;
    }
    if (board[4] === '') return 4;
    const corners = [0, 2, 6, 8].filter((i) => board[i] === '');
    if (corners.length) return corners[0];
    return empties[0];
  }
  // Pro: full unbeatable minimax
  let bestScore = -Infinity;
  let bestMove = empties[0];
  const copy = [...board];
  for (const idx of empties) {
    copy[idx] = 'O';
    const score = tttMinimax(copy, false, 0);
    copy[idx] = '';
    if (score > bestScore) {
      bestScore = score;
      bestMove = idx;
    }
  }
  return bestMove;
}

/* ============================================================================
   2. CONNECT FOUR ENGINE (6 rows x 7 cols)
   ============================================================================ */
export type C4Cell = 0 | 1 | 2; // 1 = Player, 2 = AI

export function createConnect4Board(): C4Cell[][] {
  return Array.from({ length: 6 }, () => Array<C4Cell>(7).fill(0));
}

export function dropConnect4(board: C4Cell[][], col: number, player: 1 | 2): { row: number; board: C4Cell[][] } | null {
  if (col < 0 || col > 6) return null;
  for (let r = 5; r >= 0; r--) {
    if (board[r][col] === 0) {
      const next = board.map((row) => [...row]);
      next[r][col] = player;
      return { row: r, board: next };
    }
  }
  return null;
}

export function evaluateConnect4(board: C4Cell[][]): { winner: 1 | 2 | 'draw' | null; cells: Array<[number, number]> | null } {
  const dirs: Array<[number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const p = board[r][c];
      if (!p) continue;
      for (const [dr, dc] of dirs) {
        const line: Array<[number, number]> = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= 6 || nc < 0 || nc >= 7 || board[nr][nc] !== p) break;
          line.push([nr, nc]);
        }
        if (line.length === 4) {
          return { winner: p as 1 | 2, cells: line };
        }
      }
    }
  }
  if (board[0].every((c) => c !== 0)) {
    return { winner: 'draw', cells: null };
  }
  return { winner: null, cells: null };
}

function scoreConnect4Board(board: C4Cell[][]): number {
  let score = 0;
  for (let r = 0; r < 6; r++) {
    if (board[r][3] === 2) score += 4;
    if (board[r][3] === 1) score -= 3;
  }
  const scoreWindow = (w: C4Cell[]) => {
    const ai = w.filter((x) => x === 2).length;
    const pl = w.filter((x) => x === 1).length;
    const em = w.filter((x) => x === 0).length;
    if (ai === 4) return 1000;
    if (ai === 3 && em === 1) return 14;
    if (ai === 2 && em === 2) return 3;
    if (pl === 3 && em === 1) return -18;
    if (pl === 2 && em === 2) return -2;
    return 0;
  };
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 4; c++) score += scoreWindow([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]]);
  }
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r < 3; r++) score += scoreWindow([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]]);
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      score += scoreWindow([board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]]);
      score += scoreWindow([board[r + 3][c], board[r + 2][c + 1], board[r + 1][c + 2], board[r][c + 3]]);
    }
  }
  return score;
}

function c4AlphaBeta(board: C4Cell[][], depth: number, alpha: number, beta: number, maximizing: boolean): number {
  const ev = evaluateConnect4(board);
  if (ev.winner === 2) return 10000 + depth;
  if (ev.winner === 1) return -10000 - depth;
  if (ev.winner === 'draw' || depth === 0) return scoreConnect4Board(board);

  const order = [3, 2, 4, 1, 5, 0, 6];
  if (maximizing) {
    let val = -Infinity;
    for (const col of order) {
      const res = dropConnect4(board, col, 2);
      if (!res) continue;
      val = Math.max(val, c4AlphaBeta(res.board, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, val);
      if (alpha >= beta) break;
    }
    return val;
  } else {
    let val = Infinity;
    for (const col of order) {
      const res = dropConnect4(board, col, 1);
      if (!res) continue;
      val = Math.min(val, c4AlphaBeta(res.board, depth - 1, alpha, beta, true));
      beta = Math.min(beta, val);
      if (alpha >= beta) break;
    }
    return val;
  }
}

export function pickConnect4AiCol(board: C4Cell[][], difficulty: GameDifficulty = 'medium'): number {
  const validCols = [3, 2, 4, 1, 5, 0, 6].filter((c) => board[0][c] === 0);
  if (!validCols.length) return -1;
  // Immediate winning move
  for (const c of validCols) {
    const res = dropConnect4(board, c, 2);
    if (res && evaluateConnect4(res.board).winner === 2) return c;
  }
  // Immediate block
  for (const c of validCols) {
    const res = dropConnect4(board, c, 1);
    if (res && evaluateConnect4(res.board).winner === 1) return c;
  }
  if (difficulty === 'easy') {
    return validCols[Math.floor(Math.random() * validCols.length)];
  }
  const depth = difficulty === 'pro' ? 4 : 2;
  let bestCol = validCols[0];
  let bestScore = -Infinity;
  for (const c of validCols) {
    const res = dropConnect4(board, c, 2);
    if (!res) continue;
    const sc = c4AlphaBeta(res.board, depth - 1, -Infinity, Infinity, false);
    if (sc > bestScore) {
      bestScore = sc;
      bestCol = c;
    }
  }
  return bestCol;
}

/* ============================================================================
   3. CHESS ENGINE (8x8 — Full Legal Moves, Castling, Promotion, Check/Mate)
   ============================================================================ */
// Uppercase = White (Player), Lowercase = Black (AI)
export type ChessPiece = '' | 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export interface ChessState {
  board: ChessPiece[][];
  turn: 'w' | 'b';
  castle: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  enPassant?: [number, number] | null;
}
export interface ChessMove {
  from: [number, number];
  to: [number, number];
  capture?: ChessPiece;
  promotion?: ChessPiece;
  castleSide?: 'K' | 'Q';
  isEnPassant?: boolean;
}

export function createInitialChessState(): ChessState {
  return {
    board: [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
    ],
    turn: 'w',
    castle: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
  };
}

function isWhitePiece(p: ChessPiece): boolean {
  return p !== '' && p === p.toUpperCase();
}

function pieceColor(p: ChessPiece): 'w' | 'b' | null {
  if (!p) return null;
  return isWhitePiece(p) ? 'w' : 'b';
}

function inBounds8(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function findKing(board: ChessPiece[][], color: 'w' | 'b'): [number, number] | null {
  const target: ChessPiece = color === 'w' ? 'K' : 'k';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === target) return [r, c];
    }
  }
  return null;
}

export function isSquareAttacked(board: ChessPiece[][], r: number, c: number, byColor: 'w' | 'b'): boolean {
  // Pawn attacks
  const pawnDir = byColor === 'w' ? 1 : -1;
  const pawnChar: ChessPiece = byColor === 'w' ? 'P' : 'p';
  for (const dc of [-1, 1]) {
    const pr = r + pawnDir;
    const pc = c + dc;
    if (inBounds8(pr, pc) && board[pr][pc] === pawnChar) return true;
  }
  // Knight attacks
  const knightChar: ChessPiece = byColor === 'w' ? 'N' : 'n';
  const knOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of knOffsets) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds8(nr, nc) && board[nr][nc] === knightChar) return true;
  }
  // King attacks
  const kingChar: ChessPiece = byColor === 'w' ? 'K' : 'k';
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds8(nr, nc) && board[nr][nc] === kingChar) return true;
    }
  }
  // Rook / Queen orthogonal rays
  const rookChar: ChessPiece = byColor === 'w' ? 'R' : 'r';
  const queenChar: ChessPiece = byColor === 'w' ? 'Q' : 'q';
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds8(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p === rookChar || p === queenChar) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  // Bishop / Queen diagonal rays
  const bishopChar: ChessPiece = byColor === 'w' ? 'B' : 'b';
  for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds8(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p === bishopChar || p === queenChar) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return false;
}

export function isKingInCheck(board: ChessPiece[][], color: 'w' | 'b'): boolean {
  const kPos = findKing(board, color);
  if (!kPos) return false;
  return isSquareAttacked(board, kPos[0], kPos[1], color === 'w' ? 'b' : 'w');
}

export function applyChessMove(state: ChessState, move: ChessMove): ChessState {
  const board = state.board.map((row) => [...row]);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = board[fr][fc];
  board[fr][fc] = '';
  if (move.isEnPassant) {
    board[fr][tc] = '';
  }
  board[tr][tc] = move.promotion || piece;

  // Handle castling rook movement
  if (move.castleSide === 'K') {
    const row = piece === 'K' ? 7 : 0;
    board[row][5] = board[row][7];
    board[row][7] = '';
  } else if (move.castleSide === 'Q') {
    const row = piece === 'K' ? 7 : 0;
    board[row][3] = board[row][0];
    board[row][0] = '';
  }

  const castle = { ...state.castle };
  if (piece === 'K') { castle.wK = false; castle.wQ = false; }
  if (piece === 'k') { castle.bK = false; castle.bQ = false; }
  if ((fr === 7 && fc === 7) || (tr === 7 && tc === 7)) castle.wK = false;
  if ((fr === 7 && fc === 0) || (tr === 7 && tc === 0)) castle.wQ = false;
  if ((fr === 0 && fc === 7) || (tr === 0 && tc === 7)) castle.bK = false;
  if ((fr === 0 && fc === 0) || (tr === 0 && tc === 0)) castle.bQ = false;

  let enPassant: [number, number] | null = null;
  if ((piece === 'P' || piece === 'p') && Math.abs(tr - fr) === 2) {
    enPassant = [(fr + tr) / 2, fc];
  }

  return { board, turn: state.turn === 'w' ? 'b' : 'w', castle, enPassant };
}

export function getLegalChessMoves(state: ChessState, color: 'w' | 'b' = state.turn): ChessMove[] {
  const pseudo: ChessMove[] = [];
  const enemy: 'w' | 'b' = color === 'w' ? 'b' : 'w';
  const { board } = state;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || pieceColor(p) !== color) continue;
      const type = p.toLowerCase();

      if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;
        const promoRow = color === 'w' ? 0 : 7;
        const promoPiece: ChessPiece = color === 'w' ? 'Q' : 'q';
        if (inBounds8(r + dir, c) && !board[r + dir][c]) {
          pseudo.push({
            from: [r, c],
            to: [r + dir, c],
            promotion: r + dir === promoRow ? promoPiece : undefined,
          });
          if (r === startRow && !board[r + dir * 2][c]) {
            pseudo.push({ from: [r, c], to: [r + dir * 2, c] });
          }
        }
        for (const dc of [-1, 1]) {
          const nr = r + dir;
          const nc = c + dc;
          if (!inBounds8(nr, nc)) continue;
          if (board[nr][nc] && pieceColor(board[nr][nc]) === enemy) {
            pseudo.push({
              from: [r, c],
              to: [nr, nc],
              capture: board[nr][nc],
              promotion: nr === promoRow ? promoPiece : undefined,
            });
          } else if (state.enPassant && state.enPassant[0] === nr && state.enPassant[1] === nc) {
            const epCaptured = board[r][nc];
            if (epCaptured && pieceColor(epCaptured) === enemy && epCaptured.toLowerCase() === 'p') {
              pseudo.push({
                from: [r, c],
                to: [nr, nc],
                capture: epCaptured,
                isEnPassant: true,
              });
            }
          }
        }
      } else if (type === 'n') {
        for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds8(nr, nc)) continue;
          const target = board[nr][nc];
          if (!target || pieceColor(target) === enemy) {
            pseudo.push({ from: [r, c], to: [nr, nc], capture: target || undefined });
          }
        }
      } else if (type === 'b' || type === 'r' || type === 'q') {
        const dirs: Array<[number, number]> = [];
        if (type === 'b' || type === 'q') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        if (type === 'r' || type === 'q') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        for (const [dr, dc] of dirs) {
          let nr = r + dr;
          let nc = c + dc;
          while (inBounds8(nr, nc)) {
            const target = board[nr][nc];
            if (!target) {
              pseudo.push({ from: [r, c], to: [nr, nc] });
            } else {
              if (pieceColor(target) === enemy) {
                pseudo.push({ from: [r, c], to: [nr, nc], capture: target });
              }
              break;
            }
            nr += dr;
            nc += dc;
          }
        }
      } else if (type === 'k') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (!inBounds8(nr, nc)) continue;
            const target = board[nr][nc];
            if (!target || pieceColor(target) === enemy) {
              pseudo.push({ from: [r, c], to: [nr, nc], capture: target || undefined });
            }
          }
        }
        // Castling
        const homeRow = color === 'w' ? 7 : 0;
        if (r === homeRow && c === 4 && !isKingInCheck(board, color)) {
          const canK = color === 'w' ? state.castle.wK : state.castle.bK;
          const canQ = color === 'w' ? state.castle.wQ : state.castle.bQ;
          if (
            canK &&
            !board[homeRow][5] &&
            !board[homeRow][6] &&
            !isSquareAttacked(board, homeRow, 5, enemy) &&
            !isSquareAttacked(board, homeRow, 6, enemy)
          ) {
            pseudo.push({ from: [homeRow, 4], to: [homeRow, 6], castleSide: 'K' });
          }
          if (
            canQ &&
            !board[homeRow][3] &&
            !board[homeRow][2] &&
            !board[homeRow][1] &&
            !isSquareAttacked(board, homeRow, 3, enemy) &&
            !isSquareAttacked(board, homeRow, 2, enemy)
          ) {
            pseudo.push({ from: [homeRow, 4], to: [homeRow, 2], castleSide: 'Q' });
          }
        }
      }
    }
  }

  return pseudo.filter((mv) => {
    const next = applyChessMove(state, mv);
    return !isKingInCheck(next.board, color);
  });
}

const CHESS_VAL: Record<string, number> = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 20000 };

// Classical Piece-Square Tables (White perspective; Black flips row 7 - r)
const PST_P = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [12, 12, 20, 32, 32, 20, 12, 12],
  [6, 6, 12, 27, 27, 12, 6, 6],
  [0, 0, 4, 24, 24, 4, 0, 0],
  [5, -4, -8, 2, 2, -8, -4, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];
const PST_N = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 4, 4, 0, -20, -40],
  [-30, 4, 14, 18, 18, 14, 4, -30],
  [-30, 6, 18, 24, 24, 18, 6, -30],
  [-30, 4, 16, 22, 22, 16, 4, -30],
  [-30, 6, 12, 16, 16, 12, 6, -30],
  [-40, -20, 0, 6, 6, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];
const PST_B = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 4, 0, 0, 0, 0, 4, -10],
  [-10, 8, 8, 12, 12, 8, 8, -10],
  [-10, 4, 12, 14, 14, 12, 4, -10],
  [-10, 6, 8, 14, 14, 8, 6, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 6, 0, 0, 0, 0, 6, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];
const PST_R = [
  [0, 0, 2, 6, 6, 2, 0, 0],
  [8, 12, 12, 12, 12, 12, 12, 8],
  [-4, 0, 0, 0, 0, 0, 0, -4],
  [-4, 0, 0, 0, 0, 0, 0, -4],
  [-4, 0, 0, 0, 0, 0, 0, -4],
  [-4, 0, 0, 0, 0, 0, 0, -4],
  [-4, 0, 0, 0, 0, 0, 0, -4],
  [0, 0, 4, 10, 10, 4, 0, 0],
];
const PST_Q = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 6, 6, 6, 6, 0, -10],
  [-5, 0, 6, 8, 8, 6, 0, -5],
  [0, 0, 6, 8, 8, 6, 0, -5],
  [-10, 4, 6, 6, 6, 6, 0, -10],
  [-10, 0, 4, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];
const PST_K_MID = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [18, 22, 0, 0, 0, 0, 22, 18],
  [22, 32, 12, 0, 0, 12, 32, 22],
];
const PST_K_END = [
  [-40, -25, -20, -15, -15, -20, -25, -40],
  [-25, -10, 0, 4, 4, 0, -10, -25],
  [-20, 0, 14, 20, 20, 14, 0, -20],
  [-15, 4, 20, 28, 28, 20, 4, -15],
  [-15, 4, 20, 28, 28, 20, 4, -15],
  [-20, 0, 14, 20, 20, 14, 0, -20],
  [-25, -10, 0, 4, 4, 0, -10, -25],
  [-40, -25, -20, -15, -15, -20, -25, -40],
];

const PASSED_PAWN_BONUS = [0, 14, 24, 42, 74, 118, 178, 0];

/**
 * Evaluate board in centipawns from White's perspective (+ = White better, - = Black better).
 * Includes tapered midgame/endgame PST, bishop pair, passed/doubled/isolated/connected pawns,
 * rook open/semi-open files & 7th rank, king safety shield, and endgame mop-up.
 */
export function evaluateChessCentipawns(board: ChessPiece[][]): number {
  let mgScore = 0;
  let egScore = 0;
  let wBishops = 0;
  let bBishops = 0;
  let phase = 0;
  const wPawnFiles = [0, 0, 0, 0, 0, 0, 0, 0];
  const bPawnFiles = [0, 0, 0, 0, 0, 0, 0, 0];
  const wPawnMaxAdv = [0, 0, 0, 0, 0, 0, 0, 0];
  const bPawnMinRow = [8, 8, 8, 8, 8, 8, 8, 8];
  let wKing: [number, number] | null = null;
  let bKing: [number, number] | null = null;
  let wMat = 0;
  let bMat = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const isW = isWhitePiece(p);
      const t = p.toLowerCase();
      if (t === 'n' || t === 'b') phase += 1;
      else if (t === 'r') phase += 2;
      else if (t === 'q') phase += 4;

      if (t === 'p') {
        if (isW) {
          wPawnFiles[c]++;
          if (7 - r > wPawnMaxAdv[c]) wPawnMaxAdv[c] = 7 - r;
        } else {
          bPawnFiles[c]++;
          if (r < bPawnMinRow[c]) bPawnMinRow[c] = r;
        }
      } else if (t === 'k') {
        if (isW) wKing = [r, c];
        else bKing = [r, c];
      } else {
        if (isW) wMat += CHESS_VAL[t] || 0;
        else bMat += CHESS_VAL[t] || 0;
      }
    }
  }
  const mgPhase = Math.min(24, phase);
  const egPhase = 24 - mgPhase;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const isW = isWhitePiece(p);
      const t = p.toLowerCase();
      const pr = isW ? r : 7 - r;
      const baseVal = CHESS_VAL[t] || 0;
      let mgPst = 0;
      let egPst = 0;

      if (t === 'p') {
        mgPst = PST_P[pr][c];
        egPst = PST_P[pr][c] + (6 - pr) * 4;
        // Passed pawn detection
        let isPassed = true;
        if (isW) {
          for (let fc = Math.max(0, c - 1); fc <= Math.min(7, c + 1); fc++) {
            for (let rr = r - 1; rr >= 1; rr--) {
              if (board[rr][fc] === 'p') { isPassed = false; break; }
            }
            if (!isPassed) break;
          }
          if (isPassed) {
            const adv = 7 - r;
            mgPst += Math.round(PASSED_PAWN_BONUS[adv] * 0.75);
            egPst += Math.round(PASSED_PAWN_BONUS[adv] * 1.25);
          }
          // Connected / defended pawn
          if (r < 7 && ((c > 0 && board[r + 1][c - 1] === 'P') || (c < 7 && board[r + 1][c + 1] === 'P'))) {
            mgPst += 10;
            egPst += 8;
          }
        } else {
          for (let fc = Math.max(0, c - 1); fc <= Math.min(7, c + 1); fc++) {
            for (let rr = r + 1; rr <= 6; rr++) {
              if (board[rr][fc] === 'P') { isPassed = false; break; }
            }
            if (!isPassed) break;
          }
          if (isPassed) {
            const adv = r;
            mgPst += Math.round(PASSED_PAWN_BONUS[adv] * 0.75);
            egPst += Math.round(PASSED_PAWN_BONUS[adv] * 1.25);
          }
          if (r > 0 && ((c > 0 && board[r - 1][c - 1] === 'p') || (c < 7 && board[r - 1][c + 1] === 'p'))) {
            mgPst += 10;
            egPst += 8;
          }
        }
      } else if (t === 'n') {
        mgPst = PST_N[pr][c];
        egPst = PST_N[pr][c] - 8;
      } else if (t === 'b') {
        mgPst = PST_B[pr][c];
        egPst = PST_B[pr][c] + 6;
        if (isW) wBishops++;
        else bBishops++;
      } else if (t === 'r') {
        mgPst = PST_R[pr][c];
        egPst = PST_R[pr][c];
        // Open & semi-open files + 7th rank
        const ownPawns = isW ? wPawnFiles[c] : bPawnFiles[c];
        const oppPawns = isW ? bPawnFiles[c] : wPawnFiles[c];
        if (ownPawns === 0 && oppPawns === 0) {
          mgPst += 26;
          egPst += 18;
        } else if (ownPawns === 0) {
          mgPst += 14;
          egPst += 10;
        }
        if ((isW && r === 1) || (!isW && r === 6)) {
          mgPst += 24;
          egPst += 32;
        }
      } else if (t === 'q') {
        mgPst = PST_Q[pr][c];
        egPst = PST_Q[pr][c];
      } else if (t === 'k') {
        mgPst = PST_K_MID[pr][c];
        egPst = PST_K_END[pr][c];
        // Midgame pawn shield in front of castled king
        const shieldRow = isW ? r - 1 : r + 1;
        const ownPawn: ChessPiece = isW ? 'P' : 'p';
        if (shieldRow >= 0 && shieldRow < 8) {
          let shield = 0;
          for (let fc = Math.max(0, c - 1); fc <= Math.min(7, c + 1); fc++) {
            if (board[shieldRow][fc] === ownPawn) shield++;
          }
          mgPst += shield * 13;
        }
        if ((isW ? wPawnFiles[c] : bPawnFiles[c]) === 0) {
          mgPst -= 18;
        }
      }

      if (isW) {
        mgScore += baseVal + mgPst;
        egScore += baseVal + egPst;
      } else {
        mgScore -= baseVal + mgPst;
        egScore -= baseVal + egPst;
      }
    }
  }

  // Doubled & isolated pawn penalties
  for (let c = 0; c < 8; c++) {
    if (wPawnFiles[c] > 1) {
      const pen = (wPawnFiles[c] - 1) * 16;
      mgScore -= pen;
      egScore -= pen;
    }
    if (bPawnFiles[c] > 1) {
      const pen = (bPawnFiles[c] - 1) * 16;
      mgScore += pen;
      egScore += pen;
    }
    if (wPawnFiles[c] > 0) {
      const left = c > 0 ? wPawnFiles[c - 1] : 0;
      const right = c < 7 ? wPawnFiles[c + 1] : 0;
      if (left === 0 && right === 0) {
        mgScore -= 14;
        egScore -= 16;
      }
    }
    if (bPawnFiles[c] > 0) {
      const left = c > 0 ? bPawnFiles[c - 1] : 0;
      const right = c < 7 ? bPawnFiles[c + 1] : 0;
      if (left === 0 && right === 0) {
        mgScore += 14;
        egScore += 16;
      }
    }
  }

  // Bishop pair bonus
  if (wBishops >= 2) { mgScore += 38; egScore += 48; }
  if (bBishops >= 2) { mgScore -= 38; egScore -= 48; }

  // Endgame king mop-up: push losing king to edge & bring winning king close
  if (egPhase >= 14 && wKing && bKing) {
    const matDiff = wMat - bMat;
    if (Math.abs(matDiff) >= 250) {
      const distKings = Math.abs(wKing[0] - bKing[0]) + Math.abs(wKing[1] - bKing[1]);
      if (matDiff > 0) {
        const bEdge = Math.max(3 - bKing[0], bKing[0] - 4, 3 - bKing[1], bKing[1] - 4);
        egScore += bEdge * 14 + (14 - distKings) * 6;
      } else {
        const wEdge = Math.max(3 - wKing[0], wKing[0] - 4, 3 - wKing[1], wKing[1] - 4);
        egScore -= wEdge * 14 + (14 - distKings) * 6;
      }
    }
  }

  return Math.round((mgScore * mgPhase + egScore * egPhase) / 24);
}

function moveUci(mv: ChessMove): string {
  return formatChessSquare(mv.from) + formatChessSquare(mv.to) + (mv.promotion ? 'q' : '');
}

function chessTTKey(state: ChessState): string {
  const c =
    (state.castle.wK ? 'K' : '') +
    (state.castle.wQ ? 'Q' : '') +
    (state.castle.bK ? 'k' : '') +
    (state.castle.bQ ? 'q' : '');
  const ep = state.enPassant ? `${state.enPassant[0]}${state.enPassant[1]}` : '-';
  return `${state.turn}:${c}:${ep}:${state.board.map((r) => r.map((x) => x || '.').join('')).join('/')}`;
}

function chessPositionKey(board: ChessPiece[][], turn: 'w' | 'b'): string {
  return turn + ':' + board.map((r) => r.map((x) => x || '.').join('')).join('/');
}

const CHESS_OPENING_BOOK: Record<string, string[]> = {
  // Initial position (AI as White)
  'w:rnbqkbnr/pppppppp/......../......../......../......../PPPPPPPP/RNBQKBNR': ['e2e4', 'd2d4', 'g1f3', 'c2c4'],
  // After 1. e4 (AI as Black — Sicilian, e5, Caro-Kann, French)
  'b:rnbqkbnr/pppppppp/......../......../....P.../......../PPPP.PPP/RNBQKBNR': ['c7c5', 'e7e5', 'c7c6', 'e7e6'],
  // After 1. d4 (AI as Black — King's Indian, Queen's Gambit Declined, Nimzo setup)
  'b:rnbqkbnr/pppppppp/......../......../...P..../......../PPP.PPPP/RNBQKBNR': ['g8f6', 'd7d5', 'e7e6'],
  // After 1. c4 (AI as Black)
  'b:rnbqkbnr/pppppppp/......../......../..P...../......../PP.PPPPP/RNBQKBNR': ['e7e5', 'g8f6', 'c7c5'],
  // After 1. Nf3 (AI as Black)
  'b:rnbqkbnr/pppppppp/......../......../......../.....N../PPPPPPPP/RNBQKB.R': ['d7d5', 'g8f6', 'c7c5'],
  // After 1. e4 e5 (AI as White)
  'w:rnbqkbnr/pppp.ppp/......../....p.../....P.../......../PPPP.PPP/RNBQKBNR': ['g1f3', 'f1c4'],
  // After 1. e4 e5 2. Nf3 (AI as Black)
  'b:rnbqkbnr/pppp.ppp/......../....p.../....P.../.....N../PPPP.PPP/RNBQKB.R': ['b8c6', 'g8f6'],
  // After 1. e4 e5 2. Nf3 Nc6 (AI as White — Ruy Lopez / Italian)
  'w:r.bqkbnr/pppp.ppp/..n...../....p.../....P.../.....N../PPPP.PPP/RNBQKB.R': ['f1b5', 'f1c4', 'd2d4'],
  // After 1. e4 e5 2. Nf3 Nc6 3. Bb5 (AI as Black — Morphy Defense / Berlin)
  'b:r.bqkbnr/pppp.ppp/..n...../.B..p.../....P.../.....N../PPPP.PPP/RNBQK..R': ['a7a6', 'g8f6'],
  // After 1. e4 e5 2. Nf3 Nc6 3. Bc4 (AI as Black — Two Knights / Giuoco Piano)
  'b:r.bqkbnr/pppp.ppp/..n...../....p.../..B.P.../.....N../PPPP.PPP/RNBQK..R': ['g8f6', 'f8c5'],
  // After 1. e4 e5 2. Bc4 (AI as Black — Scholar's Mate refutation!)
  'b:rnbqkbnr/pppp.ppp/......../....p.../..B.P.../......../PPPP.PPP/RNBQK.NR': ['g8f6', 'b8c6'],
  // After 1. e4 e5 2. Qh5 (AI as Black — refutes Wayward Queen / Scholar's Mate!)
  'b:rnbqkbnr/pppp.ppp/......../....p..Q/....P.../......../PPPP.PPP/RNB.KBNR': ['b8c6'],
  // After 1. e4 c5 (AI as White — Open Sicilian)
  'w:rnbqkbnr/pp.ppppp/......../..p...../....P.../......../PPPP.PPP/RNBQKBNR': ['g1f3', 'b1c3'],
  // After 1. e4 c5 2. Nf3 (AI as Black)
  'b:rnbqkbnr/pp.ppppp/......../..p...../....P.../.....N../PPPP.PPP/RNBQKB.R': ['d7d6', 'b8c6', 'e7e6'],
  // After 1. e4 c5 2. Nf3 d6 (AI as White)
  'w:rnbqkbnr/pp..pppp/...p..../..p...../....P.../.....N../PPPP.PPP/RNBQKB.R': ['d2d4'],
  // After 1. e4 c5 2. Nf3 Nc6 (AI as White)
  'w:r.bqkbnr/pp.ppppp/..n...../..p...../....P.../.....N../PPPP.PPP/RNBQKB.R': ['d2d4', 'f1b5'],
  // After 1. e4 e6 (French — AI as White)
  'w:rnbqkbnr/pppp.ppp/....p.../......../....P.../......../PPPP.PPP/RNBQKBNR': ['d2d4'],
  // After 1. e4 e6 2. d4 (French — AI as Black)
  'b:rnbqkbnr/pppp.ppp/....p.../......../...PP.../......../PPP..PPP/RNBQKBNR': ['d7d5'],
  // After 1. e4 c6 (Caro-Kann — AI as White)
  'w:rnbqkbnr/pp.ppppp/..p...../......../....P.../......../PPPP.PPP/RNBQKBNR': ['d2d4'],
  // After 1. e4 c6 2. d4 (Caro-Kann — AI as Black)
  'b:rnbqkbnr/pp.ppppp/..p...../......../...PP.../......../PPP..PPP/RNBQKBNR': ['d7d5'],
  // After 1. d4 d5 (Queen's Gambit — AI as White)
  'w:rnbqkbnr/ppp.pppp/......../...p..../...P..../......../PPP.PPPP/RNBQKBNR': ['c2c4', 'g1f3', 'c1f4'],
  // After 1. d4 d5 2. c4 (AI as Black — QGD / Slav)
  'b:rnbqkbnr/ppp.pppp/......../...p..../..PP..../......../PP..PPPP/RNBQKBNR': ['e7e6', 'c7c6'],
  // After 1. d4 Nf6 (AI as White)
  'w:rnbqkb.r/pppppppp/.....n../......../...P..../......../PPP.PPPP/RNBQKBNR': ['c2c4', 'g1f3', 'c1f4'],
  // After 1. d4 Nf6 2. c4 (AI as Black — KID / Nimzo)
  'b:rnbqkb.r/pppppppp/.....n../......../..PP..../......../PP..PPPP/RNBQKBNR': ['e7e6', 'g7g6'],
};

interface ChessTTEntry {
  depth: number;
  score: number;
  flag: 0 | 1 | 2; // 0 = EXACT, 1 = LOWER (beta cutoff), 2 = UPPER (alpha fail-low)
  bestUci: string;
}

interface ChessSearchCtx {
  deadline: number;
  aborted: boolean;
  nodes: number;
  tt: Map<string, ChessTTEntry>;
  killers: Array<[string, string]>;
  history: Map<string, number>;
  maxQDepth: number;
}

function orderChessMoveAdvanced(
  board: ChessPiece[][],
  mv: ChessMove,
  ttUci: string,
  ply: number,
  ctx: ChessSearchCtx,
): number {
  const uci = moveUci(mv);
  if (ttUci && uci === ttUci) return 2_000_000;
  let s = 0;
  if (mv.promotion) s += 190_000;
  if (mv.capture) {
    const attacker = board[mv.from[0]][mv.from[1]].toLowerCase();
    const victim = mv.capture.toLowerCase();
    s += 100_000 + (CHESS_VAL[victim] || 100) * 12 - (CHESS_VAL[attacker] || 100);
  } else {
    const k = ctx.killers[ply];
    if (k) {
      if (k[0] === uci) s += 55_000;
      else if (k[1] === uci) s += 45_000;
    }
    s += Math.min(35_000, ctx.history.get(uci) || 0);
  }
  if (mv.castleSide) s += 900;
  const [tr, tc] = mv.to;
  if (tr >= 2 && tr <= 5 && tc >= 2 && tc <= 5) s += 28;
  return s;
}

function quiescenceChess(
  state: ChessState,
  alpha: number,
  beta: number,
  color: 'w' | 'b',
  qDepth: number,
  ctx: ChessSearchCtx,
): number {
  ctx.nodes++;
  if ((ctx.nodes & 255) === 0 && Date.now() > ctx.deadline) {
    ctx.aborted = true;
    return alpha;
  }

  const inChk = isKingInCheck(state.board, color);
  if (!inChk) {
    const standPat = (color === 'w' ? 1 : -1) * evaluateChessCentipawns(state.board);
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
    if (qDepth <= 0) return alpha;
    // Delta pruning: if even winning a Queen cannot lift us to alpha, prune
    if (standPat + 980 < alpha) return alpha;
  } else if (qDepth <= -2) {
    return (color === 'w' ? 1 : -1) * evaluateChessCentipawns(state.board);
  }

  const legal = getLegalChessMoves(state, color);
  if (!legal.length) {
    return inChk ? -88000 : 0;
  }

  const candidates = inChk
    ? legal
    : legal.filter((m) => m.capture || m.promotion);
  candidates.sort((a, b) => {
    const sa = (a.promotion ? 9000 : 0) + (a.capture ? (CHESS_VAL[a.capture.toLowerCase()] || 100) * 10 - (CHESS_VAL[state.board[a.from[0]][a.from[1]].toLowerCase()] || 100) : 0);
    const sb = (b.promotion ? 9000 : 0) + (b.capture ? (CHESS_VAL[b.capture.toLowerCase()] || 100) * 10 - (CHESS_VAL[state.board[b.from[0]][b.from[1]].toLowerCase()] || 100) : 0);
    return sb - sa;
  });

  const opp: 'w' | 'b' = color === 'w' ? 'b' : 'w';
  for (const mv of candidates) {
    const next = applyChessMove(state, mv);
    const sc = -quiescenceChess(next, -beta, -alpha, opp, qDepth - 1, ctx);
    if (ctx.aborted) return alpha;
    if (sc >= beta) return beta;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}

function hasNonPawnPieces(board: ChessPiece[][], color: 'w' | 'b'): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || pieceColor(p) !== color) continue;
      const t = p.toLowerCase();
      if (t !== 'p' && t !== 'k') return true;
    }
  }
  return false;
}

function negamaxChess(
  state: ChessState,
  depth: number,
  ply: number,
  alpha: number,
  beta: number,
  color: 'w' | 'b',
  ctx: ChessSearchCtx,
  allowNull = true,
): number {
  ctx.nodes++;
  if ((ctx.nodes & 255) === 0 && Date.now() > ctx.deadline) {
    ctx.aborted = true;
    return 0;
  }

  const origAlpha = alpha;
  const ttKey = chessTTKey(state);
  const ttHit = ctx.tt.get(ttKey);
  if (ttHit && ttHit.depth >= depth) {
    if (ttHit.flag === 0) return ttHit.score;
    if (ttHit.flag === 1 && ttHit.score > alpha) alpha = ttHit.score;
    else if (ttHit.flag === 2 && ttHit.score < beta) beta = ttHit.score;
    if (alpha >= beta) return ttHit.score;
  }

  const inChk = isKingInCheck(state.board, color);
  // Check extension so forced mates & defenses are never truncated at horizon
  const extDepth = inChk && ply < 10 ? depth + 1 : depth;

  if (extDepth <= 0) {
    return quiescenceChess(state, alpha, beta, color, ctx.maxQDepth, ctx);
  }

  const opp: 'w' | 'b' = color === 'w' ? 'b' : 'w';

  // Null-Move Pruning (cuts branching factor dramatically while staying safe in zugzwang endgames)
  if (
    allowNull &&
    !inChk &&
    extDepth >= 3 &&
    beta < 80000 &&
    hasNonPawnPieces(state.board, color)
  ) {
    const nullState: ChessState = {
      board: state.board,
      turn: opp,
      castle: state.castle,
      enPassant: null,
    };
    const r = extDepth >= 5 ? 3 : 2;
    const nullScore = -negamaxChess(nullState, extDepth - 1 - r, ply + 1, -beta, -beta + 1, opp, ctx, false);
    if (ctx.aborted) return 0;
    if (nullScore >= beta) return beta;
  }

  const moves = getLegalChessMoves(state, color);
  if (!moves.length) {
    return inChk ? -90000 + ply * 10 : 0;
  }

  const ttUci = ttHit ? ttHit.bestUci : '';
  moves.sort(
    (a, b) =>
      orderChessMoveAdvanced(state.board, b, ttUci, ply, ctx) -
      orderChessMoveAdvanced(state.board, a, ttUci, ply, ctx),
  );

  let best = -Infinity;
  let bestUci = moveUci(moves[0]);

  for (let i = 0; i < moves.length; i++) {
    const mv = moves[i];
    const next = applyChessMove(state, mv);
    let sc: number;

    // Late Move Reductions (LMR) for quiet late moves
    const isQuiet = !mv.capture && !mv.promotion;
    if (i >= 4 && extDepth >= 3 && !inChk && isQuiet && !isKingInCheck(next.board, opp)) {
      sc = -negamaxChess(next, extDepth - 2, ply + 1, -alpha - 1, -alpha, opp, ctx, true);
      if (!ctx.aborted && sc > alpha) {
        sc = -negamaxChess(next, extDepth - 1, ply + 1, -beta, -alpha, opp, ctx, true);
      }
    } else if (i > 0) {
      // Principal Variation Search (PVS) zero-window scout
      sc = -negamaxChess(next, extDepth - 1, ply + 1, -alpha - 1, -alpha, opp, ctx, true);
      if (!ctx.aborted && sc > alpha && sc < beta) {
        sc = -negamaxChess(next, extDepth - 1, ply + 1, -beta, -alpha, opp, ctx, true);
      }
    } else {
      sc = -negamaxChess(next, extDepth - 1, ply + 1, -beta, -alpha, opp, ctx, true);
    }

    if (ctx.aborted) return 0;

    if (sc > best) {
      best = sc;
      bestUci = moveUci(mv);
    }
    if (sc > alpha) {
      alpha = sc;
    }
    if (alpha >= beta) {
      if (isQuiet) {
        if (!ctx.killers[ply]) ctx.killers[ply] = ['', ''];
        if (ctx.killers[ply][0] !== bestUci) {
          ctx.killers[ply][1] = ctx.killers[ply][0];
          ctx.killers[ply][0] = bestUci;
        }
        ctx.history.set(bestUci, (ctx.history.get(bestUci) || 0) + extDepth * extDepth * 16);
      }
      break;
    }
  }

  if (ctx.tt.size > 35000) ctx.tt.clear();
  const flag: 0 | 1 | 2 = best <= origAlpha ? 2 : best >= beta ? 1 : 0;
  ctx.tt.set(ttKey, { depth: extDepth, score: best, flag, bestUci });
  return best;
}

export function pickChessAiMove(
  state: ChessState,
  difficulty: GameDifficulty = 'pro',
  aiColor: 'w' | 'b' = state.turn,
): ChessMove | null {
  const moves = getLegalChessMoves(state, aiColor);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];

  if (difficulty === 'easy') {
    const captures = moves.filter((m) => m.capture);
    if (captures.length && Math.random() < 0.65) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Expanded Grandmaster Opening Book lookup
  const bookKey = chessPositionKey(state.board, aiColor);
  const bookChoices = CHESS_OPENING_BOOK[bookKey];
  if (bookChoices && bookChoices.length) {
    const uci = bookChoices[Math.floor(Math.random() * bookChoices.length)];
    const matched = moves.find((m) => formatChessSquare(m.from) + formatChessSquare(m.to) === uci);
    if (matched) return matched;
  }

  const isPro = difficulty === 'pro';
  const maxDepth = isPro ? 6 : 3;
  const budgetMs = isPro ? 420 : 140;
  const ctx: ChessSearchCtx = {
    deadline: Date.now() + budgetMs,
    aborted: false,
    nodes: 0,
    tt: new Map(),
    killers: [],
    history: new Map(),
    maxQDepth: isPro ? 6 : 4,
  };

  const opp: 'w' | 'b' = aiColor === 'w' ? 'b' : 'w';
  let bestMove = moves[0];
  let bestUciOverall = '';

  // Iterative Deepening: guarantees a complete deep search within budget + PV ordering
  for (let depth = 1; depth <= maxDepth; depth++) {
    ctx.aborted = false;
    const ordered = [...moves].sort(
      (a, b) =>
        orderChessMoveAdvanced(state.board, b, bestUciOverall, 0, ctx) -
        orderChessMoveAdvanced(state.board, a, bestUciOverall, 0, ctx),
    );

    let iterBest = ordered[0];
    let iterBestVal = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (let i = 0; i < ordered.length; i++) {
      const mv = ordered[i];
      const next = applyChessMove(state, mv);
      let val: number;
      if (i === 0) {
        val = -negamaxChess(next, depth - 1, 1, -beta, -alpha, opp, ctx, true);
      } else {
        val = -negamaxChess(next, depth - 1, 1, -alpha - 1, -alpha, opp, ctx, true);
        if (!ctx.aborted && val > alpha) {
          val = -negamaxChess(next, depth - 1, 1, -beta, -alpha, opp, ctx, true);
        }
      }
      if (ctx.aborted) break;
      if (!isPro && depth === maxDepth) {
        val += (Math.random() - 0.5) * 6;
      }
      if (val > iterBestVal) {
        iterBestVal = val;
        iterBest = mv;
      }
      if (val > alpha) alpha = val;
    }

    if (!ctx.aborted) {
      bestMove = iterBest;
      bestUciOverall = moveUci(iterBest);
      // Forced mate found — stop searching immediately
      if (iterBestVal >= 85000) break;
    } else {
      break;
    }
    if (Date.now() > ctx.deadline - 25) break;
  }

  return bestMove;
}

export function formatChessClock(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  if (clamped < 10000) {
    const secs = Math.floor(clamped / 1000);
    const tenths = Math.floor((clamped % 1000) / 100);
    return `0:${String(secs).padStart(2, '0')}.${tenths}`;
  }
  const totalSec = Math.ceil(clamped / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatChessSquare([r, c]: [number, number]): string {
  return `${'abcdefgh'[c]}${8 - r}`;
}

/* ============================================================================
   4. CHECKERS ENGINE (8x8)
   ============================================================================ */
// 0 empty, 1 player man, 2 player king, -1 AI man, -2 AI king
export type CheckersCell = 0 | 1 | 2 | -1 | -2;
export interface CheckersMove {
  from: [number, number];
  to: [number, number];
  captured?: [number, number];
}

export function createCheckersBoard(): CheckersCell[][] {
  const b: CheckersCell[][] = Array.from({ length: 8 }, () => Array<CheckersCell>(8).fill(0));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) b[r][c] = -1;
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) b[r][c] = 1;
    }
  }
  return b;
}

export function getLegalCheckersMoves(board: CheckersCell[][], side: 1 | -1): CheckersMove[] {
  const captures: CheckersMove[] = [];
  const regulars: CheckersMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p === 0 || Math.sign(p) !== side) continue;
      const isKing = Math.abs(p) === 2;
      const dirs: number[] = isKing ? [-1, 1] : side === 1 ? [-1] : [1];
      for (const dr of dirs) {
        for (const dc of [-1, 1]) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds8(nr, nc)) continue;
          if (board[nr][nc] === 0) {
            regulars.push({ from: [r, c], to: [nr, nc] });
          } else if (Math.sign(board[nr][nc]) === -side) {
            const jr = nr + dr;
            const jc = nc + dc;
            if (inBounds8(jr, jc) && board[jr][jc] === 0) {
              captures.push({ from: [r, c], to: [jr, jc], captured: [nr, nc] });
            }
          }
        }
      }
    }
  }
  return captures.length ? captures : regulars;
}

export function applyCheckersMove(board: CheckersCell[][], mv: CheckersMove): CheckersCell[][] {
  const next = board.map((row) => [...row]);
  const [fr, fc] = mv.from;
  const [tr, tc] = mv.to;
  let piece = next[fr][fc];
  next[fr][fc] = 0;
  if (mv.captured) next[mv.captured[0]][mv.captured[1]] = 0;
  if (piece === 1 && tr === 0) piece = 2;
  if (piece === -1 && tr === 7) piece = -2;
  next[tr][tc] = piece;
  return next;
}

export function pickCheckersAiMove(board: CheckersCell[][], difficulty: GameDifficulty = 'medium'): CheckersMove | null {
  const moves = getLegalCheckersMoves(board, -1);
  if (!moves.length) return null;
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];

  let best = moves[0];
  let bestScore = -Infinity;
  for (const mv of moves) {
    const next = applyCheckersMove(board, mv);
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const v = next[r][c];
        if (v < 0) score += Math.abs(v) === 2 ? 5 : 2 + r * 0.12;
        if (v > 0) score -= Math.abs(v) === 2 ? 5 : 2 + (7 - r) * 0.12;
      }
    }
    if (mv.captured) score += 3;
    if (difficulty === 'pro') {
      const oppCaps = getLegalCheckersMoves(next, 1).filter((m) => m.captured);
      if (oppCaps.length) score -= 2.8;
    }
    if (score > bestScore) {
      bestScore = score;
      best = mv;
    }
  }
  return best;
}

/* ============================================================================
   5. REVERSI / OTHELLO ENGINE (8x8)
   ============================================================================ */
export type ReversiCell = 0 | 1 | 2; // 1 = Player (Emerald), 2 = AI (Silver)

export function createReversiBoard(): ReversiCell[][] {
  const b: ReversiCell[][] = Array.from({ length: 8 }, () => Array<ReversiCell>(8).fill(0));
  b[3][3] = 2;
  b[4][4] = 2;
  b[3][4] = 1;
  b[4][3] = 1;
  return b;
}

export function getReversiFlips(board: ReversiCell[][], r: number, c: number, player: 1 | 2): Array<[number, number]> {
  if (!inBounds8(r, c) || board[r][c] !== 0) return [];
  const opp: 1 | 2 = player === 1 ? 2 : 1;
  const allFlips: Array<[number, number]> = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const line: Array<[number, number]> = [];
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds8(nr, nc) && board[nr][nc] === opp) {
        line.push([nr, nc]);
        nr += dr;
        nc += dc;
      }
      if (line.length && inBounds8(nr, nc) && board[nr][nc] === player) {
        allFlips.push(...line);
      }
    }
  }
  return allFlips;
}

export function getLegalReversiMoves(board: ReversiCell[][], player: 1 | 2): Array<{ r: number; c: number; flips: Array<[number, number]> }> {
  const res: Array<{ r: number; c: number; flips: Array<[number, number]> }> = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const flips = getReversiFlips(board, r, c, player);
      if (flips.length) res.push({ r, c, flips });
    }
  }
  return res;
}

export function applyReversiMove(board: ReversiCell[][], r: number, c: number, player: 1 | 2): ReversiCell[][] | null {
  const flips = getReversiFlips(board, r, c, player);
  if (!flips.length) return null;
  const next = board.map((row) => [...row]);
  next[r][c] = player;
  for (const [fr, fc] of flips) next[fr][fc] = player;
  return next;
}

const REVERSI_WEIGHTS = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -40, -2, -2, -2, -2, -40, -20],
  [10, -2, 5, 1, 1, 5, -2, 10],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [10, -2, 5, 1, 1, 5, -2, 10],
  [-20, -40, -2, -2, -2, -2, -40, -20],
  [100, -20, 10, 5, 5, 10, -20, 100],
];

export function pickReversiAiMove(board: ReversiCell[][], difficulty: GameDifficulty = 'medium') {
  const moves = getLegalReversiMoves(board, 2);
  if (!moves.length) return null;
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const score = REVERSI_WEIGHTS[m.r][m.c] + m.flips.length * (difficulty === 'pro' ? 2.5 : 1.5);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

/* ============================================================================
   6. STRATEGIC NIM ENGINE (4 rows: [1, 3, 5, 7])
   ============================================================================ */
export function createNimPiles(): number[] {
  return [1, 3, 5, 7];
}

export function pickNimAiMove(piles: number[], difficulty: GameDifficulty = 'medium'): { row: number; take: number } | null {
  const nonZero = piles.map((v, i) => ({ i, v })).filter((x) => x.v > 0);
  if (!nonZero.length) return null;

  if (difficulty === 'easy') {
    const pick = nonZero[Math.floor(Math.random() * nonZero.length)];
    return { row: pick.i, take: Math.max(1, Math.ceil(Math.random() * Math.min(2, pick.v))) };
  }

  const xorSum = piles.reduce((a, b) => a ^ b, 0);
  if (xorSum !== 0 && (difficulty === 'pro' || Math.random() < 0.7)) {
    for (let i = 0; i < piles.length; i++) {
      const target = piles[i] ^ xorSum;
      if (target < piles[i]) {
        return { row: i, take: piles[i] - target };
      }
    }
  }
  // Fallback when in losing position: take 1 from largest pile
  const largest = nonZero.sort((a, b) => b.v - a.v)[0];
  return { row: largest.i, take: 1 };
}

/* ============================================================================
   7. BATTLESHIP ENGINE (7x7 Naval Duel)
   ============================================================================ */
export interface BattleshipGrid {
  ships: number[][]; // 0 = water, 1..4 = shipId
  shots: number[][]; // 0 = unknown, 1 = miss, 2 = hit
  sizes: Record<number, number>;
}

export function createBattleshipFleet(size = 7): BattleshipGrid {
  const shipLengths = [4, 3, 3, 2];
  const ships: number[][] = Array.from({ length: size }, () => Array<number>(size).fill(0));
  const shots: number[][] = Array.from({ length: size }, () => Array<number>(size).fill(0));
  const sizes: Record<number, number> = {};

  shipLengths.forEach((len, idx) => {
    const id = idx + 1;
    sizes[id] = len;
    let placed = false;
    for (let tries = 0; tries < 200 && !placed; tries++) {
      const horiz = Math.random() < 0.5;
      const r = Math.floor(Math.random() * (horiz ? size : size - len + 1));
      const c = Math.floor(Math.random() * (horiz ? size - len + 1 : size));
      let ok = true;
      for (let k = 0; k < len; k++) {
        if (ships[horiz ? r : r + k][horiz ? c + k : c] !== 0) {
          ok = false;
          break;
        }
      }
      if (ok) {
        for (let k = 0; k < len; k++) {
          ships[horiz ? r : r + k][horiz ? c + k : c] = id;
        }
        placed = true;
      }
    }
  });
  return { ships, shots, sizes };
}

export function fireBattleshipShot(
  grid: BattleshipGrid,
  r: number,
  c: number,
): { outcome: 'already' | 'miss' | 'hit' | 'sunk'; shipId: number; allSunk: boolean } {
  if (grid.shots[r][c] !== 0) return { outcome: 'already', shipId: 0, allSunk: false };
  const shipId = grid.ships[r][c];
  if (shipId === 0) {
    grid.shots[r][c] = 1;
    return { outcome: 'miss', shipId: 0, allSunk: false };
  }
  grid.shots[r][c] = 2;
  let shipRemaining = 0;
  let totalRemaining = 0;
  for (let i = 0; i < grid.ships.length; i++) {
    for (let j = 0; j < grid.ships[i].length; j++) {
      if (grid.ships[i][j] > 0 && grid.shots[i][j] !== 2) {
        totalRemaining++;
        if (grid.ships[i][j] === shipId) shipRemaining++;
      }
    }
  }
  return {
    outcome: shipRemaining === 0 ? 'sunk' : 'hit',
    shipId,
    allSunk: totalRemaining === 0,
  };
}

export function pickBattleshipAiTarget(playerGrid: BattleshipGrid, difficulty: GameDifficulty = 'medium'): [number, number] | null {
  const n = playerGrid.shots.length;
  const targets: Array<[number, number]> = [];
  // Hunt adjacent to unsunk hits
  if (difficulty !== 'easy') {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (playerGrid.shots[r][c] === 2) {
          for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < n && nc >= 0 && nc < n && playerGrid.shots[nr][nc] === 0) {
              targets.push([nr, nc]);
            }
          }
        }
      }
    }
    if (targets.length) return targets[Math.floor(Math.random() * targets.length)];
  }
  const unknown: Array<[number, number]> = [];
  const parity: Array<[number, number]> = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (playerGrid.shots[r][c] === 0) {
        unknown.push([r, c]);
        if ((r + c) % 2 === 0) parity.push([r, c]);
      }
    }
  }
  if (!unknown.length) return null;
  const pool = difficulty === 'pro' && parity.length ? parity : unknown;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ============================================================================
   8. BILINGUAL AI COMMENTARY & IN-GAME CHAT FALLBACK
   ============================================================================ */
export function generateGameChatReply(params: {
  gameId: GameId;
  userMessage: string;
  lang: GameLang;
  boardSummary?: string;
}): string {
  const msg = String(params.userMessage || '').trim();
  const isHe = params.lang === 'he' || /[\u0590-\u05FF]/.test(msg);
  const low = msg.toLowerCase();

  if (/\b(hint|help|tip)\b|רמז|עזור|עזרה|מה לעשות/i.test(low)) {
    const hintsHe: Record<GameId, string> = {
      chess: '💡 רמז קטן ממני: תשלוט במרכז הלוח, תגן על המלך שלך ותבדוק אילו כלים שלי לא מוגנים!',
      tictactoe: '💡 טיפ: המרכז והפינות הם המפתח — תנסה ליצור איום כפול (מזלג)!',
      connect4: '💡 טיפ טקטי: העמודה האמצעית הכי חזקה! תבנה שני איומים במקביל כדי שלא אוכל לחסום את שניהם.',
      checkers: '💡 טיפ: תנסה להגיע לשורה האחרונה שלי כדי לקבל מלך, ושמור על השורה האחורית שלך סגורה!',
      reversi: '💡 סוד של אלופים: הפינות הן הכל ברברסי! אל תתן לי להיכנס לפינה.',
      battleship: '💡 רמז ימי: תירה בתבנית שחמט (משבצת כן, משבצת לא) כדי למצוא את הצוללות שלי הכי מהר.',
      nim: '💡 סוד מתמטי: נסה להשאיר אותי עם שני טורים שווים בגודלם — משם תוכל לחקות כל מהלך שלי!',
    };
    const hintsEn: Record<GameId, string> = {
      chess: '💡 Quick hint: control the center squares, keep your king safe, and look for undefended pieces!',
      tictactoe: '💡 Tip: center and corners win games — try setting up a double-threat fork!',
      connect4: '💡 Tactical tip: own the center column and build two simultaneous winning threats.',
      checkers: '💡 Tip: push for a King on my back row while guarding your own back rank!',
      reversi: '💡 Pro secret: corners can never be flipped! Fight for corners and avoid squares next to them.',
      battleship: '💡 Naval tip: fire in a checkerboard pattern until you get a hit, then sweep adjacent cells.',
      nim: '💡 Math secret: try leaving two equal rows so you can mirror every move I make!',
    };
    return isHe ? hintsHe[params.gameId] : hintsEn[params.gameId];
  }

  if (/\b(win|beat|crush|easy|ez|noob)\b|אנצח|מנצח|קל|חלש|תפסיד/i.test(low)) {
    return isHe
      ? '😏 ביטחון עצמי גבוה! אני אוהב את זה — בוא נראה אם תצליח להוכיח את זה על הלוח!'
      : '😏 Love the confidence! Let’s see if your next move backs up that trash talk!';
  }

  if (/\b(hard|strong|good|smart|wow|nice)\b|חזק|טוב|יפה|וואו|קשה|מדהים/i.test(low)) {
    return isHe
      ? '🔥 תודה! אני מחשב כמה צעדים קדימה, אבל אתה נותן לי פייט ממש לא רע. תורך!'
      : '🔥 Appreciate it! I’m calculating a few moves ahead, and you’re giving me a real challenge. Your move!';
  }

  if (/\b(undo|restart|again|rematch)\b|עוד פעם|מחדש|משחק חדש/i.test(low)) {
    return isHe
      ? '🔄 מוכן לסיבוב חדש בכל רגע! לחץ על כפתור "משחק חדש" למעלה ונצא לדרך.'
      : '🔄 Always ready for a rematch! Hit "New Game" at the top whenever you want a fresh board.';
  }

  if (/\b(hi|hello|hey|sup|how are you)\b|היי|שלום|מה קורה|מה נשמע|מה המצב/i.test(low)) {
    return isHe
      ? 'היי! הכל מעולה, אני נהנה מהמשחק שלנו! איך אתה מרגיש לגבי העמדה שלך על הלוח? תורך!'
      : 'Hey! Doing great and loving this match! How are you feeling about your position on the board? Your move!';
  }

  return isHe
    ? 'אני איתך לגמרי! בוא נמשיך לשחק — אם תרצה רמז אסטרטגי, הסבר על המצב בלוח או סתם לדבר תוך כדי, תשאל אותי הכל!'
    : 'I am right here with you! Whether you want a real strategy hint, a breakdown of the board, or just want to chat mid-match, ask away!';
}
