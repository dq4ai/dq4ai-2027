import { describe, expect, it } from "vitest";
import {
  deadlineStatus,
  effectiveDate,
  formatAoE,
  formatAoEDay,
  formatDayInZone,
  formatDayRange,
  formatTimeInZone,
  isIsoWithZone,
  isOnDayInZone,
  parseIso,
  timeUntil,
  toIcsDate,
  toIcsUtc,
  type DeadlineInput,
} from "../../src/lib/dates";

const deadline = (date: string, extendedTo?: string): DeadlineInput => ({ date, extendedTo });
const END_OF_11_DEC_AOE = "2026-12-11T23:59:00-12:00";

describe("isIsoWithZone", () => {
  it.each(["2026-12-11T23:59:00-12:00", "2027-04-06T09:00:00+02:00", "2026-12-11T23:59:00Z"])(
    "accepts %s",
    (value) => expect(isIsoWithZone(value)).toBe(true),
  );
  it.each(["2026-12-11", "2026-12-11T23:59:00", "11 December", "2026-13-11T23:59:00Z", "TBA"])(
    "rejects %s",
    (value) => expect(isIsoWithZone(value)).toBe(false),
  );
  it("rejects calendar dates that do not exist", () => {
    expect(isIsoWithZone("2026-02-30T12:00:00Z")).toBe(false);
  });
});

describe("AoE formatting", () => {
  it("shows the deadline on its AoE calendar day", () => {
    expect(formatAoE(parseIso(END_OF_11_DEC_AOE))).toBe("11 December 2026, 23:59 AoE");
    expect(formatAoEDay(parseIso(END_OF_11_DEC_AOE))).toBe("11 December 2026");
  });
  it("converts an instant given in another zone to AoE", () => {
    // 12:00 UTC on the 12th is exactly midnight starting the 12th in UTC-12.
    expect(formatAoE(parseIso("2026-12-12T12:00:00Z"))).toBe("12 December 2026, 00:00 AoE");
    expect(formatAoE(parseIso("2026-12-12T11:59:00Z"))).toBe("11 December 2026, 23:59 AoE");
  });
});

describe("formatDayRange", () => {
  it("collapses a range within one month", () => {
    expect(formatDayRange("2027-04-06", "2027-04-09")).toBe("6–9 April 2027");
  });
  it("keeps spaced dashes across months", () => {
    expect(formatDayRange("2027-03-30", "2027-04-02")).toMatch(/^30 March\s–\s2 April 2027$/);
  });
});

describe("venue time zone across DST", () => {
  const PARIS = "Europe/Paris";
  it("uses CET before the March 2027 transition", () => {
    expect(formatTimeInZone(parseIso("2027-03-28T00:59:00Z"), PARIS)).toBe("01:59");
  });
  it("skips 02:00–03:00 at the spring transition", () => {
    expect(formatTimeInZone(parseIso("2027-03-28T01:00:00Z"), PARIS)).toBe("03:00");
  });
  it("uses CEST in April, when the conference runs", () => {
    expect(formatTimeInZone(parseIso("2027-04-06T07:00:00Z"), PARIS)).toBe("09:00");
  });
  it("repeats 02:00–03:00 at the autumn transition", () => {
    expect(formatTimeInZone(parseIso("2026-10-25T00:30:00Z"), PARIS)).toBe("02:30");
    expect(formatTimeInZone(parseIso("2026-10-25T01:30:00Z"), PARIS)).toBe("02:30");
  });
  it("detects the calendar day in the venue zone, not in UTC", () => {
    const lateNightUtc = parseIso("2027-04-05T22:30:00Z");
    expect(isOnDayInZone(lateNightUtc, "2027-04-06", PARIS)).toBe(true);
    expect(isOnDayInZone(lateNightUtc, "2027-04-05", PARIS)).toBe(false);
    expect(formatDayInZone(lateNightUtc, PARIS)).toBe("6 April 2027");
  });
});

describe("deadlineStatus", () => {
  it("is upcoming well before the AoE day", () => {
    expect(deadlineStatus(deadline(END_OF_11_DEC_AOE), parseIso("2026-11-06T12:00:00Z"))).toBe(
      "upcoming",
    );
  });
  it("is today during the deadline's AoE calendar day", () => {
    expect(deadlineStatus(deadline(END_OF_11_DEC_AOE), parseIso("2026-12-11T12:00:00Z"))).toBe(
      "today",
    );
  });
  it("stays open in Paris on the morning of the next local day", () => {
    // 08:00 on 12 December in Paris looks past the 11th, yet AoE it is still the 11th.
    const parisMorning = parseIso("2026-12-12T08:00:00+01:00");
    expect(formatDayInZone(parisMorning, "Europe/Paris")).toBe("12 December 2026");
    expect(deadlineStatus(deadline(END_OF_11_DEC_AOE), parisMorning)).toBe("today");
  });
  it("is passed one minute after the deadline", () => {
    expect(deadlineStatus(deadline(END_OF_11_DEC_AOE), parseIso("2026-12-12T12:00:00Z"))).toBe(
      "passed",
    );
  });
  it("is still open at the exact deadline instant", () => {
    expect(deadlineStatus(deadline(END_OF_11_DEC_AOE), parseIso(END_OF_11_DEC_AOE))).toBe("today");
  });
  it("is tba when the date is unknown", () => {
    expect(deadlineStatus(deadline("TBA"), parseIso("2026-11-06T12:00:00Z"))).toBe("tba");
  });
  it("follows the extended date, not the original", () => {
    const extended = deadline(END_OF_11_DEC_AOE, "2026-12-18T23:59:00-12:00");
    expect(effectiveDate(extended)).toBe("2026-12-18T23:59:00-12:00");
    expect(deadlineStatus(extended, parseIso("2026-12-15T12:00:00Z"))).toBe("upcoming");
  });
});

describe("timeUntil", () => {
  const from = parseIso("2026-12-01T00:00:00Z");
  it("splits the remaining time", () => {
    expect(timeUntil(parseIso("2026-12-03T05:30:00Z"), from)).toEqual({
      days: 2,
      hours: 5,
      minutes: 30,
    });
  });
  it("is null once the moment has passed", () => {
    expect(timeUntil(parseIso("2026-11-30T23:59:00Z"), from)).toBeNull();
  });
});

describe("iCalendar date forms", () => {
  it("writes instants in UTC", () => {
    expect(toIcsUtc(parseIso(END_OF_11_DEC_AOE))).toBe("20261212T115900Z");
  });
  it("writes all-day dates without separators", () => {
    expect(toIcsDate("2027-04-06")).toBe("20270406");
  });
  it("makes an all-day end date exclusive when asked for the next day", () => {
    expect(toIcsDate("2027-04-09", 1)).toBe("20270410");
    expect(toIcsDate("2027-03-31", 1)).toBe("20270401");
  });
});
