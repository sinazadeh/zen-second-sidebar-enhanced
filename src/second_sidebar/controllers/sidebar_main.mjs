import { WebPanelEvents, sendEvents } from "./events.mjs";

import { BrowserElements } from "../browser_elements.mjs";
import { CustomizableUIWrapper } from "../wrappers/customizable_ui.mjs";
import { ScriptSecurityManagerWrapper } from "../wrappers/script_security_manager.mjs";
import { SidebarControllers } from "../sidebar_controllers.mjs";
import { SidebarElements } from "../sidebar_elements.mjs";
import { SidebarMainPatcher } from "../patchers/sidebar_main_patcher.mjs";
import { XULElement } from "../xul/base/xul_element.mjs";
import { gCustomizeModeWrapper } from "../wrappers/g_customize_mode.mjs";
import { gNavToolboxWrapper } from "../wrappers/g_nav_toolbox.mjs";

// The data a web panel button carries while it's dragged: its widget id.
const WEB_PANEL_DRAG_TYPE = "application/x-sb2-web-panel";

export class SidebarMainController {
  constructor() {
    this.root = new XULElement({ element: document.documentElement });
    this.collapseTransitionEndListener = null;
    this.dropIndicator = null;
    SidebarMainPatcher.patch();
    this.#setupListeners();
    this.#setupReordering();
  }

  /**
   * Web panel buttons can be dragged to a new place in the sidebar, as tabs
   * can. The order is CustomizableUI's (Customize Toolbar... edits the same
   * one), so it's saved and every window follows. In Customize mode, its own
   * dragging takes over.
   */
  #setupReordering() {
    const main = SidebarElements.sidebarMain;
    main.addEventListener("dragstart", (event) => {
      const item = this.#itemOf(event.target);
      if (
        document.documentElement.hasAttribute("customizing") ||
        !item?.classList.contains("sb2-main-web-panel-button")
      ) {
        return;
      }
      event.dataTransfer.setData(WEB_PANEL_DRAG_TYPE, item.id);
      event.dataTransfer.effectAllowed = "move";
    });
    main.addEventListener("dragover", (event) => {
      if (!event.dataTransfer.types.includes(WEB_PANEL_DRAG_TYPE)) return;
      event.dataTransfer.dropEffect = "move";
      this.#showDropIndicator(this.#dropTargetOf(event));
    });
    main.addEventListener("dragleave", (event) => {
      // Left the sidebar, not just one of its buttons.
      if (!main.getXUL().contains(event.relatedTarget)) {
        this.#showDropIndicator(null);
      }
    });
    main.addEventListener("dragend", () => this.#showDropIndicator(null));
    main.addEventListener("drop", (event) => {
      const id = event.dataTransfer.getData(WEB_PANEL_DRAG_TYPE);
      const target = id ? this.#dropTargetOf(event) : null;
      this.#showDropIndicator(null);
      if (!target || target.item.id === id) return;
      const area = main.getXUL().id;
      const from = CustomizableUIWrapper.getPlacementOfWidget(id);
      const to = CustomizableUIWrapper.getPlacementOfWidget(target.item.id);
      if (from?.area !== area || to?.area !== area) return;
      CustomizableUIWrapper.moveWidgetWithinArea(
        id,
        to.position + (target.before ? 0 : 1),
      );
    });
  }

