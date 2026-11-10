import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { buildCfpText, wrapText } from "../../src/lib/cfp-text";
import { checkContent } from "../../src/lib/load-content";
import { buildEventJsonLd, serializeJsonLd } from "../../src/lib/seo";
import { scriptHash, THEME_INIT_SCRIPT, contentSecurityPolicy } from "../../src/lib/theme";
import { siteSchema, cfpSchema } from "../../src/lib/schemas";
import {
  hostDatesSentence,
  nextDeadline,
  pageDescription,
  siteSummary,
  sortByName,
  sortBySurname,
  surnameOf,
  toDeadlineViews,
} from "../../src/lib/view";
import { formatCountdown } from "../../src/lib/dates";
import { parse } from "yaml";
import { readFileSync } from "node:fs";

const load = (directory: string, file: string): unknown =>
  parse(readFileSync(resolve(directory, file), "utf8"));
const site = siteSchema.parse(load("src/content", "site.yaml"));
const cfp = cfpSchema.parse(load("src/content", "cfp.yaml"));

describe("the committed content", () => {
  it("passes every rule and reports its placeholders", () => {
    const { issues, placeholders } = checkContent("src/content");
    expect(issues).toEqual([]);
    expect(placeholders).toContainEqual({ file: "site.yaml", field: "submissionUrl" });
  });
  it("the populated fixture passes every rule", () => {
    expect(checkContent("tests/fixtures/content-populated").issues).toEqual([]);
  });
});

describe("view helpers", () => {
  const person = (name: string, surname?: string) => ({
    id: "x",
    name,
    affiliation: "Y",
    ...(surname ? { surname } : {}),
  });
  it("uses the last word as surname unless told otherwise", () => {
    expect(surnameOf(person("Fabian M. Suchanek"))).toBe("Suchanek");
    expect(surnameOf(person("Jesualdo Fernandez Breis", "Fernandez Breis"))).toBe(
      "Fernandez Breis",
    );
  });
  it("sorts by surname, ignoring case and accents", () => {
    const sorted = sortBySurname([person("A Zed"), person("B Élan"), person("C alpha")]);
    expect(sorted.map((p) => p.name)).toEqual(["C alpha", "B Élan", "A Zed"]);
  });
  it("sorts by name as written, ignoring case and accents", () => {
    const sorted = sortByName([
      person("Mourad Ouzzani"),
      person("Élan Zed"),
      person("asma Abboura"),
    ]);
    expect(sorted.map((p) => p.name)).toEqual(["asma Abboura", "Élan Zed", "Mourad Ouzzani"]);
  });
  it("picks the earliest open deadline, using extensions", () => {
    const views = toDeadlineViews(
      [
        { id: "a", label: "A", kind: "abstract", date: "2026-11-01T23:59:00-12:00" },
        {
          id: "b",
          label: "B",
          kind: "submission",
          date: "2026-11-02T23:59:00-12:00",
          extendedTo: "2026-12-20T23:59:00-12:00",
        },
        { id: "c", label: "C", kind: "other", date: "TBA" },
      ],
      new Date("2026-11-10T00:00:00Z"),
    );
    expect(nextDeadline(views)?.id).toBe("b");
    expect(views[1]?.previous?.toISOString()).toBe("2026-11-03T11:59:00.000Z");
  });
});

describe("plain-text CFP", () => {
  it("wraps at 72 columns", () => {
    for (const line of wrapText("word ".repeat(60)).split("\n")) {
      expect(line.length).toBeLessThanOrEqual(72);
    }
  });
  it("carries extended dates and marks unknown facts", () => {
    const text = buildCfpText({
      site,
      cfp,
      chairs: [{ id: "x", name: "Jane Doe", affiliation: "Example University" }],
      siteUrl: "https://example.org/",
      deadlines: toDeadlineViews(
        [
          {
            id: "s",
            label: "Paper submission",
            kind: "submission",
            date: "2026-12-11T23:59:00-12:00",
            extendedTo: "2026-12-18T23:59:00-12:00",
          },
        ],
        new Date("2026-11-10T00:00:00Z"),
      ),
    });
    expect(text).toContain("18 December 2026, 23:59 AoE");
    expect(text).toContain("extended from 11 December 2026");
    expect(text).toContain("Submission link: To be announced");
    expect(text).toContain("Jane Doe, Example University");
    expect(text).not.toContain("TBA");
  });

  const plainText = () =>
    buildCfpText({
      site,
      cfp,
      siteUrl: "https://example.org/",
      chairs: [],
      deadlines: [],
    }).replace(/\s+/g, " ");

  it("does not present the host conference's dates as the workshop's", () => {
    const text = plainText();
    expect(text).not.toMatch(/Co-located with [^.]*\d+–\d+ April 2027/);
    expect(text).toContain(hostDatesSentence(site));
  });

  it("states the dual submission and generative AI policies, even while unknown", () => {
    const text = plainText();
    expect(text).toContain("Dual submission: To be announced");
    expect(text).toContain("Use of generative AI: To be announced");
  });
});

