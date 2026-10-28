// What the settings page shows: one card per section. The tests check that
// every non-shortcut SidebarSettings field is here once, with the values it
// accepts.
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
const OPTIONAL_SIZES = [["off", "Off"], ...SIZES];

/**
 * @typedef {object} SettingsPageControl
 * @property {string} field The SidebarSettings field it edits.
 * @property {string} title
 * @property {string} text One sentence saying what it does.
 * @property {Array<[string, string, string?]>} [choices] For a string field:
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
        field: "position",
        title: "Position",
        text: "The side of the window the sidebar is on.",
        choices: [
          ["left", "Left"],
          ["right", "Right"],
        ],
      },
      {
        field: "padding",
        title: "Width",
        text: "How much room the sidebar and its panel buttons take.",
        choices: SIZES,
      },
      {
        field: "allowWindowDragging",
        title: "Allow window dragging",
        text: "Move the window by dragging the sidebar's empty space.",
      },
    ],
  },
  {
    title: "Visibility",
    controls: [
      {
        field: "autoHideSidebar",
        title: "Auto-hide sidebar",
        text: "Hide the sidebar until you move the mouse to its edge of the window.",
      },
      {
        field: "autoHideSidebarBehavior",
        title: "Auto-hide behavior",
        text: "Inline makes room for the sidebar when it shows; overlay shows it on top of the page.",
        choices: [
          ["inline", "Inline"],
          ["overlay", "Overlay"],
        ],
      },
      {
        field: "autoHideEdgeGap",
        title: "Keep page gap at window edge",
        text: "With overlay, keep Zen's gap around the page so its outer border stays visible.",
        zenOnly: true,
      },
      {
        field: "autoHideOverlayGap",
        title: "Overlay sidebar clearance",
        text: "How far an overlay sidebar sits inward, leaving the page edge and scrollbar reachable.",
        choices: OPTIONAL_SIZES,
        zenOnly: true,
      },
      {
        field: "sidebarWidgetHideWebPanel",
        title: "Hide web panel when sidebar is hidden",
        text: "Close the open panel along with the sidebar.",
      },
    ],
  },
  {
    title: "Web panel",
    controls: [
      {
        field: "defaultFloatingOffset",
        title: "Default floating panel offset",
        text: "How far floating panels sit from the sidebar and the window's edges.",
        choices: SIZES,
      },
      {
        field: "newWebPanelPosition",
        title: "New panel position",
        text: "Where a new panel's button goes.",
        choices: [
          ["before", "Before +", "Before the + button"],
          ["after", "After +", "After the + button"],
        ],
      },
      {
        field: "newWebPanelSpaces",
        title: "New panels show in",
        text: "The spaces a new panel shows in. Each panel can change it later.",
        choices: [
          ["all", "All spaces"],
          ["current", "Current space"],
        ],
        zenOnly: true,
      },
      {
        field: "enableSidebarBoxHint",
        title: "Show geometry hint",
        text: "Show a panel's size and position while you move or resize it.",
      },
    ],
  },
  {
    title: "Web panel button",
    controls: [
      {
        field: "webPanelMiddleClickAction",
        title: "Middle-click action",
        text: "What pressing a panel button with the middle mouse button does.",
        choices: [
          ["open-tab", "Open tab", "Open in a background tab"],
          ["unload", "Unload", "Unload from memory"],
        ],
      },
      {
        field: "containerBorder",
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
        field: "tooltip",
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
        field: "tooltipFullUrl",
        title: "Show full URL in tooltip",
        text: "The whole address, instead of just the site.",
      },
    ],
  },
  {
    title: "Web panel toolbar",
    controls: [
      {
        field: "autoHideForwardButton",
        title: "Auto-hide forward button",
        text: "Show it only when there's a page to go forward to.",
      },
      {
        field: "autoHideBackButton",
        title: "Auto-hide back button",
        text: "Show it only when there's a page to go back to.",
      },
    ],
  },
  {
    title: "Links, bookmarks and tabs",
    controls: [
      {
        field: "showOpenInSidebarItems",
        title: "Show “Open in Second Sidebar”",
        text: "In the right-click menus of links, bookmarks and tabs.",
      },
      {
        field: "showPreviewInSidebarItems",
        title: "Show “Preview in Second Sidebar”",
        text: "Opens it in a temporary panel instead.",
      },
      {
        field: "linkClickModifier",
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
        field: "hideSidebarAnimated",
        title: "Animate sidebar",
        text: "Slide the sidebar in and out.",
      },
      {
        field: "hideToolbarAnimated",
        title: "Animate web panel toolbar",
        text: "Slide a panel's toolbar in and out.",
      },
    ],
  },
];

/**
 * The sidebar's keyboard shortcuts, on their own card: they're kept in the
 * sidebar settings; the page sets them through the browser window's
 * SettingsPageController.
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
