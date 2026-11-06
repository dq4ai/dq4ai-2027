---
name: release-check
description: Run all of the DQ4AI site's quality gates in the right order and report whether it is ready to merge or publish. Use before a pull request, before merging to main, or when asked if the site is ready. Not for reviewing design or wording; that is site-review.
---

# Release check

Run these in order. Later steps depend on the builds, so do not reorder them. Keep going after a
failure when later steps can still run, so the report is complete.

```sh
pnpm lint
pnpm check
pnpm test
pnpm build && pnpm build:fixture
pnpm validate:html
pnpm exec playwright install chromium
pnpm test:e2e
pnpm lhci
```

Skip the browser install if Chromium is already present. The lychee link check runs only in CI, so
check `gh run list --branch <branch> --limit 3` for it once the branch is pushed, and say so if it has
not run.

Never weaken a budget, skip a test or edit a check to get a pass.

## Report

Give one verdict first: **Ready**, or **Not ready**, naming what blocks it.

Then a table of each gate with pass, fail or not run, and for failures the first useful error line
with its `file:line`. Then list the remaining `TBA` values from the `pnpm build` output: these do not
block a merge, but say which ones visitors will notice most.

Remember that pushing to `main` deploys, and `deploy.yml` does not wait for CI.
