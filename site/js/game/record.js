/**
 * Wins, losses, and scores across games.
 *
 * @typedef {{ wins: number, losses: number, totalScore: number, bestScore: number }} GameRecord
 */

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
