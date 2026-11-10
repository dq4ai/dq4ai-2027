/** The inline bootstrap and the Content-Security-Policy that allows exactly that script. */
import { createHash } from "node:crypto";

/**
 * Runs before first paint. Must stay inline: an external file would load after the page starts to
 * render. Its hash goes in the policy below. The site follows the system's light or dark theme; the
 * organizers asked for no theme button.
 *
 * It answers clicks on the menu button. The `js` class hides the navigation behind that button at
 * once, so the button has to work before, or without, any bundled script.
 */
export const THEME_INIT_SCRIPT = [
  `var d=document,r=d.documentElement;r.classList.add("js");`,
  // iOS Safari only applies :active on a page that listens for touches.
  `d.addEventListener("touchstart",function(){},{passive:true});`,
  `d.addEventListener("click",function(e){`,
  `var c=e.target.closest(".nav-toggle");if(!c)return;`,
  `var o=c.getAttribute("aria-expanded")!=="true";c.setAttribute("aria-expanded",o);`,
  `c.textContent=o?"Close":"Menu";d.getElementById("site-nav").toggleAttribute("data-open",o)});`,
].join("");

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
