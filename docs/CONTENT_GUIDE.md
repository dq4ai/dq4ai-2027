# Content guide

You only need to edit files in `src/content/`, and you can do it in the GitHub web interface: open
the file, click the pencil, change it, and commit. In the commit message, say where the fact came
from. The site rebuilds itself in about two minutes, so open the page afterward and check it: the
build catches invalid content, but not a valid date that is wrong.

Prefer not to edit files?
[Open a content update request](https://github.com/dq4ai/dq4ai-2027/issues/new?template=content-update.yml)
instead.

If something is wrong the build stops, the live site stays as it was, and the failed run under the
**Actions** tab names the file and field to fix, for example:

```text
dates.yaml → notification.date: Author notification (1 December 2026, 23:59 AoE) must be after
Paper submission (11 December 2026, 23:59 AoE)
```

Write `TBA` for anything not known yet. The site shows "Not yet set" in its rows, "to be announced" in its sentences, and each build lists what
is left. Keep the quotes around dates, and keep the indentation as it is.

## Common edits

| To change                               | Edit                                |
| --------------------------------------- | ----------------------------------- |
| Deadlines                               | `dates.yaml`                        |
| Workshop date, contact, submission link | `site.yaml`                         |
| Template, review model                  | `site.yaml`                         |
| Page limits, topics, communities        | `cfp.yaml`                          |
| Dual submission, generative AI policies | `cfp.yaml`                          |
| Formatting, anonymization, FAQ          | `submission.yaml`                   |
| People and committees                   | `people.yaml` and `committees.yaml` |
| Keynotes                                | `keynotes.yaml`                     |
| Program                                 | `sessions.yaml` and `talks.yaml`    |
| Accepted papers                         | `papers.yaml`                       |
| Announcements                           | a new file in `news/`               |
| Venue, visa and travel information      | `attend.yaml`                       |
| Code of conduct, conflicts, ethics      | `policies.yaml`                     |

## Set or extend a deadline

Deadlines end at 23:59 Anywhere on Earth, which is written with `-12:00`:

```yaml
- id: submission
  label: Paper submission
  kind: submission
  date: "2026-12-11T23:59:00-12:00"
```

To extend it, keep `date` and add one line. The old date appears struck through.

```yaml
extendedTo: "2026-12-18T23:59:00-12:00"
```

This updates the home page, dates page, CFP, `cfp.txt`, the calendar file and the sticky chip. Also
post a news item.

## Add a program committee member

Add the person once to `people.yaml`:

```yaml
- id: jane-doe
  name: Jane Doe
  affiliation: Example University
  country: France
```

Then add `jane-doe` to `members` under `program-committee` in `committees.yaml`. The list sorts
itself by surname. If the surname is not the last word of the name, add `surname: van der Berg`.
Optional links: `url`, `orcid`, `dblp` (full addresses).

When membership is final, delete the `note:` line from the program committee in `committees.yaml`.

## Publish the program

First set `workshopDate` in `site.yaml`. Then add sessions, with the venue's time offset (`+02:00`
in Lille in April). Sessions must fall on the workshop date and must not overlap.

```yaml
# sessions.yaml
- id: session-1
  title: Data quality for LLMs
  kind: talks # or keynote, break, other
  start: "2027-04-06T09:00:00+02:00"
  end: "2027-04-06T10:30:00+02:00"
  room: TBA
  chair: jane-doe # optional, an id from people.yaml
```

```yaml
# talks.yaml, in speaking order
- id: talk-1
  session: session-1
  title: An example talk
  speakers: [jane-doe]
  paper: paper-1 # optional, an id from papers.yaml
```

## Add accepted papers

The page joins the navigation as soon as `papers.yaml` is not empty. `type` is `research`, `system`
or `vision`.

```yaml
- id: paper-1
  title: An example paper
  authors: [Jane Doe, John Roe]
  type: research
  url: https://example.org/paper.pdf # optional
```

## Add a keynote photo or sponsor logo

Put the image in `src/content/images/`, then refer to it with a description for people who cannot
see it. Check that you may publish the image first.

```yaml
photo: { file: jane-doe.jpg, alt: Portrait of Jane Doe }
```

## Post news

Add a file such as `news/2026-12-01-deadline-extended.md`:

```markdown
---
title: Submission deadline extended
date: "2026-12-01"
summary: The paper submission deadline is now 18 December.
---

The full announcement goes here.
```

## Harmless build messages

`The collection "papers" does not exist or is empty` only means that list has nothing in it yet.
