import { AppConstantsWrapper } from "../wrappers/app_constants.mjs";
import { Browser } from "./base/browser.mjs";
import { BrowserCommandsWrapper } from "../wrappers/browser_commands.mjs";
import { BrowserWindowTrackerWrapper } from "../wrappers/browser_window_tracker.mjs";
import { Logger } from "../utils/logger.mjs";
import { ObserversWrapper } from "../wrappers/observers.mjs";
import { PopupNotificationsPatcher } from "../patchers/popup_notifications_patcher.mjs";
import { ScriptSecurityManagerWrapper } from "../wrappers/script_security_manager.mjs";
import { SessionStoreWrapper } from "../wrappers/session_store.mjs";
import { Style } from "./base/style.mjs";
import { UrlbarInputPatcher } from "../patchers/urlbar_input_patcher.mjs";
import { WEB_PANEL_FINDBAR_CSS } from "../css/findbar.mjs";
import { BROWSER_CONTAINER_SELECTORS } from "../utils/browser_layout.mjs";
import { markZenWindowUnsynced } from "../utils/zen.mjs";
import { WebPanelSettings } from "../settings/web_panel_settings.mjs"; // eslint-disable-line no-unused-vars
import { WebPanelState } from "../settings/web_panel_state.mjs"; // eslint-disable-line no-unused-vars
import { WebPanelTab } from "./web_panel_tab.mjs";
import { WindowWatcherWrapper } from "../wrappers/window_watcher.mjs";
import { WindowWrapper } from "../wrappers/window.mjs"; // eslint-disable-line no-unused-vars
import { XULElement } from "./base/xul_element.mjs";

const BEFORE_SHOW_EVENT = "browser-window-before-show";
const INITIALIZED_EVENT = "browser-delayed-startup-finished";
const DOM_WINDOW_CREATED_EVENT = "DOMWindowCreated";
const DOM_WINDOW_CLOSED_EVENT = "domwindowclosed";
const DIALOG_OPEN_EVENT = "dialogopen";
const WEBAUTHN_PROMPT_EVENT = "webauthn-prompt";

const FIRST_TAB_INDEX = 0;

// The panels' window normally starts in well under a second. If it hasn't
// after INIT_SLOW_AFTER_MS, waitInitialization reports it and polls slower.
const INIT_POLL_MS = 10;
const INIT_SLOW_AFTER_MS = 30000;
const INIT_SLOW_POLL_MS = 1000;

// Commands for the browser window rather than the page. Run in the panels'
// hidden window, they'd act on it instead of the one the user sees: Zen
// opens its new-tab address bar there, where it can't be seen, and
// reopening a closed tab would bring back a web panel's own tab.
const MAIN_WINDOW_COMMANDS = new Set([
  "cmd_newNavigatorTab",
  "cmd_newNavigatorTabNoEvent",
  "History:UndoCloseTab",
  "History:RestoreLastClosedTabOrWindowOrSession",
  "Browser:OpenLocation",
  "Tools:Search",
]);

export class WebPanelsBrowser extends Browser {
  /** @type {Set<string>} topics this is registered for with the observer service */
  #observedTopics = new Set();
  #reportedSlowInit = false;

  constructor() {
    super({
      id: `sb2-web-panels-browser_${crypto.randomUUID()}`,
      classList: ["sb2-web-panels-browser"],
    });
    this.removeAttributes(["remote", "type"]).setAttributes({
      xmlns: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
      messagemanagergroup: "browsers",
      initialBrowsingContextGroupId: "1",
      disableglobalhistory: "true",
      disablehistory: "true",
      disablefullscreen: "true",
      autoscroll: "false",
      tooltip: "aHTMLTooltip",
      autocompletepopup: "PopupAutoComplete",
      chromehidden: "",
    });

    this.initialized = false;
  }

