// The settings page (settings.html, opened in a tab by
// controllers/settings_page.mjs). It applies settings through the browser
// window's `SecondSidebarSettingsPage` API; the controller sends each change
// to every window and saves the main SidebarSettings object.

import { SETTINGS_PAGE_SECTIONS, SETTINGS_PAGE_SHORTCUTS } from "./layout.mjs";
import {
  SHORTCUT_INPUT_ATTRIBUTE,
  getShortcutPartsFromEvent,
} from "../utils/keyboard.mjs";
import { SidebarSettings } from "../settings/sidebar_settings.mjs";

// Opened outside the browser (as a file), the page keeps its values here.
const inBrowser = typeof Services !== "undefined";
const sampleSettings = new SidebarSettings({}).toObject();
let currentSettings = sampleSettings;

// A system-principal chrome:// page cannot directly navigate a new content
// tab to an https: URL. Let the browser window open these known web links;
// ordinary anchors remain the fallback when the page is opened as a file.
for (const link of document.querySelectorAll(".support-link")) {
  link.addEventListener("click", (event) => {
    if (sidebar()?.openSupportPage(link.href)) {
      event.preventDefault();
    }
  });
}

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
 * @param {string} field
 * @returns {string | boolean | undefined}
 */
function read(field) {
  return currentSettings?.[field];
}

/**
 * @param {string} field
 * @param {string | boolean} value
 */
function write(field, value) {
  if (!inBrowser) {
    sampleSettings[field] = value;
    render();
    return;
  }
  sidebar()?.setSetting(field, value);
}

/* ---------- controls ---------- */

function renderControl(control) {
  const value = read(control.field);
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
        onchange: (e) => write(control.field, e.target.checked),
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
            onclick: () => write(control.field, choice),
          },
          label,
        ),
      ),
    ),
  );
}

