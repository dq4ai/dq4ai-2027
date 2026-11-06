/**
 * Reads the raw content files for the build guard. Pages use Astro content collections instead;
 * this exists so errors can name the file and field before Astro starts rendering.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { z } from "astro/zod";
import { parse } from "yaml";
import { findPlaceholders, type Placeholder } from "./placeholders";
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
} from "./schemas";
import { crossValidate, type ContentBundle, type ContentIssue } from "./validation";

export interface ContentCheck {
  issues: ContentIssue[];
  placeholders: Placeholder[];
}

function fieldName(path: PropertyKey[], root: unknown): string {
  const parts = path.map((key, index) => {
    if (typeof key !== "number") return String(key);
    const entry = (root as Record<number, unknown>[])[key];
    const id =
      index === 0 && typeof entry === "object" && entry !== null
        ? Reflect.get(entry, "id")
        : undefined;
    return typeof id === "string" ? id : `[${key}]`;
  });
  return parts.join(".") || "(file)";
}

export function checkContent(directory: string): ContentCheck {
  const issues: ContentIssue[] = [];
  const raw: Record<string, unknown> = {};

  const read = <S extends z.ZodType>(file: string, schema: S): z.output<S> | undefined => {
    const path = join(directory, file);
    let value: unknown;
    try {
      value = parse(readFileSync(path, "utf8"));
    } catch (error) {
      issues.push({
        file,
        field: "(file)",
        message: (error as Error).message.split("\n")[0] ?? "",
      });
      return undefined;
    }
    raw[file] = value;
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    for (const problem of result.error.issues) {
      issues.push({ file, field: fieldName(problem.path, value), message: problem.message });
    }
    return undefined;
  };
  const readList = <S extends z.ZodType>(file: string, schema: S) =>
    read(file, schema.array()) ?? [];

  const site = read("site.yaml", siteSchema);
  const bundle = {
    dates: readList("dates.yaml", datesSchema),
    people: readList("people.yaml", peopleSchema),
    committees: readList("committees.yaml", committeesSchema),
    keynotes: readList("keynotes.yaml", keynotesSchema),
    sessions: readList("sessions.yaml", sessionsSchema),
    talks: readList("talks.yaml", talksSchema),
    papers: readList("papers.yaml", papersSchema),
    sponsors: readList("sponsors.yaml", sponsorsSchema),
  } satisfies Omit<ContentBundle, "site">;
  readList("editions.yaml", editionsSchema);
  readList("attend.yaml", proseSectionSchema);
  readList("policies.yaml", proseSectionSchema);
  read("cfp.yaml", cfpSchema);
  read("submission.yaml", submissionSchema);

  const newsDirectory = join(directory, "news");
  for (const name of readdirSync(newsDirectory).filter((entry) => entry.endsWith(".md"))) {
    const text = readFileSync(join(newsDirectory, name), "utf8");
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
    const file = `news/${name}`;
    const result = newsSchema.safeParse(parse(frontmatter));
    if (!result.success) {
      for (const problem of result.error.issues) {
        issues.push({ file, field: problem.path.join(".") || "(file)", message: problem.message });
      }
    }
  }

  if (site) {
    const imageExists = (file: string) => existsSync(resolve(directory, "images", file));
    issues.push(...crossValidate({ site, ...bundle }, { imageExists }));
  }
  return { issues, placeholders: findPlaceholders(raw) };
}
