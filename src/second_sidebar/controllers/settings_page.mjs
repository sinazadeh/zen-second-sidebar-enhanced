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
  /** @type {WeakSet<Document>} settings pages already hooked */
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
    let page;
    try {
      page = browser.contentDocument;
    } catch {
      return; // A page in a content process: not about:preferences.
    }
    // The page's document, not browser.contentWindow: that's the tab's
    // window proxy, the same object for every page the tab loads, so after
    // a reload, or in a tab restored from the last session (which gives its
    // address before its page has loaded), the new page was taken for
    // hooked and Sine's own dialog opened.
    if (
      !page ||
      this.#hooked.has(page) ||
      !/^about:(preferences|settings)/.test(page.documentURI)
    ) {
      return;
    }
    this.#hooked.add(page);
    page.addEventListener(
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
