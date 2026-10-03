import { FileSettings } from "./settings.mjs";
import { WebPanelSettings } from "./web_panel_settings.mjs";

const PATH = "second-sidebar-data/web-panels.json";
const LEGACY_PREF = "second-sidebar.web-panels";

export class WebPanelsSettings {
  /**@type {Array<WebPanelSettings>} */
  #webPanels = [];

  /**
   *
   * @param {Array<WebPanelSettings>} webPanels
   */
  constructor(webPanels) {
    this.#webPanels = webPanels;
  }

  get webPanels() {
    return this.#webPanels;
  }

  /**
   *
   * @param {string} sidebarPosition
   * @param {string} defaultFloatingOffset
   * @returns {Promise<WebPanelsSettings>}
   */
  static async load(sidebarPosition, defaultFloatingOffset) {
    const data = (await FileSettings.load(PATH, LEGACY_PREF)) ?? [];

    return new WebPanelsSettings(
      // Older versions saved temporary panels too (see persistentWebPanels).
      data
        .filter((webPanelData) => !webPanelData.temporary)
        .map((webPanelData) =>
          WebPanelSettings.fromObject(
            sidebarPosition,
            `var(--space-${defaultFloatingOffset})`,
            webPanelData,
          ),
        ),
    );
  }

  /**
   * The panels to save or export: temporary ones (previews) go away when
   * they're closed, so they mustn't come back after a restart, in every
   * window, or with an import.
   *
   * @returns {Array<WebPanelSettings>}
   */
  get persistentWebPanels() {
    return this.#webPanels.filter((webPanel) => !webPanel.temporary);
  }

  save() {
    return FileSettings.save(
      PATH,
      this.persistentWebPanels.map((webPanel) => webPanel.toObject()),
    );
  }
}
