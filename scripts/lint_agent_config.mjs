// Lints the coding-agent configuration: the AGENTS.md map and the skills,
// subagents and commands under .claude/ that it points to. The layout follows
// wshobson/agents: a short map, skills that hold each area's detail and load
// only when a task needs it, and single-purpose agents on matched models.
// tests/agent_config.test.mjs runs it; to run it on its own:
//
//   node scripts/lint_agent_config.mjs
//
// It checks structure, not wording: frontmatter and names, a trigger phrase
// in each description (what an agent decides by whether to load it), size
// budgets, that relative links resolve, that the map links every skill,
// agent and command, and that commands frame $ARGUMENTS as data.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const MAP_FILE = "AGENTS.md";
export const MAX_MAP_LINES = 150;
// Codex truncates longer SKILL.md files; the rest belongs in references/.
export const MAX_SKILL_BYTES = 8 * 1024;
export const MAX_DESCRIPTION_LENGTH = 1024;
export const MAX_NAME_LENGTH = 64;
// Personal skills and agents take precedence over a project's, so a prefix
// keeps a user's own "code-reviewer" or "release" from shadowing these.
export const NAME_PREFIX = "sb2-";
export const MODELS = ["inherit", "haiku", "sonnet", "opus", "fable"];

const SKILLS_DIR = ".claude/skills";
const AGENTS_DIR = ".claude/agents";
const COMMANDS_DIR = ".claude/commands";
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TRIGGER_PATTERN =
  /\b(Use (PROACTIVELY )?(when|after|before)|Use this (skill|agent) when|Trigger when)\b/;

/**
 * Splits a Markdown file into its YAML frontmatter fields and body. Only the
 * flat `key: value` subset used here is understood; any other line is
 * reported in `invalidLines`.
 *
 * @param {string} text
 * @returns {{fields: Record<string, string>, body: string, invalidLines: string[]} | null}
 *   null if the file doesn't start with a frontmatter block
 */
export function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(normalized);
  if (!match) {
    return null;
  }
  const fields = {};
  const invalidLines = [];
  for (const line of match[1].split("\n")) {
    const field = /^([A-Za-z][\w-]*):(?:\s+(.*))?$/.exec(line);
    if (!field) {
      invalidLines.push(line);
      continue;
    }
    fields[field[1]] = unquote((field[2] ?? "").trim());
  }
  return { fields, body: normalized.slice(match[0].length), invalidLines };
}

/**
 * @param {string} value
 * @returns {string}
 */
