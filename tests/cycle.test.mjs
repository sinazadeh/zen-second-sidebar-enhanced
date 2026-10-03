import assert from "node:assert/strict";
import { test } from "node:test";

import { getAdjacentIndex } from "../src/second_sidebar/utils/cycle.mjs";

test("getAdjacentIndex steps through the list and wraps around", () => {
  assert.equal(getAdjacentIndex(0, 3, 1), 1);
  assert.equal(getAdjacentIndex(2, 3, 1), 0);
  assert.equal(getAdjacentIndex(1, 3, -1), 0);
  assert.equal(getAdjacentIndex(0, 3, -1), 2);
  assert.equal(getAdjacentIndex(0, 1, 1), 0);
  assert.equal(getAdjacentIndex(0, 1, -1), 0);
});

test("getAdjacentIndex starts at an end when nothing is selected", () => {
  assert.equal(getAdjacentIndex(-1, 3, 1), 0);
  assert.equal(getAdjacentIndex(-1, 3, -1), 2);
  // An index past the end (a list that shrank) counts as nothing selected.
  assert.equal(getAdjacentIndex(5, 3, 1), 0);
});

test("getAdjacentIndex has nothing to give for an empty list", () => {
  assert.equal(getAdjacentIndex(-1, 0, 1), null);
  assert.equal(getAdjacentIndex(0, 0, -1), null);
});
