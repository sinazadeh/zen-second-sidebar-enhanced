# Optional agent and browser tools

The browser script has no build step or runtime npm dependency. These tools are
an optional, repository-local development layer for design work and browser-page
validation.

## Install

Node 22 or newer and Git are required. From the repository root, run:

```sh
node scripts/setup_agent_tools.mjs
```

That command installs pinned snapshots of the configured skills under
`.agents/skills/`, copies the design-reference library to `.agent-tools/`, and
installs the pinned Playwright package into an isolated, ignored runtime under
`.agent-tools/`. To install Playwright's Chromium build too, use:

```sh
node scripts/setup_agent_tools.mjs --with-browser
```

The generated directories are ignored by Git. The reproducible contract is
[`agent-tools.json`](agent-tools.json), not the downloaded third-party files.
Run the setup command again after changing the manifest; it replaces only the
generated skill directories named there.

Verify an existing installation without network access:

```sh
node scripts/setup_agent_tools.mjs --check
```

## What is included

- `design-taste-frontend` from Taste Skill for frontend critique and polish.
- Vercel's `web-design-guidelines` and `writing-guidelines`, for UI and prose
  review. Second Sidebar is not a React or Vercel application, so the rest of
  that repository is deliberately not installed.
- Awesome Design MD's reference library, alongside the repository-specific
  [`DESIGN.md`](DESIGN.md). The local file is authoritative for this project.
- Playwright for a Chromium smoke test of the settings page outside privileged
  browser chrome.

Run the browser audit after installing Chromium:

```sh
node scripts/check_settings_page_browser.mjs
```

It checks desktop and narrow layouts for startup errors and horizontal overflow,
validates important links, and writes review screenshots to the ignored
`.agent-tools/playwright/` directory. It does not replace manual Firefox and Zen
validation of privileged XUL behavior.

The upstream repositories retain their own licenses. Review those licenses and
the generated output before redistributing any third-party files or assets.
