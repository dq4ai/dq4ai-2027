/** Typed access to the content collections. Pages read content through here. */
import { getCollection, type CollectionEntry } from "astro:content";
import { buildTime } from "./dates";
import type { Person } from "./schemas";
import { sortBySurname, toDeadlineViews } from "./view";

const onlyEntry = <T extends { data: unknown }>(entries: T[], file: string): T["data"] => {
  const [entry] = entries;
  if (!entry) throw new Error(`${file}.yaml is empty`);
  return entry.data;
};

export const getSite = async () => onlyEntry(await getCollection("site"), "site");
export const getCfp = async () => onlyEntry(await getCollection("cfp"), "cfp");
export const getSubmission = async () => onlyEntry(await getCollection("submission"), "submission");

type ListCollection =
  | "dates"
  | "people"
  | "committees"
  | "keynotes"
  | "sessions"
  | "talks"
  | "papers"
  | "editions"
  | "sponsors"
  | "attend"
  | "policies";

/** Entries in the order they appear in their YAML file. */
const listOf = async <C extends ListCollection>(collection: C) => {
  const entries = (await getCollection(collection)) as CollectionEntry<C>[];
  return entries
    .map((entry) => entry.data as CollectionEntry<C>["data"])
    .sort((a, b) => a.position - b.position);
};

export const getDateEntries = () => listOf("dates");

export const getNow = () => buildTime(process.env.DQ4AI_NOW);

export const getDeadlines = async () => toDeadlineViews(await getDateEntries(), getNow());

export const getPeople = async (): Promise<Map<string, Person>> => {
  const people = await listOf("people");
  return new Map(people.map((person) => [person.id, person]));
};

export const requirePerson = (people: Map<string, Person>, id: string): Person => {
  const person = people.get(id);
  if (!person) throw new Error(`Unknown person "${id}"`);
  return person;
};

export const getCommittees = async () => {
  const [committees, people] = await Promise.all([listOf("committees"), getPeople()]);
  return committees.map((committee) => {
    const members = committee.members.map((id) => requirePerson(people, id));
    return {
      ...committee,
      people: committee.order === "surname" ? sortBySurname(members) : members,
    };
  });
};

export const getKeynotes = async () => {
  const [keynotes, people] = await Promise.all([listOf("keynotes"), getPeople()]);
  return keynotes.map((keynote) => ({
    ...keynote,
    person: requirePerson(people, keynote.speaker),
  }));
};

export const getProgram = async () => {
  const [sessions, talks, papers, people] = await Promise.all([
    listOf("sessions"),
    listOf("talks"),
    listOf("papers"),
    getPeople(),
  ]);
  const paperById = new Map(papers.map((paper) => [paper.id, paper]));
  return sessions
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .map((session) => ({
      ...session,
      chairPerson: session.chair ? requirePerson(people, session.chair) : undefined,
      talks: talks
        .filter((talk) => talk.session === session.id)
        .map((talk) => ({
          ...talk,
          speakerPeople: talk.speakers.map((id) => requirePerson(people, id)),
          paperEntry: talk.paper ? paperById.get(talk.paper) : undefined,
        })),
    }));
};

export const getPapers = () => listOf("papers");
export const getEditions = () => listOf("editions");
export const getSponsors = () => listOf("sponsors");
export const getAttend = () => listOf("attend");
export const getPolicies = () => listOf("policies");

export const getNews = async () =>
  (await getCollection("news")).sort((a, b) => b.data.date.localeCompare(a.data.date));
