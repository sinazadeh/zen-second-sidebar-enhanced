import { SidebarEvents, sendEvents } from "./events.mjs";
import {
  buildSettingsExport,
  parseSettingsExport,
} from "../settings/settings_export.mjs";

import { AppStartupWrapper } from "../wrappers/app_startup.mjs";
import { CustomizableUIWrapper } from "../wrappers/customizable_ui.mjs";
import { SIDEBAR_FIELD_EVENTS } from "./sidebar_fields.mjs";
import { SidebarControllers } from "../sidebar_controllers.mjs";
import { SidebarElements } from "../sidebar_elements.mjs";
import { WebPanelsSettings } from "../settings/web_panels_settings.mjs";
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

// The sidebar's keyboard shortcuts, each with the Shortcuts method saying
// whether a key combination is already taken by something else.
const SHORTCUT_FIELDS = {
  sidebarWidgetShortcut: "isSidebarWidgetShortcutBusy",
  lastWebPanelShortcut: "isLastWebPanelShortcutBusy",
  nextWebPanelShortcut: "isNextWebPanelShortcutBusy",
  previousWebPanelShortcut: "isPreviousWebPanelShortcutBusy",
};

/**
 * @typedef {object} BackupParts What a backup holds, or what to restore.
 * @property {boolean} sidebar the sidebar settings, keyboard shortcuts
 *   included
 * @property {boolean} webPanels every web panel and its settings
 */

/**
 * Opens the settings page (settings_page/settings.html) in a tab: from the
 * sidebar's right-click menu, and from the settings button of this mod in
 * Sine's mod list, instead of Sine's own settings dialog.
 *
 * The page edits the mirrored sidebar prefs itself. What needs this
 * window's sidebar (keyboard shortcuts, backups) it asks of the methods
 * below, which every browser window offers it as `SecondSidebarSettingsPage`.
 */
export class SettingsPageController {
  /** @type {WeakSet<Document>} settings pages already hooked */
  #hooked = new WeakSet();

  constructor() {
    SidebarElements.sidebarMainMenuPopup.listenSettingsItemClick(() =>
      this.open(),
    );
    this.#hookSineSettingsButton();
    window.SecondSidebarSettingsPage = Object.freeze({
      getShortcuts: () => this.getShortcuts(),
      isShortcutBusy: (field, shortcut, event) =>
        this.isShortcutBusy(field, shortcut, event),
      setShortcut: (field, shortcut) => this.setShortcut(field, shortcut),
      exportSettings: (parts) => this.exportSettings(parts),
      readBackup: (data) => this.readBackup(data),
      restoreBackup: (data, parts) => this.restoreBackup(data, parts),
      restart: () => AppStartupWrapper.restart(),
    });
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

  /**
   * @returns {Object<string, string>} each of the sidebar's keyboard
   *   shortcuts, "" for none
   */
  getShortcuts() {
    const sidebarController = SidebarControllers.sidebarController;
    return Object.fromEntries(
      Object.keys(SHORTCUT_FIELDS).map((field) => [
        field,
        sidebarController[field],
      ]),
    );
  }

  /**
   * @param {string} field one of SHORTCUT_FIELDS
   * @param {string} shortcut
   * @param {KeyboardEvent?} event the keys pressed for it
   * @returns {boolean} whether another action or a web panel has it
   */
  isShortcutBusy(field, shortcut, event = null) {
    return SidebarControllers.webPanelsShortcuts[this.#busyCheckOf(field)](
      shortcut,
      event,
    );
  }

  /**
   * Sets one of the sidebar's keyboard shortcuts in every window, and saves
   * it.
   *
   * @param {string} field one of SHORTCUT_FIELDS
   * @param {string} shortcut "" for none
   */
  setShortcut(field, shortcut) {
    this.#busyCheckOf(field);
    if (typeof shortcut !== "string") {
      throw new TypeError("A shortcut is a string");
    }
    if (field === "sidebarWidgetShortcut") {
      // It goes with the visibility settings (SidebarController#setVisibilitySettings).
      const settings = SidebarControllers.sidebarController.dumpSettings();
      sendEvents(SidebarEvents.EDIT_SIDEBAR_VISIBILITY, {
        autoHideSidebar: settings.autoHideSidebar,
        autoHideSidebarBehavior: settings.autoHideSidebarBehavior,
        sidebarWidgetHideWebPanel: settings.sidebarWidgetHideWebPanel,
        sidebarWidgetShortcut: shortcut,
      });
    } else {
      sendEvents(SidebarEvents[SIDEBAR_FIELD_EVENTS[field]], {
        value: shortcut,
      });
    }
    SidebarControllers.sidebarController.saveSettings();
  }

  /**
   * @param {string} field
   * @returns {string} its Shortcuts busy check
   */
  #busyCheckOf(field) {
    if (!Object.hasOwn(SHORTCUT_FIELDS, field)) {
      throw new Error(`Not one of the sidebar's shortcuts: ${field}`);
    }
    return SHORTCUT_FIELDS[field];
  }

