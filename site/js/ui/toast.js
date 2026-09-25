import { requireElement } from './dom.js';

const VISIBLE_MS = 2600;

/** @type {ReturnType<typeof setTimeout> | undefined} */
let hideTimer;

/**
 * Shows a short message at the bottom of the screen.
 *
 * @param {string} text
 */
export function showToast(text) {
  const toast = requireElement('#toast', HTMLElement);
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => toast.classList.remove('show'), VISIBLE_MS);
}