function renderSections() {
  const focused = document.activeElement;
  const focusKey = focused?.closest?.(".option")?.dataset.field;
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
            el.dataset.field = control.field;
            return el;
          }),
        ),
      ),
    ),
  );
  // Keep keyboard focus on the control that was just changed.
  if (focusKey) {
    const option = document.querySelector(
      `.option[data-field="${CSS.escape(focusKey)}"]`,
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
  const position = read("position") ?? "right";
  const pad = SIZE_PIXELS[read("padding") ?? "small"];
  const offset = SIZE_PIXELS[read("defaultFloatingOffset") ?? "small"];
  const autoHide = read("autoHideSidebar") === true;
  const overlay = autoHide && read("autoHideSidebarBehavior") === "overlay";
  const gap = overlay && read("autoHideEdgeGap") !== false;
  const overlayGap = overlay ? (read("autoHideOverlayGap") ?? "small") : "off";
  const indicator = read("containerBorder") ?? "off";
  const tooltip = read("tooltip") ?? "titleandurl";
  const fullUrl = read("tooltipFullUrl") === true;
  const newAfterPlus = read("newWebPanelPosition") === "after";
  const hideBack = read("autoHideBackButton") === true;
  const hideForward = read("autoHideForwardButton") === true;

  const preview = document.getElementById("preview");
  preview.className = `preview ${position}`;
  const button = 30;
  preview.style.setProperty("--pad", `${pad}px`);
  preview.style.setProperty("--button", `${button}px`);
  preview.style.setProperty("--offset", `${offset}px`);
  preview.style.setProperty(
    "--overlay-gap",
    `${SIZE_PIXELS[overlayGap] ?? 0}px`,
  );

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
      class: `p-sidebar${autoHide ? " auto-hide" : ""}${overlay ? " overlay" : ""}${gap ? " gap" : ""}${overlayGap !== "off" ? " clearance" : ""}`,
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

/* ---------- the sidebar ---------- */

/**
 * What the sidebar offers this page: the one in the window this tab is in,
 * or else in any window.
 *
 * @returns {object?} SettingsPageController's `SecondSidebarSettingsPage`
 */
function sidebar() {
  if (!inBrowser) {
    return null;
  }
  const own = window.browsingContext?.topChromeWindow;
  if (own?.SecondSidebarSettingsPage) {
    return own.SecondSidebarSettingsPage;
  }
  for (const win of Services.wm.getEnumerator("navigator:browser")) {
    if (win.SecondSidebarSettingsPage) {
      return win.SecondSidebarSettingsPage;
    }
  }
  return null;
}

/**
 * @param {string} id a status line's id
 * @param {string} text "" to clear it
 * @param {{error?: boolean}} [options]
 */
function setStatus(id, text, { error = false } = {}) {
  const status = document.getElementById(id);
  status.textContent = text;
  status.classList.toggle("error", error);
}

/* ---------- keyboard shortcuts ---------- */

// Keys that only go with another one.
const MODIFIER_KEYS = [
  "Alt",
  "AltGraph",
  "CapsLock",
  "Control",
  "Meta",
  "OS",
  "Shift",
];

/**
 * @param {string} field
 * @param {string} shortcut "" for none
 */
function saveShortcut(field, shortcut) {
  try {
    sidebar().setShortcut(field, shortcut);
    setStatus("shortcut-status", "");
  } catch (error) {
    console.error("Second Sidebar: failed to set a shortcut", error);
    setStatus(
      "shortcut-status",
      "The shortcut couldn't be saved. See the Browser Console for details.",
      { error: true },
    );
  }
}

/**
 * Records the keys pressed in a shortcut box, as Edit web panel does:
 * Escape too, and by the keys' places on the keyboard.
 *
 * @param {KeyboardEvent} event
 * @param {string} field
 */
function recordShortcut(event, field) {
  if (MODIFIER_KEYS.includes(event.key)) {
    return; // Wait for the key they go with.
  }
  if (
    event.key === "Tab" &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey
  ) {
    return; // Leaves the box.
  }
  event.preventDefault();
  event.stopPropagation();
  const plain =
    !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
  if (plain && (event.key === "Backspace" || event.key === "Delete")) {
    saveShortcut(field, "");
    return;
  }
  const api = sidebar();
  if (!api) {
    return;
  }
  const shortcut = getShortcutPartsFromEvent(event).join("+");
  if (api.isShortcutBusy(field, shortcut, event)) {
    setStatus(
      "shortcut-status",
      `${shortcut} is already a shortcut of the sidebar or of a web panel.`,
      { error: true },
    );
    return;
  }
  saveShortcut(field, shortcut);
}

function renderShortcuts() {
  const container = document.getElementById("shortcuts");
  if (!container.childElementCount) {
    container.append(
      ...SETTINGS_PAGE_SHORTCUTS.map((control) =>
        h(
          "div",
          { class: "option", "data-shortcut": control.field },
          h(
            "span",
            { class: "option-text" },
            h("span", { class: "option-title" }, control.title),
            h("span", { class: "muted" }, control.text),
          ),
          h(
            "span",
            { class: "shortcut" },
            h("input", {
              type: "text",
              readonly: true,
              [SHORTCUT_INPUT_ATTRIBUTE]: true,
              placeholder: "Not set",
              "aria-label": control.title,
              onkeydown: (event) => recordShortcut(event, control.field),
              onfocus: (event) => (event.target.placeholder = "Press keys…"),
              onblur: (event) => (event.target.placeholder = "Not set"),
            }),
            h(
              "button",
              {
                type: "button",
                title: "Clear",
                "aria-label": `Clear: ${control.title}`,
                onclick: () => saveShortcut(control.field, ""),
              },
              "✕",
            ),
          ),
        ),
      ),
    );
  }
  // Updated in place, so a box keeps the focus.
  const api = sidebar();
  const shortcuts = api?.getShortcuts() ?? {};
  for (const control of SETTINGS_PAGE_SHORTCUTS) {
    const row = container.querySelector(`[data-shortcut="${control.field}"]`);
    const shortcut = shortcuts[control.field] ?? "";
    const input = row.querySelector("input");
    input.value = shortcut;
    input.disabled = !api;
    row.querySelector("button").hidden = !shortcut;
  }
}

/* ---------- backup ---------- */

// A backup is a few kilobytes; anything much bigger isn't one.
const MAX_BACKUP_SIZE = 10 * 1024 * 1024;

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * @param {{sidebar: boolean, webPanels: boolean}} parts
 * @param {number} webPanels how many
 * @returns {string} e.g. "the sidebar settings and 3 web panels"
 */
function describeParts(parts, webPanels) {
  return [
    parts.sidebar && "the sidebar settings",
    parts.webPanels && plural(webPanels, "web panel"),
  ]
    .filter(Boolean)
    .join(" and ");
}

const backupDialog = document.getElementById("backup-dialog");

/**
 * Asks which parts of the settings to export, or to restore from a backup.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.text
 * @param {string?} options.sidebar what the sidebar settings switch does,
 *   null to leave it out
 * @param {string?} options.webPanels the same for web panels
 * @param {string} options.note
 * @param {string} options.ok the button's label
 * @returns {Promise<{sidebar: boolean, webPanels: boolean}?>} the parts
 *   chosen, null if cancelled
 */
function askParts({ title, text, sidebar, webPanels, note, ok }) {
  document.getElementById("backup-dialog-title").textContent = title;
  document.getElementById("backup-dialog-text").textContent = text;
  document.getElementById("backup-dialog-note").textContent = note;
  const okButton = document.getElementById("backup-dialog-ok");
  okButton.textContent = ok;
  const switches = Object.entries({
    sidebar: ["backup-sidebar", sidebar],
    webPanels: ["backup-web-panels", webPanels],
  }).map(([part, [id, description]]) => {
    const row = document.getElementById(id);
    row.hidden = description === null;
    row.querySelector(".muted").textContent = description ?? "";
    const input = row.querySelector("input");
    input.checked = description !== null;
    return [part, input];
  });
  // At least one, or there's nothing to do.
  const update = () =>
    (okButton.disabled = !switches.some(([, input]) => input.checked));
  for (const [, input] of switches) {
    input.onchange = update;
  }
  update();

  backupDialog.returnValue = "";
  backupDialog.showModal();
  return new Promise((resolve) =>
    backupDialog.addEventListener(
      "close",
      () =>
        resolve(
          backupDialog.returnValue === "ok"
            ? Object.fromEntries(
                switches.map(([part, input]) => [part, input.checked]),
              )
            : null,
        ),
      { once: true },
    ),
  );
}

/**
 * Where to save a backup, picked in the browser's Save dialog (a chrome://
 * page can't start a download with <a download>).
 *
 * @param {string} name the suggested file name
 * @returns {Promise<string?>} its path, null if cancelled
 */
function pickSaveFile(name) {
  const { nsIFilePicker } = Ci;
  const picker = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
  picker.init(
    window.browsingContext,
    "Export Second Sidebar settings",
    nsIFilePicker.modeSave,
  );
  picker.defaultString = name;
  picker.defaultExtension = "json";
  picker.appendFilter("JSON", "*.json");
  return new Promise((resolve) =>
    picker.open((result) =>
      resolve(result === nsIFilePicker.returnCancel ? null : picker.file.path),
    ),
  );
}

async function exportBackup() {
  const api = sidebar();
  if (!api) {
    return;
  }
  const count = api.exportSettings({ sidebar: false, webPanels: true })
    .webPanels.length;
  const parts = await askParts({
    title: "Export settings",
    text: "Choose what to save in the backup.",
    sidebar: "The settings on this page, keyboard shortcuts included.",
    webPanels: count
      ? `Your ${plural(count, "web panel")}, each with its own settings, in the order of their buttons.`
      : "You have no web panels yet.",
    note: "",
    ok: "Export…",
  });
  if (!parts) {
    return;
  }
  let path;
  try {
    const data = api.exportSettings(parts);
    path = await pickSaveFile(
      `second-sidebar-settings-${new Date().toISOString().slice(0, 10)}.json`,
    );
    if (!path) {
      return;
    }
    await IOUtils.writeUTF8(path, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Second Sidebar: failed to export settings", error);
    setStatus(
      "backup-status",
      "The backup couldn't be saved. See the Browser Console for details.",
      { error: true },
    );
    return;
  }
  setStatus(
    "backup-status",
    `Exported ${describeParts(parts, count)} to ${PathUtils.filename(path)}.`,
  );
}

/**
 * @param {File} file
 */
async function importBackup(file) {
  const api = sidebar();
  if (!api) {
    return;
  }
  let data;
  let contents;
  try {
    if (file.size > MAX_BACKUP_SIZE) {
      throw new Error("it's too big to be a backup");
    }
    data = JSON.parse(await file.text());
    contents = api.readBackup(data);
  } catch (error) {
    setStatus("backup-status", `Can't import ${file.name}: ${error.message}.`, {
      error: true,
    });
    return;
  }

  const { invalidSettings } = contents;
  let note =
    "They apply after the browser restarts. Until then, changes to the sidebar and web panels aren't saved.";
  if (invalidSettings.length > 0) {
    console.warn(
      "Second Sidebar: the backup has settings with invalid values, which get their defaults:",
      invalidSettings,
    );
    note = `${
      invalidSettings.length === 1
        ? "One setting in it has a value this version can't use; it gets its default"
        : `${invalidSettings.length} settings in it have values this version can't use; they get their defaults`
    } (listed in the Browser Console). ${note}`;
  }
  const exportedAt = Date.parse(data.exportedAt);
  const parts = await askParts({
    title: "Import settings",
    text: `Choose what to restore from ${file.name}${
      Number.isNaN(exportedAt)
        ? ""
        : `, saved ${new Date(exportedAt).toLocaleString()}`
    }.`,
    sidebar: contents.sidebar
      ? "Replace the settings on this page and the keyboard shortcuts with the backup's."
      : null,
    webPanels:
      contents.webPanels === null
        ? null
        : `Replace your web panels with the backup's ${plural(contents.webPanels, "web panel")}.`,
    note,
    ok: "Import",
  });
  if (!parts) {
    return;
  }
  try {
    await api.restoreBackup(data, parts);
  } catch (error) {
    console.error("Second Sidebar: failed to import settings", error);
    setStatus(
      "backup-status",
      "The settings couldn't be written. See the Browser Console for details. Restart the browser before changing any settings: until then, changes to the sidebar and web panels aren't saved.",
      { error: true },
    );
    return;
  }
  setStatus(
    "backup-status",
    `Imported ${describeParts(parts, contents.webPanels ?? 0)} from ${file.name}.`,
  );
  document.getElementById("restart-banner").hidden = false;
}

/* ---------- page ---------- */

function render() {
  currentSettings = inBrowser ? sidebar()?.getSettings() : sampleSettings;
  renderSections();
  renderShortcuts();
  renderPreview();
}

document.getElementById("not-running").hidden =
  !inBrowser || sidebar() !== null;

for (const id of ["backup-export", "backup-import"]) {
  document.getElementById(id).disabled = !sidebar();
}
document
  .getElementById("backup-export")
  .addEventListener("click", exportBackup);
const backupFile = document.getElementById("backup-file");
document
  .getElementById("backup-import")
  .addEventListener("click", () => backupFile.click());
backupFile.addEventListener("change", () => {
  const [file] = backupFile.files;
  // Picking the same file again must fire "change" again.
  backupFile.value = "";
  if (file) {
    importBackup(file);
  }
});
document
  .getElementById("restart")
  .addEventListener("click", () => sidebar()?.restart());

if (inBrowser && sidebar()) {
  // Changes made in another settings page or browser window.
  const stopListening = sidebar().onSettingsChanged(() => render());
  window.addEventListener("unload", stopListening, { once: true });
}

render();
