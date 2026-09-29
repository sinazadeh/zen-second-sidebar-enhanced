/**
 * @typedef {Object} QueryInterface
 */

export class ChromeUtilsWrapper {
  /**
   *
   * @param {Array<string>} interfaces
   * @returns {QueryInterface}
   */
  static generateQI(interfaces) {
    return ChromeUtils.generateQI(interfaces);
  }

  /**
   * Imports a module into the shared system global: one copy for the whole
   * browser, unlike import(), which gives each window its own.
   *
   * @param {string} url
   * @returns {object} the module namespace
   */
  static importESModule(url) {
    return ChromeUtils.importESModule(url);
  }
}
