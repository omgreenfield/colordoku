import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RECORD_KEY, parseSettings, saveResult } from '../site/js/ui/storage.js';

test('parseSettings falls back to 3 lives with sound on', () => {
  assert.deepEqual(parseSettings(null), { lives: 3, muted: false });
  assert.deepEqual(parseSettings([]), { lives: 3, muted: false });
  assert.deepEqual(parseSettings({ lives: 9, muted: 'yes' }), { lives: 3, muted: false });
});

test('parseSettings keeps valid choices', () => {
  assert.deepEqual(parseSettings({ lives: 1, muted: true }), { lives: 1, muted: true });
  assert.deepEqual(parseSettings({ lives: 5 }), { lives: 5, muted: false });
});

/**
 * Swaps in an in-memory localStorage for one test.
 *
 * @param {import('node:test').TestContext} t
 * @param {Record<string, string>} items
 * @returns {Map<string, string>}
 */
function fakeStorage(t, items) {
  const store = new Map(Object.entries(items));
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (/** @type {string} */ key) => store.get(key) ?? null,
      setItem: (/** @type {string} */ key, /** @type {string} */ value) =>
        void store.set(key, value),
    },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
  return store;
}

test('saveResult adds to the record saved now, so another tab’s results survive', (t) => {
  const saved = { wins: 1, losses: 0, totalScore: 600, bestScore: 600 };
  const store = fakeStorage(t, { [RECORD_KEY]: JSON.stringify(saved) });
  const record = saveResult({ won: false, score: 0 });
  assert.deepEqual(record, { wins: 1, losses: 1, totalScore: 600, bestScore: 600 });
  assert.deepEqual(JSON.parse(store.get(RECORD_KEY) ?? ''), record);
});
