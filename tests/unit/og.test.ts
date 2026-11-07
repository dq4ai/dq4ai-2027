/** The social image itself: only a digit in the acronym is teal, never one in the year. */
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { renderOgImage } from "../../src/lib/og";

const TEAL = [0x0f, 0x7f, 0x72] as const;

const tealPixels = async (acronym: string) => {
  const image = await renderOgImage({
    pageTitle: "Program",
    workshopName: "A workshop",
    detail: "A place",
    acronym,
    year: 2027,
  });
  const { data } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let count = 0;
  for (let i = 0; i < data.length; i += 3) {
    const distance = TEAL.reduce((sum, value, channel) => {
      return sum + Math.abs((data[i + channel] ?? 0) - value);
    }, 0);
    if (distance < 30) count += 1;
  }
  return count;
};

describe("social image wordmark", () => {
  // The logo is teal in both, so the digit is what is left when the two are compared.
  it("colors the digit in an acronym", async () => {
    expect((await tealPixels("DQ4AI")) - (await tealPixels("DQAI"))).toBeGreaterThan(100);
  });

  it("draws the logo even when the acronym has no digit", async () => {
    expect(await tealPixels("DQAI")).toBeGreaterThan(100);
  });
});
