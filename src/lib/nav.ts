/**
 * The site is one page, as the organizers asked. This lists its sections in order: the menu, the
 * redirects from the old page addresses and the Open Graph image are derived from it.
 */
export interface Section {
  /** The section's anchor on the home page, and its heading's id. */
  id: string;
  title: string;
  /** Its label in the menu, which lists every section on the page, as the organizers asked. */
  menu: string;
  /** The address this section had when it was a page of its own: it now redirects here. */
  oldPath?: string;
  /** Left out of the page and the menu until papers are accepted. */
  onlyWithPapers?: boolean;
  /** Left out of the page and the menu until there is a keynote. */
  onlyWithKeynotes?: boolean;
  /** On the page when there is one, but not in the menu. */
  notInMenu?: boolean;
}

export const HOME = {
  path: "/",
  slug: "home",
  title: "Home",
  description: "Workshop overview, call for papers, dates, program and organization.",
} as const;

export const SECTIONS: Section[] = [
  { id: "about", title: "About", menu: "About", oldPath: "/call-for-papers/" },
  { id: "topics", title: "Topics of interest", menu: "Topics" },
  { id: "submission", title: "Submission", menu: "Submission", oldPath: "/submission/" },
  { id: "policies", title: "Policies", menu: "Policies", oldPath: "/policies/" },
  { id: "program", title: "Program", menu: "Program", oldPath: "/program/" },
  {
    id: "keynotes",
    title: "Keynotes",
    menu: "Keynotes",
    oldPath: "/keynotes/",
    onlyWithKeynotes: true,
  },
  {
    id: "accepted-papers",
    title: "Accepted papers",
    menu: "Accepted Papers",
    oldPath: "/accepted-papers/",
    onlyWithPapers: true,
  },
  { id: "organization", title: "Organization", menu: "Organization", oldPath: "/organization/" },
  { id: "attend", title: "Attend", menu: "Attend", oldPath: "/attend/" },
  { id: "contact", title: "Contact", menu: "Contact" },
  {
    id: "previous-editions",
    title: "Previous editions",
    menu: "Previous editions",
    oldPath: "/previous-editions/",
  },
  { id: "sponsors", title: "Supported by", menu: "Sponsors", notInMenu: true },
];

export function sectionById(id: string): Section {
  const section = SECTIONS.find((candidate) => candidate.id === id);
  if (!section) throw new Error(`Unknown section "${id}"`);
  return section;
}

/** The menu: a link to each section on the page, in the page's order. */
export function menuSections(has: { papers: boolean; keynotes: boolean }): Section[] {
  return SECTIONS.filter(
    (section) =>
      !section.notInMenu &&
      (!section.onlyWithPapers || has.papers) &&
      (!section.onlyWithKeynotes || has.keynotes),
  );
}

/**
 * Old page addresses, each to its section. Accepted Papers points at the program until papers
 * exist, so a link shared early still lands somewhere useful.
 */
export function redirects(hasPapers: boolean): { path: string; to: string }[] {
  const moved = SECTIONS.flatMap((section) => {
    if (!section.oldPath) return [];
    const id = section.onlyWithPapers && !hasPapers ? "program" : section.id;
    return [{ path: section.oldPath, to: `/#${id}` }];
  });
  // The organizers asked for no News section, and for the dates inside Submission.
  return [...moved, { path: "/dates/", to: "/#dates" }, { path: "/news/", to: "/#about" }];
}
