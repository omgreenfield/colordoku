import { winRate } from '../game/record.js';
import { requireElement } from './dom.js';

/** @typedef {import('../game/record.js').GameRecord} GameRecord */

/**
 * Shows wins, losses, and scores in the record card.
 *
 * @param {GameRecord} record
 */
export function renderRecord(record) {
  const rate = winRate(record);
  requireElement('#record-wins', HTMLElement).textContent = record.wins.toLocaleString();
  requireElement('#record-losses', HTMLElement).textContent = record.losses.toLocaleString();
  requireElement('#record-rate', HTMLElement).textContent = rate === null ? '–' : `${rate}%`;
  requireElement('#record-best', HTMLElement).textContent = record.bestScore.toLocaleString();
  requireElement('#record-total', HTMLElement).textContent = record.totalScore.toLocaleString();
}