describe("sentences for people and search engines", () => {
  it("keeps the conference's dates apart from an unknown workshop date", () => {
    expect(hostDatesSentence({ ...site, workshopDate: "TBA" })).toBe(
      "EDBT/ICDT 2027 runs 6–9 April 2027 in Lille, France. Workshop date: to be announced.",
    );
  });
  it("gives the workshop date alone once it is known, as the organizers asked", () => {
    expect(hostDatesSentence({ ...site, workshopDate: "2027-04-07" })).toBe(
      "Workshop date: 7 April 2027, in Lille, France.",
    );
  });
  it("identifies the workshop and host in the home and page descriptions", () => {
    for (const description of [siteSummary(site), pageDescription(site, "Sessions and times.")]) {
      expect(description).toContain("DQ4AI 2027");
      expect(description).toContain("Data Quality for Artificial Intelligence");
      expect(description).toContain("EDBT/ICDT 2027");
    }
    expect(pageDescription(site, "Sessions and times.")).toMatch(/^Sessions and times\. /);
  });
});

describe("formatCountdown", () => {
  it("uses whole words and drops minutes while days remain", () => {
    expect(formatCountdown({ days: 42, hours: 14, minutes: 45 })).toBe("42 days 14 hours left");
  });
  it("uses the singular for one", () => {
    expect(formatCountdown({ days: 1, hours: 1, minutes: 0 })).toBe("1 day 1 hour left");
  });
  it("shows minutes on the last day", () => {
    expect(formatCountdown({ days: 0, hours: 3, minutes: 5 })).toBe("3 hours 5 minutes left");
  });
});

describe("JSON-LD", () => {
  const organizers = [{ id: "x", name: "Jane Doe", affiliation: "TBA" }];
  // The real site has its date now; these two pin it back to TBA to keep checking that case.
  const undated = { ...site, workshopDate: "TBA" };
  it("omits the start date while it is TBA", () => {
    const data = buildEventJsonLd({ site: undated, url: "https://example.org/", organizers });
    expect(data).not.toHaveProperty("startDate");
    expect(data.organizer[0]).not.toHaveProperty("affiliation");
  });
  it("leaves out the host's dates while the workshop date is TBA, so they cannot be misread", () => {
    const data = buildEventJsonLd({ site: undated, url: "https://example.org/", organizers });
    expect(data.superEvent.name).toBe("EDBT/ICDT 2027");
    expect(data.superEvent).not.toHaveProperty("startDate");
    expect(data.superEvent).not.toHaveProperty("endDate");
  });
  it("states the date once known", () => {
    const data = buildEventJsonLd({
      site: { ...site, workshopDate: "2027-04-07" },
      url: "https://example.org/",
      organizers,
    });
    expect(data).toMatchObject({
      startDate: "2027-04-07",
      endDate: "2027-04-07",
      superEvent: { startDate: "2027-04-06", endDate: "2027-04-09" },
    });
  });
  it("cannot be broken out of its script element", () => {
    expect(serializeJsonLd({ a: "</script>" })).not.toContain("</script>");
  });
});

describe("Content-Security-Policy", () => {
  it("allows only the hashed theme script inline", () => {
    const policy = contentSecurityPolicy();
    expect(policy).toContain(scriptHash(THEME_INIT_SCRIPT));
    expect(policy).not.toContain("unsafe");
  });
});
