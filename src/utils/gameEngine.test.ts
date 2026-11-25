import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_CATALOG,
  detectPlayGameIntent,
  evaluateTtt,
  pickTttAiMove,
  createConnect4Board,
  dropConnect4,
  evaluateConnect4,
  pickConnect4AiCol,
  createInitialChessState,
  getLegalChessMoves,
  applyChessMove,
  pickChessAiMove,
  evaluateChessCentipawns,
  formatChessClock,
  formatChessSquare,
  createCheckersBoard,
  getLegalCheckersMoves,
  pickCheckersAiMove,
  createReversiBoard,
  getLegalReversiMoves,
  applyReversiMove,
  pickReversiAiMove,
  createNimPiles,
  pickNimAiMove,
  createBattleshipFleet,
  fireBattleshipShot,
  pickBattleshipAiTarget,
  generateGameChatReply,
} from './gameEngine';

test('GAME_CATALOG includes Chess, Tic-Tac-Toe, and at least 5 more games (7 total)', () => {
  assert.ok(GAME_CATALOG.length >= 7);
  const ids = GAME_CATALOG.map((g) => g.id);
  assert.ok(ids.includes('chess'));
  assert.ok(ids.includes('tictactoe'));
  assert.ok(ids.includes('connect4'));
  assert.ok(ids.includes('checkers'));
  assert.ok(ids.includes('reversi'));
  assert.ok(ids.includes('battleship'));
  assert.ok(ids.includes('nim'));
});

test('detectPlayGameIntent detects Hebrew and English play requests without false positives on code', () => {
  const h1 = detectPlayGameIntent('תשחק איתי');
  assert.equal(h1.isPlayRequest, true);
  assert.equal(h1.lang, 'he');
  assert.equal(h1.suggestedGameId, null);

  const h2 = detectPlayGameIntent('בוא נשחק שחמט');
  assert.equal(h2.isPlayRequest, true);
  assert.equal(h2.suggestedGameId, 'chess');

  const e1 = detectPlayGameIntent('play with me');
  assert.equal(e1.isPlayRequest, true);
  assert.equal(e1.lang, 'en');

  const codeReq = detectPlayGameIntent('write python code for a chess game');
  assert.equal(codeReq.isPlayRequest, false);
});

test('Tic-Tac-Toe AI wins immediately or blocks immediate threats', () => {
  const blockBoard = ['X', 'X', '', '', 'O', '', '', '', ''] as const;
  assert.equal(pickTttAiMove([...blockBoard], 'pro'), 2);

  const winBoard = ['O', 'O', '', 'X', 'X', '', '', '', ''] as const;
  assert.equal(pickTttAiMove([...winBoard], 'pro'), 2);
  assert.equal(evaluateTtt(['O', 'O', 'O', 'X', 'X', '', '', '', '']).winner, 'O');
});

test('Connect Four drops discs, detects 4-in-a-row, and blocks opponent threats', () => {
  let b = createConnect4Board();
  b = dropConnect4(b, 0, 1)!.board;
  b = dropConnect4(b, 1, 1)!.board;
  b = dropConnect4(b, 2, 1)!.board;
  const aiCol = pickConnect4AiCol(b, 'medium');
  assert.equal(aiCol, 3);

  const winBoard = dropConnect4(b, 3, 1)!.board;
  assert.equal(evaluateConnect4(winBoard).winner, 1);
});

test('Chess opening has 20 legal white moves, supports playing as Black (AI opens as White), and plays book openings', () => {
  const s0 = createInitialChessState();
  const whiteMoves = getLegalChessMoves(s0, 'w');
  assert.equal(whiteMoves.length, 20);
  assert.equal(evaluateChessCentipawns(s0.board), 0);

  // Player plays Black -> AI opens as White
  const aiWhiteOpen = pickChessAiMove(s0, 'pro', 'w');
  assert.ok(aiWhiteOpen);
  const uciOpen = formatChessSquare(aiWhiteOpen.from) + formatChessSquare(aiWhiteOpen.to);
  assert.ok(['e2e4', 'd2d4', 'g1f3', 'c2c4'].includes(uciOpen));

  // White plays e2 -> e4, AI replies as Black
  const e2e4 = whiteMoves.find((m) => m.from[0] === 6 && m.from[1] === 4 && m.to[0] === 4 && m.to[1] === 4)!;
  assert.ok(e2e4);
  const s1 = applyChessMove(s0, e2e4);
  assert.equal(s1.turn, 'b');

  const aiMove = pickChessAiMove(s1, 'medium', 'b');
  assert.ok(aiMove);
  const s2 = applyChessMove(s1, aiMove);
  assert.equal(s2.turn, 'w');
});

