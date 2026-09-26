/**
 * Wins, losses, and scores across games, plus the puzzles already finished, since replaying a
 * puzzle whose solution you've seen doesn't count.
 *
 * @typedef {{ wins: number, losses: number, totalScore: number, bestScore: number }} GameRecord
 * @typedef {import('./rules.js').Puzzle} Puzzle
 */

/** How many finished puzzles to remember, so saved data stays small. */
export const FINISHED_LIMIT = 500;

/** @returns {GameRecord} */
export function emptyRecord() {
  return { wins: 0, losses: 0, totalScore: 0, bestScore: 0 };
}

/**
 * Reads a saved record, replacing anything that isn't a non-negative whole number with 0.
 *
 * @param {unknown} value
 * @returns {GameRecord}
 */
export function parseRecord(value) {
  const source = /** @type {Record<string, unknown>} */ (
    typeof value === 'object' && value !== null ? value : {}
  );
  /** @param {unknown} field */
  const count = (field) =>
    typeof field === 'number' && Number.isInteger(field) && field >= 0 ? field : 0;
  return {
    wins: count(source.wins),
    losses: count(source.losses),
    totalScore: count(source.totalScore),
    bestScore: count(source.bestScore),
  };
}

/**
 * Adds a finished attempt to the record.
 *
 * @param {GameRecord} record
 * @param {{ won: boolean, score: number }} result
 * @returns {GameRecord}
 */
export function addResult(record, { won, score }) {
  if (!won) return { ...record, losses: record.losses + 1 };
  return {
    ...record,
    wins: record.wins + 1,
    totalScore: record.totalScore + score,
    bestScore: Math.max(record.bestScore, score),
  };
}

/**
 * Share of finished games won, as a whole percent.
 *
 * @param {GameRecord} record
 * @returns {number | null} `null` before any game has finished
 */
export function winRate(record) {
  const games = record.wins + record.losses;
  return games === 0 ? null : Math.round((100 * record.wins) / games);
}

/**
 * The id a finished puzzle is remembered by. The same size and seed always build the same puzzle.
 *
 * @param {Puzzle} puzzle
 * @returns {string}
 */
export function puzzleId({ size, seed }) {
  return `${size}:${seed}`;
}

/**
 * Reads saved finished-puzzle ids, dropping anything that isn't one.
 *
 * @param {unknown} value
 * @returns {string[]} Oldest first
 */
export function parseFinished(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((id) => typeof id === 'string').slice(-FINISHED_LIMIT);
}

/**
 * Remembers a finished puzzle as the newest, forgetting the oldest past the limit.
 *
 * @param {string[]} finished Oldest first
 * @param {string} id
 * @returns {string[]}
 */
export function addFinished(finished, id) {
  return [...finished.filter((other) => other !== id), id].slice(-FINISHED_LIMIT);
}
