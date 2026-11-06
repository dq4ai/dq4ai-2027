---
name: site-review
description: Review the built DQ4AI site as its visitors and organizers would, across design, usability, accessibility, search and AI visibility, and motion, and return one ranked list of findings. Use when asked how professional the site looks, what to improve, or to review it before a launch or announcement. Read-only. For pass or fail checks use release-check.
---

# Site review

This makes no edits. It returns findings for the maintainer to choose from.

## Who the site is for

Judge it by whether each of these people can finish their job quickly:

- **An author** deciding whether to submit: topics, deadline, page limit, template, submission link.
- **A speaker or attendee:** date, room, program, venue, travel, visa.
- **A co-chair or program committee member:** correct name and affiliation, credible public record.

The tone is a scholarly workshop. Restraint and clarity count as polish; do not recommend marketing
patterns, hero effects, testimonials or decorative motion.

## Steps

1. Run `pnpm build && pnpm build:fixture`. Review both: `dist/` shows today's mostly `TBA` state, and
   `dist-fixture/` shows the site once its content is full.
2. Run read-only specialists in parallel, each given only the area below and asked for findings with
   `file:line` and the affected page. Dispatch the named agent directly. For a skill, dispatch a
   `general-purpose` agent and tell it to load that skill and make no edits:

   | Area                                   | Skill or agent           |
   | -------------------------------------- | ------------------------ |
   | Layout, hierarchy, typography, color   | `ui-ux-pro-max`          |
   | Accessibility                          | `fe-rail:fe-a11y-auditor` |
   | Search: metadata, JSON-LD, sitemap     | `seo`                    |
   | AI citation: crawlers, quotable facts  | `ai-seo`                 |
   | Animation cost and reduced motion      | `animation-performance`  |

3. Check each finding yourself before keeping it. Drop any that break a rule below or that the tests
   already enforce.
4. `review-animations` runs only when the user types it, so suggest `/review-animations` if motion
   changed.

## Rules findings must respect

- No fact may be invented. A finding can say a value is missing, never propose the value.
- No inline scripts or styles (the CSP forbids them); pages must work without JavaScript.
- `src/styles/tokens.css` stays the source of truth for color and type. No new dependency without a
  reason worth a row in `docs/ARCHITECTURE.md`.
- Lighthouse must stay at 100 in all four categories, and size budgets must hold.
- Ignore advice aimed at products with buyers: competitors, pricing, conversion, shopping.

## Report

One list, most important first, at most ten items. For each: what a visitor experiences, where, the
fix, its size (small, medium, large), and who must act: **organizers** when it needs facts or wording,
**maintainer** when it needs code. Finish with what was not reviewed.
