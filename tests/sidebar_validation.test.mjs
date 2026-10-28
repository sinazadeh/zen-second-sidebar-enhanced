import "./gecko_stubs.mjs";

import assert from "node:assert/strict";
import { test } from "node:test";

const { SidebarSettings } =
  await import("../src/second_sidebar/settings/sidebar_settings.mjs");
const { SIDEBAR_SETTING_VALUES, isValidSidebarSettingValue } =
  await import("../src/second_sidebar/settings/sidebar_validation.mjs");

test("every non-shortcut string setting with fixed choices declares them", () => {
  const settings = new SidebarSettings({});
  for (const [field, value] of Object.entries(settings)) {
    if (typeof value === "string" && !field.endsWith("Shortcut")) {
      assert.ok(SIDEBAR_SETTING_VALUES[field], field);
    }
  }
});

test("sidebar setting validation checks fields, types and fixed choices", () => {
  assert.ok(isValidSidebarSettingValue("position", "left"));
  assert.ok(!isValidSidebarSettingValue("position", "middle"));
  assert.ok(isValidSidebarSettingValue("autoHideSidebar", false));
  assert.ok(!isValidSidebarSettingValue("autoHideSidebar", "false"));
  assert.ok(isValidSidebarSettingValue("sidebarWidgetShortcut", "Ctrl+KeyB"));
  assert.ok(!isValidSidebarSettingValue("notASetting", true));
});
