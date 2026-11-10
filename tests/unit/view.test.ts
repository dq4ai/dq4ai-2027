import { describe, expect, it } from "vitest";
import { cfpSchema, siteSchema, submissionSchema } from "../../src/lib/schemas";
import type { Site } from "../../src/lib/schemas";
import { pageContext, stripPrefix, topicAnchor } from "../../src/lib/view";

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

  it("the submission checklist and FAQ are gone, so leftover ones fail the build", () => {
    const minimal = { formatting: "TBA", anonymization: "TBA" };
    expect(submissionSchema.safeParse(minimal).success).toBe(true);
    expect(submissionSchema.safeParse({ ...minimal, faq: [] }).success).toBe(false);
  });
});

describe("topicAnchor", () => {
  it("gives each topic a stable address", () => {
    expect(topicAnchor("Knowledge graphs")).toBe("topic-knowledge-graphs");
    expect(topicAnchor("Quality in LLMs, NLP, and generative AI")).toBe(
      "topic-quality-in-llms-nlp-and-generative-ai",
    );
  });
});

describe("topics in content", () => {
  const topicsOnly = cfpSchema.shape.topics;
  it("a topic is a title and its bullet points", () => {
    expect(topicsOnly.safeParse([{ title: "t", items: ["a", "b"] }]).success).toBe(true);
  });
  it("a topic needs at least one bullet point", () => {
    expect(topicsOnly.safeParse([{ title: "t", items: [] }]).success).toBe(false);
  });
  it("the old one-sentence description fails the build, so it is not silently dropped", () => {
    expect(topicsOnly.safeParse([{ title: "t", description: "d" }]).success).toBe(false);
  });
  it("topics no longer take an icon, so a leftover icon field fails the build", () => {
    const parsed = topicsOnly.safeParse([{ title: "t", items: ["a"], icon: "knowledge-graph" }]);
    expect(parsed.success).toBe(false);
  });
});
