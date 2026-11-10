/**
 * The one module that does date logic. Deadlines are shown in AoE, the program in the venue's
 * time zone, and all formatting goes through Intl.DateTimeFormat. Pure and browser-safe, so the
 * countdown and time-zone toggle scripts can import it too.
 */

export const TBA = "TBA";

/** "Anywhere on Earth" is UTC-12. POSIX-style IANA names invert the sign, hence GMT+12. */
export const AOE_ZONE = "Etc/GMT+12";

const LOCALE = "en-GB";
const ISO_WITH_ZONE = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DeadlineStatus = "tba" | "upcoming" | "today" | "passed";

export interface DeadlineInput {
  date: string;
  extendedTo?: string | undefined;
}

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
}

function isRealDay(year: number, month: number, day: number): boolean {
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

export function isIsoDay(value: string): boolean {
  const match = ISO_DAY.exec(value);
  return match !== null && isRealDay(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function isIsoWithZone(value: string): boolean {
  const match = ISO_WITH_ZONE.exec(value);
  return (
    match !== null &&
    isRealDay(Number(match[1]), Number(match[2]), Number(match[3])) &&
    !Number.isNaN(Date.parse(value))
  );
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat(LOCALE, { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function parseIso(value: string): Date {
  if (!isIsoWithZone(value)) {
    throw new Error(`Expected an ISO 8601 date with a time zone, got "${value}"`);
  }
  return new Date(value);
}

/** Parses an ISO day as UTC midnight, for ordering and for formatting with `timeZone: "UTC"`. */
function parseDay(day: string): Date {
  if (!isIsoDay(day)) throw new Error(`Expected a YYYY-MM-DD date, got "${day}"`);
  return new Date(`${day}T00:00:00Z`);
}

function dayKeyInZone(date: Date, zone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDayInZone(date: Date, zone: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: zone, dateStyle: "long" }).format(date);
}

export function formatTimeInZone(date: Date, zone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** A session's start in a visitor's zone. A bare time under the venue's date would misstate the day. */
export function formatLocalSessionTime(date: Date, zone: string, venueZone: string): string {
  const time = formatTimeInZone(date, zone);
  if (dayKeyInZone(date, zone) === dayKeyInZone(date, venueZone)) return time;
  const day = new Intl.DateTimeFormat(LOCALE, {
    timeZone: zone,
    day: "numeric",
    month: "long",
  }).format(date);
  return `${time} (${day})`;
}

/** A moment in the form `parseIso` accepts. */
export function toIsoInstant(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function formatAoEDay(date: Date): string {
  return formatDayInZone(date, AOE_ZONE);
}

export function formatAoE(date: Date): string {
  return `${formatAoEDay(date)}, ${formatTimeInZone(date, AOE_ZONE)} AoE`;
}

/** Formats an instant in the reader's own zone, naming the zone. Used by the toggle script. */
export function formatInLocalZone(date: Date, zone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    ...(zone ? { timeZone: zone } : {}),
    dateStyle: "long",
    timeStyle: "short",
    hourCycle: "h23",
  })
    .format(date)
    .concat(` (${localZoneName(date, zone)})`);
}

function localZoneName(date: Date, zone?: string): string {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    ...(zone ? { timeZone: zone } : {}),
    timeZoneName: "short",
  }).formatToParts(date);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "local time";
}

/** Formats a plain day such as a conference date, with no zone conversion. */
export function formatIsoDay(day: string): string {
  return formatDayInZone(parseDay(day), "UTC");
}

/** "April 6, 2027": the banner writes the workshop's day month first, as the previous edition did. */
export function formatHeadlineDay(day: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", dateStyle: "long" }).format(
    parseDay(day),
  );
}

/** "6–9 April 2027", collapsing the parts both ends share. */
export function formatDayRange(startDay: string, endDay: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", dateStyle: "long" })
    .formatRange(parseDay(startDay), parseDay(endDay))
    .replace(/^(\d+)\s–\s(\d+)/, "$1–$2");
}

export function isOnDayInZone(date: Date, day: string, zone: string): boolean {
  return dayKeyInZone(date, zone) === day;
}

/** True when the instant falls before the start of the given day in the given zone. */
export function isBeforeDayInZone(date: Date, day: string, zone: string): boolean {
  return dayKeyInZone(date, zone) < day;
}

export function effectiveDate(deadline: DeadlineInput): string {
  return deadline.extendedTo ?? deadline.date;
}

export function deadlineStatus(deadline: DeadlineInput, now: Date): DeadlineStatus {
  const value = effectiveDate(deadline);
  if (value === TBA) return "tba";
  const due = parseIso(value);
  if (now.getTime() > due.getTime()) return "passed";
  return dayKeyInZone(now, AOE_ZONE) === dayKeyInZone(due, AOE_ZONE) ? "today" : "upcoming";
}

export function timeUntil(target: Date, now: Date): TimeRemaining | null {
  const totalMinutes = Math.floor((target.getTime() - now.getTime()) / 60_000);
  if (totalMinutes < 0) return null;
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

const unit = (count: number, name: string) => `${count} ${name}${count === 1 ? "" : "s"}`;

/** Whole words read better aloud than "42d 14h". Minutes only matter on the last day. */
export function formatCountdown({ days, hours, minutes }: TimeRemaining): string {
  if (days > 0) return `${unit(days, "day")} ${unit(hours, "hour")} left`;
  if (hours === 0 && minutes === 0) return "Less than a minute left";
  return `${unit(hours, "hour")} ${unit(minutes, "minute")} left`;
}

export function isoDayOrdering(a: string, b: string): number {
  return parseDay(a).getTime() - parseDay(b).getTime();
}

export function toIcsUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

/** An iCalendar DATE. `addDays` exists because all-day DTEND values are exclusive. */
export function toIcsDate(day: string, addDays = 0): string {
  const date = parseDay(day);
  date.setUTCDate(date.getUTCDate() + addDays);
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

/**
 * The moment build-time statuses are computed for. DQ4AI_NOW pins it so test builds stay
 * deterministic as real deadlines pass.
 */
export function buildTime(pinned: string | undefined): Date {
  return pinned ? parseIso(pinned) : new Date();
}
