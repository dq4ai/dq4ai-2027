# DQ4AI 2027 website

[![CI](https://github.com/dq4ai/dq4ai-2027/actions/workflows/ci.yml/badge.svg)](https://github.com/dq4ai/dq4ai-2027/actions/workflows/ci.yml)
[![Deploy](https://github.com/dq4ai/dq4ai-2027/actions/workflows/deploy.yml/badge.svg)](https://github.com/dq4ai/dq4ai-2027/actions/workflows/deploy.yml)

Website of the Second International Workshop on Data Quality for Artificial Intelligence, co-located
with EDBT/ICDT 2027 in Lille, France.

**Live site:** <https://dq4ai.github.io/dq4ai-2027/>

![Home page of the DQ4AI 2027 website: a soft banner of navy and teal ribbons behind the four-line title and the date, then About](docs/screenshot.png)

## The site

The site follows the layout of the previous edition's site: the scope and topics are read in place,
with nothing to open.

- **Home** opens with a banner over ribbons of navy and teal, the logo's two directions (data quality
  for AI, AI for data quality). It reads, one line each: "Second International Workshop on", "Data
  Quality for Artificial Intelligence (DQ4AI 2027),", "co-located with EDBT/ICDT 2027, Lille, France"
  and "(April 6, 2027)". Below it come the full "About the DQ4AI Workshop", every topic as a heading
  over its bullet points, and the latest news in one line.
- **Menu:** Home, Call for Papers, Dates, Program, Organization and Attend. Accepted Papers joins
  once papers are published.
- **Footer:** one line, "© DQ4AI 2027 — All rights reserved", with no menu. Every page ends on "Go to
  top ↑".
- **Dates** lists the deadlines and the workshop's day only. There is no deadline bar and no theme
  button; the site follows the system's light or dark theme.
- **Call for Papers** gives the full scope, the topics as headings over bullet points, and the paper
  categories as one bullet each. Facts not yet known are named in one sentence rather than a row each.

## Update the content

Everything on the site comes from `src/content/`, and no code changes are needed. See the
[content guide](docs/CONTENT_GUIDE.md). Invalid content, such as a notification date before the
submission deadline, fails the build with a message naming the file and field, and the live site
stays as it was.

## Develop

Requires Node 22.23.4 (see `.nvmrc`) and pnpm.

```sh
pnpm i && pnpm dev
```

| Command                            | Does                                                      |
| ---------------------------------- | --------------------------------------------------------- |
| `pnpm build`                       | Builds to `dist/`, lists remaining TBAs                   |
| `pnpm build:fixture`               | Builds the populated test site                            |
| `pnpm lint` / `pnpm check`         | ESLint and Prettier / types                               |
| `pnpm test`                        | Unit tests                                                |
| `pnpm test:e2e`                    | Browser and accessibility tests, both sites (build first) |
| `pnpm validate:html` / `pnpm lhci` | HTML validity / Lighthouse budgets                        |

## Documentation

- [Content guide](docs/CONTENT_GUIDE.md), for co-chairs
- [Architecture](docs/ARCHITECTURE.md), with decisions and dependencies
- [New edition](docs/NEW_EDITION.md), for rolling to next year

## License

Code under MIT, content under CC BY 4.0, except two photos of Lille under CC BY-SA (4.0 and 3.0) and
the fonts under the SIL Open Font License. See [LICENSE](LICENSE).
