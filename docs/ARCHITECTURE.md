# Architecture

## Decisions

**Static Astro site, zero framework JS.** The site is documents with four small behaviours: theme
toggle, menu, time-zone toggle and countdown. Each is a short script, and the site works without
them.

**One content folder, validated at build time.** `src/lib/schemas.ts` checks each field and
`src/lib/validation.ts` checks rules across files. `src/integrations/content-guard.ts` runs them
before rendering, so errors name a file and field instead of a rendering stack trace.

**`TBA` is a value, not a missing field.** Pending facts stay visible in the data, render
consistently, and appear in the placeholder report. Checks on a date apply once it is set.

**Build-time status plus a daily rebuild.** Statuses are correct without JavaScript. The rebuild
moves "upcoming" to "passed". GitHub pauses scheduled workflows after 60 days without repository
activity; any commit, or re-enabling the workflow under Actions, resumes them.

**One date module.** All date logic is in `src/lib/dates.ts`. Deadlines are ISO 8601 with an
explicit zone; display uses `Intl.DateTimeFormat`.

**File order kept explicitly.** Astro's content store does not preserve YAML order, so list loaders
record a `position` for each entry.

**A second, populated content set.** The real site is mostly empty until the chairs fill it in, so
`tests/fixtures/content-populated/` makes CI exercise the program, papers, extended deadlines and
photos. It has its own output and cache folders so it cannot reach the real site, and a test checks
this.

**Hand-written CSP.** Astro's CSP option does not cover external scripts and styles. Everything is
external except the theme bootstrap, which must run before first paint; its hash is computed in
`src/lib/theme.ts`. The policy is omitted in dev because Vite injects inline styles.

**Own test server.** `scripts/serve-static.mjs` mirrors GitHub Pages (base path, real 404s).
`astro preview` can detach into the background, which test runners cannot manage.

## Dependencies

| Dependency                                     | Why                                                    |
| ---------------------------------------------- | ------------------------------------------------------ |
| `astro`                                        | Static site generator, content collections             |
| `@astrojs/rss`                                 | Correctly escaped RSS feed                             |
| `yaml`                                         | Reads content; keeps dates as text, avoiding zone bugs |
| `satori`                                       | Lays out Open Graph images with real fonts             |
| `sharp`                                        | Converts those images to PNG; responsive images        |
| `typescript` (6, not 7)                        | `typescript-eslint` and `astro check` do not support 7 |
| `@astrojs/check`, `eslint`, `prettier` plugins | Static checks                                          |
| `vitest`, `ical.js`                            | Unit tests; a real parser to verify calendar files     |
| `@playwright/test`, `@axe-core/playwright`     | Browser and accessibility tests                        |
| `@lhci/cli`, `html-validate`                   | Lighthouse budgets and HTML validity                   |

The sitemap is about ten lines in `src/pages/sitemap.xml.ts`, so it needs no plugin.

## Known workarounds

- `pnpm-workspace.yaml` overrides `@emnapi/runtime` to 1.11.3. `@astrojs/astro2tsx` otherwise
  resolves a 2.0 beta that is incompatible with `@emnapi/core` 1.x, and `astro check` fails to load.
  Remove the override when an upstream release fixes this.

## Limits

- GitHub Pages does not allow custom response headers, so the CSP is a `<meta>` tag, which cannot
  set `frame-ancestors`.
- Crawlers only read `robots.txt` at a domain root, so on a project site `/dq4ai-2027/robots.txt` has
  no effect until a custom domain is set. The sitemap can still be submitted to search consoles.
