import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePuzzle } from '../site/js/game/generator.js';
import { SIZES, cellKey } from '../site/js/game/rules.js';
import { solve } from '../site/js/game/solver.js';

/**
 * @typedef {import('../site/js/game/rules.js').Cell} Cell
 * @typedef {import('../site/js/game/rules.js').Puzzle} Puzzle
 */

const SEEDS = Array.from({ length: 25 }, (_, index) => `seed${index}`);

/**
 * Fails unless one region's cells form a single connected area.
 *
 * @param {number[][]} regions
 * @param {number} region
 */
function assertConnected(regions, region) {
  /** @type {Cell[]} */
  const cells = [];
  regions.forEach((row, rowIndex) =>
    row.forEach((value, column) => {
      if (value === region) cells.push([rowIndex, column]);
    }),
  );
  assert.ok(cells.length > 0, `region ${region} is empty`);
  const seen = new Set([cellKey(...cells[0])]);
  const queue = [cells[0]];
  for (let index = 0; index < queue.length; index++) {
    const [row, column] = queue[index];
    /** @type {Cell[]} */
    const neighbors = [
      [row - 1, column],
      [row + 1, column],
      [row, column - 1],
      [row, column + 1],
    ];
    for (const [nextRow, nextColumn] of neighbors) {
      const key = cellKey(nextRow, nextColumn);
      if (regions[nextRow]?.[nextColumn] === region && !seen.has(key)) {
        seen.add(key);
        queue.push([nextRow, nextColumn]);
      }
    }
  }
  assert.equal(seen.size, cells.length, `region ${region} is split`);
}

/**
 * Fails unless a puzzle is well formed and has exactly one solution.
 *
 * @param {Puzzle} puzzle
 */
function assertValidPuzzle(puzzle) {
  const { size, regions, solution } = puzzle;
  assert.equal(regions.length, size);
  assert.ok(
    regions.every((row) => row.length === size && row.every((value) => value >= 0 && value < size)),
  );
  assert.deepEqual(solve(regions, undefined, 2), [solution]);
  assert.equal(new Set(solution).size, size, 'solution columns repeat');
  for (let region = 0; region < size; region++) {
    assertConnected(regions, region);
    assert.equal(solution.filter((column, row) => regions[row][column] === region).length, 1);
  }
}

for (const size of SIZES) {
  test(`generatePuzzle builds valid ${size}×${size} puzzles`, () => {
    for (const seed of SEEDS) {
      const puzzle = generatePuzzle(size, seed);
      assert.ok(puzzle, `seed ${seed} failed to generate`);
      assert.equal(puzzle.size, size);
      assert.equal(puzzle.seed, seed);
      assertValidPuzzle(puzzle);
    }
  });
}

test('generatePuzzle rebuilds the same puzzle from the same seed', () => {
  assert.deepEqual(generatePuzzle(8, 'repeat'), generatePuzzle(8, 'repeat'));
  assert.notDeepEqual(generatePuzzle(8, 'repeat')?.regions, generatePuzzle(8, 'repeaz')?.regions);
});
