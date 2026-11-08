# Zen spaces and context menu items

Paths are relative to `src/second_sidebar/`.

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
