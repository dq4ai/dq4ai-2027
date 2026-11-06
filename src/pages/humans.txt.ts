import type { APIRoute } from "astro";
import { getCommittees, getSite } from "../lib/content";
import { isKnown, workshopTitle } from "../lib/view";

export const GET: APIRoute = async () => {
  const [site, committees] = await Promise.all([getSite(), getCommittees()]);
  const sections = committees
    .filter((committee) => committee.people.length > 0)
    .map((committee) => {
      const lines = committee.people.map((person) =>
        isKnown(person.affiliation) ? `${person.name}, ${person.affiliation}` : person.name,
      );
      return [`/* ${committee.title} */`, ...lines].join("\n");
    });
  const text = [`${workshopTitle(site)} (${site.acronym} ${site.year})`, ...sections].join("\n\n");
  return new Response(`${text}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
