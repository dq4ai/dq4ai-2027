# Who does what

How changes reach the public site, and who is involved at each step.

| Actor                 | Does                                             | Through                       |
| --------------------- | ------------------------------------------------ | ----------------------------- |
| Co-chairs             | Edit content directly on GitHub                  | `docs/CONTENT_GUIDE.md`       |
| Other organizers      | Supply facts and wording                         | Content update form, or email |
| Maintainer            | Owns code, reviews code changes, makes the calls | Pull requests                 |
| CI and content guard  | Reject invalid content and check quality         | GitHub Actions, `pnpm build`  |
| Dependabot            | Proposes dependency updates                      | Weekly pull requests          |
| Authors and attendees | Use the site, and report problems                | The site, Bug form            |

One rule holds for everyone: facts come from the organizers, with a source. Anything unknown stays
`TBA`, and nobody fills a gap with a guess.

## A change to the content

**Co-chairs edit directly.** They change a file in `src/content/` on GitHub, as the content guide
describes, and say in the commit message where the fact came from. The site deploys in about two
minutes, with no review first.

The safeguard is the content guard, which stops a deploy if the content is invalid. It cannot tell
whether a valid date is the right one, so a co-chair should check the live page after each edit. CI
runs after the push, so a failure there means the change is probably already live.

**Anyone else sends a request.** An organizer sends the fact and its source through the form or by
email. A co-chair or the maintainer then makes the edit.

## A change to the code or design

1. Work on a branch.
2. Run the checks listed in the README until they pass.
3. Open a pull request. CI repeats the checks and adds the link check.
4. Merge, which deploys the site.
