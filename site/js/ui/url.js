import { SEED_PATTERN } from '../game/random.js';
import { SIZES } from '../game/rules.js';

/**
 * Reads the puzzle size and seed from a query string, dropping anything invalid.
 *
 * @param {string} search For example `?size=8&seed=k3f9x2`
 * @returns {{ size: number | null, seed: string | null }}
 */
export function readPuzzleParams(search) {
  const params = new URLSearchParams(search);
  const size = Number(params.get('size'));
  const seed = params.get('seed')?.toLowerCase() ?? '';
  return {
    size: SIZES.includes(size) ? size : null,
    seed: SEED_PATTERN.test(seed) ? seed : null,
  };
}

/**
 * Query string that rebuilds a puzzle.
 *
 * @param {number} size
 * @param {string} seed
 * @returns {string}
 */
export function puzzleSearch(size, seed) {
  return `?${new URLSearchParams({ size: String(size), seed })}`;
}

/**
 * Shares a puzzle link through the native share sheet, falling back to the clipboard.
 *
 * @param {string} url
 * @param {number} size
 * @returns {Promise<string | null>} A message to show, or `null` when there is nothing to say
 */
export async function sharePuzzle(url, size) {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Colordoku',
        text: `Try this ${size}×${size} Colordoku puzzle.`,
        url,
      });
      return null;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'Link copied.';
  } catch {
    return 'Couldn’t copy the link. Copy it from the address bar instead.';
  }
}
