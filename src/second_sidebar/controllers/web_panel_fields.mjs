// How each change made in Edit web panel reaches every window's web panels.
// Keep this module free of browser globals (events are named by their key in
// WebPanelEvents): tests/settings_wiring.test.mjs checks it in Node against
// the popup's callbacks, the events and WebPanelController.

/**
 * @typedef {Object} WebPanelField
 * @property {string} event the key of its event in WebPanelEvents
 * @property {string[]} values the event's fields, in the order the popup's
 *   callback passes them after the panel's uuid (a missing `timeout` is 0)
 * @property {string} [setter] the WebPanelController method every window
 *   applies the values with (WebPanelsController#bindFields); without one,
 *   or an action, the event has its own handler there
 * @property {string} [action] a WebPanelController method that takes no
 *   values
 * @property {boolean} [geometry] a floating-geometry setting, recalculated
 *   on screen once applied
 * @property {boolean} [numeric] its value comes as a string (a menu list's)
 * @property {boolean} [returnsZoom] the callback returns the panel's zoom
 */

/**
 * Keyed by the popup's callback names (WebPanelPopupEdit#listenChanges).
 *
 * @type {Object<string, WebPanelField>}
 */
export const WEB_PANEL_FIELDS = {
  url: { event: "EDIT_WEB_PANEL_URL", values: ["url", "timeout"] },
  title: {
    event: "EDIT_WEB_PANEL_TITLE",
    values: ["dynamicTitle", "title"],
    setter: "setTitle",
  },
  faviconURL: {
    event: "EDIT_WEB_PANEL_FAVICON_URL",
    values: ["dynamicFavicon", "faviconURL", "timeout"],
  },
  selectorEnabled: {
    event: "EDIT_WEB_PANEL_SELECTOR_ENABLED",
    values: ["selectorEnabled", "timeout"],
  },
  selector: {
    event: "EDIT_WEB_PANEL_SELECTOR",
    values: ["selector", "timeout"],
  },
  alwaysOnTop: {
    event: "EDIT_WEB_PANEL_ALWAYS_ON_TOP",
    values: ["alwaysOnTop"],
    setter: "setAlwaysOnTop",
  },
  pinned: { event: "EDIT_WEB_PANEL_PINNED", values: ["pinned"] },
  anchor: {
    event: "EDIT_WEB_PANEL_ANCHOR",
    values: ["anchor"],
    setter: "setAnchor",
    geometry: true,
  },
  offsetXType: {
    event: "EDIT_WEB_PANEL_OFFSET_X_TYPE",
    values: ["offsetXType"],
    setter: "setOffsetXType",
    geometry: true,
  },
  offsetYType: {
    event: "EDIT_WEB_PANEL_OFFSET_Y_TYPE",
    values: ["offsetYType"],
    setter: "setOffsetYType",
    geometry: true,
  },
  widthType: {
    event: "EDIT_WEB_PANEL_WIDTH_TYPE",
    values: ["widthType"],
    setter: "setWidthType",
    geometry: true,
  },
  heightType: {
    event: "EDIT_WEB_PANEL_HEIGHT_TYPE",
    values: ["heightType"],
    setter: "setHeightType",
    geometry: true,
  },
  userContextId: {
    event: "EDIT_WEB_PANEL_USER_CONTEXT_ID",
    values: ["userContextId"],
    setter: "setUserContextId",
  },
  temporary: {
    event: "EDIT_WEB_PANEL_TEMPORARY",
    values: ["temporary"],
    setter: "setTemporary",
  },
  userAgent: {
    event: "EDIT_WEB_PANEL_USER_AGENT",
    values: ["userAgent", "customUserAgent", "timeout"],
  },
  spaces: {
    event: "EDIT_WEB_PANEL_SPACES",
    values: ["spaces"],
    setter: "setSpaces",
  },
  loadOnStartup: {
    event: "EDIT_WEB_PANEL_LOAD_ON_STARTUP",
    values: ["loadOnStartup"],
    setter: "setLoadOnStartup",
  },
  loadLastUrl: {
    event: "EDIT_WEB_PANEL_LOAD_LAST_URL",
    values: ["loadLastUrl"],
    setter: "setLoadLastUrl",
  },
  unloadOnClose: {
    event: "EDIT_WEB_PANEL_UNLOAD_ON_CLOSE",
    values: ["unloadOnClose"],
    setter: "setUnloadOnClose",
  },
  unloadAfterInactivity: {
    event: "EDIT_WEB_PANEL_UNLOAD_AFTER_INACTIVITY",
    values: ["unloadAfterInactivity"],
    setter: "setUnloadAfterInactivity",
    numeric: true,
  },
  shortcut: {
    event: "EDIT_WEB_PANEL_SHORTCUT",
    values: ["shortcut"],
    setter: "setShortcut",
  },
  hideToolbar: {
    event: "EDIT_WEB_PANEL_HIDE_TOOLBAR",
    values: ["hideToolbar"],
    setter: "setHideToolbar",
  },
  hideSoundIcon: {
    event: "EDIT_WEB_PANEL_HIDE_SOUND_ICON",
    values: ["hideSoundIcon"],
    setter: "setHideSoundIcon",
  },
  hideNotificationBadge: {
    event: "EDIT_WEB_PANEL_HIDE_NOTIFICATION_BADGE",
    values: ["hideNotificationBadge"],
    setter: "setHideNotificationBadge",
  },
  periodicReload: {
    event: "EDIT_WEB_PANEL_PERIODIC_RELOAD",
    values: ["periodicReload"],
    setter: "setPeriodicReload",
    numeric: true,
  },
  reloadOnUrlChange: {
    event: "EDIT_WEB_PANEL_RELOAD_ON_URL_CHANGE",
    values: ["reloadOnUrlChange"],
    setter: "setReloadOnUrlChange",
  },
  zoomOut: {
    event: "EDIT_WEB_PANEL_ZOOM_OUT",
    values: [],
    action: "zoomOut",
    returnsZoom: true,
  },
  zoomIn: {
    event: "EDIT_WEB_PANEL_ZOOM_IN",
    values: [],
    action: "zoomIn",
    returnsZoom: true,
  },
  zoom: {
    event: "EDIT_WEB_PANEL_ZOOM",
    values: ["value"],
    setter: "setZoom",
    returnsZoom: true,
  },
};

/**
 * The callbacks Edit web panel calls (WebPanelPopupEdit#listenChanges), one
 * per field, each sending the field's event with the values it's given.
 *
 * @param {function(string, object):void} send gets the event's key in
 *   WebPanelEvents and its detail
 * @param {function(string):number} getZoom a web panel's zoom, by uuid
 * @returns {Object<string, function(string, ...*):(number|undefined)>}
 */
export function buildWebPanelEditCallbacks(send, getZoom) {
  return Object.fromEntries(
    Object.entries(WEB_PANEL_FIELDS).map(([name, field]) => [
      name,
      (uuid, ...args) => {
        const detail = { uuid };
        field.values.forEach((key, index) => {
          const value = args[index];
          if (key === "timeout") {
            detail.timeout = value ?? 0;
          } else {
            detail[key] = field.numeric ? Number(value) : value;
          }
        });
        send(field.event, detail);
        return field.returnsZoom ? getZoom(uuid) : undefined;
      },
    ]),
  );
}
