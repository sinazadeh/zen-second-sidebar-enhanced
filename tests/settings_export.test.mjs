import "./gecko_stubs.mjs";

import assert from "node:assert/strict";
import { test } from "node:test";

const { EXPORT_VERSION, buildSettingsExport, parseSettingsExport } =
  await import("../src/second_sidebar/settings/settings_export.mjs");
const { SidebarSettings } =
  await import("../src/second_sidebar/settings/sidebar_settings.mjs");
const { WebPanelSettings } =
  await import("../src/second_sidebar/settings/web_panel_settings.mjs");
const { WebPanelsSettings } =
  await import("../src/second_sidebar/settings/web_panels_settings.mjs");

const OFFSET = "var(--space-small)";

function makeExport() {
  const sidebarSettings = new SidebarSettings({ position: "left" });
  const webPanelsSettings = new WebPanelsSettings([
    WebPanelSettings.fromObject("left", OFFSET, {
      uuid: "a",
      url: "https://a.example/",
      pinned: true,
    }),
    WebPanelSettings.fromObject("left", OFFSET, {
      uuid: "b",
      url: "https://b.example/",
      zoom: 0.9,
    }),
  ]);
  // Through JSON, like the real export file.
  return JSON.parse(
    JSON.stringify(buildSettingsExport(sidebarSettings, webPanelsSettings)),
  );
}

test("an export parses back to the same settings", () => {
  const data = makeExport();
  assert.equal(data.version, EXPORT_VERSION);

  const { sidebarSettings, webPanelsSettings } = parseSettingsExport(data);
  assert.deepEqual(sidebarSettings.toObject(), data.sidebarSettings);
  assert.deepEqual(
    webPanelsSettings.webPanels.map((webPanel) => webPanel.toObject()),
    data.webPanels,
  );
});

test("temporary panels are left out of exports", () => {
  const sidebarSettings = new SidebarSettings({});
  const webPanelsSettings = new WebPanelsSettings([
    WebPanelSettings.fromObject("right", OFFSET, {
      uuid: "kept",
      url: "https://kept.example/",
    }),
    WebPanelSettings.fromObject("right", OFFSET, {
      uuid: "preview",
      url: "https://preview.example/",
      temporary: true,
    }),
  ]);
  const data = buildSettingsExport(sidebarSettings, webPanelsSettings);
  assert.deepEqual(
    data.webPanels.map((webPanel) => webPanel.uuid),
    ["kept"],
  );
});

test("a version 1 export's Mobile View becomes the Firefox Mobile user agent", () => {
  const data = makeExport();
  data.version = 1;
  for (const webPanel of data.webPanels) {
    delete webPanel.userAgent;
    delete webPanel.customUserAgent;
  }
  data.webPanels[0].mobile = true;
  const { webPanelsSettings } = parseSettingsExport(data);
  assert.deepEqual(
    webPanelsSettings.webPanels.map((webPanel) => webPanel.userAgent),
    ["firefox-mobile", "default"],
  );
});

test("an export without a version (older format) is accepted", () => {
  const data = makeExport();
  delete data.version;
  assert.equal(parseSettingsExport(data).webPanelsSettings.webPanels.length, 2);
});

test("files that aren't settings exports are rejected", () => {
  for (const data of [
    null,
    [],
    "text",
    {},
    { sidebarSettings: {}, webPanels: {} },
    { sidebarSettings: [], webPanels: [] },
  ]) {
    assert.throws(() => parseSettingsExport(data), /does not look like/);
  }
});

test("exports from a newer, incompatible format are rejected", () => {
  const data = makeExport();
  data.version = EXPORT_VERSION + 1;
  assert.throws(() => parseSettingsExport(data), /newer/);
});

test("an import without bad values reports none", () => {
  assert.deepEqual(parseSettingsExport(makeExport()).invalidSettings, []);
});

test("imported values of the wrong type get their defaults", () => {
  const data = makeExport();
  Object.assign(data.sidebarSettings, {
    position: "middle",
    autoHideSidebar: "yes",
    lastWebPanelShortcut: 5,
  });
  Object.assign(data.webPanels[0], {
    zoom: "big",
    temporary: 1,
    title: ["x"],
    floatingGeometry: { anchor: "topleft", width: 420 },
    pinnedGeometry: "wide",
  });
  const { sidebarSettings, webPanelsSettings, invalidSettings } =
    parseSettingsExport(data);

  assert.deepEqual(invalidSettings.sort(), [
    "autoHideSidebar",
    "lastWebPanelShortcut",
    "position",
    "web panel #1: floatingGeometry.width",
    "web panel #1: pinnedGeometry",
    "web panel #1: temporary",
    "web panel #1: title",
    "web panel #1: zoom",
  ]);
  assert.equal(sidebarSettings.position, "right");
  assert.equal(sidebarSettings.autoHideSidebar, false);
  assert.equal(sidebarSettings.lastWebPanelShortcut, "");
  // The rest of the file still counts.
  assert.equal(sidebarSettings.padding, "small");
  const [panel] = webPanelsSettings.webPanels;
  assert.equal(panel.zoom, 1);
  assert.equal(panel.temporary, false);
  assert.equal(panel.title, "");
  assert.equal(panel.pinned, true);
  assert.equal(panel.floatingGeometry.anchor, "topleft");
  assert.equal(panel.floatingGeometry.width, "600px");
  assert.equal(panel.pinnedGeometry.width, "600px");
});

test("numbers saved as strings and nulls are accepted quietly", () => {
  const data = makeExport();
  Object.assign(data.webPanels[1], {
    periodicReload: "60000",
    userContextId: "2",
    selector: null,
  });
  const { webPanelsSettings, invalidSettings } = parseSettingsExport(data);
  assert.deepEqual(invalidSettings, []);
  const panel = webPanelsSettings.webPanels[1];
  assert.equal(panel.periodicReload, 60000);
  assert.equal(panel.userContextId, 2);
  assert.equal(panel.selector, "");
});

test("broken web panel entries are rejected", () => {
  const cases = [
    [(panels) => (panels[1] = "nope"), /#2 is not an object/],
    [(panels) => delete panels[0].uuid, /#1 has no uuid/],
    [(panels) => (panels[1].url = ""), /#2 has no url/],
    [(panels) => (panels[1].uuid = panels[0].uuid), /#2 repeats uuid a/],
  ];
  for (const [breakPanels, error] of cases) {
    const data = makeExport();
    breakPanels(data.webPanels);
    assert.throws(() => parseSettingsExport(data), error);
  }
});
