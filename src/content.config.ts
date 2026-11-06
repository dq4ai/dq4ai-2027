import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { parse } from "yaml";
import { contentDir } from "./lib/content-dir";
import {
  cfpSchema,
  committeesSchema,
  datesSchema,
  editionsSchema,
  keynotesSchema,
  newsSchema,
  papersSchema,
  peopleSchema,
  proseSectionSchema,
  sessionsSchema,
  siteSchema,
  sponsorsSchema,
  submissionSchema,
  talksSchema,
} from "./lib/schemas";

/**
 * A file holding a list. Astro's store does not keep file order, and order is meaningful here
 * (chairs before the committee, submission before notification), so each entry records its place.
 */
const listLoader = (name: string) =>
  file(`${contentDir}/${name}.yaml`, {
    parser: (text) =>
      (parse(text) as Record<string, unknown>[]).map((entry, position) => ({
        ...entry,
        position,
      })),
  });

/** A file holding one object rather than a list, exposed as a single entry with id "main". */
const singleLoader = (name: string) =>
  file(`${contentDir}/${name}.yaml`, {
    parser: (text) => ({ main: parse(text) as Record<string, unknown> }),
  });

const position = { position: z.number() };

export const collections = {
  site: defineCollection({ loader: singleLoader("site"), schema: siteSchema }),
  cfp: defineCollection({ loader: singleLoader("cfp"), schema: cfpSchema }),
  submission: defineCollection({ loader: singleLoader("submission"), schema: submissionSchema }),
  dates: defineCollection({ loader: listLoader("dates"), schema: datesSchema.extend(position) }),
  people: defineCollection({ loader: listLoader("people"), schema: peopleSchema.extend(position) }),
  committees: defineCollection({
    loader: listLoader("committees"),
    schema: committeesSchema.extend(position),
  }),
  keynotes: defineCollection({
    loader: listLoader("keynotes"),
    schema: keynotesSchema.extend(position),
  }),
  sessions: defineCollection({
    loader: listLoader("sessions"),
    schema: sessionsSchema.extend(position),
  }),
  talks: defineCollection({ loader: listLoader("talks"), schema: talksSchema.extend(position) }),
  papers: defineCollection({ loader: listLoader("papers"), schema: papersSchema.extend(position) }),
  editions: defineCollection({
    loader: listLoader("editions"),
    schema: editionsSchema.extend(position),
  }),
  sponsors: defineCollection({
    loader: listLoader("sponsors"),
    schema: sponsorsSchema.extend(position),
  }),
  attend: defineCollection({
    loader: listLoader("attend"),
    schema: proseSectionSchema.extend(position),
  }),
  policies: defineCollection({
    loader: listLoader("policies"),
    schema: proseSectionSchema.extend(position),
  }),
  news: defineCollection({
    loader: glob({ pattern: "*.md", base: `${contentDir}/news` }),
    schema: newsSchema,
  }),
};
