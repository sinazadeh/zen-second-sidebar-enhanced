import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SHORTCUT_INPUT_ATTRIBUTE,
  getLayoutIndependentKey,
  getShortcutPartsFromEvent,
  getShortcutPartsFromShortcut,
  isShortcutInputEvent,
  isShortcutPressed,
} from "../src/second_sidebar/utils/keyboard.mjs";

/**
 * @param {object} fields
 * @returns {object} enough of a KeyboardEvent for these functions
 */
function keyEvent(fields) {
  return {
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...fields,
  };
}

test("keys are named by their position, not the layout", () => {
  // "K" on QWERTY, "Л" on a Russian layout.
  assert.equal(
    getLayoutIndependentKey(keyEvent({ code: "KeyK", key: "л" })),
    "K",
  );
  assert.equal(
    getLayoutIndependentKey(
      keyEvent({ code: "Digit1", key: "!", shiftKey: true }),
    ),
    "!",
  );
  assert.equal(
    getLayoutIndependentKey(keyEvent({ code: "Slash", key: "/" })),
    "/",
  );
  assert.equal(
    getLayoutIndependentKey(keyEvent({ code: "IntlBackslash", key: "<" })),
    "IntlBackslash",
  );
  // Without a code (some synthetic events), the key itself.
  assert.equal(
    getLayoutIndependentKey(keyEvent({ code: "", key: "f5" })),
    "F5",
  );
});

test("an event's shortcut lists its modifiers in a fixed order", () => {
  assert.deepEqual(
    getShortcutPartsFromEvent(
      keyEvent({
        code: "KeyK",
        key: "k",
        shiftKey: true,
        ctrlKey: true,
        altKey: true,
      }),
    ),
    ["Alt", "Ctrl", "Shift", "K"],
  );
});

test("a saved shortcut splits into its parts, '+' key included", () => {
  assert.deepEqual(getShortcutPartsFromShortcut("Ctrl+Shift+K"), [
    "Ctrl",
    "Shift",
    "K",
  ]);
  assert.deepEqual(getShortcutPartsFromShortcut("Ctrl++"), ["Ctrl", "+"]);
});

test("isShortcutPressed matches modifiers in any order", () => {
  const event = keyEvent({
    code: "KeyK",
    key: "k",
    ctrlKey: true,
    shiftKey: true,
  });
  assert.equal(isShortcutPressed("Ctrl+Shift+K", event), true);
  assert.equal(isShortcutPressed("Shift+Ctrl+K", event), true);
  assert.equal(isShortcutPressed("Ctrl+K", event), false);
  assert.equal(isShortcutPressed("Ctrl+Shift+L", event), false);
  // No shortcut set.
  assert.equal(isShortcutPressed("", event), false);
});

test("a shortcut saved with a layout's own key still works in that layout", () => {
  // Saved by an older version as the typed character.
  const event = keyEvent({ code: "KeyK", key: "л", altKey: true });
  assert.equal(isShortcutPressed("Alt+K", event), true);
  assert.equal(isShortcutPressed("Alt+Л", event), true);
});

test("Escape can be a shortcut, alone or with modifiers", () => {
  const escape = keyEvent({ code: "Escape", key: "Escape" });
  assert.deepEqual(getShortcutPartsFromEvent(escape), ["ESCAPE"]);
  assert.equal(isShortcutPressed("ESCAPE", escape), true);
  assert.equal(isShortcutPressed("Ctrl+ESCAPE", escape), false);
  assert.equal(
    isShortcutPressed(
      "Ctrl+ESCAPE",
      keyEvent({ code: "Escape", key: "Escape", ctrlKey: true }),
    ),
    true,
  );
});

test("a shortcut field is recognized from any element inside it", () => {
  const field = {
    closest: (selector) =>
      selector === `[${SHORTCUT_INPUT_ATTRIBUTE}]` ? field : null,
  };
  const other = { closest: () => null };
  assert.equal(isShortcutInputEvent({ target: field }), true);
  assert.equal(isShortcutInputEvent({ target: other }), false);
  // Events from a window or document have no closest().
  assert.equal(isShortcutInputEvent({ target: {} }), false);
  assert.equal(isShortcutInputEvent({ target: null }), false);
});
