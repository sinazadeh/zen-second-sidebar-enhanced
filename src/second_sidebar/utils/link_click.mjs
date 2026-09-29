// Which modifier-click previews a link (or a bookmark) in the second sidebar.
// "altshift" is the default because it's free in both browsers: Firefox
// opens Shift+clicked links in a new window only after this addon has had a
// chance to take the click, and Zen Glance ignores clicks with more than one
// modifier. A plain Alt+click is free in Firefox but is Glance's default
// trigger in Zen, which takes it before this addon sees it.
//
// Keep this module free of browser globals: settings/sidebar_prefs.mjs
// imports it, and tests run both in Node.

export const LINK_CLICK_MODIFIERS = ["off", "altshift", "alt"];

/**
 * @param {{altKey: boolean, shiftKey: boolean, ctrlKey: boolean, metaKey: boolean}} event
 *   A click event, or anything carrying its modifier keys (the click data
 *   Firefox sends from the page, a command event).
 * @param {string} modifier One of LINK_CLICK_MODIFIERS.
 * @returns {boolean}
 */
export function matchesLinkClickModifier(event, modifier) {
  if (!event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }
  switch (modifier) {
    case "altshift":
      return event.shiftKey;
    case "alt":
      return !event.shiftKey;
    default:
      return false;
  }
}
