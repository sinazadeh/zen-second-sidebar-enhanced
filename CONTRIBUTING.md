# Contributing

Thanks for helping improve Zen Second Sidebar Enhanced.

## Development model

- This repository is a privileged Firefox/Zen userChrome.js script, not a WebExtension or a bundled web app.
- There is no build step: deploy the contents of `src/` as-is.
- `theme.json` is the Sine manifest; `src/second_sidebar.uc.mjs` is the entry point.
- The repository intentionally does not track a `package.json` or lockfile. Install development tools ad hoc when you need them.

## Local setup

From the repository root:

```sh
npm install --no-save --package-lock=false eslint@9.7.0 @eslint/js@9.7.0 globals@15 prettier@3.9.9
```

## Checks

Run the checks relevant to your changes:

```sh
npx eslint .
npx prettier --check "src/**/*.mjs" "tests/*.mjs" "scripts/*.mjs" "*.mjs" "*.md" "*.json" ".github/**/*.yml"
node --test "tests/*.test.mjs"
git diff --check
```

If you changed a patcher or `src/second_sidebar/patchers/source_patches.mjs`, also verify the patch targets against current Firefox sources:

```sh
node scripts/check_patch_targets.mjs release beta main
```

## Manual browser validation

Automated tests only cover pure logic. For UI or runtime changes, validate the affected flows in a real browser profile and check the Browser Console for warnings or errors.

Useful scenarios to cover, depending on the change:

- Sidebar startup, show/hide, left/right placement and toolbar customization
- Zen-specific layouts (vertical tabs, compact mode, split view, workspaces, both sidebar sides)
- Web panel create/edit/delete, navigation, close/reopen and temporary panels
- Floating/pinned geometry, resizing, auto-hide and keyboard shortcuts
- Multi-window propagation and persistence
- Permission prompts, passkeys and extension popups

Record the browser version, operating system and scenarios you actually exercised in the pull request.

## Pull requests

- Keep changes focused and avoid unrelated refactors.
- Update `README.md` when user-visible behavior or installation steps change.
- Add tests when a change touches pure logic that can be covered in Node.
- Mention any checks or runtime scenarios you could not verify.
- See `AGENTS.md` for the repository's implementation conventions and sensitive areas.
