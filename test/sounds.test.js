import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSounds } from '../site/js/ui/sounds.js';

/**
 * A stand-in AudioContext that records the starting frequency of every tone.
 */
function fakeAudio() {
  /** @type {number[]} */
  const tones = [];
  let created = 0;
  const context = {
    currentTime: 0,
    state: 'running',
    destination: {},
    resume() {},
    createGain: () => ({
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect: (/** @type {unknown} */ node) => node,
    }),
    createOscillator: () => ({
      type: 'sine',
      frequency: {
        setValueAtTime: (/** @type {number} */ value) => tones.push(value),
        exponentialRampToValueAtTime() {},
      },
      connect: (/** @type {unknown} */ node) => node,
      start() {},
      stop() {},
    }),
  };
  const createContext = () => {
    created++;
    return /** @type {AudioContext} */ (/** @type {unknown} */ (context));
  };
  return { tones, createContext, created: () => created };
}

test('sounds play the previewed tones', () => {
  const audio = fakeAudio();
  const sounds = createSounds({ muted: false, createContext: audio.createContext });
  sounds.play('mark');
  sounds.play('wrong');
  sounds.play('win');
  assert.deepEqual(audio.tones, [660, 311, 622, 523, 1046, 659, 1318, 784, 1568, 1047, 2094]);
});

test('the audio context is created once, on the first sound', () => {
  const audio = fakeAudio();
  const sounds = createSounds({ muted: false, createContext: audio.createContext });
  assert.equal(audio.created(), 0);
  sounds.play('hint');
  sounds.play('undo');
  assert.equal(audio.created(), 1);
});

test('muting silences every sound until unmuted', () => {
  const audio = fakeAudio();
  const sounds = createSounds({ muted: true, createContext: audio.createContext });
  sounds.play('mark');
  assert.equal(sounds.muted, true);
  assert.deepEqual(audio.tones, []);
  sounds.setMuted(false);
  sounds.play('mark');
  assert.deepEqual(audio.tones, [660]);
});

test('drag ticks closer than 40 ms apart are dropped', () => {
  const audio = fakeAudio();
  const times = [0, 10, 50, 95, 100];
  const sounds = createSounds({
    muted: false,
    createContext: audio.createContext,
    now: () => times.shift() ?? 0,
  });
  for (let index = 0; index < 5; index++) sounds.play(index % 2 ? 'uncross' : 'cross');
  assert.deepEqual(audio.tones, [520, 520, 400]);
});

test('sounds do nothing without Web Audio', () => {
  const sounds = createSounds({ muted: false, createContext: () => null });
  assert.doesNotThrow(() => sounds.play('win'));
});
