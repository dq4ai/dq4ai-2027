import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getNews, getSite } from "../lib/content";
import { absoluteUrl } from "../lib/paths";

export const GET: APIRoute = async ({ site: astroSite }) => {
  const [site, news] = await Promise.all([getSite(), getNews()]);
  return rss({
    title: `${site.acronym} ${site.year} news`,
    description: site.tagline,
    site: absoluteUrl("/", astroSite),
    items: news.map((item) => ({
      title: item.data.title,
      description: item.data.summary,
      pubDate: new Date(`${item.data.date}T00:00:00Z`),
      link: absoluteUrl(`/news/#news-${item.id}`, astroSite),
    })),
  });
};
