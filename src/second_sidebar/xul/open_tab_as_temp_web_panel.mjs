import { MenuItem } from "./base/menuitem.mjs";

export class OpenTabAsTempWebPanelMenuItem extends MenuItem {
  constructor() {
    super({ id: "context_opentabastempwebpanel" });
    this.setLabel("Preview Tab in Second Sidebar");
  }
}
