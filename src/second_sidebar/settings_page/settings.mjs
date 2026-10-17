// The settings page (settings.html, opened in a tab by
// controllers/settings_page.mjs). Each control edits one of the mirrored
// sidebar prefs, as Sine's settings dialog does; SidebarPrefsController
// applies and saves the change in every window.

import {
  getSidebarPref,
  isValidSidebarPrefValue,
} from "../settings/sidebar_prefs.mjs";
import { SETTINGS_PAGE_SECTIONS } from "./layout.mjs";

const PREF_DOMAIN = "second-sidebar.";
// Opened outside the browser (as a file), the page keeps its values here.
const inBrowser = typeof Services !== "undefined";
const sampleValues = new Map();

// Padding of the sidebar and offset of floating panels for each size, in
// the preview.
const SIZE_PIXELS = {
  xxsmall: 2,
  xsmall: 4,
  small: 6,
  medium: 9,
  large: 12,
  xlarge: 15,
  xxlarge: 18,
};

const PREVIEW_PANELS = [
  {
    letter: "C",
    color: "#3d8bfd",
    title: "Chat",
    url: "https://chat.example.com/inbox/42",
  },
  {
    letter: "M",
    color: "#e5484d",
    title: "Music",
    url: "https://music.example.com/playlist/daily-mix",
    container: true,
  },
  {
    letter: "N",
    color: "#30a46c",
    title: "Notes",
    url: "https://notes.example.com/shared/ideas",
  },
];

/**
 * @param {string} tag
 * @param {object} props
 * @param {...(Node|string|null|false)} children
 * @returns {HTMLElement}
 */
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") {
      el.className = value;
    } else if (key.startsWith("on")) {
      el.addEventListener(key.slice(2), value);
    } else if (key === "checked") {
      el.checked = !!value;
    } else if (value !== false && value != null) {
      el.setAttribute(key, value === true ? "" : value);
    }
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

/**
 * @param {string} pref
 * @returns {string | boolean | undefined} undefined when the pref is missing
 *   or holds something the sidebar doesn't support
 */
function read(pref) {
  const entry = getSidebarPref(pref);
  let value;
  if (!inBrowser) {
    value = sampleValues.get(pref);
  } else {
    try {
      value = entry.values
        ? Services.prefs.getStringPref(pref)
        : Services.prefs.getBoolPref(pref);
    } catch {
      value = undefined;
    }
  }
  return isValidSidebarPrefValue(entry, value) ? value : undefined;
}

/**
 * @param {string} pref
 * @param {string | boolean} value
 */
function write(pref, value) {
  if (!inBrowser) {
    sampleValues.set(pref, value);
    render();
    return;
  }
  if (typeof value === "boolean") {
    Services.prefs.setBoolPref(pref, value);
  } else {
    Services.prefs.setStringPref(pref, value);
  }
}

/* ---------- controls ---------- */

function renderControl(control) {
  const value = read(control.pref);
  const text = h(
    "span",
    { class: "option-text" },
    h(
      "span",
      { class: "option-title" },
      control.title,
      control.zenOnly ? h("span", { class: "tag" }, "Zen") : null,
    ),
    h("span", { class: "muted" }, control.text),
  );
  if (!control.choices) {
    return h(
      "label",
      { class: "option" },
      text,
      h("input", {
        type: "checkbox",
        class: "switch",
        checked: value === true,
        onchange: (e) => write(control.pref, e.target.checked),
      }),
    );
  }
  return h(
    "div",
    { class: "option" },
    text,
    h(
      "div",
      { class: "segmented", role: "group", "aria-label": control.title },
      control.choices.map(([choice, label, longLabel]) =>
        h(
          "button",
          {
            type: "button",
            class: choice === value ? "selected" : "",
            "aria-pressed": String(choice === value),
            title: longLabel ?? null,
            onclick: () => write(control.pref, choice),
          },
          label,
        ),
      ),
    ),
  );
}

function renderSections() {
  const focused = document.activeElement;
  const focusKey = focused?.closest?.(".option")?.dataset.pref;
  document.getElementById("sections").replaceChildren(
    ...SETTINGS_PAGE_SECTIONS.map((section) =>
      h(
        "section",
        { class: "card" },
        h("h2", {}, section.title),
        section.hint ? h("p", { class: "muted" }, section.hint) : null,
        h(
          "div",
          { class: "options" },
          section.controls.map((control) => {
            const el = renderControl(control);
            el.dataset.pref = control.pref;
            return el;
          }),
        ),
      ),
    ),
  );
  // Keep keyboard focus on the control that was just changed.
  if (focusKey) {
    const option = document.querySelector(
      `.option[data-pref="${CSS.escape(focusKey)}"]`,
    );
    option?.querySelector("input, button.selected, button")?.focus();
  }
}

