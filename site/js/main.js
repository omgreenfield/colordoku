/**
 * Colordoku controller: owns the puzzle, board state, attempt, undo history, settings, and record,
 * and routes clicks and hotkeys through one action table.
 */
import {
  LIVES_CHOICES,
  applyHint,
  checkMessage,
  effectiveState,
  getStatus,
  markCell,
  scoreFor,
  startAttempt,
} from './game/attempt.js';
import { clearCrosses, emptyState, sameState, setCrossed } from './game/game.js';
import { generatePuzzle } from './game/generator.js';
import { getHint } from './game/hints.js';
import { UndoHistory } from './game/history.js';
import { randomSeed } from './game/random.js';
import { emptyRecord, parseRecord, puzzleId } from './game/record.js';
import { DEFAULT_SIZE, SIZES, cellKey } from './game/rules.js';
import { Board } from './ui/board.js';
import { requireElement } from './ui/dom.js';
import { renderHint } from './ui/hint-panel.js';
import {
  ariaKeyshortcuts,
  hotkeyLabel,
  isHotkeyId,
  isMacPlatform,
  matchHotkey,
} from './ui/hotkeys.js';
import { renderRecord } from './ui/record-card.js';
import { createSounds } from './ui/sounds.js';
import { renderStatus } from './ui/status.js';
import {
  RECORD_KEY,
  SETTINGS_KEY,
  parseSettings,
  readFinished,
  readStored,
  saveFinished,
  saveResult,
  writeStored,
} from './ui/storage.js';
import { showToast } from './ui/toast.js';
import { puzzleSearch, readPuzzleParams, sharePuzzle } from './ui/url.js';

/**
 * @typedef {import('./game/attempt.js').MoveEvent} MoveEvent
 * @typedef {import('./game/attempt.js').MoveResult} MoveResult
 * @typedef {import('./game/rules.js').BoardState} BoardState
 * @typedef {import('./game/rules.js').Cell} Cell
 * @typedef {import('./game/rules.js').Puzzle} Puzzle
 * @typedef {import('./game/hints.js').Hint} Hint
 * @typedef {import('./game/hints.js').HintType} HintType
 * @typedef {import('./ui/hotkeys.js').HotkeyId} HotkeyId
 * @typedef {import('./ui/sounds.js').SoundName} SoundName
 */

/** Gives the spinner a frame to paint before generation blocks the main thread. */
const GENERATE_DELAY_MS = 30;
const GAME_OVER_TOAST = 'The game is over. Try again or start a new game.';

/** @type {Partial<Record<MoveEvent, SoundName>>} */
const MOVE_SOUNDS = {
  placed: 'mark',
  removed: 'unmark',
  mistake: 'wrong',
  won: 'win',
  lost: 'lose',
  crossed: 'cross',
};

const sizeSelect = requireElement('#size', HTMLSelectElement);
const livesSelect = requireElement('#lives', HTMLSelectElement);
const loading = requireElement('#loading', HTMLElement);
const caption = requireElement('#puzzle-caption', HTMLElement);
const undoButton = requireElement('#undo', HTMLButtonElement);
const redoButton = requireElement('#redo', HTMLButtonElement);
const restartLabel = requireElement('#restart-label', HTMLElement);
const clearButton = requireElement('#clear-crosses', HTMLButtonElement);
const soundLabel = requireElement('#sound-label', HTMLElement);
const modeButtons = /** @type {NodeListOf<HTMLButtonElement>} */ (
  document.querySelectorAll('.mode-button')
);

const settings = parseSettings(readStored(SETTINGS_KEY));
let record = parseRecord(readStored(RECORD_KEY));
const sounds = createSounds({ muted: settings.muted });
/** Puzzles finished in this tab, so replays stay practice even when storage is blocked. */
const finishedHere = new Set();

/** @type {Puzzle | null} */
let puzzle = null;
/** @type {BoardState} */
let state = emptyState();
let attempt = startAttempt(settings.lives);
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
    if (attempt.outcome !== 'playing') return;
    if (mode === 'mark') markAt(cell);
    else if (double) markFromDoublePress(cell);
    else startStroke(cell);
  },
  onPressMove: continueStroke,
  onPressEnd: endStroke,
  onMarkRequest: markAt,
  onCrossRequest: crossCell,
});

