// Canonical labels for the physical writing-system keys defined by UI Events.
const KEY_LABELS_BY_CODE = {
  Backquote: ["`", "~"],
  Digit1: ["1", "!"],
  Digit2: ["2", "@"],
  Digit3: ["3", "#"],
  Digit4: ["4", "$"],
  Digit5: ["5", "%"],
  Digit6: ["6", "^"],
  Digit7: ["7", "&"],
  Digit8: ["8", "*"],
  Digit9: ["9", "("],
  Digit0: ["0", ")"],
  Minus: ["-", "_"],
  Equal: ["=", "+"],
  BracketLeft: ["[", "{"],
  BracketRight: ["]", "}"],
  Backslash: ["\\", "|"],
  Semicolon: [";", ":"],
  Quote: ["'", '"'],
  Comma: [",", "<"],
  Period: [".", ">"],
  Slash: ["/", "?"],
};

/**
 * Returns a stable label for a physical key, independent of keyboard layout.
 *
 * @param {KeyboardEvent} event
 * @returns {string}
 */
export function getLayoutIndependentKey(event) {
  if (/^Key[A-Z]$/.test(event.code)) {
    return event.code.slice(3);
  }

  const labels = KEY_LABELS_BY_CODE[event.code];
  if (labels) {
    return labels[Number(event.shiftKey)];
  }

  if (/^Intl[A-Za-z]+$/.test(event.code)) {
    return event.code;
  }

  // Some synthetic or unidentified key events do not provide a code.
  return event.key.toUpperCase();
}

/**
 * A key combination as its parts ("Ctrl", "Shift", "K"...), as shortcuts
 * are saved: modifiers in a fixed order, then the key.
 *
 * @param {KeyboardEvent} event
 * @returns {string[]}
 */
export function getShortcutPartsFromEvent(event) {
  const parts = [];
  if (event.altKey) parts.push("Alt");
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.metaKey) parts.push("Meta");
  if (event.shiftKey) parts.push("Shift");
  parts.push(getLayoutIndependentKey(event));
  return parts;
}

/**
 * Keeps shortcuts saved with a layout-dependent key working in that layout.
 *
 * @param {KeyboardEvent} event
 * @returns {string[]}
 */
function getLayoutDependentShortcutPartsFromEvent(event) {
  const parts = getShortcutPartsFromEvent(event);
  parts[parts.length - 1] = event.key.toUpperCase();
  return parts;
}

/**
 * A saved shortcut ("Ctrl+Shift+K") as its parts.
 *
 * @param {string} shortcut
 * @returns {string[]}
 */
export function getShortcutPartsFromShortcut(shortcut) {
  const parts = shortcut.split("+");
  // "+" is both the separator and a valid key label.
  const lastIndex = parts.length - 1;
  if (parts[lastIndex] === "" && parts[lastIndex - 1] === "") {
    parts.splice(-2, 2, "+");
  }
  return parts;
}

/**
 * @param {string} shortcut a saved shortcut, "" for none
 * @param {KeyboardEvent} event
 * @returns {boolean}
 */
export function isShortcutPressed(shortcut, event) {
  if (shortcut.length === 0) return false;
  const shortcutParts = getShortcutPartsFromShortcut(shortcut);
  return (
    haveSameParts(shortcutParts, getShortcutPartsFromEvent(event)) ||
    haveSameParts(
      shortcutParts,
      getLayoutDependentShortcutPartsFromEvent(event),
    )
  );
}

/**
 * @param {string[]} lhs
 * @param {string[]} rhs
 * @returns {boolean}
 */
function haveSameParts(lhs, rhs) {
  return JSON.stringify([...lhs].sort()) === JSON.stringify([...rhs].sort());
}
