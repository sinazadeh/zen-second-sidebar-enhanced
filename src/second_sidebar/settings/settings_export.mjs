import { SIDEBAR_PREFS, isValidSidebarPrefValue } from "./sidebar_prefs.mjs";

import { SidebarSettings } from "./sidebar_settings.mjs";
import { WebPanelSettings } from "./web_panel_settings.mjs";
import { WebPanelsSettings } from "./web_panels_settings.mjs";

// Bump when the exported shape changes in a way old exports can't just be
// read as (a field renamed or repurposed, not just a new optional field -
// those already default fine via the settings classes' own constructors).
// 2: a web panel's `mobile` flag became `userAgent`; WebPanelSettings still
// reads `mobile` from version 1 files.
export const EXPORT_VERSION = 2;

/**
 * Builds the settings export file's contents: the sidebar settings and every
 * web panel's settings (not their per-panel state, e.g. lastUrl - see
 * .claude/skills/sb2-settings/SKILL.md on keeping those distinct).
 *
 * @param {SidebarSettings} sidebarSettings
 * @param {WebPanelsSettings} webPanelsSettings
 * @returns {object}
 */
export function buildSettingsExport(sidebarSettings, webPanelsSettings) {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    sidebarSettings: sidebarSettings.toObject(),
    webPanels: webPanelsSettings.persistentWebPanels.map((webPanel) =>
      webPanel.toObject(),
    ),
  };
}

/**
 * Validates a parsed settings export and turns it back into settings
 * objects. Throws an Error describing the first problem found, so a broken
 * or foreign file is rejected before anything is written. A setting with a
 * value of the wrong type (or one the sidebar doesn't offer) gets its
 * default instead, and is listed in `invalidSettings`.
 *
 * @param {*} data
 * @returns {{sidebarSettings: SidebarSettings, webPanelsSettings: WebPanelsSettings, invalidSettings: string[]}}
 */
export function parseSettingsExport(data) {
  if (
    !isPlainObject(data) ||
    !isPlainObject(data.sidebarSettings) ||
    !Array.isArray(data.webPanels)
  ) {
    throw new Error("file does not look like a Second Sidebar settings export");
  }
  if (typeof data.version === "number" && data.version > EXPORT_VERSION) {
    throw new Error(
      `export format version ${data.version} is newer than this version of Second Sidebar supports (${EXPORT_VERSION})`,
    );
  }

  const uuids = new Set();
  data.webPanels.forEach((webPanel, index) => {
    const name = `web panel #${index + 1}`;
    if (!isPlainObject(webPanel)) {
      throw new Error(`${name} is not an object`);
    }
    if (typeof webPanel.uuid !== "string" || !webPanel.uuid) {
      throw new Error(`${name} has no uuid`);
    }
    if (typeof webPanel.url !== "string" || !webPanel.url) {
      throw new Error(`${name} has no url`);
    }
    if (uuids.has(webPanel.uuid)) {
      throw new Error(`${name} repeats uuid ${webPanel.uuid}`);
    }
    uuids.add(webPanel.uuid);
  });

  const invalidSettings = [];
  const sidebarSettings = new SidebarSettings(
    validSidebarSettings(data.sidebarSettings, invalidSettings),
  );
  const { position } = sidebarSettings;
  const defaultFloatingOffsetCSS = `var(--space-${sidebarSettings.defaultFloatingOffset})`;
  const defaults = new WebPanelSettings(
    position,
    defaultFloatingOffsetCSS,
    "",
    "",
  );
  const webPanelsSettings = new WebPanelsSettings(
    data.webPanels.map((webPanel, index) =>
      WebPanelSettings.fromObject(
        position,
        defaultFloatingOffsetCSS,
        validWebPanelSettings(
          webPanel,
          defaults,
          `web panel #${index + 1}`,
          invalidSettings,
        ),
      ),
    ),
  );
  return { sidebarSettings, webPanelsSettings, invalidSettings };
}

/**
 * The sidebar settings in `object` the sidebar can use; the rest are listed
 * in `invalid`.
 *
 * @param {object} object
 * @param {string[]} invalid
 * @returns {object}
 */
function validSidebarSettings(object, invalid) {
  const valid = validFields(object, new SidebarSettings({}), "", invalid);
  // Those with a fixed set of values (Position, Width...) must be one of them.
  for (const entry of SIDEBAR_PREFS) {
    if (
      entry.field in valid &&
      !isValidSidebarPrefValue(entry, valid[entry.field])
    ) {
      delete valid[entry.field];
      invalid.push(entry.field);
    }
  }
  return valid;
}

/**
 * @param {object} object
 * @param {WebPanelSettings} defaults
 * @param {string} name
 * @param {string[]} invalid
 * @returns {object}
 */
function validWebPanelSettings(object, defaults, name, invalid) {
  const valid = validFields(object, defaults, `${name}: `, invalid);
  for (const key of ["floatingGeometry", "pinnedGeometry"]) {
    if (key in valid) {
      valid[key] = validFields(
        valid[key],
        defaults[key],
        `${name}: ${key}.`,
        invalid,
      );
    }
  }
  return valid;
}

/**
 * A copy of `object` without the fields whose value isn't of the type
 * `defaults` has for them, which are listed in `invalid` (with `prefix`).
 * A number saved as a string, as older versions did for some, becomes a
 * number. A null is dropped quietly, and fields `defaults` doesn't have are
 * kept for the settings class (e.g. a web panel's old `mobile`).
 *
 * @param {object} object
 * @param {object} defaults
 * @param {string} prefix
 * @param {string[]} invalid
 * @returns {object}
 */
function validFields(object, defaults, prefix, invalid) {
  const valid = { ...object };
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (!(key in valid)) continue;
    if (valid[key] === null) {
      delete valid[key];
      continue;
    }
    const value = toTypeOf(valid[key], defaultValue);
    if (value === undefined) {
      delete valid[key];
      invalid.push(`${prefix}${key}`);
    } else {
      valid[key] = value;
    }
  }
  return valid;
}

/**
 * @param {*} value
 * @param {*} defaultValue
 * @returns {*} undefined if `value` can't stand in for `defaultValue`
 */
function toTypeOf(value, defaultValue) {
  if (Array.isArray(defaultValue)) {
    // Only lists of strings so far (a web panel's spaces).
    return Array.isArray(value) &&
      value.every((item) => typeof item === "string")
      ? value
      : undefined;
  }
  switch (typeof defaultValue) {
    case "number": {
      const number =
        typeof value === "string" && value.trim() !== ""
          ? Number(value)
          : value;
      return Number.isFinite(number) ? number : undefined;
    }
    case "boolean":
    case "string":
      return typeof value === typeof defaultValue ? value : undefined;
    case "object":
      return isPlainObject(value) ? value : undefined;
    default:
      return value;
  }
}

/**
 * @param {*} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