  /**
   * A backup of this window's settings, as written to the file (see
   * buildSettingsExport). Web panels are in the order of their buttons, so
   * they come back in that order in a profile that doesn't have them.
   *
   * @param {BackupParts} parts
   * @returns {object}
   */
  exportSettings({ sidebar, webPanels }) {
    return buildSettingsExport(
      sidebar ? SidebarControllers.sidebarController.dumpSettings() : null,
      webPanels ? this.#webPanelsInButtonOrder() : null,
    );
  }

  /**
   * @returns {WebPanelsSettings}
   */
  #webPanelsInButtonOrder() {
    const { webPanels } = SidebarControllers.webPanelsController.dumpSettings();
    const placement = (webPanel) =>
      CustomizableUIWrapper.getPlacementOfWidget(webPanel.uuid)?.position ??
      Number.MAX_SAFE_INTEGER;
    return new WebPanelsSettings(
      [...webPanels].sort((a, b) => placement(a) - placement(b)),
    );
  }

  /**
   * Checks a backup read from a file. Throws an Error saying what's wrong
   * with one that can't be imported.
   *
   * @param {object} data the file's contents, parsed
   * @returns {{sidebar: boolean, webPanels: number?, invalidSettings: string[]}}
   *   whether it has sidebar settings, how many web panels (null for none
   *   at all), and the settings with a value that will be reset
   */
  readBackup(data) {
    const { sidebarSettings, webPanelsSettings, invalidSettings } =
      parseSettingsExport(
        data,
        SidebarControllers.sidebarController.dumpSettings(),
      );
    return {
      sidebar: sidebarSettings !== null,
      webPanels: webPanelsSettings?.webPanels.length ?? null,
      invalidSettings,
    };
  }

  /**
   * Replaces the chosen parts of the settings with a backup's, for the next
   * start: a wholesale replacement can add, remove or re-key panels and
   * containers at once, which the per-setting events aren't built to apply
   * live. Until the browser restarts, every open window still holds the
   * settings it had and would save them over the backup's on ordinary
   * actions (opening, moving or resizing a panel), so first their saves are
   * suspended until then. That's never undone, even if writing fails: after
   * an earlier import, resuming would let windows save their pre-import
   * settings over it.
   *
   * @param {object} data the file's contents, parsed
   * @param {BackupParts} parts what to restore of what it has
   * @returns {Promise<string[]>} the settings whose value was reset
   */
  async restoreBackup(data, { sidebar, webPanels }) {
    const chosen = { ...data };
    if (!sidebar) delete chosen.sidebarSettings;
    if (!webPanels) delete chosen.webPanels;
    // Panels restored without the sidebar settings go with the ones in use.
    const { sidebarSettings, webPanelsSettings, invalidSettings } =
      parseSettingsExport(
        chosen,
        SidebarControllers.sidebarController.dumpSettings(),
      );

    sendEvents(SidebarEvents.SUSPEND_SETTINGS_SAVES);
    await webPanelsSettings?.save();
    sidebarSettings?.save();
    return invalidSettings;
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
