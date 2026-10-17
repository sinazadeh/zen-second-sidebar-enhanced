import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

const { SETTINGS_PAGE_SECTIONS } =
  await import("../src/second_sidebar/settings_page/layout.mjs");
const { SIDEBAR_PREFS } =
  await import("../src/second_sidebar/settings/sidebar_prefs.mjs");

const PAGE_DIR = new URL(
  "../src/second_sidebar/settings_page/",
  import.meta.url,
);
const controls = SETTINGS_PAGE_SECTIONS.flatMap((section) => section.controls);

test("the settings page has one control per sidebar pref", () => {
  assert.deepEqual(
    controls.map((control) => control.pref).sort(),
    SIDEBAR_PREFS.map((entry) => entry.pref).sort(),
  );
});

test("the settings page lists the prefs in the settings popup's order", () => {
  // SIDEBAR_PREFS follows the popup, and the page follows both.
  assert.deepEqual(
    controls.map((control) => control.pref),
    SIDEBAR_PREFS.map((entry) => entry.pref),
  );
});

test("each control offers exactly the values its pref accepts", () => {
  for (const entry of SIDEBAR_PREFS) {
    const control = controls.find((c) => c.pref === entry.pref);
    if (entry.values) {
      assert.deepEqual(
        control.choices?.map(([value]) => value),
        entry.values,
        entry.pref,
      );
      for (const [value, label] of control.choices) {
        assert.ok(label, `${entry.pref}: ${value} needs a label`);
      }
    } else {
      assert.equal(control.choices, undefined, `${entry.pref} is a switch`);
    }
  }
});

test("every section and control has a title and a description", () => {
  for (const section of SETTINGS_PAGE_SECTIONS) {
    assert.ok(section.title);
    assert.ok(section.controls.length, section.title);
  }
  for (const control of controls) {
    assert.ok(control.title, control.pref);
    assert.ok(control.text, control.pref);
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