/** Redraws everything that depends on the board state or attempt. */
function refresh() {
  if (!puzzle) return;
  const locked = attempt.outcome !== 'playing';
  const hintTargets = new Set(pendingHint?.targets.map(([row, column]) => cellKey(row, column)));
  const revealed = new Set(
    attempt.outcome === 'lost'
      ? puzzle.solution
          .map((column, row) => cellKey(row, column))
          .filter((key) => !state.marked.has(key))
      : [],
  );
  board.update(state, { hintTargets, mistakes: attempt.mistakes, revealed, locked });
  renderStatus(getStatus(puzzle, state, attempt), {
    left: attempt.livesLeft,
    start: attempt.livesStart,
  });
  undoButton.disabled = locked || !moves.canUndo;
  redoButton.disabled = locked || !moves.canRedo;
  clearButton.disabled = locked || state.crossed.size === 0;
  restartLabel.textContent = locked ? 'Try again' : 'Restart';
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

/**
 * Crosses or clears one cell during a drag or key press, with a tick when it changes.
 *
 * @param {Cell} cell
 * @param {boolean} crossing
 */
function crossOne(cell, crossing) {
  const next = setCrossed(state, [cell], crossing, attempt.mistakes);
  if (!sameState(next, state)) sounds.play(crossing ? 'cross' : 'uncross');
  state = next;
}

/** @param {Cell} cell */
function startStroke(cell) {
  const key = cellKey(...cell);
  stroke = { before: state, crossing: !state.crossed.has(key), key, single: true };
  crossOne(cell, stroke.crossing);
  refresh();
}

/** @param {Cell} cell */
function continueStroke(cell) {
  if (!stroke) return;
  stroke.single = false;
  crossOne(cell, stroke.crossing);
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
function crossCell(cell) {
  if (attempt.outcome !== 'playing') return;
  const before = state;
  crossOne(cell, !state.crossed.has(cellKey(...cell)));
  commit(state, before);
}

/**
 * Applies a mark or hint result: the board change becomes one undo step, and the attempt, sounds,
 * toasts, and record follow the event.
 *
 * @param {MoveResult} result
 * @param {BoardState} [before]
 */
function handleMove({ board: next, attempt: nextAttempt, event }, before = state) {
  attempt = nextAttempt;
  const sound = MOVE_SOUNDS[event];
  if (sound) sounds.play(sound);
  if (event === 'mistake') {
    const left = attempt.livesLeft;
    showToast(`Wrong square. ${left} ${left === 1 ? 'life' : 'lives'} left.`);
  }
  if (event === 'won' || event === 'lost') finishAttempt(event === 'won');
  commit(next, before);
}

/** @param {Cell} cell */
function markAt(cell) {
  if (!puzzle || attempt.outcome !== 'playing') return;
  cancelStroke();
  handleMove(markCell(puzzle, state, attempt, cell));
}

/**
 * Marks a cell for a double press, folding the first press's cross-off into the same undo step.
 *
 * @param {Cell} cell
 */
function markFromDoublePress(cell) {
  if (!puzzle) return;
  const folds = lastPress !== null && lastPress.key === cellKey(...cell) && lastPress.recorded;
  const before = (folds && moves.discardLast()) || state;
  handleMove(markCell(puzzle, before, attempt, cell), before);
}

/**
 * Records a finished attempt and tells the player.
 *
 * @param {boolean} won
 */
function finishAttempt(won) {
  if (!puzzle) return;
  pendingHint = null;
  renderHint(null);
  // Another tab may have finished this puzzle since this try began, so check again.
  if (seenSolution(puzzle)) attempt = { ...attempt, practice: true };
  finishedHere.add(puzzleId(puzzle));
  saveFinished(puzzleId(puzzle));
  if (attempt.practice) {
    showToast(won ? 'Solved again. Replays don’t score.' : 'Out of lives. The solution is shown.');
    return;
  }
  const score = won ? scoreFor(puzzle.size, attempt.livesLeft, attempt.livesStart) : 0;
  record = saveResult({ won, score });
  renderRecord(record);
  showToast(won ? `Solved! +${score} points.` : 'Out of lives. The solution is shown.');
}

/** @param {HintType} type */
function requestHint(type) {
  if (!puzzle) return;
  if (attempt.outcome !== 'playing') {
    showToast(GAME_OVER_TOAST);
    return;
  }
  const result = getHint(puzzle, effectiveState(state, attempt), type);
  if ('message' in result) {
    showToast(result.message);
    return;
  }
  sounds.play('hint');
  showHint(result.hint);
}

/** @param {Hint | null} hint */
function showHint(hint) {
  pendingHint = hint;
  renderHint(hint);
  refresh();
}

function applyPendingHint() {
  if (!puzzle || !pendingHint) return;
  cancelStroke();
  const hint = pendingHint;
  pendingHint = null;
  renderHint(null);
  handleMove(applyHint(puzzle, state, attempt, hint));
}

/**
 * Shows a state reached through undo or redo.
 *
 * @param {BoardState} next
 * @param {SoundName} sound
 */
function restore(next, sound) {
  state = next;
  lastPress = null;
  sounds.play(sound);
  showHint(null);
}

function undo() {
  if (attempt.outcome !== 'playing') return;
  cancelStroke();
  const previous = moves.undo(state);
  if (previous) restore(previous, 'undo');
}

function redo() {
  if (attempt.outcome !== 'playing') return;
  cancelStroke();
  const next = moves.redo(state);
  if (next) restore(next, 'redo');
}

/**
 * Whether the player has already seen this puzzle's solution by winning or losing it, in this tab
 * or any other.
 *
 * @param {Puzzle} shown
 * @returns {boolean}
 */
function seenSolution(shown) {
  const id = puzzleId(shown);
  return finishedHere.has(id) || readFinished().includes(id);
}

/**
 * Starts a fresh attempt at the current puzzle with the current Lives setting. A puzzle already
 * finished replays as practice, so seeing the solution can't earn a free win.
 */
function beginAttempt() {
  attempt = startAttempt(settings.lives, puzzle !== null && seenSolution(puzzle));
  if (puzzle) {
    const { seed, size } = puzzle;
    caption.textContent = `Puzzle ${seed} · ${size}×${size}${attempt.practice ? ' · Practice' : ''}`;
  }
  state = emptyState();
  moves.clear();
  stroke = null;
  lastPress = null;
  showHint(null);
}

/** Clears the board while playing, or starts over with full lives once the game is over. */
function restart() {
  if (!puzzle) return;
  cancelStroke();
  if (attempt.outcome !== 'playing') {
    beginAttempt();
    sounds.play('newGame');
    return;
  }
  pendingHint = null;
  renderHint(null);
  if (commit(emptyState())) sounds.play('undo');
}

/** Clears every cross-off as one undo step, keeping marks and mistakes. */
function clearCrossOffs() {
  if (!puzzle || attempt.outcome !== 'playing') return;
  cancelStroke();
  if (state.crossed.size === 0) {
    refresh();
    return;
  }
  pendingHint = null;
  renderHint(null);
  commit(clearCrosses(state));
  sounds.play('undo');
}

/**
 * Generates and shows a puzzle, and puts its size and seed in the address bar.
 *
 * @param {number} size
 * @param {string} seed
 * @param {{ retry?: boolean, announce?: boolean }} [options] `retry` falls back to a random seed if
 *   this one fails; `announce` plays the new-game sound
 */
function startGame(size, seed, { retry = true, announce = false } = {}) {
  loading.classList.add('show');
  setTimeout(() => {
    const next = generatePuzzle(size, seed);
    loading.classList.remove('show');
    if (!next) {
      if (retry) {
        showToast('Generator got a hairball. Here’s a fresh puzzle instead.');
        startGame(size, randomSeed(), { retry: false, announce });
      } else showToast('Generator got a hairball. Try again.');
      return;
    }
    puzzle = next;
    sizeSelect.value = String(size);
    window.history.replaceState(null, '', puzzleSearch(size, seed));
    board.setPuzzle(next);
    beginAttempt();
    if (announce) sounds.play('newGame');
  }, GENERATE_DELAY_MS);
}

/**
 * Selects the next choice in a select, wrapping around.
 *
 * @param {HTMLSelectElement} select
 * @param {number[]} choices
 * @returns {number} The new value
 */
function cycleSelect(select, choices) {
  const next = choices[(choices.indexOf(Number(select.value)) + 1) % choices.length];
  select.value = String(next);
  select.dispatchEvent(new Event('change'));
  return next;
}

/** @param {'cross' | 'mark'} next */
function setMode(next) {
  mode = next;
  modeButtons.forEach((button) =>
    button.setAttribute('aria-pressed', String(button.dataset.mode === next)),
  );
}

/** Shows whether sound is on in the sound button's label. */
function renderSoundButton() {
  soundLabel.textContent = sounds.muted ? 'Sound off' : 'Sound on';
}

/** Turns sound on or off, remembers the choice, and plays a tick when sound comes on. */
function toggleSound() {
  sounds.setMuted(!sounds.muted);
  settings.muted = sounds.muted;
  writeStored(SETTINGS_KEY, settings);
  renderSoundButton();
  sounds.play('cross');
}

/** Shares the puzzle link, or copies it when the browser can't share. */
async function share() {
  if (!puzzle) return;
  const message = await sharePuzzle(window.location.href, puzzle.size);
  if (message) showToast(message);
}

/** @type {Record<HotkeyId, () => void>} */
const ACTIONS = {
  newGame: () => startGame(Number(sizeSelect.value), randomSeed(), { announce: true }),
  cycleSize: () => {
    const size = cycleSelect(sizeSelect, SIZES);
    showToast(`Next game: ${size}×${size}.`);
  },
  cycleLives: () => {
    const lives = cycleSelect(livesSelect, LIVES_CHOICES);
    showToast(`Next game: ${lives} ${lives === 1 ? 'life' : 'lives'}.`);
  },
  crossMode: () => setMode('cross'),
  markMode: () => setMode('mark'),
  undo,
  redo,
  restart,
  clearCrosses: clearCrossOffs,
  check: () => {
    if (puzzle) showToast(checkMessage(puzzle, state, attempt));
  },
  share: () => void share(),
  hintMark: () => requestHint('mark'),
  hintCross: () => requestHint('cross'),
  hintReason: () => requestHint('reason'),
  applyHint: applyPendingHint,
  dismissHint: () => showHint(null),
  toggleSound,
};

const isMac = isMacPlatform(navigator);
document.querySelectorAll('[data-hotkey-label]').forEach((chip) => {
  const id = chip instanceof HTMLElement ? chip.dataset.hotkeyLabel : undefined;
  if (isHotkeyId(id)) chip.textContent = hotkeyLabel(id, isMac);
});
document.querySelectorAll('[data-hotkey]').forEach((control) => {
  const id = control instanceof HTMLElement ? control.dataset.hotkey : undefined;
  if (!isHotkeyId(id)) return;
  control.setAttribute('aria-keyshortcuts', ariaKeyshortcuts(id));
  if (control instanceof HTMLButtonElement) control.addEventListener('click', () => ACTIONS[id]());
});

document.addEventListener('keydown', (event) => {
  const id = matchHotkey(event);
  if (!id) return;
  if ((id === 'applyHint' || id === 'dismissHint') && !pendingHint) return;
  event.preventDefault();
  if (event.repeat && id !== 'undo' && id !== 'redo') return;
  ACTIONS[id]();
});

livesSelect.value = String(settings.lives);
livesSelect.addEventListener('change', () => {
  settings.lives = Number(livesSelect.value);
  writeStored(SETTINGS_KEY, settings);
});
requireElement('#reset-record', HTMLButtonElement).addEventListener('click', () => {
  if (!confirm('Reset your wins, losses, and scores in this browser?')) return;
  record = emptyRecord();
  writeStored(RECORD_KEY, record);
  renderRecord(record);
});

// Board sounds play on pointerdown, which Safari doesn't count as a gesture for touch, so wake the
// audio on the gestures it does count.
for (const type of ['pointerup', 'touchend', 'keydown']) {
  document.addEventListener(type, () => sounds.unlock(), { capture: true });
}

// Another tab saved a result or changed a setting: show it here too, so this tab never saves stale
// settings over it. A null key means storage was cleared.
window.addEventListener('storage', (event) => {
  if (event.key === null || event.key === RECORD_KEY) {
    record = parseRecord(readStored(RECORD_KEY));
    renderRecord(record);
  }
  if (event.key === null || event.key === SETTINGS_KEY) {
    Object.assign(settings, parseSettings(readStored(SETTINGS_KEY)));
    livesSelect.value = String(settings.lives);
    sounds.setMuted(settings.muted);
    renderSoundButton();
  }
});

renderRecord(record);
renderSoundButton();
const params = readPuzzleParams(window.location.search);
startGame(params.size ?? DEFAULT_SIZE, params.seed ?? randomSeed());
