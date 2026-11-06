import type { APIRoute } from "astro";
import { getPapers, getProgram } from "../lib/content";
import { sitemapRoutes } from "../lib/nav";
import { absoluteUrl } from "../lib/paths";

export const GET: APIRoute = async ({ site }) => {
  const [papers, program] = await Promise.all([getPapers(), getProgram()]);
  const entries = sitemapRoutes(papers.length > 0, program.length > 0)
    .map((route) => `  <url><loc>${absoluteUrl(route.path, site)}</loc></url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
};
