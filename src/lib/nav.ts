/** The site map: navigation, footer, sitemap and Open Graph images are all derived from this. */
export interface Route {
  path: string;
  slug: string;
  title: string;
  description: string;
  /** In the main menu. The rest are linked from the footer, so the menu stays short. */
  primary?: boolean;
  /** Left out of navigation and the sitemap until the page has content. */
  onlyWithPapers?: boolean;
  /** Stays in navigation, but is left out of the sitemap until the program exists. */
  sitemapOnlyWithProgram?: boolean;
}

export const ROUTES: Route[] = [
  {
    path: "/",
    slug: "home",
    title: "Home",
    description: "Workshop overview, key dates and latest news.",
  },
  {
    path: "/call-for-papers/",
    slug: "call-for-papers",
    title: "Call for Papers",
    description: "Scope, topics, paper categories and policies.",
    primary: true,
  },
  {
    path: "/dates/",
    slug: "dates",
    title: "Dates",
    description: "Important dates, in Anywhere on Earth.",
    primary: true,
  },
  {
    path: "/submission/",
    slug: "submission",
    title: "Submission",
    description: "How to prepare and submit a paper.",
  },
  {
    path: "/program/",
    slug: "program",
    title: "Program",
    description: "Sessions, talks and times.",
    primary: true,
    sitemapOnlyWithProgram: true,
  },
  {
    path: "/keynotes/",
    slug: "keynotes",
    title: "Keynotes",
    description: "Keynote speakers and talks.",
  },
  {
    path: "/accepted-papers/",
    slug: "accepted-papers",
    title: "Accepted Papers",
    description: "Papers accepted at the workshop.",
    primary: true,
    onlyWithPapers: true,
  },
  {
    path: "/organization/",
    slug: "organization",
    title: "Organization",
    description: "Workshop chairs and program committee.",
    primary: true,
  },
  {
    path: "/attend/",
    slug: "attend",
    title: "Attend",
    description: "Registration and practical information for attending.",
    primary: true,
  },
  {
    path: "/news/",
    slug: "news",
    title: "News",
    description: "Announcements about the workshop.",
  },
  {
    path: "/policies/",
    slug: "policies",
    title: "Policies",
    description: "Code of conduct, conflict of interest and ethics.",
  },
  {
    path: "/previous-editions/",
    slug: "previous-editions",
    title: "Previous Editions",
    description: "All editions of the workshop.",
  },
];

export function routeBySlug(slug: string): Route {
  const route = ROUTES.find((candidate) => candidate.slug === slug);
  if (!route) throw new Error(`Unknown route "${slug}"`);
  return route;
}

export function visibleRoutes(hasPapers: boolean): Route[] {
  return ROUTES.filter((route) => !route.onlyWithPapers || hasPapers);
}

/** The pages kept out of the main menu, for the footer. */
export function secondaryRoutes(): Route[] {
  return ROUTES.filter((route) => !route.primary && route.slug !== "home");
}

export function sitemapRoutes(hasPapers: boolean, hasProgram: boolean): Route[] {
  return visibleRoutes(hasPapers).filter((route) => !route.sitemapOnlyWithProgram || hasProgram);
}
