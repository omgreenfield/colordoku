import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyState, setCrossed } from '../site/js/game/game.js';
import { generatePuzzle } from '../site/js/game/generator.js';
import { effectiveState, startAttempt } from '../site/js/game/attempt.js';
import { applyHint, getHint } from '../site/js/game/hints.js';
import { createRandom } from '../site/js/game/random.js';
import { cellKey } from '../site/js/game/rules.js';
import { SMALL_PUZZLE, stateOf } from './fixtures.js';

/**
 * @typedef {import('../site/js/game/hints.js').Hint} Hint
 * @typedef {import('../site/js/game/rules.js').BoardState} BoardState
 * @typedef {import('../site/js/game/rules.js').Puzzle} Puzzle
 */

test('the mark hint points at the first unmarked solution cell', () => {
  const result = getHint(SMALL_PUZZLE, stateOf({ marked: [[0, 1]] }), 'mark');
  assert.ok('hint' in result);
  assert.equal(result.hint.action, 'mark');
  assert.deepEqual(result.hint.targets, [[1, 3]]);
});

test('the mark hint says when every mark is placed', () => {
  const solved = stateOf({
    marked: [
      [0, 1],
      [1, 3],
      [2, 0],
      [3, 2],
    ],
  });
  assert.deepEqual(getHint(SMALL_PUZZLE, solved, 'mark'), {
    message: 'Every mark already placed.',
  });
});

test('the cross hint offers up to three non-solution cells in reading order', () => {
  const result = getHint(SMALL_PUZZLE, emptyState(), 'cross');
  assert.ok('hint' in result);
  assert.deepEqual(result.hint.targets, [
    [0, 0],
    [0, 2],
    [0, 3],
  ]);
  assert.equal(result.hint.text, '3 squares are impossible in every valid completion.');
});

test('every hint refuses an impossible board', () => {
  for (const type of /** @type {const} */ (['mark', 'cross', 'reason'])) {
    assert.deepEqual(getHint(SMALL_PUZZLE, stateOf({ crossed: [[0, 1]] }), type), {
      message: 'Current cross-offs leave no solution. Undo at least one.',
    });
  }
});

test('applyHint crosses off every target', () => {
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
  const result = applyHint(SMALL_PUZZLE, emptyState(), hint);
  assert.ok('state' in result);
  assert.deepEqual([...result.state.crossed], ['0,0', '0,2']);
});

test('applyHint leaves an already-marked target marked', () => {
  /** @type {Hint} */
  const hint = { title: 'Guaranteed mark', text: '', targets: [[0, 1]], action: 'mark' };
  const result = applyHint(SMALL_PUZZLE, stateOf({ marked: [[0, 1]] }), hint);
  assert.ok('state' in result);
  assert.deepEqual([...result.state.marked], ['0,1']);
});

/** A board after the red mark at row 1, column 2 and every square it rules out, plus (3, 3), are crossed off. */
const RED_MARK_CLEARED = stateOf({
  marked: [[0, 1]],
  crossed: [
    [0, 0],
    [0, 2],
    [0, 3],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 1],
    [3, 1],
    [3, 3],
  ],
});

test('bug 3: explain next step crosses off squares a mark rules out', () => {
  const result = getHint(SMALL_PUZZLE, stateOf({ marked: [[0, 1]] }), 'reason');
  assert.ok('hint' in result);
  assert.deepEqual(result.hint.targets, [
    [0, 0],
    [0, 2],
    [0, 3],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 1],
    [3, 1],
  ]);
  assert.equal(
    result.hint.text,
    'The mark at row 1, column 2 rules out the rest of its row and column, the other red squares, and every square touching it.',
  );
});

test('bug 4: explain next step ignores colors that already have a mark', () => {
  const result = getHint(SMALL_PUZZLE, RED_MARK_CLEARED, 'reason');
  assert.ok('hint' in result);
  assert.deepEqual(result.hint.targets, [[2, 3]]);
  assert.equal(
    result.hint.text,
    'Green and yellow must fill rows 3 and 4, so no other color can use those rows.',
  );
});

/**
 * A random board that agrees with the solution: some solution cells marked, some other cells crossed off.
 *
 * @param {Puzzle} puzzle
 * @param {() => number} random
 * @returns {BoardState}
 */
function partialState(puzzle, random) {
  const state = emptyState();
  for (let row = 0; row < puzzle.size; row++) {
    for (let column = 0; column < puzzle.size; column++) {
      const key = cellKey(row, column);
      if (puzzle.solution[row] === column) {
        if (random() < 0.3) state.marked.add(key);
      } else if (random() < 0.2) state.crossed.add(key);
    }
  }
  return state;
}

test('hints never cross off a solution square or mark anything else', () => {
  for (const size of [6, 7, 8]) {
    for (let index = 0; index < 12; index++) {
      const puzzle = generatePuzzle(size, `sound${index}`);
      assert.ok(puzzle);
      let state = partialState(puzzle, createRandom(`state-${size}-${index}`));
      const mark = getHint(puzzle, state, 'mark');
      if ('hint' in mark) {
        const [[row, column]] = mark.hint.targets;
        assert.equal(puzzle.solution[row], column);
      }
      const cross = getHint(puzzle, state, 'cross');
      if ('hint' in cross) {
        for (const [row, column] of cross.hint.targets)
          assert.notEqual(puzzle.solution[row], column);
      }
      for (let step = 0; step < 80; step++) {
        const reason = getHint(puzzle, state, 'reason');
        if ('message' in reason) break;
        for (const [row, column] of reason.hint.targets) {
          assert.notEqual(puzzle.solution[row], column, `${reason.hint.text} (seed sound${index})`);
        }
        state = setCrossed(state, reason.hint.targets, true);
      }
    }
  }
});

test('hints treat mistakes as crossed off', () => {
  const attempt = { ...startAttempt(3), mistakes: new Set(['0,0', '0,2']) };
  const result = getHint(SMALL_PUZZLE, effectiveState(emptyState(), attempt), 'cross');
  assert.ok('hint' in result);
  assert.deepEqual(result.hint.targets, [
    [0, 3],
    [1, 0],
    [1, 1],
  ]);
});
