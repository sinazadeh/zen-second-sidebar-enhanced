# Repository guidance

## Project and runtime

Second Sidebar is a privileged Firefox and Zen Browser userChrome.js script loaded
through fx-autoconfig, [Sine](https://github.com/CosmoCreeper/Sine) (via the
`theme.json` manifest at the repo root), or a compatible script loader. It adds
a second sidebar and web panels to the browser UI. This repository is adapted
for **Zen Browser** while maintaining compatibility with standard Firefox. It
is not a WebExtension or a Node.js/web application: there is no bundler,
development server, or build step. Deploy the contents of `src/` as-is (for
Sine, `theme.json` does this automatically).

Read `README.md` for features and installation, and the relevant implementation
before changing behavior. Follow applicable user-level agent instructions;
keep machine-specific subagent configuration outside this repository.

**Read this file as a map.** It holds only what applies to every change; each
area's rules and their reasons live in a skill under `.claude/skills/` (Claude
Code loads them by description, other agents open the linked file). Read the
matching skill below before changing code there, and put new detail in it, not
here: `scripts/lint_agent_config.mjs` (run by `node --test`) keeps this file
within 150 lines and checks that it links every skill, agent and command.

## Code map

All paths below are relative to `src/second_sidebar/`, except the entry point.

| Location                                       | Responsibility                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/second_sidebar.uc.mjs`                    | Waits for Firefox/Zen startup, skips nested panel windows, injects and decorates sidebar. |
| `sidebar_injector.mjs`                         | Loads settings/state, creates elements and controllers, then applies settings/state.      |
| `sidebar_elements.mjs`, `browser_elements.mjs` | Sidebar element registry and access to existing browser chrome elements.                  |
| `sidebar_controllers.mjs`                      | Creates and connects controllers in dependency order.                                     |
| `controllers/`                                 | Sidebar/panel behavior, geometry, shortcuts, popup actions, and cross-window events.      |
| `xul/`, `xul/base/`                            | UI components and shared fluent wrappers around XUL/HTML elements.                        |
| `css/`, `sidebar_decorator.mjs`                | CSS template-string exports, combined and injected into the chrome document.              |
| `settings/`                                    | Defaults, serialization, persisted settings, and panel state.                             |
| `wrappers/`                                    | Adapters for privileged Firefox/Gecko globals and services.                               |
| `patchers/`                                    | Compatibility patches for Firefox/Zen UI implementation.                                  |
| `patchers/source_patches.mjs`                  | Text patches for Firefox sources; browser-global-free so Node tests can run them.         |
| `utils/browser_layout.mjs`                     | Browser container resolution (`#zen-tabbox-wrapper` for Zen, `#browser` for Firefox).     |
| `utils/`, `icons/`                             | Shared helpers and SVG assets.                                                            |
| `tests/` (repo root)                           | Node unit tests for pure logic, and the agent-config lint.                                |
| `scripts/` (repo root)                         | Development scripts, e.g. `check_patch_targets.mjs` (see "Static checks").                |

## Skills: where the detail lives

| Before you…                                                                                | Read                                                                     |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| add or change a setting, settings storage, cross-window events, or settings import/export  | [sb2-settings](.claude/skills/sb2-settings/SKILL.md)                     |
| touch `theme.json`, startup, asset or file paths, or debug "installed but nothing appears" | [sb2-loader-portability](.claude/skills/sb2-loader-portability/SKILL.md) |
| change web panel lifecycle, the panels' window, shortcuts, link clicks, icons or selectors | [sb2-web-panels](.claude/skills/sb2-web-panels/SKILL.md)                 |
| change CSS, layout, geometry, collapse behavior, popups or theming                         | [sb2-ui-layout](.claude/skills/sb2-ui-layout/SKILL.md)                   |
| change a patcher, `patchers/source_patches.mjs` or `utils/files.mjs`                       | [sb2-source-patches](.claude/skills/sb2-source-patches/SKILL.md)         |
| merge upstream or resolve a sync pull request                                              | [sb2-upstream-sync](.claude/skills/sb2-upstream-sync/SKILL.md)           |
| prepare a release, or change the changelog's structure or the Release workflow             | [sb2-release](.claude/skills/sb2-release/SKILL.md)                       |
| edit `.github/workflows/`, lint or format config, or `scripts/`                            | [sb2-ci-workflows](.claude/skills/sb2-ci-workflows/SKILL.md)             |
| validate in a real browser, or write a pull request's manual-validation notes              | [sb2-browser-validation](.claude/skills/sb2-browser-validation/SKILL.md) |

## Conventions for every change

- Use ES modules with explicit relative `.mjs` imports. Follow the existing
  two-space indentation, double quotes, semicolons, and Prettier formatting.
  Files use `snake_case`; classes use `PascalCase`; methods use `camelCase`.
- Keep JSDoc consistent with nearby code. Some imports exist only for JSDoc and
  use a targeted `no-unused-vars` suppression; do not remove their type context
  just to silence lint.
