import { MenuItem } from "./base/menuitem.mjs";

export class OpenBookmarkAsWebPanelMenuItem extends MenuItem {
  constructor() {
    super({ id: "placesContext_openaswebpanel" });
    this.setLabel("Open in Second Sidebar");
    // Firefox's places controller shows items with these attributes only
    // for a single bookmark or history entry (not a folder or separator).
    this.setAttribute("selection-type", "single");
    this.setAttribute("node-type", "link");
  }
}
