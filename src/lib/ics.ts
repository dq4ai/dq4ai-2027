/** Builds RFC 5545 iCalendar files. Date conversion lives in dates.ts. */
import { toIcsDate, toIcsUtc } from "./dates";

export type CalendarTime = { instant: Date } | { day: string };

export interface CalendarEvent {
  id: string;
  summary: string;
  start: CalendarTime;
  end?: CalendarTime;
  location?: string;
  description?: string;
  url?: string;
}

export interface CalendarInput {
  name: string;
  domain: string;
  stamp: Date;
  events: CalendarEvent[];
}

const MAX_OCTETS = 75;

export function escapeText(text: string): string {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll(/\r?\n/g, "\\n");
}

/** Folds at 75 octets, never inside a character. Continuation lines start with a space. */
export function foldLine(line: string): string {
  const segments: string[] = [];
  let current = "";
  let octets = 0;
  for (const character of line) {
    const size = Buffer.byteLength(character);
    if (octets + size > MAX_OCTETS) {
      segments.push(current);
      current = ` ${character}`;
      octets = 1 + size;
    } else {
      current += character;
      octets += size;
    }
  }
  segments.push(current);
  return segments.join("\r\n");
}

function timeProperty(name: "DTSTART" | "DTEND", time: CalendarTime): string {
  if ("instant" in time) return `${name}:${toIcsUtc(time.instant)}`;
  return `${name};VALUE=DATE:${toIcsDate(time.day, name === "DTEND" ? 1 : 0)}`;
}

function eventLines(event: CalendarEvent, domain: string, stamp: Date): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${event.id}@${domain}`,
    `DTSTAMP:${toIcsUtc(stamp)}`,
    timeProperty("DTSTART", event.start),
    ...(event.end ? [timeProperty("DTEND", event.end)] : []),
    `SUMMARY:${escapeText(event.summary)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    "END:VEVENT",
  ];
}

export function buildCalendar({ name, domain, stamp, events }: CalendarInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${domain}//${escapeText(name)}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    ...events.flatMap((event) => eventLines(event, domain, stamp)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n").concat("\r\n");
}
