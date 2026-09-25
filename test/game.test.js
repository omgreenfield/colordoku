import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checkMessage,
  emptyState,
  getStatus,
  isEmpty,
  sameState,
  setCrossed,
  toggleMark,
} from '../site/js/game/game.js';
import { SMALL_PUZZLE, stateOf } from './fixtures.js';

const SOLVED = stateOf({
  marked: [
    [0, 1],
    [1, 3],
    [2, 0],
    [3, 2],
  ],
});

test('setCrossed adds and clears crosses without touching marks or the input', () => {
  const start = stateOf({ marked: [[0, 1]] });
  const crossed = setCrossed(
    start,
    [
      [0, 0],
      [0, 1],
    ],
    true,
  );
  assert.deepEqual([...crossed.crossed], ['0,0']);
  assert.equal(start.crossed.size, 0);
  assert.equal(setCrossed(crossed, [[0, 0]], false).crossed.size, 0);
});

test('toggleMark places a valid mark and clears its cross', () => {
  const result = toggleMark(SMALL_PUZZLE, stateOf({ crossed: [[0, 1]] }), [0, 1]);
  assert.ok('state' in result);
  assert.deepEqual([...result.state.marked], ['0,1']);
  assert.equal(result.state.crossed.size, 0);
});

test('toggleMark removes an existing mark', () => {
  const result = toggleMark(SMALL_PUZZLE, stateOf({ marked: [[0, 1]] }), [0, 1]);
  assert.ok('state' in result);
  assert.ok(isEmpty(result.state));
});

test('toggleMark rejects marks that conflict or leave no solution', () => {
  assert.deepEqual(toggleMark(SMALL_PUZZLE, stateOf({ marked: [[0, 1]] }), [1, 0]), {
    message: 'That mark conflicts with another mark.',
  });
  assert.deepEqual(toggleMark(SMALL_PUZZLE, emptyState(), [0, 2]), {
    message: 'Invalid mark: it leaves no possible solution.',
  });
});

test('getStatus reports each kind of progress', () => {
  assert.equal(getStatus(SMALL_PUZZLE, emptyState()).kind, 'ready');
  assert.deepEqual(getStatus(SMALL_PUZZLE, stateOf({ crossed: [[0, 0]] })), {
    kind: 'progress',
    title: '0 of 4 marks placed',
    text: '1 square crossed off.',
  });
  assert.equal(
    getStatus(
      SMALL_PUZZLE,
      stateOf({
        crossed: [
          [0, 0],
          [0, 2],
        ],
      }),
    ).text,
    '2 squares crossed off.',
  );
  assert.equal(getStatus(SMALL_PUZZLE, stateOf({ crossed: [[0, 1]] })).kind, 'impossible');
  assert.equal(getStatus(SMALL_PUZZLE, SOLVED).kind, 'solved');
});

test('checkMessage summarizes the board', () => {
  assert.equal(checkMessage(SMALL_PUZZLE, emptyState()), 'No mistakes so far.');
  assert.equal(
    checkMessage(SMALL_PUZZLE, SOLVED),
    'Solved! Every row, column, and color has exactly one mark.',
  );
  assert.equal(
    checkMessage(SMALL_PUZZLE, stateOf({ crossed: [[0, 1]] })),
    'Something’s off: the current cross-offs leave no solution.',
  );
});

test('sameState compares both sets', () => {
  assert.ok(sameState(stateOf({ crossed: [[0, 0]] }), stateOf({ crossed: [[0, 0]] })));
  assert.ok(!sameState(stateOf({ crossed: [[0, 0]] }), stateOf({ marked: [[0, 0]] })));
});
