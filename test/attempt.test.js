import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_LIVES,
  LIVES_CHOICES,
  applyHint,
  checkMessage,
  effectiveState,
  getStatus,
  markCell,
  scoreFor,
  startAttempt,
} from '../site/js/game/attempt.js';
import { emptyState } from '../site/js/game/game.js';
import { SMALL_PUZZLE, stateOf } from './fixtures.js';

/**
 * @typedef {import('../site/js/game/hints.js').Hint} Hint
 * @typedef {import('../site/js/game/attempt.js').Attempt} Attempt
 */

const THREE_MARKS = stateOf({
  marked: [
    [0, 1],
    [1, 3],
    [2, 0],
  ],
});

/**
 * An attempt with some lives already lost to mistakes.
 *
 * @param {number} livesLeft
 * @param {string[]} mistakes
 * @returns {Attempt}
 */
function attemptWith(livesLeft, mistakes) {
  return { ...startAttempt(3), livesLeft, mistakes: new Set(mistakes) };
}

test('lives settings default to 3 of 1–5', () => {
  assert.deepEqual(LIVES_CHOICES, [1, 2, 3, 4, 5]);
  assert.equal(DEFAULT_LIVES, 3);
  assert.deepEqual(startAttempt(4), {
    livesStart: 4,
    livesLeft: 4,
    mistakes: new Set(),
    outcome: 'playing',
    practice: false,
  });
  assert.equal(startAttempt(3, true).practice, true);
});

test('a correct mark is placed and clears its cross', () => {
  const attempt = startAttempt(3);
  const result = markCell(SMALL_PUZZLE, stateOf({ crossed: [[0, 1]] }), attempt, [0, 1]);
  assert.equal(result.event, 'placed');
  assert.deepEqual([...result.board.marked], ['0,1']);
  assert.equal(result.board.crossed.size, 0);
  assert.equal(result.attempt, attempt);
});

test('pressing an existing mark removes it', () => {
  const result = markCell(SMALL_PUZZLE, stateOf({ marked: [[0, 1]] }), startAttempt(3), [0, 1]);
  assert.equal(result.event, 'removed');
  assert.equal(result.board.marked.size, 0);
});

test('a wrong mark costs a life, becomes a mistake, and leaves the board alone', () => {
  const board = stateOf({ crossed: [[0, 0]] });
  const result = markCell(SMALL_PUZZLE, board, startAttempt(3), [0, 0]);
  assert.equal(result.event, 'mistake');
  assert.equal(result.board, board);
  assert.equal(result.attempt.livesLeft, 2);
  assert.deepEqual([...result.attempt.mistakes], ['0,0']);
  assert.equal(result.attempt.outcome, 'playing');
});

test('a mark that breaks a visible rule is a mistake too', () => {
  const result = markCell(SMALL_PUZZLE, stateOf({ marked: [[0, 1]] }), startAttempt(3), [1, 0]);
  assert.equal(result.event, 'mistake');
});

test('losing the last life loses the attempt', () => {
  const result = markCell(SMALL_PUZZLE, emptyState(), attemptWith(1, ['0,0', '0,2']), [0, 3]);
  assert.equal(result.event, 'lost');
  assert.equal(result.attempt.livesLeft, 0);
  assert.equal(result.attempt.outcome, 'lost');
});

test('the last correct mark wins', () => {
  const result = markCell(SMALL_PUZZLE, THREE_MARKS, startAttempt(3), [3, 2]);
  assert.equal(result.event, 'won');
  assert.equal(result.attempt.outcome, 'won');
  assert.equal(result.board.marked.size, 4);
});

test('mistake squares and finished attempts ignore marks', () => {
  const withMistake = attemptWith(2, ['0,0']);
  assert.equal(markCell(SMALL_PUZZLE, emptyState(), withMistake, [0, 0]).event, 'ignored');
  const lost = { ...startAttempt(1), livesLeft: 0, outcome: /** @type {const} */ ('lost') };
  const result = markCell(SMALL_PUZZLE, emptyState(), lost, [0, 1]);
  assert.equal(result.event, 'ignored');
  assert.equal(result.attempt.livesLeft, 0);
});

test('effectiveState counts mistakes as crossed off', () => {
  const state = effectiveState(
    stateOf({ crossed: [[0, 2]], marked: [[0, 1]] }),
    attemptWith(2, ['0,0']),
  );
  assert.deepEqual([...state.crossed].sort(), ['0,0', '0,2']);
  assert.deepEqual([...state.marked], ['0,1']);
});

