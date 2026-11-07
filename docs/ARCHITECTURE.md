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
activity; any commit, or re-enabling the workflow under Actions, resumes them. The rebuild runs just after 12:00 UTC, when a day ends in AoE. Between builds, a small script
corrects statuses, the flagged date, the strip and the submit button, so a page built earlier never
contradicts itself.

**The logo first.** The palette comes from logo D: navy for data quality for AI, teal for AI for
data quality. `src/lib/brand.ts` draws it once, for the page, the favicon's shape and the social
images. Amber is only ever the next deadline. The home page opens with the logo and the eight topic
icons, so a researcher sees what the workshop is about before reading anything.

**The header stays on screen.** Any page is one click away. The deadline bar scrolls with the page,
because stacked they would take too much of a small screen. A very large browser font turns the
sticky header off, since it would pin half the screen.

**No banner photo on phones.** The Call for Papers panorama would be the page's largest paint on a
phone and missed the 1200 ms budget at about 1800 ms, so screens under 40rem get the title on navy.

**Motion.** Precise, calm, quick. Something moves only to explain, give feedback or direct attention,
and every value comes from a token.

| Moment             | Motion                           | Why                                      |
| ------------------ | -------------------------------- | ---------------------------------------- |
| Home logo, on load | The loop settles once, 480 ms    | The hero: the two directions around data |
| Phone menu opens   | Fade, 150 ms                     | Tells new links from displaced content   |
| Hover on a pointer | Color or border eases, 150 ms    | Feedback                                 |
| Press              | Color, and buttons scale to 0.97 | Feedback                                 |

These stay still on purpose: theme switches, so every color changes at once; section jumps, because
smooth scrolling took over a second on long pages and ran on page load; the time-zone toggle,
countdown and status, because a value in motion cannot be trusted; and abstracts, which open where
the reader clicked. `prefers-reduced-motion` turns all movement off and keeps every state. Hover-out
is instant rather than reversing, which is what keeps theme switches from lagging.

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
`src/lib/theme.ts`. The policy is omitted in dev because Vite injects inline styles. The bootstrap
also answers clicks on the menu and theme buttons: it hides the navigation behind the menu button at
once, so that button has to work before, or without, any bundled script.

**`font-display: optional`.** A font arriving after first paint moved the page and pushed deep links
past their heading. A slow first visit may now show the fallback font on that page, and later pages
use the cached font.

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
