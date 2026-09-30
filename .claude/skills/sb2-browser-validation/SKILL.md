---
name: sb2-browser-validation
description: Manual validation of Second Sidebar in a real Firefox or Zen profile - test-profile setup for fx-autoconfig and Sine, which scenarios to exercise for a change, and what to record. Use when a change touches browser UI or runtime behavior, before claiming such a change works, or when writing a pull request's manual-validation notes.
---

# Firefox and Zen Browser validation

Node tests and lint can't exercise privileged browser APIs or XUL UI, so any
change that touches the browser needs a run in a real profile.

Use a dedicated test profile with fx-autoconfig (or Zen's script loader):

1. Locate the test profile folder (in Firefox or Zen, navigate to `about:support`
   and click **Open Folder** / **Show in Finder** next to _Profile Folder_).
2. Copy `src/second_sidebar.uc.mjs` and `src/second_sidebar/` into the profile's
   `chrome/JS/` folder.
3. Ensure `toolkit.legacyUserProfileCustomizations.stylesheets` and
   `dom.allow_scripts_to_close_windows` are set to `true` in `about:config`.
4. Clear the startup cache (via `about:support` → **Clear startup cache...** or
   by deleting the `startupCache` directory inside the profile folder) and restart.

For changes to `theme.json`, the startup fallback in `second_sidebar.uc.mjs`,
or anything under "Loader portability" in
[sb2-loader-portability](../sb2-loader-portability/SKILL.md), also install via Sine on a
separate test profile (add the repo as `<owner>/<repo>`, which Sine reads
from the `main` branch, or `<owner>/<repo>/tree/<branch>` to test another
branch) rather than assuming the fx-autoconfig
path alone covers it; the two loaders serve this addon's files from different
chrome:// origins.

Select manual scenarios according to the change:

- **General**: Startup, sidebar show/hide, left/right placement, toolbar customization.
- **Zen-specific scenarios**:
  - Zen vertical tabs / sidebar on left vs right (`[zen-right-side="true"]`).
  - Second sidebar positioned on the same side as Zen's tab bar vs opposite side.
  - Zen compact mode (collapsing Zen's sidebar) and auto-hide overlay behavior.
  - Zen split views and workspace switching while web panels are active.
  - Floating panel placement inside `#zen-tabbox-wrapper` and margin spacing.
  - Windows GPU rendering (ensuring web panels do not open as blank frames).
- **Panels**: Panel create/edit/delete, navigation, close/reopen, and temporary panels.
  Disable "Unload from memory after closing" for panel A, switch from panel A to
  panel B, then close panel B by clicking a browser tab. Confirm panel A does not
  reopen, and reopening panel A preserves its page and session state.
- **Geometry & Lifecycle**: Floating/pinned geometry, resizing, auto-hide, and shortcuts.
- **Multi-window**: A second browser window, propagation of edits, and persistence.
- **Tabs & Media**: Containers, zoom, mute, unload/reload, and permission popups.
- **Extension popups & passkeys**: With a panel open, start and cancel or complete
  a Bitwarden passkey prompt. Confirm the Bitwarden window has no `#sb2-wrapper`,
  its credential list is visible without unloading the panel, and the panel is
  still usable afterward. Open a normal browser window as a control and confirm
  the sidebar still loads there.
- **Theming**: Light/dark themes, Zen accent surfaces, and conditional theme tokens.

Check the Browser Console (`Ctrl+Shift+J` or `Cmd+Shift+J`) for errors. Record the
browser version (Firefox or Zen), operating system, and scenarios actually exercised.
If the browser cannot be run, state which runtime checks remain unverified.

## References

- [fx-autoconfig installation and startup cache](https://github.com/MrOtherGuy/fx-autoconfig)
