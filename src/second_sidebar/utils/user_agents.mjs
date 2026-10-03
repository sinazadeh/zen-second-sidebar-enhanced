// The user agents a web panel can identify itself with (its "User Agent"
// setting). Keep this module free of browser globals: tests/user_agents.test.mjs
// runs it in Node, so the browser's version is passed in.

/** The browser's own user agent: no override. */
export const DEFAULT_USER_AGENT = "default";
/** The panel's `customUserAgent` string. */
export const CUSTOM_USER_AGENT = "custom";
/** Firefox for Android, what older versions' "Mobile View" became. */
export const FIREFOX_MOBILE_USER_AGENT = "firefox-mobile";

/**
 * Samsung Internet, as on a current Galaxy phone or tablet. Like Chrome, it
 * reports "Android 10; K" instead of the real Android version and device.
 */
const SAMSUNG_INTERNET =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/30.0 Chrome/143.0.0.0";

/**
 * Presets in menu order, without "Default" and "Custom". `build` gets the
 * running browser's major Gecko version, so the Firefox one never goes out
 * of date; refresh the others when a new major version comes out.
 *
 * @type {Array<{id: string, label: string, build: function(number):string}>}
 */
const PRESETS = [
  {
    id: FIREFOX_MOBILE_USER_AGENT,
    label: "Firefox Mobile",
    build: (version) =>
      `Mozilla/5.0 (Android 16; Mobile; rv:${version}.0) Gecko/${version}.0 Firefox/${version}.0`,
  },
  {
    id: "galaxy-phone",
    label: "Galaxy Phone",
    build: () => `${SAMSUNG_INTERNET} Mobile Safari/537.36`,
  },
  {
    id: "galaxy-tab",
    label: "Galaxy Tab",
    build: () => `${SAMSUNG_INTERNET} Safari/537.36`,
  },
  {
    id: "iphone",
    label: "iPhone",
    // Since Safari 26, iOS reports its version as 18.6 whatever it is.
    build: () =>
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
  },
];

// Used if the browser's version can't be read.
const FALLBACK_GECKO_VERSION = 149;

/**
 * Every choice for the "User Agent" setting, in menu order.
 *
 * @returns {Array<{id: string, label: string}>}
 */
export function getUserAgentChoices() {
  return [
    { id: DEFAULT_USER_AGENT, label: "Default" },
    ...PRESETS.map(({ id, label }) => ({ id, label })),
    { id: CUSTOM_USER_AGENT, label: "Custom" },
  ];
}

/**
 * @param {*} id
 * @returns {boolean}
 */
export function isUserAgentId(id) {
  return getUserAgentChoices().some((choice) => choice.id === id);
}

/**
 * The User-Agent a panel sends.
 *
 * @param {string} id one of getUserAgentChoices()'s ids; anything else is
 *   treated as "default"
 * @param {string} customUserAgent used for "custom"
 * @param {string} geckoVersion the running browser's, e.g. "149.0.1"
 * @returns {string} "" for the browser's own
 */
export function resolveUserAgent(id, customUserAgent, geckoVersion) {
  if (id === CUSTOM_USER_AGENT) {
    return sanitizeUserAgent(customUserAgent);
  }
  const preset = PRESETS.find((preset) => preset.id === id);
  if (!preset) return "";
  const version = parseInt(geckoVersion, 10);
  return preset.build(
    Number.isFinite(version) && version > 0 ? version : FALLBACK_GECKO_VERSION,
  );
}

/**
 * A custom user agent can come from an imported settings file, and it's
 * sent as an HTTP header, so it's kept to one line of printable text.
 *
 * @param {*} value
 * @returns {string}
 */
export function sanitizeUserAgent(value) {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
}
