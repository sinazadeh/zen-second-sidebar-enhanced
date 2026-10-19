# Running real Sine in a test profile

Simulating Sine's markup in about:preferences misses how Sine installs,
updates and re-runs mods, and how a restored or reloaded about:preferences
behaves. To check those, run the real thing (the Sine gear bug of 1.12.0 only
showed this way).

## Setup

1. Download, for the Sine version users have (`engine.json` on Sine's `main`
   lists it): `engine.zip` from
   `https://github.com/CosmoCreeper/Sine/releases/download/v<version>/`, and
   `program.zip` and `profile.zip` from
   `https://github.com/sineorg/bootloader/releases/download/v<bootloader>/`.
2. Sine's `config.js` replaces fx-autoconfig's, so make a copy of the browser
   folder (`cp -al` keeps it cheap; remove `config.js` and
   `defaults/pref/config-prefs.js` from the copy before unzipping, as they're
   hard links) and unzip `program.zip` into it.
3. Make a fresh profile and unzip `profile.zip` and `engine.zip` into its
   `chrome/`. In `user.js`: `sine.allow-unsafe-js` (needed for mods with
   scripts that aren't from Sine's store, like this one),
   `sine.engine.auto-update` false, and `sine.auto-updates` as the test needs.
   For network access through a proxy, set `network.proxy.*` and add the
   proxy's CA to the profile with `certutil -A -d sql:<profile>`.

## Probing

There's no fx-autoconfig, so a probe script is itself a mod:
`chrome/sine-mods/<probe-id>/probe.uc.mjs`, listed in
`chrome/sine-mods/mods.json` with `"enabled": true`, `"no-updates": true` and
`"scripts": { "probe.uc.mjs": { "include": ["chrome://browser/content/browser.xhtml"] } }`.
Sine imports it into each window with `?v=<timestamp>`, and again whenever it
rebuilds mods (after an update), so guard against running twice.

- Install this mod with `window.manager.installMod("sinazadeh/zen-second-sidebar-enhanced")`
  (Sine deletes `window.manager` soon after startup; later, import
  `chrome://userscripts/content/core/manager.sys.mjs` and use its `default`).
- To test an update, set the mod's `version` and `updatedAt` in `mods.json`
  to an older release's. With `sine.auto-updates` on, Sine updates it at
  startup; `manager.updateMods()` updates it while running.
- Sine's mod list is in about:preferences: `.sineItem[mod-id="zen-second-sidebar"]`,
  its gear `.sineItemConfigureButton`, Sine's dialog the item's `dialog`.
- For a restored about:preferences, set `browser.startup.page` to 3, leave
  one open and quit with `eAttemptQuit` (a forced quit doesn't save the
  session), then select the restored tab after the next startup.
