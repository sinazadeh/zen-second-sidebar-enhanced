import assert from "node:assert/strict";
import { test } from "node:test";

// NetUtil.newURI, as much of it as extractHostname reads.
globalThis.NetUtil = {
  newURI: (spec) => {
    const url = new URL(spec);
    return { scheme: url.protocol.slice(0, -1), host: url.hostname, spec };
  },
};

const { clearUrl, extractHostname } =
  await import("../src/second_sidebar/utils/url.mjs");

test("clearUrl drops the scheme and a trailing slash", () => {
  assert.equal(clearUrl("https://example.com/"), "example.com");
  assert.equal(clearUrl("http://example.com/a/b/"), "example.com/a/b");
  assert.equal(clearUrl("https://example.com/a?b=1"), "example.com/a?b=1");
  assert.equal(clearUrl("about:config"), "about:config");
});

test("extractHostname gives the host of http(s) URLs, other URLs whole", () => {
  assert.equal(
    extractHostname("https://mail.example.com/inbox"),
    "mail.example.com",
  );
  assert.equal(extractHostname("http://localhost:8080/"), "localhost");
  assert.equal(extractHostname("about:config"), "about:config");
  assert.equal(
    extractHostname("moz-extension://uuid/popup.html"),
    "moz-extension://uuid/popup.html",
  );
});
