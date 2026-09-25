import { REGION_NAMES, cellKey, marksConflict, parseKey } from './rules.js';
import { solve } from './solver.js';

/**
 * @typedef {import('./rules.js').BoardState} BoardState
 * @typedef {import('./rules.js').Cell} Cell
 * @typedef {import('./rules.js').Puzzle} Puzzle
 * @typedef {{ title: string, text: string, targets: Cell[], action: 'mark' | 'cross' }} Hint
 * @typedef {'mark' | 'cross' | 'reason'} HintType
 */

const MAX_CROSS_TARGETS = 3;
const MAX_BLOCKED_TARGETS = 12;
const MAX_REGION_SET = 4;

/**
 * Finds a hint of the requested type for the current board.
 *
 * @param {Puzzle} puzzle
 * @param {BoardState} state
 * @param {HintType} type
 * @returns {{ hint: Hint } | { message: string }}
 */
export function getHint(puzzle, state, type) {
  const [solution] = solve(puzzle.regions, state, 1);
  if (!solution) return { message: 'Current cross-offs leave no solution. Undo at least one.' };
  if (type === 'mark') return markHint(state, solution);
  if (type === 'cross') return crossHint(puzzle, state, solution);
  const hint = reasonHint(puzzle, state);
  return hint ? { hint } : { message: 'No new logical cross-off found. Try a mark hint.' };
}

/**
 * @param {BoardState} state
 * @param {number[]} solution
 * @returns {{ hint: Hint } | { message: string }}
 */
function markHint(state, solution) {
  const row = solution.findIndex((column, index) => !state.marked.has(cellKey(index, column)));
  if (row < 0) return { message: 'Every mark already placed.' };
  return {
    hint: {
      title: 'Guaranteed mark',
      text: `Every valid completion puts a mark at row ${row + 1}, column ${solution[row] + 1}.`,
      targets: [[row, solution[row]]],
      action: 'mark',
    },
  };
}

/**
 * @param {Puzzle} puzzle
 * @param {BoardState} state
 * @param {number[]} solution
 * @returns {{ hint: Hint } | { message: string }}
 */
function crossHint(puzzle, state, solution) {
  const targets = openCells(puzzle, state)
    .filter(([row, column]) => solution[row] !== column)
    .slice(0, MAX_CROSS_TARGETS);
  if (targets.length === 0) return { message: 'No safe cross-offs found.' };
  const count = targets.length;
  return {
    hint: {
      title: 'Safe cross-offs',
      text: `${count} ${count === 1 ? 'square is' : 'squares are'} impossible in every valid completion.`,
      targets,
      action: 'cross',
    },
  };
}

/**
 * Cells that are neither crossed off nor marked, in reading order.
 *
 * @param {Puzzle} puzzle
 * @param {BoardState} state
 * @returns {Cell[]}
 */
function openCells(puzzle, state) {
  /** @type {Cell[]} */
  const cells = [];
  for (let row = 0; row < puzzle.size; row++) {
    for (let column = 0; column < puzzle.size; column++) {
      const key = cellKey(row, column);
      if (!state.crossed.has(key) && !state.marked.has(key)) cells.push([row, column]);
    }
  }
  return cells;
}

/**
 * Every way to choose `count` values, keeping their order.
 *
 * @template T
 * @param {T[]} values
 * @param {number} count
 * @returns {T[][]}
 */
function combinations(values, count) {
  if (count === 0) return [[]];
  return values.flatMap((value, index) =>
    combinations(values.slice(index + 1), count - 1).map((rest) => [value, ...rest]),
  );
}

/**
 * Explains one deduction that crosses off squares, trying the simplest kind first.
 *
 * @param {Puzzle} puzzle
 * @param {BoardState} state
 * @returns {Hint | null}
 */
function reasonHint(puzzle, state) {
  const open = openCells(puzzle, state);
  const marks = [...state.marked].map(parseKey);
  return (
    blockedByMark(puzzle, open, marks) ??
    // Nothing open conflicts with a mark past this point, so every open cell is still a candidate.
    confinedRegions(puzzle, open, marks) ??
    contradiction(puzzle, state, open)
  );
}

