/** What the social image route asks the renderer to draw; the renderer itself is not under test. */
import { readFileSync } from "node:fs";
import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { siteSchema } from "../../src/lib/schemas";
import { workshopTitle } from "../../src/lib/view";
import { GET } from "../../src/pages/og/[slug].png";

const site = siteSchema.parse(parse(readFileSync("src/content/site.yaml", "utf8")));
const { renderOgImage } = vi.hoisted(() => ({
  renderOgImage: vi.fn(() => Promise.resolve(Buffer.from([]))),
}));

vi.mock("../../src/lib/content", () => ({ getSite: () => Promise.resolve(site) }));
vi.mock("../../src/lib/og", () => ({ renderOgImage }));

const drawnFor = async (slug: string, title: string) => {
  await GET({ params: { slug }, props: { title } } as unknown as APIContext);
  return renderOgImage.mock.lastCall as unknown as [{ pageTitle: string; workshopName: string }];
};

describe("social image text", () => {
  beforeEach(() => {
    renderOgImage.mockClear();
  });

  it("does not repeat the title in the home image's subtitle", async () => {
    const [input] = await drawnFor("home", "Home");
    expect(input.pageTitle).toBe(site.title);
    expect(input.workshopName).toBe(`${site.edition} International Workshop`);
    expect(input.workshopName).not.toContain(site.title);
  });

  it("keeps the full workshop name under other pages' titles", async () => {
    const [input] = await drawnFor("program", "Program");
    expect(input.pageTitle).toBe("Program");
    expect(input.workshopName).toBe(workshopTitle(site));
  });
});
