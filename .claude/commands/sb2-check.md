---
description: Run Second Sidebar's static checks and report what fails.
argument-hint: "[--patch-targets]"
---

# Run the static checks

Delegate to the `sb2-checks-runner` subagent
([definition](../agents/sb2-checks-runner.md)). Ask it to run the Firefox
patch-target check as well if `$ARGUMENTS` contains `--patch-targets`;
otherwise it decides from the changed files.

Relay its table as it is. If something failed in a file this branch changed,
offer to fix it. Don't reformat files the branch didn't touch.
