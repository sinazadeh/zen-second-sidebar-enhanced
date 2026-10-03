import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getNewWebPanelSpaces,
  isWebPanelInSpace,
} from "../src/second_sidebar/utils/spaces.mjs";

const SPACES = ["work", "home", "study"];

test("a panel without spaces shows in all of them", () => {
  assert.equal(isWebPanelInSpace([], "work", SPACES), true);
});

test("a panel limited to spaces shows only in those", () => {
  assert.equal(isWebPanelInSpace(["work", "study"], "work", SPACES), true);
  assert.equal(isWebPanelInSpace(["work", "study"], "home", SPACES), false);
});

test("without spaces, every panel shows", () => {
  assert.equal(isWebPanelInSpace(["work"], null, SPACES), true);
  assert.equal(isWebPanelInSpace(["work"], "", []), true);
});

test("a panel whose spaces were all deleted shows everywhere", () => {
  assert.equal(isWebPanelInSpace(["gone"], "home", SPACES), true);
  // One left is enough to keep it to that one.
  assert.equal(isWebPanelInSpace(["gone", "work"], "home", SPACES), false);
});

test("new panels start in all spaces, or the current one if set to", () => {
  assert.deepEqual(getNewWebPanelSpaces("all", "work"), []);
  assert.deepEqual(getNewWebPanelSpaces("current", "work"), ["work"]);
  // Without spaces (Firefox), there's no current one to start in.
  assert.deepEqual(getNewWebPanelSpaces("current", null), []);
});
