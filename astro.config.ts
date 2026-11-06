import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "astro/config";
import { parse } from "yaml";
import { contentGuard } from "./src/integrations/content-guard";
import { contentDir } from "./src/lib/content-dir";

const { deployment } = parse(readFileSync(resolve(contentDir, "site.yaml"), "utf8")) as {
  deployment: { githubOwner: string; repoName: string; customDomain: string };
};
const custom = deployment.customDomain.trim();
const outDir = process.env.DQ4AI_OUT_DIR;

export default defineConfig({
  site: custom ? `https://${custom}` : `https://${deployment.githubOwner}.github.io`,
  base: custom ? "/" : `/${deployment.repoName}/`,
  trailingSlash: "always",
  outDir: outDir ?? "dist",
  // Test builds keep their own content cache so fixture data can never reach the real site.
  cacheDir: outDir ? `./node_modules/.astro-${outDir}` : "./node_modules/.astro",
  // External files only, so the Content-Security-Policy needs no 'unsafe-inline'.
  build: { format: "directory", inlineStylesheets: "never" },
  vite: { build: { assetsInlineLimit: 0 } },
  integrations: [contentGuard(contentDir, custom)],
});
