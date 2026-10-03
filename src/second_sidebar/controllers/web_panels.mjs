import {
  SidebarEvents,
  WebPanelEvents,
  listenEvent,
  sendEvents,
} from "./events.mjs";

import { NetUtilWrapper } from "../wrappers/net_utils.mjs";
import { ChromeUtilsWrapper } from "../wrappers/chrome_utils.mjs";
import { KeyedTimeouts } from "../utils/keyed_timeouts.mjs";
import { Logger } from "../utils/logger.mjs";
import { SidebarControllers } from "../sidebar_controllers.mjs";
import { SidebarElements } from "../sidebar_elements.mjs";
import { WebPanelController } from "./web_panel.mjs";
import { WEB_PANEL_FIELDS } from "./web_panel_fields.mjs";
import { WebPanelSettings } from "../settings/web_panel_settings.mjs";
import { WebPanelState } from "../settings/web_panel_state.mjs";
import { WebPanelsSettings } from "../settings/web_panels_settings.mjs";
import { WebPanelsState } from "../settings/web_panels_state.mjs";
import { WindowWrapper } from "../wrappers/window.mjs";
import { extractHostname } from "../utils/url.mjs";
import { getAdjacentIndex } from "../utils/cycle.mjs";
import { isWebPanelInSpace } from "../utils/spaces.mjs";
import { ZenSpacesWrapper } from "../wrappers/zen_spaces.mjs";
import { gCustomizeModeWrapper } from "../wrappers/g_customize_mode.mjs";

const SAVE_DEBOUNCE_MS = 300;
// How long the main browser's active tab has to stay on a site before the
// shown panel reloads for it, so flicking through tabs reloads it once.
const RELOAD_ON_URL_CHANGE_DELAY_MS = 500;

export class WebPanelsController {
  /**@type {number?} */
  #reloadOnUrlChangeTimer = null;
  /**@type {number?} */
  #saveSettingsTimer = null;
  /**@type {number?} */
  #saveStateTimer = null;
  #settingsSavesSuspended = false;
  // Per panel, so editing one panel can't cancel another's pending update.
  #urlTimeouts = new KeyedTimeouts();
  #selectorTimeouts = new KeyedTimeouts();
  #faviconURLTimeouts = new KeyedTimeouts();
  /**
   * The web panel that was open in each Zen space when this window last
   * left it, to open again on coming back (see #onSpacesChanged).
   *
   * @type {Map<string, string?>}
   */
  #openWebPanelBySpace = new Map();
  /** @type {string?} */
  #lastSpace = null;
  #userAgentTimeouts = new KeyedTimeouts();

  constructor() {
    /**@type {Map<string, WebPanelController>} */
    this.webPanelControllers = new Map();
    /**@type {string?} */
    this.lastOpenedWebPanelUUID = null;
    this.#setupListeners();
    this.#setupMainBrowserListener();
    // A debounced save still pending when the window closes would otherwise
    // be lost along with the window's timers.
    new WindowWrapper().addEventListener("unload", () => {
      try {
        this.#flushPendingSaves();
      } catch (error) {
        console.error("Failed to flush pending web panel saves:", error);
      }
    });
  }

  #setupListeners() {
    SidebarElements.webPanelMenuPopup.listenUnloadItemClick(
      (webPanelController) => {
        if (webPanelController.isActive()) {
          SidebarControllers.sidebarController.close();
        }
        webPanelController.unload();
      },
    );

    SidebarElements.webPanelMenuPopup.listenMuteItemClick(
      (webPanelController) => {
        webPanelController.toggleMuteAudio();
      },
    );

    SidebarElements.webPanelMenuPopup.listenResetPositionItemClick(
      (webPanelController) => {
        sendEvents(SidebarEvents.RESET_SIDEBAR_FLOATING_POSITION, {
          uuid: webPanelController.getUUID(),
        });
      },
    );

    SidebarElements.webPanelMenuPopup.listenResetWidthItemClick(
      (webPanelController) => {
        sendEvents(SidebarEvents.RESET_SIDEBAR_FLOATING_WIDTH, {
          uuid: webPanelController.getUUID(),
        });
      },
    );

    SidebarElements.webPanelMenuPopup.listenResetHeightItemClick(
      (webPanelController) => {
        sendEvents(SidebarEvents.RESET_SIDEBAR_FLOATING_HEIGHT, {
          uuid: webPanelController.getUUID(),
        });
      },
    );

