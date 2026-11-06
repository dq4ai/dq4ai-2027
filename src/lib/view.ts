/** Pure helpers shaping content for display. Kept apart from astro:content so they are testable. */
import { deadlineStatus, effectiveDate, parseIso, TBA, type DeadlineStatus } from "./dates";
import type { DateEntry, Person, Site } from "./schemas";

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

export function workshopTitle(site: Site): string {
  return `${site.edition} ${site.fullName}`;
}

export function hostLocation(site: Site): string {
  return `${site.host.city}, ${site.host.country}`;
}

export function isKnown(value: string | number | undefined): boolean {
  return value !== undefined && value !== TBA;
}