/* ---------- preview ---------- */

function tooltipContent(panel, mode, fullUrl) {
  const url = fullUrl ? panel.url : new URL(panel.url).host;
  switch (mode) {
    case "title":
      return [h("div", {}, panel.title)];
    case "url":
      return [h("div", { class: "url" }, url)];
    case "titleandurl":
      return [h("div", {}, panel.title), h("div", { class: "url" }, url)];
    default:
      return null;
  }
}

function renderPreview() {
  const position = read("second-sidebar.position") ?? "right";
  const pad = SIZE_PIXELS[read("second-sidebar.width") ?? "small"];
  const offset =
    SIZE_PIXELS[read("second-sidebar.default-floating-offset") ?? "small"];
  const autoHide = read("second-sidebar.auto-hide") === true;
  const overlay =
    autoHide && read("second-sidebar.auto-hide-behavior") === "overlay";
  const gap = overlay && read("second-sidebar.auto-hide-edge-gap") !== false;
  const indicator = read("second-sidebar.container-indicator") ?? "off";
  const tooltip = read("second-sidebar.tooltip") ?? "titleandurl";
  const fullUrl = read("second-sidebar.tooltip-full-url") === true;
  const newAfterPlus =
    read("second-sidebar.new-web-panel-position") === "after";
  const hideBack = read("second-sidebar.auto-hide-back-button") === true;
  const hideForward = read("second-sidebar.auto-hide-forward-button") === true;

  const preview = document.getElementById("preview");
  preview.className = `preview ${position}`;
  const button = 30;
  preview.style.setProperty("--pad", `${pad}px`);
  preview.style.setProperty("--button", `${button}px`);
  preview.style.setProperty("--offset", `${offset}px`);

  const buttons = PREVIEW_PANELS.map((panel, i) =>
    h(
      "div",
      {
        class: `p-button${i === 0 ? " open" : ""}`,
        style: `--c: ${panel.color}`,
      },
      panel.letter,
      panel.container && indicator !== "off"
        ? h("span", { class: `indicator ${indicator}` })
        : null,
      tooltip !== "off"
        ? h(
            "div",
            { class: "p-tooltip" },
            tooltipContent(panel, tooltip, fullUrl),
          )
        : null,
    ),
  );
  const plus = h("div", { class: "p-new", title: "New web panel" }, "+");
  // Where the next new panel's button goes.
  const slot = h("div", {
    class: "p-button p-slot",
    title: "A new panel's button goes here",
  });
  const sidebar = h(
    "div",
    {
      class: `p-sidebar${autoHide ? " auto-hide" : ""}${overlay ? " overlay" : ""}${gap ? " gap" : ""}`,
      title: autoHide
        ? "Hidden until you move the mouse to this edge of the window"
        : null,
    },
    ...buttons,
    ...(newAfterPlus ? [plus, slot] : [slot, plus]),
  );

  // A floating panel next to the sidebar, at the default offset.
  const sidebarWidth = overlay ? 0 : button + pad * 2 + 8;
  // Its toolbar: back and forward hide when set to (nothing to go back or
  // forward to in the preview).
  const panel = h(
    "div",
    { class: "p-panel", title: "The open panel, floating" },
    h(
      "div",
      { class: "bar" },
      h("span", { class: `nav${hideBack ? " gone" : ""}` }, "←"),
      h("span", { class: `nav${hideForward ? " gone" : ""}` }, "→"),
      h("span", { class: "nav" }, "↻"),
      h("span", { class: "title" }, PREVIEW_PANELS[0].title),
    ),
    h("div", { class: "lines" }, h("span"), h("span"), h("span")),
  );
  panel.style.setProperty(
    position,
    `calc(8px + ${sidebarWidth}px + var(--offset))`,
  );

  preview.replaceChildren(h("div", { class: "p-page" }), sidebar, panel);
}

/* ---------- page ---------- */

function render() {
  renderSections();
  renderPreview();
}

const missing = SETTINGS_PAGE_SECTIONS.flatMap((s) => s.controls).some(
  (control) => read(control.pref) === undefined,
);
document.getElementById("not-running").hidden = !inBrowser || !missing;

if (inBrowser) {
  // Changes made elsewhere: another window, the sidebar's popup, Sine.
  const observer = { observe: () => render() };
  Services.prefs.addObserver(PREF_DOMAIN, observer);
  window.addEventListener(
    "unload",
    () => Services.prefs.removeObserver(PREF_DOMAIN, observer),
    { once: true },
  );
}

render();
