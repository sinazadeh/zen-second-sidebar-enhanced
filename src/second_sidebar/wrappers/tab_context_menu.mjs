export class TabContextMenuWrapper {
  /**
   * The tab the tab context menu was opened on, while it's open.
   *
   * @returns {object?} a tabbrowser tab
   */
  static get contextTab() {
    return window.TabContextMenu?.contextTab ?? null;
  }
}