  init() {
    if (this.initialized) {
      console.log("Web panels browser is already initialized");
      return;
    }
    console.log("Initializing web panels browser...");
    this.#observe(BEFORE_SHOW_EVENT);
    this.#observe(INITIALIZED_EVENT);
    this.#observe(WEBAUTHN_PROMPT_EVENT);
    // The observer service outlives this window: without this, a closed
    // window's web panels browser would stay registered (and in memory) and
    // keep being called for every WebAuthn prompt.
    window.addEventListener("unload", () => this.#unobserveAll(), {
      once: true,
    });
    this.addEventListener(DOM_WINDOW_CREATED_EVENT, (event) => {
      markZenWindowUnsynced(event.target?.defaultView ?? event.target);
    });
    markZenWindowUnsynced(this.element.contentWindow);
    this.setAttribute("src", AppConstantsWrapper.BROWSER_CHROME_URL);
  }

  /**
   * @param {string} topic
   */
  #observe(topic) {
    if (this.#observedTopics.has(topic)) {
      return;
    }
    ObserversWrapper.addObserver(this, topic);
    this.#observedTopics.add(topic);
  }

  /**
   * @param {string} topic
   */
  #unobserve(topic) {
    if (this.#observedTopics.delete(topic)) {
      ObserversWrapper.removeObserver(this, topic);
    }
  }

  #unobserveAll() {
    for (const topic of [...this.#observedTopics]) {
      this.#unobserve(topic);
    }
  }

  /**
   *
   * @param {Window} subj
   * @param {string} topic
   * @param {string?} data
   */
  observe(subj, topic, data = null) {
    if (topic === WEBAUTHN_PROMPT_EVENT) {
      this.#deactivateForWebAuthn(data);
      return;
    }

    if (this.window.name !== subj.name) {
      return;
    }
    console.log(`${this.window.name}: got event ${topic}`);
    if (topic === BEFORE_SHOW_EVENT) {
      markZenWindowUnsynced(subj);
      this.#unobserve(BEFORE_SHOW_EVENT);
      this.initWindow();
    } else if (topic === INITIALIZED_EVENT) {
      markZenWindowUnsynced(subj);
      this.#unobserve(INITIALIZED_EVENT);
      this.#hackSessionStore();
      this.#hackCloseWindowCommand();
      this.initialized = true;
      console.log(`${this.window.name}: web panels browser initialized`);
    }
  }

  /**
   * WebAuthn extensions require the requesting browser to be the active tab
   * context. An active nested panel tab otherwise wins that selection.
   *
   * @param {string?} data
   */
  #deactivateForWebAuthn(data) {
    try {
      const { browsingContextId, prompt } = JSON.parse(data);
      if (prompt?.type === "cancel") return;

      const browsingContext = BrowsingContext.get(browsingContextId);
      if (browsingContext?.topChromeWindow === window) {
        this.deselectWebPanelTab();
      }
    } catch (error) {
      console.log("Failed to deactivate web panel for WebAuthn:", error);
    }
  }

  /**
   *
   * @param {boolean} dontRestoreTabs
   */
  #hackSessionStore(dontRestoreTabs = true) {
    // Hack SessionStore to prevent restoring hidden window
    if (dontRestoreTabs) SessionStoreWrapper.maybeDontRestoreTabs(this.window);
    ObserversWrapper.notifyObservers(this.window.raw, DOM_WINDOW_CLOSED_EVENT);
  }

  #hackCloseWindowCommand() {
    // Hack browser commands to hack SessionStore
    // and remove sb2-web-panels-browser before closing window
    const elements = document.querySelectorAll('[command="cmd_closeWindow"]');
    for (const element of elements) {
      element.removeAttribute("command");
      element.addEventListener("click", (e) => {
        this.#hackSessionStore(false);
        this.remove();
        BrowserCommandsWrapper.tryToCloseWindow(e);
      });
    }
  }

  initWindow() {
    markZenWindowUnsynced(this.window.raw);
    // Firefox tracks every browser window, this hidden one included, to pick
    // the one that links from other apps (and restored tabs) open in. Tracked
    // after the main window, this one would be picked: the link would open
    // here, out of sight, and selecting its tab would close the sidebar.
    if (!BrowserWindowTrackerWrapper.untrack(this.window)) {
      console.warn(
        "Second Sidebar: can't stop links opened from other apps from going to the hidden web panels window",
      );
    }
    const windowRoot = new XULElement({
      element: this.window.document.documentElement,
    });
    windowRoot.setAttribute("chromehidden", "");

    const selectors = [
      "#PersonalToolbar",
      "#navigator-toolbox",
      "#sidebar-container",
      "#sidebar-main",
      "sidebar-main",
      "#sidebar-launcher-splitter",
      "#sidebar-wrapper",
      "#sidebar-box",
      "#sidebar-splitter",
      "#context-bookmarkpage",
      "#context-viewsource",
      "#zen-appcontent-navbar-wrapper",
    ];

    // Hide elements right after initialization
    for (const selector of selectors) {
      const element = windowRoot.querySelector(selector);
      if (element) {
        element.hide();
      }
    }

    // Constantly hide elements
    const style = new Style(`
      ${selectors.join(", ")} {
        display: none;
      }
    `);
    windowRoot.appendChild(style);

    // Fix nova styles for inner window
    const bContainer = BROWSER_CONTAINER_SELECTORS.map((selector) =>
      windowRoot.querySelector(selector),
    ).find(Boolean);
    if (bContainer) bContainer.setProperty("padding", "0px");
    windowRoot
      .querySelector("#zen-appcontent-wrapper")
      ?.setProperty("min-width", "0px");
    windowRoot
      .querySelector("#zen-tabbox-wrapper")
      ?.setProperty("min-width", "0px");
    const browserContainerStyle = new Style(`
      .browserContainer {
        overflow: unset !important;
        border: none !important;
      }

      @media -moz-pref("browser.nova.enabled") {
        .browserContainer {
          border-radius: 0 !important;
          box-shadow: none !important;
        }
      }
    `);
    windowRoot.appendChild(browserContainerStyle);

    // Shrink to fit
    windowRoot.setProperty("min-width", "0px");

    // Full height for content
    windowRoot
      .querySelector("#tabbrowser-tabbox")
      ?.setProperty("height", "100%");

    // Position popups
    windowRoot
      .querySelector("#mainPopupSet")
      ?.setProperty("margin-left", "8px");
    windowRoot
      .querySelector("#notification-popup")
      ?.setProperty("margin-top", "8px");

    // Add class for userChrome.css
    windowRoot.addClass("sb2-webpanels-window");

    this.window.loadAgentSheet(WEB_PANEL_FINDBAR_CSS);
    this.#runWindowCommandsInMainWindow();

    // Close first dialog window within first 5 seconds
    this.#listenToFirstDialogAndClose();

    // Patch PopupNotifications
    PopupNotificationsPatcher.patch();

    // Patch #urlbar-input
    UrlbarInputPatcher.patch();
  }

  #runWindowCommandsInMainWindow() {
    this.window.document.addEventListener(
      "command",
      (event) => {
        const id = event.target?.id;
        if (!MAIN_WINDOW_COMMANDS.has(id)) {
          return;
        }
        const mainWindowCommand = document.getElementById(id);
        if (!mainWindowCommand) {
          return;
        }
        // Capturing on the document stops this window's own handlers
        // (on the command and its commandset) from running it too.
        event.stopPropagation();
        mainWindowCommand.doCommand();
      },
      true,
    );
  }

  #listenToFirstDialogAndClose() {
    const closeDialog = () => {
      this.window.gDialogBox.closeDialog();
      this.window.removeEventListener(DIALOG_OPEN_EVENT, closeDialog);
    };
    this.window.addEventListener(DIALOG_OPEN_EVENT, closeDialog);
    setTimeout(() => {
      this.window.removeEventListener(DIALOG_OPEN_EVENT, closeDialog);
    }, 5000);
  }

  /**
   *
   * @param {function():void} callback
   */
  addTabSelectListener(callback) {
    this.window.gBrowser.tabpanels.addEventListener("select", () => callback());
    this.forceRepaint();
    callback();
  }

  /**
   * @param {function(KeyboardEvent):void} callback
   */
  addKeypressListener(callback) {
    this.window.addEventListener("keypress", callback);
  }

  /**
   *
   * @param {function(WebPanelTab):void} callback
   */
  addZoomChangeListener(callback) {
    this.window.addEventListener("FullZoomChange", (event) => {
      const browser = new Browser({ element: event.target });
      const tab = this.window.gBrowser.getTabForBrowser(browser);
      callback(WebPanelTab.fromTab(tab));
    });
  }

  /**
   * Workaround for a Windows GPU-process bug: after this embedded window's
   * remote content becomes visible or its active tab changes, Gecko
   * sometimes fails to composite a frame even though the page is fully
   * loaded and interactive. Toggling a paint-affecting property forces
   * the compositor to rebuild the layer and actually flush a frame.
   */
  forceRepaint() {
    this.setProperty("opacity", "0.9999");
    requestAnimationFrame(() => {
      this.removeProperty("opacity");
    });
  }

  /**
   * @returns {WindowWrapper}
   */
  get window() {
    return WindowWatcherWrapper.getWindowByName(this.id);
  }

  /**
   *
   * @param {WebPanelSettings} webPanelSettings
   * @param {object} progressListener
   * @returns {WebPanelTab}
   */
  addWebPanelTab(webPanelSettings, progressListener) {
    const tab = WebPanelTab.fromTab(
      this.window.gBrowser.addTab("about:blank", {
        triggeringPrincipal: ScriptSecurityManagerWrapper.getSystemPrincipal(),
        userContextId: webPanelSettings.userContextId,
        skipRoute: true,
      }),
    );
    tab.uuid = webPanelSettings.uuid;
    // Web panels must only be unloaded through our own explicit unload flow
    // (see WebPanelController#unload). Firefox's automatic tab unloader can
    // otherwise silently discard one under memory pressure - even while
    // it's playing audio - leaving the sidebar unresponsive when the user
    // comes back to it.
    tab.setUndiscardable(true);
    if (!tab.undiscardable) {
      // Not fatal - the panel still works - but the memory-pressure
      // unloader can now target it. Surfacing this unconditionally (not
      // gated behind Logger.debug) since it means this Firefox/Zen build
      // dropped or renamed the property this fix depends on.
      console.warn(
        `Web panel ${webPanelSettings.uuid}: tab.undiscardable did not stick; ` +
          "this panel is no longer protected from Firefox's automatic tab unloader",
      );
    }
    Logger.debug(`Web panel ${webPanelSettings.uuid}: marked undiscardable`);
    tab.linkedBrowser.addProgressListener(progressListener);

    // We need to add progress listener when loading unloaded tab. This also
    // fires again if Firefox ever discards and later restores this tab's
    // browser despite setUndiscardable(true) above (e.g. an older Firefox/Zen
    // build that doesn't honor it) - the log line makes that visible.
    tab.addTabBrowserInsertedListener(() => {
      Logger.debug(`Web panel ${webPanelSettings.uuid}: browser (re)inserted`);
      tab.linkedBrowser.addProgressListener(progressListener);
    });

    // Set user agent
    if (webPanelSettings.mobile) {
      tab.linkedBrowser.setMobileUserAgent();
    } else {
      tab.linkedBrowser.unsetMobileUserAgent();
    }

    // Set zoom
    tab.linkedBrowser.setZoom(webPanelSettings.zoom);

    return tab;
  }

  /**
   *
   * @returns {WebPanelTab?}
   */
  getActiveWebPanelTab() {
    return WebPanelTab.fromTab(this.window.gBrowser.selectedTab);
  }

  /**
   *
   * @param {WebPanelTab} tab
   */
  selectWebPanelTab(tab) {
    this.window.gBrowser.selectedTab = tab;
  }

  deselectWebPanelTab() {
    this.window.gBrowser.selectTabAtIndex(FIRST_TAB_INDEX);
  }

  /**
   *
   * @param {WebPanelTab} tab
   */
  removeWebPanelTab(tab) {
    this.window.gBrowser.removeTab(tab);
  }

  /**
   *
   * @param {XULElement} element
   * @returns {boolean}
   */
  activeWebPanelContains(element) {
    const webPanelTab = this.getActiveWebPanelTab();
    // Permission buttons can be detached before the click reaches the outer
    // window. Their owner document still identifies them as panel chrome.
    return (
      this.window.document === element.ownerDocument ||
      webPanelTab.linkedBrowser.contentDocument === element.ownerDocument
    );
  }

  /**
   * Calls `callback` once the panels' window has started (see observe). If
   * that takes longer than INIT_SLOW_AFTER_MS, reports it once and keeps
   * checking every INIT_SLOW_POLL_MS rather than every INIT_POLL_MS for as
   * long as this window is open.
   *
   * @param {function():void} callback
   */
  waitInitialization(callback) {
    const start = Date.now();
    const check = () => {
      if (this.initialized) {
        callback();
        return;
      }
      const slow = Date.now() - start >= INIT_SLOW_AFTER_MS;
      if (slow && !this.#reportedSlowInit) {
        this.#reportedSlowInit = true;
        console.error(
          `Second Sidebar: the web panels window hasn't finished starting after ${INIT_SLOW_AFTER_MS / 1000} s; web panels can't open until it does.`,
        );
      }
      setTimeout(check, slow ? INIT_SLOW_POLL_MS : INIT_POLL_MS);
    };
    check();
  }
}
