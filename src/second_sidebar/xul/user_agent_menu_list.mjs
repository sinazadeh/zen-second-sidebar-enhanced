import {
  CUSTOM_USER_AGENT,
  DEFAULT_USER_AGENT,
  getUserAgentChoices,
  resolveUserAgent,
} from "../utils/user_agents.mjs";

import { AppInfoWrapper } from "../wrappers/app_info.mjs";
import { MenuList } from "./base/menulist.mjs";

/**
 * A web panel's "User Agent" choice: Default, the presets, then Custom.
 */
export class UserAgentMenuList extends MenuList {
  /**
   *
   * @param {object} params
   * @param {string?} params.id
   */
  constructor({ id = null } = {}) {
    super({ id, classList: ["sb2-popup-menu-list"] });
    this.fill();
  }

  /**
   *
   * @param {object} params
   * @param {boolean} params.custom whether to offer "Custom"
   * @returns {UserAgentMenuList}
   */
  fill({ custom = true } = {}) {
    this.removeAllItems();
    for (const { id, label } of getUserAgentChoices()) {
      if (id === CUSTOM_USER_AGENT) {
        if (!custom) continue;
        this.appendSeparator();
      }
      this.appendItem(label, id);
      if (id !== DEFAULT_USER_AGENT && id !== CUSTOM_USER_AGENT) {
        // Shows what the preset sends.
        this.getLastMenuItemXUL().setAttribute(
          "tooltiptext",
          resolveUserAgent(id, "", AppInfoWrapper.platformVersion),
        );
      }
    }
    return this;
  }
}
