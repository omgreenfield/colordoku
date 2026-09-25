import { cellKey } from './rules.js';

/**
 * @typedef {import('./rules.js').BoardState} BoardState
 * @typedef {import('./rules.js').Cell} Cell
 */

/**
 * A board with nothing crossed off or marked.
 *
 * @returns {BoardState}
 */
export function emptyState() {
  return { crossed: new Set(), marked: new Set() };
}

/**
 * @param {BoardState} state
 * @returns {BoardState}
 */
export function cloneState(state) {
  return { crossed: new Set(state.crossed), marked: new Set(state.marked) };
}

/**
 * @param {BoardState} state
 * @returns {boolean}
 */
export function isEmpty(state) {
  return state.crossed.size === 0 && state.marked.size === 0;
}

/**
 * Whether two states cross off and mark exactly the same cells.
 *
 * @param {BoardState} first
 * @param {BoardState} second
 * @returns {boolean}
 */
export function sameState(first, second) {
  /**
   * @param {Set<string>} one
   * @param {Set<string>} other
   */
  const sameKeys = (one, other) =>
    one.size === other.size && [...one].every((key) => other.has(key));
  return sameKeys(first.crossed, second.crossed) && sameKeys(first.marked, second.marked);
}

/**
 * Crosses off or clears cells, leaving marked cells and any cells in `skip` alone.
 *
 * @param {BoardState} state
 * @param {Cell[]} cells
 * @param {boolean} crossed
 * @param {ReadonlySet<string>} [skip] Cells to leave untouched, such as mistakes
 * @returns {BoardState}
 */
export function setCrossed(state, cells, crossed, skip = new Set()) {
  const next = cloneState(state);
  for (const [row, column] of cells) {
    const key = cellKey(row, column);
    if (next.marked.has(key) || skip.has(key)) continue;
    if (crossed) next.crossed.add(key);
    else next.crossed.delete(key);
  }
  return next;
}
