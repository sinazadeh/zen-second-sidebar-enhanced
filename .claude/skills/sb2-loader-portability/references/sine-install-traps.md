# Sine install traps

Two ways an install can silently not run this addon at all. Neither is a code
bug, so check them before chasing one.

- **Sine's `sine.allow-unsafe-js` gate**: this is not something this repo
  controls, but it's the single most likely reason "installed via Sine but
  the sidebar never appears" gets reported.
  In `core/utils.sys.mjs`'s `getScripts()`, a mod's scripts are only ever
  added to Sine's load list when `this.allowUnsafeJS || mod.origin ===
"store"`. A mod installed by pasting a repository (as opposed to Sine's
  own reviewed marketplace) has `origin` unset, so unless the user has set
  `sine.allow-unsafe-js` to `true` in `about:config`, the script is never
  even attempted - no `include`/`exclude` check, no import, no console
  output, nothing. If a Sine install "does nothing" with an otherwise-clean
  console, check this pref before suspecting `theme.json` or the script
  itself.
- **fx-autoconfig and Sine share one `config.js` per browser installation,
  not per profile.** Both work by pointing Firefox's
  `general.config.filename` at a single bootstrap file inside the browser's
  install directory - there can only be one active at a time. Installing
  Sine's bootloader for any one profile replaces that shared file, silently
  disabling fx-autoconfig's own `chrome/JS/`-scanning bootstrap on **every
  other profile on the same installation**, not just the one Sine was set
  up on. Sine's own mod registry (`mods.json`) is per-profile, so a profile
  that only has this addon copied into `chrome/JS/` ends up with _no_
  loader running it at all once this happens - not a caching issue, not a
  code regression, just no active bootstrap left that knows about it.
  Don't assume a report of "stopped working after installing Sine" is
  about the same profile Sine was added to - ask about sibling profiles on
  the same installation before chasing a code-level cause.
