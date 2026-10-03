// Keep this module free of browser globals: tests/cycle.test.mjs runs it in
// Node.

/**
 * The index one `step` away from `index` in a list of `length` items,
 * wrapping around at either end. With nothing at `index` (-1), stepping
 * forward starts at the first item and stepping back at the last.
 *
 * @param {number} index
 * @param {number} length
 * @param {number} step 1 or -1
 * @returns {number?} null for an empty list
 */
export function getAdjacentIndex(index, length, step) {
  if (length <= 0) return null;
  if (index < 0 || index >= length) return step > 0 ? 0 : length - 1;
  return (((index + step) % length) + length) % length;
}
