/**
 * Fails the build with a readable message when content is invalid, and prints what is still TBA.
 * During `astro dev` problems are logged rather than thrown, so the preview survives a typo.
 */
import type { AstroIntegration } from "astro";
import { writeFileSync } from "node:fs";
import { checkContent } from "../lib/load-content";
import { formatPlaceholderReport } from "../lib/placeholders";
import { formatIssues } from "../lib/validation";

export function contentGuard(directory: string, customDomain: string): AstroIntegration {
  return {
    name: "dq4ai:content-guard",
    hooks: {
      "astro:config:setup": ({ command, logger }) => {
        const { issues } = checkContent(directory);
        if (issues.length === 0) return;
        if (command === "build") throw new Error(formatIssues(issues));
        logger.error(formatIssues(issues));
      },
      "astro:build:done": ({ dir, logger }) => {
        if (customDomain) writeFileSync(new URL("CNAME", dir), `${customDomain}\n`);
        logger.warn(formatPlaceholderReport(checkContent(directory).placeholders));
      },
    },
  };
}
