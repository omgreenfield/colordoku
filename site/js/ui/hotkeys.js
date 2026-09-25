/**
 * Every keyboard shortcut outside the board, in one table so button labels and key handling can't
 * drift apart. Plain keys belong to the focused board square; Shift+key triggers a control.
 *
 * @typedef {'newGame' | 'cycleSize' | 'cycleLives' | 'crossMode' | 'markMode' | 'undo' | 'redo' | 'restart' | 'clearCrosses' | 'check' | 'share' | 'hintMark' | 'hintCross' | 'hintReason' | 'applyHint' | 'dismissHint' | 'toggleSound'} HotkeyId
 * @typedef {{ key: string, code: string, shiftKey: boolean, ctrlKey: boolean, metaKey: boolean, altKey: boolean }} KeyLike
 */

/**
 * Shift hotkeys, matched by physical key so they work on any keyboard layout.
 *
 * @type {[HotkeyId, string][]}
 */
const SHIFT_HOTKEYS = [
  ['newGame', 'KeyN'],
  ['cycleSize', 'KeyB'],
  ['cycleLives', 'KeyL'],
  ['crossMode', 'KeyX'],
  ['markMode', 'KeyP'],
  ['restart', 'KeyR'],
  ['clearCrosses', 'KeyE'],
  ['check', 'KeyC'],
  ['share', 'KeyS'],
  ['hintMark', 'Digit1'],
  ['hintCross', 'Digit2'],
  ['hintReason', 'Digit3'],
  ['applyHint', 'KeyA'],
  ['toggleSound', 'KeyM'],
];

/** @type {Set<string>} */
const HOTKEY_IDS = new Set([...SHIFT_HOTKEYS.map(([id]) => id), 'undo', 'redo', 'dismissHint']);

/**
 * @param {string | undefined} value
 * @returns {value is HotkeyId}
 */
export function isHotkeyId(value) {
  return typeof value === 'string' && HOTKEY_IDS.has(value);
}

/**
 * The shortcut a key press triggers, if any.
 *
 * @param {KeyLike} event
 * @returns {HotkeyId | null}
 */
export function matchHotkey(event) {
  const { key, code, shiftKey, ctrlKey, metaKey, altKey } = event;
  if (altKey) return null;
  if (ctrlKey || metaKey) {
    const letter = key.toLowerCase();
    if (letter === 'z') return shiftKey ? 'redo' : 'undo';
    if (letter === 'y' && ctrlKey && !metaKey && !shiftKey) return 'redo';
    return null;
  }
  if (!shiftKey) return key === 'Escape' ? 'dismissHint' : null;
  return SHIFT_HOTKEYS.find(([, hotkeyCode]) => hotkeyCode === code)?.[0] ?? null;
}

/**
 * The key a Shift hotkey uses, like `N` or `1`.
 *
 * @param {HotkeyId} id
 * @returns {string}
 */
function keyName(id) {
  const code = SHIFT_HOTKEYS.find(([hotkeyId]) => hotkeyId === id)?.[1] ?? '';
  return code.replace(/^(Key|Digit)/, '');
}

/**
 * The label shown on a control's key chip.
 *
 * @param {HotkeyId} id
 * @param {boolean} isMac
 * @returns {string}
 */
export function hotkeyLabel(id, isMac) {
  if (id === 'undo') return isMac ? '⌘Z' : 'Ctrl+Z';
  if (id === 'redo') return isMac ? '⌘⇧Z' : 'Ctrl+Shift+Z';
  if (id === 'dismissHint') return 'Esc';
  return `⇧${keyName(id)}`;
}

/**
 * The `aria-keyshortcuts` value for a control.
 *
 * @param {HotkeyId} id
 * @returns {string}
 */
export function ariaKeyshortcuts(id) {
  if (id === 'undo') return 'Meta+Z Control+Z';
  if (id === 'redo') return 'Meta+Shift+Z Control+Shift+Z Control+Y';
  if (id === 'dismissHint') return 'Escape';
  return `Shift+${keyName(id)}`;
}

/**
 * Whether to show Apple key symbols.
 *
 * @param {{ platform?: string, userAgentData?: { platform?: string } }} navigatorLike
 * @returns {boolean}
 */
export function isMacPlatform(navigatorLike) {
  const platform = navigatorLike.userAgentData?.platform ?? navigatorLike.platform ?? '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}
