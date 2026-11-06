import type { APIRoute } from "astro";
import { buildCfpText } from "../lib/cfp-text";
import { getCfp, getCommittees, getDeadlines, getSite } from "../lib/content";
import { absoluteUrl } from "../lib/paths";

export const GET: APIRoute = async ({ site: astroSite }) => {
  const [site, cfp, deadlines, committees] = await Promise.all([
    getSite(),
    getCfp(),
    getDeadlines(),
    getCommittees(),
  ]);
  const chairs = committees.find((committee) => committee.id === "chairs")?.people ?? [];
  const text = buildCfpText({
    site,
    cfp,
    deadlines,
    chairs,
    siteUrl: absoluteUrl("/", astroSite),
  });
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
