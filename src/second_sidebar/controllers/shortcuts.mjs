import { BrowserElements } from "../browser_elements.mjs";
import { SidebarControllers } from "../sidebar_controllers.mjs";
import { getLayoutIndependentKey } from "../utils/keyboard.mjs";

export class Shortcuts {
  constructor() {
    this.enabled = true;
    this.onKeypress = this.#onKeypress.bind(this);
    this.#setupListeners();
  }

  #setupListeners() {
    BrowserElements.root.addEventListener("keypress", this.onKeypress);
    SidebarControllers.webPanelsController.addKeypressListener(this.onKeypress);
  }

  /**
   * @param {KeyboardEvent} event
   */
  #onKeypress(event) {
    if (!this.enabled) return;
    if (this.trySidebarWidgetShortcut(event)) return;
    if (this.tryLastWebPanelShortcut(event)) return;
    if (this.tryAdjacentWebPanelShortcuts(event)) return;
    this.tryWebPanelShortcuts(event);
  }

  /**
   *
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  tryAdjacentWebPanelShortcuts(event) {
    const { nextWebPanelShortcut, previousWebPanelShortcut } =
      SidebarControllers.sidebarController;
    for (const [shortcut, step] of [
      [nextWebPanelShortcut, 1],
      [previousWebPanelShortcut, -1],
    ]) {
      if (this.isShortcutPressed(shortcut, event)) {
        event.preventDefault();
        SidebarControllers.webPanelsController.switchAdjacentWebPanel(step);
        return true;
      }
    }
    return false;
  }

  /**
   *
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  tryLastWebPanelShortcut(event) {
    const shortcut = SidebarControllers.sidebarController.lastWebPanelShortcut;
    if (shortcut.length === 0) return false;

    if (this.isShortcutPressed(shortcut, event)) {
      event.preventDefault();
      SidebarControllers.webPanelsController.switchLastWebPanel();
      return true;
    }
    return false;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  /**
   *
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  trySidebarWidgetShortcut(event) {
    const shortcut = SidebarControllers.sidebarController.sidebarWidgetShortcut;
    if (shortcut.length === 0) return false;

    if (this.isShortcutPressed(shortcut, event)) {
      event.preventDefault();
      SidebarControllers.sidebarMainCollapser.onSidebarCollapseButtonClick();
      return true;
    }
    return false;
  }

  /**
   *
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  tryWebPanelShortcuts(event) {
    const webPanelControllers = SidebarControllers.webPanelsController.getAll();
    for (const webPanelController of webPanelControllers) {
      const shortcut = webPanelController.getShortcut();
      if (shortcut.length === 0) continue;

      if (this.isShortcutPressed(shortcut, event)) {
        event.preventDefault();
        webPanelController.switchWebPanel();
        return true;
      }
    }
    return false;
  }

  /**
   *
   * @param {string} shortcut
   * @param {KeyboardEvent?} event
   * @returns {boolean}
   */
  isSidebarWidgetShortcutBusy(shortcut, event = null) {
    return this.#isShortcutTaken("sidebarWidget", shortcut, event);
  }

  /**
   *
   * @param {string} shortcut
   * @param {KeyboardEvent?} event
   * @returns {boolean}
   */
  isLastWebPanelShortcutBusy(shortcut, event = null) {
    return this.#isShortcutTaken("lastWebPanel", shortcut, event);
  }

  /**
   *
   * @param {string} shortcut
   * @param {KeyboardEvent?} event
   * @returns {boolean}
   */
  isNextWebPanelShortcutBusy(shortcut, event = null) {
    return this.#isShortcutTaken("nextWebPanel", shortcut, event);
  }

  /**
   *
   * @param {string} shortcut
   * @param {KeyboardEvent?} event
   * @returns {boolean}
   */
  isPreviousWebPanelShortcutBusy(shortcut, event = null) {
    return this.#isShortcutTaken("previousWebPanel", shortcut, event);
  }

  /**
   *
   * @param {string} uuid
   * @param {string} shortcut
   * @param {KeyboardEvent?} event
   * @returns {boolean}
   */
  isWebPanelShortcutBusy(uuid, shortcut, event = null) {
    return this.#isShortcutTaken(uuid, shortcut, event);
  }

  /**
   * Whether `shortcut` is assigned to anything but `owner`: a web panel's
   * uuid, or the name of a sidebar action in #getSidebarShortcuts().
   *
   * @param {string} owner
   * @param {string} shortcut
   * @param {KeyboardEvent?} event
   * @returns {boolean}
   */
  #isShortcutTaken(owner, shortcut, event) {
    const webPanelControllers = SidebarControllers.webPanelsController.getAll();
    return (
      webPanelControllers.some(
        (webPanelController) =>
          webPanelController.getUUID() !== owner &&
          this.#isShortcutBusy(
            webPanelController.getShortcut(),
            shortcut,
            event,
          ),
      ) ||
      Object.entries(this.#getSidebarShortcuts()).some(
        ([name, assignedShortcut]) =>
          name !== owner &&
          this.#isShortcutBusy(assignedShortcut, shortcut, event),
      )
    );
  }

  /**
   * @returns {Object<string, string>} the sidebar's own shortcuts, by action
   */
  #getSidebarShortcuts() {
    const sidebarController = SidebarControllers.sidebarController;
    return {
      sidebarWidget: sidebarController.sidebarWidgetShortcut,
      lastWebPanel: sidebarController.lastWebPanelShortcut,
      nextWebPanel: sidebarController.nextWebPanelShortcut,
      previousWebPanel: sidebarController.previousWebPanelShortcut,
    };
  }

  /**
   *
   * @param {string} assignedShortcut
   * @param {string} shortcut
   * @param {KeyboardEvent?} event
   * @returns {boolean}
   */
  #isShortcutBusy(assignedShortcut, shortcut, event) {
    return (
      assignedShortcut === shortcut ||
      (event !== null && this.isShortcutPressed(assignedShortcut, event))
    );
  }

  /**
   *
   * @param {string} shortcut
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  isShortcutPressed(shortcut, event) {
    if (shortcut.length === 0) return false;
    const shortcutParts = this.getShortcutPartsFromShortcut(shortcut);
    const eventParts = this.getShortcutPartsFromEvent(event);
    const layoutDependentEventParts =
      this.#getLayoutDependentShortcutPartsFromEvent(event);
    return (
      this.isEqual(shortcutParts, eventParts) ||
      this.isEqual(shortcutParts, layoutDependentEventParts)
    );
  }

  /**
   *
   * @param {KeyboardEvent} event
   * @returns {string[]}
   */
  getShortcutPartsFromEvent(event) {
    const parts = [];
    if (event.altKey) parts.push("Alt");
    if (event.ctrlKey) parts.push("Ctrl");
    if (event.metaKey) parts.push("Meta");
    if (event.shiftKey) parts.push("Shift");
    parts.push(getLayoutIndependentKey(event));
    return parts;
  }

  /**
   * Keeps shortcuts saved with a layout-dependent key working in that layout.
   *
   * @param {KeyboardEvent} event
   * @returns {string[]}
   */
  #getLayoutDependentShortcutPartsFromEvent(event) {
    const parts = this.getShortcutPartsFromEvent(event);
    parts[parts.length - 1] = event.key.toUpperCase();
    return parts;
  }

  /**
   *
   * @param {string} shortcut
   * @returns {string[]}
   */
  getShortcutPartsFromShortcut(shortcut) {
    const parts = shortcut.split("+");
    // "+" is both the separator and a valid key label.
    const lastIndex = parts.length - 1;
    if (parts[lastIndex] === "" && parts[lastIndex - 1] === "") {
      parts.splice(-2, 2, "+");
    }
    return parts;
  }

  /**
   *
   * @param {string[]} lhs
   * @param {string[]} rhs
   * @returns {boolean}
   */
  isEqual(lhs, rhs) {
    return JSON.stringify([...lhs].sort()) === JSON.stringify([...rhs].sort());
  }
}
