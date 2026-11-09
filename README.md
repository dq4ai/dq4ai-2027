# DQ4AI 2027 website

[![CI](https://github.com/dq4ai/dq4ai-2027/actions/workflows/ci.yml/badge.svg)](https://github.com/dq4ai/dq4ai-2027/actions/workflows/ci.yml)
[![Deploy](https://github.com/dq4ai/dq4ai-2027/actions/workflows/deploy.yml/badge.svg)](https://github.com/dq4ai/dq4ai-2027/actions/workflows/deploy.yml)

Website of the Second International Workshop on Data Quality for Artificial Intelligence, co-located
with EDBT/ICDT 2027 in Lille, France.

**Live site:** <https://dq4ai.github.io/dq4ai-2027/>

![Home page of the DQ4AI 2027 website: a soft banner of navy and teal ribbons behind the title, then the key facts](docs/screenshot.png)

## The site

The site shows a little at a time, so a first visit invites rather than overwhelms.

- **Home** opens with a banner: the title, the edition and where it meets, over ribbons of navy and
  teal that are the logo's two directions (data quality for AI, AI for data quality). Below it are one
  button, three key facts (next deadline, workshop date, keynote), the topics as tags, one paragraph on
  the goal, and the latest news in one line.
- **Menu:** Home, Call for Papers, Dates, Program, Organization and Attend. Accepted Papers joins
  once papers are published.
- **Footer:** Submission, Keynotes, News, Policies, Previous Editions, the call as plain text, the
  deadlines calendar and the news feed.
- **Call for Papers** leads with the goal and the topics. The full scope and each paper category open
  on a click, and facts not yet known are named in one sentence rather than a row each.

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
