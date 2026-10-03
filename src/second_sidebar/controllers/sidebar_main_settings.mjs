import { SidebarEvents, sendEvents } from "./events.mjs";
import {
  buildSettingsExport,
  parseSettingsExport,
} from "../settings/settings_export.mjs";

import { AppStartupWrapper } from "../wrappers/app_startup.mjs";
import { SIDEBAR_FIELD_EVENTS } from "./sidebar_fields.mjs";
import { FilePickerWrapper } from "../wrappers/file_picker.mjs";
import { IOUtilsWrapper } from "../wrappers/io_utils.mjs";
import { PromptServiceWrapper } from "../wrappers/prompt.mjs";
import { SidebarControllers } from "../sidebar_controllers.mjs";
import { SidebarElements } from "../sidebar_elements.mjs";
import { WindowWrapper } from "../wrappers/window.mjs";

const EXPORT_TITLE = "Export Second Sidebar Settings";
const IMPORT_TITLE = "Import Second Sidebar Settings";

export class SidebarMainSettingsController {
  constructor() {
    this.#setupListeners();
  }

  #setupListeners() {
    SidebarElements.sidebarMainPopupSettings.listenChanges({
      // Every setting but the visibility ones is sent as { value } in its
      // own event (SIDEBAR_FIELD_EVENTS).
      ...Object.fromEntries(
        Object.entries(SIDEBAR_FIELD_EVENTS).map(([field, event]) => [
          field,
          (value) => sendEvents(SidebarEvents[event], { value }),
        ]),
      ),
      visibility: (
        autoHideSidebar,
        autoHideSidebarBehavior,
        sidebarWidgetHideWebPanel,
        sidebarWidgetShortcut,
      ) =>
        sendEvents(SidebarEvents.EDIT_SIDEBAR_VISIBILITY, {
          autoHideSidebar,
          autoHideSidebarBehavior,
          sidebarWidgetHideWebPanel,
          sidebarWidgetShortcut,
        }),
    });

    SidebarElements.sidebarMainPopupSettings.listenCancelButtonClick(() =>
      SidebarElements.sidebarMainPopupSettings.hidePopup(),
    );

    SidebarElements.sidebarMainPopupSettings.listenSaveButtonClick(() => {
      SidebarControllers.sidebarController.saveSettings();
      SidebarElements.sidebarMainPopupSettings.hidePopup();
    });

    SidebarElements.sidebarMainPopupSettings.listenExportSettingsButtonClick(
      () => this.#exportSettings(),
    );
    SidebarElements.sidebarMainPopupSettings.listenImportSettingsButtonClick(
      () => this.#importSettings(),
    );
  }

  /**
   *
   * @param {number} screenX
   * @param {number} screenY
   */
  openPopup(screenX, screenY) {
    SidebarElements.sidebarMainPopupSettings.openPopupAtScreen(
      screenX,
      screenY,
      SidebarControllers.sidebarController.dumpSettings(),
    );
  }

  /**
   * Writes the sidebar settings and every web panel's settings (see
   * buildSettingsExport) to a single JSON file the user picks.
   */
  async #exportSettings() {
    const window = new WindowWrapper().raw;
    const path = await FilePickerWrapper.pickSaveFile(
      window,
      EXPORT_TITLE,
      "second-sidebar-settings.json",
    );
    if (!path) return;

    try {
      const data = buildSettingsExport(
        SidebarControllers.sidebarController.dumpSettings(),
        SidebarControllers.webPanelsController.dumpSettings(),
      );
      await IOUtilsWrapper.writeUTF8(path, JSON.stringify(data, null, 2));
      PromptServiceWrapper.alert(
        window,
        EXPORT_TITLE,
        "Settings exported successfully.",
      );
    } catch (error) {
      console.error("Second Sidebar: failed to export settings", error);
      PromptServiceWrapper.alert(
        window,
        EXPORT_TITLE,
        "Failed to export settings. See the Browser Console for details.",
      );
    }
  }

  /**
   * Writes the imported settings straight to the same storage the addon
   * reads at startup (SidebarSettings/WebPanelsSettings.save) instead of
   * hot-applying them live: a wholesale settings replacement can add,
   * remove, or re-key entire panels and containers at once, which the live
   * per-field event system (see #setupListeners here and in
   * WebPanelsController) isn't built to do safely in a single shot. A
   * restart picks the new settings up the same way any fresh window does.
   *
   * Until that restart, every open window still holds its pre-import
   * settings, and many ordinary actions (opening, moving or resizing a
   * panel, ...) save them - which would silently overwrite the import. So
   * settings saves are suspended in every window first, and the user is
   * offered an immediate restart. The suspension is never lifted, even if
   * writing fails: after an earlier import, resuming would let windows save
   * their pre-import settings over it.
   */
  async #importSettings() {
    const window = new WindowWrapper().raw;
    const path = await FilePickerWrapper.pickOpenFile(window, IMPORT_TITLE);
    if (!path) return;

    let imported;
    try {
      imported = parseSettingsExport(
        JSON.parse(await IOUtilsWrapper.readUTF8(path)),
      );
    } catch (error) {
      console.error("Second Sidebar: failed to import settings", error);
      PromptServiceWrapper.alert(
        window,
        IMPORT_TITLE,
        `Failed to import settings: ${error.message}. See the Browser Console for details.`,
      );
      return;
    }

    sendEvents(SidebarEvents.SUSPEND_SETTINGS_SAVES);
    try {
      await imported.webPanelsSettings.save();
      imported.sidebarSettings.save();
    } catch (error) {
      console.error("Second Sidebar: failed to write imported settings", error);
      PromptServiceWrapper.alert(
        window,
        IMPORT_TITLE,
        "Failed to import settings: they could not be written to disk. See the Browser Console for details.\n\n" +
          "Restart the browser before changing any settings: until then, changes to the sidebar or web panels won't be saved.",
      );
      return;
    }

    const { invalidSettings } = imported;
    let invalidNote = "";
    if (invalidSettings.length > 0) {
      console.warn(
        "Second Sidebar: imported settings with invalid values, reset to their defaults:",
        invalidSettings,
      );
      invalidNote =
        invalidSettings.length === 1
          ? "One setting in the file had an invalid value and was reset to its default"
          : `${invalidSettings.length} settings in the file had invalid values and were reset to their defaults`;
      invalidNote += " (listed in the Browser Console).\n\n";
    }
    const restartNow = PromptServiceWrapper.confirm(
      window,
      IMPORT_TITLE,
      "Settings imported. Restart the browser now to apply them?\n\n" +
        invalidNote +
        "Until the browser restarts, changes to the sidebar or web panels won't be saved.",
      "Restart Now",
      "Later",
    );
    if (restartNow) {
      AppStartupWrapper.restart();
    }
  }
}
