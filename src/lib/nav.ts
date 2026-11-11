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
  /** Left out of the page and the menu until there is a keynote. */
  onlyWithKeynotes?: boolean;
  /** Left out of the page and the menu until there is a program, as the organizers asked. */
  onlyWithProgram?: boolean;
  /** On the page when there is one, but not in the menu. */
  notInMenu?: boolean;
}

export const HOME = {
  path: "/",
  slug: "home",
  title: "Home",
  description: "Workshop overview, call for papers, dates, program and organization.",
} as const;

// The sections of the previous edition's site (QuaLLM-KG 2026), in its order, with this edition's
// content, as the organizers asked.
export const SECTIONS: Section[] = [
  { id: "about", title: "About", menu: "About", oldPath: "/call-for-papers/" },
  { id: "topics", title: "Topics of Interest", menu: "Topics", notInMenu: true },
  { id: "submission", title: "Submission", menu: "Submission", oldPath: "/submission/" },
  {
    id: "program",
    title: "Program",
    menu: "Program",
    oldPath: "/program/",
    onlyWithProgram: true,
  },
  {
    id: "keynotes",
    title: "Keynote Speakers",
    menu: "Keynote Speakers",
    oldPath: "/keynotes/",
    onlyWithKeynotes: true,
  },
  { id: "organizers", title: "Organizers", menu: "Organizers", oldPath: "/organization/" },
  { id: "program-committee", title: "Program Committee", menu: "Program Committee" },
  { id: "sponsors", title: "Supported by", menu: "Sponsors", notInMenu: true },
];

export function sectionById(id: string): Section {
  const section = SECTIONS.find((candidate) => candidate.id === id);
  if (!section) throw new Error(`Unknown section "${id}"`);
  return section;
}

/** The menu: a link to each section on the page, in the page's order. */
export function menuSections(has: { keynotes: boolean; program: boolean }): Section[] {
  return SECTIONS.filter(
    (section) =>
      !section.notInMenu &&
      (!section.onlyWithKeynotes || has.keynotes) &&
      (!section.onlyWithProgram || has.program),
  );
}

/**
 * Old page addresses, each to its section. They may be in announcements already. Pages whose
 * section the organizers removed lead to the nearest one that remains.
 */
export function redirects(has: { program: boolean }): { path: string; to: string }[] {
  const program = has.program ? "/#program" : "/#about";
  const moved = SECTIONS.flatMap((section) =>
    section.oldPath
      ? [{ path: section.oldPath, to: section.onlyWithProgram ? program : `/#${section.id}` }]
      : [],
  );
  return [
    ...moved,
    { path: "/dates/", to: "/#dates" },
    { path: "/news/", to: "/#about" },
    { path: "/attend/", to: "/#about" },
    { path: "/policies/", to: "/#submission" },
    { path: "/previous-editions/", to: "/#about" },
    { path: "/accepted-papers/", to: program },
  ];
}
