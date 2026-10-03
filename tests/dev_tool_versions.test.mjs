// There's no package.json (see the sb2-ci-workflows skill), so the lint and
// format tools' versions are written out wherever they're installed. They
// have to agree, or a newer local Prettier or ESLint flags files that CI
// wouldn't, or the other way round.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const SETUP_COMMAND = /npm install --no-save --package-lock=false [^`\n]+/g;
// "name@version", scoped names included.
const PACKAGE_SPEC = /(?<![\w@/])(@?[a-z][\w.-]*(?:\/[\w.-]+)?)@(\d[\w.-]*)/g;

/**
 * @param {string} path relative to the repository root
 * @returns {string}
 */
function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

/**
 * @param {string} text
 * @returns {Object<string, string>} version by package name
 */
function packageVersions(text) {
  return Object.fromEntries(
    [...text.matchAll(PACKAGE_SPEC)].map(([, name, version]) => [
      name,
      version,
    ]),
  );
}

/**
 * The local setup command written in `path`, which must have exactly one.
 *
 * @param {string} path
 * @returns {Object<string, string>} version by package name
 */
function setupCommandVersions(path) {
  const commands = read(path).match(SETUP_COMMAND) ?? [];
  assert.equal(commands.length, 1, `${path} has one setup command`);
  return packageVersions(commands[0]);
}

const local = setupCommandVersions("AGENTS.md");

test("the local setup command pins the lint and format tools", () => {
  assert.deepEqual(Object.keys(local).sort(), [
    "@eslint/js",
    "eslint",
    "globals",
    "prettier",
  ]);
});

test("the local setup command is the same wherever it's written", () => {
  for (const path of [
    "CONTRIBUTING.md",
    ".claude/agents/sb2-checks-runner.md",
  ]) {
    assert.deepEqual(setupCommandVersions(path), local, path);
  }
});

test("CI installs the versions the local setup command pins", () => {
  const eslint = packageVersions(read(".github/workflows/eslint.yml"));
  for (const name of ["eslint", "@eslint/js", "globals"]) {
    assert.equal(eslint[name], local[name], `eslint.yml: ${name}`);
  }

  const prettier = read(".github/workflows/prettier.yml").match(
    /prettier_version:\s*(\S+)/,
  );
  assert.equal(prettier?.[1], local.prettier, "prettier.yml");
});
