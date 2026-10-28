import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseFirefoxVersion,
  parseSafariVersion,
  parseSamsungVersions,
} from "../scripts/update_user_agents.mjs";

test("reads Firefox's current stable major from Mozilla's release data", () => {
  assert.equal(
    parseFirefoxVersion('{"LATEST_FIREFOX_VERSION":"159.0.1"}'),
    159,
  );
});

test("chooses the newest Safari feature release in the WebKit feed", () => {
  const feed = `
    <title>WebKit Features for Safari 27.1</title>
    <title>WebKit Features for Safari 27.2</title>
    <title>WebKit Features for Safari 26.6</title>`;
  assert.equal(parseSafariVersion(feed), "27.2");
});

test("pairs Samsung's newest major with its Chromium engine", () => {
  const page = `
    Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko)
    SamsungBrowser/30.0 Chrome/143.0.0.0 Mobile Safari/537.36
    Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko)
    SamsungBrowser/31.0 Chrome/148.0.0.0 Mobile Safari/537.36`;
  assert.deepEqual(parseSamsungVersions(page), {
    browser: "31.0",
    chromium: "148",
  });
});

test("release parsers fail closed when an upstream format changes", () => {
  assert.throws(() => parseFirefoxVersion("{}"), /Firefox release is invalid/);
  assert.throws(() => parseSafariVersion("no releases"), /No Safari release/);
  assert.throws(
    () =>
      parseSamsungVersions(
        "SamsungBrowser/31.0 without a complete reduced Android user agent",
      ),
    /No reduced Samsung Internet/,
  );
});