- Put behavior in controllers, UI construction in `xul/`, and Firefox API access
  in the corresponding wrapper. Reuse `XULElement` and `utils/xul.mjs` helpers.
  Preserve the XUL/HTML element distinction.
- Support both Zen and Firefox, with the sidebar on either side: never hardcode
  `#browser` (use `requireBrowserContainerElement()` or `#zen-tabbox-wrapper, #browser`),
  and go through the Zen compatibility checklist in
  [sb2-ui-layout](.claude/skills/sb2-ui-layout/SKILL.md) for every source change.
- Use `Logger.debug` (`utils/logger.mjs`) for verbose, per-action logging
  (tab lifecycle, per-setting change events, timer state) - it's gated
  behind the `second-sidebar.debug-logging` pref so normal use doesn't spam
  the Browser Console. Reserve plain `console.log` for one-time
  startup/lifecycle announcements (e.g. "X was patched", "Loading Y..."),
  and always use `console.error`/`console.warn` directly for real problems -
  never gate those behind the debug pref.
- Use `safeCall` (`utils/errors.mjs`) to isolate a call into a Firefox/Gecko
  internal that's known (or suspected) to throw unpredictably, so the throw
  can't corrupt this addon's own state or interrupt an event handler
  partway through. See `WebPanelController#removeTab` for the reference
  usage; the underlying issue is documented in `urlbar_input_patcher.mjs`.
- Use `controllers/events.mjs` for cross-window actions; per-panel listeners
  must ignore uuids the window doesn't have.
- Registrations with Firefox's global services (the observer service,
  prefs) outlive the window that made them, so remove them on its `unload`
  (`WebPanelsBrowser#unobserveAll`, `SidebarPrefsController#init`).
  Listeners, timers and `ResizeObserver`s on the window's own objects go away
  with it and need no teardown.
- Never paste a settings value into page-side code: settings can come from an
  imported file (see `buildSelectorScript` in `utils/selector_script.mjs`).
- Update the README when user-visible features or installation steps change,
  and add user-visible changes to `[Unreleased]` in `CHANGELOG.md`. Keep edits
  focused; avoid unrelated formatting or framework/toolchain changes.

## Agents and commands

Each subagent in `.claude/agents/` does one job on a model matched to it: `opus`
where a wrong call is costly, `sonnet` for checklists, tests and docs, `haiku`
for running checks. Implementation stays in the main session. Commands in
`.claude/commands/` chain the agents into workflows.

| Agent                                                                | Model  | Job                                                                    |
| -------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| [sb2-code-reviewer](.claude/agents/sb2-code-reviewer.md)             | opus   | Correctness and invariant review of a diff                             |
| [sb2-security-auditor](.claude/agents/sb2-security-auditor.md)       | opus   | Privilege and injection review (page scripts, imports, patches, hooks) |
| [sb2-upstream-merger](.claude/agents/sb2-upstream-merger.md)         | opus   | Merge upstream, resolve conflicts keeping the Zen patches              |
| [sb2-zen-compat-reviewer](.claude/agents/sb2-zen-compat-reviewer.md) | sonnet | Zen compatibility checklist and layout/theming rules                   |
| [sb2-test-writer](.claude/agents/sb2-test-writer.md)                 | sonnet | Node unit tests for pure logic                                         |
| [sb2-docs-updater](.claude/agents/sb2-docs-updater.md)               | sonnet | README, changelog and skill updates                                    |
| [sb2-checks-runner](.claude/agents/sb2-checks-runner.md)             | haiku  | Run the static checks and report                                       |

| Command                                                         | Workflow                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------- |
| [/sb2-check](.claude/commands/sb2-check.md)                     | Static checks                                                   |
| [/sb2-review](.claude/commands/sb2-review.md)                   | Parallel specialist review, verified and merged into one report |
| [/sb2-add-setting](.claude/commands/sb2-add-setting.md)         | Plan, implement, test, document and review a new setting        |
| [/sb2-sync-upstream](.claude/commands/sb2-sync-upstream.md)     | Merge upstream, then check and review the merge                 |
| [/sb2-prepare-release](.claude/commands/sb2-prepare-release.md) | Version bump, changelog section and release dry run             |

## Static checks

For a checkout without local tooling, install the lint/format tools from the
repository root (this is development setup, not a runtime dependency):

```sh
npm install --no-save --package-lock=false eslint@9.7.0 @eslint/js@9.7.0 globals@15 prettier@3.9.9
```

Run the checks relevant to changed files:

```sh
npx eslint .
npx prettier --check "src/**/*.mjs" "tests/*.mjs" "scripts/*.mjs" "*.mjs" "*.md" "*.json" ".github/**/*.yml" ".claude/**/*.md"
node --test "tests/*.test.mjs"
git diff --check
node scripts/check_patch_targets.mjs release beta main  # patchers only; needs network
```

For documentation-only edits, check formatting on the edited Markdown files. For
targeted formatting fixes, use `npx prettier --write <changed-files>`. Do not
reformat unrelated files to clear an existing repository-wide failure. On
PowerShell, `npm.cmd`/`npx.cmd` can be used if `.ps1` launchers are blocked.
