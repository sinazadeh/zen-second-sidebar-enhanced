import assert from "node:assert/strict";
import { test } from "node:test";

const { LINK_CLICK_MODIFIERS, matchesLinkClickModifier } =
  await import("../src/second_sidebar/utils/link_click.mjs");

const click = (keys = "") => ({
  altKey: keys.includes("alt"),
  shiftKey: keys.includes("shift"),
  ctrlKey: keys.includes("ctrl"),
  metaKey: keys.includes("meta"),
});

test("each setting matches exactly its own keys", () => {
  const combos = ["", "alt", "shift", "ctrl", "meta", "alt+shift"];
  const expected = { off: [], altshift: ["alt+shift"], alt: ["alt"] };
  for (const modifier of LINK_CLICK_MODIFIERS) {
    assert.deepEqual(
      combos.filter((keys) => matchesLinkClickModifier(click(keys), modifier)),
      expected[modifier],
      modifier,
    );
  }
});

test("Ctrl or Meta with the keys still belongs to Firefox", () => {
  // Ctrl+Alt is also AltGr on Windows keyboards.
  for (const extra of ["ctrl", "meta"]) {
    assert.equal(
      matchesLinkClickModifier(click(`alt+shift+${extra}`), "altshift"),
      false,
    );
    assert.equal(matchesLinkClickModifier(click(`alt+${extra}`), "alt"), false);
  }
});

test("unknown settings match nothing", () => {
  assert.equal(matchesLinkClickModifier(click("alt"), "bogus"), false);
  assert.equal(matchesLinkClickModifier(click("alt+shift"), undefined), false);
});
