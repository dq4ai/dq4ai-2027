import type { APIRoute, GetStaticPaths } from "astro";
import { getDeadlines, getNow, getProgram, getSite } from "../../lib/content";
import { buildCalendar, type CalendarEvent } from "../../lib/ics";
import { parseIso } from "../../lib/dates";
import { absoluteUrl } from "../../lib/paths";
import { hostLocation, isKnown } from "../../lib/view";

type Program = Awaited<ReturnType<typeof getProgram>>;

const sessionEvent = (session: Program[number], locationName: string): CalendarEvent => ({
  id: `session-${session.id}`,
  summary: session.title,
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
      // Always present: a calendar file must hold at least one event, even while dates are TBA.
      {
        id: "host-conference",
        summary: site.host.name,
        start: { day: site.host.startDate },
        end: { day: site.host.endDate },
        location: locationName,
        url: site.host.url,
      },
    ];
  } else if (name === "program") {
    title = `${label} program`;
    events = program.map((session) => sessionEvent(session, locationName));
  } else {
    const session = program.find((candidate) => `session-${candidate.id}` === name);
    if (!session) throw new Error(`Unknown calendar "${name}"`);
    title = `${label}: ${session.title}`;
    events = [sessionEvent(session, locationName)];
  }

  return new Response(buildCalendar({ name: title, domain, stamp: getNow(), events }), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
};
