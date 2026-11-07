/** Pure helpers shaping content for display. Kept apart from astro:content so they are testable. */
import {
  deadlineStatus,
  effectiveDate,
  formatDayRange,
  formatIsoDay,
  parseIso,
  TBA,
  type DeadlineStatus,
} from "./dates";
import type { Cfp, DateEntry, Person, Site } from "./schemas";

export interface DeadlineView {
  id: string;
  label: string;
  kind: DateEntry["kind"];
  status: DeadlineStatus;
  /** Present when the date is known. */
  due?: Date;
  /** Present when the deadline was extended: the date it replaced. */
  previous?: Date;
}

export function toDeadlineViews(dates: DateEntry[], now: Date): DeadlineView[] {
  return dates.map((entry) => {
    const value = effectiveDate(entry);
    return {
      id: entry.id,
      label: entry.label,
      kind: entry.kind,
      status: deadlineStatus(entry, now),
      ...(value === TBA ? {} : { due: parseIso(value) }),
      ...(entry.extendedTo ? { previous: parseIso(entry.date) } : {}),
    };
  });
}

export type DatedDeadline = DeadlineView & { due: Date };

export function nextDeadline(views: DeadlineView[]): DatedDeadline | undefined {
  return views
    .filter((v): v is DatedDeadline => v.due !== undefined)
    .filter((v) => v.status === "upcoming" || v.status === "today")
    .sort((a, b) => a.due.getTime() - b.due.getTime())[0];
}

export const STATUS_LABELS: Record<DeadlineStatus, string> = {
  tba: "To be announced",
  upcoming: "Upcoming",
  today: "Today",
  passed: "Passed",
};

export function surnameOf(person: Person): string {
  return person.surname ?? person.name.trim().split(/\s+/).at(-1) ?? person.name;
}

export function sortBySurname<T extends Person>(people: T[]): T[] {
  return [...people].sort((a, b) =>
    surnameOf(a).localeCompare(surnameOf(b), "en", { sensitivity: "base" }),
  );
}

/** The wordmark's parts: the acronym's digit is the flagged cell. No digit, no parts. */
export function wordmarkParts(
  acronym: string,
): { before: string; digit: string; after: string } | undefined {
  const [, before = "", digit, after = ""] = /^(\D*)(\d)(.*)$/.exec(acronym) ?? [];
  return digit ? { before, digit, after } : undefined;
}

/** True until at least one paper type has a page limit. */
export function pageLimitsUnknown(cfp: Pick<Cfp, "paperTypes">): boolean {
  return cfp.paperTypes.every((type) => type.pageLimit === TBA);
}

export function workshopTitle(site: Site): string {
  return `${site.edition} ${site.fullName}`;
}

export function hostLocation(site: Site): string {
  return `${site.host.city}, ${site.host.country}`;
}

/** States the host conference's dates apart from the workshop's, which may fall on one day of them. */
export function hostDatesSentence(site: Site): string {
  const workshop = site.workshopDate === TBA ? "to be announced" : formatIsoDay(site.workshopDate);
  return `${site.host.name} runs ${formatDayRange(site.host.startDate, site.host.endDate)} in ${hostLocation(site)}. Workshop date: ${workshop}.`;
}

/** A self-contained description of the workshop, for the home page's search result. */
export function siteSummary(site: Site): string {
  return `${site.acronym} ${site.year}, the ${workshopTitle(site)}, co-located with ${site.host.name} in ${hostLocation(site)}.`;
}

/** Adds what a search result needs to identify the workshop to a page's own description. */
export function pageDescription(site: Site, description: string): string {
  return `${description} ${site.acronym} ${site.year}, workshop on ${site.title} at ${site.host.name}, ${hostLocation(site)}.`;
}

export function isKnown(value: string | number | undefined): boolean {
  return value !== undefined && value !== TBA;
}
