# Roll the site to a new edition (under 30 minutes)

1. **Create the repository.** On GitHub, use "Use this template" or copy this repo to
   `dq4ai-2028`. Under Settings → Pages, set the source to **GitHub Actions**.
2. **Point the tests at the new address.** Replace `dq4ai-2027` in `scripts/serve-static.mjs`,
   `playwright.config.ts`, `lighthouserc.json`, `tests/e2e/build-output.spec.ts` and
   `.github/workflows/ci.yml`. For a custom domain, set `customDomain` in `site.yaml` and change the
   base path in those files to `/`.
3. **Update `src/content/site.yaml`:** `edition`, `year`, `host`, `workshopDate`, `deployment`, and
   replace or remove `hostPhoto`, which shows this edition's city.
   Unknown values become `TBA`.
4. **Update `src/content/editions.yaml`:** remove `current: true` from the old entry and add the new
   one with `current: true`.
5. **Reset per-edition data:** set the dates in `dates.yaml` to `TBA`; empty `sessions.yaml`,
   `talks.yaml` and `papers.yaml` to `[]`; delete old files in `news/`; update `keynotes.yaml`,
   `committees.yaml` and `people.yaml`.
6. **Review the wording** of `cfp.yaml` and `submission.yaml`.
7. **Commit to `main`.** Actions builds and deploys. Check the placeholder list in the build log.
   The previous edition stays live at its own address.
8. **Move the root address.** In the `dq4ai/dq4ai.github.io` repository, replace `dq4ai-2027` with
   the new edition in `index.html` and `404.html`, so <https://dq4ai.github.io/> opens it. Keep
   `org-root/` in this repository in step. See `org-root/README.md`.
