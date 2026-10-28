import { SidebarEvents, sendEvents } from "./events.mjs";
import {
  buildSettingsExport,
  parseSettingsExport,
} from "../settings/settings_export.mjs";

import { AppStartupWrapper } from "../wrappers/app_startup.mjs";
import { CustomizableUIWrapper } from "../wrappers/customizable_ui.mjs";
import { SIDEBAR_FIELD_EVENTS, VISIBILITY_FIELDS } from "./sidebar_fields.mjs";
import { SidebarControllers } from "../sidebar_controllers.mjs";
import { SidebarElements } from "../sidebar_elements.mjs";
import { isValidSidebarSettingValue } from "../settings/sidebar_validation.mjs";
import { WebPanelsSettings } from "../settings/web_panels_settings.mjs";
import { WindowWrapper } from "../wrappers/window.mjs";

// Next to this addon's other files, whichever loader served them
// (chrome://sine/content/... or fx-autoconfig's chrome:// alias), so the page
// gets chrome privileges and can call back into the browser window.
const SETTINGS_PAGE_URL = new URL(
  "../settings_page/settings.html",
  import.meta.url,
).href;
const SUPPORT_URLS = new Set([
  "https://github.com/sinazadeh/zen-second-sidebar-enhanced",
  "https://github.com/sponsors/sinazadeh",
]);

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
 * sidebar's right-click menu. It asks the methods below to edit settings,
 * keyboard shortcuts and backups; every browser window offers them as
 * `SecondSidebarSettingsPage`.
 */
export class SettingsPageController {
  constructor() {
    SidebarElements.sidebarMainMenuPopup.listenSettingsItemClick(() =>
      this.open(),
    );
    window.SecondSidebarSettingsPage = Object.freeze({
      getSettings: () => this.getSettings(),
      setSetting: (field, value) => this.setSetting(field, value),
      onSettingsChanged: (callback) => this.onSettingsChanged(callback),
      getShortcuts: () => this.getShortcuts(),
      openSupportPage: (url) => this.openSupportPage(url),
      isShortcutBusy: (field, shortcut, event) =>
        this.isShortcutBusy(field, shortcut, event),
      setShortcut: (field, shortcut) => this.setShortcut(field, shortcut),
      exportSettings: (parts) => this.exportSettings(parts),
      readBackup: (data) => this.readBackup(data),
      restoreBackup: (data, parts) => this.restoreBackup(data, parts),
      restart: () => AppStartupWrapper.restart(),
    });
  }

  /** @returns {object} the sidebar settings currently in effect */
  getSettings() {
    return SidebarControllers.sidebarController.dumpSettings().toObject();
  }

  /**
   * Applies one non-shortcut setting in every browser window and saves it.
   *
   * @param {string} field
   * @param {string | boolean} value
   */
  setSetting(field, value) {
    if (Object.hasOwn(SHORTCUT_FIELDS, field)) {
      throw new Error(`Use setShortcut for ${field}`);
    }
    if (!isValidSidebarSettingValue(field, value)) {
      throw new TypeError(`Invalid sidebar setting ${field}`);
    }
    const settings = SidebarControllers.sidebarController.dumpSettings();
    if (settings[field] === value) {
      return;
    }
    settings[field] = value;
    if (VISIBILITY_FIELDS.includes(field)) {
      sendEvents(SidebarEvents.EDIT_SIDEBAR_VISIBILITY, {
        autoHideSidebar: settings.autoHideSidebar,
        autoHideSidebarBehavior: settings.autoHideSidebarBehavior,
        sidebarWidgetHideWebPanel: settings.sidebarWidgetHideWebPanel,
        sidebarWidgetShortcut: settings.sidebarWidgetShortcut,
      });
    } else {
      const event = SIDEBAR_FIELD_EVENTS[field];
      if (!event) {
        throw new Error(`No event applies sidebar setting ${field}`);
      }
      sendEvents(SidebarEvents[event], { value });
    }
    SidebarControllers.sidebarController.saveSettings();
  }

  /**
   * Calls `callback` whenever this window receives a sidebar setting event.
   * Returns a function that removes the listeners.
   *
   * @param {function(): void} callback
   * @returns {function(): void}
   */
  onSettingsChanged(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("A settings listener is a function");
    }
    const eventTypes = new Set([
      SidebarEvents.EDIT_SIDEBAR_VISIBILITY,
      ...Object.values(SIDEBAR_FIELD_EVENTS).map(
        (event) => SidebarEvents[event],
      ),
    ]);
    for (const type of eventTypes) {
      window.addEventListener(type, callback);
    }
    return () => {
      for (const type of eventTypes) {
        window.removeEventListener(type, callback);
      }
    };
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
   * Opens one of the settings page's known web links in a content tab.
   *
   * @param {string} url
   * @returns {boolean} whether the URL was opened
   */
  openSupportPage(url) {
    const browserWindow = new WindowWrapper().raw;
    if (
      !SUPPORT_URLS.has(url) ||
      typeof browserWindow.openTrustedLinkIn !== "function"
    ) {
      return false;
    }
    browserWindow.openTrustedLinkIn(url, "tab", { relatedToCurrent: true });
    return true;
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
}
