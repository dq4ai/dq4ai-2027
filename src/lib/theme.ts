/** Inline theme bootstrap and the Content-Security-Policy that allows exactly that script. */
import { createHash } from "node:crypto";

/**
 * Runs before first paint so a saved theme never flashes. Must stay inline: an external file
 * would load after the page starts to render. Its hash goes in the policy below.
 *
 * It also answers clicks on the menu and theme buttons. The `js` class hides the navigation behind
 * the menu button at once, so the button has to work before, or without, any bundled script.
 */
export const THEME_INIT_SCRIPT = [
  `var d=document,r=d.documentElement;r.classList.add("js");`,
  `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")r.dataset.theme=t}catch(e){}`,
  `d.addEventListener("click",function(e){`,
  `var c=e.target.closest(".nav-toggle,.theme-toggle");if(!c)return;`,
  `if(c.classList.contains("nav-toggle")){`,
  `var o=c.getAttribute("aria-expanded")!=="true";c.setAttribute("aria-expanded",o);`,
  `c.textContent=o?"Close":"Menu";d.getElementById("site-nav").toggleAttribute("data-open",o);return}`,
  `var s=matchMedia("(prefers-color-scheme: dark)").matches,`,
  `n=!(r.dataset.theme?r.dataset.theme==="dark":s);`,
  `try{if(n===s){delete r.dataset.theme;localStorage.removeItem("theme")}`,
  `else{r.dataset.theme=n?"dark":"light";localStorage.setItem("theme",r.dataset.theme)}}catch(x){}`,
  `c.setAttribute("aria-pressed",n);d.dispatchEvent(new Event("themechange"))});`,
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
