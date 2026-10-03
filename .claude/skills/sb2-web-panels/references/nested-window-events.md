# The nested window's events

The web panels' tabs live in a nested chrome window (`xul/web_panels_browser.mjs`)
embedded in the main window. Input and window-level behavior cross that
boundary in ways that are easy to break. Paths are relative to
`src/second_sidebar/`.

- Keyboard shortcuts pressed in a web panel run in the nested window's own
  keysets (Zen rebuilds them from its shortcut settings, so don't edit its
  `<key>` elements). Commands that act on the browser window rather than the
  page (`MAIN_WINDOW_COMMANDS` in `xul/web_panels_browser.mjs`: new tab,
  reopen closed tab, address bar, web search) are caught in that window
  (capturing `command` listener) and run on the main window's matching
  `<command>` instead: otherwise Zen opens its new-tab address bar in the
  hidden window, and reopening a closed tab can restore a panel's own tab.
  Page commands (find, reload, zoom, print) stay in the panel.
- The panels' window is a full browser window, so Firefox's
  `BrowserWindowTracker` registers it too (the `browser-window-domcontentloaded`
  category), after the main window. That made it the "top window" that links
  from other apps (and other callers of `getTopWindow()`) open in, out of
  sight. `WebPanelsBrowser#initWindow` removes it with
  `BrowserWindowTrackerWrapper.untrack` (Firefox's `untrackForTestsOnly`, the
  only way it offers). Selecting a tab there that isn't a web panel's closes
  the sidebar (`WebPanelsController#setupWebPanelsBrowserListeners`), so
  anything else that can open tabs in that window is a bug too.
- Mods can float the find bar, stretch it over the page, or redefine
  `.browserContainer`'s grid so its `findbar` area is a side column, which
  covers half of a narrow web panel. Putting it back in that area isn't
  enough, so the panels' window gets an agent-level sheet
  (`css/findbar.mjs`, loaded with `WindowWrapper#loadAgentSheet`, since
  mods load their CSS as user sheets with `!important`) pinning it across
  the bottom with absolute positioning and `grid-area: auto`. Leave the
  main window's find bar to Zen and the user's mods: the owner asked for
  that after a main-window override misbehaved when the window was resized.
- Mouse events inside a web panel bubble from that nested window up to the
  main window's listeners (its `<browser>` is the nested window's chrome
  event handler), so `event.target` can belong to the panel's document (see
  `WebPanelsBrowser#activeWebPanelContains`). Their `screenX` isn't in the
  main window's coordinates, though (issue #10): map such events through
  the embedded browser's box, as `SidebarMainCollapser#getScreenX` does.
- The panels' window's tab events bubble the same way, and Zen listens for
  them on the main window: split view (`ZenViewSplitter`), spaces, folders and
  Glance treat the panels' tabs as the main window's, and split view throws
  on every panel switch. `WebPanelsBrowser` stops `TabOpen` and `TabSelect`
  from that window at its `<browser>` (`PANELS_WINDOW_ONLY_EVENTS`). Leave
  `TabAttrModified`, `TabClose` and `TabBrowserDiscarded` to pass: Zen's media
  controls show and clean up a panel's audio with them. Capturing listeners
  on the main window still see everything, since they run first.
- Modifier-clicks on page links reach `LinkClickController`
  (`controllers/link_click.mjs`) through `patchers/content_click_hook.sys.mjs`,
  which replaces `ClickHandlerParent.prototype.contentAreaClick` (Firefox
  opens Shift/Ctrl-clicked links there, before its click listeners run).
  That prototype is shared by every window, so the hook is imported with
  `ChromeUtils.importESModule` into the shared system global: a replacement
  made in a window's own module would turn into a dead object when that
  window closed, breaking link clicks in every other window. Windows register
  a handler keyed by their `window` (look it up from a browser with
  `ownerDocument.defaultView`; `ownerGlobal` is a different object) and remove
  it on `unload`. Bookmark and history clicks are `command` events with the
  click's modifier keys, caught by a capturing listener on the window. Zen
  Glance takes single-modifier clicks it's set to (Alt by default) in the
  page, before any of this runs, hence the Alt+Shift default.
