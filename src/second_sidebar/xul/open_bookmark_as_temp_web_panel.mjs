import { MenuItem } from "./base/menuitem.mjs";

export class OpenBookmarkAsTempWebPanelMenuItem extends MenuItem {
  constructor() {
    super({ id: "placesContext_openastempwebpanel" });
    this.setLabel("Preview in Second Sidebar");
    // See OpenBookmarkAsWebPanelMenuItem.
    this.setAttribute("selection-type", "single");
    this.setAttribute("node-type", "link");
  }
}
