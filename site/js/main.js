/**
 * Colordoku controller: owns the puzzle, board state, undo history, and input mode, and wires up the page.
 */
import {
  checkMessage,
  emptyState,
  getStatus,
  sameState,
  setCrossed,
  toggleMark,
} from './game/game.js';
import { generatePuzzle } from './game/generator.js';
import { applyHint, getHint } from './game/hints.js';
import { UndoHistory } from './game/history.js';
import { randomSeed } from './game/random.js';
import { DEFAULT_SIZE, cellKey, conflictingMarks } from './game/rules.js';
import { Board } from './ui/board.js';
import { requireElement } from './ui/dom.js';
import { renderHint } from './ui/hint-panel.js';
import { renderStatus } from './ui/status.js';
import { showToast } from './ui/toast.js';
import { puzzleSearch, readPuzzleParams, sharePuzzle } from './ui/url.js';

/**
 * @typedef {import('./game/rules.js').BoardState} BoardState
 * @typedef {import('./game/rules.js').Cell} Cell
 * @typedef {import('./game/rules.js').Puzzle} Puzzle
 * @typedef {import('./game/hints.js').Hint} Hint
 * @typedef {import('./game/hints.js').HintType} HintType
 */

/** Gives the spinner a frame to paint before generation blocks the main thread. */
const GENERATE_DELAY_MS = 30;

const sizeSelect = requireElement('#size', HTMLSelectElement);
const loading = requireElement('#loading', HTMLElement);
const caption = requireElement('#puzzle-caption', HTMLElement);
const undoButton = requireElement('#undo', HTMLButtonElement);
const redoButton = requireElement('#redo', HTMLButtonElement);
const modeButtons = /** @type {NodeListOf<HTMLButtonElement>} */ (
  document.querySelectorAll('.mode-button')
);
const hintButtons = /** @type {NodeListOf<HTMLButtonElement>} */ (
  document.querySelectorAll('.hint-button')
);

/** @type {Puzzle | null} */
let puzzle = null;
/** @type {BoardState} */
let state = emptyState();
const moves = new UndoHistory();
/** @type {'cross' | 'mark'} */
let mode = 'cross';
/** @type {Hint | null} */
let pendingHint = null;
/**
 * The cross-off drag in progress: the state before it, whether it adds or clears crosses, and its first cell.
 *
 * @type {{ before: BoardState, crossing: boolean, key: string, single: boolean } | null}
 */
let stroke = null;
/**
 * The last single-cell press, so a double press can fold it into one undo step.
 *
 * @type {{ key: string, recorded: boolean } | null}
 */
let lastPress = null;

const board = new Board(requireElement('#board', HTMLElement), {
  onPressStart(cell, double) {
    if (mode === 'mark') markCell(cell);
    else if (double) markFromDoublePress(cell);
    else startStroke(cell);
  },
  onPressMove: continueStroke,
  onPressEnd: endStroke,
  onMarkRequest: markCell,
  onCrossRequest: crossCell,
});

/** Redraws everything that depends on the board state. */
function refresh() {
  if (!puzzle) return;
  const hintTargets = new Set(pendingHint?.targets.map(([row, column]) => cellKey(row, column)));
  board.update(state, { conflicts: conflictingMarks(puzzle.regions, state.marked), hintTargets });
  renderStatus(getStatus(puzzle, state));
  undoButton.disabled = !moves.canUndo;
  redoButton.disabled = !moves.canRedo;
}

/**
 * Moves to `next` as one undoable step. A change that leaves the board as it was records nothing.
 *
 * @param {BoardState} next
 * @param {BoardState} [before] The state undo returns to, when it isn't the current one
 * @returns {boolean} Whether a step was recorded
 */
function commit(next, before = state) {
  const changed = !sameState(before, next);
  if (changed) moves.record(before);
  state = next;
  lastPress = null;
  refresh();
  return changed;
}

/** @param {Cell} cell */
function startStroke(cell) {
  const key = cellKey(...cell);
  stroke = { before: state, crossing: !state.crossed.has(key), key, single: true };
  state = setCrossed(state, [cell], stroke.crossing);
  refresh();
}

/** @param {Cell} cell */
function continueStroke(cell) {
  if (!stroke) return;
  stroke.single = false;
  state = setCrossed(state, [cell], stroke.crossing);
  refresh();
}

function endStroke() {
  if (!stroke) return;
  const { before, key, single } = stroke;
  stroke = null;
  const recorded = commit(state, before);
  if (single) lastPress = { key, recorded };
}

/** Drops a drag in progress and puts the board back how it was before the drag. */
function cancelStroke() {
  if (!stroke) return;
  state = stroke.before;
  stroke = null;
}

