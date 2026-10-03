// Keep this module free of browser globals: tests/tab_url.test.mjs runs it in
// Node.

const SCHEMES = new Set([
  "http:",
  "https:",
  "file:",
  "moz-extension:",
  "about:",
]);
// A tab's empty states, rather than a page worth keeping in a panel.
const EMPTY_PAGES = new Set([
  "about:blank",
  "about:home",
  "about:newtab",
  "about:privatebrowsing",
]);

/**
 * Whether the tab context menu offers to open a tab showing `url` in the
 * second sidebar.
 *
 * @param {string?} url
 * @returns {boolean}
 */
export function canOpenTabAsWebPanel(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    SCHEMES.has(parsed.protocol) &&
    !EMPTY_PAGES.has(`${parsed.protocol}${parsed.pathname}`)
  );
}
