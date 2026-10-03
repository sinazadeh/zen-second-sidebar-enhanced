import {
  DEFAULT_USER_AGENT,
  FIREFOX_MOBILE_USER_AGENT,
} from "./user_agents.mjs";

import { getExtensionSidebarPanels } from "./extension_panels.mjs";

/**
 * @typedef {Object} WebPanelPresetSettings Settings a preset gives a new web
 *   panel; anything left out (geometry, toolbar, unloading...) keeps its
 *   default, since that's the user's preference rather than the site's.
 * @property {string} [userAgent] an id from getUserAgentChoices()
 * @property {boolean} [dynamicFavicon]
 * @property {string} [faviconURL]
 * @property {boolean} [reloadOnUrlChange]
 */

/**
 * @typedef {Object} WebPanelPreset
 * @property {string} id
 * @property {string} name
 * @property {string} url
 * @property {string?} [iconURL] Shown in the preset list; only local icons
 *   (extensions'), so opening the list doesn't contact every site.
 * @property {WebPanelPresetSettings} settings
 */

/**
 * `mobile`: open in mobile view (the Firefox Mobile user agent).
 *
 * @type {Array<{name: string, url: string, mobile?: boolean}>}
 */
const WEBSITES = [
  { name: "ChatGPT", url: "https://chatgpt.com/" },
  { name: "Claude", url: "https://claude.ai/new", mobile: true },
  {
    name: "Desmos Scientific Calculator",
    url: "https://www.desmos.com/scientific",
  },
  { name: "Discord", url: "https://discord.com/app" },
  { name: "Gemini", url: "https://gemini.google.com/" },
  { name: "Gmail", url: "https://mail.google.com/" },
  {
    name: "Google Calendar",
    url: "https://calendar.google.com/calendar/u/0/r",
  },
  { name: "Google Keep", url: "https://keep.google.com/" },
  { name: "Google Translate", url: "https://translate.google.com/" },
  { name: "Instagram", url: "https://www.instagram.com/" },
  { name: "LinkedIn", url: "https://www.linkedin.com/feed/" },
  { name: "Messenger", url: "https://www.messenger.com/" },
  {
    name: "Microsoft To Do",
    url: "https://to-do.live.com/tasks/inbox",
    mobile: true,
  },
  { name: "Notion", url: "https://www.notion.so/" },
  { name: "Outlook", url: "https://outlook.live.com/mail/" },
  { name: "Perplexity", url: "https://www.perplexity.ai/" },
  { name: "Reddit", url: "https://www.reddit.com/" },
  { name: "Slack", url: "https://app.slack.com/client" },
  { name: "Spotify", url: "https://open.spotify.com/" },
  { name: "Telegram", url: "https://web.telegram.org/", mobile: true },
  { name: "WhatsApp", url: "https://web.whatsapp.com/" },
  { name: "X", url: "https://x.com/home", mobile: true },
  { name: "YouTube Music", url: "https://music.youtube.com/" },
];

/**
 * Adjustments for particular extensions, keyed by extension id: `page`
 * replaces the declared `sidebar_action.default_panel` (relative to the
 * extension's base URL, `moz-extension://<internal-uuid>/`).
 *
 * @type {Object<string, {page?: string, reloadOnUrlChange?: boolean}>}
 */
const EXTENSION_OVERRIDES = {
  // Bitwarden: straight to the vault tab, reloaded as the current tab's
  // site changes so it lists that site's logins.
  "{446900e4-71c2-419f-a6a7-df9c091e268b}": {
    page: "popup/index.html?uilocation=sidebar#/tabs/vault",
    reloadOnUrlChange: true,
  },
};

/**
 * @returns {WebPanelPreset[]}
 */
export function getWebsitePresets() {
  return WEBSITES.map(({ name, url, mobile = false }) => ({
    id: `website:${url}`,
    name,
    url,
    settings: {
      userAgent: mobile ? FIREFOX_MOBILE_USER_AGENT : DEFAULT_USER_AGENT,
      dynamicFavicon: true,
      reloadOnUrlChange: false,
    },
  }));
}

/**
 * Sidebars of installed extensions. Their pages don't set a favicon, so the
 * extension's icon is kept fixed rather than following the page (which
 * would show a generic icon).
 *
 * @returns {WebPanelPreset[]}
 */
export function getExtensionPresets() {
  return getExtensionSidebarPanels().map(
    ({ id, name, url, baseURL, iconURL }) => {
      const { page, reloadOnUrlChange = false } = EXTENSION_OVERRIDES[id] ?? {};
      return {
        id: `extension:${id}`,
        name,
        url: page ? new URL(page, baseURL).href : url,
        iconURL,
        settings: {
          userAgent: DEFAULT_USER_AGENT,
          ...(iconURL
            ? { dynamicFavicon: false, faviconURL: iconURL }
            : { dynamicFavicon: true }),
          reloadOnUrlChange,
        },
      };
    },
  );
}
