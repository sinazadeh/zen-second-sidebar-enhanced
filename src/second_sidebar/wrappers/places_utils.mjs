export class PlacesUtilsWrapper {
  /**
   * Whether a bookmarks/history view's node is a page (a bookmark or a
   * history entry), rather than a folder, query or separator.
   *
   * @param {object} node An nsINavHistoryResultNode.
   * @returns {boolean}
   */
  static isURINode(node) {
    return PlacesUtils.nodeIsURI(node);
  }
}
