/** Rules that span several entries or files. Field-level rules are in schemas.ts. */
import {
  effectiveDate,
  formatAoE,
  isBeforeDayInZone,
  isIsoDay,
  isOnDayInZone,
  isoDayOrdering,
  parseIso,
  TBA,
} from "./dates";
import type {
  Committee,
  DateEntry,
  Keynote,
  Paper,
  Person,
  Session,
  Site,
  Sponsor,
  Talk,
} from "./schemas";

export interface ContentBundle {
  site: Site;
  dates: DateEntry[];
  people: Person[];
  committees: Committee[];
  keynotes: Keynote[];
  sessions: Session[];
  talks: Talk[];
  papers: Paper[];
  sponsors?: Sponsor[];
}

export interface ContentIssue {
  file: string;
  field: string;
  message: string;
}

export interface ValidationOptions {
  imageExists?: (file: string) => boolean;
}

const uniqueIds = (file: string, entries: { id: string }[]): ContentIssue[] => {
  const seen = new Set<string>();
  const issues: ContentIssue[] = [];
  for (const { id } of entries) {
    if (seen.has(id)) issues.push({ file, field: `${id}.id`, message: `"${id}" is used twice` });
    seen.add(id);
  }
  return issues;
};

function validateHostWindow(site: Site): ContentIssue[] {
  const issues: ContentIssue[] = [];
  if (isoDayOrdering(site.host.endDate, site.host.startDate) < 0) {
    issues.push({
      file: "site.yaml",
      field: "host.endDate",
      message: "must not be before host.startDate",
    });
  }
  if (
    isIsoDay(site.workshopDate) &&
    (isoDayOrdering(site.workshopDate, site.host.startDate) < 0 ||
      isoDayOrdering(site.workshopDate, site.host.endDate) > 0)
  ) {
    issues.push({
      file: "site.yaml",
      field: "workshopDate",
      message: `${site.workshopDate} is outside the host conference dates (${site.host.startDate} to ${site.host.endDate})`,
    });
  }
  return issues;
}

function validateDates(site: Site, dates: DateEntry[]): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const dated = dates.filter((entry) => effectiveDate(entry) !== TBA);

  for (const entry of dates) {
    if (entry.extendedTo === undefined) continue;
    const field = `${entry.id}.extendedTo`;
    if (entry.date === TBA) {
      issues.push({ file: "dates.yaml", field, message: "cannot extend a date that is still TBA" });
    } else if (parseIso(entry.extendedTo) <= parseIso(entry.date)) {
      issues.push({
        file: "dates.yaml",
        field,
        message: `must be later than the original date (${formatAoE(parseIso(entry.date))})`,
      });
    }
  }

  const sequence: DateEntry["kind"][] = ["abstract", "submission", "notification", "camera-ready"];
  for (const [index, kind] of sequence.entries()) {
    for (const later of dated.filter((entry) => entry.kind === kind)) {
      const earlierKinds = sequence.slice(0, index);
      for (const earlier of dated.filter((entry) => earlierKinds.includes(entry.kind))) {
        const earlierDue = parseIso(effectiveDate(earlier));
        const laterDue = parseIso(effectiveDate(later));
        if (laterDue <= earlierDue) {
          const usesExtension = later.extendedTo !== undefined;
          issues.push({
            file: "dates.yaml",
            field: `${later.id}.${usesExtension ? "extendedTo" : "date"}`,
            message: `${later.label} (${formatAoE(laterDue)}) must be after ${earlier.label} (${formatAoE(earlierDue)})`,
          });
        }
      }
    }
  }

  const workshopKnown = isIsoDay(site.workshopDate);
  const limit = workshopKnown ? site.workshopDate : site.host.startDate;
  const limitName = workshopKnown ? "the workshop" : "the host conference";
  for (const entry of dated) {
    if (!isBeforeDayInZone(parseIso(effectiveDate(entry)), limit, site.venueTimezone)) {
      issues.push({
        file: "dates.yaml",
        field: `${entry.id}.${entry.extendedTo ? "extendedTo" : "date"}`,
        message: `${entry.label} must fall before ${limitName} (${limit})`,
      });
    }
  }
  return issues;
}

function validateCommittees(committees: Committee[], personIds: Set<string>): ContentIssue[] {
  const issues: ContentIssue[] = [];
  for (const committee of committees) {
    const field = `${committee.id}.members`;
    for (const member of committee.members) {
      if (!personIds.has(member)) {
        issues.push({
          file: "committees.yaml",
          field,
          message: `"${member}" is not in people.yaml`,
        });
      }
    }
    const duplicates = committee.members.filter((m, i, all) => all.indexOf(m) !== i);
    for (const member of new Set(duplicates)) {
      issues.push({ file: "committees.yaml", field, message: `"${member}" is listed twice` });
    }
  }
  return issues;
}

