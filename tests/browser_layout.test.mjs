import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BROWSER_CONTAINER_SELECTOR,
  BROWSER_CONTAINER_SELECTORS,
  findBrowserContainerElement,
  requireBrowserContainerElement,
} from "../src/second_sidebar/utils/browser_layout.mjs";

test("findBrowserContainerElement prefers Zen's container when it exists", () => {
  const zenContainer = { id: "zen" };
  const browserContainer = { id: "browser" };
  const seen = [];
  const root = {
    querySelector(selector) {
      seen.push(selector);
      return selector === "#zen-tabbox-wrapper"
        ? zenContainer
        : browserContainer;
    },
  };

  assert.equal(findBrowserContainerElement(root), zenContainer);
  assert.deepEqual(seen, [BROWSER_CONTAINER_SELECTORS[0]]);
});

test("findBrowserContainerElement falls back to Firefox's browser container", () => {
  const browserContainer = { id: "browser" };
  const root = {
    querySelector(selector) {
      return selector === "#browser" ? browserContainer : null;
    },
  };

  assert.equal(findBrowserContainerElement(root), browserContainer);
});

test("requireBrowserContainerElement throws a helpful error when neither exists", () => {
  assert.throws(
    () => requireBrowserContainerElement({ querySelector: () => null }),
    new Error(
      `Second Sidebar could not find a browser container (${BROWSER_CONTAINER_SELECTOR})`,
    ),
  );
});
