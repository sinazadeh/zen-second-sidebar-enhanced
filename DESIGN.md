# Second Sidebar design language

This file is the visual contract for Second Sidebar's settings page and browser
chrome. It gives people and coding agents one project-specific reference instead
of borrowing a generic application style.

## Character

Second Sidebar should feel native to Firefox and Zen: compact, calm, functional,
and subordinate to the page the user is browsing. Prefer familiar browser
controls and restrained surfaces over promotional layouts, oversized typography,
glass effects, or decorative animation.

## Foundations

- Use the browser/system UI font stack. Body copy is `14px/1.45`; page titles are
  `26px`; card headings are `16px`.
- Use a 4 px spacing rhythm. The common gaps are 8, 12, 16, 20, and 24 px.
- Settings cards use a 14 px radius, controls normally use 6-10 px, and switches
  and tags may be fully rounded.
- The settings page is capped at 1120 px and uses a two-column layout only when
  there is room. Narrow layouts must stack without horizontal scrolling.
- Motion should explain state and stay under 200 ms. Honor reduced-motion user
  preferences and never require animation to understand a change.

## Color tokens

Use semantic CSS variables rather than copying literal colors into components.

| Role           | Light     | Dark      |
| -------------- | --------- | --------- |
| Page           | `#f4f4f6` | `#18171d` |
| Card           | `#ffffff` | `#222129` |
| Raised control | `#f7f7f9` | `#2a2932` |
| Primary text   | `#1d1c22` | `#ecebf2` |
| Muted text     | `#6d6b78` | `#9a98a8` |
| Accent         | `#6f5ff0` | `#8f82ff` |
| Warning        | `#c5221f` | `#ff6b6b` |

Borders are low-contrast (`10%` black in light mode and `8%` white in dark
mode). Shadows are subtle in light mode and normally absent in dark mode.

## Interaction and accessibility

- Every icon-only action needs an accessible name and a tooltip where its
  meaning is not universal.
- Keep a visible two-pixel accent focus ring for keyboard navigation.
- Do not communicate state with color alone. Pair color with text, shape, icon,
  or control position.
- Maintain at least a 40 px practical pointer target for primary controls in the
  settings page. Browser-chrome controls may follow the surrounding native size.
- Preserve light and dark schemes, forced colors, zoom, and keyboard operation.

## Browser chrome constraints

- Keep XUL and HTML elements distinct and reuse the repository's element wrappers.
- Support both sidebar sides and both `#zen-tabbox-wrapper` and Firefox's
  `#browser` container.
- Derive colors from browser theme variables where browser chrome is involved.
  The settings page may use the semantic tokens above.
- Layout changes must be checked with Zen vertical tabs, compact mode, split
  view, and the sidebar on either side.

## Visual review

Run `node scripts/check_settings_page_browser.mjs` for desktop and narrow-page
screenshots and structural checks. Treat screenshots as review artifacts, not
golden pixel snapshots: native fonts and rendering differ across platforms.
