# Settings import and export

Paths are relative to `src/second_sidebar/`.

Settings export/import (sidebar settings popup → `sidebar_main_settings.mjs`,
file format in `settings/settings_export.mjs`) writes a single JSON file:
`{ version, exportedAt, sidebarSettings, webPanels }` (state such as `lastUrl`
is deliberately excluded - see "Storage" in
[the settings skill](../SKILL.md)). `parseSettingsExport` validates the
whole file (web panel uuids/urls, duplicate uuids, newer `version`) before
anything is written. A setting whose value isn't of its default's type, or a
sidebar setting outside its `SIDEBAR_PREFS` values, gets its default and is
listed in `invalidSettings`, which the import reports; fields the settings
class doesn't have (an old `mobile`) are passed through for it to read. Import writes straight to the same storage
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
exports. Version 2 renamed a web panel's `mobile` to `userAgent`. Temporary
panels are never exported (`WebPanelsSettings#persistentWebPanels`).
