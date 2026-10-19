// What the settings page shows: one card per section, in SIDEBAR_PREFS's
// order, each control editing one of the mirrored sidebar prefs
// (settings/sidebar_prefs.mjs). tests/settings_page.test.mjs checks that every
// pref is here once, with the values it accepts.
//
// Keep this module free of browser globals: the Node tests import it.

const SIZES = [
  ["xxsmall", "XXS", "Extra extra small"],
  ["xsmall", "XS", "Extra small"],
  ["small", "S", "Small"],
  ["medium", "M", "Medium"],
  ["large", "L", "Large"],
  ["xlarge", "XL", "Extra large"],
  ["xxlarge", "XXL", "Extra extra large"],
];

/**
 * @typedef {object} SettingsPageControl
 * @property {string} pref The mirrored pref it edits.
 * @property {string} title
 * @property {string} text One sentence saying what it does.
 * @property {Array<[string, string, string?]>} [choices] For a string pref:
 *   its values with a short label (and a longer one for the tooltip). A
 *   control without choices is a switch.
 * @property {boolean} [zenOnly] Only does something in Zen.
 */

/**
 * @type {Array<{title: string, hint?: string, controls: SettingsPageControl[]}>}
 */
export const SETTINGS_PAGE_SECTIONS = [
  {
    title: "Sidebar",
    controls: [
      {
        pref: "second-sidebar.position",
        title: "Position",
        text: "The side of the window the sidebar is on.",
        choices: [
          ["left", "Left"],
          ["right", "Right"],
        ],
      },
      {
        pref: "second-sidebar.width",
        title: "Width",
        text: "How much room the sidebar and its panel buttons take.",
        choices: SIZES,
      },
      {
        pref: "second-sidebar.allow-window-dragging",
        title: "Allow window dragging",
        text: "Move the window by dragging the sidebar's empty space.",
      },
    ],
  },
  {
    title: "Visibility",
    controls: [
      {
        pref: "second-sidebar.auto-hide",
        title: "Auto-hide sidebar",
        text: "Hide the sidebar until you move the mouse to its edge of the window.",
      },
      {
        pref: "second-sidebar.auto-hide-behavior",
        title: "Auto-hide behavior",
        text: "Inline makes room for the sidebar when it shows; overlay shows it on top of the page.",
        choices: [
          ["inline", "Inline"],
          ["overlay", "Overlay"],
        ],
      },
      {
        pref: "second-sidebar.auto-hide-edge-gap",
        title: "Keep gap at window edge",
        text: "With overlay, keep the sidebar off the window's edge, like Zen's own sidebar.",
        zenOnly: true,
      },
      {
        pref: "second-sidebar.hide-web-panel-when-hidden",
        title: "Hide web panel when sidebar is hidden",
        text: "Close the open panel along with the sidebar.",
      },
    ],
  },
  {
    title: "Web panel",
    controls: [
      {
        pref: "second-sidebar.default-floating-offset",
        title: "Default floating panel offset",
        text: "How far floating panels sit from the sidebar and the window's edges.",
        choices: SIZES,
      },
      {
        pref: "second-sidebar.new-web-panel-position",
        title: "New panel position",
        text: "Where a new panel's button goes.",
        choices: [
          ["before", "Before +", "Before the + button"],
          ["after", "After +", "After the + button"],
        ],
      },
      {
        pref: "second-sidebar.new-web-panel-spaces",
        title: "New panels show in",
        text: "The spaces a new panel shows in. Each panel can change it later.",
        choices: [
          ["all", "All spaces"],
          ["current", "Current space"],
        ],
        zenOnly: true,
      },
      {
        pref: "second-sidebar.show-geometry-hint",
        title: "Show geometry hint",
        text: "Show a panel's size and position while you move or resize it.",
      },
    ],
  },
  {
    title: "Web panel button",
    controls: [
      {
        pref: "second-sidebar.container-indicator",
        title: "Container indicator",
        text: "A line in the container's color on buttons of panels in a container.",
        choices: [
          ["off", "Off"],
          ["left", "Left"],
          ["right", "Right"],
          ["top", "Top"],
          ["bottom", "Bottom"],
          ["around", "Around"],
        ],
      },
      {
        pref: "second-sidebar.tooltip",
        title: "Tooltip",
        text: "What shows when you hover a panel's button.",
        choices: [
          ["off", "Off"],
          ["title", "Title"],
          ["url", "URL"],
          ["titleandurl", "Both", "Title and URL"],
        ],
      },
      {
        pref: "second-sidebar.tooltip-full-url",
        title: "Show full URL in tooltip",
        text: "The whole address, instead of just the site.",
      },
    ],
  },
  {
    title: "Web panel toolbar",
    controls: [
      {
        pref: "second-sidebar.auto-hide-forward-button",
        title: "Auto-hide forward button",
        text: "Show it only when there's a page to go forward to.",
      },
      {
        pref: "second-sidebar.auto-hide-back-button",
        title: "Auto-hide back button",
        text: "Show it only when there's a page to go back to.",
      },
    ],
  },
  {
    title: "Links, bookmarks and tabs",
    controls: [
      {
        pref: "second-sidebar.show-open-menu-items",
        title: "Show “Open in Second Sidebar”",
        text: "In the right-click menus of links, bookmarks and tabs.",
      },
      {
        pref: "second-sidebar.show-preview-menu-items",
        title: "Show “Preview in Second Sidebar”",
        text: "Opens it in a temporary panel instead.",
      },
      {
        pref: "second-sidebar.link-click-modifier",
        title: "Preview on click with",
        text: "Click a link while holding these keys to preview it in a temporary panel.",
        choices: [
          ["off", "Off"],
          ["altshift", "Alt+Shift"],
          ["alt", "Alt"],
        ],
      },
    ],
  },
  {
    title: "Animations",
    controls: [
      {
        pref: "second-sidebar.animate-sidebar",
        title: "Animate sidebar",
        text: "Slide the sidebar in and out.",
      },
      {
        pref: "second-sidebar.animate-web-panel-toolbar",
        title: "Animate web panel toolbar",
        text: "Slide a panel's toolbar in and out.",
      },
    ],
  },
];

/**
 * The sidebar's keyboard shortcuts, on their own card: they're kept in the
 * sidebar settings, not in mirrored prefs (Sine can't record keys), so the
 * page sets them through the browser window (SettingsPageController).
 *
 * @type {Array<{field: string, title: string, text: string}>}
 */
export const SETTINGS_PAGE_SHORTCUTS = [
  {
    field: "sidebarWidgetShortcut",
    title: "Show or hide the sidebar",
    text: "Hides the sidebar, or shows it again.",
  },
  {
    field: "lastWebPanelShortcut",
    title: "Open or close the last panel",
    text: "Opens the web panel you used last, or closes the open one.",
  },
  {
    field: "nextWebPanelShortcut",
    title: "Open the next panel",
    text: "The one after the open panel, in the order of their buttons, wrapping around. With none open, the first.",
  },
  {
    field: "previousWebPanelShortcut",
    title: "Open the previous panel",
    text: "The one before the open panel, wrapping around. With none open, the last.",
  },
];