/** @param {Cell} cell */
function markCell(cell) {
  if (!puzzle) return;
  cancelStroke();
  const result = toggleMark(puzzle, state, cell);
  if ('message' in result) {
    showToast(result.message);
    refresh();
  } else commit(result.state);
}

/**
 * Toggles a mark for a double press, folding the first press's cross-off into the same undo step.
 *
 * @param {Cell} cell
 */
function markFromDoublePress(cell) {
  if (!puzzle) return;
  const folds = lastPress !== null && lastPress.key === cellKey(...cell) && lastPress.recorded;
  const before = (folds && moves.discardLast()) || state;
  const result = toggleMark(puzzle, before, cell);
  if ('state' in result) {
    commit(result.state, before);
    return;
  }
  showToast(result.message);
  state = before;
  lastPress = null;
  refresh();
}

/** @param {Cell} cell */
function crossCell(cell) {
  commit(setCrossed(state, [cell], !state.crossed.has(cellKey(...cell))));
}

/** @param {HintType} type */
function requestHint(type) {
  if (!puzzle) return;
  const result = getHint(puzzle, state, type);
  if ('message' in result) showToast(result.message);
  else showHint(result.hint);
}

/** @param {Hint | null} hint */
function showHint(hint) {
  pendingHint = hint;
  renderHint(hint);
  refresh();
}

function applyPendingHint() {
  if (!puzzle || !pendingHint) return;
  const result = applyHint(puzzle, state, pendingHint);
  pendingHint = null;
  renderHint(null);
  if ('message' in result) {
    showToast(result.message);
    refresh();
  } else commit(result.state);
}

/**
 * Shows a state reached through undo or redo.
 *
 * @param {BoardState} next
 */
function restore(next) {
  state = next;
  lastPress = null;
  showHint(null);
}

function undo() {
  cancelStroke();
  const previous = moves.undo(state);
  if (previous) restore(previous);
}

function redo() {
  cancelStroke();
  const next = moves.redo(state);
  if (next) restore(next);
}

function restart() {
  cancelStroke();
  pendingHint = null;
  renderHint(null);
  commit(emptyState());
}

/**
 * Generates and shows a puzzle, and puts its size and seed in the address bar.
 *
 * @param {number} size
 * @param {string} seed
 * @param {boolean} [retry] Whether to fall back to a random seed if this one fails
 */
function startGame(size, seed, retry = true) {
  loading.classList.add('show');
  setTimeout(() => {
    const next = generatePuzzle(size, seed);
    loading.classList.remove('show');
    if (!next) {
      if (retry) {
        showToast('Generator got a hairball. Here’s a fresh puzzle instead.');
        startGame(size, randomSeed(), false);
      } else showToast('Generator got a hairball. Try again.');
      return;
    }
    puzzle = next;
    state = emptyState();
    moves.clear();
    stroke = null;
    lastPress = null;
    sizeSelect.value = String(size);
    caption.textContent = `Puzzle ${seed} · ${size}×${size}`;
    window.history.replaceState(null, '', puzzleSearch(size, seed));
    board.setPuzzle(next);
    showHint(null);
  }, GENERATE_DELAY_MS);
}

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    mode = button.dataset.mode === 'mark' ? 'mark' : 'cross';
    modeButtons.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
  });
});

hintButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const type = button.dataset.hint;
    if (type === 'mark' || type === 'cross' || type === 'reason') requestHint(type);
  });
});

requireElement('#new-game', HTMLButtonElement).addEventListener('click', () =>
  startGame(Number(sizeSelect.value), randomSeed()),
);
requireElement('#restart', HTMLButtonElement).addEventListener('click', restart);
requireElement('#check', HTMLButtonElement).addEventListener('click', () => {
  if (puzzle) showToast(checkMessage(puzzle, state));
});
requireElement('#share', HTMLButtonElement).addEventListener('click', async () => {
  if (!puzzle) return;
  const message = await sharePuzzle(window.location.href, puzzle.size);
  if (message) showToast(message);
});
requireElement('#apply-hint', HTMLButtonElement).addEventListener('click', applyPendingHint);
requireElement('#dismiss-hint', HTMLButtonElement).addEventListener('click', () => showHint(null));
undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);

document.addEventListener('keydown', (event) => {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === 'z' && !event.shiftKey) undo();
  else if ((key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey)) redo();
  else return;
  event.preventDefault();
});

const params = readPuzzleParams(window.location.search);
startGame(params.size ?? DEFAULT_SIZE, params.seed ?? randomSeed());
