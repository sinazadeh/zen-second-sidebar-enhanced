// Checks browser release data used by the web-panel user-agent presets. With
// --write, updates the source, its exact-version tests, the changelog and
// theme.json so a scheduled workflow can submit a release-ready pull request.

import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const RELEASE_SOURCES = {
  firefox: "https://product-details.mozilla.org/1.0/firefox_versions.json",
  safari: "https://webkit.org/feed/",
  samsung: "https://checkip.ai.vn/en/user-agents/browser/samsung-internet",
};

function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function latest(versions, name) {
  if (versions.length === 0) throw new Error(`No ${name} release found`);
  return versions.sort(compareVersions).at(-1);
}

export function parseFirefoxVersion(text) {
  const version = JSON.parse(text).LATEST_FIREFOX_VERSION;
  const major = Number.parseInt(version, 10);
  if (!Number.isInteger(major) || major < 1) {
    throw new Error("Mozilla's latest Firefox release is invalid");
  }
  return major;
}

export function parseSafariVersion(text) {
  return latest(
    [...text.matchAll(/WebKit Features for Safari (\d+(?:\.\d+)+)/g)].map(
      (match) => match[1],
    ),
    "Safari",
  );
}

export function parseSamsungVersions(html) {
  const agents = [
    ...html.matchAll(
      /Linux; Android 10; K\)[\s\S]*?SamsungBrowser\/(\d+(?:\.\d+)+) Chrome\/(\d+)\.0\.0\.0 Mobile Safari\/537\.36/g,
    ),
  ].map((match) => ({ browser: match[1], chromium: match[2] }));
  if (agents.length === 0) {
    throw new Error("No reduced Samsung Internet Android user agent found");
  }
  const browser = latest(
    agents.map((agent) => agent.browser),
    "Samsung Internet",
  );
  const matchingAgents = agents.filter((agent) => agent.browser === browser);
  return {
    browser,
    chromium: latest(
      matchingAgents.map((agent) => agent.chromium),
      `Chromium engine for Samsung Internet ${browser}`,
    ),
  };
}

function replaceRequired(text, pattern, replacement, name) {
  if (!pattern.test(text)) throw new Error(`Could not find ${name}`);
  return text.replace(pattern, replacement);
}

function nextPatchVersion(version) {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) {
    throw new Error(`Cannot bump version ${version}`);
  }
  parts[2] += 1;
  return parts.join(".");
}

function releaseChangelog(changelog, version, date, changes) {
  const marker = "## [Unreleased]";
  const markerIndex = changelog.indexOf(marker);
  if (markerIndex < 0)
    throw new Error("CHANGELOG.md has no Unreleased section");
  const contentStart = markerIndex + marker.length;
  const nextRelease = changelog.indexOf("\n## [", contentStart);
  if (nextRelease < 0) throw new Error("CHANGELOG.md has no released section");
  const pending = changelog.slice(contentStart, nextRelease).trim();
  const notes = [
    `## [${version}] - ${date}`,
    "",
    "### Changed",
    "",
    `- Updated the fixed web-panel user agents: ${changes.join(", ")}.`,
    pending ? `\n${pending}` : "",
    "",
  ].join("\n");
  return `${changelog.slice(0, contentStart)}\n\n${notes}${changelog.slice(nextRelease + 1)}`;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "zen-second-sidebar-user-agent-check" },
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

export async function checkUserAgents({ write = false } = {}) {
  const [firefoxText, safariText, samsungText] = await Promise.all(
    Object.values(RELEASE_SOURCES).map(fetchText),
  );
  const latestVersions = {
    firefox: parseFirefoxVersion(firefoxText),
    safari: parseSafariVersion(safariText),
    samsung: parseSamsungVersions(samsungText),
  };

  const sourcePath = "src/second_sidebar/utils/user_agents.mjs";
  const testPath = "tests/user_agents.test.mjs";
  const [originalSource, originalTests] = await Promise.all([
    readFile(sourcePath, "utf8"),
    readFile(testPath, "utf8"),
  ]);
  const currentFirefox = originalSource.match(
    /FALLBACK_GECKO_VERSION = (\d+)/,
  )?.[1];
  const currentSafari = originalSource.match(
    /Version\/(\d+(?:\.\d+)+) Mobile/,
  )?.[1];
  const currentSamsung = originalSource.match(
    /SamsungBrowser\/(\d+(?:\.\d+)+)/,
  )?.[1];
  const currentChromium = originalSource.match(/ Chrome\/(\d+)/)?.[1];
  const updateSharedVersions = (text) => {
    let result = replaceRequired(
      text,
      /SamsungBrowser\/\d+(?:\.\d+)+ Chrome\/\d+(?:\.\d+)+/g,
      `SamsungBrowser/${latestVersions.samsung.browser} Chrome/${latestVersions.samsung.chromium}.0.0.0`,
      "Samsung Internet user agent",
    );
    result = replaceRequired(
      result,
      /Version\/\d+(?:\.\d+)+ Mobile\/15E148 Safari\/604\.1/g,
      `Version/${latestVersions.safari} Mobile/15E148 Safari/604.1`,
      "Safari user agent",
    );
    return result;
  };
  const source = replaceRequired(
    updateSharedVersions(originalSource),
    /FALLBACK_GECKO_VERSION = \d+/,
    `FALLBACK_GECKO_VERSION = ${latestVersions.firefox}`,
    "Firefox fallback version",
  );
  const tests = replaceRequired(
    updateSharedVersions(originalTests),
    new RegExp(
      `rv:${currentFirefox}\\.0\\) Gecko/${currentFirefox}\\.0 Firefox/${currentFirefox}\\.0`,
      "g",
    ),
    `rv:${latestVersions.firefox}.0) Gecko/${latestVersions.firefox}.0 Firefox/${latestVersions.firefox}.0`,
    "Firefox fallback test",
  );
  const changes = [];
  if (source !== originalSource) {
    if (Number(currentFirefox) !== latestVersions.firefox) {
      changes.push(`Firefox ${currentFirefox} → ${latestVersions.firefox}`);
    }
    if (currentSafari !== latestVersions.safari) {
      changes.push(`Safari ${currentSafari} → ${latestVersions.safari}`);
    }
    if (
      currentSamsung !== latestVersions.samsung.browser ||
      currentChromium !== latestVersions.samsung.chromium
    ) {
      changes.push(
        `Samsung Internet ${currentSamsung}/Chromium ${currentChromium} → ${latestVersions.samsung.browser}/Chromium ${latestVersions.samsung.chromium}`,
      );
    }
  }

  if (changes.length === 0) {
    console.log("User-agent presets are current.");
    return false;
  }
  console.log(`Updates found: ${changes.join("; ")}`);
  if (!write) return true;

  await Promise.all([
    writeFile(sourcePath, source),
    writeFile(testPath, tests),
  ]);
  const manifest = JSON.parse(await readFile("theme.json", "utf8"));
  manifest.version = nextPatchVersion(manifest.version);
  manifest.updatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  await writeFile("theme.json", `${JSON.stringify(manifest, null, 2)}\n`);
  const changelog = await readFile("CHANGELOG.md", "utf8");
  await writeFile(
    "CHANGELOG.md",
    releaseChangelog(
      changelog,
      manifest.version,
      manifest.updatedAt.slice(0, 10),
      changes,
    ),
  );
  return true;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await checkUserAgents({ write: process.argv.includes("--write") });
}
