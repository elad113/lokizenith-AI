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

test('Chess opening has 20 legal white moves and AI replies legally', () => {
  const s0 = createInitialChessState();
  const whiteMoves = getLegalChessMoves(s0, 'w');
  assert.equal(whiteMoves.length, 20);

  // White plays e2 -> e4
  const e2e4 = whiteMoves.find((m) => m.from[0] === 6 && m.from[1] === 4 && m.to[0] === 4 && m.to[1] === 4)!;
  assert.ok(e2e4);
  const s1 = applyChessMove(s0, e2e4);
  assert.equal(s1.turn, 'b');

  const aiMove = pickChessAiMove(s1, 'medium');
  assert.ok(aiMove);
  const s2 = applyChessMove(s1, aiMove);
  assert.equal(s2.turn, 'w');
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
