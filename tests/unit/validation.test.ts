import { describe, expect, it } from "vitest";
import { findPlaceholders } from "../../src/lib/placeholders";
import { datesSchema, imageSchema, peopleSchema, siteSchema } from "../../src/lib/schemas";
import { crossValidate, formatIssues, type ContentBundle } from "../../src/lib/validation";

const site = siteSchema.parse({
  acronym: "DQ4AI",
  title: "Data Quality for Artificial Intelligence",
  fullName: "International Workshop on Data Quality for Artificial Intelligence",
  edition: "Second",
  year: 2027,
  tagline: "A tagline.",
  host: {
    name: "EDBT/ICDT 2027",
    url: "https://edbticdt2027.github.io/",
    startDate: "2027-04-06",
    endDate: "2027-04-09",
    city: "Lille",
    country: "France",
  },
  venueTimezone: "Europe/Paris",
  workshopDate: "2027-04-07",
  contactEmail: "TBA",
  submissionSystem: "TBA",
  submissionUrl: "TBA",
  proceedings: { name: "CEUR Workshop Proceedings", url: "https://ceur-ws.org/" },
  paperTemplate: "TBA",
  reviewModel: "TBA",
  deployment: { githubOwner: "kaaaziz", repoName: "dq4ai-2027", customDomain: "" },
});

const bundle = (overrides: Partial<ContentBundle> = {}): ContentBundle => ({
  site,
  dates: [
    {
      id: "submission",
      label: "Paper submission",
      kind: "submission",
      date: "2026-12-11T23:59:00-12:00",
    },
    {
      id: "notification",
      label: "Notification",
      kind: "notification",
      date: "2027-02-01T23:59:00-12:00",
    },
    {
      id: "camera-ready",
      label: "Camera-ready",
      kind: "camera-ready",
      date: "2027-02-20T23:59:00-12:00",
    },
  ],
  people: [
    { id: "ada", name: "Ada Example", affiliation: "Example University" },
    { id: "grace", name: "Grace Example", affiliation: "Example University" },
  ],
  committees: [
    { id: "chairs", title: "Workshop Chairs", order: "listed", members: ["ada", "grace"] },
  ],
  keynotes: [],
  sessions: [],
  talks: [],
  papers: [],
  ...overrides,
});

const session = (id: string, start: string, end: string) => ({
  id,
  title: id,
  kind: "talks" as const,
  start,
  end,
  room: "TBA",
});

