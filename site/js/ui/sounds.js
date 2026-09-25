/**
 * Soft synthesized sound effects: short sine or triangle tones with a quick fade in and a longer
 * fade out. No audio files.
 *
 * @typedef {'cross' | 'uncross' | 'mark' | 'unmark' | 'wrong' | 'hint' | 'undo' | 'redo' | 'newGame' | 'win' | 'lose'} SoundName
 * @typedef {{ at?: number, dur?: number, type?: OscillatorType, peak?: number, to?: number, attack?: number }} ToneOptions
 * @typedef {[number, ToneOptions]} Tone A starting frequency in Hz and how to play it
 */

/** Drag ticks closer together than this are skipped so a fast drag doesn't buzz. */
const TICK_GAP_MS = 40;

/** @type {Record<SoundName, Tone[]>} */
const SOUNDS = {
  cross: [[520, { type: 'triangle', dur: 0.045, peak: 0.05 }]],
  uncross: [[400, { type: 'triangle', dur: 0.045, peak: 0.05 }]],
  mark: [[660, { to: 990, dur: 0.12, peak: 0.08, attack: 0.008 }]],
  unmark: [[880, { to: 587, dur: 0.11, peak: 0.07, attack: 0.008 }]],
  wrong: [
    [311, { to: 196, dur: 0.26, peak: 0.1, attack: 0.01 }],
    [622, { to: 392, dur: 0.2, peak: 0.025, attack: 0.01 }],
  ],
  hint: [
    [784, { dur: 0.18, peak: 0.05 }],
    [1175, { at: 0.09, dur: 0.25, peak: 0.045 }],
  ],
  undo: [[700, { to: 480, type: 'triangle', dur: 0.08, peak: 0.05 }]],
  redo: [[480, { to: 700, type: 'triangle', dur: 0.08, peak: 0.05 }]],
  newGame: [
    [523, { dur: 0.22, peak: 0.05 }],
    [784, { at: 0.08, dur: 0.3, peak: 0.045 }],
  ],
  win: [523, 659, 784, 1047].flatMap((frequency, index) => [
    /** @type {Tone} */ ([frequency, { at: index * 0.11, dur: 0.45, peak: 0.07, attack: 0.01 }]),
    /** @type {Tone} */ ([frequency * 2, { at: index * 0.11, dur: 0.3, peak: 0.012 }]),
  ]),
  lose: [392, 311, 262].map(
    (frequency, index) =>
      /** @type {Tone} */ ([
        frequency,
        { at: index * 0.18, dur: 0.4, type: 'triangle', peak: 0.07, attack: 0.015 },
      ]),
  ),
};

/**
 * Creates the sound player. The audio context starts on the first sound, which always follows a
 * click or key press, as browsers require.
 *
 * @param {{ muted: boolean, createContext?: () => AudioContext | null, now?: () => number }} options
 */
export function createSounds({
  muted,
  createContext = () => (typeof AudioContext === 'undefined' ? null : new AudioContext()),
  now = () => performance.now(),
}) {
  /** @type {AudioContext | null | undefined} */
  let context;
  let isMuted = muted;
  let lastTick = -Infinity;

  /**
   * The audio context, created on first use and resumed if the browser suspended it.
   *
   * @returns {AudioContext | null} `null` without Web Audio
   */
  const wake = () => {
    if (context === undefined) context = createContext();
    if (context?.state === 'suspended') void context.resume();
    return context;
  };

  return {
    /** @param {SoundName} name */
    play(name) {
      if (isMuted) return;
      if (name === 'cross' || name === 'uncross') {
        const time = now();
        if (time - lastTick < TICK_GAP_MS) return;
        lastTick = time;
      }
      const audio = wake();
      if (!audio) return;
      for (const [frequency, options] of SOUNDS[name]) playTone(audio, frequency, options);
    },
    /**
     * Starts the audio from inside a user gesture. Safari only lets audio start there, and a touch
     * counts when it ends, after the board has already played its sound on pointerdown.
     */
    unlock() {
      if (!isMuted) wake();
    },
    /** @param {boolean} next */
    setMuted(next) {
      isMuted = next;
    },
    get muted() {
      return isMuted;
    },
  };
}

/**
 * Plays one tone.
 *
 * @param {AudioContext} context
 * @param {number} frequency
 * @param {ToneOptions} options
 */
function playTone(
  context,
  frequency,
  { at = 0, dur = 0.1, type = 'sine', peak = 0.08, to, attack = 0.005 },
) {
  const start = context.currentTime + at;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (to) oscillator.frequency.exponentialRampToValueAtTime(to, start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + dur + 0.02);
}
