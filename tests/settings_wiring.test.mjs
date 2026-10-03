// The settings popups' changes are wired to events through the tables in
// controllers/web_panel_fields.mjs and controllers/sidebar_fields.mjs. The
// popups, events.mjs and WebPanelController can't be imported in Node, so
// their sources are read instead: a callback missing from a table would
// throw in the browser the first time its control is changed.

import "./gecko_stubs.mjs";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const { WEB_PANEL_FIELDS, buildWebPanelEditCallbacks } =
  await import("../src/second_sidebar/controllers/web_panel_fields.mjs");
const { SIDEBAR_FIELD_EVENTS, VISIBILITY_FIELDS } =
  await import("../src/second_sidebar/controllers/sidebar_fields.mjs");
const { SIDEBAR_PREFS } =
  await import("../src/second_sidebar/settings/sidebar_prefs.mjs");
const { SidebarSettings } =
  await import("../src/second_sidebar/settings/sidebar_settings.mjs");

/**
 * @param {string} path under src/second_sidebar/
 * @returns {string}
 */
function source(path) {
  return readFileSync(
    new URL(`../src/second_sidebar/${path}`, import.meta.url),
    "utf8",
  );
}

/**
 * The callback names a popup's listenChanges({ ... }) takes.
 *
 * @param {string} path
 * @returns {string[]}
 */
function listenChangesCallbacks(path) {
  const match = source(path).match(/\n {2}listenChanges\(\{([^}]*)\}\) \{/);
  assert.ok(match, `${path} has listenChanges({ ... })`);
  return match[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

/**
 * @param {string} name WebPanelEvents or SidebarEvents
 * @returns {string[]} its keys in events.mjs
 */
function eventKeys(name) {
  const match = source("controllers/events.mjs").match(
    new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\n\\};`),
  );
  assert.ok(match, name);
  return [...match[1].matchAll(/^ {2}([A-Z_]+):/gm)].map(([, key]) => key);
}

test("every Edit web panel callback is in WEB_PANEL_FIELDS", () => {
  assert.deepEqual(
    listenChangesCallbacks("xul/web_panel_popup_edit.mjs").sort(),
    Object.keys(WEB_PANEL_FIELDS).sort(),
  );
});

test("WEB_PANEL_FIELDS names real events and WebPanelController methods", () => {
  const events = eventKeys("WebPanelEvents");
  const methods = new Set(
    [...source("controllers/web_panel.mjs").matchAll(/^ {2}(\w+)\(/gm)].map(
      ([, name]) => name,
    ),
  );
  for (const [name, field] of Object.entries(WEB_PANEL_FIELDS)) {
    assert.ok(events.includes(field.event), `${name}: ${field.event}`);
    for (const method of [field.setter, field.action].filter(Boolean)) {
      assert.ok(methods.has(method), `${name}: ${method}`);
    }
    if (field.geometry) {
      assert.equal(field.values.length, 1, name);
    }
  }
});

test("each callback sends its event with the values it's given", () => {
  const sent = [];
  const callbacks = buildWebPanelEditCallbacks(
    (event, detail) => sent.push([event, detail]),
    () => 1.1,
  );
  for (const [name, field] of Object.entries(WEB_PANEL_FIELDS)) {
    sent.length = 0;
    const args = field.values.map((key) => `${key}-value`);
    callbacks[name]("uuid", ...args);
    assert.equal(sent.length, 1, name);
    const [event, detail] = sent[0];
    assert.equal(event, field.event, name);
    assert.deepEqual(Object.keys(detail), ["uuid", ...field.values], name);
  }
});

test("callbacks send what the hand-written ones did", () => {
  const sent = [];
  const callbacks = buildWebPanelEditCallbacks(
    (event, detail) => sent.push([event, detail]),
    (uuid) => (uuid === "a" ? 1.25 : 0),
  );
  const call = (name, ...args) => {
    sent.length = 0;
    const result = callbacks[name](...args);
    return [...sent[0], result];
  };

  assert.deepEqual(call("url", "a", "https://x/"), [
    "EDIT_WEB_PANEL_URL",
    { uuid: "a", url: "https://x/", timeout: 0 },
    undefined,
  ]);
  assert.deepEqual(call("url", "a", "https://x/", 1000)[1].timeout, 1000);
  assert.deepEqual(call("title", "a", true, "T")[1], {
    uuid: "a",
    dynamicTitle: true,
    title: "T",
  });
  assert.deepEqual(call("userAgent", "a", "custom", "Agent/1")[1], {
    uuid: "a",
    userAgent: "custom",
    customUserAgent: "Agent/1",
    timeout: 0,
  });
  // Menu lists give strings.
  assert.equal(
    call("unloadAfterInactivity", "a", "60000")[1].unloadAfterInactivity,
    60000,
  );
  assert.equal(call("periodicReload", "a", "0")[1].periodicReload, 0);
  // Zoom buttons show the zoom the panel ends up with.
  assert.deepEqual(call("zoomIn", "a"), [
    "EDIT_WEB_PANEL_ZOOM_IN",
    { uuid: "a" },
    1.25,
  ]);
  assert.deepEqual(call("zoom", "a", 1), [
    "EDIT_WEB_PANEL_ZOOM",
    { uuid: "a", value: 1 },
    1.25,
  ]);
  assert.deepEqual(call("spaces", "a", ["work"])[1], {
    uuid: "a",
    spaces: ["work"],
  });
});

test("every sidebar settings callback has an event", () => {
  assert.deepEqual(
    listenChangesCallbacks("xul/sidebar_main_popup_settings.mjs").sort(),
    [...Object.keys(SIDEBAR_FIELD_EVENTS), "visibility"].sort(),
  );
  const events = eventKeys("SidebarEvents");
  for (const [field, event] of Object.entries(SIDEBAR_FIELD_EVENTS)) {
    assert.ok(events.includes(event), `${field}: ${event}`);
  }
});

test("every sidebar setting and mirrored pref reaches an event", () => {
  // sidebarWidgetShortcut goes with the visibility settings.
  const viaVisibility = [...VISIBILITY_FIELDS, "sidebarWidgetShortcut"];
  for (const field of Object.keys(new SidebarSettings({}))) {
    assert.ok(
      field in SIDEBAR_FIELD_EVENTS || viaVisibility.includes(field),
      field,
    );
  }
  for (const { field } of SIDEBAR_PREFS) {
    assert.ok(
      field in SIDEBAR_FIELD_EVENTS || VISIBILITY_FIELDS.includes(field),
      field,
    );
  }
});
