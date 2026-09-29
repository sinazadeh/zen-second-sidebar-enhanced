// Publishes a GitHub release for every version of theme.json on main that
// doesn't have one yet. Run by .github/workflows/release.yml whenever
// theme.json changes on main, so bumping the version is all a release takes.
// Locally, to see what it would publish:
//
//   node scripts/publish_releases.mjs --dry-run
//
// Each release gets the tag v<version>, its notes from that version's section
// in CHANGELOG.md (GitHub's generated notes if there's none), and a zip of
// src/ at the release's commit for fx-autoconfig users. The release commit is
// the first commit on main's first-parent line where theme.json has that
// version and CHANGELOG.md has its notes with nothing left under
// [Unreleased]. Early versions were bumped before their notes landed, and
// CHANGELOG.md was added with more changes still unreleased, so a version
// without such a commit gets the first one with the version. An existing tag
// is used as it is. Needs the full history (actions/checkout fetch-depth: 0)
// and, unless --dry-run, the GitHub CLI.

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ARCHIVE_PREFIX = "zen-second-sidebar-enhanced";

/**
 * The body of `version`'s section in a Keep a Changelog file: everything
 * between its `## [version]` heading and the next `## ` heading.
 *
 * @param {string} changelog
 * @param {string} version
 * @returns {string} "" if there's no such section
 */
export function extractReleaseNotes(changelog, version) {
  const heading = `## [${version}]`;
  const lines = changelog.split("\n");
  const start = lines.findIndex((line) => line.startsWith(heading));
  if (start === -1) {
    return "";
  }
  const end = lines.findIndex(
    (line, index) => index > start && line.startsWith("## "),
  );
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .trim();
}

/**
 * Whether a commit's CHANGELOG.md has `version`'s notes and no changes still
 * waiting under [Unreleased], i.e. the commit is that version as released.
 *
 * @param {string} changelog
 * @param {string} version
 * @returns {boolean}
 */
export function hasReleaseNotes(changelog, version) {
  return (
    extractReleaseNotes(changelog, version) !== "" &&
    extractReleaseNotes(changelog, "Unreleased") === ""
  );
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number} negative, zero or positive, like a sort comparator
 */
export function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

/**
 * Which releases to create.
 *
 * @param {Array<{sha: string, version: string | null, hasNotes: boolean}>} history
 *   main's first-parent commits, oldest first: theme.json's version at each
 *   (null if it has none) and whether CHANGELOG.md there has its notes and
 *   nothing unreleased (see hasReleaseNotes)
 * @param {Set<string>} releasedTags tags that already have a release
 * @param {Map<string, string>} existingTags tag name -> commit, for tags
 *   that exist, with or without a release
 * @returns {Array<{version: string, tag: string, sha: string, latest: boolean}>}
 *   oldest version first, so the newest release is created last
 */
export function planReleases(history, releasedTags, existingTags) {
  const firstCommit = new Map();
  const firstCommitWithNotes = new Map();
  for (const { sha, version, hasNotes } of history) {
    if (!version) {
      continue;
    }
    if (!firstCommit.has(version)) {
      firstCommit.set(version, sha);
    }
    if (hasNotes && !firstCommitWithNotes.has(version)) {
      firstCommitWithNotes.set(version, sha);
    }
  }

  const versions = [...firstCommit.keys()].sort(compareVersions);
  const newest = versions.at(-1);
  return versions
    .map((version) => ({ version, tag: `v${version}` }))
    .filter(({ tag }) => !releasedTags.has(tag))
    .map(({ version, tag }) => ({
      version,
      tag,
      sha:
        existingTags.get(tag) ??
        firstCommitWithNotes.get(version) ??
        firstCommit.get(version),
      latest: version === newest,
    }));
}

/**
 * Commands that create `releases`' tags by hand, all in one push: GitHub
 * starts no workflows for a push of more than three tags, so the release
 * workflow of those older commits doesn't run.
 *
 * @param {Array<{tag: string, sha: string}>} releases
 * @returns {string}
 */
export function formatTagCommands(releases) {
  return [
    ...releases.map(({ tag, sha }) => `git tag ${tag} ${sha}`),
    `git push origin ${releases.map(({ tag }) => tag).join(" ")}`,
  ].join("\n");
}

/**
 * @param {string} command
 * @param {Array<string>} args
 * @returns {string}
 */
