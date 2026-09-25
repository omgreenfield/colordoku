import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  REGION_NAMES,
  SIZES,
  cellKey,
  conflictingMarks,
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

test('conflictingMarks returns both marks of each conflicting pair', () => {
  assert.deepEqual(conflictingMarks(REGIONS, ['0,1', '1,3', '2,0']), new Set());
  assert.deepEqual(
    conflictingMarks(REGIONS, ['0,1', '1,3', '0,3']),
    new Set(['0,1', '0,3', '1,3']),
  );
});

test('there is a region name for every region on the largest board', () => {
  assert.equal(REGION_NAMES.length, Math.max(...SIZES));
});
