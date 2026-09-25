import { cellKey, marksConflict, parseKey } from './rules.js';

/**
 * @typedef {import('./rules.js').BoardState} BoardState
 */

/**
 * Finds up to `limit` solutions that agree with the crossed-off and marked cells in `state`.
 * Cells in region `-1` (not yet assigned while the generator grows regions) are unavailable.
 *
 * @param {number[][]} regions
 * @param {BoardState} [state]
 * @param {number} [limit]
 * @returns {number[][]} Each solution lists the marked column for every row
 */
export function solve(regions, state = { crossed: new Set(), marked: new Set() }, limit = 2) {
  const size = regions.length;
  const marks = [...state.marked].map(parseKey);
  /** @type {Map<number, number>} */
  const forcedColumns = new Map();
  for (const [row, column] of marks) {
    if (forcedColumns.has(row) && forcedColumns.get(row) !== column) return [];
    forcedColumns.set(row, column);
  }

  /** @type {number[][]} */
  const solutions = [];
  const placement = Array(size).fill(-1);
  const usedColumns = new Set();
  const usedRegions = new Set();
  const allColumns = Array.from({ length: size }, (_, column) => column);

  /** @param {number} row */
  const visit = (row) => {
    if (solutions.length >= limit) return;
    if (row === size) {
      solutions.push([...placement]);
      return;
    }
    const forced = forcedColumns.get(row);
    for (const column of forced === undefined ? allColumns : [forced]) {
      const region = regions[row][column];
      if (region < 0 || state.crossed.has(cellKey(row, column))) continue;
      if (usedColumns.has(column) || usedRegions.has(region)) continue;
      if (row > 0 && Math.abs(column - placement[row - 1]) <= 1) continue;
      if (marks.some((mark) => mark[0] !== row && marksConflict(regions, mark, [row, column]))) {
        continue;
      }
      placement[row] = column;
      usedColumns.add(column);
      usedRegions.add(region);
      visit(row + 1);
      usedColumns.delete(column);
      usedRegions.delete(region);
      placement[row] = -1;
    }
  };

  visit(0);
  return solutions;
}
