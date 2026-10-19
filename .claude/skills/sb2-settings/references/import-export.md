# Settings import and export

Paths are relative to `src/second_sidebar/`.

Backup lives on the settings page (`settings_page/settings.mjs`: the
dialogs, file picking and messages), which asks the browser window for the
data and the writes (`controllers/settings_page.mjs`: `exportSettings`,
`readBackup`, `restoreBackup`); the file format is in
`settings/settings_export.mjs`. A file is
`{ version, exportedAt, sidebarSettings, webPanels }`, either part left out
when the user doesn't choose it (state such as `lastUrl`
is deliberately excluded - see "Storage" in
[the settings skill](../SKILL.md)). Web panels are exported in the order of
their buttons (CustomizableUI placements), since `dumpSettings()` keeps
creation order. `parseSettingsExport` validates the
whole file (web panel uuids/urls, duplicate uuids, newer `version`) before
anything is written. A setting whose value isn't of its default's type, or a
sidebar setting outside its `SIDEBAR_PREFS` values, gets its default and is
listed in `invalidSettings`, which the import reports; fields the settings
class doesn't have (an old `mobile`) are passed through for it to read. A
list setting (a web panel's `spaces`) must be a list of strings. Web panels
restored without sidebar settings take their defaults from the sidebar
settings in use (`sidebarSettingsInEffect`). Import writes straight to the same storage
`SidebarSettings`/`WebPanelsSettings.save()` already use rather than
hot-applying live, since a wholesale replacement can add/remove entire panels
and containers at once; a restart picks it up like any fresh window. Until
then every open window still holds its pre-import settings and would save
them back on ordinary actions (opening, moving or resizing a panel), so the
import first sends `SidebarEvents.SUSPEND_SETTINGS_SAVES`, which makes
`SidebarController.saveSettings()` and `WebPanelsController.saveSettings()`
no-ops in every open window until the browser restarts (never lifted, even if
the write fails: after an earlier import, resuming would let windows save
their pre-import settings over it), then offers to restart. Windows opened
after the import load the imported files, so they aren't suspended. Route
new settings writes through those two methods so they respect the
suspension. Bump
`EXPORT_VERSION` only for a breaking shape change (a field
renamed/repurposed) - a new optional field doesn't need it, since the
settings classes' own constructor defaults already backfill it for older
exports. Version 2 renamed a web panel's `mobile` to `userAgent`; version 3
lets a part be left out, so only a backup with one part is written as 3 (a
full one stays 2, which older versions import). Temporary
panels are never exported (`WebPanelsSettings#persistentWebPanels`).
