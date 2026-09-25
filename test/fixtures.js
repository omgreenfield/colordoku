/**
 * Hand-checkable puzzles for the game tests.
 *
 * @typedef {import('../site/js/game/rules.js').BoardState} BoardState
 * @typedef {import('../site/js/game/rules.js').Cell} Cell
 * @typedef {import('../site/js/game/rules.js').Puzzle} Puzzle
 */

/**
 * A 4×4 board whose only solution is columns [1, 3, 0, 2]:
 *
 *   0 0 1 1
 *   0 1 1 1
 *   2 2 3 1
 *   2 2 3 3
 */
export const SMALL_REGIONS = [
  [0, 0, 1, 1],
  [0, 1, 1, 1],
  [2, 2, 3, 1],
  [2, 2, 3, 3],
];

/** The same board split into quarters, which allows both 4×4 answers: [1, 3, 0, 2] and [2, 0, 3, 1]. */
export const TWO_SOLUTION_REGIONS = [
  [0, 0, 1, 1],
  [0, 0, 1, 1],
  [2, 2, 3, 3],
  [2, 2, 3, 3],
];

/** @type {Puzzle} */
export const SMALL_PUZZLE = {
  size: 4,
  seed: 'small',
  regions: SMALL_REGIONS,
  solution: [1, 3, 0, 2],
};

/**
 * Builds a board state from lists of cells.
 *
 * @param {{ crossed?: Cell[], marked?: Cell[] }} cells
 * @returns {BoardState}
 */
export function stateOf({ crossed = [], marked = [] }) {
  return {
    crossed: new Set(crossed.map(([row, column]) => `${row},${column}`)),
    marked: new Set(marked.map(([row, column]) => `${row},${column}`)),
  };
}