function validateSessions(site: Site, sessions: Session[], personIds: Set<string>): ContentIssue[] {
  const issues: ContentIssue[] = [];
  if (sessions.length > 0 && site.workshopDate === TBA) {
    issues.push({
      file: "site.yaml",
      field: "workshopDate",
      message: "must be set before sessions can be added to sessions.yaml",
    });
  }

  for (const session of sessions) {
    if (parseIso(session.end) <= parseIso(session.start)) {
      issues.push({
        file: "sessions.yaml",
        field: `${session.id}.end`,
        message: "must be later than the session's start",
      });
    }
    if (
      isIsoDay(site.workshopDate) &&
      !isOnDayInZone(parseIso(session.start), site.workshopDate, site.venueTimezone)
    ) {
      issues.push({
        file: "sessions.yaml",
        field: `${session.id}.start`,
        message: `must fall on the workshop date (${site.workshopDate}, ${site.venueTimezone})`,
      });
    }
    if (session.chair !== undefined && !personIds.has(session.chair)) {
      issues.push({
        file: "sessions.yaml",
        field: `${session.id}.chair`,
        message: `"${session.chair}" is not in people.yaml`,
      });
    }
  }

  const ordered = [...sessions].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  for (const [index, session] of ordered.entries()) {
    const previous = ordered[index - 1];
    if (previous && parseIso(session.start) < parseIso(previous.end)) {
      issues.push({
        file: "sessions.yaml",
        field: `${session.id}.start`,
        message: `"${session.title}" overlaps "${previous.title}"`,
      });
    }
  }
  return issues;
}

function validateTalks(
  talks: Talk[],
  sessions: Session[],
  papers: Paper[],
  personIds: Set<string>,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const sessionIds = new Set(sessions.map((session) => session.id));
  const paperIds = new Set(papers.map((paper) => paper.id));
  for (const talk of talks) {
    if (!sessionIds.has(talk.session)) {
      issues.push({
        file: "talks.yaml",
        field: `${talk.id}.session`,
        message: `"${talk.session}" is not in sessions.yaml`,
      });
    }
    if (talk.paper !== undefined && !paperIds.has(talk.paper)) {
      issues.push({
        file: "talks.yaml",
        field: `${talk.id}.paper`,
        message: `"${talk.paper}" is not in papers.yaml`,
      });
    }
    for (const speaker of talk.speakers) {
      if (!personIds.has(speaker)) {
        issues.push({
          file: "talks.yaml",
          field: `${talk.id}.speakers`,
          message: `"${speaker}" is not in people.yaml`,
        });
      }
    }
  }
  return issues;
}

function validateKeynotes(
  keynotes: Keynote[],
  personIds: Set<string>,
  imageExists: (file: string) => boolean,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  for (const keynote of keynotes) {
    if (!personIds.has(keynote.speaker)) {
      issues.push({
        file: "keynotes.yaml",
        field: `${keynote.id}.speaker`,
        message: `"${keynote.speaker}" is not in people.yaml`,
      });
    }
    if (keynote.photo && !imageExists(keynote.photo.file)) {
      issues.push({
        file: "keynotes.yaml",
        field: `${keynote.id}.photo.file`,
        message: `"${keynote.photo.file}" is not in the images folder`,
      });
    }
  }
  return issues;
}

function validateHostPhoto(site: Site, imageExists: (file: string) => boolean): ContentIssue[] {
  if (!site.hostPhoto || imageExists(site.hostPhoto.file)) return [];
  return [
    {
      file: "site.yaml",
      field: "hostPhoto.file",
      message: `"${site.hostPhoto.file}" is not in the images folder`,
    },
  ];
}

function validateSponsors(
  sponsors: Sponsor[],
  imageExists: (file: string) => boolean,
): ContentIssue[] {
  return sponsors
    .filter((sponsor) => !imageExists(sponsor.logo.file))
    .map((sponsor) => ({
      file: "sponsors.yaml",
      field: `${sponsor.id}.logo.file`,
      message: `"${sponsor.logo.file}" is not in the images folder`,
    }));
}

export function crossValidate(
  bundle: ContentBundle,
  { imageExists = () => true }: ValidationOptions = {},
): ContentIssue[] {
  const { site, dates, people, committees, keynotes, sessions, talks, papers } = bundle;
  const personIds = new Set(people.map((person) => person.id));
  return [
    ...validateHostPhoto(site, imageExists),
    ...uniqueIds("dates.yaml", dates),
    ...uniqueIds("people.yaml", people),
    ...uniqueIds("committees.yaml", committees),
    ...uniqueIds("keynotes.yaml", keynotes),
    ...uniqueIds("sessions.yaml", sessions),
    ...uniqueIds("talks.yaml", talks),
    ...uniqueIds("papers.yaml", papers),
    ...validateHostWindow(site),
    ...validateDates(site, dates),
    ...validateCommittees(committees, personIds),
    ...validateSessions(site, sessions, personIds),
    ...validateTalks(talks, sessions, papers, personIds),
    ...validateKeynotes(keynotes, personIds, imageExists),
    ...validateSponsors(bundle.sponsors ?? [], imageExists),
  ];
}

export function formatIssues(issues: ContentIssue[]): string {
  const lines = issues.map((issue) => `  • ${issue.file} → ${issue.field}: ${issue.message}`);
  return [
    `The site content has ${issues.length} problem${issues.length === 1 ? "" : "s"}:`,
    ...lines,
    "Fix the listed fields under src/content/ and build again. See docs/CONTENT_GUIDE.md.",
  ].join("\n");
}
