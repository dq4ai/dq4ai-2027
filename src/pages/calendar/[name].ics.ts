import type { APIRoute, GetStaticPaths } from "astro";
import { getDeadlines, getNow, getProgram, getSite } from "../../lib/content";
import { buildCalendar, type CalendarEvent } from "../../lib/ics";
import { parseIso, TBA } from "../../lib/dates";
import { absoluteUrl } from "../../lib/paths";
import { hostLocation, isKnown } from "../../lib/view";

type Program = Awaited<ReturnType<typeof getProgram>>;

const sessionEvent = (
  session: Program[number],
  label: string,
  locationName: string,
  programUrl: string,
): CalendarEvent => ({
  id: `session-${session.id}`,
  // Read in a calendar among other events, so it has to say what it belongs to.
  summary: `${label}: ${session.title}`,
  url: programUrl,
  start: { instant: parseIso(session.start) },
  end: { instant: parseIso(session.end) },
  location: isKnown(session.room) ? `${session.room}, ${locationName}` : locationName,
  ...(session.talks.length > 0
    ? { description: session.talks.map((talk) => talk.title).join("\n") }
    : {}),
});

export const getStaticPaths = (async () => {
  const program = await getProgram();
  return [
    { params: { name: "deadlines" } },
    ...(program.length > 0 ? [{ params: { name: "program" } }] : []),
    ...program.map((session) => ({ params: { name: `session-${session.id}` } })),
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, site: astroSite }) => {
  const [site, deadlines, program] = await Promise.all([getSite(), getDeadlines(), getProgram()]);
  const label = `${site.acronym} ${site.year}`;
  const locationName = hostLocation(site);
  const domain = new URL(absoluteUrl("/", astroSite)).hostname;
  const name = params.name ?? "";
  const programUrl = absoluteUrl("/program/", astroSite);

  let events: CalendarEvent[];
  let title: string;
  if (name === "deadlines") {
    title = `${label} deadlines`;
    events = [
      ...deadlines.flatMap((deadline): CalendarEvent[] =>
        deadline.due
          ? [
              {
                id: `deadline-${deadline.id}`,
                summary: `${label}: ${deadline.label} (AoE)`,
                start: { instant: deadline.due },
                url: absoluteUrl("/dates/", astroSite),
              },
            ]
          : [],
      ),
      ...(site.workshopDate === TBA
        ? []
        : [
            {
              id: "workshop",
              summary: `${label} workshop`,
              start: { day: site.workshopDate },
              end: { day: site.workshopDate },
              location: locationName,
              url: absoluteUrl("/", astroSite),
            },
          ]),
      // Always present: a calendar file must hold at least one event, even while dates are TBA.
      {
        id: "host-conference",
        // Labelled so subscribers do not read the host's dates as the workshop's.
        summary:
          site.workshopDate === TBA
            ? `${site.host.name} (host conference; ${site.acronym} date TBA)`
            : `${site.host.name} (host conference)`,
        start: { day: site.host.startDate },
        end: { day: site.host.endDate },
        location: locationName,
        url: site.host.url,
      },
    ];
  } else if (name === "program") {
    title = `${label} program`;
    events = program.map((session) => sessionEvent(session, label, locationName, programUrl));
  } else {
    const session = program.find((candidate) => `session-${candidate.id}` === name);
    if (!session) throw new Error(`Unknown calendar "${name}"`);
    title = `${label}: ${session.title}`;
    events = [sessionEvent(session, label, locationName, programUrl)];
  }

  return new Response(buildCalendar({ name: title, domain, stamp: getNow(), events }), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
};
