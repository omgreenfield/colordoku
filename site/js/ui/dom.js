/**
 * Finds an element the page markup guarantees, failing loudly when it is missing or the wrong kind.
 *
 * @template {Element} T
 * @param {string} selector
 * @param {{ new (): T, prototype: T }} type For example `HTMLButtonElement`
 * @returns {T}
 */
export function requireElement(selector, type) {
  const element = document.querySelector(selector);
  if (!(element instanceof type)) throw new Error(`Colordoku expected ${selector} in the page`);
  return element;
}