test('applyHint crosses off targets but leaves mistakes alone', () => {
  /** @type {Hint} */
  const hint = {
    title: 'Safe cross-offs',
    text: '',
    targets: [
      [0, 0],
      [0, 2],
    ],
    action: 'cross',
  };
  const result = applyHint(SMALL_PUZZLE, emptyState(), attemptWith(2, ['0,0']), hint);
  assert.equal(result.event, 'crossed');
  assert.deepEqual([...result.board.crossed], ['0,2']);
});

test('applyHint places a mark hint and can win', () => {
  /** @type {Hint} */
  const hint = { title: 'Guaranteed mark', text: '', targets: [[3, 2]], action: 'mark' };
  const result = applyHint(SMALL_PUZZLE, THREE_MARKS, startAttempt(3), hint);
  assert.equal(result.event, 'won');
});

test('applyHint leaves an already-marked target marked', () => {
  /** @type {Hint} */
  const hint = { title: 'Guaranteed mark', text: '', targets: [[0, 1]], action: 'mark' };
  const board = stateOf({ marked: [[0, 1]] });
  const result = applyHint(SMALL_PUZZLE, board, startAttempt(3), hint);
  assert.equal(result.event, 'ignored');
  assert.deepEqual([...result.board.marked], ['0,1']);
});

test('applyHint does nothing once the attempt is over', () => {
  /** @type {Hint} */
  const hint = { title: 'Safe cross-offs', text: '', targets: [[0, 0]], action: 'cross' };
  const won = { ...startAttempt(3), outcome: /** @type {const} */ ('won') };
  assert.equal(applyHint(SMALL_PUZZLE, emptyState(), won, hint).event, 'ignored');
});

test('scoreFor scales by board size and lives kept', () => {
  assert.equal(scoreFor(8, 3, 3), 800);
  assert.equal(scoreFor(8, 2, 3), 533);
  assert.equal(scoreFor(6, 1, 1), 600);
  assert.equal(scoreFor(9, 1, 5), 180);
});

test('getStatus covers every kind', () => {
  assert.equal(getStatus(SMALL_PUZZLE, emptyState(), startAttempt(3)).kind, 'ready');
  assert.deepEqual(getStatus(SMALL_PUZZLE, emptyState(), attemptWith(2, ['0,0'])), {
    kind: 'progress',
    title: '0 of 4 marks placed',
    text: '0 squares crossed off.',
  });
  assert.equal(
    getStatus(SMALL_PUZZLE, stateOf({ crossed: [[0, 1]] }), startAttempt(3)).kind,
    'impossible',
  );
  const won = { ...attemptWith(2, ['0,0']), outcome: /** @type {const} */ ('won') };
  assert.deepEqual(getStatus(SMALL_PUZZLE, THREE_MARKS, won), {
    kind: 'solved',
    title: 'Solved!',
    text: '+267 points with 2 of 3 lives left.',
  });
  const lost = { ...attemptWith(0, ['0,0', '0,2', '0,3']), outcome: /** @type {const} */ ('lost') };
  assert.deepEqual(getStatus(SMALL_PUZZLE, emptyState(), lost), {
    kind: 'lost',
    title: 'Out of lives',
    text: 'The solution is shown. Try again or start a new game.',
  });
});

test('checkMessage summarizes the board', () => {
  assert.equal(
    checkMessage(SMALL_PUZZLE, emptyState(), startAttempt(3)),
    'Your crosses and marks all fit the solution.',
  );
  assert.equal(
    checkMessage(SMALL_PUZZLE, stateOf({ crossed: [[0, 1]] }), startAttempt(3)),
    'Something’s off: the current cross-offs leave no solution.',
  );
  const lost = { ...attemptWith(0, []), outcome: /** @type {const} */ ('lost') };
  assert.equal(
    checkMessage(SMALL_PUZZLE, emptyState(), lost),
    'Out of lives. Try again or start a new game.',
  );
});

test('a practice round says so before the first move and scores nothing when solved', () => {
  const practice = startAttempt(3, true);
  assert.deepEqual(getStatus(SMALL_PUZZLE, emptyState(), practice), {
    kind: 'ready',
    title: 'Practice round',
    text: 'You’ve finished this puzzle before, so this try won’t count toward your record.',
  });
  const won = { ...practice, outcome: /** @type {const} */ ('won') };
  assert.deepEqual(getStatus(SMALL_PUZZLE, THREE_MARKS, won), {
    kind: 'solved',
    title: 'Solved!',
    text: 'Replays don’t score. Start a new game to earn points.',
  });
});
