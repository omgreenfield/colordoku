import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearCrosses, emptyState, sameState, setCrossed } from '../site/js/game/game.js';
import { stateOf } from './fixtures.js';

test('setCrossed adds and clears crosses without touching marks or the input', () => {
  const start = stateOf({ marked: [[0, 1]] });
  const crossed = setCrossed(
    start,
    [
      [0, 0],
      [0, 1],
    ],
    true,
  );
  assert.deepEqual([...crossed.crossed], ['0,0']);
  assert.equal(start.crossed.size, 0);
  assert.equal(setCrossed(crossed, [[0, 0]], false).crossed.size, 0);
});

test('sameState compares both sets', () => {
  assert.ok(sameState(stateOf({ crossed: [[0, 0]] }), stateOf({ crossed: [[0, 0]] })));
  assert.ok(!sameState(stateOf({ crossed: [[0, 0]] }), stateOf({ marked: [[0, 0]] })));
});

test('setCrossed skips the cells it is told to', () => {
  const next = setCrossed(
    emptyState(),
    [
      [0, 0],
      [0, 1],
    ],
    true,
    new Set(['0,0']),
  );
  assert.deepEqual([...next.crossed], ['0,1']);
});

test('clearCrosses removes every cross and keeps every mark', () => {
  const start = stateOf({
    crossed: [
      [0, 0],
      [2, 3],
    ],
    marked: [[0, 1]],
  });
  const cleared = clearCrosses(start);
  assert.equal(cleared.crossed.size, 0);
  assert.deepEqual([...cleared.marked], ['0,1']);
  assert.equal(start.crossed.size, 2);
});
