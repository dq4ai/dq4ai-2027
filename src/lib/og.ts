/** Renders the 1200×630 social sharing image for a page. */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import satori from "satori";
import sharp from "sharp";

const fontPath = (name: string) => resolve("src/assets/fonts", name);

const loadFonts = async () => {
  const [serif, sans] = await Promise.all([
    readFile(fontPath("source-serif-4-latin-500-normal.woff")),
    readFile(fontPath("ibm-plex-sans-latin-400-normal.woff")),
  ]);
  return [
    { name: "Source Serif 4", data: serif, weight: 500 as const, style: "normal" as const },
    { name: "IBM Plex Sans", data: sans, weight: 400 as const, style: "normal" as const },
  ];
};

let fonts: ReturnType<typeof loadFonts> | undefined;

export interface OgInput {
  pageTitle: string;
  workshopName: string;
  detail: string;
  mark: string;
}

const PAPER = "#FCFDFD";
const INK = "#141C26";
const FLAG = "#F6C945";
const MUTED = "#55606E";

const element = (style: Record<string, unknown>, children: unknown) => ({
  type: "div",
  props: { style: { display: "flex", ...style }, children },
});

/** The wordmark: the acronym's digit is the flagged cell, as on the site. */
const markElement = (mark: string) => {
  const [, before, digit, after] = /^(\D*)(\d)(.*)$/.exec(mark) ?? [];
  const style = { fontSize: 38, color: INK };
  if (!digit) return element(style, mark);
  return element({ ...style, whiteSpace: "pre" }, [
    element({}, before),
    element({ backgroundColor: FLAG, paddingLeft: 8, paddingRight: 8 }, digit),
    element({}, after),
  ]);
};

export async function renderOgImage({
  pageTitle,
  workshopName,
  detail,
  mark,
}: OgInput): Promise<Buffer> {
  fonts ??= loadFonts();
  const node = element(
    {
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
      flexDirection: "column",
      justifyContent: "space-between",
      backgroundColor: PAPER,
      color: INK,
      padding: "72px",
      fontFamily: "IBM Plex Sans",
    },
    [
      markElement(mark),
      element({ flexDirection: "column" }, [
        element(
          { fontFamily: "Source Serif 4", fontSize: 88, lineHeight: 1.05, marginBottom: 28 },
          pageTitle,
        ),
        element({ fontSize: 32, lineHeight: 1.3, color: INK }, workshopName),
      ]),
      element({ fontSize: 28, color: MUTED }, detail),
    ],
  );
  const svg = await satori(node as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: await fonts,
  });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
}
