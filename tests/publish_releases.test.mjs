import assert from "node:assert/strict";
import { test } from "node:test";

const {
  compareVersions,
  extractReleaseNotes,
  formatTagCommands,
  hasReleaseNotes,
  planReleases,
} = await import("../scripts/publish_releases.mjs");

const CHANGELOG = `# Changelog

Intro.

## [Unreleased]

## [1.10.0] - 2026-09-29

### Added

- Ten.

## [1.2.0] - 2026-09-24

### Fixed

- Two.
`;

test("extracts a version's notes up to the next section", () => {
  assert.equal(extractReleaseNotes(CHANGELOG, "1.10.0"), "### Added\n\n- Ten.");
  assert.equal(extractReleaseNotes(CHANGELOG, "1.2.0"), "### Fixed\n\n- Two.");
  assert.equal(extractReleaseNotes(CHANGELOG, "Unreleased"), "");
  assert.equal(extractReleaseNotes(CHANGELOG, "1.1.0"), "");
  // "1.1" must not match the heading of 1.10.0.
  assert.equal(extractReleaseNotes(CHANGELOG, "1.1"), "");
});

test("a commit is a version as released only with nothing unreleased", () => {
  assert.equal(hasReleaseNotes(CHANGELOG, "1.10.0"), true);
  const pending = CHANGELOG.replace(
    "## [Unreleased]\n",
    "## [Unreleased]\n\n### Fixed\n\n- Not yet.\n",
  );
  assert.equal(hasReleaseNotes(pending, "1.10.0"), false);
  assert.equal(hasReleaseNotes(CHANGELOG, "1.1.0"), false);
});

test("compares versions numerically", () => {
  const sorted = ["1.10.0", "1.2.0", "1.2.10", "1.2.2", "2.0"].sort(
    compareVersions,
  );
  assert.deepEqual(sorted, ["1.2.0", "1.2.2", "1.2.10", "1.10.0", "2.0"]);
});

const history = [
  { sha: "a0", version: null, hasNotes: false },
  { sha: "a1", version: "1.0.0", hasNotes: false },
  // Bumped, then notes landed in a later commit (with the version unchanged).
  { sha: "b1", version: "1.1.0", hasNotes: false },
  { sha: "b2", version: "1.1.0", hasNotes: true },
  { sha: "b3", version: "1.1.0", hasNotes: true },
  { sha: "c1", version: "1.2.0", hasNotes: true },
  { sha: "c2", version: "1.2.0", hasNotes: true },
];

test("releases each version at its first commit with notes, or its first commit", () => {
  assert.deepEqual(planReleases(history, new Set(), new Map()), [
    { version: "1.0.0", tag: "v1.0.0", sha: "a1", latest: false },
    { version: "1.1.0", tag: "v1.1.0", sha: "b2", latest: false },
    { version: "1.2.0", tag: "v1.2.0", sha: "c1", latest: true },
  ]);
});

test("skips released versions and keeps existing tags where they are", () => {
  const plan = planReleases(
    history,
    new Set(["v1.2.0"]),
    new Map([["v1.1.0", "b3"]]),
  );
  assert.deepEqual(plan, [
    { version: "1.0.0", tag: "v1.0.0", sha: "a1", latest: false },
    { version: "1.1.0", tag: "v1.1.0", sha: "b3", latest: false },
  ]);
});

test("nothing to do once every version is released", () => {
  assert.deepEqual(
    planReleases(history, new Set(["v1.0.0", "v1.1.0", "v1.2.0"]), new Map()),
    [],
  );
});

test("tag commands create every tag and push them in one push", () => {
  assert.equal(
    formatTagCommands([
      { tag: "v1.0.0", sha: "a1" },
      { tag: "v1.1.0", sha: "b2" },
    ]),
    "git tag v1.0.0 a1\ngit tag v1.1.0 b2\ngit push origin v1.0.0 v1.1.0",
  );
});
