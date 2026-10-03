import assert from "node:assert/strict";
import { test } from "node:test";

import { canOpenTabAsWebPanel } from "../src/second_sidebar/utils/tab_url.mjs";

test("tabs showing a page can be opened as a web panel", () => {
  for (const url of [
    "https://example.com/inbox",
    "http://localhost:8080/",
    "file:///home/me/notes.html",
    "moz-extension://uuid/popup/index.html#/tabs/vault",
    "about:config",
    "about:preferences#privacy",
  ]) {
    assert.equal(canOpenTabAsWebPanel(url), true, url);
  }
});

test("empty tabs and other pages can't", () => {
  for (const url of [
    "about:blank",
    "about:newtab",
    "about:home",
    "about:home?source=x",
    "about:privatebrowsing",
    "chrome://browser/content/browser.xhtml",
    "data:text/html,hi",
    "javascript:alert(1)",
    "view-source:https://example.com/",
    "not a url",
    "",
    undefined,
    null,
  ]) {
    assert.equal(canOpenTabAsWebPanel(url), false, String(url));
  }
});
