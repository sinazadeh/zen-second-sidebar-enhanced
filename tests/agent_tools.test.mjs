import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validateAgentToolsManifest } from "../scripts/setup_agent_tools.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  await readFile(resolve(repositoryRoot, "agent-tools.json"), "utf8"),
);

test("agent tool sources are pinned and valid", () => {
  assert.deepEqual(validateAgentToolsManifest(manifest), []);
  assert.equal(manifest.skillSources.length, 2);
  assert.equal(
    manifest.skillSources.flatMap((source) => source.skills).length,
    3,
  );
});

test("the repository design guide covers its supported environments", async () => {
  const design = await readFile(resolve(repositoryRoot, "DESIGN.md"), "utf8");
  assert.match(design, /Firefox and Zen/);
  assert.match(design, /light and dark/);
  assert.match(design, /keyboard/);
  assert.match(design, /scripts\/check_settings_page_browser\.mjs/);
});

test("Playwright is pinned to an exact version", () => {
  assert.equal(manifest.playwright.package, "playwright");
  assert.match(manifest.playwright.version, /^\d+\.\d+\.\d+$/);
});
