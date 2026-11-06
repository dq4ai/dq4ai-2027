/** Every internal link goes through here so the site works under any base path. */
export function url(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

export function absoluteUrl(path: string, site: URL | undefined): string {
  if (!site) throw new Error("astro.config.ts must set `site`");
  return new URL(url(path), site).href;
}
