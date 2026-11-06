#!/usr/bin/env node
// PreToolUse hook for Bash. Pushing to main deploys the public site, and deploy.yml does not wait
// for CI, so these commands ask a person first. Feature-branch pushes pass. It never denies, and any
// failure in this script lets the command through rather than breaking the session.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PROTECTED = /^(\+?(HEAD:|refs\/heads\/)?(main|master)|.*:(refs\/heads\/)?(main|master))$/;

function currentBranch(cwd) {
  return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function reasonFor(segment, cwd) {
  if (/\bgh\s+pr\s+merge\b/.test(segment))
    return "Merging a pull request to main deploys the site.";
  const push = segment.match(/\bgit\b(?:\s+-\S+(?:\s+\S+)?)*\s+push\b(.*)$/);
  if (!push) return null;

  const words = push[1].trim().split(/\s+/).filter(Boolean);
  if (
    words.some((w) =>
      /^(--force|--force-with-lease|--force-if-includes|-[a-zA-Z]*f[a-zA-Z]*)/.test(w),
    )
  )
    return "This is a force push, which rewrites published history.";
  if (words.some((w) => ["--all", "--mirror"].includes(w)))
    return "This pushes every branch, including main, which deploys the site.";

  const positional = words.filter((w) => !w.startsWith("-"));
  const refspecs = positional.slice(1);
  if (refspecs.some((r) => PROTECTED.test(r))) return "Pushing to main deploys the site.";
  if (refspecs.length === 0 && ["main", "master"].includes(currentBranch(cwd)))
    return "You are on main, so this push deploys the site.";
  return null;
}

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const command = input.tool_input?.command ?? "";
  const cwd = input.cwd ?? process.cwd();
  for (const segment of command.split(/&&|\|\||;|\||\n/)) {
    const reason = reasonFor(segment, cwd);
    if (reason) {
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "ask",
            permissionDecisionReason: `${reason} Check that release-check passed.`,
          },
        }),
      );
      break;
    }
  }
} catch {
  // Fail open: a bug here must not stop work.
}
process.exit(0);
