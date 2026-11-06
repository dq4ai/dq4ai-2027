---
name: organizer-brief
description: Draft a short, plain-language update for the DQ4AI co-chairs and organizers on what the site still needs from them, using the site's real TBA list and deadlines. Use when asked what is missing, what to ask the organizers, or to prepare a status message. Only drafts; never sends or posts anything.
---

# Organizer brief

1. Run `pnpm build` and take the "placeholders still marked TBA" list from its output. Read the
   matching entries in `src/content/` for context, plus `dates.yaml` for the next deadline.
2. Run `gh issue list --label content --state open` to see requests already in progress.
3. Sort the missing items by what they block for visitors:
   - **Blocks submissions:** deadlines, submission link, template, page limits, review model, policies.
   - **Blocks attendance:** workshop date, venue, travel, visa, accessibility.
   - **Builds credibility:** contact, keynote details, affiliations, previous editions.

## The draft

Write for busy academics who do not use GitHub. Keep it under 200 words and use no file names or
technical terms.

- Open with the one thing most needed and by when, if a date is known. Do not invent a date to create
  urgency.
- List what is needed by the three groups above, and say that a partial answer is welcome.
- Ask for the source of each fact, such as the EDBT organizers' email, so that it can be checked.
- Say how to reply: by email to the maintainer, or with the "Content update" form in GitHub.

Do not assign items to named people unless the user tells you who owns them. Show the draft in your
reply, and leave sending to the user.
