import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UndoHistory } from '../site/js/game/history.js';
import { stateOf } from './fixtures.js';

const A = stateOf({});
const B = stateOf({ crossed: [[0, 0]] });
const C = stateOf({ crossed: [[0, 1]] });

test('undo and redo walk back and forth', () => {
  const history = new UndoHistory();
  assert.equal(history.canUndo, false);
  history.record(A);
  history.record(B);
  assert.equal(history.undo(C), B);
  assert.equal(history.undo(B), A);
  assert.equal(history.undo(A), null);
  assert.equal(history.canRedo, true);
  assert.equal(history.redo(A), B);
  assert.equal(history.redo(B), C);
  assert.equal(history.redo(C), null);
});

test('recording after an undo clears redo', () => {
  const history = new UndoHistory();
  history.record(A);
  history.undo(B);
  history.record(A);
  assert.equal(history.canRedo, false);
});

test('discardLast drops the latest step and returns it', () => {
  const history = new UndoHistory();
  history.record(A);
  assert.equal(history.discardLast(), A);
  assert.equal(history.discardLast(), null);
  assert.equal(history.canUndo, false);
});

test('clear empties both stacks', () => {
  const history = new UndoHistory();
  history.record(A);
  history.undo(B);
  history.clear();
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});
