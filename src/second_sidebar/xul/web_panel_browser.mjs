import { AppInfoWrapper } from "../wrappers/app_info.mjs";
import { Browser } from "./base/browser.mjs";
import { resolveUserAgent } from "../utils/user_agents.mjs";

export class WebPanelBrowser extends Browser {
  /**
   *
   * @param {HTMLElement} element
   */
  constructor(element) {
    super({ element });
  }

  /**
   *
   * @param {string} userAgent an id from getUserAgentChoices()
   * @param {string} customUserAgent sent when userAgent is "custom"
   * @returns {boolean} whether the user agent changed
   */
  setUserAgent(userAgent, customUserAgent) {
    const value = resolveUserAgent(
      userAgent,
      customUserAgent,
      AppInfoWrapper.platformVersion,
    );
    const changed =
      value !== (this.element.browsingContext?.customUserAgent ?? "");
    this.setCustomUserAgent(value);
    return changed;
  }
}
