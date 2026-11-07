import { describe, expect, it } from "vitest";
import { parseIso } from "../../src/lib/dates";
import { siteSchema, submissionSchema } from "../../src/lib/schemas";
import type { Site } from "../../src/lib/schemas";
import { pageContext, stripPrefix, submissionOpen, type DeadlineView } from "../../src/lib/view";

const site = {
  acronym: "DQ4AI",
  year: 2027,
  workshopDate: "TBA",
  submissionUrl: "https://example.org/submit",
  host: {
    name: "EDBT/ICDT 2027",
    url: "https://example.org",
    startDate: "2027-04-06",
    endDate: "2027-04-09",
    city: "Lille",
    country: "France",
  },
} as Site;

const deadline = (id: string, status: DeadlineView["status"]): DeadlineView => ({
  id,
  label: id,
  kind: "submission",
  status,
  ...(status === "tba" ? {} : { due: parseIso("2026-12-18T23:59:00-12:00") }),
});

describe("pageContext", () => {
  it("keeps the host's dates apart from a workshop date not yet known", () => {
    expect(pageContext(site)).toBe(
      "DQ4AI 2027 workshop at EDBT/ICDT 2027 (6–9 April 2027), Lille, France",
    );
  });
  it("gives the workshop's own date once known", () => {
    expect(pageContext({ ...site, workshopDate: "2027-04-07" })).toBe(
      "DQ4AI 2027 workshop, 7 April 2027, at EDBT/ICDT 2027, Lille, France",
    );
  });
});

describe("submissionOpen", () => {
  it("is closed with no submission link", () => {
    expect(
      submissionOpen({ ...site, submissionUrl: "TBA" }, [deadline("submission", "upcoming")]),
    ).toBe(false);
  });
  it("is open while the deadline is ahead, or on its day", () => {
    expect(submissionOpen(site, [deadline("submission", "upcoming")])).toBe(true);
    expect(submissionOpen(site, [deadline("submission", "today")])).toBe(true);
  });
  it("is open while the deadline is unknown", () => {
    expect(submissionOpen(site, [deadline("submission", "tba")])).toBe(true);
  });
  it("closes once the deadline passes", () => {
    expect(submissionOpen(site, [deadline("submission", "passed")])).toBe(false);
  });
  it("ignores other deadlines", () => {
    expect(
      submissionOpen(site, [deadline("abstract", "passed"), deadline("submission", "upcoming")]),
    ).toBe(true);
  });
});

describe("stripPrefix", () => {
  it("calls something authors must meet a deadline", () => {
    for (const kind of ["abstract", "submission", "camera-ready"] as const) {
      expect(stripPrefix(kind)).toBe("Next deadline:");
    }
  });
  it("does not call an announcement a deadline", () => {
    expect(stripPrefix("notification")).toBe("Next date:");
  });
});

describe("content options", () => {
  const minimalSite = {
    acronym: "DQ4AI",
    title: "t",
    fullName: "f",
    edition: "Second",
    year: 2027,
    tagline: "t",
    host: {
      name: "h",
      url: "https://example.org",
      startDate: "2027-04-06",
      endDate: "2027-04-09",
      city: "c",
      country: "c",
    },
    venueTimezone: "Europe/Paris",
    workshopDate: "TBA",
    contactEmail: "TBA",
    submissionSystem: "TBA",
    submissionUrl: "TBA",
    proceedings: { name: "p", url: "https://example.org" },
    paperTemplate: "TBA",
    reviewModel: "TBA",
    deployment: { githubOwner: "o", repoName: "r", customDomain: "" },
  };

  it("a template may have an address", () => {
    expect(
      siteSchema.safeParse({ ...minimalSite, paperTemplateUrl: "https://example.org/t.zip" })
        .success,
    ).toBe(true);
    expect(siteSchema.safeParse({ ...minimalSite, paperTemplateUrl: "TBA" }).success).toBe(true);
    expect(siteSchema.safeParse({ ...minimalSite, paperTemplateUrl: "nope" }).success).toBe(false);
  });

  it("organizers may add a status note, but need not", () => {
    expect(siteSchema.safeParse(minimalSite).success).toBe(true);
    expect(siteSchema.safeParse({ ...minimalSite, statusNote: "Soon." }).success).toBe(true);
  });

  const minimalSubmission = { formatting: "TBA", anonymization: "TBA", faq: [] };

  it("a checklist step may link inside the site", () => {
    const step = { title: "t", detail: "d", link: { label: "l", path: "/dates/" } };
    expect(submissionSchema.safeParse({ ...minimalSubmission, steps: [step] }).success).toBe(true);
  });

  it("a checklist step's link must be a path inside the site", () => {
    const step = { title: "t", detail: "d", link: { label: "l", path: "https://example.org" } };
    expect(submissionSchema.safeParse({ ...minimalSubmission, steps: [step] }).success).toBe(false);
  });
});
