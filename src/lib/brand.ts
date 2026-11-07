/** The logo, drawn once: a two-way loop around a checked database. */
export type MarkPart = "a" | "b" | "surface";
type Paint = (kind: "fill" | "stroke", part: MarkPart) => string;

const arc = (paint: Paint, part: MarkPart, turn = "") =>
  `<g${turn}><path d="M17 50A44 44 0 0 1 98 37" fill="none" stroke-width="10" ${paint("stroke", part)}/>` +
  `<path d="M108 52 110 31 89 43z" ${paint("fill", part)}/></g>`;

/** The drawing inside a 120 by 120 viewBox. `paint` says how each part gets its color. */
export const markBody = (paint: Paint): string =>
  [
    `<g class="mark__loop">`,
    arc(paint, "a"),
    arc(paint, "b", ' transform="rotate(180 60 60)"'),
    `</g>`,
    `<g ${paint("fill", "a")}>`,
    `<ellipse cx="57" cy="42" rx="20" ry="7"/>`,
    `<path d="M37 47a20 7 0 0 0 40 0v9a20 7 0 0 1-40 0z"/>`,
    `<path d="M37 62a20 7 0 0 0 40 0v9a20 7 0 0 1-40 0z"/>`,
    `</g>`,
    `<circle cx="78" cy="75" r="13" stroke-width="3.5" ${paint("fill", "b")} ${paint("stroke", "surface")}/>`,
    `<path d="M72 75 77 80 85 70" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" ${paint("stroke", "surface")}/>`,
  ].join("");

/** The logo as a standalone image, for files that cannot use the site's stylesheet. */
export const markSvg = (colors: Record<MarkPart, string>): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${markBody((kind, part) => `${kind}="${colors[part]}"`)}</svg>`;
