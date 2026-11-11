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
  "organization/": "organizers",
  "attend/": "about",
  "policies/": "submission",
  "previous-editions/": "about",
  "accepted-papers/": "program",
  "news/": "about",
} as const;

/** Where an old address leads: the program's lead to About while there is no program. */
export function oldPageTarget(id: string, hasProgram: boolean): string {
  return id === "program" && !hasProgram ? "about" : id;
}

/** The section whose heading has this id. */
export function section(page: Page, id: string): Locator {
  return page.locator(`main section:has(> h2#${id})`);
}

/** The important dates, a part of the Submission section. */
export function datesTable(page: Page): Locator {
  return page.locator("main .subsection.dates");
}
