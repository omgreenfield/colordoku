import { cloneState, isEmpty, setCrossed } from './game.js';
import { cellKey } from './rules.js';
import { solve } from './solver.js';

/**
 * One try at one puzzle: lives, mistakes, and outcome. It lives outside the undo history, so undo
 * and Restart can never give a life back.
 *
 * @typedef {import('./rules.js').BoardState} BoardState
 * @typedef {import('./rules.js').Cell} Cell
 * @typedef {import('./rules.js').Puzzle} Puzzle
 * @typedef {import('./hints.js').Hint} Hint
 * @typedef {{ livesStart: number, livesLeft: number, mistakes: Set<string>, outcome: 'playing' | 'won' | 'lost' }} Attempt
 * @typedef {'placed' | 'removed' | 'mistake' | 'won' | 'lost' | 'crossed' | 'ignored'} MoveEvent
 * @typedef {{ board: BoardState, attempt: Attempt, event: MoveEvent }} MoveResult
 * @typedef {{ kind: 'ready' | 'progress' | 'impossible' | 'solved' | 'lost', title: string, text: string }} Status
 */

/** Lives a player can start with. */
export const LIVES_CHOICES = [1, 2, 3, 4, 5];

export const DEFAULT_LIVES = 3;

/**
 * @param {number} lives
 * @returns {Attempt}
 */
export function startAttempt(lives) {
  return { livesStart: lives, livesLeft: lives, mistakes: new Set(), outcome: 'playing' };
}

/**
 * The board as the solver, status, and hints see it: mistakes count as crossed off.
 *
 * @param {BoardState} board
 * @param {Attempt} attempt
 * @returns {BoardState}
 */
export function effectiveState(board, attempt) {
  return {
    crossed: new Set([...board.crossed, ...attempt.mistakes]),
    marked: new Set(board.marked),
  };
}

/**
 * Presses a cell to mark it: removes an existing mark, places a correct one, or spends a life on a
 * wrong one.
 *
 * @param {Puzzle} puzzle
 * @param {BoardState} board
 * @param {Attempt} attempt
 * @param {Cell} cell
 * @returns {MoveResult}
 */
export function markCell(puzzle, board, attempt, cell) {
  const [row, column] = cell;
  const key = cellKey(row, column);
  if (attempt.outcome !== 'playing' || attempt.mistakes.has(key)) {
    return { board, attempt, event: 'ignored' };
  }
  const next = cloneState(board);
  if (next.marked.delete(key)) return { board: next, attempt, event: 'removed' };
  if (puzzle.solution[row] !== column) {
    const livesLeft = attempt.livesLeft - 1;
    const lost = livesLeft === 0;
    return {
      board,
      attempt: {
        ...attempt,
        livesLeft,
        mistakes: new Set(attempt.mistakes).add(key),
        outcome: lost ? 'lost' : 'playing',
      },
      event: lost ? 'lost' : 'mistake',
    };
  }
  next.crossed.delete(key);
  next.marked.add(key);
  // Only correct marks ever reach the board, so a mark in every row is the solution.
  if (next.marked.size < puzzle.size) return { board: next, attempt, event: 'placed' };
  return { board: next, attempt: { ...attempt, outcome: 'won' }, event: 'won' };
}

/**
 * Applies a hint: cross hints cross off their targets, and mark hints press their cell unless it
 * is already marked.
 *
 * @param {Puzzle} puzzle
 * @param {BoardState} board
 * @param {Attempt} attempt
 * @param {Hint} hint
 * @returns {MoveResult}
 */
export function applyHint(puzzle, board, attempt, hint) {
  if (attempt.outcome !== 'playing') return { board, attempt, event: 'ignored' };
  if (hint.action === 'cross') {
    return {
      board: setCrossed(board, hint.targets, true, attempt.mistakes),
      attempt,
      event: 'crossed',
    };
  }
  const [target] = hint.targets;
  if (board.marked.has(cellKey(...target))) return { board, attempt, event: 'ignored' };
  return markCell(puzzle, board, attempt, target);
}

/**
 * Points for a win: bigger boards pay more, and each lost life takes its share away.
 *
 * @param {number} size
 * @param {number} livesLeft
 * @param {number} livesStart
 * @returns {number}
 */
export function scoreFor(size, livesLeft, livesStart) {
  return Math.round((100 * size * livesLeft) / livesStart);
}

/**
 * Summarizes the attempt for the status card.
 *
 * @param {Puzzle} puzzle
 * @param {BoardState} board
 * @param {Attempt} attempt
 * @returns {Status}
 */
export function getStatus(puzzle, board, attempt) {
  const { livesLeft, livesStart, outcome } = attempt;
  if (outcome === 'won') {
    const score = scoreFor(puzzle.size, livesLeft, livesStart);
    return {
      kind: 'solved',
      title: 'Solved!',
      text: `+${score} points with ${livesLeft} of ${livesStart} ${livesStart === 1 ? 'life' : 'lives'} left.`,
    };
  }
  if (outcome === 'lost') {
    return {
      kind: 'lost',
      title: 'Out of lives',
      text: 'The solution is shown. Try again or start a new game.',
    };
  }
  if (isEmpty(board) && attempt.mistakes.size === 0) {
    return {
      kind: 'ready',
      title: 'Ready',
      text: 'Cross off impossible squares, then place marks.',
    };
  }
  if (solve(puzzle.regions, effectiveState(board, attempt), 1).length === 0) {
    return {
      kind: 'impossible',
      title: 'No solution',
      text: 'One or more cross-offs made this state impossible. Undo them.',
    };
  }
  const crossed = board.crossed.size;
  return {
    kind: 'progress',
    title: `${board.marked.size} of ${puzzle.size} marks placed`,
    text: `${crossed} ${crossed === 1 ? 'square' : 'squares'} crossed off.`,
  };
}

/**
 * Toast text for the Check button.
 *
 * @param {Puzzle} puzzle
 * @param {BoardState} board
 * @param {Attempt} attempt
 * @returns {string}
 */
export function checkMessage(puzzle, board, attempt) {
  const { kind } = getStatus(puzzle, board, attempt);
  if (kind === 'solved') return 'Solved! Every row, column, and color has exactly one mark.';
  if (kind === 'lost') return 'Out of lives. Try again or start a new game.';
  if (kind === 'impossible') return 'Something’s off: the current cross-offs leave no solution.';
  return 'Your crosses and marks all fit the solution.';
}
