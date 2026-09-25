import { cellKey, conflictingMarks } from './rules.js';
import { solve } from './solver.js';

/**
 * @typedef {import('./rules.js').BoardState} BoardState
 * @typedef {import('./rules.js').Cell} Cell
 * @typedef {import('./rules.js').Puzzle} Puzzle
 * @typedef {{ kind: 'ready' | 'progress' | 'impossible' | 'solved', title: string, text: string }} Status
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
 * Crosses off or clears cells, leaving marked cells alone.
 *
 * @param {BoardState} state
 * @param {Cell[]} cells
 * @param {boolean} crossed
 * @returns {BoardState}
 */
export function setCrossed(state, cells, crossed) {
  const next = cloneState(state);
  for (const [row, column] of cells) {
    const key = cellKey(row, column);
    if (next.marked.has(key)) continue;
    if (crossed) next.crossed.add(key);
    else next.crossed.delete(key);
  }
  return next;
}

/**
 * Removes the mark on a cell, or places one there when the rules allow it.
 *
 * @param {Puzzle} puzzle
 * @param {BoardState} state
 * @param {Cell} cell
 * @returns {{ state: BoardState } | { message: string }}
 */
export function toggleMark(puzzle, state, cell) {
  const key = cellKey(...cell);
  const next = cloneState(state);
  if (next.marked.delete(key)) return { state: next };
  next.crossed.delete(key);
  next.marked.add(key);
  if (conflictingMarks(puzzle.regions, next.marked).size > 0) {
    return { message: 'That mark conflicts with another mark.' };
  }
  if (solve(puzzle.regions, next, 1).length === 0) {
    return { message: 'Invalid mark: it leaves no possible solution.' };
  }
  return { state: next };
}

/**
 * Summarizes progress for the status card.
 *
 * @param {Puzzle} puzzle
 * @param {BoardState} state
 * @returns {Status}
 */
export function getStatus(puzzle, state) {
  if (isEmpty(state)) {
    return {
      kind: 'ready',
      title: 'Ready',
      text: 'Cross off impossible squares, then place marks.',
    };
  }
  if (solve(puzzle.regions, state, 1).length === 0) {
    return {
      kind: 'impossible',
      title: 'No solution',
      text: 'One or more cross-offs made this state impossible. Undo them.',
    };
  }
  if (state.marked.size === puzzle.size) {
    return {
      kind: 'solved',
      title: 'Solved!',
      text: 'Every row, column, and color has exactly one mark.',
    };
  }
  const crossed = state.crossed.size;
  return {
    kind: 'progress',
    title: `${state.marked.size} of ${puzzle.size} marks placed`,
    text: `${crossed} ${crossed === 1 ? 'square' : 'squares'} crossed off.`,
  };
}

/**
 * Toast text for the Check button.
 *
 * @param {Puzzle} puzzle
 * @param {BoardState} state
 * @returns {string}
 */
export function checkMessage(puzzle, state) {
  const { kind } = getStatus(puzzle, state);
  if (kind === 'solved') return 'Solved! Every row, column, and color has exactly one mark.';
  if (kind === 'impossible') return 'Something’s off: the current cross-offs leave no solution.';
  return 'No mistakes so far.';
}
