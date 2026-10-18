import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const theme = JSON.parse(await read("theme.json"));

test("updatedAt is a full UTC timestamp", () => {
  // Sine offers an update when updatedAt is newer than the installed copy's,
  // not when version is, so two releases on one day must still differ.
  assert.match(theme.updatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.ok(!Number.isNaN(Date.parse(theme.updatedAt)));
});

test("version and updatedAt move with the latest changelog release", async () => {
  const changelog = await read("CHANGELOG.md");
  const [, latest, date] = changelog.match(/^## \[(\d[^\]]*)\] - (\S+)/m);
  assert.equal(theme.version, latest, "latest CHANGELOG.md release");
  assert.equal(theme.updatedAt.slice(0, 10), date, "date of that release");
});
