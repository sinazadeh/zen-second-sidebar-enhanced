import { ChromeUtilsWrapper } from "../wrappers/chrome_utils.mjs";
import { reportUnappliedPatches } from "./source_patches.mjs";

// Resolved from this module's own URL, like the addon's other files, so it
// loads under any script loader.
const HOOK_URL = new URL("./content_click_hook.sys.mjs", import.meta.url).href;

export class ContentClickPatcher {
  /**
   * Calls `handler` with every click on a link in this window's tabs,
   * before Firefox acts on it (see content_click_hook.sys.mjs). When it
   * returns true, Firefox leaves the click alone.
   *
   * @param {function(object):boolean} handler
   */
  static listen(handler) {
    let hook;
    try {
      hook = ChromeUtilsWrapper.importESModule(HOOK_URL);
    } catch (error) {
      console.error(
        "Second Sidebar: failed to load the link click hook",
        error,
      );
      return;
    }
    if (!hook.addContentClickHandler(window, handler)) {
      reportUnappliedPatches("ClickHandlerParent.sys.mjs", [
        "take modifier-clicks on links",
      ]);
      return;
    }
    // The hook is shared by every window: drop this one's handler with it.
    window.addEventListener(
      "unload",
      () => hook.removeContentClickHandler(window),
      { once: true },
    );
  }
}
