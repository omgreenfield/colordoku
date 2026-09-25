import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addResult, emptyRecord, parseRecord, winRate } from '../site/js/game/record.js';

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
