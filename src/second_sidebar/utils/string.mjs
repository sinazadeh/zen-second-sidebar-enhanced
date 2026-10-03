/**
 *
 * @param {string} text
 * @param {number} limit
 * @returns {string}
 */
export function ellipsis(text, limit) {
  return text.length > limit ? text.slice(0, limit - 3) + "..." : text;
}

// A count in brackets, as sites put their unread count in the title: "(3)",
// "[5]", "(1,234)" or "(99+)".
const BRACKETED_COUNT = /(?<!\w)[([](\d{1,3}(?:,\d{3})+|\d+)(\+?)[)\]](?!\w)/g;
const YEAR = /^(19|20)\d\d$/;

/**
 * The unread count in a page title: "(3) Inbox", "[5] Feed", "Inbox (12) -
 * Gmail", "(99+) Discord". Only a number in brackets counts, so "Top 10
 * movies" has none, and neither does a year after the start of the title
 * ("Inception (2010) - IMDb"). "99+" (more than 99) counts as 100, which the
 * badge shows as 99+.
 *
 * @param {string?} text
 * @returns {number?}
 */
export function parseNotifications(text) {
  if (typeof text !== "string") return null;
  const start = text.length - text.trimStart().length;
  for (const match of text.matchAll(BRACKETED_COUNT)) {
    const [, digits, plus] = match;
    if (match.index !== start && YEAR.test(digits)) continue;
    const count = Number(digits.replaceAll(",", ""));
    return plus ? count + 1 : count;
  }
  return null;
}

/**
 *
 * @param {number} milliseconds
 * @returns {string}
 */
export function formatReloadCountdown(milliseconds) {
  const value = Number(milliseconds);
  const clampedMilliseconds = Number.isFinite(value) ? Math.max(0, value) : 0;
  const totalSeconds = Math.ceil(clampedMilliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
