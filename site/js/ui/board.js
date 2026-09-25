import { REGION_NAMES, cellKey, cellsBetween, parseKey } from '../game/rules.js';

/**
 * @typedef {import('../game/rules.js').BoardState} BoardState
 * @typedef {import('../game/rules.js').Cell} Cell
 * @typedef {import('../game/rules.js').Puzzle} Puzzle
 */

/**
 * Callbacks the board uses to report input. The controller decides what each one means.
 *
 * @typedef {object} BoardHandlers
 * @property {(cell: Cell, double: boolean) => void} onPressStart A press began; `double` when it repeats the last tap on the same cell
 * @property {(cell: Cell) => void} onPressMove The pressed pointer moved onto another cell
 * @property {() => void} onPressEnd The press was released or cancelled
 * @property {(cell: Cell) => void} onMarkRequest Right-click, Enter, or M
 * @property {(cell: Cell) => void} onCrossRequest Space or X
 */

const DOUBLE_PRESS_MS = 350;

/**
 * The puzzle grid. Draws the cells and turns pointer and keyboard input into handler calls.
 */
export class Board {
  /** @type {HTMLElement} */
  #element;
  /** @type {BoardHandlers} */
  #handlers;
  /** @type {Puzzle | null} */
  #puzzle = null;
  /** @type {HTMLButtonElement[][]} */
  #cells = [];
  /** @type {Cell} */
  #focus = [0, 0];
  /**
   * The press in progress and the last cell it reported, or `null` for that cell after the pointer
   * left the board, so re-entering elsewhere doesn't fill in the cells between.
   *
   * @type {{ pointerId: number, key: string | null } | null}
   */
  #press = null;
  /** @type {{ key: string, time: number } | null} */
  #lastTap = null;

