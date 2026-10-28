# The settings page

Paths are relative to `src/second_sidebar/`.

`settings_page/settings.html` is a chrome:// page opened in a tab by the main
menu's **Sidebar settings** item; it's the only place the sidebar settings are
edited (the fork removed upstream's settings popup and does not expose a Sine
preferences file). `SettingsPageController` offers settings, shortcuts and
backup methods to the page as `SecondSidebarSettingsPage` on each browser
window (the page uses its own window's,
`browsingContext.topChromeWindow`). Setting changes are validated, sent
through `controllers/events.mjs` to every window and saved to
`second-sidebar.settings`. The page records shortcuts on keydown and stops
the event, so the window's `Shortcuts` (on keypress) never sees the keys.
Keep its preview and look in step with Tab Groups' settings page, which it's
modeled on (credited in the README).

- What the page shows is in `settings_page/layout.mjs` (Node-tested):
  `SETTINGS_PAGE_SECTIONS`, one control per non-shortcut `SidebarSettings`
  field, and `SETTINGS_PAGE_SHORTCUTS`.
- The fixed choices and validation shared with backup import are in
  `settings/sidebar_validation.mjs`.
- Backup: [import and export](import-export.md).
- When no browser window runs the sidebar (or the page is opened as a
  file), `sidebar()` in `settings.mjs` returns null: shortcut boxes and backup
  buttons are disabled, and the not-running banner shows.
