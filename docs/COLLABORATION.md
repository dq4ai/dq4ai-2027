# Who does what

How changes reach the public site, and who is involved at each step.

| Actor                 | Does                                             | Through                       |
| --------------------- | ------------------------------------------------ | ----------------------------- |
| Co-chairs             | Edit content directly on GitHub                  | `docs/CONTENT_GUIDE.md`       |
| Other organizers      | Supply facts and wording                         | Content update form, or email |
| Maintainer            | Owns code, reviews code changes, makes the calls | Pull requests                 |
| Claude Code           | Prepares changes and reports for the maintainer  | The skills below              |
| CI and content guard  | Reject invalid content and check quality         | GitHub Actions, `pnpm build`  |
| Dependabot            | Proposes dependency updates                      | Weekly pull requests          |
| Authors and attendees | Use the site, and report problems                | The site, Bug form            |

One rule holds for everyone: facts come from the organizers, with a source. Anything unknown stays
`TBA`, and nobody, including Claude, fills a gap with a guess.

## A change to the content

**Co-chairs edit directly.** They change a file in `src/content/` on GitHub, as the content guide
describes, and say in the commit message where the fact came from. The site deploys in about two
minutes, with no review first.

The safeguard is the content guard, which stops a deploy if the content is invalid. It cannot tell
whether a valid date is the right one, so a co-chair should check the live page after each edit. The
Claude Code hooks do not run on GitHub edits. CI runs after the push, so a failure there means the
change is probably already live.

**Anyone else sends a request.** An organizer sends the fact and its source through the form or by
email. A co-chair makes the edit, or the maintainer runs `/content-change <issue number>` in Claude
Code, which prepares it on a branch and shows the old and new values with their source.

## A change to the code or design

1. Work on a branch, using the installed skills as needed.
2. Run `/release-check` until it reports **Ready**.
3. Open a pull request. CI repeats the checks and adds the link check.
4. Merge, which deploys the site.

## Claude Code tools

| Need                                  | Use                                            |
| ------------------------------------- | ---------------------------------------------- |
| Make a content change                 | `/content-change`, which uses `content-editor` |
| Ask whether it is ready to merge      | `/release-check`                               |
| Ask how the site could be better      | `/site-review`                                 |
| Tell organizers what is still missing | `/organizer-brief`                             |
| Design or restyle a page              | `ui-ux-pro-max`, `frontend-design`             |
| Search and AI visibility              | `seo`, `ai-seo`                                |
| Accessibility                         | `accessibility`, `fe-rail:fe-a11y-auditor`     |
| Motion                                | `animation-performance`, `/review-animations`  |
| Tests                                 | `vitest`, `playwright-best-practices`          |

Two hooks run automatically. `guard-deploy` asks a person before anything that would push to `main`,
merge a pull request or force push. `after-edit` formats each edited file and runs the content guard
after a content edit. Both are guardrails only: if a hook itself fails, work continues.
