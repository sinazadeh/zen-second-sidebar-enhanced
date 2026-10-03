import { DEFAULT_USER_CONTEXT_ID } from "./gecko_stubs.mjs";

import assert from "node:assert/strict";
import { test } from "node:test";

const { SidebarSettings } =
  await import("../src/second_sidebar/settings/sidebar_settings.mjs");
const { WebPanelSettings } =
  await import("../src/second_sidebar/settings/web_panel_settings.mjs");
const { WebPanelState } =
  await import("../src/second_sidebar/settings/web_panel_state.mjs");
const { WebPanelsSettings } =
  await import("../src/second_sidebar/settings/web_panels_settings.mjs");
const { FileSettings } =
  await import("../src/second_sidebar/settings/settings.mjs");

const OFFSET = "var(--space-small)";

test("SidebarSettings fills fields missing from older saves with defaults", () => {
  const settings = new SidebarSettings({ position: "left" });
  assert.equal(settings.position, "left");
  assert.equal(settings.padding, "small");
  assert.equal(settings.autoHideSidebar, false);
  assert.equal(settings.hideToolbarAnimated, true);
  assert.equal(settings.nextWebPanelShortcut, "");
  assert.equal(settings.previousWebPanelShortcut, "");
});

test("SidebarSettings round-trips through toObject", () => {
  const original = new SidebarSettings({
    position: "left",
    tooltip: "title",
    autoHideSidebar: true,
    lastWebPanelShortcut: "Alt+1",
  });
  assert.deepEqual(
    new SidebarSettings(original.toObject()).toObject(),
    original.toObject(),
  );
});

test("WebPanelSettings round-trips, including nested geometry", () => {
  const original = WebPanelSettings.fromObject("right", OFFSET, {
    uuid: "a",
    url: "https://example.com/",
    title: "Example",
    pinned: true,
    zoom: 1.2,
    unloadAfterInactivity: 60000,
    reloadOnUrlChange: true,
    floatingGeometry: { anchor: "topleft", width: "420px" },
    pinnedGeometry: { width: "350px" },
  });
  const object = original.toObject();

  assert.equal(object.floatingGeometry.anchor, "topleft");
  assert.equal(object.floatingGeometry.width, "420px");
  assert.equal(object.pinnedGeometry.width, "350px");
  assert.deepEqual(
    WebPanelSettings.fromObject("right", OFFSET, object).toObject(),
    object,
  );
});

test("WebPanelSettings defaults missing fields from the sidebar position", () => {
  const settings = WebPanelSettings.fromObject("left", OFFSET, {
    uuid: "a",
    url: "https://example.com/",
  });
  assert.equal(settings.userContextId, DEFAULT_USER_CONTEXT_ID);
  assert.equal(settings.dynamicTitle, true);
  assert.equal(settings.temporary, false);
  assert.equal(settings.floatingGeometry.left, OFFSET);
  assert.equal(settings.floatingGeometry.right, "unset");
  assert.equal(settings.floatingGeometry.height, `calc(100% - ${OFFSET} * 2)`);
  assert.equal(settings.pinnedGeometry.width, "600px");
});

test("WebPanelSettings turns older versions' Mobile View into a user agent", () => {
  const panel = (fields) =>
    WebPanelSettings.fromObject("left", OFFSET, {
      uuid: "a",
      url: "https://example.com/",
      ...fields,
    });

  assert.equal(panel({}).userAgent, "default");
  assert.equal(panel({ mobile: false }).userAgent, "default");
  assert.equal(panel({ mobile: true }).userAgent, "firefox-mobile");
  // userAgent wins once there is one; mobile isn't saved any more.
  const iphone = panel({ mobile: true, userAgent: "iphone" });
  assert.equal(iphone.userAgent, "iphone");
  assert.equal("mobile" in iphone.toObject(), false);
  // Values from a broken or newer file fall back.
  assert.equal(panel({ userAgent: "pager" }).userAgent, "default");
  assert.equal(panel({ customUserAgent: 5 }).customUserAgent, "");
  assert.equal(panel({}).customUserAgent, "");

  const custom = panel({ userAgent: "custom", customUserAgent: "Agent/1" });
  assert.deepEqual(
    [custom.toObject().userAgent, custom.toObject().customUserAgent],
    ["custom", "Agent/1"],
  );
});

test("WebPanelSettings keeps a list of Zen spaces, all of them by default", () => {
  const panel = (fields) =>
    WebPanelSettings.fromObject("left", OFFSET, {
      uuid: "a",
      url: "https://example.com/",
      ...fields,
    });
  assert.deepEqual(panel({}).spaces, []);
  assert.deepEqual(panel({ spaces: ["work", "home"] }).spaces, [
    "work",
    "home",
  ]);
  assert.deepEqual(panel({ spaces: "work" }).spaces, []);
  assert.deepEqual(panel({ spaces: ["work", 3, null] }).spaces, ["work"]);
  // A copy, not the same list.
  const spaces = ["work"];
  const settings = panel({ spaces });
  spaces.push("home");
  assert.deepEqual(settings.toObject().spaces, ["work"]);
});

test("WebPanelsSettings doesn't save or load temporary panels", async (t) => {
  const panels = [
    { uuid: "kept", url: "https://kept.example/" },
    { uuid: "preview", url: "https://preview.example/", temporary: true },
  ];
  let saved = null;
  t.mock.method(FileSettings, "load", async () => panels);
  t.mock.method(FileSettings, "save", async (_path, value) => {
    saved = value;
  });

  // Older versions saved them.
  const loaded = await WebPanelsSettings.load("left", "small");
  assert.deepEqual(
    loaded.webPanels.map((webPanel) => webPanel.uuid),
    ["kept"],
  );

  const settings = new WebPanelsSettings(
    panels.map((panel) => WebPanelSettings.fromObject("left", OFFSET, panel)),
  );
  assert.deepEqual(
    settings.persistentWebPanels.map((webPanel) => webPanel.uuid),
    ["kept"],
  );
  await settings.save();
  assert.deepEqual(
    saved.map((webPanel) => webPanel.uuid),
    ["kept"],
  );
});

test("WebPanelState round-trips and defaults lastUrl", () => {
  assert.equal(WebPanelState.fromObject({ uuid: "a" }).lastUrl, null);
  const state = WebPanelState.fromObject({
    uuid: "a",
    lastUrl: "https://example.com/page",
  });
  assert.deepEqual(state.toObject(), {
    uuid: "a",
    lastUrl: "https://example.com/page",
  });
});
