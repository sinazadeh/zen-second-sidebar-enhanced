import { WebPanelEvents, sendEvents } from "./events.mjs";

import { SidebarControllers } from "../sidebar_controllers.mjs";
import { SidebarElements } from "../sidebar_elements.mjs";
import { WebPanelController } from "./web_panel.mjs"; // eslint-disable-line no-unused-vars
import { buildWebPanelEditCallbacks } from "./web_panel_fields.mjs";

export class WebPanelEditController {
  constructor() {
    this.#setupListeners();
  }

  #setupListeners() {
    SidebarElements.webPanelPopupEdit.listenChanges(
      buildWebPanelEditCallbacks(
        (event, detail) => sendEvents(WebPanelEvents[event], detail),
        (uuid) => SidebarControllers.webPanelsController.get(uuid).getZoom(),
      ),
    );

    // The edited panel stays in view while its spaces are changed (see
    // WebPanelsController#applySpaces), until the popup has closed.
    SidebarElements.webPanelPopupEdit.addEventListener(
      "popuphidden",
      (event) => {
        if (event.target === SidebarElements.webPanelPopupEdit.getXUL()) {
          setTimeout(() =>
            SidebarControllers.webPanelsController.applySpaces(),
          );
        }
      },
    );

    SidebarElements.webPanelPopupEdit.listenCancelButtonClick(() =>
      this.hidePopup(),
    );

    SidebarElements.webPanelPopupEdit.listenSaveButtonClick(() => {
      SidebarControllers.webPanelsController.saveSettings();
      this.hidePopup();
    });
  }

  /**
   *
   * @param {WebPanelController} webPanelController
   */
  openPopup(webPanelController) {
    SidebarElements.webPanelPopupEdit.openPopup(webPanelController);
  }

  hidePopup() {
    SidebarElements.webPanelPopupEdit.hidePopup();
  }
}
