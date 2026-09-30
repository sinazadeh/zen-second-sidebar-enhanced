---
name: sb2-ui-layout
description: Zen and Firefox layout, CSS and theming rules for the sidebar - browser container resolution, sb2- and Zen theme tokens, Zen containment and surfaces, collapse margins, popups and toolbar widgets, plus the Zen compatibility checklist. Use when changing css/, UI under xul/, sidebar geometry or collapse behavior, popups, or anything that has to fit and look right in both Zen and Firefox.
---

# UI, layout and theming

Paths are relative to `src/second_sidebar/`. Every change has to work in
both Zen Browser and standard Firefox, with the sidebar on either side.

## Conventions

- Support both Zen Browser and standard Firefox layout hierarchies. Avoid hardcoding
  `#browser` when attaching or sizing wrappers; use `requireBrowserContainerElement()`
  or selectors targeting `#zen-tabbox-wrapper, #browser`.
- Use existing `sb2-` IDs/classes and `--sb2-` CSS variables for new sidebar
  styles. In Zen Browser, adhere to `--sb2-zen-*` theme variables, `--zen-border-radius`,
  `--zen-element-separation`, and `--zen-colors-*`. Preserve `:root:has(#zen-tabbox-wrapper)`
  and `[zen-right-side="true"]` rules. Add new CSS exports to `sidebar_decorator.mjs`
  when they need to be injected.
- Match native theme tokens and controls. Keep keyboard focus, shortcuts, tooltips,
  and both sidebar positions working across both browsers.
- When uncollapsing the sidebar in controllers, remove inline margin properties
  (`removeProperty("margin-right")` / `removeProperty("margin-left")`) rather than
  forcing `0px`, allowing Zen's flex/grid layout engine to position adjacent content correctly.
- `MozButton` and `Toggle` wrap HTML custom elements with `isXUL: false`;
  popup/menu wrappers use XUL. Reuse their factories when adding controls.
- Before changing layout CSS, trace the controller that sets the element's
  attributes and geometry. Keep calculated dimensions/offsets in the geometry
  flow; physical panel anchors are not interchangeable with logical CSS spacing.
  Preserve theme-token fallbacks and affected `browser.nova.enabled` rules.
- Reuse widget readiness helpers such as `doWhenButtonReady`; CustomizableUI
  instances are not always available synchronously in every window.

## Zen containment and surfaces

- **Zen Browser chrome containment**: Zen wraps its tabbox and content inside
  `#zen-tabbox-wrapper`. `SidebarBoxArea` (`xul/sidebar_box_area.mjs`) calculates
  dimensions relative to `#zen-tabbox-wrapper` and reserves spacing using
  `--zen-element-separation` (defaulting to 6px) and wrapper side positioning.
  With the sidebar on the window-edge side, `#zen-tabbox-wrapper` loses Zen's
  margin there and `#sb2-main`'s `margin-inline-start` keeps the gap, even
  when collapsed. An overlay sidebar (auto-hide set to overlay) is out of the
  flow, so the wrapper gets that gap back as padding (issue #23), unless the
  **Keep gap at window edge** setting (`autoHideEdgeGap`, `edge-gap` on
  `#sb2-main`) is off. A collapsed `#sb2-main` is only slid out of the
  window, so `[sb2-collapsed]` hides it, or its shadow paints a strip along
  the edge.
- **Zen surfaces**: the sidebar and a pinned panel are deliberately
  transparent (`--sb2-zen-surface`) so Zen's window background shows through,
  like Zen's own sidebar. A floating panel (`#sb2-box[pinned="false"]`) and
  the geometry hint sit over the page, so they get `--sb2-zen-floating-surface`
  (the colour of Zen's floating compact-mode sidebar), or with
  `zen.theme.acrylic-elements` (on by default) the same backdrop blur Zen
  uses under `--sb2-zen-floating-acrylic-surface`, the tint Zen puts over
  that blur (issue #23). Don't drop that tint: with
  `browser.tabs.allow_transparent_browser`, a page can be almost fully
  transparent, leaving the blur nothing to show. Don't rely on
  `--zen-colors-*` alone for a surface over the page: transparency themes and
  mods clear them.

## Popups

- Open settings-style popups (`.sb2-popup`) with
  `Panel#openPopupWithinWindow` / `#openPopupAtScreenWithinWindow`, not
  plain `openPopup`/`openPopupAtScreen`. On Wayland, Firefox leaves popups
  that don't fit on screen to the compositor, which may not move them back,
  so these methods open the popup towards the side of its anchor with more
  room and cap its height to that room (`--sb2-popup-max-height` in
  `css/popups.mjs`). The `second-sidebar.fit-popups-to-window` pref forces
  this on (`true`) or off (`false`) on any platform.

## Zen compatibility checklist

Before committing any change to source files, verify:

- [ ] Container attachment uses `requireBrowserContainerElement()` (not bare `#browser`).
- [ ] New CSS selectors target `#zen-tabbox-wrapper` alongside `#browser` where needed.
- [ ] Sidebar uncollapse uses `removeProperty("margin-right")` / `removeProperty("margin-left")`
      rather than setting `0px` inline.
- [ ] Nested panel windows are marked with `_zenStartupSyncFlag = "unsynced"` and
      `zen-unsynced-window="true"`.
- [ ] New `--sb2-*` CSS variables have Zen-aware fallbacks using `--sb2-zen-*` tokens.
- [ ] Both `[zen-right-side="true"]` sidebar positions work correctly.
- [ ] `WebPanelsBrowser.forceRepaint()` is called after tab switches on Windows.
- [ ] `npx prettier --write`, `npx eslint` and `node --test "tests/*.test.mjs"` pass.

## References

- [Zen Browser Desktop Repository](https://github.com/zen-browser/desktop)
- [Firefox desktop components](https://firefoxux.github.io/firefox-desktop-components/)
