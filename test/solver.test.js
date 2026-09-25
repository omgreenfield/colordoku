import assert from 'node:assert/strict';
import { test } from 'node:test';
import { solve } from '../site/js/game/solver.js';
import { SMALL_REGIONS, TWO_SOLUTION_REGIONS, stateOf } from './fixtures.js';

test('solve finds the only solution of the small board', () => {
  assert.deepEqual(solve(SMALL_REGIONS), [[1, 3, 0, 2]]);
});

test('solve respects the limit', () => {
  assert.deepEqual(solve(TWO_SOLUTION_REGIONS, undefined, 2), [
    [1, 3, 0, 2],
    [2, 0, 3, 1],
  ]);
  assert.equal(solve(TWO_SOLUTION_REGIONS, undefined, 1).length, 1);
});

test('crossing off a solution cell leaves no solution', () => {
  assert.deepEqual(solve(SMALL_REGIONS, stateOf({ crossed: [[0, 1]] })), []);
});

test('a mark forces its row', () => {
  assert.deepEqual(solve(TWO_SOLUTION_REGIONS, stateOf({ marked: [[0, 2]] })), [[2, 0, 3, 1]]);
  assert.deepEqual(solve(SMALL_REGIONS, stateOf({ marked: [[0, 2]] })), []);
});

test('two marks in one row leave no solution', () => {
  assert.deepEqual(
    solve(
      TWO_SOLUTION_REGIONS,
      stateOf({
        marked: [
          [0, 1],
          [0, 2],
        ],
      }),
    ),
    [],
  );
});

test('cells without a region are unavailable', () => {
  const regions = SMALL_REGIONS.map((row) => [...row]);
  regions[0][1] = -1;
  assert.deepEqual(solve(regions), []);
});
