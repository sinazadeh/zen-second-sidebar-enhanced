/**
 * @typedef {Object} ZenSpace
 * @property {string} uuid
 * @property {string} name
 */

/**
 * Zen's spaces (formerly workspaces) in this window, through its
 * gZenWorkspaces. Firefox, and Zen windows without spaces (private ones),
 * have none.
 */
export class ZenSpacesWrapper {
  static get #raw() {
    return window.gZenWorkspaces ?? null;
  }

  /**
   * @returns {boolean}
   */
  static get available() {
    try {
      return (
        this.#raw !== null &&
        !this.#raw.privateWindowOrDisabled &&
        this.getSpaces().length > 0
      );
    } catch {
      return false;
    }
  }

  /**
   * @returns {ZenSpace[]}
   */
  static getSpaces() {
    const zen = this.#raw;
    if (!zen) return [];
    try {
      const spaces = zen.getWorkspaces?.();
      if (Array.isArray(spaces)) return spaces;
      // Older Zen: getWorkspaces() is async, and its cache is { workspaces }.
      const cached = zen._workspaceCache?.workspaces;
      return Array.isArray(cached) ? cached : [];
    } catch (error) {
      console.warn("Second Sidebar: failed to read Zen's spaces", error);
      return [];
    }
  }

  /**
   * @returns {string?} the active space's uuid
   */
  static get activeSpace() {
    return this.available ? (this.#raw.activeWorkspace ?? null) : null;
  }

  /**
   * Calls `callback` once Zen has set up its spaces in this window, and
   * again after every switch, or change to the spaces (one added, renamed or
   * deleted). Does nothing without Zen.
   *
   * @param {function():void} callback
   */
  static listen(callback) {
    const zen = this.#raw;
    if (!zen) return;
    // Zen waits for its change listeners in the middle of switching spaces,
    // so one that throws would break the switch.
    const safeCallback = () => {
      try {
        callback();
      } catch (error) {
        console.error("Second Sidebar: failed to apply Zen's space", error);
      }
    };
    Promise.resolve(zen.promiseInitialized).then(safeCallback, safeCallback);
    zen.addChangeListeners?.(safeCallback);
    window.addEventListener("ZenWorkspaceDataChanged", safeCallback);
  }
}
