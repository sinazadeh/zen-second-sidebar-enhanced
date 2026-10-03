import { fetchFirstAvailable, importPatchedModule } from "../utils/files.mjs";
import {
  patchPopupNotificationsSource,
  reportUnappliedPatches,
} from "./source_patches.mjs";

const MODULE_URL = "resource://gre/modules/PopupNotifications.sys.mjs";
const PATCHED_MODULE_RELATIVE_PATH = "fss/PopupNotifications.sys.mjs";

export class PopupNotificationsPatcher {
  /**
   * @param {Window} childWindow the hidden web panels window
   */
  static patch(childWindow) {
    console.log("Patching PopupNotifications.sys.mjs...");
    this.#patch(childWindow).then(
      (complete) =>
        console.log(
          complete
            ? "PopupNotifications.sys.mjs was patched"
            : "PopupNotifications.sys.mjs was only partly patched (see the warning above)",
        ),
      (error) =>
        console.error("Failed to patch PopupNotifications.sys.mjs:", error),
    );
  }

  /**
   * @param {Window} childWindow
   * @returns {Promise<boolean>} false if any patch no longer applies
   */
  static async #patch(childWindow) {
    const { source, unmatched } = patchPopupNotificationsSource(
      await fetchFirstAvailable([MODULE_URL]),
    );
    reportUnappliedPatches("PopupNotifications.sys.mjs", unmatched);
    const module = await importPatchedModule(
      PATCHED_MODULE_RELATIVE_PATH,
      source,
    );
    this.#defineLazyGetter(childWindow, module);
    return unmatched.length === 0;
  }

  /**
   * @param {Window} childWindow
   * @param {Object} module
   */
  static #defineLazyGetter(childWindow, module) {
    ChromeUtils.defineLazyGetter(childWindow, "PopupNotifications", () => {
      try {
        let shouldSuppress = () => {
          return false;
        };
        const getVisibleAnchorElement = () => {
          return childWindow.document.getElementById("mainPopupSet");
        };
        return new module.PopupNotifications(
          childWindow.gBrowser,
          childWindow.document.getElementById("notification-popup"),
          childWindow.document.getElementById("notification-popup-box"),
          { shouldSuppress, getVisibleAnchorElement },
        );
      } catch (ex) {
        console.error(ex);
        return null;
      }
    });
  }
}
