/**
 * Seeded randomness, so any puzzle can be rebuilt from its seed.
 */

/** Seeds are short lowercase base-36 strings, which keeps share links tidy. */
export const SEED_PATTERN = /^[0-9a-z]{1,16}$/;

const SEED_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const SEED_LENGTH = 6;

/**
 * Hashes a seed string to an unsigned 32-bit integer (FNV-1a).
 *
 * @param {string} seed
 * @returns {number}
 */
export function hashSeed(seed) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Creates a deterministic random number generator (mulberry32) for a seed.
 *
 * @param {string} seed
 * @returns {() => number} Returns numbers in `[0, 1)`
 */
export function createRandom(seed) {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a shuffled copy of an array (Fisher–Yates).
 *
 * @template T
 * @param {readonly T[]} array
 * @param {() => number} random
 * @returns {T[]}
 */
export function shuffle(array, random) {
  const result = [...array];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/**
 * Creates a fresh seed for a new random puzzle.
 *
 * @param {() => number} [random]
 * @returns {string}
 */
export function randomSeed(random = Math.random) {
  let seed = '';
  for (let index = 0; index < SEED_LENGTH; index++) {
    seed += SEED_ALPHABET[Math.floor(random() * SEED_ALPHABET.length)];
  }
  return seed;
}
