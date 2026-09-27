import assert from "node:assert/strict";
import { mock, test } from "node:test";

const { KeyedTimeouts } =
  await import("../src/second_sidebar/utils/keyed_timeouts.mjs");

test("restarting one key's timer doesn't cancel another key's", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const timeouts = new KeyedTimeouts();
  const ran = [];

  timeouts.set("panel-a", () => ran.push("a"), 500);
  t.mock.timers.tick(200);
  timeouts.set("panel-b", () => ran.push("b"), 500);
  t.mock.timers.tick(300);
  assert.deepEqual(ran, ["a"]);

  t.mock.timers.tick(200);
  assert.deepEqual(ran, ["a", "b"]);
  assert.equal(timeouts.has("panel-a"), false);
});

test("restarting a key's timer debounces it", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const timeouts = new KeyedTimeouts();
  const callback = mock.fn();

  timeouts.set("panel", callback, 500);
  t.mock.timers.tick(400);
  timeouts.set("panel", callback, 500);
  t.mock.timers.tick(400);
  assert.equal(callback.mock.callCount(), 0);

  t.mock.timers.tick(100);
  assert.equal(callback.mock.callCount(), 1);
});

test("clear cancels only that key's pending callback", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const timeouts = new KeyedTimeouts();
  const ran = [];

  timeouts.set("deleted", () => ran.push("deleted"), 100);
  timeouts.set("kept", () => ran.push("kept"), 100);
  timeouts.clear("deleted");
  timeouts.clear("never-set");
  t.mock.timers.tick(100);
  assert.deepEqual(ran, ["kept"]);
});
