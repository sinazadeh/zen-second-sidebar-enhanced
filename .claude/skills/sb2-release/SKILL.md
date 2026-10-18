---
name: sb2-release
description: How versions of this fork are released - theme.json version bumps, CHANGELOG.md sections, and the Release workflow that publishes GitHub releases (including backfills). Use when preparing a release, restructuring CHANGELOG.md, or changing scripts/publish_releases.mjs or .github/workflows/release.yml.
---

# Releases

1. Bump `version` in `theme.json`, and set `updatedAt` to the current UTC
   time (`YYYY-MM-DDTHH:MM:SSZ`).
2. Move the `[Unreleased]` notes in `CHANGELOG.md` into a new
   `## [<version>] - <date>` section (the same UTC date).
3. Get both onto `main` (usually by merging the PR that carries them).

Sine offers an update when `updatedAt` is newer than the installed copy's,
not when `version` is. Without it in `theme.json` (before 1.11.0), Sine used
the repository's last-updated time from GitHub, which any push changes. Set
it as late as possible, ideally right before merging: a copy whose Sine
checked after it was set but before the merge stored a later time and isn't
offered the release. `tests/theme.test.mjs` checks the format and that its
date matches the latest changelog section.

The **Release** workflow runs whenever `theme.json` changes on `main` and
publishes a GitHub release, tag `v<version>`, for every version that doesn't
have one yet (`scripts/publish_releases.mjs`), with that version's changelog
section and a zip of `src/` at the release's commit for fx-autoconfig users.
There's no tag to push, except for a version released at an older commit
than `main`'s (a backfill): GitHub won't let the workflow's token create a
tag at a commit whose `.github/workflows` differ from `main`'s (HTTP 403),
so the run publishes what it can and prints the `git tag`/`git push`
commands for the rest. A version's release commit is the first commit on
`main`'s first-parent line with that version and its notes, with nothing left
under `[Unreleased]` (early versions were bumped before their notes landed);
an existing tag is kept. Deleting a release gets it published again on the
next run, so delete its tag too, or keep the release. `node
scripts/publish_releases.mjs --dry-run` shows what would be published; pull
requests touching the script or workflow run that too. Add user-visible
changes to `[Unreleased]` as you make them.
