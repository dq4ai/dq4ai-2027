/** Finds every value still marked TBA so the build can report what is left to fill in. */
import { TBA } from "./dates";

export interface Placeholder {
  file: string;
  field: string;
}

function walk(value: unknown, path: string, found: string[]): void {
  if (value === TBA) {
    found.push(path);
  } else if (Array.isArray(value)) {
    value.forEach((item: unknown, index) => {
      const key =
        typeof item === "object" && item !== null && "id" in item ? String(item.id) : `[${index}]`;
      walk(item, path ? `${path}.${key}` : key, found);
    });
  } else if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      walk(item, path ? `${path}.${key}` : key, found);
    }
  }
}

export function findPlaceholders(contentByFile: Record<string, unknown>): Placeholder[] {
  return Object.entries(contentByFile).flatMap(([file, content]) => {
    const fields: string[] = [];
    walk(content, "", fields);
    return fields.map((field) => ({ file, field }));
  });
}

export function formatPlaceholderReport(placeholders: Placeholder[]): string {
  if (placeholders.length === 0) return "No placeholders remain in the site content.";
  return [
    `${placeholders.length} placeholder${placeholders.length === 1 ? "" : "s"} still marked TBA:`,
    ...placeholders.map(({ file, field }) => `  • ${file} → ${field}`),
  ].join("\n");
}
