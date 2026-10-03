import { FloatingWebPanelGeometrySettings } from "./floating_web_panel_geometry_settings.mjs";
import { PinnedWebPanelGeometrySettings } from "./pinned_web_panel_geometry_settings.mjs";
import {
  DEFAULT_USER_AGENT,
  FIREFOX_MOBILE_USER_AGENT,
  isUserAgentId,
} from "../utils/user_agents.mjs";

import { ScriptSecurityManagerWrapper } from "../wrappers/script_security_manager.mjs";

export class WebPanelSettings {
  /**
   *
   * @param {string} sidebarPosition
   * @param {string} defaultFloatingOffsetCSS
   * @param {string} uuid
   * @param {string} url
   * @param {object} params
   * @param {boolean} params.dynamicTitle
   * @param {string} params.title
   * @param {boolean} params.dynamicFavicon
   * @param {string} params.faviconURL
   * @param {boolean} params.pinned
   * @param {boolean} params.alwaysOnTop
   * @param {string} params.userAgent an id from getUserAgentChoices()
   * @param {string} params.customUserAgent sent when userAgent is "custom"
   * @param {boolean} params.mobile older versions' "Mobile View", read
   *   when there's no userAgent
   * @param {number} params.zoom
   * @param {boolean} params.loadLastUrl
   * @param {boolean} params.loadOnStartup
   * @param {boolean} params.unloadOnClose
   * @param {number} params.unloadAfterInactivity
   * @param {boolean} params.hideToolbar
   * @param {string} params.userContextId
   * @param {number} params.periodicReload
   * @param {boolean} params.reloadOnUrlChange
   * @param {boolean} params.hideSoundIcon
   * @param {boolean} params.hideNotificationBadge
   * @param {boolean} params.selectorEnabled
   * @param {string} params.selector
   * @param {FloatingWebPanelGeometrySettings} params.floatingGeometry
   * @param {PinnedWebPanelGeometrySettings} params.pinnedGeometry
   * @param {boolean} params.temporary
   * @param {string} params.shortcut
   * @param {string[]} params.spaces the uuids of the Zen spaces the panel
   *   shows in; none for all of them
   */
  constructor(
    sidebarPosition,
    defaultFloatingOffsetCSS,
    uuid,
    url,
    {
      dynamicTitle = true,
      title = "",
      dynamicFavicon = true,
      faviconURL = "",
      pinned = false,
      alwaysOnTop = false,
      userAgent,
      customUserAgent = "",
      mobile = false,
      zoom = 1,
      loadOnStartup = true,
      loadLastUrl = false,
      unloadOnClose = false,
      unloadAfterInactivity = 0,
      hideToolbar = false,
      userContextId = ScriptSecurityManagerWrapper.DEFAULT_USER_CONTEXT_ID,
      periodicReload = 0,
      reloadOnUrlChange = false,
      hideSoundIcon = false,
      hideNotificationBadge = false,
      selectorEnabled = false,
      selector = "",
      floatingGeometry = new FloatingWebPanelGeometrySettings(
        sidebarPosition,
        defaultFloatingOffsetCSS,
      ),
      pinnedGeometry = new PinnedWebPanelGeometrySettings(),
      temporary = false,
      shortcut = "",
      spaces = [],
    } = {},
  ) {
    this.uuid = uuid;
    this.url = url;
    this.dynamicTitle = dynamicTitle;
    this.title = title;
    this.dynamicFavicon = dynamicFavicon;
    this.faviconURL = faviconURL;
    this.pinned = pinned;
    this.alwaysOnTop = alwaysOnTop;
    // Settings from older versions have a "Mobile View" flag instead.
    this.userAgent = isUserAgentId(userAgent)
      ? userAgent
      : mobile
        ? FIREFOX_MOBILE_USER_AGENT
        : DEFAULT_USER_AGENT;
    this.customUserAgent =
      typeof customUserAgent === "string" ? customUserAgent : "";
    this.zoom = zoom;
    this.loadOnStartup = loadOnStartup;
    this.loadLastUrl = loadLastUrl;
    this.unloadOnClose = unloadOnClose;
    this.unloadAfterInactivity = unloadAfterInactivity;
    this.hideToolbar = hideToolbar;
    this.userContextId = userContextId;
    this.periodicReload = periodicReload;
    this.reloadOnUrlChange = reloadOnUrlChange;
    this.hideSoundIcon = hideSoundIcon;
    this.hideNotificationBadge = hideNotificationBadge;
    this.selectorEnabled = selectorEnabled;
    this.selector = selector;
    this.floatingGeometry = floatingGeometry;
    this.pinnedGeometry = pinnedGeometry;
    this.temporary = temporary;
    this.shortcut = shortcut;
    this.spaces = Array.isArray(spaces)
      ? spaces.filter((uuid) => typeof uuid === "string")
      : [];
  }

  /**
   *
   * @param {string} sidebarPosition
   * @param {string} defaultFloatingOffsetCSS
   * @param {object} object
   * @returns {WebPanelSettings}
   */
  static fromObject(sidebarPosition, defaultFloatingOffsetCSS, object) {
    return new WebPanelSettings(
      sidebarPosition,
      defaultFloatingOffsetCSS,
      object.uuid,
      object.url,
      {
        // Spreading `object` covers every plain field (and quietly defaults
        // any the object is missing, e.g. from an older save, via the
        // constructor's own destructuring defaults above). Only the nested
        // geometry settings need special handling, since they must become
        // real instances rather than the plain objects stored on disk.
        ...object,
        floatingGeometry: FloatingWebPanelGeometrySettings.fromObject(
          sidebarPosition,
          defaultFloatingOffsetCSS,
          object.floatingGeometry,
        ),
        pinnedGeometry: PinnedWebPanelGeometrySettings.fromObject(
          object.pinnedGeometry,
        ),
      },
    );
  }

  /**
   *
   * @returns {object}
   */
  toObject() {
    return {
      // See fromObject: every plain field round-trips via the spread, only
      // the nested geometry settings need converting to plain objects.
      ...this,
      floatingGeometry: this.floatingGeometry.toObject(),
      pinnedGeometry: this.pinnedGeometry.toObject(),
    };
  }
}
