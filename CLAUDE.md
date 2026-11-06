# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Static Astro website for DQ4AI 2027, a workshop co-located with EDBT/ICDT 2027. Co-chairs who are not
developers maintain it by editing `src/content/`. Deployed to GitHub Pages at
<https://dq4ai.github.io/dq4ai-2027/>.

## Commands

Node 22.23.4 (`.nvmrc`) and pnpm.

```sh
pnpm i && pnpm dev       # local dev server
pnpm lint                # ESLint, then Prettier check (`pnpm format` to fix formatting)
pnpm check               # astro check, then tsc --noEmit
pnpm test                # Vitest unit tests
pnpm build               # real site to dist/, prints remaining TBAs
pnpm build:fixture       # populated test site to dist-fixture/
pnpm validate:html       # html-validate; needs both builds
pnpm test:e2e            # Playwright + axe; needs both builds
pnpm lhci                # Lighthouse budgets; needs dist/
```

Single tests:

```sh
pnpm exec vitest run tests/unit/dates.test.ts -t "test name"
pnpm exec playwright test tests/e2e/smoke.spec.ts --project=real-content -g "test name"
```

Playwright needs a browser once: `pnpm exec playwright install chromium`. It starts its own servers
(`pnpm serve` on 4321, `pnpm serve:fixture` on 4322) but does not build, so rebuild first or it tests
stale output. The lychee link check runs only in CI (`.github/workflows/ci.yml`).

## Architecture

**Content flows through two parallel readers, both using the schemas in `src/lib/schemas.ts`:**

1. **Build guard.** `src/integrations/content-guard.ts` calls `checkContent` in
   `src/lib/load-content.ts`, which reads the raw YAML and news frontmatter, applies the schemas, then
   runs the cross-file rules in `src/lib/validation.ts`. Issues name a file and field. They fail
   `astro build`, but are only logged in `astro dev`. This reader also produces the TBA report.
2. **Rendering.** `src/content.config.ts` defines the Astro collections. Pages read them only through
   `src/lib/content.ts`, which resolves references (person ids to people, talks to sessions and papers).
   Pure display helpers are in `src/lib/view.ts`, kept free of `astro:content` so they can be unit
   tested.

Adding a content file means updating `schemas.ts`, `content.config.ts`, `load-content.ts` and
`content.ts`, and adding the file to `tests/fixtures/content-populated/`.

**List order is explicit.** Astro's store does not keep YAML order, so `listLoader` records a
`position` on each entry and `listOf` sorts by it.

**Two content sets.** `DQ4AI_CONTENT_DIR` selects the content folder, `DQ4AI_OUT_DIR` the output and
cache folders, and `DQ4AI_NOW` pins the build's "now". `build:fixture` sets all three, so program,
papers, extended deadlines and photos get tested while the real content is still mostly empty. E2e
tests run against both sets, and one test asserts fixture data never reaches the real site.

**`src/lib/nav.ts` `ROUTES` is the site map.** Navigation, footer, sitemap and Open Graph images derive
from it. A new page also needs an entry in `tests/e2e/pages.ts`. `onlyWithPapers` hides a route from
navigation and the sitemap until papers exist.

**Status is computed at build time.** Deadline status is rendered into static HTML, and a daily rebuild
(`scheduled-rebuild.yml`) moves "upcoming" to "passed". Small scripts in components add the theme
toggle, menu, time-zone toggle and countdown; pages must stay correct without them.

## Conventions and gotchas

- **Never invent facts.** Real people, affiliations, dates and URLs not supplied by the organizers stay
  as the literal value `TBA`, which is a valid value rather than a missing field. Date checks apply once
  a date is set.
- **Date logic belongs in `src/lib/dates.ts`.** Stored times are ISO 8601 with an explicit zone;
  deadlines display in AoE (`Etc/GMT+12`).
- **Internal links go through `url()` in `src/lib/paths.ts`.** A test asserts every link respects the
  base path, which comes from `deployment` in `site.yaml` (read by `astro.config.ts`).
- **The CSP allows no inline code.** The theme bootstrap is the only inline script, hashed in
  `src/lib/theme.ts`, and a test enforces this. Use a bundled `<script>`, never `is:inline`. Astro is
  configured not to inline CSS or assets, and the CSP is omitted in dev, so CSP problems only appear in
  a production build.
- **The repo name is hard-coded outside `site.yaml`** in test and CI config. See `docs/NEW_EDITION.md`
  for the list.
- **Pushing to `main` deploys.** `deploy.yml` only builds and publishes; it does not wait for CI, so
  the content guard is its only gate.
- **Quality gates are strict.** `lighthouserc.json` requires a score of 100 in all four categories on
  four pages. Size budgets and output rules are in `tests/e2e/build-output.spec.ts`.
- **TypeScript stays on 6.** `typescript-eslint` and `astro check` do not support 7. See "Known
  workarounds" in `docs/ARCHITECTURE.md` for the `@emnapi/runtime` override.
- New dependencies get a row and a reason in `docs/ARCHITECTURE.md`.
- Commits use Conventional Commits (`feat(pages):`, `test:`, `ci:`, `docs:`), with `CHANGELOG.md` kept
  up to date.

## Docs

- `docs/CONTENT_GUIDE.md`: editing content, for co-chairs
- `docs/COLLABORATION.md`: who does what, and which skill or hook handles each step
- `docs/ARCHITECTURE.md`: decisions and why
- `docs/NEW_EDITION.md`: rolling to the next year
