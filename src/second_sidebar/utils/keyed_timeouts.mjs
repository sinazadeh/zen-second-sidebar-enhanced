/**
 * Debounce timers kept apart by key (e.g. a web panel's uuid), so restarting
 * one key's timer doesn't cancel another key's pending callback.
 */
export class KeyedTimeouts {
  /** @type {Map<string, number>} */
  #timeouts = new Map();

  /**
   * Runs `callback` after `delay` ms unless `set` or `clear` is called for
   * the same key first.
   *
   * @param {string} key
   * @param {function():void} callback
   * @param {number} delay
   */
  set(key, callback, delay) {
    this.clear(key);
    const timeout = setTimeout(() => {
      this.#timeouts.delete(key);
      callback();
    }, delay);
    this.#timeouts.set(key, timeout);
  }

  /**
   * @param {string} key
   */
  clear(key) {
    clearTimeout(this.#timeouts.get(key));
    this.#timeouts.delete(key);
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.#timeouts.has(key);
  }
}
