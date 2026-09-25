import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SEED_PATTERN,
  createRandom,
  hashSeed,
  randomSeed,
  shuffle,
} from '../site/js/game/random.js';

test('hashSeed matches FNV-1a', () => {
  assert.equal(hashSeed(''), 0x811c9dc5);
  assert.equal(hashSeed('a'), 0xe40c292c);
});

test('createRandom repeats the same sequence for the same seed', () => {
  const first = createRandom('k3f9x2');
  const second = createRandom('k3f9x2');
  const values = Array.from({ length: 20 }, () => first());
  assert.deepEqual(
    Array.from({ length: 20 }, () => second()),
    values,
  );
  assert.ok(values.every((value) => value >= 0 && value < 1));
});

test('createRandom gives different seeds different sequences', () => {
  const first = createRandom('k3f9x2');
  const second = createRandom('k3f9x3');
  assert.notDeepEqual(
    Array.from({ length: 5 }, () => first()),
    Array.from({ length: 5 }, () => second()),
  );
});

test('shuffle returns a permutation and leaves the input alone', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const result = shuffle(input, createRandom('shuffle'));
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(
    [...result].sort((a, b) => a - b),
    input,
  );
});

test('randomSeed makes six-character seeds that match SEED_PATTERN', () => {
  assert.equal(
    randomSeed(() => 0),
    '000000',
  );
  for (let index = 0; index < 50; index++) {
    const seed = randomSeed();
    assert.equal(seed.length, 6);
    assert.match(seed, SEED_PATTERN);
  }
});

test('SEED_PATTERN accepts short lowercase base-36 strings only', () => {
  assert.match('a', SEED_PATTERN);
  assert.match('0123456789abcdef', SEED_PATTERN);
  assert.doesNotMatch('', SEED_PATTERN);
  assert.doesNotMatch('ABC', SEED_PATTERN);
  assert.doesNotMatch('0123456789abcdefg', SEED_PATTERN);
  assert.doesNotMatch('no-dashes', SEED_PATTERN);
});
