# Zen Second Sidebar Enhanced

> [!NOTE]
> This is a fork of [aminought/firefox-second-sidebar](https://github.com/aminought/firefox-second-sidebar), adapted for **Zen Browser** on top of Zen compatibility work from [Ezo-mas/zen-second-sidebar-fix](https://github.com/Ezo-mas/zen-second-sidebar-fix). Compared to upstream, this fork additionally provides:
>
> - Full Zen Browser layout support (vertical tabs, split view, workspaces, compact mode, and both sidebar sides) alongside standard Firefox.
> - Web panel setting: `Reload when address changes` — reloads the open web panel when the main browser's active tab is switched or navigated to a different site; a closed panel reloads when you next open it, if the site changed in the meantime. For example, with a Bitwarden panel this reloads its vault view as you switch tabs, so it's always showing logins for whichever site you're currently on.
> - Web panel setting: `User Agent` — choose what a panel identifies itself as: the browser's own, Firefox Mobile, a Galaxy phone or tablet, an iPhone, or a user agent you type in — see [User agent](#user-agent).
> - Web panel setting: `Spaces` — show a web panel only in the Zen spaces (workspaces) you pick — see [Spaces](#spaces).
> - Web panel setting: `Unload after inactivity` — automatically unloads a panel that's been in the background for a set time, without relying on Firefox's own background tab unloader (which isn't reliable for panels living in the hidden window that hosts them).
> - Web panel presets: pick a common site (ChatGPT, WhatsApp, Telegram...) or an installed extension's sidebar (e.g. Bitwarden) when adding a panel — see [Presets](#presets).
> - Tabs, bookmarks and History entries can be opened or previewed in the sidebar from their right-click menu, and Alt+Shift+click previews a link or bookmark — see [Links, bookmarks and tabs](#links-bookmarks-and-tabs).
> - Keyboard shortcuts to open the next or previous web panel — see [Keyboard shortcuts](#keyboard-shortcuts).
> - Sidebar setting: `Export settings` / `Import settings` — back up or restore the sidebar and all web panel settings as a single JSON file.
> - [Sine](https://github.com/CosmoCreeper/Sine) mod support (`theme.json`) alongside fx-autoconfig, so the script can be installed without manually copying files.
> - Windows GPU compositing fix so web panels don't render as a blank frame when switching.

A Zen userChrome.js script that brings a second sidebar with web panels like in Vivaldi/Edge/Floorp but better.

Everything you can do with web panels and the sidebar is listed under [Using it](#using-it) and [Settings](#settings). Changes in this fork are listed in the [changelog](CHANGELOG.md).

<img width="2200" height="2131" alt="promo-rounded" src="https://github.com/user-attachments/assets/020ee8cf-1f3d-4184-98fe-889be89d6145" />

## Installation

Second Sidebar is made for current versions of Zen and Firefox: the Firefox code it adjusts is checked every week against Firefox release, beta and Nightly. Older versions may work, but aren't tested.

Pick whichever loader you already use (or prefer) — both install the exact same script.

### Sine

1. Install [Sine](https://github.com/CosmoCreeper/Sine) if you haven't already.
2. In Sine's mod manager, add a mod from a repository and enter:
   ```
   sinazadeh/zen-second-sidebar-enhanced
   ```
3. In `about:config`, set `sine.allow-unsafe-js` to `true`. This isn't specific to Second Sidebar: Sine only runs JavaScript automatically for mods installed from its own reviewed marketplace; anything added directly from a repository (like this, until/unless it's published there) needs this explicitly enabled, or its script is silently never loaded at all.
4. Enable `toolkit.legacyUserProfileCustomizations.stylesheets` and `dom.allow_scripts_to_close_windows` in `about:config` if not already enabled.
5. Restart the browser.

### fx-autoconfig (manual)

1. Install [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig).
2. Copy the contents of the `src/` directory (`second_sidebar/` and `second_sidebar.uc.mjs`) into `chrome/JS/`. Each [release](https://github.com/sinazadeh/zen-second-sidebar-enhanced/releases) also has them as a zip.
3. Enable `toolkit.legacyUserProfileCustomizations.stylesheets` and `dom.allow_scripts_to_close_windows` in `about:config`.
4. [Clear](https://github.com/MrOtherGuy/fx-autoconfig?tab=readme-ov-file#deleting-startup-cache) startup-cache.
5. Have fun!

## Using it

- **Add a web panel** with the **New Web Panel** (**+**) button in the sidebar: enter a URL or pick a [preset](#presets), and optionally a Multi-Account Container. Click a panel's button to open it, and again to close it.
- **Right-click a panel's button** to open its page in a new tab (**Open in New Tab**; Ctrl+click it to open the tab in the background), edit it (**Edit web panel**), make a copy of it (**Duplicate web panel**, with all its settings except its keyboard shortcut — handy for the same site in another container), unload it from memory, mute it, reset its position and size, delete it, or rearrange the sidebar (**Customize Toolbar...**). Middle-click the button to unload the panel.
- **Right-click the sidebar** for **Sidebar settings** and **Mute all web panels** (or **Unmute all web panels** when they're all muted), which mutes every loaded panel, in every window.
- **The panel's toolbar** has Back, Forward, Reload, Home, **Pin**/**Unpin** (switch between floating over the page and pinned beside it) and **Unload**. Its **More** menu has **Open in New Tab**, **Copy Page URL**, the [user agent](#user-agent), **Always On Top**, **Temporary** and zoom.
- **Move** a floating panel by dragging its title in the toolbar, and **resize** it by dragging its edges or corners. Resize a pinned one by dragging the splitter beside it.
- A panel's button shows a badge with the unread count from its page title, such as "(3) Inbox", and a speaker icon while it plays sound.
- **The Second Sidebar button** (add it to a toolbar with **Customize Toolbar...**) shows or hides the sidebar.

## Settings

Right-click the sidebar and choose **Sidebar settings**. With Sine, the same settings are also on Sine's mod page: click the gear button of **Zen Second Sidebar Enhanced**. Changes there apply right away, like in the popup. Keyboard shortcuts and settings export/import are only in the popup.

| Section                   | Settings                                                                                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| General                   | **Position** (left or right) • **Width** • **Allow window dragging**                                                                                                                                            |
| Visibility                | **Auto-hide sidebar** and its **Auto-hide behavior** (inline or overlay) • **Keep gap at window edge** (Zen, with overlay) • **Hide web panel when sidebar is hidden** • a shortcut to show or hide the sidebar |
| Web panel                 | **Default floating panel offset** • **New panel position** (before or after the + button) • **New panels show in** (Zen: all spaces, or the current one) • **Show geometry hint** while moving or resizing      |
| Shortcuts                 | **Open/close last active web panel** • **Open next web panel** • **Open previous web panel** (see [Keyboard shortcuts](#keyboard-shortcuts))                                                                    |
| Web panel button          | **Container indicator** • **Tooltip** (off, title, URL, or both) • **Show full URL in tooltip**                                                                                                                 |
| Web panel toolbar         | **Auto-hide back button** • **Auto-hide forward button**                                                                                                                                                        |
| Links, bookmarks and tabs | Show **Open…** and **Preview… in Second Sidebar** in right-click menus • **Preview on click with** (see [below](#links-bookmarks-and-tabs))                                                                     |
| Animations                | **Animate sidebar** • **Animate web panel toolbar**                                                                                                                                                             |
| Backup                    | **Export settings** and **Import settings** (see [Backup](#backup))                                                                                                                                             |

Each web panel has its own settings in **Edit web panel** (right-click its button):

| Section           | Settings                                                                                                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| General           | **URL** • **Multi-Account Container** • **Temporary** (removed when closed) • **[User Agent](#user-agent)** • **Zoom**                                                                                                            |
| Spaces            | In Zen, **All spaces**, or only the spaces you pick (see [Spaces](#spaces))                                                                                                                                                       |
| Title, Favicon    | Follow the page (**Dynamic**), or set your own                                                                                                                                                                                    |
| Position and size | **Mode** (floating or pinned) • **Always on top** • **Position anchor** • **Horizontal**/**Vertical offset** • **Width** • **Height**                                                                                             |
| Loading           | **Load into memory at startup** • **Restore last opened page** • **Unload from memory after closing** • **Unload after inactivity** • **Periodic reload** • **Reload when address changes** (when the current tab's site changes) |
| Keyboard shortcut | Opens and closes this panel                                                                                                                                                                                                       |
| CSS selector      | Shows only the part of the page that matches it                                                                                                                                                                                   |
| Hide elements     | **Hide toolbar** • **Hide sound icon** • **Hide notification badge**                                                                                                                                                              |

## Spaces

In Zen, a web panel shows in all your spaces (workspaces) unless you limit it: in **Edit web panel**, turn off **All spaces** and turn on the spaces it belongs in. Each window follows its own active space:

- Switching to a space a panel isn't in hides its button. If the panel was open, it closes, which unloads it if **Unload from memory after closing** is on.
- Coming back to a space opens the panel you had open there again, unless a panel shown in every space is still open.
- Changes to the spaces of the panel you're editing apply when you close **Edit web panel**, so it doesn't disappear while you edit it.
- Its keyboard shortcut, and **Open next/previous web panel**, skip it there too.
- While you customize the toolbar, every panel's button shows, so you can still move them.
- If all the spaces a panel was limited to are deleted, it shows in every space again.

New panels show in every space. To start them in the space you're in instead (when you add one, or open a link, tab or bookmark in the sidebar), set **Sidebar settings → New panels show in** to **Current Space**.

Firefox has no spaces, so these settings aren't there.

## Keyboard shortcuts

None are set by default. Click a shortcut box in the settings and press the keys; shortcuts follow the key's position, so they keep working when you switch keyboard layouts. A shortcut that's already taken (by another web panel or sidebar action) is refused.

- **Show or hide the sidebar**: **Sidebar settings → Visibility**.
- **Open/close last active web panel**, **Open next web panel** and **Open previous web panel**: **Sidebar settings**. Next and previous go through the panels in the order of their buttons, wrapping around at the ends; with no panel open, they open the first or the last one.
- **Open or close one web panel**: **Edit web panel → Keyboard shortcut**.

They work in the browser window and inside web panels, but not while a settings popup is open. Pick keys Zen or Firefox don't already use, or the browser's own shortcut may run as well.

## Links, bookmarks and tabs

- Right-click a link and choose **Open Link in Second Sidebar** to add it as a web panel, or **Preview Link in Second Sidebar** to open it in a temporary panel that goes away when you close it.
- Right-click a bookmark (on the bookmarks toolbar or in the Bookmarks menu) or an entry in the History menu for the same two items: **Open in Second Sidebar** and **Preview in Second Sidebar**.
- Right-click a tab for **Open Tab in Second Sidebar** and **Preview Tab in Second Sidebar**, at the end of the menu. The panel opens the tab's page in the same container; the tab stays open. They're not offered for an empty tab, or when several tabs are selected.
- **Alt+Shift+click** a link or a bookmark to preview it.

In **Sidebar settings**, under **Links, bookmarks and tabs**, you can hide either menu item, and change the click to plain **Alt** or turn it off. In Zen, Alt+click also opens Glance, and Glance gets it first: to preview with Alt+click, set Glance's **Trigger method** to another key in Zen's settings (**Glance**).

## Presets

When adding a web panel with **New Web Panel** (**+**), **Preset** offers:

- **Common websites** such as ChatGPT, Claude, Gemini, Gmail, Discord, Slack, WhatsApp, Telegram, Spotify and X. Sites that work better that way (e.g. Telegram, X) open in mobile view, with the **Firefox Mobile** [user agent](#user-agent).
- **Installed extensions' sidebars**, such as Bitwarden's. The panel keeps the extension's own icon, as these pages don't set one. Bitwarden opens on its vault with **Reload when address changes** on, so the vault always shows the logins for the site in your current tab.

Picking one fills in its URL; editing the URL afterwards turns it back into a custom one. A preset only sets the URL, user agent, favicon and whether the panel reloads when the address changes. Everything else (size, position, toolbar, unloading...) starts from the usual defaults, and all of it can be changed later in **Edit web panel** (right-click the panel's button).

### Adding an extension manually

**Preset** only lists extensions that declare a sidebar page. To open another extension page, or a different page of one, enter its address as a custom URL:

1. **Find the extension's internal UUID.** Open `about:debugging#/runtime/this-firefox`, find the extension under _Extensions_ and copy its **Internal UUID** (for example `7dac8263-f522-4a51-a6fc-3d83fdfde20e`). Each profile gives an extension its own random UUID, so look it up again on another profile or after reinstalling the extension.
2. **Build the panel URL** by putting your UUID into the page's address. For Bitwarden's vault:
   ```
   moz-extension://<internal-uuid>/popup/index.html?uilocation=sidebar#/tabs/vault
   ```
   `uilocation=sidebar` makes Bitwarden lay itself out as a sidebar, and `#/tabs/vault` opens the vault tab.
3. **Add the panel** with **New Web Panel**, entering this URL. Its icon is picked up from the extension as well; if the page later shows a generic icon, turn off **Dynamic** favicon in **Edit web panel**. For Bitwarden, also turn on **Reload when address changes** there.

If the button still shows a generic icon, you can point **Favicon URL** (in **Edit web panel**) at the icon inside the extension's `.xpi` file, which is in the `extensions` folder of your profile (`about:support` → _Profile Folder_). Bitwarden's file is always named `{446900e4-71c2-419f-a6a7-df9c091e268b}.xpi`. Turn every `\` in the profile folder path into `/` and every space into `%20`, for example:

```
jar:file:///C:/Users/Me/AppData/Roaming/zen/Profiles/abcd1234.Default%20(release)/extensions/{446900e4-71c2-419f-a6a7-df9c091e268b}.xpi!/images/icon32.png
```

On Linux or macOS the profile folder already starts with `/`, so it becomes `jar:file:///home/me/...`. Pasting the URL into the address bar should show the icon; if it doesn't, check the path.

## User agent

**User Agent** in **Edit web panel** (right-click the panel's button) sets what a web panel tells websites it is, which decides whether a site shows its mobile or desktop version:

- **Default**: the browser's own, like a normal tab.
- **Firefox Mobile**: Firefox for Android, matching your browser's version. Use this for a site's mobile version.
- **Galaxy Phone** / **Galaxy Tab**: Samsung Internet on a Galaxy phone or tablet. Galaxy Tab gets a site's tablet version where it has one.
- **iPhone**: Safari on an iPhone.
- **Custom**: the user agent you enter in the box that appears.

The panel reloads when you change it. The **More** menu in the panel's toolbar has the same list, without the box for a custom user agent: enter one in **Edit web panel** first. Panels that had **Mobile View** on in older versions use **Firefox Mobile**.

## Backup

Use **Export settings** / **Import settings** (sidebar settings popup) to save or restore the sidebar and every web panel's settings as one JSON file. This covers configuration only, not per-panel state like the last-opened URL. Importing checks the file, writes its settings to disk and offers to restart the browser, which is when they take effect. Until the restart, other changes to the sidebar or web panels aren't saved, so they can't overwrite the import.

### Where your data is stored

- Sidebar settings: the `second-sidebar.settings` preference (`about:config`). Each of them except keyboard shortcuts is also copied to its own preference, such as `second-sidebar.position`, which is what Sine's settings page changes (changing one in `about:config` works too).
- Web panels and their state (e.g. last URL): `web-panels.json` and `web-panels-state.json` in the `chrome/second-sidebar-data/` folder of your profile (`about:support` → _Profile Folder_). This folder is outside the script itself, so updating or reinstalling the script keeps it.

If one of these can't be read (for example after a crash while saving), the sidebar starts with defaults and keeps a copy of the unreadable data next to it, named `*.corrupt-<date>.json` (or a `second-sidebar.settings.corrupt` preference).

## Uninstall

1. Remove the mod in Sine, or delete `second_sidebar.uc.mjs` and `second_sidebar/` from `chrome/JS/` (fx-autoconfig), then restart the browser.
2. Optionally delete your data too: the `chrome/second-sidebar-data/` folder in your profile, and any `second-sidebar.*` preferences in `about:config`.

## Demo

https://github.com/user-attachments/assets/cd79d644-ca2c-4a30-ae8e-c265f41768b6

## Troubleshooting

The Browser Console (`Ctrl+Shift+J` / `Cmd+Shift+J`) logs the sidebar's startup sequence and any errors by default. For more detail when reporting a bug (web panel lifecycle, per-setting change events, etc.), set `second-sidebar.debug-logging` to `true` in `about:config` and reproduce the issue again.

- **Installed with Sine, but the sidebar never appears and the console shows nothing about it:** check that `sine.allow-unsafe-js` is `true` in `about:config` (see [Installation](#sine)). Without it, Sine silently never loads scripts from mods added by repository.
- **It stopped working after installing Sine on another profile:** Sine and fx-autoconfig each replace a single bootstrap file shared by every profile of the same browser installation, so setting up one of them can turn off the other for all profiles. Use the same loader on every profile of that installation (for example, install Second Sidebar through Sine here too).
- **A warning says a patch "no longer applies":** a browser update changed Firefox code this script adjusts, and the related feature may misbehave. Please [open an issue](https://github.com/sinazadeh/zen-second-sidebar-enhanced/issues/new?template=bug_report.yml) with the warning and your browser version.
- **Settings popups are cut off at the bottom of the screen:** on Wayland, popups open towards whichever side of the sidebar button (or right-click) has more room, and scroll to fit. Firefox keeps popups on screen by itself elsewhere, so this is automatic only on Wayland; set `second-sidebar.fit-popups-to-window` to `true` in `about:config` to turn it on anyway, or `false` to turn it off. If the Save button is still out of reach, please report it with your OS and window manager.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, checks, patch-target verification and the browser scenarios to exercise before opening a pull request.
