import { ContentClickPatcher } from "../patchers/content_click_patcher.mjs";
import { Logger } from "../utils/logger.mjs";
import { PlacesUtilsWrapper } from "../wrappers/places_utils.mjs";
import { ScriptSecurityManagerWrapper } from "../wrappers/script_security_manager.mjs";
import { SidebarControllers } from "../sidebar_controllers.mjs";
import { matchesLinkClickModifier } from "../utils/link_click.mjs";

/**
 * Previews a link or bookmark in a temporary web panel when it's clicked
 * with the modifier keys chosen in the sidebar settings (linkClickModifier).
 */
export class LinkClickController {
  constructor() {
    ContentClickPatcher.listen((click) => this.#onContentClick(click));
    // Bookmarks and history entries (on the bookmarks toolbar, in the
    // Bookmarks and History menus and panels) open on a command event that
    // carries the click's modifier keys. Catch it before their own handlers.
    window.addEventListener("command", (event) => this.#onCommand(event), {
      capture: true,
    });
  }

  /**
   * @param {{altKey: boolean, shiftKey: boolean, ctrlKey: boolean, metaKey: boolean}} event
   * @returns {boolean}
   */
  #matchesModifier(event) {
    return matchesLinkClickModifier(
      event,
      SidebarControllers.sidebarController.linkClickModifier,
    );
  }

  /**
   * A click on a link in one of this window's tabs, before Firefox acts on
   * it (see content_click_hook.sys.mjs).
   *
   * @param {object} click
   * @returns {boolean} whether the click was taken
   */
  #onContentClick(click) {
    if (click.button !== 0 || !click.href || !this.#matchesModifier(click)) {
      return false;
    }
    // Keep the clicked page's container.
    this.#preview(
      click.href,
      click.originAttributes?.userContextId ??
        ScriptSecurityManagerWrapper.DEFAULT_USER_CONTEXT_ID,
    );
    return true;
  }

  /**
   * @param {XULCommandEvent} event
   */
  #onCommand(event) {
    const target = event.originalTarget;
    const node = target?._placesNode;
    if (
      !node ||
      !PlacesUtilsWrapper.isURINode(node) ||
      !this.#matchesModifier(event)
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    // Menus close by themselves, panels (e.g. the Library button's
    // bookmarks and history) don't.
    target.closest("panel")?.hidePopup();
    this.#preview(
      node.uri,
      ScriptSecurityManagerWrapper.DEFAULT_USER_CONTEXT_ID,
    );
  }

  /**
   * @param {string} url
   * @param {number} userContextId
   */
  #preview(url, userContextId) {
    Logger.debug("Previewing clicked link in a web panel:", url);
    SidebarControllers.webPanelNewController.createWebPanel(
      url,
      userContextId,
      true,
    );
  }
}
