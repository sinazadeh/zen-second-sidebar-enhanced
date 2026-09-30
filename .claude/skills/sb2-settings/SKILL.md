---
name: sb2-settings
description: Adding or changing Second Sidebar settings end to end - sidebar settings and their mirrored prefs, web panel edit settings, change reverters, settings classes, storage, cross-window events and settings import/export. Use when adding, renaming or removing a setting, or changing settings/, the settings popups, preferences.json, events.mjs or settings import/export.
---

# Settings

Paths are relative to `src/second_sidebar/` unless they start at the
repository root. Import/export has its own rules, in
[settings import and export](references/import-export.md); read them before
changing the export format or anything that writes settings.

## Adding a setting

Follow an existing setting through these files under `src/second_sidebar/`:

- Sidebar: `xul/sidebar_main_popup_settings.mjs` →
  `controllers/sidebar_main_settings.mjs` → `controllers/events.mjs` → the
  receiving controller → `settings/sidebar_settings.mjs`. Also give it a pref
  in `settings/sidebar_prefs.mjs` and a control in the root `preferences.json`
  (Sine's mod settings dialog), and add its event to `FIELD_EVENTS` in
  `controllers/sidebar_prefs.mjs`; `tests/sidebar_prefs.test.mjs` fails until
  the first two match `SidebarSettings`. Only settings that need the popup's
  own input handling (keyboard shortcuts) are left out.
- Panel editing: `xul/web_panel_popup_edit.mjs` →
  `controllers/web_panel_edit.mjs` → `controllers/events.mjs` →
  `controllers/web_panels.mjs` (bind it with `#bindSimpleSetting` /
  `#bindGeometrySetting` / `#bindSimpleAction` unless it needs real branching
  logic) / `controllers/web_panel.mjs` → `settings/web_panel_settings.mjs`.
  Also check the new-panel popup/controller when the setting should be
  available during creation.

Both settings dialogs apply changes live, and Save persists them. Closing
without saving (Cancel, Escape, clicking outside) asks for confirmation when
something changed, then rolls each changed field back through the popup's
`#getChangeReverters()` list (upstream code, so keep it close to upstream's
shape to ease merges). When adding a setting to either popup, add its
reverter there too, or discarding changes will leave it applied.

## Wiring web panel settings

- For a new "call one setter, maybe with a small fixed follow-up" web panel
  setting, wire it in `web_panels.mjs` via `#bindSimpleSetting` (or
  `#bindGeometrySetting` for floating-geometry fields, `#bindSimpleAction`
  for no-argument actions) rather than a bespoke `listenEvent` block.
  Debounced edit handlers keep their timers per panel (`KeyedTimeouts`,
  `utils/keyed_timeouts.mjs`), so editing one panel can't cancel another's
  pending update.
  Settings with real branching logic (different values calling different
  methods, debounced timeouts, reload-if-changed checks) stay hand-written
  alongside the bound ones in `#setupListeners`.

## Settings classes

- Settings classes that are a flat bag of primitive fields (`SidebarSettings`,
  `WebPanelState`, `FloatingWebPanelGeometrySettings`) implement
  `fromObject`/`toObject` by spreading the source object/instance rather
  than listing every field three times; only override the fields that need
  special handling (nested settings objects, computed defaults). Classes
  with those - `WebPanelSettings` (nested `floatingGeometry`/
  `pinnedGeometry`) and the collection wrappers (`WebPanelsSettings`,
  `WebPanelsState`) - use spread for their flat fields too but keep the
  nested/collection parts explicit; don't force a fully generic schema over
  them.

## Storage

- Sidebar settings are a JSON string preference (`second-sidebar.settings`).
  Each one except the keyboard shortcuts is mirrored to its own
  `second-sidebar.*` pref for Sine's settings dialog: `SidebarPrefsController`
  writes them from the JSON at startup and on every save, and applies and
  saves a valid change made to one (invalid values are written back). The
  JSON stays the source of truth, so importing settings doesn't touch the
  mirrored prefs until the restart rewrites them.
  Web panel settings and state are JSON files in the profile's
  `chrome/second-sidebar-data/` (`web-panels.json`, `web-panels-state.json`,
  via `FileSettings` in `settings/settings.mjs`); the older
  `second-sidebar.web-panels`/`second-sidebar.web-panels-state` prefs are only
  read once, to migrate. If saved data can't be read, a copy is kept
  (`*.corrupt-<timestamp>.json`, or a `<pref>.corrupt` pref) before defaults
  are used, since the next save overwrites the original. Preserve saved user
  data and defaults for missing fields. When adding a setting, update its
  model, load/save or `fromObject`/`toObject` paths, UI, and event handling
  together. Keep panel settings distinct from state such as `lastUrl`.
  Web panel saves are debounced and flushed when the window unloads.

## Cross-window events

- Use `controllers/events.mjs` for cross-window actions. Preserve event names,
  UUIDs, payload fields, and `isActiveWindow` behavior. Permanent panels are
  shared across windows; temporary creation is limited to the active window.
  Since events go to every window, a window can receive an event for a
  temporary panel it doesn't have: per-panel listeners must ignore unknown
  uuids (use `WebPanelsController#listenWebPanelEvent`, which the `#bind*`
  helpers already do, or check `webPanelsController.get(uuid)` for null).