describe("crossValidate", () => {
  it("accepts consistent content", () => {
    expect(crossValidate(bundle())).toEqual([]);
  });

  it("accepts TBA dates and skips the checks that depend on them", () => {
    const dates = bundle().dates.map((d) => ({ ...d, date: "TBA" }));
    expect(crossValidate(bundle({ dates, site: { ...site, workshopDate: "TBA" } }))).toEqual([]);
  });

  it("names the file and field when notification precedes submission", () => {
    const dates = bundle().dates.map((d) =>
      d.id === "notification" ? { ...d, date: "2026-12-01T23:59:00-12:00" } : d,
    );
    const issues = crossValidate(bundle({ dates }));
    expect(issues[0]).toMatchObject({ file: "dates.yaml", field: "notification.date" });
    expect(issues[0]?.message).toMatch(/after Paper submission/);
  });

  it("rejects camera-ready before notification", () => {
    const dates = bundle().dates.map((d) =>
      d.id === "camera-ready" ? { ...d, date: "2027-01-20T23:59:00-12:00" } : d,
    );
    expect(crossValidate(bundle({ dates }))[0]?.field).toBe("camera-ready.date");
  });

  it("requires deadlines before the workshop", () => {
    const dates = bundle().dates.map((d) =>
      d.id === "camera-ready" ? { ...d, date: "2027-04-07T23:59:00-12:00" } : d,
    );
    const issues = crossValidate(bundle({ dates }));
    expect(issues.some((i) => i.message.includes("before the workshop"))).toBe(true);
  });

  it("falls back to the host start when the workshop date is TBA", () => {
    const dates = bundle().dates.map((d) =>
      d.id === "camera-ready" ? { ...d, date: "2027-04-07T23:59:00-12:00" } : d,
    );
    const issues = crossValidate(bundle({ dates, site: { ...site, workshopDate: "TBA" } }));
    expect(issues.some((i) => i.message.includes("before the host conference"))).toBe(true);
  });

  it("requires the workshop inside the host conference dates", () => {
    const issues = crossValidate(bundle({ site: { ...site, workshopDate: "2027-05-01" } }));
    expect(issues[0]).toMatchObject({ file: "site.yaml", field: "workshopDate" });
  });

  it("rejects an extension that is not later than the original", () => {
    const dates = bundle().dates.map((d) =>
      d.id === "submission" ? { ...d, extendedTo: "2026-12-01T23:59:00-12:00" } : d,
    );
    expect(crossValidate(bundle({ dates }))[0]?.field).toBe("submission.extendedTo");
  });

  it("orders on the extended date", () => {
    const dates = bundle().dates.map((d) =>
      d.id === "submission" ? { ...d, extendedTo: "2027-02-10T23:59:00-12:00" } : d,
    );
    expect(crossValidate(bundle({ dates }))[0]?.field).toBe("notification.date");
  });

  it("rejects duplicate ids", () => {
    const people = [...bundle().people, { id: "ada", name: "Ada Twin", affiliation: "Elsewhere" }];
    expect(crossValidate(bundle({ people }))[0]).toMatchObject({
      file: "people.yaml",
      field: "ada.id",
    });
  });

  it("rejects committee members who are not in the registry", () => {
    const committees = [{ id: "pc", title: "PC", order: "surname" as const, members: ["nobody"] }];
    const issues = crossValidate(bundle({ committees }));
    expect(issues[0]).toMatchObject({ file: "committees.yaml", field: "pc.members" });
    expect(issues[0]?.message).toContain("nobody");
  });

  it("rejects a person listed twice in one committee", () => {
    const committees = [
      { id: "pc", title: "PC", order: "surname" as const, members: ["ada", "ada"] },
    ];
    expect(crossValidate(bundle({ committees }))[0]?.field).toBe("pc.members");
  });

  it("rejects overlapping sessions", () => {
    const sessions = [
      session("a", "2027-04-07T09:00:00+02:00", "2027-04-07T10:30:00+02:00"),
      session("b", "2027-04-07T10:00:00+02:00", "2027-04-07T11:00:00+02:00"),
    ];
    const issues = crossValidate(bundle({ sessions }));
    expect(issues[0]).toMatchObject({ file: "sessions.yaml", field: "b.start" });
    expect(issues[0]?.message).toMatch(/overlaps/);
  });

  it("allows back-to-back sessions", () => {
    const sessions = [
      session("a", "2027-04-07T09:00:00+02:00", "2027-04-07T10:00:00+02:00"),
      session("b", "2027-04-07T10:00:00+02:00", "2027-04-07T11:00:00+02:00"),
    ];
    expect(crossValidate(bundle({ sessions }))).toEqual([]);
  });

  it("rejects a session ending before it starts", () => {
    const sessions = [session("a", "2027-04-07T11:00:00+02:00", "2027-04-07T10:00:00+02:00")];
    expect(crossValidate(bundle({ sessions }))[0]?.field).toBe("a.end");
  });

  it("rejects sessions not on the workshop date, using the venue day", () => {
    const sessions = [session("a", "2027-04-08T09:00:00+02:00", "2027-04-08T10:00:00+02:00")];
    expect(crossValidate(bundle({ sessions }))[0]?.field).toBe("a.start");
  });

  it("rejects a program when the workshop date is still TBA", () => {
    const sessions = [session("a", "2027-04-07T09:00:00+02:00", "2027-04-07T10:00:00+02:00")];
    const issues = crossValidate(bundle({ sessions, site: { ...site, workshopDate: "TBA" } }));
    expect(issues[0]).toMatchObject({ file: "site.yaml", field: "workshopDate" });
  });

  it("rejects talks with dangling references", () => {
    const sessions = [session("a", "2027-04-07T09:00:00+02:00", "2027-04-07T10:00:00+02:00")];
    const talks = [
      { id: "t", session: "missing", title: "Talk", speakers: ["ghost"], paper: "lost" },
    ];
    const fields = crossValidate(bundle({ sessions, talks })).map((i) => i.field);
    expect(fields).toEqual(expect.arrayContaining(["t.session", "t.speakers", "t.paper"]));
  });

  it("rejects keynotes for unknown speakers", () => {
    const keynotes = [{ id: "k", speaker: "ghost", title: "TBA", abstract: "TBA", bio: "TBA" }];
    expect(crossValidate(bundle({ keynotes }))[0]?.field).toBe("k.speaker");
  });

  it("rejects missing images", () => {
    const keynotes = [
      {
        id: "k",
        speaker: "ada",
        title: "TBA",
        abstract: "TBA",
        bio: "TBA",
        photo: { file: "nope.jpg", alt: "Ada Example" },
      },
    ];
    const issues = crossValidate(bundle({ keynotes }), { imageExists: () => false });
    expect(issues[0]?.field).toBe("k.photo.file");
  });
});

describe("schemas", () => {
  it("rejects a date without a time zone", () => {
    const result = datesSchema.safeParse({
      id: "x",
      label: "X",
      kind: "submission",
      date: "2026-12-11T23:59:00",
    });
    expect(result.success).toBe(false);
  });
  it("requires affiliation", () => {
    expect(peopleSchema.safeParse({ id: "x", name: "X" }).success).toBe(false);
  });
  it("rejects malformed URLs but accepts TBA", () => {
    const base = { id: "x", name: "X", affiliation: "Y" };
    expect(peopleSchema.safeParse({ ...base, dblp: "not a url" }).success).toBe(false);
    expect(peopleSchema.safeParse({ ...base, dblp: "https://dblp.org/pid/1/2" }).success).toBe(
      true,
    );
  });
  it("rejects an unknown time zone", () => {
    expect(siteSchema.safeParse({ ...site, venueTimezone: "Not/AZone" }).success).toBe(false);
  });
  it("requires alt text on images", () => {
    expect(imageSchema.safeParse({ file: "a.jpg" }).success).toBe(false);
    expect(imageSchema.safeParse({ file: "a.jpg", alt: " " }).success).toBe(false);
    expect(imageSchema.safeParse({ file: "a.jpg", alt: "A portrait" }).success).toBe(true);
  });
});

describe("formatIssues", () => {
  it("gives a human-readable line naming file and field", () => {
    expect(formatIssues([{ file: "dates.yaml", field: "a.date", message: "is wrong" }])).toContain(
      "dates.yaml → a.date: is wrong",
    );
  });
});

describe("findPlaceholders", () => {
  it("lists every TBA with its file and readable path", () => {
    const found = findPlaceholders({
      "site.yaml": { contactEmail: "TBA", acronym: "DQ4AI" },
      "dates.yaml": [{ id: "submission", date: "TBA" }],
    });
    expect(found).toEqual([
      { file: "site.yaml", field: "contactEmail" },
      { file: "dates.yaml", field: "submission.date" },
    ]);
  });
});
