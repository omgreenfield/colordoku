import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FINISHED_LIMIT,
  addFinished,
  addResult,
  emptyRecord,
  parseFinished,
  parseRecord,
  puzzleId,
  winRate,
} from '../site/js/game/record.js';
import { SMALL_PUZZLE } from './fixtures.js';

test('a win adds to wins, total, and best score', () => {
  const record = addResult(addResult(emptyRecord(), { won: true, score: 533 }), {
    won: true,
    score: 400,
  });
  assert.deepEqual(record, { wins: 2, losses: 0, totalScore: 933, bestScore: 533 });
});

test('a loss only adds to losses', () => {
  assert.deepEqual(addResult(emptyRecord(), { won: false, score: 0 }), {
    wins: 0,
    losses: 1,
    totalScore: 0,
    bestScore: 0,
  });
});

test('winRate is a whole percent, or null before any game', () => {
  assert.equal(winRate(emptyRecord()), null);
  assert.equal(winRate({ wins: 2, losses: 1, totalScore: 0, bestScore: 0 }), 67);
  assert.equal(winRate({ wins: 0, losses: 3, totalScore: 0, bestScore: 0 }), 0);
});

test('parseRecord keeps valid counts and zeroes everything else', () => {
  assert.deepEqual(parseRecord(null), emptyRecord());
  assert.deepEqual(parseRecord('nonsense'), emptyRecord());
  assert.deepEqual(parseRecord({ wins: 3, losses: -1, totalScore: 1.5, bestScore: '9' }), {
    wins: 3,
    losses: 0,
    totalScore: 0,
    bestScore: 0,
  });
});

test('puzzleId names a puzzle by size and seed', () => {
  assert.equal(puzzleId({ ...SMALL_PUZZLE, size: 8, seed: 'k3f9x2' }), '8:k3f9x2');
});

test('parseFinished keeps only puzzle ids', () => {
  assert.deepEqual(parseFinished(null), []);
  assert.deepEqual(parseFinished({ '8:a': true }), []);
  assert.deepEqual(parseFinished(['8:a', 7, null, '6:b']), ['8:a', '6:b']);
});

test('addFinished moves a replayed puzzle to the end and forgets the oldest past the limit', () => {
  assert.deepEqual(addFinished(['8:a', '6:b'], '8:a'), ['6:b', '8:a']);
  const full = Array.from({ length: FINISHED_LIMIT }, (_, index) => `6:${index}`);
  const next = addFinished(full, '9:new');
  assert.equal(next.length, FINISHED_LIMIT);
  assert.equal(next[0], '6:1');
  assert.equal(next.at(-1), '9:new');
});
