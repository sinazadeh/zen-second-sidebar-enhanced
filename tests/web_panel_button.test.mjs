import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("a setting chooses the panel button's middle-click action", async () => {
  const source = await readFile(
    new URL("../src/second_sidebar/controllers/web_panel.mjs", import.meta.url),
    "utf8",
  );
  const middleClick = source.match(
    /if \(!isMiddleMouseButton\(event\)\) return;([\s\S]*?)\n {4}\}\);/,
  );
  assert.ok(middleClick, "panel button has a middle-click handler");
  assert.match(middleClick[1], /getWebPanelMiddleClickAction\(\)/);
  assert.match(middleClick[1], /===\s*"unload"/);
  assert.match(middleClick[1], /this\.openInNewTab\(true\)/);
  assert.match(middleClick[1], /this\.unload\(\)/);
});
