# The settings page

Paths are relative to `src/second_sidebar/`.

`settings_page/settings.html` is a chrome:// page opened in a tab
(`controllers/settings_page.mjs`, from the main menu's **Sidebar settings**
and Sine's gear button); it's the only place the sidebar settings are edited
(the fork removed upstream's settings popup). The settings write the
mirrored prefs, so `SidebarPrefsController` applies and saves them in every
window, as for Sine's dialog. Keyboard shortcuts and backups need the
sidebar itself: `SettingsPageController` offers them to the page as
`SecondSidebarSettingsPage` on each browser window (the page uses its own
window's, `browsingContext.topChromeWindow`). The page records shortcuts on
keydown and stops the event, so the window's `Shortcuts` (on keypress) never
sees the keys. Its preview is drawn from the prefs alone. Keep its look in
step with Tab Groups' settings page, which it's modeled on (credited in the
README).
The gear is taken over by a capture click listener on each about:preferences
document, remembered by document: `browser.contentWindow` is the tab's window
proxy, the same for every page the tab loads, so keying on it missed a
reloaded or session-restored page.

- What the page shows is in `settings_page/layout.mjs` (Node-tested):
  `SETTINGS_PAGE_SECTIONS`, one control per mirrored pref in
  `SIDEBAR_PREFS`'s order, and `SETTINGS_PAGE_SHORTCUTS`.
- Backup: [import and export](import-export.md).
- When no browser window runs the sidebar (or the page is opened as a
  file), `sidebar()` in `settings.mjs` returns null: the shortcut boxes and
  backup buttons are disabled, and the not-running banner shows.
