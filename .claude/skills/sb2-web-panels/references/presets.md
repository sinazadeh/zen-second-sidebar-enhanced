# Web panel presets

Paths are relative to `src/second_sidebar/`. The presets are in
`utils/web_panel_presets.mjs`, tested by `tests/web_panel_presets.test.mjs`.
A preset sets only the URL, user agent, favicon and `reloadOnUrlChange`;
geometry, toolbar and unloading are the user's preference, not the site's.

## Websites

`WEBSITES`, listed alphabetically (the test checks it). `mobile: true` gives
the Firefox Mobile user agent, for sites that work better that way in a
narrow panel. A site's deep link is fine when the site keeps it through
sign-in: iCloud Hide My Email opens `https://www.icloud.com/icloudplus/hidemyemail`,
which iCloud.com's router turns into its Hide My Email window (the iCloud+
page's tile launches it when the path is `hidemyemail`).

## Extensions

- Extension presets are installed extensions with a `sidebar_action` page,
  plus those `EXTENSION_OVERRIDES` gives a `page` for: 1Password has no
  sidebar page, so its popup, `popup/index.html`; the iCloud Hide My Email
  add-on (Dimitrios Dedoussis) and its fork Hide My Email+, `popup.html`.
  Pages are resolved with the extension's policy: the `moz-extension://`
  UUID is random per profile, so never hardcode one.
- A popup in a panel gets the main window's selected tab from
  `tabs.query({ active: true, lastFocusedWindow: true })`, as it does as a
  popup (checked in Zen 1.23.3b with a test add-on). If it reads that tab
  only when it loads (Bitwarden's vault, 1Password, the Hide My Email
  add-ons, which label a new address with the site), turn on
  `reloadOnUrlChange` for it.
- Popups set their own width: 1Password's is 600px (350px in its Simple
  layout), iCloud Hide My Email's 420px, Hide My Email+'s 740px. A floating
  panel is 600px wide by default, so say in the README when a popup needs a
  wider panel.
- Their pages don't set a favicon, so the preset keeps the extension's icon
  fixed (`dynamicFavicon: false`).
