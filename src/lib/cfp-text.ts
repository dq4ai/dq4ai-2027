/** Builds the plain-text Call for Papers for mailing lists from the same data as the CFP page. */
import { formatAoE, formatDayRange, formatIsoDay, TBA } from "./dates";
import type { Cfp, Person, Site } from "./schemas";
import type { DeadlineView } from "./view";
import { hostLocation, isKnown, workshopTitle } from "./view";

const WIDTH = 72;
const PENDING = "To be announced";

export function wrapText(text: string, width = WIDTH, indent = ""): string {
  const lines: string[] = [];
  let line = indent;
  for (const word of text.trim().split(/\s+/)) {
    if (line.length + word.length + 1 > width && line.trim()) {
      lines.push(line.trimEnd());
      line = indent;
    }
    line += `${word} `;
  }
  lines.push(line.trimEnd());
  return lines.join("\n");
}

const known = (value: string) => (value === TBA ? PENDING : value);

const heading = (title: string) => `${title.toUpperCase()}\n${"-".repeat(title.length)}`;

const personLine = (person: Person) =>
  isKnown(person.affiliation) ? `${person.name}, ${person.affiliation}` : person.name;

export interface CfpTextInput {
  site: Site;
  cfp: Cfp;
  deadlines: DeadlineView[];
  chairs: Person[];
  siteUrl: string;
}

export function buildCfpText({ site, cfp, deadlines, chairs, siteUrl }: CfpTextInput): string {
  const workshopDay = site.workshopDate === TBA ? PENDING : formatIsoDay(site.workshopDate);
  const deadlineLines = deadlines.map((deadline) => {
    const date = deadline.due ? formatAoE(deadline.due) : PENDING;
    const previous = deadline.previous ? ` (extended from ${formatAoE(deadline.previous)})` : "";
    return `  ${deadline.label}: ${date}${previous}`;
  });

  return [
    "CALL FOR PAPERS",
    wrapText(`${workshopTitle(site)} (${site.acronym} ${site.year})`),
    wrapText(
      `Co-located with ${site.host.name}, ${hostLocation(site)}, ${formatDayRange(site.host.startDate, site.host.endDate)}`,
    ),
    siteUrl,
    "",
    heading("Important dates"),
    ...deadlineLines,
    `  Workshop: ${workshopDay}`,
    "  All deadlines are Anywhere on Earth (AoE, UTC-12).",
    "",
    heading("Scope"),
    [...cfp.scope, cfp.goal].map((paragraph) => wrapText(paragraph)).join("\n\n"),
    "",
    heading("Topics of interest"),
    wrapText(cfp.topicsIntro),
    "",
    cfp.topics
      .map((topic) => `  * ${topic.title}\n${wrapText(topic.description, WIDTH, "    ")}`)
      .join("\n"),
    "",
    heading("Paper categories"),
    cfp.paperTypes
      .map(
        (type) =>
          `  * ${type.title} (page limit: ${known(type.pageLimit)})\n${wrapText(type.description, WIDTH, "    ")}`,
      )
      .join("\n"),
    "",
    heading("Submission"),
    `  Submission system: ${known(site.submissionSystem)}`,
    `  Submission link: ${known(site.submissionUrl)}`,
    `  Template: ${known(site.paperTemplate)}`,
    `  Review model: ${known(site.reviewModel)}`,
    "",
    wrapText(`${cfp.proceedingsNote} ${cfp.presentation}`),
    "",
    heading("Workshop chairs"),
    ...chairs.map((chair) => `  ${personLine(chair)}`),
    ...(isKnown(site.contactEmail) ? ["", `Contact: ${site.contactEmail}`] : []),
    "",
  ].join("\n");
}
