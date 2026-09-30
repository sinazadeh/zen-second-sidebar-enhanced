---
name: sb2-ci-workflows
description: How this repository's CI and development tooling are set up - no package manifest, ESLint with SARIF upload, the pinned Prettier dry run, and the Tests, Patch targets, Sync upstream and Release workflows. Use when editing .github/workflows/, eslint.config.mjs, .prettierrc or scripts/, or when CI fails where local checks passed.
---

# CI and development tooling

The commands to run locally are under "Static checks" in the root
`AGENTS.md`.

## Tooling

There is no tracked package manifest, lockfile, or npm script.
`.gitignore` excludes `package.json`, `package-lock.json`, and
`node_modules`; these may exist locally but are not the project contract.
The tracked check definitions are `eslint.config.mjs`, `.prettierrc`,
`tests/`, `scripts/`, and `.github/workflows/`. Unit tests cover pure logic
only (settings round-trips, import/export validation, source patches) and use
Node's built-in test runner, so they need no install.

`tests/agent_config.test.mjs` also runs `scripts/lint_agent_config.mjs` over
`AGENTS.md` and `.claude/`: skill, agent and command frontmatter (names
matching their files, an `sb2-` prefix, a trigger phrase in each
description, a known model), `SKILL.md` under 8 KB, `AGENTS.md` within 150
lines and linking every skill, agent and command, working relative links,
and `$ARGUMENTS` framed as data in commands.

## Workflows

CI installs ESLint 9.7.0 and uploads SARIF using
`@microsoft/eslint-formatter-sarif@3.1.0`. A lint error fails the workflow;
don't add `continue-on-error` as a way to land something that doesn't pass.
The SARIF report is generated and
uploaded even when the lint step fails. The Prettier workflow uses a dry run
via `creyD/prettier_action`, pinned (`prettier_version`) to the same
Prettier version as the local setup command in `AGENTS.md`; keep the two in sync
when upgrading, or a newer local Prettier can flag untouched files CI
wouldn't. Add legitimate
Firefox/Zen globals to the existing ESLint globals list when needed, rather
than broadly disabling rules; note that VS Code's built-in JS language
service checks JSDoc `@param`/global references independently of ESLint's
globals list (it has its own, separate set of gaps - e.g. it doesn't know
about `BrowsingContext` even though ESLint does), so a stray IDE hint isn't
necessarily an ESLint config gap. Node syntax checks and lint cannot
validate privileged browser APIs or XUL UI.

Other workflows: **Tests** (`node --test` on pushes and PRs), **Patch
targets** (weekly, and on PRs touching patchers: runs
`scripts/check_patch_targets.mjs` against Firefox release, beta and main) and
**Release**.

The **Sync upstream** workflow is covered in
[sb2-upstream-sync](../sb2-upstream-sync/SKILL.md), and the **Release**
workflow in [sb2-release](../sb2-release/SKILL.md).
