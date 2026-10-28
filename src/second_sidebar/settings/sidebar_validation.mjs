import { LINK_CLICK_MODIFIERS } from "../utils/link_click.mjs";
import { SidebarSettings } from "./sidebar_settings.mjs";

export const SIDEBAR_SIZES = [
  "xxsmall",
  "xsmall",
  "small",
  "medium",
  "large",
  "xlarge",
  "xxlarge",
];

/** Fixed choices for sidebar settings whose value is a string enum. */
export const SIDEBAR_SETTING_VALUES = {
  position: ["left", "right"],
  padding: SIDEBAR_SIZES,
  newWebPanelPosition: ["before", "after"],
  newWebPanelSpaces: ["all", "current"],
  defaultFloatingOffset: SIDEBAR_SIZES,
  containerBorder: ["off", "left", "right", "top", "bottom", "around"],
  webPanelMiddleClickAction: ["open-tab", "unload"],
  tooltip: ["off", "title", "url", "titleandurl"],
  autoHideSidebarBehavior: ["inline", "overlay"],
  autoHideOverlayGap: ["off", ...SIDEBAR_SIZES],
  linkClickModifier: LINK_CLICK_MODIFIERS,
};

const DEFAULTS = new SidebarSettings({}).toObject();

/**
 * @param {string} field
 * @param {*} value
 * @returns {boolean}
 */
export function isValidSidebarSettingValue(field, value) {
  if (!Object.hasOwn(DEFAULTS, field)) {
    return false;
  }
  if (typeof value !== typeof DEFAULTS[field]) {
    return false;
  }
  const values = SIDEBAR_SETTING_VALUES[field];
  return !values || values.includes(value);
}
