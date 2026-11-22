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
  { id: 'chess', rx: /\bchess\b|שחמט|שח-מט/i },
  { id: 'tictactoe', rx: /\btic[\s-]*tac[\s-]*toe\b|איקס[\s-]*עיגול|x[\s-]*o\b/i },
  { id: 'connect4', rx: /\bconnect[\s-]*(?:4|four)\b|ארבע\s+בשורה|4\s+בשורה/i },
  { id: 'checkers', rx: /\bcheckers?\b|\bdraughts\b|דמקה/i },
  { id: 'reversi', rx: /\breversi\b|\bothello\b|רברסי|אותלו/i },
  { id: 'battleship', rx: /\bbattleships?\b|צוללות/i },
  { id: 'nim', rx: /\bnim\b|נים/i },
];

export function detectPlayGameIntent(text: string): PlayIntentResult {
  const raw = String(text || '').trim();
  const heCount = (raw.match(/[\u0590-\u05FF]/g) || []).length;
  const lang: GameLang = heCount >= 2 ? 'he' : 'en';
  if (!raw || raw.length > 200) {
    return { isPlayRequest: false, lang, suggestedGameId: null };
  }

  // Avoid coding / tutorial requests like "build a chess game in React" or "write python code for tic tac toe"
  if (
    /\b(code|script|html|css|python|javascript|typescript|react|unity|godot|tutorial|algorithm|how\s+to\s+build|create\s+a\s+website)\b|תכתוב\s+קוד|בנה\s+אפליקציה|קוד\s+למשחק|תכנת/i.test(
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

  const heTrigger =
    /(?:תשחק|שחק|נשחק|לשחק)\s*(?:איתי|אתך|איתך|ביחד|נגדך|נגדי|משחק|שחמט|איקס|דמקה|רברסי|צוללות|ארבע|נים)|(?:בוא|בא\s*לי|רוצה|אפשר|תציע)\s*(?:נשחק|לשחק|משחק|משחקים)|^(?:משחקים|בוא\s+נשחק|תשחק\s+איתי|שחק\s+איתי)[!?.🎮♟️\s]*$/i;

  const enTrigger =
    /\b(?:play\s+(?:with\s+me|against\s+me|a\s+game|games|chess|tic[\s-]*tac[\s-]*toe|connect\s*(?:4|four)|checkers|reversi|othello|battleship|nim)|let'?s\s+play|wanna\s+play|want\s+to\s+play|challenge\s+you|game\s+mode|two[\s-]*player\s+games?)\b/i;

  const isPlayRequest = heTrigger.test(raw) || enTrigger.test(raw);
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
}
export interface ChessMove {
  from: [number, number];
  to: [number, number];
  capture?: ChessPiece;
  promotion?: ChessPiece;
  castleSide?: 'K' | 'Q';
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

  return { board, turn: state.turn === 'w' ? 'b' : 'w', castle };
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
          if (inBounds8(nr, nc) && board[nr][nc] && pieceColor(board[nr][nc]) === enemy) {
            pseudo.push({
              from: [r, c],
              to: [nr, nc],
              capture: board[nr][nc],
              promotion: nr === promoRow ? promoPiece : undefined,
            });
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

const CHESS_VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function evalChessPosition(board: ChessPiece[][]): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const base = CHESS_VAL[p.toLowerCase()] || 0;
      const centerBonus = (3.5 - Math.abs(3.5 - r) + (3.5 - Math.abs(3.5 - c))) * 6;
      const advanceBonus = p === 'p' ? r * 8 : p === 'P' ? (7 - r) * 8 : 0;
      const val = base + centerBonus + advanceBonus;
      score += pieceColor(p) === 'b' ? val : -val;
    }
  }
  return score;
}

export function pickChessAiMove(state: ChessState, difficulty: GameDifficulty = 'medium'): ChessMove | null {
  const moves = getLegalChessMoves(state, 'b');
  if (!moves.length) return null;
  if (difficulty === 'easy') {
    const captures = moves.filter((m) => m.capture);
    if (captures.length && Math.random() < 0.65) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }
  // Order captures first for better pruning
  const ordered = [...moves].sort((a, b) => (b.capture ? 1 : 0) - (a.capture ? 1 : 0));
  let bestMove = ordered[0];
  let bestVal = -Infinity;
  for (const mv of ordered) {
    const s1 = applyChessMove(state, mv);
    const replies = getLegalChessMoves(s1, 'w');
    let val: number;
    if (!replies.length) {
      val = isKingInCheck(s1.board, 'w') ? 99999 : 0;
    } else if (difficulty === 'medium') {
      // 2-ply minimax (black move -> best white reply)
      let worstForBlack = Infinity;
      for (const rep of replies) {
        const s2 = applyChessMove(s1, rep);
        const sc = evalChessPosition(s2.board);
        if (sc < worstForBlack) worstForBlack = sc;
      }
      val = worstForBlack + (Math.random() - 0.5) * 8;
    } else {
      // Pro: 2-ply with check & capture threat awareness
      let worstForBlack = Infinity;
      for (const rep of replies) {
        const s2 = applyChessMove(s1, rep);
        let sc = evalChessPosition(s2.board);
        if (isKingInCheck(s2.board, 'b')) sc -= 35;
        if (sc < worstForBlack) worstForBlack = sc;
      }
      if (isKingInCheck(s1.board, 'w')) worstForBlack += 28;
      val = worstForBlack;
    }
    if (val > bestVal) {
      bestVal = val;
      bestMove = mv;
    }
  }
  return bestMove;
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

  return isHe
    ? `😎 שמעתי אותך ("${msg.slice(0, 42)}")! אני לגמרי מרוכז בלוח — בוא נראה מה המהלך הבא שלך!`
    : `😎 Heard you ("${msg.slice(0, 42)}")! I’m locked in on the board — show me your next move!`;
}
