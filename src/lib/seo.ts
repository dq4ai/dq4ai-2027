/** Structured data for search engines. Pure, so a test can validate the output. */
import { TBA } from "./dates";
import type { Person, Site } from "./schemas";
import { hostLocation, workshopTitle } from "./view";

interface EventJsonLdInput {
  site: Site;
  url: string;
  organizers: Person[];
}

export function buildEventJsonLd({ site, url, organizers }: EventJsonLdInput) {
  const location = {
    "@type": "Place",
    name: hostLocation(site),
    address: {
      "@type": "PostalAddress",
      addressLocality: site.host.city,
      addressCountry: site.host.country,
    },
  };
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${workshopTitle(site)} (${site.acronym} ${site.year})`,
    alternateName: `${site.acronym} ${site.year}`,
    description: site.tagline,
    url,
    // Left out until the chairs confirm the day: stating a guess would mislead search engines.
    ...(site.workshopDate === TBA
      ? {}
      : { startDate: site.workshopDate, endDate: site.workshopDate }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location,
    organizer: organizers.map((person) => ({
      "@type": "Person",
      name: person.name,
      ...(person.affiliation === TBA
        ? {}
        : { affiliation: { "@type": "Organization", name: person.affiliation } }),
    })),
    superEvent: {
      "@type": "Event",
      name: site.host.name,
      url: site.host.url,
      startDate: site.host.startDate,
      endDate: site.host.endDate,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location,
    },
  };
}

/** Serializes for a <script> block; escaping "<" stops content from closing the element. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}
