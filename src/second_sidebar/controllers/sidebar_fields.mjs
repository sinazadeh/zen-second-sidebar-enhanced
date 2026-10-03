// How each sidebar setting change reaches every window's sidebar. Keep this
// module free of browser globals (events are named by their key in
// SidebarEvents): tests/settings_wiring.test.mjs checks it in Node against
// the settings popup's callbacks, the events and the mirrored prefs.

/**
 * The event, in SidebarEvents, that applies each sidebar setting, sent as
 * `{ value }` by the settings popup (SidebarMainSettingsController) and for a
 * change to its mirrored pref (SidebarPrefsController). Keyed by setting,
 * which is also the popup's callback name.
 *
 * @type {Object<string, string>}
 */
export const SIDEBAR_FIELD_EVENTS = {
  position: "EDIT_SIDEBAR_POSITION",
  padding: "EDIT_SIDEBAR_PADDING",
  allowWindowDragging: "EDIT_SIDEBAR_ALLOW_WINDOW_DRAGGING",
  newWebPanelPosition: "EDIT_SIDEBAR_NEW_WEB_PANEL_POSITION",
  newWebPanelSpaces: "EDIT_SIDEBAR_NEW_WEB_PANEL_SPACES",
  defaultFloatingOffset: "EDIT_SIDEBAR_DEFAULT_FLOATING_OFFSET",
  autoHideBackButton: "EDIT_SIDEBAR_AUTO_HIDE_BACK_BUTTON",
  autoHideForwardButton: "EDIT_SIDEBAR_AUTO_HIDE_FORWARD_BUTTON",
  enableSidebarBoxHint: "EDIT_SIDEBAR_ENABLE_BOX_HINT",
  containerBorder: "EDIT_SIDEBAR_CONTAINER_BORDER",
  tooltip: "EDIT_SIDEBAR_TOOLTIP",
  tooltipFullUrl: "EDIT_SIDEBAR_TOOLTIP_FULL_URL",
  autoHideEdgeGap: "EDIT_SIDEBAR_AUTO_HIDE_EDGE_GAP",
  lastWebPanelShortcut: "EDIT_SIDEBAR_LAST_WEB_PANEL_SHORTCUT",
  nextWebPanelShortcut: "EDIT_SIDEBAR_NEXT_WEB_PANEL_SHORTCUT",
  previousWebPanelShortcut: "EDIT_SIDEBAR_PREVIOUS_WEB_PANEL_SHORTCUT",
  hideSidebarAnimated: "EDIT_SIDEBAR_AUTO_HIDE_ANIMATED",
  hideToolbarAnimated: "EDIT_SIDEBAR_TOOLBAR_AUTO_HIDE_ANIMATED",
  showOpenInSidebarItems: "EDIT_SIDEBAR_SHOW_OPEN_IN_SIDEBAR_ITEMS",
  showPreviewInSidebarItems: "EDIT_SIDEBAR_SHOW_PREVIEW_IN_SIDEBAR_ITEMS",
  linkClickModifier: "EDIT_SIDEBAR_LINK_CLICK_MODIFIER",
};

/**
 * The settings sent together in one EDIT_SIDEBAR_VISIBILITY event (with
 * sidebarWidgetShortcut), in the popup's `visibility` callback's order.
 */
export const VISIBILITY_FIELDS = [
  "autoHideSidebar",
  "autoHideSidebarBehavior",
  "sidebarWidgetHideWebPanel",
];
