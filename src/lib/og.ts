/** Renders the 1200×630 social sharing image for a page. */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import satori from "satori";
import sharp from "sharp";
import { markSvg } from "./brand";
import { wordmarkParts } from "./view";

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
  acronym: string;
  year: number;
}

const PAPER = "#FCFDFE";
const INK = "#101A2C";
const NAVY = "#1E3A8A";
const TEAL = "#0F7F72";
const MUTED = "#4F5B6D";
const LOGO = `data:image/svg+xml;base64,${Buffer.from(
  markSvg({ a: NAVY, b: TEAL, surface: PAPER }),
).toString("base64")}`;

const element = (style: Record<string, unknown>, children: unknown) => ({
  type: "div",
  props: { style: { display: "flex", ...style }, children },
});

/** The logo and wordmark: the acronym's digit is teal, as on the site. */
const markElement = (acronym: string, year: number) => {
  const parts = wordmarkParts(acronym);
  const style = { fontSize: 44, color: INK, whiteSpace: "pre" };
  const name = parts
    ? [
        element({}, parts.before),
        element({ color: TEAL }, parts.digit),
        element({}, `${parts.after} ${year}`),
      ]
    : `${acronym} ${year}`;
  return element({ alignItems: "center" }, [
    { type: "img", props: { src: LOGO, width: 88, height: 88, style: { marginRight: 20 } } },
    element(style, name),
  ]);
};

export async function renderOgImage({
  pageTitle,
  workshopName,
  detail,
  acronym,
  year,
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
      markElement(acronym, year),
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
