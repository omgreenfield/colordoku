/**
 * @typedef {import('./rules.js').BoardState} BoardState
 */

/**
 * Undo and redo stacks of whole board states. Boards are at most 81 cells, so copies are cheap.
 */
export class UndoHistory {
  /** @type {BoardState[]} */
  #past = [];
  /** @type {BoardState[]} */
  #future = [];

  /**
   * Remembers the state from before an action and forgets anything to redo.
   *
   * @param {BoardState} before
   */
  record(before) {
    this.#past.push(before);
    this.#future = [];
  }

  /**
   * Steps back one action.
   *
   * @param {BoardState} current
   * @returns {BoardState | null} The earlier state, or `null` when there is nothing to undo
   */
  undo(current) {
    const previous = this.#past.pop();
    if (!previous) return null;
    this.#future.push(current);
    return previous;
  }

  /**
   * Steps forward one undone action.
   *
   * @param {BoardState} current
   * @returns {BoardState | null} The later state, or `null` when there is nothing to redo
   */
  redo(current) {
    const next = this.#future.pop();
    if (!next) return null;
    this.#past.push(current);
    return next;
  }

  /**
   * Forgets the latest step without moving to it, so a double press can fold into one step.
   *
   * @returns {BoardState | null} The state from before that step
   */
  discardLast() {
    return this.#past.pop() ?? null;
  }

  /** Forgets every step, for a new game. */
  clear() {
    this.#past = [];
    this.#future = [];
  }

  get canUndo() {
    return this.#past.length > 0;
  }

  get canRedo() {
    return this.#future.length > 0;
  }
}
