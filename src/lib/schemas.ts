/**
 * Field-level rules for everything in src/content. Rules that span several entries or files are
 * in validation.ts. Unknown facts are written as the literal value TBA, which is accepted where
 * a fact may legitimately be pending and reported by the placeholder scan at build time.
 */
import { z } from "astro/zod";
import { isIsoDay, isIsoWithZone, isValidTimeZone, TBA } from "./dates";

const tba = z.literal(TBA);
const id = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use lowercase letters, digits and hyphens, e.g. jane-doe");
const text = z.string().trim().min(1, "must not be empty");
const httpUrl = z.url({ protocol: /^https?$/, error: "must be a full http(s) URL" });
const isoDay = z.string().refine(isIsoDay, "must be a real date written YYYY-MM-DD");
const isoInstant = z
  .string()
  .refine(isIsoWithZone, "must be ISO 8601 with a time zone, e.g. 2026-12-11T23:59:00-12:00");

const urlOrTba = z.union([tba, httpUrl]);
const dayOrTba = z.union([tba, isoDay]);
const instantOrTba = z.union([tba, isoInstant]);
const emailOrTba = z.union([tba, z.email("must be an email address")]);

export const imageSchema = z.strictObject({
  file: text,
  alt: text.describe("Describes the image for people who cannot see it"),
});

/** A photo of someone else's work: everything its license asks the page to say is required. */
const creditedPhotoSchema = imageSchema.extend({
  subject: text,
  author: text,
  license: text,
  licenseUrl: httpUrl,
  source: text,
  sourceUrl: httpUrl,
});

export const siteSchema = z.strictObject({
  acronym: text,
  title: text,
  fullName: text,
  edition: text,
  year: z.number().int(),
  tagline: text,
  host: z.strictObject({
    name: text,
    url: httpUrl,
    workshopsUrl: httpUrl.optional(),
    startDate: isoDay,
    endDate: isoDay,
    city: text,
    country: text,
    cityUrl: httpUrl.optional(),
  }),
  venueTimezone: z.string().refine(isValidTimeZone, "must be an IANA time zone, e.g. Europe/Paris"),
  workshopDate: dayOrTba,
  contactEmail: emailOrTba,
  submissionSystem: text,
  submissionUrl: urlOrTba,
  proceedings: z.strictObject({ name: text, url: httpUrl }),
  paperTemplate: text,
  paperTemplateUrl: urlOrTba.optional(),
  /** Optional: when the organizers expect to announce what is still unknown. */
  statusNote: text.optional(),
  reviewModel: text,
  hostPhoto: creditedPhotoSchema.optional(),
  cfpPhoto: creditedPhotoSchema.optional(),
  deployment: z.strictObject({
    githubOwner: text,
    repoName: text,
    customDomain: z.string(),
  }),
});

export const datesSchema = z.strictObject({
  id,
  label: text,
  kind: z.enum(["abstract", "submission", "notification", "camera-ready", "other"]),
  date: instantOrTba,
  extendedTo: isoInstant.optional(),
});

export const peopleSchema = z.strictObject({
  id,
  name: text,
  surname: text.optional(),
  affiliation: text,
  country: text.optional(),
  url: httpUrl.optional(),
  orcid: httpUrl.optional(),
  dblp: httpUrl.optional(),
});

export const committeesSchema = z.strictObject({
  id,
  title: text,
  order: z.enum(["listed", "surname", "name"]),
  note: text.optional(),
  members: z.array(id),
});

export const keynotesSchema = z.strictObject({
  id,
  speaker: id,
  title: text,
  abstract: text,
  bio: text,
  photo: imageSchema.optional(),
});

export const sessionsSchema = z.strictObject({
  id,
  title: text,
  kind: z.enum(["talks", "keynote", "break", "other"]),
  start: isoInstant,
  end: isoInstant,
  room: text,
  chair: id.optional(),
});

export const talksSchema = z.strictObject({
  id,
  session: id,
  title: text,
  speakers: z.array(id),
  paper: id.optional(),
  abstract: text.optional(),
  slidesUrl: httpUrl.optional(),
});

export const papersSchema = z.strictObject({
  id,
  title: text,
  authors: z.array(text).min(1, "list at least one author"),
  type: z.enum(["research", "system", "vision"]),
  abstract: text.optional(),
  url: httpUrl.optional(),
});

export const newsSchema = z.strictObject({
  title: text,
  date: isoDay,
  summary: text,
});

export const editionsSchema = z.strictObject({
  id,
  edition: text,
  year: z.union([tba, z.number().int()]),
  host: text,
  city: text,
  url: urlOrTba,
  current: z.boolean().default(false),
});

export const sponsorsSchema = z.strictObject({
  id,
  name: text,
  url: httpUrl,
  logo: imageSchema,
});

const linkSchema = z.strictObject({ label: text, url: urlOrTba });

export const proseSectionSchema = z.strictObject({
  id,
  heading: text,
  body: text,
  links: z.array(linkSchema).optional(),
});

export const cfpSchema = z.strictObject({
  scope: z.array(text).min(1),
  goal: text,
  communities: z.array(text).min(1),
  exchange: z.tuple([text, text]),
  topicsIntro: text,
  topics: z
    .array(
      z.strictObject({
        title: text,
        description: text,
      }),
    )
    .min(1),
  paperTypes: z
    .array(z.strictObject({ id, title: text, description: text, pageLimit: text }))
    .min(1),
  proceedingsNote: text,
  presentation: text,
  dualSubmission: text,
  generativeAi: text,
});

export const submissionSchema = z.strictObject({
  steps: z
    .array(
      z.strictObject({
        title: text,
        detail: text,
        link: z
          .strictObject({
            label: text,
            path: z.string().regex(/^\/.*/, "must be a path inside the site, starting with /"),
          })
          .optional(),
      }),
    )
    .min(1),
  formatting: text,
  anonymization: text,
  faq: z.array(z.strictObject({ question: text, answer: text })),
});

export type Site = z.infer<typeof siteSchema>;
export type DateEntry = z.infer<typeof datesSchema>;
export type Person = z.infer<typeof peopleSchema>;
export type Committee = z.infer<typeof committeesSchema>;
export type Keynote = z.infer<typeof keynotesSchema>;
export type Session = z.infer<typeof sessionsSchema>;
export type Talk = z.infer<typeof talksSchema>;
export type Paper = z.infer<typeof papersSchema>;
export type Edition = z.infer<typeof editionsSchema>;
export type Sponsor = z.infer<typeof sponsorsSchema>;
export type Cfp = z.infer<typeof cfpSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type ProseSection = z.infer<typeof proseSectionSchema>;
