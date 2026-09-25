import { DEFAULT_LIVES, LIVES_CHOICES } from '../game/attempt.js';
import { addResult, parseRecord } from '../game/record.js';

/**
 * @typedef {{ lives: number, muted: boolean }} Settings
 * @typedef {import('../game/record.js').GameRecord} GameRecord
 */

export const SETTINGS_KEY = 'colordoku.settings';
export const RECORD_KEY = 'colordoku.record';

/**
 * Reads a JSON value saved in this browser.
 *
 * @param {string} key
 * @returns {unknown} `null` when nothing is saved or storage is blocked
 */
export function readStored(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Saves a JSON value in this browser, doing nothing when storage is blocked or full.
 *
 * @param {string} key
 * @param {unknown} value
 */
export function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is optional; the game works without it.
  }
}

/**
 * Reads saved settings, falling back to the defaults for anything missing or invalid.
 *
 * @param {unknown} value
 * @returns {Settings}
 */
export function parseSettings(value) {
  const source = /** @type {{ lives?: unknown, muted?: unknown }} */ (
    typeof value === 'object' && value !== null ? value : {}
  );
  const lives =
    typeof source.lives === 'number' && LIVES_CHOICES.includes(source.lives)
      ? source.lives
      : DEFAULT_LIVES;
  return { lives, muted: source.muted === true };
}

/**
 * Adds a finished attempt to the record saved in this browser. It reads the saved record fresh, so
 * results another tab saved in the meantime survive.
 *
 * @param {{ won: boolean, score: number }} result
 * @returns {GameRecord} The record as saved
 */
export function saveResult(result) {
  const record = addResult(parseRecord(readStored(RECORD_KEY)), result);
  writeStored(RECORD_KEY, record);
  return record;
}
