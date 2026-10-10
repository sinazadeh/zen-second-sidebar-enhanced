---
name: sb2-web-panels
description: Web panel lifecycle and the hidden browser window whose tabs back the panels - tab creation, switching and unloading, safeCall around removeTab, Zen isolation of that window, repaints, icons, selectors and containers. Use when changing controllers/web_panel*.mjs, xul/web_panels_browser.mjs, xul/base/tab.mjs, panel icons or selectors, or anything that creates, switches, navigates or unloads panel tabs.
---

# Web panels and their window

Paths are relative to `src/second_sidebar/`. How events from inside a panel
reach the main window (keyboard shortcuts, window tracking, the find bar,
mouse events and modifier-clicks on links) is in
[the nested window's events](references/nested-window-events.md); read it
before changing any of those.

## The panels' window

- `xul/web_panels_browser.mjs` hosts a nested chrome window whose tabs back the
  panels. Its startup observers, SessionStore handling, close commands, popup
  notifications, and URL-bar patches are part of the implementation.
  Validate changes to this code in a real browser instance.
- **Nested panel isolation in Zen**: The embedded chrome window hosting web panels
  must be flagged with `win._zenStartupSyncFlag = "unsynced"` and
  `zen-unsynced-window="true"` during creation and startup observers. This stops
  Zen from treating the panel's internal window as a syncable workspace or tabbox.
  Also ensure `#zen-appcontent-navbar-wrapper` remains hidden inside panel chrome.
- `WebPanelsBrowser#deselectWebPanelTab` (closing the sidebar) selects the
  window's own tab, the one with no `uuid`. Not with `selectTabAtIndex()`:
  it counts only visible tabs, and Zen doesn't count its empty tab, so in
  Zen it reselected a panel's tab. The closed panel then stayed selected,
  its page active, its button open, and unload-on-close never ran.
- **GPU compositing on Windows (Zen)**: Switching or showing web panels on Windows
  under Zen can occasionally leave a blank frame. `WebPanelsBrowser.forceRepaint()`
  briefly toggles `opacity: 0.9999` to force the compositor to paint content.

## Panel tabs

- Every web panel tab is created with `tab.setUndiscardable(true)`
  (`xul/base/tab.mjs`) so Firefox's automatic memory-pressure tab unloader
  can't silently discard one out from under `WebPanelController`'s own
  `#tab` state - being playing-audio or selected only deprioritizes a tab
  for that unloader, it doesn't exempt it, and that hidden window isn't
  reliably recognized as "foreground" either. If a future Firefox/Zen build
  drops or renames this property, `addWebPanelTab` logs a `console.warn`
  (not gated behind `Logger.debug`) - don't silence that without addressing
  the underlying exposure. Panels are only meant to unload through
  `WebPanelController#unload`/`close()` (including its own
  `unloadAfterInactivity` timer), never through Firefox's own unloader.
- `WebPanelController#unload`/`#removeTab` wrap the actual
  `gBrowser.removeTab()` call in `safeCall` because a Gecko-internal urlbar
  reformat inside `permitUnload` can throw there (see the long comment in
  `urlbar_input_patcher.mjs`); losing that wrapper reintroduces a bug where
  a "closed" panel's tab silently stays alive in the background.
- **Reload when address changes** (`reloadOnUrlChange`, on for the Bitwarden
  preset, whose vault reads the current tab only when it loads) reloads a
  panel only while it's shown (`WebPanelController#reloadIfSiteChanged`,
  debounced in `WebPanelsController#setupMainBrowserListener`); a closed
  panel catches up in `open()` if the main tab's site differs from the one
  it loaded with. Reloading closed panels on every tab switch made the
  browser slow (each reload restarts Bitwarden's whole app).
- **User Agent** (`userAgent`, `customUserAgent`): the choices and the
  strings they send are in `utils/user_agents.mjs`, kept free of browser
  globals so `tests/user_agents.test.mjs` runs it in Node.
  `WebPanelBrowser#setUserAgent` applies one with `customUserAgent` on the
  tab's browsing context. Firefox Mobile is built from the running Gecko
  version; the Samsung Internet and Safari strings are fixed, so refresh them
  when those browsers ship a new major version. A custom user agent can come
  from an imported file and is sent as an HTTP header, so
  `sanitizeUserAgent` keeps it to one line. Changing the setting reloads a
  loaded panel only if the string it sends changed; typing a custom one is
  debounced per panel.
- Preserve container identity and the existing loading/security context when
  creating or navigating panel tabs. Account for temporary panels, unload on
  close, reload timers, listeners, and observers when changing panel lifecycle.

## Zen spaces

- A web panel's `spaces` (Zen's spaces, formerly workspaces; none for all)
  decide where its button shows: `WebPanelsController#applySpaces` runs
  `isWebPanelInSpace` (`utils/spaces.mjs`) for this window's active space at
  startup, after every switch, when spaces change and after customizing.
  A panel outside the space gets `sb2-outside-space` on its button (shown
  anyway while customizing), closes if open, and is skipped by shortcuts and
  next/previous. The panel being edited is left alone until Edit web panel
  closes. On a switch, `#onSpacesChanged` remembers the panel open in the
  space left and reopens the new space's one if nothing is open. A new
  panel's spaces (`newWebPanelSpaces`) are worked out in the window that
  makes it and sent in `CREATE_WEB_PANEL`, since each window has its own
  active space.
- Go through `ZenSpacesWrapper` (`wrappers/zen_spaces.mjs`), not
  `gZenWorkspaces` directly. Zen awaits its `addChangeListeners` callbacks in
  the middle of switching spaces, so a callback that throws breaks the switch;
  the wrapper catches. `getWorkspaces()` returns the list in current Zen but a
  promise in older versions, whose cache was `{ workspaces }`.

## Context menu items

- The "Open…/Preview… in Second Sidebar" items are created in
  `sidebar_elements.mjs` and handled in `controllers/context_menu_items.mjs`.
  Firefox arranges `#tabContextMenu` when it's first shown
  (`TabContextMenu.MENU_SECTIONS` through `MenuSectionLayout`) and, if any
  item it doesn't know sits before its own last one, logs an error and
  leaves the whole menu unarranged. So the tab items go at the end, where
  extensions' items go, and never into a submenu such as **Move Tab**.

## Icons and selectors

- Extension presets (`utils/web_panel_presets.mjs`) are installed extensions
  with a `sidebar_action` page, plus those `EXTENSION_OVERRIDES` gives a
  `page` for (1Password has none, so its popup, `popup/index.html`). Pages
  are resolved with the extension's policy: the `moz-extension://` UUID is
  random per profile, so never hardcode one.

- Web panel icons: `fetchIconURL` (`utils/icons.mjs`) returns the first
  candidate that actually loads as an image in the window
  (`firstLoadableIcon`): Places' stored copy (`cached-favicon:`, only when
  Places returned a favicon, since that protocol serves the default icon for
  unknown ones), the favicon's own URL, Google's favicon service, then
  `FALLBACK_ICON`. Custom icons go through
  `WebPanelButton#setIconWithFallback`. Don't put an unverified network icon
  URL on a button: if it fails to load (a tracker-blocked CDN, an
  unreachable host), the button stays blank.
- A web panel's selector (`WebPanelController#applySelector`) runs as a
  `javascript:` URL in the panel's page, with that website's permissions.
  Build it with `buildSelectorScript` (`utils/selector_script.mjs`), which
  passes the selector as a JSON string literal and percent-encodes the whole
  script (`javascript:` URLs are percent-decoded before they run, so a `%22`
  would otherwise end the string). Never paste a settings value into
  page-side code: settings can come from an imported file.
