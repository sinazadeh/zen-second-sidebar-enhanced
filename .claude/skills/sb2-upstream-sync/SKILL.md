---
name: sb2-upstream-sync
description: Playbook for merging aminought/firefox-second-sidebar into this fork - remotes, merge procedure, known conflict hotspots, fork-only code to preserve, and how the Sync upstream workflow behaves. Use when merging upstream, resolving a sync pull request's conflicts, or changing .github/workflows/sync-upstream.yml.
---

# Upstream synchronization

Paths are relative to `src/second_sidebar/` unless they start at the
repository root or with `src/`. After resolving a merge, run through the Zen
compatibility checklist in [sb2-ui-layout](../sb2-ui-layout/SKILL.md) for
every file that conflicted.

This fork tracks `aminought/firefox-second-sidebar` (upstream) while preserving
Zen Browser patches contributed by `Ezo-mas/zen-second-sidebar-fix`.

## Remote hierarchy

| Remote     | URL                                     | Purpose                         |
| ---------- | --------------------------------------- | ------------------------------- |
| `origin`   | `sinazadeh/zen-second-sidebar-enhanced` | Your fork (push target)         |
| `upstream` | `aminought/firefox-second-sidebar`      | Original source of truth        |
| `Ezo-mas`  | `Ezo-mas/zen-second-sidebar-fix`        | Zen patch reference (read-only) |

The GitHub UI **Sync fork** button targets `Ezo-mas` (the immediate parent fork).
Always sync from `upstream` via the terminal or the **Sync upstream** workflow.

## Sync procedure

```sh
# 1. Fetch the latest upstream commits
git fetch upstream

# 2. Check how many new commits exist
git log HEAD..upstream/master --oneline

# 3. Merge into main (this fork's default branch; upstream's is still master)
git checkout main
git merge upstream/master

# 4. Resolve conflicts (see hotspots below), then:
git add <resolved-files>
git commit
git push origin main
```

## Known conflict hotspots

These files are the most likely to conflict because upstream changes code
this fork has also modified:

1. **`src/second_sidebar/controllers/sidebar_main.mjs`** — `uncollapse()` method:
   - **Keep** `removeProperty("margin-right")` / `removeProperty("margin-left")`
     (Zen patch — allows Zen's flex engine to manage spacing).
   - **Accept** any new upstream additions to `#clearCollapseTransitionEndListener()`
     or other new methods alongside, rather than discarding them.

2. **`src/second_sidebar/css/common.mjs`** — `:root` CSS variable block:
   - **Keep** all `--sb2-zen-*` variable definitions (Zen patch).
   - **Accept** any new upstream `@media -moz-pref("browser.nova.enabled")` blocks.
   - **Keep** both `#browser,` and `#zen-tabbox-wrapper {` in the `position: relative`
     rule at the bottom of the file.

3. **`.github/workflows/*.yml`** — upstream's workflows trigger on `master`, and
   its ESLint lint step sets `continue-on-error: true`:
   - **Keep** this fork's `branches: ["main"]` triggers and its failing lint step.

`theme.json`, `wrappers/directory_service.mjs`, and the loader-portability
fixes (see [sb2-loader-portability](../sb2-loader-portability/SKILL.md)) are fork-only additions upstream doesn't have, so
merges won't touch or conflict with them - but they also won't gain any
upstream improvements automatically. If upstream ever changes how
`css/sidebar_main.mjs` or `utils/files.mjs` resolve their own assets/paths,
re-apply the loader-portability treatment on top of upstream's version
rather than taking upstream's as-is.

The settings popups' callbacks are generated here from `WEB_PANEL_FIELDS`
(`controllers/web_panel_fields.mjs`) and `SIDEBAR_FIELD_EVENTS`
(`controllers/sidebar_fields.mjs`), which also bind the simple web panel
settings in `WebPanelsController#bindFields` and give the mirrored prefs
their events. When upstream adds a setting's callback to
`controllers/web_panel_edit.mjs` or `controllers/sidebar_main_settings.mjs`,
or a `#bindSimpleSetting` call to `web_panels.mjs`, add a table entry
instead of keeping theirs; `tests/settings_wiring.test.mjs` fails until the
popup's new callback has one.

Upstream's web panel `mobile` setting (a toggle sending a fixed mobile
user agent) is `userAgent`/`customUserAgent` here, with its choices in
`utils/user_agents.mjs` and a **User Agent** list in both the edit popup and
the **More** popup. Port upstream changes to mobile view onto that rather
than restoring the toggle, and keep `WebPanelSettings` reading `mobile` from
older saves. `parseNotifications` (`utils/string.mjs`) is rewritten too, and
`controllers/shortcuts.mjs` checks every shortcut for conflicts through one
`#isShortcutTaken`, which also covers this fork's next/previous web panel
shortcuts: add an upstream shortcut to `#getSidebarShortcuts` there. Its
key matching (`isShortcutPressed` and the shortcut parts) moved to
`utils/keyboard.mjs`, so `tests/keyboard.test.mjs` can run it.

The patchers diverge from upstream too: their text patches live in
`patchers/source_patches.mjs` and their module loading in
`importPatchedModule()`. When upstream changes a replacement in one of its
`patchers/*_patcher.mjs` files, port the change into `source_patches.mjs`
(and `tests/source_patches.test.mjs`) instead of restoring upstream's inline
version.

## The Sync upstream workflow

A **Sync upstream** workflow (`.github/workflows/sync-upstream.yml`) runs every
Monday at 09:00 UTC and opens a Pull Request whenever `aminought/firefox-second-sidebar`
has new commits. It can also be triggered manually via **Actions → Sync upstream →
Run workflow**. Every step after "Decide whether to sync" is gated on its
`proceed` output - an `exit 0` only ends one step, not the job, so don't use
one to skip the rest. It skips the run while a sync PR is still open, and
deletes the branch it pushed if the PR can't be opened. Opening the PR needs
a `SYNC_PAT` repository secret (preferred) or "Allow GitHub Actions to create
and approve pull requests"; see the workflow file header.

## References

- [Upstream Firefox Second Sidebar Repository](https://github.com/aminought/firefox-second-sidebar)
- [Zen Second Sidebar Fix Fork](https://github.com/Ezo-mas/zen-second-sidebar-fix)
