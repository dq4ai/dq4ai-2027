/**
 * The site is one page, as the organizers asked. This lists its sections in order: the menu, the
 * redirects from the old page addresses and the Open Graph image are derived from it.
 */
export interface Section {
  /** The section's anchor on the home page, and its heading's id. */
  id: string;
  title: string;
  /** In the main menu, under this label. Sections without one are reached by scrolling. */
  menu?: string;
  /** The address this section had when it was a page of its own: it now redirects here. */
  oldPath?: string;
  /** Left out of the page and the menu until papers are accepted. */
  onlyWithPapers?: boolean;
}

export const HOME = {
  path: "/",
  slug: "home",
  title: "Home",
  description: "Workshop overview, call for papers, dates, program and organization.",
} as const;

export const SECTIONS: Section[] = [
  { id: "about", title: "About", oldPath: "/call-for-papers/" },
  { id: "topics", title: "Topics of interest", menu: "Call for Papers" },
  { id: "paper-categories", title: "Paper categories" },
  { id: "dates", title: "Important dates", menu: "Dates", oldPath: "/dates/" },
  { id: "submission", title: "Submission", oldPath: "/submission/" },
  { id: "policies", title: "Policies", oldPath: "/policies/" },
  { id: "program", title: "Program", menu: "Program", oldPath: "/program/" },
  { id: "keynotes", title: "Keynotes", oldPath: "/keynotes/" },
  {
    id: "accepted-papers",
    title: "Accepted papers",
    menu: "Accepted Papers",
    oldPath: "/accepted-papers/",
    onlyWithPapers: true,
  },
  { id: "organization", title: "Organization", menu: "Organization", oldPath: "/organization/" },
  { id: "attend", title: "Attend", menu: "Attend", oldPath: "/attend/" },
  { id: "contact", title: "Contact" },
  { id: "news", title: "News", oldPath: "/news/" },
  { id: "previous-editions", title: "Previous editions", oldPath: "/previous-editions/" },
  { id: "sponsors", title: "Supported by" },
];

export function sectionById(id: string): Section {
  const section = SECTIONS.find((candidate) => candidate.id === id);
  if (!section) throw new Error(`Unknown section "${id}"`);
  return section;
}

/** The menu: a link to each section that has a label and is on the page. */
export function menuSections(hasPapers: boolean): Section[] {
  return SECTIONS.filter((section) => section.menu && (!section.onlyWithPapers || hasPapers));
}

/**
 * Old page addresses, each to its section. Accepted Papers points at the program until papers
 * exist, so a link shared early still lands somewhere useful.
 */
export function redirects(hasPapers: boolean): { path: string; to: string }[] {
  return SECTIONS.flatMap((section) => {
    if (!section.oldPath) return [];
    const id = section.onlyWithPapers && !hasPapers ? "program" : section.id;
    return [{ path: section.oldPath, to: `/#${id}` }];
  });
}
