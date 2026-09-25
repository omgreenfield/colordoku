import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isLongPress } from '../site/js/ui/board.js';

test('a context menu from a held finger or pen is a long press, not a right-click', () => {
  assert.equal(isLongPress({ pointerType: 'touch' }), true);
  assert.equal(isLongPress({ pointerType: 'pen' }), true);
  assert.equal(isLongPress({ pointerType: 'mouse' }), false);
  assert.equal(isLongPress({ pointerType: '' }), false, 'the keyboard menu key');
  assert.equal(isLongPress({}), false, 'browsers that send a plain MouseEvent');
});