function unquote(value) {
  const quoted = /^(["'])(.*)\1$/.exec(value);
  return quoted ? quoted[2] : value;
}

/**
 * Markdown with fenced code blocks and inline code spans removed, so that
 * examples inside them aren't treated as links or prompt text.
 *
 * @param {string} markdown
 * @returns {string}
 */
function stripCode(markdown) {
  return markdown
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "")
    .replace(/`[^`\n]*`/g, "");
}

/**
 * The relative link targets in a Markdown file, without their #fragment.
 * External links (any URL scheme), pure fragments and links inside code are
 * left out.
 *
 * @param {string} markdown
 * @returns {string[]}
 */
export function findRelativeLinks(markdown) {
  const targets = [];
  for (const match of stripCode(markdown).matchAll(
    /\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g,
  )) {
    const target = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) {
      continue;
    }
    const path = target.split("#")[0];
    try {
      targets.push(decodeURI(path));
    } catch {
      targets.push(path);
    }
  }
  return targets;
}

/**
 * Whether a command's body uses $ARGUMENTS as prompt text. Claude Code
 * substitutes it textually, so outside a <user_request> block or a code span
 * the caller's text reads as part of the command's instructions.
 *
 * @param {string} body
 * @returns {boolean}
 */
export function hasUnframedArguments(body) {
  const unframed = stripCode(body).replace(
    /<user_request>[\s\S]*?<\/user_request>/g,
    "",
  );
  return /\$ARGUMENTS\b/.test(unframed);
}

/**
 * @param {string} dir
 * @returns {string[]} files under `dir`, recursively, as absolute paths
 */
function listFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

/**
 * @param {string} dir
 * @returns {string[]} names of the directory's immediate subdirectories
 */
function listDirs(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * @param {string} path
 * @returns {string}
 */
function readText(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

/**
 * Lints the agent configuration of the repository at `root`.
 *
 * @param {string} root repository root
 * @returns {{file: string, message: string}[]} findings, empty when clean
 */
export function lintAgentConfig(root) {
  const findings = [];
  const report = (path, message) =>
    findings.push({
      file: relative(root, path).split("\\").join("/"),
      message,
    });

  const checkName = (path, name, kind) => {
    if (!NAME_PATTERN.test(name) || name.length > MAX_NAME_LENGTH) {
      report(path, `${kind} name "${name}" must be lowercase hyphen-case`);
    }
    if (!name.startsWith(NAME_PREFIX)) {
      report(path, `${kind} name "${name}" must start with "${NAME_PREFIX}"`);
    }
  };

  const checkDescription = (path, description, needsTrigger) => {
    if (!description) {
      report(path, "frontmatter needs a description");
      return;
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      report(
        path,
        `description is ${description.length} characters (max ${MAX_DESCRIPTION_LENGTH})`,
      );
    }
    if (needsTrigger && !TRIGGER_PATTERN.test(description)) {
      report(
        path,
        'description needs a trigger phrase such as "Use when …" or "Use PROACTIVELY after …"',
      );
    }
  };

  const readFrontmatter = (path) => {
    const parsed = parseFrontmatter(readText(path));
    if (!parsed) {
      report(path, "missing frontmatter (--- block at the top)");
      return null;
    }
    for (const line of parsed.invalidLines) {
      report(path, `unsupported frontmatter line: ${JSON.stringify(line)}`);
    }
    return parsed;
  };

  // Everything the map must link to.
  const required = [];
  const slashNames = new Map();

  const skillsDir = join(root, SKILLS_DIR);
  for (const dirName of listDirs(skillsDir)) {
    const skillDir = join(skillsDir, dirName);
    const skillFile = join(skillDir, "SKILL.md");
    if (!existsSync(skillFile)) {
      report(skillDir, "skill directory has no SKILL.md");
      continue;
    }
    required.push(skillFile);
    slashNames.set(dirName, skillFile);
    const parsed = readFrontmatter(skillFile);
    if (!parsed) {
      continue;
    }
    const { name, description } = parsed.fields;
    if (name !== dirName) {
      report(skillFile, `name "${name}" must match its directory "${dirName}"`);
    }
    checkName(skillFile, dirName, "skill");
    checkDescription(skillFile, description, true);
    const size = Buffer.byteLength(readText(skillFile));
    if (size > MAX_SKILL_BYTES) {
      report(
        skillFile,
        `SKILL.md is ${size} bytes (max ${MAX_SKILL_BYTES}); move detail into references/`,
      );
    }

    // Every file under the skill must be reachable from its SKILL.md.
    const skillFiles = listFiles(skillDir).filter((file) => file !== skillFile);
    const linked = new Set();
    for (const file of [skillFile, ...skillFiles]) {
      if (file.endsWith(".md")) {
        for (const target of findRelativeLinks(readText(file))) {
          linked.add(resolve(dirname(file), target));
        }
      }
    }
    for (const file of skillFiles) {
      if (!linked.has(file)) {
        report(file, "not linked from its skill, so no agent will find it");
      }
    }
  }

  const agentsDir = join(root, AGENTS_DIR);
  for (const file of listFiles(agentsDir).filter((f) => f.endsWith(".md"))) {
    required.push(file);
    const stem = basename(file, ".md");
    const parsed = readFrontmatter(file);
    if (!parsed) {
      continue;
    }
    const { name, description, model } = parsed.fields;
    if (name !== stem) {
      report(file, `name "${name}" must match its file name "${stem}"`);
    }
    checkName(file, stem, "agent");
    checkDescription(file, description, true);
    if (!MODELS.includes(model)) {
      report(file, `model must be one of ${MODELS.join(", ")}`);
    }
    if (!parsed.body.trim()) {
      report(file, "agent has no system prompt");
    }
  }

  const commandsDir = join(root, COMMANDS_DIR);
  for (const file of listFiles(commandsDir).filter((f) => f.endsWith(".md"))) {
    required.push(file);
    const stem = basename(file, ".md");
    checkName(file, stem, "command");
    if (slashNames.has(stem)) {
      report(file, `command "/${stem}" collides with the skill of that name`);
    }
    const parsed = readFrontmatter(file);
    if (!parsed) {
      continue;
    }
    checkDescription(file, parsed.fields.description, false);
    if (hasUnframedArguments(parsed.body)) {
      report(
        file,
        "$ARGUMENTS outside a <user_request> block or code span reads as instructions",
      );
    }
  }

  const mapFile = join(root, MAP_FILE);
  const docs = [
    mapFile,
    ...listFiles(join(root, ".claude")).filter((f) => f.endsWith(".md")),
  ].filter((file) => existsSync(file));
  for (const file of docs) {
    for (const target of findRelativeLinks(readText(file))) {
      if (!existsSync(resolve(dirname(file), target))) {
        report(file, `broken link: ${target}`);
      }
    }
  }

  if (existsSync(mapFile)) {
    const map = readText(mapFile);
    const lines = map.endsWith("\n")
      ? map.split("\n").length - 1
      : map.split("\n").length;
    if (lines > MAX_MAP_LINES) {
      report(
        mapFile,
        `${lines} lines (max ${MAX_MAP_LINES}); move detail into a skill`,
      );
    }
    const mapped = new Set(
      findRelativeLinks(map).map((target) => resolve(root, target)),
    );
    for (const file of required) {
      if (!mapped.has(file)) {
        report(
          mapFile,
          `doesn't link ${relative(root, file).split("\\").join("/")}`,
        );
      }
    }
  } else if (required.length > 0) {
    report(mapFile, "missing: it's the map to the skills, agents and commands");
  }

  return findings;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const findings = lintAgentConfig(root);
  for (const { file, message } of findings) {
    console.error(`${file}: ${message}`);
  }
  if (findings.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log("Agent config OK.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
