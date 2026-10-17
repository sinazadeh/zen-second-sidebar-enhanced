import { SidebarElements } from "../sidebar_elements.mjs";
import { WindowWrapper } from "../wrappers/window.mjs";

// Next to this addon's other files, whichever loader served them
// (chrome://sine/content/... or fx-autoconfig's chrome:// alias), so the page
// gets chrome privileges and can edit the mirrored sidebar prefs.
const SETTINGS_PAGE_URL = new URL(
  "../settings_page/settings.html",
  import.meta.url,
).href;
// This mod's id in Sine (theme.json).
const SINE_MOD_ID = "zen-second-sidebar";

/**
 * Opens the settings page (settings_page/settings.html) in a tab: from the
 * sidebar's right-click menu, and from the settings button of this mod in
 * Sine's mod list, instead of Sine's own settings dialog.
 */
export class SettingsPageController {
  /** @type {WeakSet<Window>} settings pages already hooked */
  #hooked = new WeakSet();

  constructor() {
    SidebarElements.sidebarMainMenuPopup.listenSettingsPageItemClick(() =>
      this.open(),
    );
    this.#hookSineSettingsButton();
  }

  /** Selects the settings page's tab, or opens one. */
  open() {
    const gBrowser = new WindowWrapper().gBrowser;
    const existing = gBrowser.tabs.find(
      (tab) =>
        gBrowser.getBrowserForTab(tab).getXUL()?.currentURI?.spec ===
        SETTINGS_PAGE_URL,
    );
    gBrowser.selectedTab =
      existing ?? gBrowser.addTrustedTab(SETTINGS_PAGE_URL);
  }

  // Sine lists mods in about:preferences. Every page this window loads is
  // checked; the listener goes away with the window.
  #hookSineSettingsButton() {
    const gBrowser = new WindowWrapper().gBrowser;
    const hook = (browser) => this.#hookSettingsPage(browser);
    gBrowser.addTabsProgressListener({
      onLocationChange(browser, webProgress) {
        if (webProgress?.isTopLevel) {
          hook(browser);
        }
      },
      onStateChange(browser, webProgress, _request, flags) {
        if (
          webProgress?.isTopLevel &&
          flags & Ci.nsIWebProgressListener.STATE_STOP
        ) {
          hook(browser);
        }
      },
    });
    for (const tab of gBrowser.tabs) {
      hook(gBrowser.getBrowserForTab(tab).getXUL());
    }
  }

  /**
   * @param {object} browser a <browser> element
   */
  #hookSettingsPage(browser) {
    let win;
    try {
      win = browser.contentWindow;
    } catch {
      return; // A page in a content process: not about:preferences.
    }
    if (
      !win ||
      this.#hooked.has(win) ||
      !/^about:(preferences|settings)/.test(String(win.location?.href))
    ) {
      return;
    }
    this.#hooked.add(win);
    win.addEventListener(
      "click",
      (event) => {
        const button = event.target.closest?.(".sineItemConfigureButton");
        const modId = button?.closest(".sineItem")?.getAttribute("mod-id");
        if (modId === SINE_MOD_ID) {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.open();
        }
      },
      true,
    );
  }
}
