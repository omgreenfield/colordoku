/**
 * Board vocabulary and the placement rules every other game module shares.
 * In a `Puzzle`, `regions[row][column]` is a region index and `solution[row]` is that row's solution column.
 *
 * @typedef {[number, number]} Cell A `[row, column]` pair, zero-based
 * @typedef {{ crossed: Set<string>, marked: Set<string> }} BoardState Keys of crossed-off and marked cells
 * @typedef {{ size: number, seed: string, regions: number[][], solution: number[] }} Puzzle
 */

/** Board sizes the game offers. */
export const SIZES = [6, 7, 8, 9];

/** Board size used when a link doesn't name a valid one. */
export const DEFAULT_SIZE = 7;

/** Region color names, in the same order as the `--region-N` tokens in `site/css/tokens.css`. */
export const REGION_NAMES = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'teal',
  'gray',
  'pink',
];

/**
 * Set key for a cell.
 *
 * @param {number} row
 * @param {number} column
 * @returns {string}
 */
export function cellKey(row, column) {
  return `${row},${column}`;
}

/**
 * Cell for a key made by `cellKey`.
 *
 * @param {string} key
 * @returns {Cell}
 */
export function parseKey(key) {
  const [row, column] = key.split(',').map(Number);
  return [row, column];
}

/**
 * Whether two cells touch, including diagonally.
 *
 * @param {Cell} first
 * @param {Cell} second
 * @returns {boolean}
 */
export function touches(first, second) {
  return Math.abs(first[0] - second[0]) <= 1 && Math.abs(first[1] - second[1]) <= 1;
}

/**
 * Cells on the straight line after `from` up to and including `to`, so a fast drag that skips
 * cells between two pointer events still visits every cell it passed over.
 *
 * @param {Cell} from
 * @param {Cell} to
 * @returns {Cell[]}
 */
export function cellsBetween(from, to) {
  const [fromRow, fromColumn] = from;
  const [toRow, toColumn] = to;
  const steps = Math.max(Math.abs(toRow - fromRow), Math.abs(toColumn - fromColumn));
  return Array.from({ length: steps }, (_, index) => {
    const progress = (index + 1) / steps;
    return [
      Math.round(fromRow + (toRow - fromRow) * progress),
      Math.round(fromColumn + (toColumn - fromColumn) * progress),
    ];
  });
}

/**
 * Whether marks on two different cells break a rule: same row, column, or region, or touching.
 *
 * @param {number[][]} regions
 * @param {Cell} first
 * @param {Cell} second
 * @returns {boolean}
 */
export function marksConflict(regions, first, second) {
  const [firstRow, firstColumn] = first;
  const [secondRow, secondColumn] = second;
  return (
    firstRow === secondRow ||
    firstColumn === secondColumn ||
    regions[firstRow][firstColumn] === regions[secondRow][secondColumn] ||
    touches(first, second)
  );
}

/**
 * Keys of every mark that breaks a rule with another mark.
 *
 * @param {number[][]} regions
 * @param {Iterable<string>} marked
 * @returns {Set<string>}
 */
export function conflictingMarks(regions, marked) {
  const keys = [...marked];
  /** @type {Set<string>} */
  const conflicts = new Set();
  keys.forEach((first, index) => {
    for (const second of keys.slice(index + 1)) {
      if (marksConflict(regions, parseKey(first), parseKey(second))) {
        conflicts.add(first);
        conflicts.add(second);
      }
    }
  });
  return conflicts;
}
