import { BrowserElements } from "../browser_elements.mjs";
import { PlacesUtilsWrapper } from "../wrappers/places_utils.mjs";
import { ScriptSecurityManagerWrapper } from "../wrappers/script_security_manager.mjs";
import { SearchService } from "../wrappers/search.mjs";
import { SidebarControllers } from "../sidebar_controllers.mjs";
import { SidebarElements } from "../sidebar_elements.mjs";
import { TabContextMenuWrapper } from "../wrappers/tab_context_menu.mjs";
import { canOpenTabAsWebPanel } from "../utils/tab_url.mjs";

export class ContextMenuItemsController {
  constructor() {
    if (SidebarElements.contextMenuItemsEnabled) {
      this.#setupListeners();
    }
    if (SidebarElements.bookmarkMenuItemsEnabled) {
      this.#setupBookmarkListeners();
    }
    if (SidebarElements.tabMenuItemsEnabled) {
      this.#setupTabListeners();
    }
    this.searchQuery = "";
  }

  #setupListeners() {
    BrowserElements.contentAreaContextMenu.addEventListener(
      "popupshowing",
      (event) => {
        if (event.target !== event.currentTarget) return;
        this.#onPopupShowing();
      },
    );

    SidebarElements.openLinkAsWebPanelMenuItem.addEventListener("command", () =>
      this.#openLinkAsWebPanel(),
    );

    SidebarElements.openLinkAsTempWebPanelMenuItem.addEventListener(
      "command",
      () => this.#openLinkAsWebPanel(true),
    );

    SidebarElements.searchInWebPanelMenuItem.addEventListener(
      "command",
      async () => await this.#searchInWebPanel(),
    );
  }

  #setupBookmarkListeners() {
    // Firefox's own listener (placesContextMenu.js, added when the window
    // loaded) runs first and shows the items that fit what was right-clicked.
    BrowserElements.placesContextMenu.addEventListener(
      "popupshowing",
      (event) => {
        if (event.target !== event.currentTarget) return;
        this.#onBookmarkPopupShowing();
      },
    );

    SidebarElements.openBookmarkAsWebPanelMenuItem.addEventListener(
      "command",
      () => this.#openBookmarkAsWebPanel(),
    );

    SidebarElements.openBookmarkAsTempWebPanelMenuItem.addEventListener(
      "command",
      () => this.#openBookmarkAsWebPanel(true),
    );
  }

  #setupTabListeners() {
    // Firefox's own listener (TabContextMenu) runs first and sets contextTab.
    BrowserElements.tabContextMenu.addEventListener("popupshowing", (event) => {
      if (event.target !== event.currentTarget) return;
      this.#onTabPopupShowing();
    });

    SidebarElements.openTabAsWebPanelMenuItem.addEventListener("command", () =>
      this.#openTabAsWebPanel(),
    );

    SidebarElements.openTabAsTempWebPanelMenuItem.addEventListener(
      "command",
      () => this.#openTabAsWebPanel(true),
    );
  }

  #onPopupShowing() {
    const hideLinkItems = !gContextMenu.onSaveableLink;
    SidebarElements.openLinkAsWebPanelMenuItem.toggleHidden(
      hideLinkItems ||
        !SidebarControllers.sidebarController.showOpenInSidebarItems,
    );
    SidebarElements.openLinkAsTempWebPanelMenuItem.toggleHidden(
      hideLinkItems ||
        !SidebarControllers.sidebarController.showPreviewInSidebarItems,
    );
    gContextMenu.showItem(
      "context-sep-open",
      gContextMenu.shouldShowSeparator("context-sep-open"),
    );

    this.searchQuery = gContextMenu.isTextSelected
      ? gContextMenu.selectedText.trim()
      : "";
    const hideSearchItem = this.searchQuery.length === 0;
    SidebarElements.searchInWebPanelMenuItem.toggleHidden(hideSearchItem);
    if (!hideSearchItem) {
      SidebarElements.searchInWebPanelMenuItem.setSearchQuery(this.searchQuery);
    }
  }

  #onBookmarkPopupShowing() {
    // Only ever hide: Firefox decides when the items apply at all.
    if (!SidebarControllers.sidebarController.showOpenInSidebarItems) {
      SidebarElements.openBookmarkAsWebPanelMenuItem.hide();
    }
    if (!SidebarControllers.sidebarController.showPreviewInSidebarItems) {
      SidebarElements.openBookmarkAsTempWebPanelMenuItem.hide();
    }
  }

  #onTabPopupShowing() {
    const tab = TabContextMenuWrapper.contextTab;
    // With several tabs selected, Firefox's items act on all of them; these
    // would only take the one right-clicked, so they're left out.
    const hideTabItems =
      !tab ||
      tab.multiselected ||
      !canOpenTabAsWebPanel(tab.linkedBrowser?.currentURI?.spec);
    const hideOpen =
      hideTabItems ||
      !SidebarControllers.sidebarController.showOpenInSidebarItems;
    const hidePreview =
      hideTabItems ||
      !SidebarControllers.sidebarController.showPreviewInSidebarItems;
    SidebarElements.openTabAsWebPanelMenuItem.toggleHidden(hideOpen);
    SidebarElements.openTabAsTempWebPanelMenuItem.toggleHidden(hidePreview);
    SidebarElements.tabMenuItemsSeparator.toggleHidden(hideOpen && hidePreview);
  }

  /**
   * @param {boolean} temporary
   */
  #openLinkAsWebPanel(temporary = false) {
    const url = gContextMenu.linkURL;
    SidebarControllers.webPanelNewController.createWebPanel(
      url,
      ScriptSecurityManagerWrapper.DEFAULT_USER_CONTEXT_ID,
      temporary,
    );
  }

  /**
   * @param {boolean} temporary
   */
  #openBookmarkAsWebPanel(temporary = false) {
    // The view the menu was opened on, as Firefox's own "Open..." items use.
    const node = BrowserElements.placesContextMenu.getXUL()._view?.selectedNode;
    if (!node || !PlacesUtilsWrapper.isURINode(node)) return;
    SidebarControllers.webPanelNewController.createWebPanel(
      node.uri,
      ScriptSecurityManagerWrapper.DEFAULT_USER_CONTEXT_ID,
      temporary,
    );
  }

  /**
   * Opens the right-clicked tab's page in the second sidebar, in the tab's
   * container.
   *
   * @param {boolean} temporary
   */
  #openTabAsWebPanel(temporary = false) {
    const tab = TabContextMenuWrapper.contextTab;
    const url = tab?.linkedBrowser?.currentURI?.spec;
    if (!canOpenTabAsWebPanel(url)) return;
    SidebarControllers.webPanelNewController.createWebPanel(
      url,
      tab.userContextId ?? ScriptSecurityManagerWrapper.DEFAULT_USER_CONTEXT_ID,
      temporary,
    );
  }

  async #searchInWebPanel() {
    if (!this.searchQuery) return;
    const url = await SearchService.getDefaultSubmissionUrl(this.searchQuery);
    if (url === null) return;
    SidebarControllers.webPanelNewController.createWebPanel(
      url,
      ScriptSecurityManagerWrapper.DEFAULT_USER_CONTEXT_ID,
      true,
    );
  }
}
