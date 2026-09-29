# Changelog

Notable changes to this fork. Versions match `version` in `theme.json`; a
pushed `v<version>` tag publishes a GitHub release with that version's notes
below (see `.github/workflows/release.yml`).

## [Unreleased]

### Fixed

- In Zen, with **Auto-hide sidebar** set to overlay, the page no longer runs
  to the edge of the window on the sidebar's side, cutting off its border
  ([#23](https://github.com/sinazadeh/zen-second-sidebar-enhanced/issues/23)).
  It keeps the gap Zen leaves there, as when the sidebar is inline.

## [1.4.0] - 2026-09-29

### Added

- Bookmarks and History menu entries have **Open in Second Sidebar** and
  **Preview in Second Sidebar** in their right-click menu (#27).
- Alt+Shift+click a link or a bookmark to preview it in the second sidebar
  (#27). **Sidebar settings → Links and bookmarks** can change this to Alt+click
  (in Zen, only with Glance set to another key) or turn it off.
- Settings to hide the **Open…** or **Preview… in Second Sidebar** menu items
  (#27).

## [1.3.4] - 2026-09-28

### Fixed

- In Zen, a floating web panel's toolbar no longer shows a translucent page
  behind it (#23). With Zen's acrylic option (on by default), the panel now
  has the same tint over its blur as Zen's own floating sidebar, instead of
  the blur alone.

## [1.3.3] - 2026-09-27

### Fixed

- In Zen, a floating web panel no longer lets the page behind it show through
  its toolbar with transparency themes or mods (#23). It now has the background
  Zen gives its own floating sidebar, or, with Zen's acrylic option on, blurs
  what's behind it the same way.

## [1.3.2] - 2026-09-27

### Fixed

- Opening a link from another app (the Windows Run box, an email client,
  another program) no longer closes the sidebar. The link went to the hidden
  window that holds the web panels, where it couldn't be seen; it now opens in
  the browser window.

## [1.3.1] - 2026-09-27

### Fixed

- A web panel's CSS selector containing quotes (such as
  `div[data-x='a b']`) now works. The selector is also passed to the page as
  plain text, so a selector in an imported settings file can no longer run
  its own code on the panel's website.
- Editing a second web panel's URL, icon or selector right after the first no
  longer cancels the first panel's update.
- Closing a browser window no longer keeps part of it in memory, still being
  called for every passkey (WebAuthn) prompt.
- If the web panels' window fails to start, the Browser Console now says so
  after 30 seconds, instead of the sidebar silently checking 100 times a
  second for as long as the window is open.

## [1.3.0] - 2026-09-26

### Added

- New Web Panel has a **Preset** list: common websites (ChatGPT, Claude,
  WhatsApp, Telegram, X...), in mobile view where that works better, and the
  sidebars of installed extensions, such as Bitwarden's vault, without
  looking up the extension's `moz-extension://` address (which differs in
  every profile). A preset only sets the URL, mobile view, favicon and
  whether the panel reloads when the address changes (on for Bitwarden).
- Web panels showing an extension page (`moz-extension://`) now get the
  extension's own icon instead of a generic one.

## [1.2.7] - 2026-09-25

### Fixed

- The find bar in a web panel still covered half the page with mods or
  `userChrome.css` that move the find bar into a column beside the page. It
  is now pinned across the bottom of the panel, whatever the page layout
  styles say.

## [1.2.6] - 2026-09-25

### Fixed

- Ctrl+T (new tab), Ctrl+Shift+T (reopen closed tab), Ctrl+L (address bar)
  and Ctrl+K (web search) pressed while a web panel has focus now act on the
  browser window instead of the panel's hidden one. In Zen, Ctrl+T in a
  panel did nothing visible, and Ctrl+Shift+T could bring back a closed
  panel's page.
- The find bar (Ctrl+F) in a web panel stays docked below the page, even
  with a theme, mod or `userChrome.css` that makes the find bar float, which
  in a panel covered half the page.

## [1.2.5] - 2026-09-24

### Fixed

- Web panel buttons no longer stay blank when a site's icon can't be loaded
  from its own server (seen with Instagram and GitHub until the panel was
  opened once). The icon stored in the browser's history is tried first,
  then the site's icon URL, Google's favicon service and finally a default
  icon, using the first that actually loads. A custom icon URL that doesn't
  load falls back to the site's own icon.

## [1.2.4] - 2026-09-24

### Added

- With Sine, the sidebar settings can also be changed from Sine's mod page
  (the gear button), not only from the sidebar's right-click menu. Keyboard
  shortcuts and settings export/import stay in the sidebar's own settings
  popup. Each setting is also its own `second-sidebar.*` preference in
  `about:config`. Restart the browser after updating for it to take effect.

## [1.2.3] - 2026-09-24

### Fixed

- With auto-hide on, moving the mouse over an open web panel showed the
  sidebar well before the pointer reached the window edge, and kept it shown
  after the pointer moved back onto the panel
  ([#10](https://github.com/sinazadeh/zen-second-sidebar-enhanced/issues/10)).

## [1.2.2] - 2026-09-24

### Fixed

- On Wayland, settings popups opened from a web panel low in the sidebar (or
  by right-clicking low on it) no longer run off the bottom of the screen:
  they open towards the side with more room and scroll to fit
  ([#6](https://github.com/sinazadeh/zen-second-sidebar-enhanced/issues/6)).
  `second-sidebar.fit-popups-to-window` turns this on (`true`) or off
  (`false`) on any platform.

## [1.2.0] - 2026-09-24

### Fixed

- Edit and settings popups are capped to the window height and scroll their
  contents, so the Save button stays visible when a web panel isn't pinned
  ([#6](https://github.com/sinazadeh/zen-second-sidebar-enhanced/issues/6)).
- Importing settings could be silently undone before the restart, because
  open windows kept saving their old settings (opening, moving or resizing a
  panel was enough). Saves are now paused in every window until the browser
  restarts, and the import offers to restart right away.
- Editing, moving or deleting a temporary web panel no longer throws errors
  in other browser windows.
- Editing a panel's CSS selector right after its URL no longer cancels the
  navigation to the new URL.
- A settings change made just before closing a window is no longer lost.
- On current Firefox, the hidden web panel window no longer retries a
  urlbar patch every 50 ms forever; the patch is skipped where Firefox no
  longer needs it and gives up after 30 seconds otherwise.
- Several windows starting at once (e.g. restoring a session) no longer
  race over the same temporary patched-module file.

### Added

- An unreadable settings or web panel data file is kept as a
  `*.corrupt-<timestamp>` copy (or a `.corrupt` pref) before defaults are
  used, instead of being overwritten on the next save.
- A browser update that breaks one of the addon's patches to Firefox code
  now logs a clear warning (with the browser version) in the Browser
  Console instead of failing silently.
- Settings import rejects files with missing or duplicate web panel ids or
  URLs, or from a newer, incompatible export format, before writing
  anything.
- Unit tests (`node --test`), a weekly check of the patches against current
  Firefox sources, a release workflow and a bug report form.

### Changed

- The "Sync upstream" workflow no longer pushes a branch or tries to open a
  PR when upstream has nothing new, skips runs while a sync PR is still
  open, and deletes its branch if the PR can't be opened.
- CI actions updated to their Node 24 versions; Prettier is pinned to the
  same version locally and in CI, and also checks JSON files.
- The default branch is now `main` (was `master`), so Sine installs with the
  plain `sinazadeh/zen-second-sidebar-enhanced`. Existing installs added as
  `.../tree/master` keep working.

## [1.1.0] - 2026-09-21

### Fixed

- A settings pref or data file that can't be parsed no longer stops the
  sidebar from loading; defaults are used instead.

## [1.0.0] - 2026-09-20

First versioned release of the fork. On top of
[aminought/firefox-second-sidebar](https://github.com/aminought/firefox-second-sidebar)
and the Zen fixes from
[Ezo-mas/zen-second-sidebar-fix](https://github.com/Ezo-mas/zen-second-sidebar-fix):

- Zen Browser layout support (vertical tabs, split view, workspaces,
  compact mode, both sidebar sides) alongside standard Firefox.
- Web panel settings: `Reload when address changes` and
  `Unload after inactivity`.
- Sidebar settings: `Export settings` / `Import settings`.
- Installation as a [Sine](https://github.com/CosmoCreeper/Sine) mod via
  `theme.json`, alongside fx-autoconfig.
- Windows GPU compositing fix for web panels rendering as a blank frame.
