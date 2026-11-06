#!/usr/bin/env node
// PostToolUse hook for Edit and Write. Formats the edited file with Prettier so lint stays green.
// For a file in src/content/, it also runs the build's content guard and returns any error, naming
// the file and field, to Claude (exit code 2). Any failure in this script itself is ignored.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

// Inside node_modules so it is never committed, and separate from dist/ so tests are unaffected.
const CHECK_OUT_DIR = "node_modules/.content-check-dist";

function run(root, args, env = process.env) {
  return spawnSync("pnpm", ["exec", ...args], {
    cwd: root,
    env,
    encoding: "utf8",
    timeout: 80_000,
  });
}

function checkContent(root) {
  const result = run(root, ["astro", "build"], { ...process.env, DQ4AI_OUT_DIR: CHECK_OUT_DIR });
  if (result.status === 0 || result.error) return null;
  const output = `${result.stdout}\n${result.stderr}`.replace(/\x1b\[[0-9;]*m/g, "");
  // Keep the message naming the file and field; a stack trace would push it out of view.
  const message = output.split("\n").filter((line) => line.trim() && !/^\s+at |Stack trace:/.test(line));
  return message.slice(-25).join("\n");
}

let problem = null;
try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
  const file = input.tool_input?.file_path;
  if (file) {
    const path = resolve(root, file);
    const inside = relative(root, path);
    if (inside && !inside.startsWith("..") && !isAbsolute(inside) && existsSync(path)) {
      run(root, ["prettier", "--write", "--ignore-unknown", "--log-level=silent", inside]);
      if (inside.startsWith(`src${sep}content${sep}`)) problem = checkContent(root);
    }
  }
} catch {
  // Fail open: a bug here must not stop work.
}

if (problem) {
  console.error(`The content check failed, and this would stop the site deploying:\n${problem}`);
  process.exit(2);
}
process.exit(0);
