import assert from 'node:assert/strict';
import { test } from 'node:test';
import { puzzleSearch, readPuzzleParams } from '../site/js/ui/url.js';

test('readPuzzleParams reads a valid link', () => {
  assert.deepEqual(readPuzzleParams('?size=8&seed=k3f9x2'), { size: 8, seed: 'k3f9x2' });
});

test('readPuzzleParams drops invalid or missing values', () => {
  assert.deepEqual(readPuzzleParams(''), { size: null, seed: null });
  assert.deepEqual(readPuzzleParams('?size=12&seed=no-dashes'), { size: null, seed: null });
  assert.deepEqual(readPuzzleParams('?size=abc&seed='), { size: null, seed: null });
  assert.deepEqual(readPuzzleParams('?seed=%F0%9F%90%A7'), { size: null, seed: null });
  assert.deepEqual(readPuzzleParams('?size=7.5'), { size: null, seed: null });
});

test('readPuzzleParams tolerates harmless variations', () => {
  assert.deepEqual(readPuzzleParams('?seed=K3F9X2'), { size: null, seed: 'k3f9x2' });
  assert.deepEqual(readPuzzleParams('?size=09'), { size: 9, seed: null });
  assert.deepEqual(readPuzzleParams('size=6&seed=abc'), { size: 6, seed: 'abc' });
  assert.deepEqual(readPuzzleParams('?size=6&size=9&seed=abc&utm_source=chat'), {
    size: 6,
    seed: 'abc',
  });
});

test('puzzleSearch builds a query string readPuzzleParams can read back', () => {
  assert.equal(puzzleSearch(8, 'k3f9x2'), '?size=8&seed=k3f9x2');
  assert.deepEqual(readPuzzleParams(puzzleSearch(6, 'abc123')), { size: 6, seed: 'abc123' });
});
