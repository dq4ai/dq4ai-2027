import type { APIRoute } from "astro";
import { HOME } from "../lib/nav";
import { absoluteUrl } from "../lib/paths";

// The site is one page; the old page addresses only redirect, so they are left out.
export const GET: APIRoute = ({ site }) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${absoluteUrl(HOME.path, site)}</loc></url>\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
};
