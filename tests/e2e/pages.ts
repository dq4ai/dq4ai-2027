import type { Locator, Page } from "@playwright/test";

/** The site is one page. */
export const PAGES = [""] as const;

/** The old page addresses, each now a redirect to its section of the one page. */
export const OLD_PAGES = {
  "call-for-papers/": "about",
  "dates/": "dates",
  "submission/": "submission",
  "program/": "program",
  "keynotes/": "keynotes",
  "organization/": "organization",
  "attend/": "attend",
  "policies/": "policies",
  "previous-editions/": "previous-editions",
  "news/": "about",
} as const;

/** The section whose heading has this id. */
export function section(page: Page, id: string): Locator {
  return page.locator(`main section:has(> h2#${id})`);
}

/** The important dates, a part of the Submission section. */
export function datesTable(page: Page): Locator {
  return page.locator("main .subsection.dates");
}
