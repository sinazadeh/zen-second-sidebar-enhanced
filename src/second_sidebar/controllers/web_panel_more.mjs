import { WebPanelEvents, sendEvents } from "./events.mjs";

import { ClipboardHelperWrapper } from "../wrappers/clipboard_helper.mjs";
import { SidebarControllers } from "../sidebar_controllers.mjs";
import { SidebarElements } from "../sidebar_elements.mjs";

export class WebPanelMoreController {
  constructor() {
    this.#setupListeners();
  }

  #setupListeners() {
    SidebarElements.webPanelPopupMore.listenPopupShowing(() => {
      const webPanelController =
        SidebarControllers.webPanelsController.getActive();
      SidebarElements.webPanelPopupMore.setDefaults(
        webPanelController.dumpSettings(),
      );
    });

    SidebarElements.webPanelPopupMore.listenOpenInNewTabButtonClick(
      (event, uuid) => {
        SidebarControllers.webPanelsController
          .get(uuid)
          ?.openInNewTab(event.ctrlKey);
      },
    );

    SidebarElements.webPanelPopupMore.listenCopyPageUrlButtonClick((uuid) => {
      const webPanelController =
        SidebarControllers.webPanelsController.get(uuid);
      ClipboardHelperWrapper.copyString(webPanelController.getTabUrl());
    });

    SidebarElements.webPanelPopupMore.listenUserAgentChange(
      (uuid, userAgent, customUserAgent) => {
        sendEvents(WebPanelEvents.EDIT_WEB_PANEL_USER_AGENT, {
          uuid,
          userAgent,
          customUserAgent,
          timeout: 0,
        });
        SidebarControllers.webPanelsController.saveSettings();
      },
    );

    SidebarElements.webPanelPopupMore.listenTemporaryButtonClick(
      (uuid, temporary) => {
        sendEvents(WebPanelEvents.EDIT_WEB_PANEL_TEMPORARY, {
          uuid,
          temporary,
        });
        SidebarControllers.webPanelsController.saveSettings();
      },
    );

    SidebarElements.webPanelPopupMore.listenAlwaysOnTopButtonClick(
      (uuid, alwaysOnTop) => {
        sendEvents(WebPanelEvents.EDIT_WEB_PANEL_ALWAYS_ON_TOP, {
          uuid,
          alwaysOnTop,
        });
        SidebarControllers.webPanelsController.saveSettings();
      },
    );

    SidebarElements.webPanelPopupMore.listenZoomOutButtonClick((uuid) => {
      sendEvents(WebPanelEvents.EDIT_WEB_PANEL_ZOOM_OUT, {
        uuid,
      });
      SidebarControllers.webPanelsController.saveSettings();

      const webPanelController =
        SidebarControllers.webPanelsController.get(uuid);
      return webPanelController.getZoom();
    });

    SidebarElements.webPanelPopupMore.listenZoomInButtonClick((uuid) => {
      sendEvents(WebPanelEvents.EDIT_WEB_PANEL_ZOOM_IN, {
        uuid,
      });
      SidebarControllers.webPanelsController.saveSettings();

      const webPanelController =
        SidebarControllers.webPanelsController.get(uuid);
      return webPanelController.getZoom();
    });

    SidebarElements.webPanelPopupMore.listenResetZoomButtonClick((uuid) => {
      sendEvents(WebPanelEvents.EDIT_WEB_PANEL_ZOOM, {
        uuid,
        value: 1,
      });
      SidebarControllers.webPanelsController.saveSettings();

      const webPanelController =
        SidebarControllers.webPanelsController.get(uuid);
      return webPanelController.getZoom();
    });
  }
}
