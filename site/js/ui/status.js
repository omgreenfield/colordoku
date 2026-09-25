import { requireElement } from './dom.js';

/** @typedef {import('../game/attempt.js').Status} Status */

/** @type {Record<Status['kind'], { icon: string, tone: string }>} */
const LOOKS = {
  ready: { icon: 'i', tone: '' },
  progress: { icon: 'i', tone: '' },
  impossible: { icon: '!', tone: 'bad' },
  solved: { icon: '✓', tone: 'good' },
  lost: { icon: '×', tone: 'bad' },
};

/**
 * Shows the current status and lives in the status card.
 *
 * @param {Status} status
 * @param {{ left: number, start: number }} lives
 */
export function renderStatus(status, lives) {
  const { icon, tone } = LOOKS[status.kind];
  requireElement('#status', HTMLElement).className = tone ? `status ${tone}` : 'status';
  requireElement('#status-icon', HTMLElement).textContent = icon;
  requireElement('#status-title', HTMLElement).textContent = status.title;
  requireElement('#status-text', HTMLElement).textContent = status.text;
  const hearts = requireElement('#lives-left', HTMLElement);
  hearts.replaceChildren(
    ...Array.from({ length: lives.start }, (_, index) => {
      const heart = document.createElement('span');
      const kept = index < lives.left;
      heart.className = kept ? 'heart' : 'heart spent';
      heart.textContent = kept ? '♥' : '♡';
      return heart;
    }),
  );
  const noun = lives.start === 1 ? 'life' : 'lives';
  hearts.setAttribute('aria-label', `${lives.left} of ${lives.start} ${noun} left`);
}
