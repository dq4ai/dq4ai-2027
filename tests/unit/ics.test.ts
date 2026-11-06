import ICAL from "ical.js";
import { describe, expect, it } from "vitest";
import { buildCalendar, escapeText, foldLine } from "../../src/lib/ics";

const stamp = new Date("2026-11-06T12:00:00Z");

describe("escapeText", () => {
  it("escapes the characters iCalendar reserves", () => {
    expect(escapeText("a, b; c\\d\ne")).toBe("a\\, b\\; c\\\\d\\ne");
  });
});

describe("foldLine", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });
  it("folds at 75 octets without splitting a multi-byte character", () => {
    const folded = foldLine(`SUMMARY:${"é".repeat(80)}`);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(Buffer.byteLength(part)).toBeLessThanOrEqual(75);
    expect(parts.map((part, i) => (i === 0 ? part : part.slice(1))).join("")).toBe(
      `SUMMARY:${"é".repeat(80)}`,
    );
  });
});

describe("buildCalendar", () => {
  const ics = buildCalendar({
    name: "DQ4AI 2027, deadlines",
    domain: "dq4ai.github.io",
    stamp,
    events: [
      {
        id: "submission",
        summary: "DQ4AI: paper submission; AoE",
        start: { instant: new Date("2026-12-12T11:59:00Z") },
      },
      {
        id: "session-1",
        summary: "Morning session",
        location: "Room 1, Lille",
        description: "Line one\nLine two",
        url: "https://example.org/program/",
        start: { instant: new Date("2027-04-06T07:00:00Z") },
        end: { instant: new Date("2027-04-06T08:30:00Z") },
      },
      {
        id: "host",
        summary: "EDBT/ICDT 2027",
        start: { day: "2027-04-06" },
        end: { day: "2027-04-09" },
      },
    ],
  });

  it("uses CRLF line endings", () => {
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replaceAll("\r\n", "")).not.toMatch(/\n/);
  });

  it("round-trips through a real iCalendar parser", () => {
    const calendar = new ICAL.Component(ICAL.parse(ics));
    const events = calendar.getAllSubcomponents("vevent").map((c) => new ICAL.Event(c));
    expect(events).toHaveLength(3);
    expect(events[0]?.summary).toBe("DQ4AI: paper submission; AoE");
    expect(events[0]?.startDate.toJSDate().toISOString()).toBe("2026-12-12T11:59:00.000Z");
    expect(events[1]?.location).toBe("Room 1, Lille");
    expect(events[1]?.description).toBe("Line one\nLine two");
    expect(events[1]?.endDate.toJSDate().toISOString()).toBe("2027-04-06T08:30:00.000Z");
  });

  it("makes the end of an all-day event exclusive", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20270406");
    expect(ics).toContain("DTEND;VALUE=DATE:20270410");
  });

  it("gives every event a stable unique id and stamp", () => {
    expect(ics).toContain("UID:submission@dq4ai.github.io");
    expect(ics.match(/DTSTAMP:20261106T120000Z/g)).toHaveLength(3);
  });
});