  /**
   * The sidebar item (a widget's node) an event happened in.
   *
   * @param {EventTarget} target
   * @returns {Element?}
   */
  #itemOf(target) {
    const main = SidebarElements.sidebarMain.getXUL();
    let node = target instanceof Element ? target : null;
    while (node && node.parentElement !== main) {
      node = node.parentElement;
    }
    return node?.id ? node : null;
  }

  /**
   * Where a dragged button would go: before the first item whose middle is
   * below the pointer, or after the last one. Hidden buttons (other Zen
   * spaces) don't count.
   *
   * @param {DragEvent} event
   * @returns {{item: Element, before: boolean}?}
   */
  #dropTargetOf(event) {
    const main = SidebarElements.sidebarMain.getXUL();
    const items = Array.from(main.children).filter(
      (node) => node.id && node.getBoundingClientRect().height > 0,
    );
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        return { item, before: true };
      }
    }
    return items.length ? { item: items.at(-1), before: false } : null;
  }

  /**
   * @param {{item: Element, before: boolean}?} target
   */
  #showDropIndicator(target) {
    this.dropIndicator?.removeAttribute("sb2-drop");
    this.dropIndicator = target?.item ?? null;
    target?.item.setAttribute("sb2-drop", target.before ? "before" : "after");
  }

  #setupListeners() {
    SidebarElements.sidebarMainMenuPopup.listenPopupShowing(() => {
      const loaded = SidebarControllers.webPanelsController
        .getAll()
        .filter((webPanelController) => !webPanelController.isUnloaded());
      SidebarElements.sidebarMainMenuPopup.updateMuteAllItem(
        loaded.length === 0
          ? null
          : loaded.every((webPanelController) => webPanelController.isMuted()),
      );
    });

    SidebarElements.sidebarMainMenuPopup.listenMuteAllItemClick((muted) => {
      sendEvents(WebPanelEvents.MUTE_ALL_WEB_PANELS, { muted });
    });

    SidebarElements.sidebarMainMenuPopup.listenCustomizeItemClick(() => {
      gCustomizeModeWrapper.enter();
    });

    gNavToolboxWrapper.addEventListener("customizationready", () => {
      SidebarControllers.sidebarController.close();
      BrowserElements.tabbrowserTabbox.appendChild(
        BrowserElements.customizationContainer,
      );
    });

    gNavToolboxWrapper.addEventListener("aftercustomization", () => {
      const springs = document.querySelectorAll("#sb2-main toolbarspring");
      for (const spring of springs) {
        spring.removeAttribute("context");
      }
      // Customizing can rebuild buttons, losing the ones hidden for Zen spaces.
      SidebarControllers.webPanelsController.applySpaces();
    });

    SidebarElements.sidebarMain.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    SidebarElements.sidebarMain.addEventListener("dragleave", (event) => {
      event.preventDefault();
    });

    SidebarElements.sidebarMain.addEventListener("drop", (event) => {
      event.preventDefault();
      const url =
        event.dataTransfer.getData("URL") ||
        event.dataTransfer.getData("text/uri-list");
      if (!url) return;
      SidebarControllers.webPanelNewController.createWebPanel(
        url,
        ScriptSecurityManagerWrapper.DEFAULT_USER_CONTEXT_ID,
        true,
      );
    });
  }

  /**
   *
   * @returns {string}
   */
  getPadding() {
    const value = this.root.getProperty("--sb2-main-padding");
    return value.match(/var\(--space-([^)]+)\)/)[1];
  }

  /**
   *
   * @param {string} value
   */
  setPadding(value) {
    this.root.setProperty("--sb2-main-padding", `var(--space-${value})`);
  }

  /**
   *
   * @returns {boolean}
   */
  collapsed() {
    const zeros = ["0px", ""];
    const marginRight = SidebarElements.sidebarMain.getProperty("margin-right");
    const marginLeft = SidebarElements.sidebarMain.getProperty("margin-left");
    return !zeros.includes(marginRight) || !zeros.includes(marginLeft);
  }

  /**
   * @param {object} params
   * @param {boolean} params.animated
   */
  collapse({ animated = false } = {}) {
    const position = SidebarElements.sidebarWrapper.getPosition();
    const marginProperty =
      position === "right" ? "margin-right" : "margin-left";
    // A zero-width flex item still leaves #browser's Nova gap behind.
    const browserGap = Number.parseFloat(
      getComputedStyle(BrowserElements.browser.getXUL()).columnGap,
    );
    const collapseOffset =
      SidebarElements.sidebarMain.getBoundingClientRect().width +
      (Number.isFinite(browserGap) ? browserGap : 0);
    this.#clearCollapseTransitionEndListener();
    if (animated) {
      this.collapseTransitionEndListener = (event) => {
        if (
          event.target !== SidebarElements.sidebarMain.getXUL() ||
          event.propertyName !== marginProperty
        ) {
          return;
        }
        this.#clearCollapseTransitionEndListener();
        SidebarElements.sidebarMain.setAttribute("sb2-collapsed", true);
      };
      SidebarElements.sidebarMain.addEventListener(
        "transitionend",
        this.collapseTransitionEndListener,
      );
    } else {
      SidebarElements.sidebarMain.setAttribute("sb2-collapsed", true);
    }
    SidebarElements.sidebarMain.setProperty(
      marginProperty,
      -collapseOffset + "px",
    );
    SidebarElements.sidebarCollapseButton.setOpen(false);
  }

  uncollapse() {
    this.#clearCollapseTransitionEndListener();
    SidebarElements.sidebarMain.removeAttribute("sb2-collapsed");
    SidebarElements.sidebarMain.removeProperty("margin-right");
    SidebarElements.sidebarMain.removeProperty("margin-left");
    SidebarElements.sidebarCollapseButton.setOpen(true);
  }

  #clearCollapseTransitionEndListener() {
    if (!this.collapseTransitionEndListener) {
      return;
    }
    SidebarElements.sidebarMain.removeEventListener(
      "transitionend",
      this.collapseTransitionEndListener,
    );
    this.collapseTransitionEndListener = null;
  }
}
