import {
  createPopupGroup,
  createPopupSet,
  createSubviewButton,
  createSubviewIconicButton,
  createZoomButtons,
  updateZoomButtons,
} from "../utils/xul.mjs";

import { MenuSeparator } from "./base/menuseparator.mjs";
import { Panel } from "./base/panel.mjs";
import { PanelMultiView } from "./base/panel_multi_view.mjs";
import { ToolbarButton } from "./base/toolbar_button.mjs"; // eslint-disable-line no-unused-vars
import { PopupBody } from "./popup_body.mjs";
import { UserAgentMenuList } from "./user_agent_menu_list.mjs";
import { WebPanelSettings } from "../settings/web_panel_settings.mjs"; // eslint-disable-line no-unused-vars
import { CUSTOM_USER_AGENT } from "../utils/user_agents.mjs";
import { isLeftMouseButton } from "../utils/buttons.mjs";

const ICONS = {
  CHECK: "chrome://global/skin/icons/check.svg",
  CLOSE: "chrome://global/skin/icons/close.svg",
  MINUS: "chrome://global/skin/icons/minus.svg",
  PLUS: "chrome://global/skin/icons/plus.svg",
};

export class WebPanelPopupMore extends Panel {
  constructor() {
    super({
      id: "sb2-web-panel-more",
      classList: ["sb2-popup"],
    });
    this.setType("arrow");

    this.openInNewTabButton = createSubviewButton("Open in New Tab");
    this.copyPageUrlButton = createSubviewButton("Copy Page URL");
    this.temporaryButton = this.#createFlagButton("Temporary");
    this.userAgentMenuList = new UserAgentMenuList();
    this.alwaysOnTopButton = this.#createFlagButton("Always On Top");
    this.zoomOutButton = createSubviewIconicButton(ICONS.MINUS, "Zoom Out");
    this.zoomInButton = createSubviewIconicButton(ICONS.PLUS, "Zoom In");
    this.resetZoomButton = createSubviewButton("100%", {
      id: "sb2-zoom-button",
      tooltipText: "Reset Zoom",
    });
    this.#compose();
  }

  #compose() {
    this.appendChild(
      new PanelMultiView().appendChildren(
        new PopupBody({ compact: true }).appendChildren(
          createPopupSet("", [
            this.openInNewTabButton,
            this.copyPageUrlButton,
            createPopupGroup("User Agent", this.userAgentMenuList),
            new MenuSeparator(),
            this.alwaysOnTopButton,
            new MenuSeparator(),
            this.temporaryButton,
            new MenuSeparator(),
            createZoomButtons(
              this.zoomOutButton,
              this.resetZoomButton,
              this.zoomInButton,
            ),
          ]),
        ),
      ),
    );
  }

  /**
   *
   * @param {function(MouseEvent):void} callback
   */
  listenPopupShowing(callback) {
    this.addEventListener("popupshowing", (event) => {
      // Not the user agent list's own popup opening inside this one.
      if (event.target === this.getXUL()) {
        callback(event);
      }
    });
  }

  /**
   *
   * @param {function(string):void} callback
   */
  listenOpenInNewTabButtonClick(callback) {
    this.openInNewTabButton.addEventListener("click", (event) => {
      if (isLeftMouseButton(event)) {
        callback(event, this.settings.uuid);
      }
    });
  }

  /**
   *
   * @param {function(string):void} callback
   */
  listenCopyPageUrlButtonClick(callback) {
    this.copyPageUrlButton.addEventListener("click", (event) => {
      if (isLeftMouseButton(event)) {
        callback(this.settings.uuid);
      }
    });
  }

  /**
   *
   * @param {function(string, string, string):void} callback
   */
  listenUserAgentChange(callback) {
    this.userAgentMenuList.addEventListener("command", () => {
      callback(
        this.settings.uuid,
        this.userAgentMenuList.getValue(),
        this.settings.customUserAgent,
      );
    });
  }

  /**
   *
   * @param {function(string, boolean):void} callback
   */
  listenTemporaryButtonClick(callback) {
    this.#listenFlagButtonClick(this.temporaryButton, callback);
  }

  /**
   *
   * @param {function(string, boolean):void} callback
   */
  listenAlwaysOnTopButtonClick(callback) {
    this.#listenFlagButtonClick(this.alwaysOnTopButton, callback);
  }

  /**
   *
   * @param {string} label
   * @returns {ToolbarButton}
   */
  #createFlagButton(label) {
    return createSubviewButton(label).setAttribute("role", "checkbox");
  }

  /**
   *
   * @param {ToolbarButton} button
   * @param {function(string, boolean):void} callback
   */
  #listenFlagButtonClick(button, callback) {
    button.addEventListener("click", (event) => {
      if (isLeftMouseButton(event)) {
        const checked = !button.isChecked();
        this.#setFlagButtonChecked(button, checked);
        callback(this.settings.uuid, checked);
      }
    });
  }

  /**
   *
   * @param {ToolbarButton} button
   * @param {boolean} checked
   */
  #setFlagButtonChecked(button, checked) {
    button.setChecked(checked);
    button.setAttribute("aria-checked", checked);
    button.setIcon(checked ? ICONS.CHECK : ICONS.CLOSE);
  }

  /**
   *
   * @param {function(string):number} callback
   */
  listenZoomInButtonClick(callback) {
    this.zoomInButton.addEventListener("click", (event) => {
      if (isLeftMouseButton(event)) {
        const zoom = callback(this.settings.uuid);
        this.#updateZoomButtons(zoom);
      }
    });
  }

  /**
   *
   * @param {function(string):number} callback
   */
  listenZoomOutButtonClick(callback) {
    this.zoomOutButton.addEventListener("click", (event) => {
      if (isLeftMouseButton(event)) {
        const zoom = callback(this.settings.uuid);
        this.#updateZoomButtons(zoom);
      }
    });
  }

  /**
   *
   * @param {function(string):number} callback
   */
  listenResetZoomButtonClick(callback) {
    this.resetZoomButton.addEventListener("click", (event) => {
      if (isLeftMouseButton(event)) {
        const zoom = callback(this.settings.uuid);
        this.#updateZoomButtons(zoom);
      }
    });
  }

  /**
   *
   * @param {number} zoom
   */
  #updateZoomButtons(zoom) {
    updateZoomButtons(
      zoom,
      this.zoomOutButton,
      this.resetZoomButton,
      this.zoomInButton,
    );
  }

  /**
   *
   * @param {WebPanelSettings} settings
   */
  setDefaults(settings) {
    // The custom one is entered in Edit Web Panel, so "Custom" is only
    // offered once there is one.
    this.userAgentMenuList
      .fill({
        custom:
          settings.customUserAgent !== "" ||
          settings.userAgent === CUSTOM_USER_AGENT,
      })
      .setValue(settings.userAgent);
    this.#setFlagButtonChecked(this.temporaryButton, settings.temporary);
    this.#setFlagButtonChecked(this.alwaysOnTopButton, settings.alwaysOnTop);
    this.#updateZoomButtons(settings.zoom);

    this.settings = settings;
  }
}
