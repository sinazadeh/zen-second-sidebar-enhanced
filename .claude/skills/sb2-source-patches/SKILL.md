---
name: sb2-source-patches
description: Rules for the patchers that rewrite Firefox's own source at runtime - text patches in source_patches.mjs, unapplied-patch reporting, patched-module loading, UrlbarInputPatcher, and checking patch targets against current Firefox. Use when changing anything under patchers/ or utils/files.mjs, or porting an upstream patcher change.
---

# Firefox source patches

Paths are relative to `src/second_sidebar/` unless they start at the
repository root. How the patched copies are loaded (`importPatchedModule()`,
and why it must not use a `chrome://userchrome/` alias or a `file://` URL) is
under "Loader portability" in
[sb2-loader-portability](../sb2-loader-portability/SKILL.md). Upstream keeps
its patches inline in `patchers/*_patcher.mjs`; how to port its changes is in
[sb2-upstream-sync](../sb2-upstream-sync/SKILL.md).

## Rules

- Browser internals are version-sensitive. For patcher changes, inspect the
  actual target browser source and verify the text/regex replacement still matches.
  Define text patches in `patchers/source_patches.mjs` with a `description`:
  `applySourcePatches` reports any that no longer match, and the patchers
  pass those to `reportUnappliedPatches`, which logs a `console.warn` with
  the browser version (so breakage after an update is diagnosable rather than
  silent). Keep that module free of browser globals at import time: the unit
  tests and `scripts/check_patch_targets.mjs` run it in Node. Add runtime
  targets (methods or properties a patcher replaces, like
  `UrlbarInputPatcher`'s) to that script's `requires` list. Preserve
  temporary-module cleanup in `utils/files.mjs`. Keep these patches isolated
  rather than spreading source rewriting through controllers.
- `UrlbarInputPatcher#patchValueFormatterUpdate` only applies to Firefox
  versions with a public `gURLBar.valueFormatter`. Where `gURLBar` is a
  `<moz-urlbar>` element, the formatter is private and `update()` is async,
  so it can't throw inside `removeTab()`; the patch detects that and skips
  itself, and any rejected promise is filtered by
  `#suppressValueFormatterErrors`. Its retry loop is capped (30 s) so it
  can't poll forever.

## Checking patch targets

When changing a patcher or `patchers/source_patches.mjs`, also run the
patches against current Firefox sources (needs network access; branches of
`mozilla-firefox/firefox`):

```sh
node scripts/check_patch_targets.mjs release beta main
```

The **Patch targets** workflow runs the same script weekly and on pull
requests that touch the patchers.

## References

- [Searchfox: Firefox source and internal APIs](https://searchfox.org/firefox-main/source/)
- [Zen Browser Desktop Repository](https://github.com/zen-browser/desktop)
