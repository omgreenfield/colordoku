import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  REGION_NAMES,
  SIZES,
  cellKey,
  cellsBetween,
  marksConflict,
  parseKey,
  touches,
} from '../site/js/game/rules.js';

const REGIONS = [
  [0, 0, 1, 1],
  [0, 1, 1, 1],
  [2, 2, 3, 1],
  [2, 2, 3, 3],
];

test('cellKey and parseKey round-trip', () => {
  assert.equal(cellKey(2, 7), '2,7');
  assert.deepEqual(parseKey('2,7'), [2, 7]);
});

test('touches includes diagonals and nothing farther', () => {
  assert.equal(touches([1, 1], [2, 2]), true);
  assert.equal(touches([1, 1], [1, 2]), true);
  assert.equal(touches([1, 1], [3, 1]), false);
  assert.equal(touches([0, 0], [1, 2]), false);
});

test('marksConflict covers every rule', () => {
  assert.equal(marksConflict(REGIONS, [0, 0], [0, 3]), true, 'same row');
  assert.equal(marksConflict(REGIONS, [0, 0], [3, 0]), true, 'same column');
  assert.equal(marksConflict(REGIONS, [0, 2], [2, 3]), true, 'same region');
  assert.equal(marksConflict(REGIONS, [2, 0], [3, 1]), true, 'touching');
  assert.equal(marksConflict(REGIONS, [0, 1], [1, 3]), false, 'no rule broken');
});

test('there is a region name for every region on the largest board', () => {
  assert.equal(REGION_NAMES.length, Math.max(...SIZES));
});

test('cellsBetween fills every cell a fast drag skipped', () => {
  assert.deepEqual(cellsBetween([6, 0], [6, 3]), [
    [6, 1],
    [6, 2],
    [6, 3],
  ]);
  assert.deepEqual(cellsBetween([0, 0], [2, 2]), [
    [1, 1],
    [2, 2],
  ]);
  assert.deepEqual(cellsBetween([3, 3], [0, 2]), [
    [2, 3],
    [1, 2],
    [0, 2],
  ]);
  assert.deepEqual(cellsBetween([4, 4], [4, 5]), [[4, 5]]);
});