/**
 * Open squares an existing mark already rules out.
 *
 * @param {Puzzle} puzzle
 * @param {Cell[]} open
 * @param {Cell[]} marks
 * @returns {Hint | null}
 */
function blockedByMark(puzzle, open, marks) {
  for (const mark of marks) {
    const targets = open.filter((cell) => marksConflict(puzzle.regions, mark, cell));
    if (targets.length === 0) continue;
    const [row, column] = mark;
    return {
      title: 'Logical next step',
      text: `The mark at row ${row + 1}, column ${column + 1} rules out the rest of its row and column, the other ${REGION_NAMES[puzzle.regions[row][column]]} squares, and every square touching it.`,
      targets: targets.slice(0, MAX_BLOCKED_TARGETS),
      action: 'cross',
    };
  }
  return null;
}

/**
 * Colors still needing a mark whose open squares fit in exactly as many rows (or columns) as there
 * are colors: those lines belong to them, so every other color's squares there are impossible.
 *
 * @param {Puzzle} puzzle
 * @param {Cell[]} open
 * @param {Cell[]} marks
 * @returns {Hint | null}
 */
function confinedRegions(puzzle, open, marks) {
  const { size, regions } = puzzle;
  const markedRegions = new Set(marks.map(([row, column]) => regions[row][column]));
  const unmarked = Array.from({ length: size }, (_, region) => region).filter(
    (region) => !markedRegions.has(region),
  );
  for (let count = 1; count <= Math.min(MAX_REGION_SET, size - 1); count++) {
    for (const regionSet of combinations(unmarked, count)) {
      const inSet = open.filter(([row, column]) => regionSet.includes(regions[row][column]));
      for (const axis of [0, 1]) {
        const lines = [...new Set(inSet.map((cell) => cell[axis]))].sort((a, b) => a - b);
        if (lines.length !== count) continue;
        const targets = open.filter(
          (cell) => lines.includes(cell[axis]) && !regionSet.includes(regions[cell[0]][cell[1]]),
        );
        if (targets.length > 0) {
          return {
            title: 'Logical next step',
            text: confinedText(regionSet, lines, axis === 0 ? 'row' : 'column'),
            targets,
            action: 'cross',
          };
        }
      }
    }
  }
  return null;
}

/**
 * Explains a confined-regions deduction in words.
 *
 * @param {number[]} regionSet
 * @param {number[]} lines Zero-based row or column indexes
 * @param {'row' | 'column'} noun
 * @returns {string}
 */
function confinedText(regionSet, lines, noun) {
  const list = new Intl.ListFormat('en', { type: 'conjunction' });
  const colors = list.format(regionSet.map((region) => REGION_NAMES[region]));
  const subject = colors[0].toUpperCase() + colors.slice(1);
  if (lines.length === 1) {
    return `${subject} can only go in ${noun} ${lines[0] + 1}, so no other color can use that ${noun}.`;
  }
  const numbers = list.format(lines.map((line) => String(line + 1)));
  return `${subject} must fill ${noun}s ${numbers}, so no other color can use those ${noun}s.`;
}

/**
 * The first open square whose mark would leave no solution.
 *
 * @param {Puzzle} puzzle
 * @param {BoardState} state
 * @param {Cell[]} open
 * @returns {Hint | null}
 */
function contradiction(puzzle, state, open) {
  for (const [row, column] of open) {
    const marked = new Set(state.marked).add(cellKey(row, column));
    if (solve(puzzle.regions, { crossed: state.crossed, marked }, 1).length > 0) continue;
    return {
      title: 'Logical next step',
      text: `If row ${row + 1}, column ${column + 1} held a mark, no solution would remain, so it can be crossed off.`,
      targets: [[row, column]],
      action: 'cross',
    };
  }
  return null;
}
