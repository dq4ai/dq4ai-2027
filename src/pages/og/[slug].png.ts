import type { APIRoute, GetStaticPaths } from "astro";
import { getSite } from "../../lib/content";
import { formatDayRange, formatIsoDay, TBA } from "../../lib/dates";
import { ROUTES } from "../../lib/nav";
import { renderOgImage } from "../../lib/og";
import { hostLocation, workshopTitle } from "../../lib/view";

export const getStaticPaths = (() =>
  ROUTES.map((route) => ({
    params: { slug: route.slug },
    props: { title: route.title },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props, params }) => {
  const site = await getSite();
  const when =
    site.workshopDate === TBA
      ? formatDayRange(site.host.startDate, site.host.endDate)
      : formatIsoDay(site.workshopDate);
  const isHome = params.slug === "home";
  const image = await renderOgImage({
    pageTitle: isHome ? site.title : props.title,
    // The home image's title is already the workshop's topic, so its subtitle gives the edition.
    workshopName: isHome ? `${site.edition} International Workshop` : workshopTitle(site),
    detail: `${site.host.name} · ${hostLocation(site)} · ${when}`,
    mark: `${site.acronym} ${site.year}`,
  });
  return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/png" } });
};
