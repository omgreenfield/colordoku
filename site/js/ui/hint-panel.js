import { requireElement } from './dom.js';

/** @typedef {import('../game/hints.js').Hint} Hint */

/**
 * Shows a hint in the hint card, or hides the card for `null`.
 *
 * @param {Hint | null} hint
 */
export function renderHint(hint) {
  const panel = requireElement('#hint-panel', HTMLElement);
  panel.classList.toggle('show', hint !== null);
  if (!hint) return;
  requireElement('#hint-title', HTMLElement).textContent = hint.title;
  requireElement('#hint-text', HTMLElement).textContent = hint.text;
  requireElement('#hint-targets', HTMLElement).textContent = hint.targets
    .map(([row, column]) => `R${row + 1}C${column + 1}`)
    .join(' · ');
  requireElement('#apply-hint', HTMLElement).textContent =
    hint.action === 'mark' ? 'Place mark' : `Cross off ${hint.targets.length}`;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
}
