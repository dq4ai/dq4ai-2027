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

/** Whether to offer the submit button. An unknown deadline has not passed. */
export function submissionOpen(site: Pick<Site, "submissionUrl">, views: DeadlineView[]): boolean {
  if (site.submissionUrl === TBA) return false;
  return views.find((view) => view.id === "submission")?.status !== "passed";
}

/** The moment a page already built should stop offering the submit button. */
export function submissionCloses(views: DeadlineView[]): string | undefined {
  return views.find((view) => view.id === "submission")?.due?.toISOString();
}

/** Authors must meet a deadline; a notification is only a date to wait for. */
export function stripPrefix(kind: DateEntry["kind"]): string {
  return kind === "notification" ? "Next date:" : "Next deadline:";
}

/** A topic's address on the Call for Papers page, so a tile can lead straight to it. */
export function topicAnchor(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `topic-${slug}`;
}

export function surnameOf(person: Person): string {
  return person.surname ?? person.name.trim().split(/\s+/).at(-1) ?? person.name;
}

export function sortBySurname<T extends Person>(people: T[]): T[] {
  return [...people].sort((a, b) =>
    surnameOf(a).localeCompare(surnameOf(b), "en", { sensitivity: "base" }),
  );
}

/** Alphabetical by the name as it reads on the page, first name first. */
export function sortByName<T extends Person>(people: T[]): T[] {
  return [...people].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
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

/** "Second International Workshop on": the words the banner sets above the title. */
export function titleLead(site: Site): string {
  const lead = site.fullName.endsWith(site.title)
    ? site.fullName.slice(0, -site.title.length).trimEnd()
    : site.fullName;
  return `${site.edition} ${lead}`;
}

export function hostLocation(site: Site): string {
  return `${site.host.city}, ${site.host.country}`;
}

/**
 * When the workshop is. Once its day is known that day is the only date given: the organizers asked
 * to leave out the host conference's. Until then, the host's dates, kept apart from the workshop's.
 */
export function hostDatesSentence(site: Site): string {
  if (site.workshopDate !== TBA) {
    return `Workshop date: ${formatIsoDay(site.workshopDate)}, in ${hostLocation(site)}.`;
  }
  return `${site.host.name} runs ${formatDayRange(site.host.startDate, site.host.endDate)} in ${hostLocation(site)}. Workshop date: to be announced.`;
}

/** What this is, for someone who arrives on an inner page. Host dates are never the workshop's. */
export function pageContext(site: Site): string {
  const label = `${site.acronym} ${site.year} workshop`;
  return site.workshopDate === TBA
    ? `${label} at ${site.host.name} (${formatDayRange(site.host.startDate, site.host.endDate)}), ${hostLocation(site)}`
    : `${label}, ${formatIsoDay(site.workshopDate)}, at ${site.host.name}, ${hostLocation(site)}`;
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

/** One sentence naming the facts not yet known, so they do not each take a row. */
export function pendingSentence(labels: string[]): string {
  if (labels.length === 0) return "";
  const [first = "", ...rest] = labels.map((label, index) =>
    index === 0 ? label : label.charAt(0).toLowerCase() + label.slice(1),
  );
  const last = rest.pop();
  const list = last ? `${[first, ...rest].join(", ")} and ${last}` : first;
  return `${list}: to be announced.`;
}
