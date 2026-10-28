import "./gecko_stubs.mjs";

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const { SETTINGS_PAGE_SECTIONS, SETTINGS_PAGE_SHORTCUTS } =
  await import("../src/second_sidebar/settings_page/layout.mjs");
const { SidebarSettings } =
  await import("../src/second_sidebar/settings/sidebar_settings.mjs");
const { SIDEBAR_FIELD_EVENTS } =
  await import("../src/second_sidebar/controllers/sidebar_fields.mjs");
const { SIDEBAR_SETTING_VALUES } =
  await import("../src/second_sidebar/settings/sidebar_validation.mjs");

const PAGE_DIR = new URL(
  "../src/second_sidebar/settings_page/",
  import.meta.url,
);
const theme = JSON.parse(
  await readFile(new URL("../theme.json", import.meta.url), "utf8"),
);
const controls = SETTINGS_PAGE_SECTIONS.flatMap((section) => section.controls);

test("the settings page has one control per non-shortcut sidebar setting", () => {
  const fields = Object.keys(new SidebarSettings({})).filter(
    (field) => !field.endsWith("Shortcut"),
  );
  assert.deepEqual(
    controls.map((control) => control.field).sort(),
    fields.sort(),
  );
});

test("each control offers exactly the values its setting accepts", () => {
  for (const control of controls) {
    const values = SIDEBAR_SETTING_VALUES[control.field];
    if (values) {
      assert.deepEqual(
        control.choices?.map(([value]) => value),
        values,
        control.field,
      );
      for (const [value, label] of control.choices) {
        assert.ok(label, `${control.field}: ${value} needs a label`);
      }
    } else {
      assert.equal(control.choices, undefined, `${control.field} is a switch`);
    }
  }
});

test("every section and control has a title and a description", () => {
  for (const section of SETTINGS_PAGE_SECTIONS) {
    assert.ok(section.title);
    assert.ok(section.controls.length, section.title);
  }
  for (const control of controls) {
    assert.ok(control.title, control.field);
    assert.ok(control.text, control.field);
  }
});

test("the settings page and the files it loads exist", async () => {
  const html = await readFile(new URL("settings.html", PAGE_DIR), "utf8");
  for (const file of ["settings.mjs", "settings.css"]) {
    assert.ok(html.includes(`"${file}"`), file);
    await access(new URL(file, PAGE_DIR));
  }
  // controllers/settings_page.mjs opens it from next to itself.
  const controller = await readFile(
    new URL(
      "../src/second_sidebar/controllers/settings_page.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(controller, /"\.\.\/settings_page\/settings\.html"/);
});

test("the settings page edits SidebarSettings through the browser API", async () => {
  const [pageScript, controller] = await Promise.all([
    readFile(new URL("settings.mjs", PAGE_DIR), "utf8"),
    readFile(
      new URL(
        "../src/second_sidebar/controllers/settings_page.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  assert.doesNotMatch(pageScript, /Services\.prefs/);
  assert.match(pageScript, /sidebar\(\)\?\.setSetting\(field, value\)/);
  assert.match(controller, /setSetting\(field, value\)/);
  assert.match(controller, /isValidSidebarSettingValue\(field, value\)/);
  assert.match(controller, /\.sineItemConfigureButton/);
  assert.match(controller, /event\.stopImmediatePropagation\(\)/);
});

test("the settings page links to the project and its configured sponsor", async () => {
  const [html, pageScript, controller] = await Promise.all([
    readFile(new URL("settings.html", PAGE_DIR), "utf8"),
    readFile(new URL("settings.mjs", PAGE_DIR), "utf8"),
    readFile(
      new URL(
        "../src/second_sidebar/controllers/settings_page.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  assert.match(html, new RegExp(`href="${theme.homepage}"`));
  assert.match(html, /href="https:\/\/github\.com\/sponsors\/sinazadeh"/);
  assert.equal((html.match(/rel="noopener noreferrer"/g) ?? []).length, 2);
  assert.match(pageScript, /sidebar\(\)\?\.openSupportPage\(link\.href\)/);
  assert.match(controller, /!SUPPORT_URLS\.has\(url\)/);
  assert.match(controller, /browserWindow\.openTrustedLinkIn\(url, "tab"/);
});

test("the settings page recommends clearing the startup cache after updates", async () => {
  const [html, css, controller] = await Promise.all([
    readFile(new URL("settings.html", PAGE_DIR), "utf8"),
    readFile(new URL("settings.css", PAGE_DIR), "utf8"),
    readFile(
      new URL(
        "../src/second_sidebar/controllers/settings_page.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);
  assert.match(
    html,
    /class="startup-cache-note"[\s\S]*clear the startup cache after each update/,
  );
  assert.match(html, /href="about:support"/);
  assert.match(controller, /SUPPORT_URLS = new Set\(\[\s*"about:support"/);
  assert.match(css, /\.intro \.startup-cache-note[\s\S]*--warning-text/);
});

test("the shortcuts card has each of the sidebar's keyboard shortcuts", () => {
  const fields = SETTINGS_PAGE_SHORTCUTS.map((shortcut) => shortcut.field);
  assert.deepEqual(
    [...fields].sort(),
    Object.keys(new SidebarSettings({}))
      .filter((field) => field.endsWith("Shortcut"))
      .sort(),
  );
  for (const shortcut of SETTINGS_PAGE_SHORTCUTS) {
    assert.ok(shortcut.title && shortcut.text, shortcut.field);
    // How SettingsPageController#setShortcut applies it.
    assert.ok(
      shortcut.field === "sidebarWidgetShortcut" ||
        shortcut.field in SIDEBAR_FIELD_EVENTS,
      shortcut.field,
    );
  }

  // SettingsPageController can't be imported in Node: its table of them,
  // and the busy checks it names, are read from the sources.
  const read = (path) =>
    readFileSync(
      new URL(`../src/second_sidebar/${path}`, import.meta.url),
      "utf8",
    );
  const table = read("controllers/settings_page.mjs").match(
    /const SHORTCUT_FIELDS = \{([^}]*)\};/,
  );
  assert.ok(table, "SHORTCUT_FIELDS");
  const entries = [...table[1].matchAll(/(\w+): "(\w+)"/g)];
  assert.deepEqual(
    entries.map(([, field]) => field).sort(),
    [...fields].sort(),
  );
  const shortcuts = read("controllers/shortcuts.mjs");
  for (const [, , method] of entries) {
    assert.match(shortcuts, new RegExp(`\\n {2}${method}\\(`), method);
  }
});
