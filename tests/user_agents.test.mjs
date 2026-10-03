import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CUSTOM_USER_AGENT,
  DEFAULT_USER_AGENT,
  FIREFOX_MOBILE_USER_AGENT,
  getUserAgentChoices,
  isUserAgentId,
  resolveUserAgent,
  sanitizeUserAgent,
} from "../src/second_sidebar/utils/user_agents.mjs";

test("the choices run from Default through the presets to Custom", () => {
  const choices = getUserAgentChoices();
  assert.deepEqual(
    choices.map((choice) => choice.id),
    [
      DEFAULT_USER_AGENT,
      FIREFOX_MOBILE_USER_AGENT,
      "galaxy-phone",
      "galaxy-tab",
      "iphone",
      CUSTOM_USER_AGENT,
    ],
  );
  for (const { id, label } of choices) {
    assert.ok(label, id);
    assert.ok(isUserAgentId(id), id);
  }
  assert.equal(isUserAgentId("mobile"), false);
  assert.equal(isUserAgentId(undefined), false);
});

test("Default sends the browser's own user agent", () => {
  assert.equal(resolveUserAgent(DEFAULT_USER_AGENT, "x", "149.0"), "");
  // Unknown ids (from a newer version, say) too.
  assert.equal(resolveUserAgent("pager", "x", "149.0"), "");
});

test("Firefox Mobile follows the running browser's version", () => {
  assert.equal(
    resolveUserAgent(FIREFOX_MOBILE_USER_AGENT, "", "151.0.2"),
    "Mozilla/5.0 (Android 16; Mobile; rv:151.0) Gecko/151.0 Firefox/151.0",
  );
  assert.match(
    resolveUserAgent(FIREFOX_MOBILE_USER_AGENT, "", "unknown"),
    /^Mozilla\/5\.0 \(Android \d+; Mobile; rv:\d+\.0\) Gecko\/\d+\.0 Firefox\/\d+\.0$/,
  );
});

test("the device presets look like their browsers", () => {
  const phone = resolveUserAgent("galaxy-phone", "", "149.0");
  const tab = resolveUserAgent("galaxy-tab", "", "149.0");
  const iphone = resolveUserAgent("iphone", "", "149.0");
  assert.match(phone, /SamsungBrowser\/[\d.]+ Chrome\/[\d.]+ Mobile Safari/);
  // Sites tell tablets from phones by the "Mobile" token.
  assert.match(tab, /SamsungBrowser\/[\d.]+ Chrome\/[\d.]+ Safari/);
  assert.doesNotMatch(tab, /Mobile/);
  assert.match(iphone, /^Mozilla\/5\.0 \(iPhone; .* Mobile\/\w+ Safari/);
});

test("Custom sends the custom string, cleaned up", () => {
  assert.equal(
    resolveUserAgent(CUSTOM_USER_AGENT, "  MyAgent/1.0 ", "149.0"),
    "MyAgent/1.0",
  );
  // An empty one leaves the browser's own.
  assert.equal(resolveUserAgent(CUSTOM_USER_AGENT, "", "149.0"), "");
  assert.equal(
    sanitizeUserAgent("Agent/1.0\r\nX-Injected: 1\u0000"),
    "Agent/1.0 X-Injected: 1",
  );
  assert.equal(sanitizeUserAgent(42), "");
  assert.equal(sanitizeUserAgent(undefined), "");
});
