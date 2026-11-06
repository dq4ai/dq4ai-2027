/** Checks on the generated files themselves, for both the real and the populated build. */
import { expect, test } from "@playwright/test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { scriptHash, THEME_INIT_SCRIPT } from "../../src/lib/theme";

const BASE = "/dq4ai-2027/";
const directoryFor = (project: string) =>
  project === "populated-content" ? "dist-fixture" : "dist";

function filesIn(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesIn(path) : [path];
  });
}

const htmlFiles = (directory: string) => filesIn(directory).filter((f) => f.endsWith(".html"));
const attributeValues = (html: string, attribute: string) =>
  [...html.matchAll(new RegExp(`\\s${attribute}="([^"]*)"`, "g"))].map((match) => match[1] ?? "");

test.describe("build output", () => {
  test("every internal link respects the base path and resolves to a file", ({}, testInfo) => {
    const dist = directoryFor(testInfo.project.name);
    for (const file of htmlFiles(dist)) {
      const html = readFileSync(file, "utf8");
      const refs = [...attributeValues(html, "href"), ...attributeValues(html, "src")];
      for (const ref of refs) {
        if (/^(https?:|mailto:|#|data:)/.test(ref)) continue;
        expect(ref, `${file} links outside the base`).toMatch(new RegExp(`^${BASE}`));
        const local = ref.slice(BASE.length).split(/[#?]/)[0] ?? "";
        const target = join(dist, local);
        const found =
          existsSync(target) &&
          (statSync(target).isFile() || existsSync(join(target, "index.html")));
        expect(found, `${file} links to missing ${ref}`).toBe(true);
      }
    }
  });

  test("external links carry rel=noopener", ({}, testInfo) => {
    for (const file of htmlFiles(directoryFor(testInfo.project.name))) {
      const html = readFileSync(file, "utf8");
      for (const [tag] of html.matchAll(/<a\s[^>]*href="https?:[^>]*>/g)) {
        expect(tag, file).toContain('rel="noopener"');
      }
    }
  });

  test("the only executable inline script is the hashed theme bootstrap", ({}, testInfo) => {
    const hash = scriptHash(THEME_INIT_SCRIPT);
    for (const file of htmlFiles(directoryFor(testInfo.project.name))) {
      const html = readFileSync(file, "utf8");
      expect(html, file).toContain(`'${hash}'`);
      expect(html, file).not.toContain("unsafe-inline");
      const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
        .filter((match) => !match[1]?.includes("application/ld+json"))
        .map((match) => match[2]);
      expect(inline, file).toEqual([THEME_INIT_SCRIPT]);
      expect(html, `${file} has inline styles`).not.toMatch(/<style|\sstyle="/);
    }
  });

  test("performance budget: 30 KB JS and 100 KB CSS plus fonts", ({}, testInfo) => {
    const dist = directoryFor(testInfo.project.name);
    const gzipped = (path: string) => gzipSync(readFileSync(path)).length;
    const assetsDir = join(dist, "_astro");
    for (const file of htmlFiles(dist)) {
      const html = readFileSync(file, "utf8");
      const loaded = attributeValues(html, "src")
        .concat(attributeValues(html, "href"))
        .filter((ref) => ref.startsWith(`${BASE}_astro/`))
        .map((ref) => join(dist, ref.slice(BASE.length)));
      const scripts = loaded.filter((f) => f.endsWith(".js"));
      // Scripts import their shared chunks, so count every chunk conservatively.
      const allJs = filesIn(assetsDir).filter((f) => f.endsWith(".js"));
      const jsTotal = [...new Set([...scripts, ...allJs])].reduce((n, f) => n + gzipped(f), 0);
      expect(jsTotal, `${file} JavaScript`).toBeLessThanOrEqual(30 * 1024);
      const css = loaded.filter((f) => f.endsWith(".css")).reduce((n, f) => n + gzipped(f), 0);
      const fonts = filesIn(assetsDir)
        .filter((f) => f.endsWith(".woff2"))
        .reduce((n, f) => n + statSync(f).size, 0);
      expect(css + fonts, `${file} CSS and fonts`).toBeLessThanOrEqual(100 * 1024);
    }
  });

  test("JSON-LD describes the workshop and its host", ({}, testInfo) => {
    const dist = directoryFor(testInfo.project.name);
    const html = readFileSync(join(dist, "index.html"), "utf8");
    const block = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1];
    const data = JSON.parse(block ?? "{}") as Record<string, unknown>;
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Event",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@type": "Place" },
      superEvent: {
        "@type": "Event",
        name: "EDBT/ICDT 2027",
        startDate: "2027-04-06",
        endDate: "2027-04-09",
      },
    });
    expect((data.organizer as unknown[]).length).toBeGreaterThan(0);
    if (testInfo.project.name === "populated-content") {
      expect(data.startDate).toBe("2027-04-07");
    } else {
      expect(data).not.toHaveProperty("startDate");
    }
  });

  test("the sitemap lists only pages that exist", ({}, testInfo) => {
    const dist = directoryFor(testInfo.project.name);
    const xml = readFileSync(join(dist, "sitemap.xml"), "utf8");
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1] ?? "").pathname);
    expect(urls.length).toBeGreaterThanOrEqual(10);
    for (const pathname of urls) {
      expect(existsSync(join(dist, pathname.slice(BASE.length), "index.html")), pathname).toBe(
        true,
      );
    }
    expect(urls.includes(`${BASE}accepted-papers/`)).toBe(
      testInfo.project.name === "populated-content",
    );
    expect(urls.includes(`${BASE}program/`)).toBe(testInfo.project.name === "populated-content");
  });

  test("every page description names the workshop and its host", ({}, testInfo) => {
    const dist = directoryFor(testInfo.project.name);
    for (const file of htmlFiles(dist).filter((path) => !path.endsWith("404.html"))) {
      const description = /name="description" content="([^"]*)"/.exec(
        readFileSync(file, "utf8"),
      )?.[1];
      expect(description, file).toContain("DQ4AI 2027");
      expect(description, file).toContain("EDBT/ICDT 2027");
    }
  });

  test("the RSS, robots, humans and Open Graph files exist", ({}, testInfo) => {
    const dist = directoryFor(testInfo.project.name);
    expect(readFileSync(join(dist, "rss.xml"), "utf8")).toContain("<rss");
    expect(readFileSync(join(dist, "robots.txt"), "utf8")).toContain("Sitemap: https://");
    expect(readFileSync(join(dist, "humans.txt"), "utf8")).toContain("Workshop Chairs");
    for (const file of htmlFiles(dist)) {
      const html = readFileSync(file, "utf8");
      const image = /property="og:image" content="([^"]+)"/.exec(html)?.[1];
      expect(image, file).toBeTruthy();
      const path = new URL(image ?? "").pathname.slice(BASE.length);
      expect(existsSync(join(dist, path)), `${file} → ${path}`).toBe(true);
    }
  });

  test("fixture data never reaches the real site", ({}, testInfo) => {
    test.skip(testInfo.project.name !== "real-content", "only applies to the real build");
    for (const file of htmlFiles("dist")) {
      expect(readFileSync(file, "utf8"), relative(dirname("dist"), file)).not.toMatch(
        /Example University|chairs@example\.org/,
      );
    }
  });
});