function run(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    // Captured, so a failure's message is reported once, with the version.
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/**
 * @param {string} sha
 * @param {string} path
 * @returns {string | null}
 */
function showFile(sha, path) {
  try {
    return execFileSync("git", ["show", `${sha}:${path}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

/**
 * @returns {Array<{sha: string, version: string | null, hasNotes: boolean}>}
 */
function readHistory() {
  const shas = run("git", ["rev-list", "--first-parent", "--reverse", "HEAD"])
    .split("\n")
    .filter(Boolean);
  return shas.map((sha) => {
    let version = null;
    try {
      version = JSON.parse(showFile(sha, "theme.json") ?? "{}").version ?? null;
    } catch {
      // Not valid JSON at this commit.
    }
    const changelog = version ? showFile(sha, "CHANGELOG.md") : null;
    return {
      sha,
      version,
      hasNotes: !!changelog && hasReleaseNotes(changelog, version),
    };
  });
}

/**
 * @returns {Map<string, string>} tag name -> commit
 */
function readTags() {
  const tags = new Map();
  const lines = run("git", [
    "for-each-ref",
    "--format=%(refname:short) %(objectname) %(*objectname)",
    "refs/tags/v*",
  ]);
  for (const line of lines.split("\n").filter(Boolean)) {
    // Annotated tags point at a tag object; %(*objectname) is its commit.
    const [name, object, peeled] = line.split(" ");
    tags.set(name, peeled || object);
  }
  return tags;
}

/**
 * @returns {Set<string>}
 */
function readReleasedTags() {
  const json = run("gh", [
    "release",
    "list",
    "--limit",
    "1000",
    "--json",
    "tagName",
  ]);
  return new Set(JSON.parse(json).map((release) => release.tagName));
}

/**
 * @param {{version: string, tag: string, sha: string, latest: boolean}} release
 * @param {string} changelog CHANGELOG.md on main, which has every version's
 *   notes (older commits may not)
 * @param {string} workDir
 */
function publish({ version, tag, sha, latest }, changelog, workDir) {
  const archive = join(workDir, `${ARCHIVE_PREFIX}-${tag}.zip`);
  run("git", [
    "archive",
    "--format=zip",
    "-o",
    archive,
    `${sha}:src`,
    "second_sidebar.uc.mjs",
    "second_sidebar",
  ]);

  const args = ["release", "create", tag, archive, "--title", tag];
  args.push("--target", sha, `--latest=${latest}`);
  const notes = extractReleaseNotes(changelog, version);
  if (notes) {
    const notesFile = join(workDir, `${tag}.md`);
    writeFileSync(notesFile, `${notes}\n`);
    args.push("--notes-file", notesFile);
  } else {
    args.push("--generate-notes");
  }
  run("gh", args);
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const history = readHistory();
  const tags = readTags();
  let releasedTags = new Set();
  try {
    releasedTags = readReleasedTags();
  } catch (error) {
    if (!dryRun) {
      throw error;
    }
    console.log("(GitHub CLI unavailable: assuming no releases exist yet)");
  }

  const plan = planReleases(history, releasedTags, tags);
  if (plan.length === 0) {
    console.log("Every version already has a release.");
    return;
  }

  const changelog = showFile("HEAD", "CHANGELOG.md") ?? "";
  const workDir = mkdtempSync(join(tmpdir(), "releases-"));
  const failed = [];
  for (const release of plan) {
    const notes = extractReleaseNotes(changelog, release.version)
      ? "CHANGELOG notes"
      : "generated notes";
    const existing = tags.has(release.tag) ? ", existing tag" : "";
    console.log(
      `${dryRun ? "Would publish" : "Publishing"} ${release.tag} at ${release.sha.slice(0, 7)} (${notes}${existing}${release.latest ? ", latest" : ""})`,
    );
    if (dryRun) {
      continue;
    }
    // Keep going, so one version that can't be published doesn't hold back
    // the others (the newest one included).
    try {
      publish(release, changelog, workDir);
    } catch (error) {
      failed.push(release);
      console.error(
        `Failed to publish ${release.tag}: ${String(error.stderr || error.message).trim()}`,
      );
    }
  }

  if (failed.length === 0) {
    return;
  }
  const untagged = failed.filter(({ tag }) => !tags.has(tag));
  if (untagged.length > 0) {
    // GitHub refuses (HTTP 403) to let the workflow's token create a tag at
    // an older commit whose .github/workflows files differ from main's.
    console.error(
      `\nTo publish ${untagged.length === 1 ? "this version" : "these versions"}, push ${untagged.length === 1 ? "its tag" : "their tags"} from a clone of the repository, then run this workflow again:\n\n${formatTagCommands(untagged)}\n`,
    );
  }
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