  /**
   * @param {HTMLElement} element The `role="grid"` container
   * @param {BoardHandlers} handlers
   */
  constructor(element, handlers) {
    this.#element = element;
    this.#handlers = handlers;
    element.addEventListener('pointerdown', (event) => this.#onPointerDown(event));
    element.addEventListener('pointermove', (event) => this.#onPointerMove(event));
    element.addEventListener('pointerup', (event) => this.#onPointerEnd(event));
    element.addEventListener('pointercancel', (event) => this.#onPointerEnd(event));
    element.addEventListener('lostpointercapture', (event) => this.#onPointerEnd(event));
    element.addEventListener('contextmenu', (event) => this.#onContextMenu(event));
    element.addEventListener('keydown', (event) => this.#onKeyDown(event));
  }

  /**
   * Builds the cells for a new puzzle.
   *
   * @param {Puzzle} puzzle
   */
  setPuzzle(puzzle) {
    const { size, regions } = puzzle;
    this.#puzzle = puzzle;
    this.#press = null;
    this.#lastTap = null;
    this.#focus = [0, 0];
    this.#cells = [];
    this.#element.style.setProperty('--size', String(size));
    this.#element.replaceChildren();
    for (let row = 0; row < size; row++) {
      const rowElement = document.createElement('div');
      rowElement.className = 'board-row';
      rowElement.setAttribute('role', 'row');
      /** @type {HTMLButtonElement[]} */
      const rowCells = [];
      for (let column = 0; column < size; column++) {
        const cell = createCell(regions, row, column);
        rowElement.append(cell);
        rowCells.push(cell);
      }
      this.#element.append(rowElement);
      this.#cells.push(rowCells);
    }
  }

  /**
   * Shows crosses, marks, mistakes, the revealed solution, and hint targets, and describes each
   * cell for screen readers.
   *
   * @param {BoardState} state
   * @param {{ hintTargets: Set<string>, mistakes: Set<string>, revealed: Set<string>, locked: boolean }} decorations
   */
  update(state, { hintTargets, mistakes, revealed, locked }) {
    const puzzle = this.#puzzle;
    if (!puzzle) return;
    this.#element.classList.toggle('locked', locked);
    this.#cells.forEach((rowCells, row) => {
      rowCells.forEach((cell, column) => {
        const key = cellKey(row, column);
        const marked = state.marked.has(key);
        const mistake = mistakes.has(key);
        const crossed = state.crossed.has(key) && !mistake;
        const shown = revealed.has(key);
        const hinted = hintTargets.has(key);
        cell.classList.toggle('crossed', crossed);
        cell.classList.toggle('marked', marked);
        cell.classList.toggle('mistake', mistake);
        cell.classList.toggle('revealed', shown);
        cell.classList.toggle('hint-target', hinted);
        const details = [
          `Row ${row + 1}, column ${column + 1}, ${REGION_NAMES[puzzle.regions[row][column]]}`,
          marked ? 'marked' : mistake ? 'wrong mark' : crossed ? 'crossed off' : '',
          shown ? 'solution' : '',
          hinted ? 'hint' : '',
        ];
        cell.setAttribute('aria-label', details.filter(Boolean).join(', '));
      });
    });
  }

  /** @param {PointerEvent} event */
  #onPointerDown(event) {
    const cell = this.#cellAt(event.target);
    if (!cell || event.button !== 0 || this.#press) return;
    event.preventDefault();
    this.#element.setPointerCapture(event.pointerId);
    const key = keyOf(cell);
    const last = this.#lastTap;
    const double =
      last !== null && last.key === key && event.timeStamp - last.time <= DOUBLE_PRESS_MS;
    this.#lastTap = double ? null : { key, time: event.timeStamp };
    this.#press = { pointerId: event.pointerId, key };
    this.#setRoving(cell);
    // preventDefault above also stops the browser from focusing the cell, so focus it here;
    // otherwise Enter or Space would go to whatever button was clicked last.
    cell.focus({ preventScroll: true, focusVisible: false });
    this.#handlers.onPressStart(cellOf(cell), double);
  }

  /** @param {PointerEvent} event */
  #onPointerMove(event) {
    const press = this.#press;
    if (!press || event.pointerId !== press.pointerId) return;
    const bounds = this.#element.getBoundingClientRect();
    const { clientX: x, clientY: y } = event;
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) {
      press.key = null;
      return;
    }
    const cell = this.#cellAt(document.elementFromPoint(x, y));
    if (!cell || keyOf(cell) === press.key) return;
    const passed =
      press.key === null ? [cellOf(cell)] : cellsBetween(parseKey(press.key), cellOf(cell));
    press.key = keyOf(cell);
    this.#lastTap = null;
    for (const next of passed) this.#handlers.onPressMove(next);
  }

  /** @param {PointerEvent} event */
  #onPointerEnd(event) {
    if (!this.#press || event.pointerId !== this.#press.pointerId) return;
    this.#press = null;
    this.#handlers.onPressEnd();
  }

  /** @param {MouseEvent} event */
  #onContextMenu(event) {
    const cell = this.#cellAt(event.target);
    if (!cell) return;
    event.preventDefault();
    if (!isLongPress(event)) this.#handlers.onMarkRequest(cellOf(cell));
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown(event) {
    const cell = this.#cellAt(event.target);
    const puzzle = this.#puzzle;
    if (!cell || !puzzle || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const [row, column] = cellOf(cell);
    const last = puzzle.size - 1;
    /** @type {Record<string, Cell>} */
    const moves = {
      ArrowUp: [Math.max(0, row - 1), column],
      ArrowDown: [Math.min(last, row + 1), column],
      ArrowLeft: [row, Math.max(0, column - 1)],
      ArrowRight: [row, Math.min(last, column + 1)],
      Home: [row, 0],
      End: [row, last],
    };
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (Object.hasOwn(moves, key)) this.#focusCell(moves[key]);
    else if (key === ' ' || key === 'x') this.#handlers.onCrossRequest([row, column]);
    else if (key === 'Enter' || key === 'm') this.#handlers.onMarkRequest([row, column]);
    else return;
    event.preventDefault();
  }

  /** @param {Cell} cell */
  #focusCell([row, column]) {
    const cell = this.#cells[row][column];
    this.#setRoving(cell);
    cell.focus();
  }

  /**
   * Makes `cell` the one board cell reachable with Tab.
   *
   * @param {HTMLButtonElement} cell
   */
  #setRoving(cell) {
    const [row, column] = this.#focus;
    this.#cells[row][column].tabIndex = -1;
    cell.tabIndex = 0;
    this.#focus = cellOf(cell);
  }

  /**
   * The board cell containing a node, if any.
   *
   * @param {EventTarget | null} target
   * @returns {HTMLButtonElement | null}
   */
  #cellAt(target) {
    const cell = target instanceof Element ? target.closest('.cell') : null;
    return cell instanceof HTMLButtonElement && this.#element.contains(cell) ? cell : null;
  }
}

/**
 * Whether a context menu event came from holding a finger or pen still. Android opens the context
 * menu on a long press, and treating that as a right-click would place a mark and could cost a life.
 *
 * @param {object} event
 * @returns {boolean}
 */
export function isLongPress(event) {
  const type = 'pointerType' in event ? event.pointerType : '';
  return type === 'touch' || type === 'pen';
}

/**
 * Creates one cell button, with thick edges where its region meets another.
 *
 * @param {number[][]} regions
 * @param {number} row
 * @param {number} column
 * @returns {HTMLButtonElement}
 */
function createCell(regions, row, column) {
  const region = regions[row][column];
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = 'cell';
  cell.setAttribute('role', 'gridcell');
  cell.dataset.row = String(row);
  cell.dataset.column = String(column);
  cell.tabIndex = row === 0 && column === 0 ? 0 : -1;
  cell.style.setProperty('--region-color', `var(--region-${region})`);
  if (row > 0 && regions[row - 1][column] !== region) cell.append(regionEdge('top'));
  if (column > 0 && regions[row][column - 1] !== region) cell.append(regionEdge('left'));
  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.setAttribute('aria-hidden', 'true');
  cell.append(mark);
  return cell;
}

/**
 * @param {'top' | 'left'} side
 * @returns {HTMLSpanElement}
 */
function regionEdge(side) {
  const edge = document.createElement('span');
  edge.className = `region-edge ${side}`;
  return edge;
}

/**
 * @param {HTMLElement} cell
 * @returns {Cell}
 */
function cellOf(cell) {
  return [Number(cell.dataset.row), Number(cell.dataset.column)];
}

/**
 * @param {HTMLElement} cell
 * @returns {string}
 */
function keyOf(cell) {
  return cellKey(...cellOf(cell));
}
