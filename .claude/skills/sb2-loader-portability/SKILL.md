---
name: sb2-loader-portability
description: How Second Sidebar is loaded by fx-autoconfig and Sine - their different chrome:// origins, theme.json, startup ordering, the double-injection guard and popup-window detection. Use when touching theme.json, src/second_sidebar.uc.mjs, the way this addon resolves its own assets or files, or when diagnosing "installed but the sidebar never appears" reports.
---

# Loaders, startup and injection

Second Sidebar runs under fx-autoconfig, under Sine (via `theme.json`), or
under a compatible script loader, and each serves this addon's files from a
different chrome:// origin. Paths below are relative to `src/second_sidebar/`
unless they start at the repository root.

When a Sine install "does nothing", or a profile stopped loading the addon
after Sine was installed elsewhere, read
[the Sine install traps](references/sine-install-traps.md) before suspecting
the code.

## Loader portability

- **Loader portability (fx-autoconfig vs Sine)**: this addon's own files are
  served from different chrome:// origins depending on the loader
  (`chrome://userscripts/content/...` under fx-autoconfig,
  `chrome://sine/content/<mod-id>/...` under Sine). Never hardcode one
  loader's origin when referencing this addon's own assets:
  - Module-to-module imports already use relative `./`/`../` paths - keep it
    that way; never import a sibling module via an absolute `chrome://` URL.
  - To reference a sibling asset (an icon, etc.) from CSS or elsewhere,
    resolve it from the current module's own URL with
    `new URL("../relative/path", import.meta.url).href` (see
    `css/sidebar_main.mjs`), not a hardcoded `chrome://` prefix.
  - To resolve a filesystem path (e.g. for `IOUtils`), use
    `DirectoryServiceWrapper.profileChromeDir` (`wrappers/directory_service.mjs`,
    backed by Gecko's "UChrm" directory-service key) instead of resolving a
    loader-registered chrome:// alias - it works under any loader.
  - `utils/files.mjs`'s `importPatchedModule()` is how the three source
    patchers load their patched copy of a Firefox internal module: it writes
    the copy next to this addon's own files (resolved from
    `import.meta.url`, so whatever chrome:// origin served the addon),
    imports it and deletes it. Don't switch it to fx-autoconfig's
    `chrome://userchrome/content/` alias (not registered under Sine) or a
    `file://` URL (blocked by the CSP Sine applies to dynamically imported
    scripts: `script-src chrome: resource: moz-src:`). Each call uses a
    unique file name, because every window runs the patchers and a shared
    name let one window delete the file while another was importing it.
- **`theme.json`** (repo root) is this fork's Sine mod manifest. Its `scripts`
  field deliberately points at `src/second_sidebar.uc.mjs`'s real, nested
  path rather than assuming a flattened repo - see "Why `src/` stays" below.
  Only the entry point needs listing there; everything it imports is resolved
  by the JS module loader itself, not by Sine's own script registry. Its
  `include` pattern scopes loading to `browser.xhtml` (matching what
  fx-autoconfig already restricts `.uc.mjs` loading to); dropping it would
  make Sine dynamically import this script into every chrome window,
  including ones lacking `gBrowser`/the sidebar's expected DOM.
  Its `preferences` field names the root `preferences.json`, which Sine
  turns into the mod's settings (gear) dialog; each control there edits one
  of the mirrored sidebar prefs (see "Storage" in
  [sb2-settings](../sb2-settings/SKILL.md)). Sine only picks the file up when it installs or
  updates the mod, i.e. after a `version` bump.
- **Default branch is `main`** (renamed from `master`; upstream still uses
  `master`). Sine reads a mod added without `/tree/<branch>` from `main`,
  so the plain `<owner>/<repo>` works. Older Sine installs added as
  `<owner>/<repo>/tree/master` keep working only through GitHub's rename
  redirect, which stops if a branch named `master` is created again - so
  don't recreate one.
- **Why `src/` stays**: flattening `src/second_sidebar.uc.mjs` and
  `src/second_sidebar/` to the repo root would look tidier and match how
  small single-file Sine mods are usually laid out, but this fork's `src/`
  layout mirrors upstream's, which is what keeps `git merge upstream/master`
  (see [sb2-upstream-sync](../sb2-upstream-sync/SKILL.md)) tractable across ~150 files. `theme.json` can
  point into a nested path just fine, so don't flatten the repo "for
  cleanliness" - that trades a cosmetic win for permanent merge friction.

## Startup and injection

- **Double-injection guard**: `run()` in `second_sidebar.uc.mjs` sets a
  `sb2-injected` class on `BrowserElements.root` before doing anything else,
  and bails out if it's already set. A profile can have this addon both
  copied into fx-autoconfig's `chrome/JS/` and installed as a Sine mod;
  without the guard both loaders inject into the same window, producing
  duplicate `#sb2-*` elements with colliding ids. Keep the class set
  synchronously, before the first `await`, so two near-simultaneous
  invocations can't both pass the check.
- Preserve startup ordering: wait for `UC_API.Runtime.startupFinished()` or
  `delayedStartupPromise` (fx-autoconfig) or the `browser-delayed-startup-finished`
  observer fallback in `second_sidebar.uc.mjs` (Sine, which defines neither
  global); skip `sb2-webpanels-window` and popup windows; load settings/state
  before creating elements, controllers, and applying values.
- Keep popup detection compatible with extension-created windows. A popup may
  expose `window.toolbar.visible === false` without listing `extrachrome` in its
  `chromehidden` attribute. Never inject `#sb2-wrapper` into these windows.

## Validating

For changes to `theme.json`, the startup fallback in `second_sidebar.uc.mjs`,
or anything under "Loader portability" above, test under both loaders as
described in [browser validation](../sb2-browser-validation/SKILL.md).

## References

- [fx-autoconfig installation and startup cache](https://github.com/MrOtherGuy/fx-autoconfig)
- [Sine](https://github.com/CosmoCreeper/Sine)
