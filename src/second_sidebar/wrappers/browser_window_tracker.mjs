import { WindowWrapper } from "./window.mjs"; // eslint-disable-line no-unused-vars

export class BrowserWindowTrackerWrapper {
  static get raw() {
    return ChromeUtils.importESModule(
      "resource:///modules/BrowserWindowTracker.sys.mjs",
    ).BrowserWindowTracker;
  }

  /**
   * Stops Firefox from counting `window` among the browser windows it picks
   * from for links opened by other apps, restored tabs and the like.
   *
   * @param {WindowWrapper} window
   * @returns {boolean} false if this Firefox version has no way to do it
   */
  static untrack(window) {
    const tracker = this.raw;
    if (typeof tracker.untrackForTestsOnly !== "function") {
      return false;
    }
    tracker.untrackForTestsOnly(window.raw);
    return true;
  }
}
