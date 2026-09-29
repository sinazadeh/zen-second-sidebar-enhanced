// Checks that the Firefox code this addon patches still looks the way the
// patches expect, by running them against current Firefox sources. Run
// weekly by .github/workflows/patch-targets.yml, so a Firefox change that
// breaks a patch shows up before Zen ships it. Locally:
//
//   node scripts/check_patch_targets.mjs [branch...]   (default: release)
//
// Branches are those of https://github.com/mozilla-firefox/firefox (e.g.
// release, beta, main). Zen builds on Firefox release, with its own
// patches on top, so a green run is a strong hint rather than a guarantee.

import { appendFile } from "node:fs/promises";

import {
  extractToolboxEventHandlers,
  patchCustomizeModeSource,
  patchPopupNotificationsSource,
} from "../src/second_sidebar/patchers/source_patches.mjs";

const RAW_URL = "https://raw.githubusercontent.com/mozilla-firefox/firefox";

/**
 * Each target is a Firefox file plus either a source patch function (see
 * patchers/source_patches.mjs) or snippets that must be present for the
 * runtime patches in patchers/urlbar_input_patcher.mjs and
 * patchers/content_click_hook.sys.mjs.
 */
const TARGETS = [
  {
    path: "browser/components/customizableui/CustomizeMode.sys.mjs",
    patch: patchCustomizeModeSource,
  },
  {
    path: "toolkit/modules/PopupNotifications.sys.mjs",
    patch: patchPopupNotificationsSource,
  },
  {
    path: "browser/base/content/navigator-toolbox.js",
    patch: extractToolboxEventHandlers,
  },
  {
    path: "browser/actors/ClickHandlerParent.sys.mjs",
    requires: {
      "contentAreaClick(data) {":
        "content_click_hook.sys.mjs replaces contentAreaClick",
      "this.contentAreaClick(message.data);":
        "content_click_hook.sys.mjs relies on Content:Click calling contentAreaClick",
    },
  },
  {
    path: "browser/components/DesktopActorRegistry.sys.mjs",
    requires: {
      '"resource:///actors/ClickHandlerParent.sys.mjs"':
        "content_click_hook.sys.mjs loads ClickHandlerParent from this URL",
    },
  },
  {
    path: "browser/components/urlbar/content/UrlbarInputBase.mjs",
    requires: {
      "_afterTabSelectAndFocusChange() {":
        "UrlbarInputPatcher wraps _afterTabSelectAndFocusChange",
    },
  },
  {
    path: "browser/components/urlbar/UrlbarValueFormatter.sys.mjs",
    requires: {
      "async update() {":
        "UrlbarInputPatcher relies on update() being async (it can't throw inside removeTab)",
    },
  },
];

/**
 * @param {string} branch
 * @param {{
 *   path: string,
 *   patch?: ((source: string) => { unmatched?: Array<string> }),
 *   requires?: Object<string, string>,
 * }} target
 * @returns {Promise<Array<string>>}
 */
async function checkTarget(branch, { path, patch, requires = {} }) {
  let response;
  try {
    response = await fetch(`${RAW_URL}/${branch}/${path}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [`${path}: could not fetch (${message})`];
  }
  if (!response.ok) {
    return [`${path}: could not fetch (HTTP ${response.status})`];
  }

  const source = await response.text();
  const problems = [];
  for (const description of patch?.(source).unmatched ?? []) {
    problems.push(`${path}: patch no longer applies: ${description}`);
  }
  for (const [snippet, reason] of Object.entries(requires)) {
    if (!source.includes(snippet)) {
      problems.push(`${path}: missing \`${snippet}\` (${reason})`);
    }
  }
  return problems;
}

/**
 * @param {string} branch
 * @returns {Promise<Array<string>>} problems found
 */
async function checkBranch(branch) {
  return (
    await Promise.all(TARGETS.map((target) => checkTarget(branch, target)))
  ).flat();
}

const branches = process.argv.slice(2);
const summary = [];
const branchProblems = await Promise.all(
  (branches.length > 0 ? branches : ["release"]).map(async (branch) => ({
    branch,
    problems: await checkBranch(branch),
  })),
);
let failed = false;
for (const { branch, problems } of branchProblems) {
  failed ||= problems.length > 0;
  const heading = `Firefox ${branch}: ${problems.length === 0 ? "all patch targets OK" : `${problems.length} problem(s)`}`;
  console.log(heading);
  for (const problem of problems) console.log(`  - ${problem}`);
  summary.push(`### ${heading}`, ...problems.map((problem) => `- ${problem}`));
}

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, summary.join("\n") + "\n");
}
process.exitCode = failed ? 1 : 0;
