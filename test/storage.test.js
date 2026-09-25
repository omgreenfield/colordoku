import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSettings } from '../site/js/ui/storage.js';

test('parseSettings falls back to 3 lives with sound on', () => {
  assert.deepEqual(parseSettings(null), { lives: 3, muted: false });
  assert.deepEqual(parseSettings([]), { lives: 3, muted: false });
  assert.deepEqual(parseSettings({ lives: 9, muted: 'yes' }), { lives: 3, muted: false });
});

test('parseSettings keeps valid choices', () => {
  assert.deepEqual(parseSettings({ lives: 1, muted: true }), { lives: 1, muted: true });
  assert.deepEqual(parseSettings({ lives: 5 }), { lives: 5, muted: false });
});
