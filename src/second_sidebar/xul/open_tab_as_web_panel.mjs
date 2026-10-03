import { MenuItem } from "./base/menuitem.mjs";

export class OpenTabAsWebPanelMenuItem extends MenuItem {
  constructor() {
    super({ id: "context_opentabaswebpanel" });
    this.setLabel("Open Tab in Second Sidebar");
  }
}
