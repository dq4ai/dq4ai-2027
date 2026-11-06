/** Inline theme bootstrap and the Content-Security-Policy that allows exactly that script. */
import { createHash } from "node:crypto";

/**
 * Runs before first paint so a saved theme never flashes. Must stay inline: an external file
 * would load after the page starts to render. Its hash goes in the policy below.
 */
export const THEME_INIT_SCRIPT = `document.documentElement.classList.add("js");try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function scriptHash(source: string): string {
  return `sha256-${createHash("sha256").update(source).digest("base64")}`;
}

export function contentSecurityPolicy(): string {
  return [
    "default-src 'none'",
    `script-src 'self' '${scriptHash(THEME_INIT_SCRIPT)}'`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join("; ");
}
