/** The site map: navigation, footer, sitemap and Open Graph images are all derived from this. */
export interface Route {
  path: string;
  slug: string;
  title: string;
  description: string;
  primary?: boolean;
  /** Left out of navigation and the sitemap until the page has content. */
  onlyWithPapers?: boolean;
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
    description: "Important dates, in Anywhere on Earth, with a calendar download.",
    primary: true,
  },
  {
    path: "/submission/",
    slug: "submission",
    title: "Submission",
    description: "How to prepare and submit a paper.",
    primary: true,
  },
  {
    path: "/program/",
    slug: "program",
    title: "Program",
    description: "Sessions, talks and times.",
    primary: true,
  },
  {
    path: "/keynotes/",
    slug: "keynotes",
    title: "Keynotes",
    description: "Keynote speakers and talks.",
    primary: true,
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
    description: "Registration, venue, visa letters, travel and accessibility.",
    primary: true,
  },
  {
    path: "/news/",
    slug: "news",
    title: "News",
    description: "Announcements about the workshop.",
    primary: true,
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
