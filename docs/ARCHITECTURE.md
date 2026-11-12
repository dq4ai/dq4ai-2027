# Architecture

## Decisions

**Static Astro site, zero framework JS.** The site is documents with three small behaviours: the
menu, the program's time-zone toggle, and keeping the next deadline's flag current. Each is a short script,
and the site works without them. The site is always light: the organizers asked for no dark theme
and no theme button, so the colour tokens have one value each.

**One content folder, validated at build time.** `src/lib/schemas.ts` checks each field and
`src/lib/validation.ts` checks rules across files. `src/integrations/content-guard.ts` runs them
before rendering, so errors name a file and field instead of a rendering stack trace.

**`TBA` is a value, not a missing field.** Pending facts stay visible in the data, render
consistently, and appear in the placeholder report. Checks on a date apply once it is set.

**Build-time flag plus a daily rebuild.** The next deadline is flagged in red without JavaScript;
the organizers asked for no status column. The rebuild moves the flag once a deadline passes. GitHub pauses scheduled workflows after 60 days without repository
activity; any commit, or re-enabling the workflow under Actions, resumes them. The rebuild runs just after 12:00 UTC, when a day ends in AoE. Between builds, a small script
moves the flagged date (`DeadlineSync.astro`), so a page built
earlier never contradicts itself.

**The logo first.** The palette comes from logo D: navy for data quality for AI, teal for AI for
data quality. `src/lib/brand.ts` draws it once, for the page, the favicon's shape and the social
images. The next deadline is set in bold red, without a background, as the previous edition set it.

**Like the previous edition's site.** The organizers asked for the layout of QuaLLM-KG 2026
(<https://quallmkg2026.github.io/>): the banner title on four set lines, the full "About" and the
topics on the home page, each topic a heading over bullet points (`items` in `cfp.yaml`), paper
categories as one bullet each, names in red with affiliations in the text colour, and a one-line
footer with no menu. Nothing folds away and topics link nowhere. Each page ends on "Go to top ↑"
instead; the pages the footer used to list are linked from where they matter (Submission and
Policies from the call, News from the latest-news line). Later the chairs asked for less again: the
home page goes from the banner straight to "About", with no statement, button or key facts; there
is no deadline bar and no theme button; the Dates page lists the deadlines and the workshop's day
only, without the host conference's dates, the calendar file or the time-zone switch; and the footer
reads "© DQ4AI 2027 — All rights reserved", as the previous edition's did. Then they asked for the
previous edition's site exactly, with this edition's content: "DQ4AI 2027" large over the full title;
its sections and menu (About, Topics of Interest, Submission, Program, Keynote Speakers, Organizers,
Program Committee), each title above its content; nothing behind "Read more"; and no Attend,
Policies or Contact section, since the host conference handles venue and travel. The page ends on
a short Past Edition section, not in the menu, thanking those behind the first edition.
The contact is the page's last line, after the last section. Accepted papers appear in the program, through the talks that
present them.

**Warm and plain, like an academic page.** The organizers found the first design too "industrial" and
pointed to classic workshop sites. So: a warm paper background, serif type throughout (Source Serif
4 in three weights, about the same weight in bytes as the two IBM Plex files it replaced; IBM Plex
remains only in the social images), no icons, tiles or boxed labels, an unset value in muted text,
organizers listed one per line as "Name, Affiliation, Country", and the Call for Papers read straight
through without a links bar. The site has no photos.

**The header stays on screen.** Any section is one click away. A very large browser font turns the
sticky header off, since it would pin half the screen.

**One page.** The organizers asked for the whole site on one page. `src/lib/nav.ts` lists its
sections in order; `src/pages/index.astro` renders one component per section from
`src/components/sections/`, each wrapped in `PageSection`, which ends it on "Go to top ↑". The menu
links to sections by anchor. Nothing is folded away. The old page addresses (`/dates/`, `/call-for-papers/` and so on) are
kept as stubs, `src/pages/[moved].astro`, that send the browser to their section with a meta
refresh, since they are already in announcements; they are `noindex` and left out of the sitemap.
The banner is a photo of Lille's Grand'Place by day, with no logo, as the organizers chose, under a
navy veil behind the words so the white title stays readable while the edges stay bright; its CC BY-SA licence requires the credit, which the
organizers asked to keep out of sight: it shows at the foot of the photo on hover, keyboard focus or a tap on a touch screen,
and stays in the page for screen readers. It is the first
screen's largest paint, so it loads eagerly, and the page's Lighthouse budget is 100 with a largest
paint under 2000 ms (under 1200 ms without the photo, on Lighthouse's simulated slow 4G). The page
is a centred frame of `--page-width` (56.25rem, the previous edition's 900px), and text runs its
full width.

**Motion.** Precise, calm, quick. Something moves only to explain, give feedback or direct attention,
and every value comes from a token.

| Moment             | Motion                           | Why                                    |
| ------------------ | -------------------------------- | -------------------------------------- |
| Phone menu opens   | Fade, 150 ms                     | Tells new links from displaced content |
| Hover on a pointer | Color or border eases, 150 ms    | Feedback                               |
| Press              | Color, and buttons scale to 0.97 | Feedback                               |

These stay still on purpose: a change of system theme, so every color changes at once; section
jumps, because smooth scrolling took over a second on long pages and ran on page load; the time-zone
toggle and status, because a value in motion cannot be trusted; and abstracts, which open where the
reader clicked. `prefers-reduced-motion` turns all movement off and keeps every state. Hover-out is
instant rather than reversing, which is what keeps a theme change from lagging.

**One date module.** All date logic is in `src/lib/dates.ts`. Deadlines are ISO 8601 with an
explicit zone; display uses `Intl.DateTimeFormat`.

**File order kept explicitly.** Astro's content store does not preserve YAML order, so list loaders
record a `position` for each entry.

**A second, populated content set.** The real site is mostly empty until the chairs fill it in, so
`tests/fixtures/content-populated/` makes CI exercise the program, papers, extended deadlines and
photos. It has its own output and cache folders so it cannot reach the real site, and a test checks
this.

**Hand-written CSP.** Astro's CSP option does not cover external scripts and styles. Everything is
external except the bootstrap, which must run before first paint; its hash is computed in
`src/lib/theme.ts` (named for the theme button it once served). The policy is omitted in dev because
Vite injects inline styles. The bootstrap answers clicks on the menu button: it hides the navigation
behind that button at once, so the button has to work before, or without, any bundled script.

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
