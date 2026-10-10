import "./gecko_stubs.mjs";

import assert from "node:assert/strict";
import { test } from "node:test";

const policies = [];
globalThis.WebExtensionPolicy = { getActiveExtensions: () => policies };

/**
 * @param {string} id
 * @param {string} hostname
 * @param {string} name
 * @param {object} manifest
 */
function addExtension(id, hostname, name, manifest) {
  policies.push({
    id,
    name,
    extension: { manifest },
    getURL: (path) => new URL(path, `moz-extension://${hostname}/`).href,
  });
}

addExtension("{446900e4-71c2-419f-a6a7-df9c091e268b}", "uuid-bw", "Bitwarden", {
  icons: { 32: "images/icon32.png" },
  sidebar_action: { default_panel: "popup/index.html?uilocation=sidebar" },
});
addExtension("iconless@example.com", "uuid-iconless", "Iconless", {
  sidebar_action: { default_panel: "sidebar.html" },
});
// 1Password has a toolbar button but no sidebar page.
addExtension(
  "{d634138d-c276-4fc8-924b-40a0ea21d284}",
  "uuid-1p",
  "1Password: Password Manager",
  {
    icons: {
      16: "/images/icons/app_icon-light_bg-color-unlocked-32.png",
      48: "/images/icons/onepassword-48.png",
      128: "/images/icons/onepassword-128.png",
    },
    browser_action: { default_title: "1Password" },
  },
);
// Neither a sidebar page nor a preset page: not offered.
addExtension("popup-only@example.com", "uuid-popup", "Popup Only", {
  browser_action: { default_popup: "popup.html" },
});

const { getExtensionPresets, getWebsitePresets } =
  await import("../src/second_sidebar/utils/web_panel_presets.mjs");
const { WebPanelSettings } =
  await import("../src/second_sidebar/settings/web_panel_settings.mjs");

test("website presets only set the URL, user agent, favicon and reloading", () => {
  const presets = getWebsitePresets();
  assert.ok(presets.length > 0);
  for (const preset of presets) {
    assert.doesNotThrow(() => new URL(preset.url), preset.name);
    assert.deepEqual(Object.keys(preset.settings).sort(), [
      "dynamicFavicon",
      "reloadOnUrlChange",
      "userAgent",
    ]);
    assert.equal(preset.settings.dynamicFavicon, true);
  }
  assert.equal(
    new Set(presets.map((preset) => preset.id)).size,
    presets.length,
    "ids are unique",
  );
  const names = presets.map((preset) => preset.name);
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b)),
    "listed alphabetically",
  );
  assert.equal(
    presets.every((preset) => preset.url.startsWith("https://")),
    true,
  );
  const telegram = presets.find((preset) => preset.name === "Telegram");
  assert.equal(telegram.settings.userAgent, "firefox-mobile");
  const chatgpt = presets.find((preset) => preset.name === "ChatGPT");
  assert.equal(chatgpt.settings.userAgent, "default");
});

test("extension presets keep the extension's icon fixed", () => {
  const presets = getExtensionPresets();
  assert.deepEqual(
    presets.map((preset) => preset.name),
    ["1Password: Password Manager", "Bitwarden", "Iconless"],
  );
  const [, bitwarden, iconless] = presets;
  assert.deepEqual(bitwarden, {
    id: "extension:{446900e4-71c2-419f-a6a7-df9c091e268b}",
    name: "Bitwarden",
    // Bitwarden opens straight on its vault.
    url: "moz-extension://uuid-bw/popup/index.html?uilocation=sidebar#/tabs/vault",
    iconURL: "moz-extension://uuid-bw/images/icon32.png",
    settings: {
      userAgent: "default",
      dynamicFavicon: false,
      faviconURL: "moz-extension://uuid-bw/images/icon32.png",
      reloadOnUrlChange: true,
    },
  });
  // Without an icon to fix, the page's own one is still better than nothing.
  assert.equal(iconless.url, "moz-extension://uuid-iconless/sidebar.html");
  assert.deepEqual(iconless.settings, {
    userAgent: "default",
    dynamicFavicon: true,
    reloadOnUrlChange: false,
  });
});

test("1Password, which has no sidebar page, opens on its popup", () => {
  const onePassword = getExtensionPresets()[0];
  assert.deepEqual(onePassword, {
    id: "extension:{d634138d-c276-4fc8-924b-40a0ea21d284}",
    name: "1Password: Password Manager",
    url: "moz-extension://uuid-1p/popup/index.html",
    iconURL: "moz-extension://uuid-1p/images/icons/onepassword-48.png",
    settings: {
      userAgent: "default",
      dynamicFavicon: false,
      faviconURL: "moz-extension://uuid-1p/images/icons/onepassword-48.png",
      reloadOnUrlChange: true,
    },
  });
});

test("settings a preset leaves out keep their defaults", () => {
  const settings = new WebPanelSettings("left", "0px", "uuid", "https://a/", {
    userAgent: undefined,
    dynamicFavicon: undefined,
    faviconURL: undefined,
    reloadOnUrlChange: undefined,
  });
  assert.equal(settings.userAgent, "default");
  assert.equal(settings.dynamicFavicon, true);
  assert.equal(settings.faviconURL, "");
  assert.equal(settings.reloadOnUrlChange, false);
});
