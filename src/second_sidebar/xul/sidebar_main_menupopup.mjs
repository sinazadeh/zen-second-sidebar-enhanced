import { MenuItem } from "./base/menuitem.mjs";
import { MenuPopup } from "./base/menupopup.mjs";
import { MenuSeparator } from "./base/menuseparator.mjs";

export class SidebarMainMenuPopup extends MenuPopup {
  constructor() {
    super({
      id: "sb2-main-menupopup",
      classList: ["sb2-menupopup"],
    });

    this.settingsItem = new MenuItem().setLabel("Sidebar settings");
    this.muteAllItem = new MenuItem();
    /** @type {boolean} */
    this.allMuted = false;
    this.customizeItem = new MenuItem().setLabel("Customize Toolbar...");
    this.#compose();
  }

  #compose() {
    this.appendChildren(
      this.settingsItem,
      this.muteAllItem,
      new MenuSeparator(),
      this.customizeItem,
    );
  }

  /**
   *
   * @param {function():void} callback
   */
  listenPopupShowing(callback) {
    this.addEventListener("popupshowing", (event) => {
      if (event.target === this.getXUL()) {
        callback();
      }
    });
  }

  /**
   * @param {boolean?} allMuted whether every loaded web panel is muted;
   *   null, which hides the item, when none is loaded
   */
  updateMuteAllItem(allMuted) {
    this.allMuted = allMuted === true;
    this.muteAllItem
      .setLabel(`${this.allMuted ? "Unmute" : "Mute"} all web panels`)
      .toggleHidden(allMuted === null);
  }

  /**
   * @param {function(boolean):void} callback gets whether to mute
   */
  listenMuteAllItemClick(callback) {
    this.muteAllItem.addEventListener("command", () => {
      callback(!this.allMuted);
    });
  }

  /**
   *
   * @param {function(MouseEvent):void} callback
   */
  listenSettingsItemClick(callback) {
    this.settingsItem.addEventListener("command", () => {
      callback();
    });
  }

  /**
   *
   * @param {function(MouseEvent):void} callback
   */
  listenCustomizeItemClick(callback) {
    this.customizeItem.addEventListener("command", (event) => {
      callback(event);
    });
  }
}
