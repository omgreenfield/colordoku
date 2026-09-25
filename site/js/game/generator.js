import { createRandom, shuffle } from './random.js';
import { solve } from './solver.js';

/**
 * @typedef {import('./rules.js').Cell} Cell
 * @typedef {import('./rules.js').Puzzle} Puzzle
 */

const SOLUTION_ATTEMPTS = 200;
const PUZZLE_ATTEMPTS = 120;

/**
 * Picks one column per row so no two marks share a column or touch.
 *
 * @param {number} size
 * @param {() => number} random
 * @returns {number[] | null}
 */
export function generateSolution(size, random) {
  const columns = Array.from({ length: size }, (_, column) => column);
  for (let attempt = 0; attempt < SOLUTION_ATTEMPTS; attempt++) {
    /** @type {number[]} */
    const solution = [];
    const available = new Set(columns);
    /**
     * @param {number} row
     * @returns {boolean}
     */
    const visit = (row) => {
      if (row === size) return true;
      const choices = shuffle([...available], random).filter(
        (column) => row === 0 || Math.abs(column - solution[row - 1]) > 1,
      );
      for (const column of choices) {
        solution[row] = column;
        available.delete(column);
        if (visit(row + 1)) return true;
        available.add(column);
      }
      return false;
    };
    if (visit(0)) return solution;
  }
  return null;
}

/**
 * Grows one region from each solution cell, one cell at a time, keeping exactly one solution after every step.
 *
 * @param {number} size
 * @param {number[]} solution
 * @param {() => number} random
 * @returns {number[][] | null} `null` when growth gets stuck
 */
export function growRegions(size, solution, random) {
  /** @type {number[][]} */
  const regions = Array.from({ length: size }, () => Array(size).fill(-1));
  solution.forEach((column, row) => {
    regions[row][column] = row;
  });
  /** @type {Cell[]} */
  const allCells = Array.from({ length: size * size }, (_, index) => [
    Math.floor(index / size),
    index % size,
  ]);
  /**
   * @param {Cell} cell
   * @returns {Cell[]}
   */
  const neighbors = ([row, column]) =>
    /** @type {Cell[]} */ ([
      [row - 1, column],
      [row + 1, column],
      [row, column - 1],
      [row, column + 1],
    ]).filter(([r, c]) => r >= 0 && c >= 0 && r < size && c < size);

  for (let remaining = size * size - size; remaining > 0; remaining--) {
    const frontier = shuffle(allCells, random).filter(
      (cell) =>
        regions[cell[0]][cell[1]] === -1 && neighbors(cell).some(([r, c]) => regions[r][c] >= 0),
    );
    let grew = false;
    for (const [row, column] of frontier) {
      const adjacent = new Set(
        neighbors([row, column])
          .map(([r, c]) => regions[r][c])
          .filter((region) => region >= 0),
      );
      for (const region of shuffle([...adjacent], random)) {
        regions[row][column] = region;
        if (solve(regions, undefined, 2).length === 1) {
          grew = true;
          break;
        }
        regions[row][column] = -1;
      }
      if (grew) break;
    }
    if (!grew) return null;
  }
  return regions;
}

/**
 * Builds the puzzle for a size and seed. The same pair always produces the same puzzle.
 *
 * @param {number} size
 * @param {string} seed
 * @returns {Puzzle | null} `null` when every attempt fails
 */
export function generatePuzzle(size, seed) {
  const random = createRandom(seed);
  for (let attempt = 0; attempt < PUZZLE_ATTEMPTS; attempt++) {
    const solution = generateSolution(size, random);
    const regions = solution && growRegions(size, solution, random);
    if (!regions) continue;
    const solutions = solve(regions, undefined, 2);
    if (solutions.length !== 1) continue;
    // growRegions numbers each region by its solution row, and the number picks the color, so
    // relabel them randomly or every color would give away which row holds its mark.
    const labels = shuffle(
      Array.from({ length: size }, (_, region) => region),
      random,
    );
    return {
      size,
      seed,
      regions: regions.map((row) => row.map((region) => labels[region])),
      solution: solutions[0],
    };
  }
  return null;
}
