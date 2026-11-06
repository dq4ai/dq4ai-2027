#!/usr/bin/env node
/**
 * Serves a build the way GitHub Pages does: under the base path, directories resolve to
 * index.html, and unknown paths return 404.html with a 404 status. Used by the browser tests and
 * Lighthouse. `astro preview` can detach into the background, which test runners cannot manage.
 *
 * Usage: node scripts/serve-static.mjs <directory> <port>
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const [directory = "dist", port = "4321"] = process.argv.slice(2);
const BASE = "/dq4ai-2027/";
const root = resolve(directory);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".ics": "text/calendar; charset=utf-8",
};

function resolveFile(pathname) {
  if (!pathname.startsWith(BASE)) return undefined;
  const relative = normalize(decodeURIComponent(pathname.slice(BASE.length)));
  if (relative.startsWith("..")) return undefined;
  const candidate = join(root, relative);
  if (!existsSync(candidate)) return undefined;
  if (statSync(candidate).isFile()) return candidate;
  const index = join(candidate, "index.html");
  return existsSync(index) ? index : undefined;
}

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  const file = resolveFile(pathname);
  const served = file ?? join(root, "404.html");
  response.writeHead(file ? 200 : 404, {
    "Content-Type": TYPES[extname(served)] ?? "application/octet-stream",
  });
  createReadStream(served).pipe(response);
}).listen(Number(port), "127.0.0.1", () => {
  console.log(`Serving ${directory} at http://localhost:${port}${BASE}`);
});
