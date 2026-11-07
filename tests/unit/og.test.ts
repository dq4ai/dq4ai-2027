/** The social image itself: only a digit in the acronym is flagged, never one in the year. */
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { renderOgImage } from "../../src/lib/og";

const FLAG = [0xf6, 0xc9, 0x45] as const;

const flaggedPixels = async (acronym: string) => {
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
    const distance = FLAG.reduce((sum, value, channel) => {
      return sum + Math.abs((data[i + channel] ?? 0) - value);
    }, 0);
    if (distance < 30) count += 1;
  }
  return count;
};

describe("social image wordmark", () => {
  it("flags the digit in an acronym", async () => {
    expect(await flaggedPixels("DQ4AI")).toBeGreaterThan(100);
  });

  it("flags nothing when the acronym has no digit", async () => {
    expect(await flaggedPixels("DQAI")).toBe(0);
  });
});