test('Chess supports En Passant capture, mate-in-1 tactical finding, and clock formatting', () => {
  // En passant test: White pawn on e5 (row 3, col 4), Black plays d7->d5 (row 1,3 -> row 3,3)
  const s0 = createInitialChessState();
  s0.board[3][4] = 'P';
  s0.board[6][4] = '';
  s0.turn = 'b';
  const d7d5 = getLegalChessMoves(s0, 'b').find(
    (m) => m.from[0] === 1 && m.from[1] === 3 && m.to[0] === 3 && m.to[1] === 3,
  )!;
  const s1 = applyChessMove(s0, d7d5);
  assert.deepEqual(s1.enPassant, [2, 3]);
  const epMove = getLegalChessMoves(s1, 'w').find((m) => m.isEnPassant);
  assert.ok(epMove);
  const s2 = applyChessMove(s1, epMove);
  assert.equal(s2.board[3][3], '');
  assert.equal(s2.board[2][3], 'P');

  // Mate-in-1 tactical test for AI playing Black (back-rank mate Ra1#)
  const mateBoard: ReturnType<typeof createInitialChessState>['board'] = Array.from({ length: 8 }, () =>
    Array(8).fill(''),
  );
  mateBoard[7][6] = 'K';
  mateBoard[6][5] = 'P';
  mateBoard[6][6] = 'P';
  mateBoard[6][7] = 'P';
  mateBoard[0][4] = 'k';
  mateBoard[5][0] = 'r';
  const mateState = {
    board: mateBoard,
    turn: 'b' as const,
    castle: { wK: false, wQ: false, bK: false, bQ: false },
    enPassant: null,
  };
  const aiMate = pickChessAiMove(mateState, 'pro', 'b');
  assert.ok(aiMate);
  assert.deepEqual(aiMate.to, [7, 0]);

  // Clock formatter
  assert.equal(formatChessClock(300000), '05:00');
  assert.equal(formatChessClock(9500), '0:09.5');
  assert.equal(formatChessClock(0), '0:00.0');
});

test('Grandmaster Chess AI captures hanging queen, avoids blunders, and refutes Scholar mate threat', () => {
  // 1. Refute 1. e4 e5 2. Qh5 (must defend e5 with Nc6 instead of letting Qxe5+ fork king and rook)
  const scholarBoard: ReturnType<typeof createInitialChessState>['board'] = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', '', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', 'p', '', '', 'Q'],
    ['', '', '', '', 'P', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', '', 'P', 'P', 'P'],
    ['R', 'N', 'B', '', 'K', 'B', 'N', 'R'],
  ];
  const refute = pickChessAiMove(
    { board: scholarBoard, turn: 'b', castle: { wK: true, wQ: true, bK: true, bQ: true }, enPassant: null },
    'pro',
    'b',
  );
  assert.ok(refute);
  assert.equal(formatChessSquare(refute.from) + formatChessSquare(refute.to), 'b8c6');

  // 2. Tactical win: White queen hanging on d5 while Black rook on d8 can capture it cleanly
  const hangBoard: ReturnType<typeof createInitialChessState>['board'] = Array.from({ length: 8 }, () =>
    Array(8).fill(''),
  );
  hangBoard[0][6] = 'k';
  hangBoard[0][3] = 'r';
  hangBoard[3][3] = 'Q';
  hangBoard[7][6] = 'K';
  hangBoard[6][5] = 'P';
  hangBoard[6][6] = 'P';
  hangBoard[1][6] = 'p';
  hangBoard[1][7] = 'p';
  const t0 = Date.now();
  const best = pickChessAiMove(
    { board: hangBoard, turn: 'b', castle: { wK: false, wQ: false, bK: false, bQ: false }, enPassant: null },
    'pro',
    'b',
  );
  const elapsed = Date.now() - t0;
  assert.ok(best);
  assert.deepEqual(best.to, [3, 3]);
  assert.ok(elapsed < 1200, `Expected Grandmaster search < 1200ms, got ${elapsed}ms`);

  // 3. Passed pawn evaluation bonus
  const passBoard: ReturnType<typeof createInitialChessState>['board'] = Array.from({ length: 8 }, () =>
    Array(8).fill(''),
  );
  passBoard[7][4] = 'K';
  passBoard[0][4] = 'k';
  passBoard[2][3] = 'P'; // White passed pawn on d6!
  passBoard[1][7] = 'p'; // Black pawn on h7
  assert.ok(evaluateChessCentipawns(passBoard) > 120);
});

test('Checkers, Reversi, Nim, and Battleship engines return valid legal AI moves', () => {
  const chk = createCheckersBoard();
  assert.equal(getLegalCheckersMoves(chk, 1).length, 7);
  assert.ok(pickCheckersAiMove(chk, 'medium'));

  const rev = createReversiBoard();
  const revMoves = getLegalReversiMoves(rev, 1);
  assert.equal(revMoves.length, 4);
  const revAfter = applyReversiMove(rev, revMoves[0].r, revMoves[0].c, 1)!;
  assert.ok(pickReversiAiMove(revAfter, 'pro'));

  const nim = createNimPiles();
  const nimMove = pickNimAiMove([0, 3, 0, 0], 'pro');
  assert.deepEqual(nimMove, { row: 1, take: 3 });
  assert.equal(nim.length, 4);

  const fleet = createBattleshipFleet(7);
  const shot = fireBattleshipShot(fleet, 0, 0);
  assert.ok(['miss', 'hit', 'sunk'].includes(shot.outcome));
  const aiTarget = pickBattleshipAiTarget(fleet, 'medium');
  assert.ok(aiTarget);
});

test('generateGameChatReply responds in Hebrew for hints and banter', () => {
  const hint = generateGameChatReply({ gameId: 'chess', userMessage: 'תן לי רמז', lang: 'he' });
  assert.ok(hint.includes('רמז'));
  const banter = generateGameChatReply({ gameId: 'tictactoe', userMessage: 'אני אנצח אותך', lang: 'he' });
  assert.ok(banter.length > 10);
});
