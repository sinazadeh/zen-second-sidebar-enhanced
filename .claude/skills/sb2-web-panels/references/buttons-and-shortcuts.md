# Panel buttons, reordering and shortcuts

Paths are relative to `src/second_sidebar/`.

## Pressing a button

`WebPanelController#createWebPanelButton` switches panels on **mousedown**
(upstream #209, for responsiveness), except for the open panel's button,
which closes it on **click**: pressing it must not close the panel, so it
can be dragged, as pressing a selected tab keeps it selected. A drag fires
no click, so dragging a closed panel's button opens it (like dragging a tab
selects it) and dragging the open one leaves it open. Middle-click unloads.

## Reordering

The buttons' order is CustomizableUI's placements in the `#sb2-main` area:
Customize Toolbar... edits it, and next/previous panel shortcuts follow it
(`#getAllInButtonOrder`). `SidebarMainController#setupReordering` lets a
panel button be dragged outside Customize mode: `dragstart` puts the widget
id on the drag as `application/x-sb2-web-panel`, `dragover` marks the item
it would go before or after (`[sb2-drop]`, styled in `css/sidebar_main.mjs`)
from the pointer and the items' midlines, and `drop` calls
`CustomizableUIWrapper.moveWidgetWithinArea`, which saves the order and
moves the button in every window. Hidden buttons (other Zen spaces) aren't
targets. A dropped link (no such type) still makes a new panel. Never move
the nodes yourself: CustomizableUI would put them back.

Headless Firefox and Zen have no drag service, so real drags
(`EventUtils.synthesizePlainDragAndDrop`) need an X server (`xvfb-run`);
synthetic `DragEvent`s with a `new DataTransfer()` cover the handlers
headless.

## Recording shortcuts

The shortcut fields (sidebar settings, Edit web panel) record keys on
`keypress`, and Escape on `keydown`. They carry `SHORTCUT_INPUT_ATTRIBUTE`
(`utils/keyboard.mjs`), and the popups' Escape handlers, which listen on the
window in the capture phase to close the popup, ignore events from them
(`isShortcutInputEvent`): in a shortcut field Esc is a key like any other.
Recorded named keys are upper case (`ESCAPE`, `F5`).

## Running shortcuts

`controllers/shortcuts.mjs` listens for `keypress` in the main window and the
panels' window. An Escape shortcut only runs when nothing else used the
press: not when it was prevented (a page or Firefox handled it), and not
while a menu or popup is open (Esc is closing it). A page that handles Esc
without preventing it still gets it as well.
