// Keep this module free of browser globals: tests/spaces.test.mjs runs it in
// Node.

/**
 * Whether a web panel shows in Zen's active space.
 *
 * @param {string[]} panelSpaces the spaces the panel is limited to; none
 *   for all of them
 * @param {string?} activeSpace null without spaces (Firefox, or a window
 *   without them)
 * @param {string[]} existingSpaces every space's uuid
 * @returns {boolean}
 */
export function isWebPanelInSpace(panelSpaces, activeSpace, existingSpaces) {
  if (!activeSpace || panelSpaces.length === 0) return true;
  // If all its spaces were deleted, it shows everywhere rather than nowhere.
  if (!panelSpaces.some((uuid) => existingSpaces.includes(uuid))) return true;
  return panelSpaces.includes(activeSpace);
}