    SidebarElements.webPanelMenuPopup.listenResetAllItemClick(
      (webPanelController) => {
        sendEvents(SidebarEvents.RESET_SIDEBAR_FLOATING_ALL, {
          uuid: webPanelController.getUUID(),
        });
      },
    );

    SidebarElements.webPanelMenuPopup.listenEditItemClick(
      (webPanelController) => {
        webPanelController.switchWebPanel({ forceOpen: true });
        SidebarControllers.webPanelEditController.openPopup(webPanelController);
      },
    );

    SidebarElements.webPanelMenuPopup.listenDuplicateItemClick(
      (webPanelController) => this.duplicate(webPanelController),
    );

    SidebarElements.webPanelMenuPopup.listenDeleteItemClick(
      (webPanelController) => {
        SidebarControllers.webPanelDeleteController.openPopup(
          webPanelController,
        );
      },
    );

    SidebarElements.webPanelMenuPopup.listenCustomizeItemClick(() => {
      gCustomizeModeWrapper.enter();
    });

    listenEvent(WebPanelEvents.CREATE_WEB_PANEL, async (event) => {
      const {
        uuid,
        url,
        userContextId,
        temporary,
        presetSettings,
        spaces,
        newWebPanelPosition,
        isActiveWindow,
      } = event.detail;

      const create = async () => {
        return await this.createWebPanelController(
          uuid,
          url,
          userContextId,
          temporary,
          newWebPanelPosition,
          isActiveWindow,
          { ...presetSettings, spaces },
        );
      };

      if (temporary) {
        if (isActiveWindow) {
          const webPanelController = await create();
          // null for an invalid url (see createWebPanelController)
          if (!webPanelController) return;
          webPanelController.switchWebPanel();
          setTimeout(() => this.#unwrapButtons(), 100);
        }
      } else {
        const webPanelController = await create();
        if (!webPanelController) return;
        // Made in the active window's space, which another window may not be in.
        this.applySpaces();
        if (isActiveWindow) {
          webPanelController.switchWebPanel();
        }
        setTimeout(() => this.#unwrapButtons(), 100);
      }
    });

    listenEvent(WebPanelEvents.DUPLICATE_WEB_PANEL, (event) => {
      const { settings, newWebPanelPosition, isActiveWindow } = event.detail;
      // Like a new temporary panel, a copy of one is only in this window.
      if (settings.temporary && !isActiveWindow) return;
      const webPanelController = this.#addNewWebPanel(
        WebPanelSettings.fromObject(
          SidebarElements.sidebarWrapper.getPosition(),
          SidebarControllers.sidebarGeometry.getDefaultFloatingOffsetCSS(),
          settings,
        ),
        isActiveWindow,
        newWebPanelPosition,
      );
      this.applySpaces();
      if (isActiveWindow && !webPanelController.isOutsideSpace()) {
        webPanelController.switchWebPanel();
      }
      setTimeout(() => this.#unwrapButtons(), 100);
    });

    listenEvent(WebPanelEvents.MUTE_ALL_WEB_PANELS, (event) => {
      for (const webPanelController of this.webPanelControllers.values()) {
        webPanelController.setMuted(event.detail.muted);
      }
    });

    listenEvent(SidebarEvents.SUSPEND_SETTINGS_SAVES, () => {
      this.#settingsSavesSuspended = true;
      clearTimeout(this.#saveSettingsTimer);
      this.#saveSettingsTimer = null;
    });

    this.#listenWebPanelEvent(
      WebPanelEvents.EDIT_WEB_PANEL_URL,
      (webPanelController, { url, timeout }) => {
        const oldUrl = webPanelController.getURL();
        webPanelController.setURL(url);

        this.#urlTimeouts.set(
          webPanelController.getUUID(),
          () => {
            if (!webPanelController.isUnloaded() && oldUrl !== url) {
              webPanelController.go(url);
            }
          },
          timeout,
        );
      },
    );

    this.#listenWebPanelEvent(
      WebPanelEvents.EDIT_WEB_PANEL_FAVICON_URL,
      (webPanelController, { dynamicFavicon, faviconURL, timeout }) => {
        webPanelController.setFaviconURL(dynamicFavicon, faviconURL);

        this.#faviconURLTimeouts.set(
          webPanelController.getUUID(),
          () => webPanelController.updateFavicon(),
          timeout,
        );
      },
    );

    this.#listenWebPanelEvent(
      WebPanelEvents.EDIT_WEB_PANEL_SELECTOR_ENABLED,
      (webPanelController, { selectorEnabled }) => {
        const oldSelectorEnabled = webPanelController.getSelectorEnabled();
        webPanelController.setSelectorEnabled(selectorEnabled);

        if (
          !webPanelController.isUnloaded() &&
          oldSelectorEnabled !== selectorEnabled
        ) {
          webPanelController.reload();
        }
      },
    );

    this.#listenWebPanelEvent(
      WebPanelEvents.EDIT_WEB_PANEL_SELECTOR,
      (webPanelController, { selector, timeout }) => {
        const oldSelector = webPanelController.getSelector();
        webPanelController.setSelector(selector);

        // Separate from #urlTimeouts so editing the selector right after the
        // URL doesn't cancel the pending navigation to the new URL.
        this.#selectorTimeouts.set(
          webPanelController.getUUID(),
          () => {
            if (!webPanelController.isUnloaded() && oldSelector !== selector) {
              webPanelController.reload();
            }
          },
          timeout,
        );
      },
    );

    this.#listenWebPanelEvent(
      WebPanelEvents.EDIT_WEB_PANEL_USER_AGENT,
      (webPanelController, { userAgent, customUserAgent, timeout }) => {
        webPanelController.setUserAgent(userAgent, customUserAgent);

        // Debounced so typing a custom user agent doesn't reload the page on
        // every key.
        this.#userAgentTimeouts.set(
          webPanelController.getUUID(),
          () => webPanelController.applyUserAgent(),
          timeout,
        );
      },
    );

    this.#listenWebPanelEvent(
      WebPanelEvents.EDIT_WEB_PANEL_PINNED,
      (webPanelController, { pinned }) => {
        pinned ? webPanelController.pin() : webPanelController.unpin();

        if (webPanelController.isActive()) {
          SidebarControllers.sidebarController.updatePinState(
            webPanelController,
          );
          SidebarControllers.sidebarController.updateToolbar(
            webPanelController,
          );
        }
      },
    );

    this.#bindFields();

    this.#listenWebPanelEvent(
      WebPanelEvents.DELETE_WEB_PANEL,
      (webPanelController, { uuid }) => {
        if (webPanelController.isActive()) {
          SidebarControllers.sidebarController.close();
        }
        webPanelController.remove();
        this.delete(uuid);
      },
    );
  }

  /**
   * Binds each setting in WEB_PANEL_FIELDS that has a setter (or action) to
   * its event; the others have their own handlers in #setupListeners.
   */
  #bindFields() {
    // Follow-ups to applying some of them.
    const onChanged = {
      title: (webPanelController) => webPanelController.updateTitle(),
      hideToolbar: (_webPanelController, { hideToolbar }) =>
        hideToolbar
          ? SidebarControllers.sidebarController.collapseToolbar()
          : SidebarControllers.sidebarController.uncollapseToolbar(),
      spaces: () => this.applySpaces(),
    };
    for (const [name, field] of Object.entries(WEB_PANEL_FIELDS)) {
      const event = WebPanelEvents[field.event];
      if (field.action) {
        this.#bindSimpleAction(event, field.action);
      } else if (field.geometry) {
        this.#bindGeometrySetting(event, field.values[0], field.setter);
      } else if (field.setter) {
        this.#bindSimpleSetting(
          event,
          field.values.filter((key) => key !== "timeout"),
          field.setter,
          { onChanged: onChanged[name] },
        );
      }
    }
  }

  /**
   * Listens for an event aimed at one web panel (`event.detail.uuid`) and
   * hands the callback that panel's controller. Events are sent to every
   * window, but temporary panels only exist in the window that created
   * them, so a window without the target panel ignores the event.
   *
   * @param {string} event
   * @param {function(WebPanelController, object):void} callback
   */
  #listenWebPanelEvent(event, callback) {
    listenEvent(event, (e) => {
      const webPanelController = this.get(e.detail.uuid);
      if (!webPanelController) {
        Logger.debug(
          `Ignoring ${event}: web panel ${e.detail.uuid} is not in this window`,
        );
        return;
      }
      callback(webPanelController, e.detail);
    });
  }

  /**
   * Binds a WebPanelController setter to an edit event: apply the setter
   * with the event's value(s), then run an optional follow-up. Covers the
   * many settings that are just "call one setter", optionally followed by a
   * small fixed side effect, so those don't each need a bespoke handler.
   * Settings with real branching logic (different values triggering
   * different methods, debounced timeouts, etc.) stay hand-written above.
   *
   * @param {string} event
   * @param {string|Array<string>} valueKeys - event.detail key(s) passed to the setter, in order
   * @param {string} setterName
   * @param {object} params
   * @param {function(WebPanelController, object):void} params.onChanged
   */
  #bindSimpleSetting(event, valueKeys, setterName, { onChanged } = {}) {
    const keys = Array.isArray(valueKeys) ? valueKeys : [valueKeys];
    this.#listenWebPanelEvent(event, (webPanelController, detail) => {
      webPanelController[setterName](...keys.map((key) => detail[key]));
      onChanged?.(webPanelController, detail);
    });
  }

  /**
   * Same shape as #bindSimpleSetting, for the floating-geometry settings
   * that all also need the panel's on-screen geometry recalculated when
   * it's currently visible.
   *
   * @param {string} event
   * @param {string} valueKey
   * @param {string} setterName
   */
  #bindGeometrySetting(event, valueKey, setterName) {
    this.#bindSimpleSetting(event, valueKey, setterName, {
      onChanged: (webPanelController) => {
        if (webPanelController.isActive()) {
          SidebarControllers.sidebarGeometry.calculateAndSetFloatingGeometry(
            webPanelController,
            { forceUpdate: true },
          );
        }
      },
    });
  }

  /**
   * Binds a no-argument WebPanelController action (e.g. zoomIn/zoomOut) to
   * an edit event that only carries the target uuid.
   *
   * @param {string} event
   * @param {string} methodName
   */
  #bindSimpleAction(event, methodName) {
    this.#listenWebPanelEvent(event, (webPanelController) => {
      webPanelController[methodName]();
    });
  }

  // "Reload when address changes": when the main browser's active tab is
  // switched or navigated, the shown panel reloads if the tab's site is no
  // longer the one it loaded with. Panels that aren't shown catch up when
  // they're opened (WebPanelController#reloadIfSiteChanged) instead of
  // reloading in the background on every tab switch, which slowed the
  // browser down: a Bitwarden vault restarts its whole app on each reload.
  #setupMainBrowserListener() {
    const gBrowser = new WindowWrapper().gBrowser;
    const scheduleReload = () => {
      clearTimeout(this.#reloadOnUrlChangeTimer);
      this.#reloadOnUrlChangeTimer = setTimeout(() => {
        this.#reloadOnUrlChangeTimer = null;
        this.getActive()?.reloadIfSiteChanged();
      }, RELOAD_ON_URL_CHANGE_DELAY_MS);
    };

    gBrowser.addEventListener("TabSelect", scheduleReload);
    gBrowser.addProgressListener({
      QueryInterface: ChromeUtilsWrapper.generateQI([
        "nsIWebProgressListener",
        "nsISupportsWeakReference",
      ]),
      onLocationChange: (webProgress) => {
        if (webProgress.isTopLevel) scheduleReload();
      },
    });
  }

  /**
   * The site of the main browser's active tab, as "Reload when address
   * changes" compares it: the host of an http(s) URL, any other URL whole.
   *
   * @returns {string?} null if it can't be read
   */
  getMainBrowserHostname() {
    try {
      const url = new WindowWrapper().gBrowser.raw?.selectedBrowser?.currentURI
        ?.spec;
      return url ? extractHostname(url) : null;
    } catch (error) {
      console.error(
        "Second Sidebar: failed to read the main browser's address",
        error,
      );
      return null;
    }
  }

  #setupWebPanelsBrowserListeners() {
    // Open/close corresponding web panel when tab is selected
    SidebarElements.webPanelsBrowser.addTabSelectListener(() => {
      const activeWebPanelTab =
        SidebarElements.webPanelsBrowser.getActiveWebPanelTab();
      if (activeWebPanelTab.isEmpty()) {
        if (!SidebarControllers.sidebarController.closed()) {
          SidebarControllers.sidebarController.close();
        }
      } else {
        this.lastOpenedWebPanelUUID = activeWebPanelTab.uuid;
      }
      for (const [uuid, webPanelController] of this.webPanelControllers) {
        if (uuid === activeWebPanelTab.uuid) {
          webPanelController.open();
        }
      }
      // Defer closing other panels: closing an unload-on-close panel removes
      // its tab, and Gecko reassigns the selected tab mid-removal, which
      // would reenter this handler synchronously and corrupt tabbrowser state.
      setTimeout(() => {
        for (const [uuid, webPanelController] of this.webPanelControllers) {
          if (uuid !== activeWebPanelTab.uuid) {
            webPanelController.close();
          }
        }
      }, 0);
    });
    // Revert zoom to default when it's changed
    SidebarElements.webPanelsBrowser.addZoomChangeListener((tab) => {
      const webPanelController = this.get(tab.uuid);
      if (!webPanelController) {
        return;
      }
      const zoom = webPanelController.getZoom();
      if (tab.linkedBrowser.getZoom() != zoom) {
        webPanelController.setZoom(zoom);
      }
    });
  }

  /**
   * @param {function(KeyboardEvent):void} callback
   */
  addKeypressListener(callback) {
    SidebarElements.webPanelsBrowser.waitInitialization(() => {
      SidebarElements.webPanelsBrowser.addKeypressListener(callback);
    });
  }

  #unwrapButtons() {
    const buttons = [
      SidebarElements.webPanelNewButton,
      ...[...this.webPanelControllers.values()].map(
        (webPanelController) => webPanelController.button,
      ),
    ];
    for (const button of buttons) {
      if (button.isWrapped) {
        gCustomizeModeWrapper.unwrapToolbarItem(button.parentElement.getXUL());
      }
    }
  }

  /**
   *
   * @param {string} uuid
   * @param {string} url
   * @param {string} userContextId
   * @param {boolean} temporary
   * @param {string} newWebPanelPosition
   * @param {boolean} isActiveWindow
   * @param {import("../utils/web_panel_presets.mjs").WebPanelPresetSettings & {spaces?: string[]}} [settings]
   *   Settings of the preset the panel was created from, if any, and the Zen
   *   spaces it starts in.
   * @returns {Promise<WebPanelController?>} null if `url` is invalid
   */
  async createWebPanelController(
    uuid,
    url,
    userContextId,
    temporary,
    newWebPanelPosition,
    isActiveWindow,
    { userAgent, dynamicFavicon, faviconURL, reloadOnUrlChange, spaces } = {},
  ) {
    try {
      NetUtilWrapper.newURI(url);
    } catch (error) {
      console.warn("Invalid web panel url:", url, error);
      return null;
    }

    const webPanelSettings = new WebPanelSettings(
      SidebarElements.sidebarWrapper.getPosition(),
      SidebarControllers.sidebarGeometry.getDefaultFloatingOffsetCSS(),
      uuid,
      url,
      {
        userContextId,
        temporary,
        // undefined (no preset) keeps WebPanelSettings' own defaults.
        userAgent,
        dynamicFavicon,
        faviconURL,
        reloadOnUrlChange,
        spaces,
      },
    );
    return this.#addNewWebPanel(
      webPanelSettings,
      isActiveWindow,
      newWebPanelPosition,
    );
  }

  /**
   * Adds a new web panel, loaded and saved if this is the window it was
   * made in.
   *
   * @param {WebPanelSettings} webPanelSettings
   * @param {boolean} isActiveWindow
   * @param {string} newWebPanelPosition
   * @returns {WebPanelController}
   */
  #addNewWebPanel(webPanelSettings, isActiveWindow, newWebPanelPosition) {
    const webPanelController = new WebPanelController(
      webPanelSettings,
      new WebPanelState(webPanelSettings.uuid),
      {
        loaded: isActiveWindow,
        position: newWebPanelPosition,
      },
    );
    this.add(webPanelController);

    // Temporary panels aren't saved (WebPanelsSettings#persistentWebPanels).
    if (isActiveWindow && !webPanelSettings.temporary) {
      this.saveSettings();
    }

    return webPanelController;
  }

  /**
   * Adds a copy of a web panel with all its settings except its keyboard
   * shortcut, which can only open one panel, placed like a new web panel.
   *
   * @param {WebPanelController} webPanelController
   */
  duplicate(webPanelController) {
    sendEvents(WebPanelEvents.DUPLICATE_WEB_PANEL, {
      settings: {
        ...webPanelController.dumpSettings().toObject(),
        uuid: crypto.randomUUID(),
        shortcut: "",
      },
      newWebPanelPosition:
        SidebarControllers.webPanelNewController.getNewWebPanelPosition(),
    });
  }

  /**
   *
   * @param {WebPanelController} webPanelController
   */
  add(webPanelController) {
    this.webPanelControllers.set(
      webPanelController.getUUID(),
      webPanelController,
    );
  }

  /**
   *
   * @param {string} uuid
   * @returns {WebPanelController?}
   */
  get(uuid) {
    return this.webPanelControllers.get(uuid) ?? null;
  }

  /**
   *
   * @returns {WebPanelController?}
   */
  getActive() {
    const tab = SidebarElements.webPanelsBrowser.getActiveWebPanelTab();
    return tab && !tab.isEmpty() ? this.get(tab.uuid) : null;
  }

  /**
   *
   * @returns {WebPanelController[]}
   */
  getAll() {
    return [...this.webPanelControllers.values()];
  }

  /**
   *
   * @param {string} uuid
   */
  delete(uuid) {
    this.webPanelControllers.delete(uuid);
    this.#urlTimeouts.clear(uuid);
    this.#selectorTimeouts.clear(uuid);
    this.#faviconURLTimeouts.clear(uuid);
    this.#userAgentTimeouts.clear(uuid);
    if (this.lastOpenedWebPanelUUID === uuid) {
      this.lastOpenedWebPanelUUID = null;
    }
  }

  close() {
    SidebarElements.webPanelsBrowser.deselectWebPanelTab();
  }

  switchLastWebPanel() {
    if (!this.lastOpenedWebPanelUUID) return;
    const webPanelController = this.get(this.lastOpenedWebPanelUUID);
    if (webPanelController?.isOutsideSpace()) return;
    webPanelController?.switchWebPanel();
  }

  /**
   * Applies Zen's active space, and on switching spaces, remembers the web
   * panel open in the one left and opens the one that was open in the new
   * one, unless a panel (in every space) is still open.
   */
  #onSpacesChanged() {
    const space = ZenSpacesWrapper.activeSpace;
    const switched = this.#lastSpace !== null && space !== this.#lastSpace;
    if (switched) {
      this.#openWebPanelBySpace.set(
        this.#lastSpace,
        this.getActive()?.getUUID() ?? null,
      );
    }
    this.#lastSpace = space;
    this.applySpaces();
    if (switched && space !== null) {
      // Once Zen is done switching, not in the middle of it.
      setTimeout(() => this.#reopenWebPanelOf(space));
    }
  }

  /**
   * @param {string} space
   */
  #reopenWebPanelOf(space) {
    if (ZenSpacesWrapper.activeSpace !== space || this.getActive()) return;
    const webPanelController = this.get(this.#openWebPanelBySpace.get(space));
    if (webPanelController && !webPanelController.isOutsideSpace()) {
      webPanelController.switchWebPanel({ forceOpen: true });
    }
  }

  /**
   * Shows the web panels for this window's active Zen space and hides the
   * others' (see isWebPanelInSpace). Without spaces, every panel shows.
   */
  applySpaces() {
    const activeSpace = ZenSpacesWrapper.activeSpace;
    const existingSpaces = ZenSpacesWrapper.getSpaces().map(
      (space) => space.uuid,
    );
    // Hiding it would leave the edit popup pointing at nothing; it's done
    // once the popup closes (WebPanelEditController).
    const editedUUID = SidebarElements.webPanelPopupEdit.getEditedUUID();
    for (const webPanelController of this.webPanelControllers.values()) {
      if (webPanelController.getUUID() === editedUUID) continue;
      webPanelController.setOutsideSpace(
        !isWebPanelInSpace(
          webPanelController.getSpaces(),
          activeSpace,
          existingSpaces,
        ),
      );
    }
  }

  /**
   * Opens the web panel after (step 1) or before (step -1) the open one, in
   * the order of their buttons, wrapping around at the ends. With none open,
   * it opens the first or the last one.
   *
   * @param {number} step 1 or -1
   */
  switchAdjacentWebPanel(step) {
    const webPanelControllers = this.#getAllInButtonOrder();
    const index = getAdjacentIndex(
      webPanelControllers.indexOf(this.getActive()),
      webPanelControllers.length,
      step,
    );
    if (index === null) return;
    webPanelControllers[index].switchWebPanel({ forceOpen: true });
  }

  /**
   * The web panels whose buttons are in this window and shown in its Zen
   * space, in the order the buttons are in, which the user can change by
   * customizing the toolbar.
   *
   * @returns {WebPanelController[]}
   */
  #getAllInButtonOrder() {
    const withButtons = [];
    for (const webPanelController of this.webPanelControllers.values()) {
      if (webPanelController.isOutsideSpace()) continue;
      const node = webPanelController.button.button?.getXUL();
      if (node?.isConnected) withButtons.push({ webPanelController, node });
    }
    return withButtons
      .sort((a, b) =>
        a.node.compareDocumentPosition(b.node) &
        Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1,
      )
      .map(({ webPanelController }) => webPanelController);
  }

  /**
   *
   * @param {WebPanelsSettings} webPanelsSettings
   * @param {WebPanelsState} webPanelsState
   */
  loadSettingsAndState(webPanelsSettings, webPanelsState) {
    console.log("Loading web panels...");

    // We need to display web panels window for a while to initialize it and
    // load startup web panels
    SidebarElements.sidebarBox.show();
    SidebarElements.webPanelsBrowser.init();

    SidebarElements.webPanelsBrowser.waitInitialization(() => {
      // Relink docShell.treeOwner to the current window to fix status panel
      new WindowWrapper().relinkTreeOwner();
      // Setup web panels window listeners
      this.#setupWebPanelsBrowserListeners();
      // Load startup web panels
      const webPanelsStateMap = new Map();
      for (const webPanelState of webPanelsState.webPanelsState) {
        webPanelsStateMap.set(webPanelState.uuid, webPanelState);
      }
      for (const webPanelSettings of webPanelsSettings.webPanels) {
        const uuid = webPanelSettings.uuid;
        const webPanelState =
          webPanelsStateMap.get(uuid) ?? new WebPanelState(uuid);
        const webPanelController = new WebPanelController(
          webPanelSettings,
          webPanelState,
          {
            loaded: webPanelSettings.loadOnStartup,
          },
        );
        this.add(webPanelController);
      }
      // Hide web panels window after initialization
      SidebarElements.sidebarBox.hide();
      // Now, and whenever Zen's active space or spaces change.
      ZenSpacesWrapper.listen(() => this.#onSpacesChanged());
    });
  }

  /**
   *
   * @returns {WebPanelsSettings}
   */
  dumpSettings() {
    return new WebPanelsSettings(
      Array.from(this.webPanelControllers.values(), (webPanelController) =>
        webPanelController.dumpSettings(),
      ),
    );
  }

  saveSettings() {
    // Set while an import is pending a restart (see
    // SidebarMainSettingsController#importSettings): this window's panels
    // predate the import, so saving them would silently undo it.
    if (this.#settingsSavesSuspended) {
      Logger.debug("Web panels settings save skipped: import pending restart");
      return;
    }
    // Coalesce bursts of settings changes (drag/resize end, multiple edits) into one write.
    clearTimeout(this.#saveSettingsTimer);
    this.#saveSettingsTimer = setTimeout(
      () => this.#writeSettings(),
      SAVE_DEBOUNCE_MS,
    );
  }

  #writeSettings() {
    this.#saveSettingsTimer = null;
    this.dumpSettings()
      .save()
      .catch((error) => console.error("Failed to save web panels:", error));
  }

  dumpState() {
    return new WebPanelsState(
      Array.from(this.webPanelControllers.values(), (webPanelController) =>
        webPanelController.dumpState(),
      ),
    );
  }

  saveState() {
    // Coalesce state saves so multiple panels finishing navigation close together only write once.
    clearTimeout(this.#saveStateTimer);
    this.#saveStateTimer = setTimeout(
      () => this.#writeState(),
      SAVE_DEBOUNCE_MS,
    );
  }

  #writeState() {
    this.#saveStateTimer = null;
    this.dumpState()
      .save()
      .catch((error) =>
        console.error("Failed to save web panels state:", error),
      );
  }

  #flushPendingSaves() {
    if (this.#saveSettingsTimer !== null) {
      clearTimeout(this.#saveSettingsTimer);
      this.#writeSettings();
    }
    if (this.#saveStateTimer !== null) {
      clearTimeout(this.#saveStateTimer);
      this.#writeState();
    }
  }
}
