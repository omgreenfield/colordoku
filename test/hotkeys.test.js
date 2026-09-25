import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ariaKeyshortcuts,
  hotkeyLabel,
  isHotkeyId,
  isMacPlatform,
  matchHotkey,
} from '../site/js/ui/hotkeys.js';

/**
 * A fake key press.
 *
 * @param {string} code
 * @param {{ key?: string, shift?: boolean, ctrl?: boolean, meta?: boolean, alt?: boolean }} [options]
 */
function press(code, { key = '', shift = false, ctrl = false, meta = false, alt = false } = {}) {
  return { code, key, shiftKey: shift, ctrlKey: ctrl, metaKey: meta, altKey: alt };
}

const SHIFT_HOTKEYS = {
  newGame: 'KeyN',
  cycleSize: 'KeyB',
  cycleLives: 'KeyL',
  crossMode: 'KeyX',
  markMode: 'KeyP',
  restart: 'KeyR',
  check: 'KeyC',
  share: 'KeyS',
  hintMark: 'Digit1',
  hintCross: 'Digit2',
  hintReason: 'Digit3',
  applyHint: 'KeyA',
  toggleSound: 'KeyM',
};

test('every Shift hotkey matches its physical key', () => {
  for (const [id, code] of Object.entries(SHIFT_HOTKEYS)) {
    assert.equal(matchHotkey(press(code, { key: '?', shift: true })), id, code);
  }
});

test('plain keys are left for the board', () => {
  assert.equal(matchHotkey(press('KeyX', { key: 'x' })), null);
  assert.equal(matchHotkey(press('Digit1', { key: '1' })), null);
});

test('undo and redo take Command or Control', () => {
  assert.equal(matchHotkey(press('KeyZ', { key: 'z', meta: true })), 'undo');
  assert.equal(matchHotkey(press('KeyZ', { key: 'z', ctrl: true })), 'undo');
  assert.equal(matchHotkey(press('KeyZ', { key: 'Z', meta: true, shift: true })), 'redo');
  assert.equal(matchHotkey(press('KeyZ', { key: 'Z', ctrl: true, shift: true })), 'redo');
  assert.equal(matchHotkey(press('KeyY', { key: 'y', ctrl: true })), 'redo');
  assert.equal(matchHotkey(press('KeyY', { key: 'y', meta: true })), null);
  assert.equal(matchHotkey(press('KeyN', { key: 'n', meta: true, shift: true })), null);
});

test('Alt blocks every hotkey', () => {
  assert.equal(matchHotkey(press('KeyN', { shift: true, alt: true })), null);
  assert.equal(matchHotkey(press('KeyZ', { key: 'z', meta: true, alt: true })), null);
});

test('Escape dismisses a hint', () => {
  assert.equal(matchHotkey(press('Escape', { key: 'Escape' })), 'dismissHint');
  assert.equal(matchHotkey(press('Escape', { key: 'Escape', shift: true })), null);
});

test('labels follow the platform', () => {
  assert.equal(hotkeyLabel('newGame', true), '⇧N');
  assert.equal(hotkeyLabel('hintMark', false), '⇧1');
  assert.equal(hotkeyLabel('undo', true), '⌘Z');
  assert.equal(hotkeyLabel('undo', false), 'Ctrl+Z');
  assert.equal(hotkeyLabel('redo', true), '⌘⇧Z');
  assert.equal(hotkeyLabel('redo', false), 'Ctrl+Shift+Z');
  assert.equal(hotkeyLabel('dismissHint', true), 'Esc');
});

test('aria-keyshortcuts values use ARIA key names', () => {
  assert.equal(ariaKeyshortcuts('newGame'), 'Shift+N');
  assert.equal(ariaKeyshortcuts('hintCross'), 'Shift+2');
  assert.equal(ariaKeyshortcuts('undo'), 'Meta+Z Control+Z');
  assert.equal(ariaKeyshortcuts('redo'), 'Meta+Shift+Z Control+Shift+Z Control+Y');
  assert.equal(ariaKeyshortcuts('dismissHint'), 'Escape');
});

test('isMacPlatform spots Apple devices', () => {
  assert.equal(isMacPlatform({ platform: 'MacIntel' }), true);
  assert.equal(isMacPlatform({ platform: 'iPhone' }), true);
  assert.equal(isMacPlatform({ userAgentData: { platform: 'macOS' } }), true);
  assert.equal(isMacPlatform({ platform: 'Win32' }), false);
  assert.equal(isMacPlatform({}), false);
});

test('isHotkeyId accepts table ids only', () => {
  assert.equal(isHotkeyId('newGame'), true);
  assert.equal(isHotkeyId('dismissHint'), true);
  assert.equal(isHotkeyId('launchRocket'), false);
  assert.equal(isHotkeyId(undefined), false);
});
