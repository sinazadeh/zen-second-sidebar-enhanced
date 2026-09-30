import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const {
  MAX_MAP_LINES,
  MAX_SKILL_BYTES,
  findRelativeLinks,
  hasUnframedArguments,
  lintAgentConfig,
  parseFrontmatter,
} = await import("../scripts/lint_agent_config.mjs");

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SKILL = `---
name: sb2-example
description: Example rules. Use when changing the example.
---

# Example

See [the details](references/details.md).
`;

const AGENT = `---
name: sb2-helper
description: Helps. Use PROACTIVELY after changing anything.
model: haiku
tools: Read, Grep
---

You help.
`;

const COMMAND = `---
description: Runs the helper.
argument-hint: "[target]"
---

<user_request>
$ARGUMENTS
</user_request>

Delegate to [the helper](../agents/sb2-helper.md).
`;

const MAP = `# Map

- [sb2-example](.claude/skills/sb2-example/SKILL.md)
- [sb2-helper](.claude/agents/sb2-helper.md)
- [/sb2-run](.claude/commands/sb2-run.md)
`;

/**
 * Writes a minimal valid configuration, with `overrides` (path → content,
 * or null to leave a file out) applied, into a fresh temporary directory.
 *
 * @param {Record<string, string | null>} overrides
 * @returns {string} the directory
 */
function makeRepo(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "agent-config-"));
  const files = {
    "AGENTS.md": MAP,
    ".claude/skills/sb2-example/SKILL.md": SKILL,
    ".claude/skills/sb2-example/references/details.md": "# Details\n",
    ".claude/agents/sb2-helper.md": AGENT,
    ".claude/commands/sb2-run.md": COMMAND,
    ...overrides,
  };
  for (const [path, content] of Object.entries(files)) {
    if (content === null) {
      continue;
    }
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

/**
 * @param {Record<string, string | null>} overrides
 * @returns {string[]} the findings as "file: message"
 */
function lint(overrides) {
  const root = makeRepo(overrides);
  try {
    return lintAgentConfig(root).map(
      ({ file, message }) => `${file}: ${message}`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("the repository's own agent config passes", () => {
  assert.deepEqual(lintAgentConfig(REPO_ROOT), []);
});

test("a minimal valid config passes", () => {
  assert.deepEqual(lint({}), []);
});

test("parses flat frontmatter, with or without CRLF line endings", () => {
  for (const eol of ["\n", "\r\n"]) {
    const parsed = parseFrontmatter(AGENT.replace(/\n/g, eol));
    assert.equal(parsed.fields.name, "sb2-helper");
    assert.equal(parsed.fields.model, "haiku");
    assert.equal(parsed.body.trim(), "You help.");
    assert.deepEqual(parsed.invalidLines, []);
  }
  assert.equal(
    parseFrontmatter(COMMAND).fields["argument-hint"],
    "[target]",
    "surrounding quotes are removed",
  );
  assert.equal(parseFrontmatter("# No frontmatter\n"), null);
  assert.deepEqual(
    parseFrontmatter("---\nname: a\n  - nested\n---\n").invalidLines,
    ["  - nested"],
  );
});

test("finds relative links outside code, without their fragment", () => {
  const markdown = [
    "[skill](.claude/skills/x/SKILL.md#rules) and [site](https://example.com)",
    "[anchor](#top), [mail](mailto:a@example.com), `[code](nope.md)`",
    "[spaced](my%20file.md)",
    "```md",
    "[fenced](nope.md)",
    "```",
  ].join("\n");
  assert.deepEqual(findRelativeLinks(markdown), [
    ".claude/skills/x/SKILL.md",
    "my file.md",
  ]);
});

test("$ARGUMENTS must be framed as data in commands", () => {
  assert.equal(hasUnframedArguments("Do this: $ARGUMENTS"), true);
  assert.equal(
    hasUnframedArguments("<user_request>\n$ARGUMENTS\n</user_request>"),
    false,
  );
  assert.equal(hasUnframedArguments("Parse `$ARGUMENTS` for flags."), false);
  assert.equal(
    hasUnframedArguments('```json\n{ "target": "$ARGUMENTS" }\n```'),
    false,
  );
});

test("names must match their file or directory and carry the prefix", () => {
  assert.deepEqual(
    lint({
      ".claude/agents/sb2-helper.md": AGENT.replace(
        "name: sb2-helper",
        "name: helper",
      ),
    }),
    [
      '.claude/agents/sb2-helper.md: name "helper" must match its file name "sb2-helper"',
    ],
  );
  assert.deepEqual(
    lint({
      "AGENTS.md": MAP.replace(/sb2-run/g, "run"),
      ".claude/commands/sb2-run.md": null,
      ".claude/commands/run.md": COMMAND,
    }),
    ['.claude/commands/run.md: command name "run" must start with "sb2-"'],
  );
});

test("descriptions need a trigger phrase, models a known alias", () => {
  assert.deepEqual(
    lint({
      ".claude/skills/sb2-example/SKILL.md": SKILL.replace(
        " Use when changing the example.",
        "",
      ),
      ".claude/agents/sb2-helper.md": AGENT.replace("haiku", "gpt"),
    }),
    [
      '.claude/skills/sb2-example/SKILL.md: description needs a trigger phrase such as "Use when …" or "Use PROACTIVELY after …"',
      ".claude/agents/sb2-helper.md: model must be one of inherit, haiku, sonnet, opus, fable",
    ],
  );
});

test("reports broken links, unlinked references and gaps in the map", () => {
  assert.deepEqual(
    lint({
      "AGENTS.md": MAP.replace(
        "- [sb2-helper](.claude/agents/sb2-helper.md)\n",
        "",
      ),
      ".claude/skills/sb2-example/references/unused.md": "# Unused\n",
      ".claude/commands/sb2-run.md": COMMAND.replace(
        "../agents/sb2-helper.md",
        "../agents/missing.md",
      ),
    }),
    [
      ".claude/skills/sb2-example/references/unused.md: not linked from its skill, so no agent will find it",
      ".claude/commands/sb2-run.md: broken link: ../agents/missing.md",
      "AGENTS.md: doesn't link .claude/agents/sb2-helper.md",
    ],
  );
});

test("enforces the map's and skills' size budgets", () => {
  assert.deepEqual(
    lint({
      "AGENTS.md": MAP + "\n".repeat(MAX_MAP_LINES),
      ".claude/skills/sb2-example/SKILL.md":
        SKILL + "x".repeat(MAX_SKILL_BYTES),
    }),
    [
      `.claude/skills/sb2-example/SKILL.md: SKILL.md is ${
        Buffer.byteLength(SKILL) + MAX_SKILL_BYTES
      } bytes (max ${MAX_SKILL_BYTES}); move detail into references/`,
      `AGENTS.md: ${MAP.split("\n").length - 1 + MAX_MAP_LINES} lines (max ${MAX_MAP_LINES}); move detail into a skill`,
    ],
  );
});

test("a command can't take a skill's slash name, nor use $ARGUMENTS bare", () => {
  assert.deepEqual(
    lint({
      "AGENTS.md": MAP.replace(/sb2-run/g, "sb2-example"),
      ".claude/commands/sb2-run.md": null,
      ".claude/commands/sb2-example.md": COMMAND.replace(
        "<user_request>\n$ARGUMENTS\n</user_request>",
        "Target: $ARGUMENTS",
      ),
    }),
    [
      '.claude/commands/sb2-example.md: command "/sb2-example" collides with the skill of that name',
      ".claude/commands/sb2-example.md: $ARGUMENTS outside a <user_request> block or code span reads as instructions",
    ],
  );
});
