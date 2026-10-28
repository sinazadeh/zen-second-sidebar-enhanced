// How each sidebar setting change reaches every window's sidebar. Keep this
// module free of browser globals (events are named by their key in
// SidebarEvents): tests/settings_wiring.test.mjs checks it in Node against
// the settings and events.

/**
 * The event, in SidebarEvents, that applies each sidebar setting, sent as
 * `{ value }` from SettingsPageController. Keyed by setting.
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
  webPanelMiddleClickAction: "EDIT_SIDEBAR_WEB_PANEL_MIDDLE_CLICK_ACTION",
  containerBorder: "EDIT_SIDEBAR_CONTAINER_BORDER",
  tooltip: "EDIT_SIDEBAR_TOOLTIP",
  tooltipFullUrl: "EDIT_SIDEBAR_TOOLTIP_FULL_URL",
  autoHideEdgeGap: "EDIT_SIDEBAR_AUTO_HIDE_EDGE_GAP",
  autoHideOverlayGap: "EDIT_SIDEBAR_AUTO_HIDE_OVERLAY_GAP",
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
 * sidebarWidgetShortcut), in SidebarController#setVisibilitySettings's
 * order.
 */
export const VISIBILITY_FIELDS = [
  "autoHideSidebar",
  "autoHideSidebarBehavior",
  "sidebarWidgetHideWebPanel",
];
