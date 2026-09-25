import { requireElement } from './dom.js';

/** @typedef {import('../game/game.js').Status} Status */

/** @type {Record<Status['kind'], { icon: string, tone: string }>} */
const LOOKS = {
  ready: { icon: 'i', tone: '' },
  progress: { icon: 'i', tone: '' },
  impossible: { icon: '!', tone: 'bad' },
  solved: { icon: '✓', tone: 'good' },
};

/**
 * Shows the current status in the status card.
 *
 * @param {Status} status
 */
export function renderStatus(status) {
  const { icon, tone } = LOOKS[status.kind];
  requireElement('#status', HTMLElement).className = tone ? `status ${tone}` : 'status';
  requireElement('#status-icon', HTMLElement).textContent = icon;
  requireElement('#status-title', HTMLElement).textContent = status.title;
  requireElement('#status-text', HTMLElement).textContent = status.text;
}
