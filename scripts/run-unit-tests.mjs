#!/usr/bin/env node
// Runs every tests/unit/**/*.test.{ts,tsx} with Node's built-in runner (non-watching).
// Why a script instead of a glob argument: `node --test "<glob>"` needs Node 21+, and CI uses Node 20.19.
// It also refuses to pass when nothing was discovered or the runner reports fewer tests than files.
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const unitDir = join(root, "tests", "unit");

function discover(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...discover(full));
    else if (/\.test\.(ts|tsx)$/.test(name)) out.push(relative(root, full));
  }
  return out;
}

const files = discover(unitDir);
console.log(`[unit] discovered ${files.length} test file(s) under tests/unit`);
if (files.length === 0) {
  console.error("[unit] FAIL: no test files discovered");
  process.exit(1);
}

const run = spawnSync(
  process.execPath,
  ["--import", "tsx", "--import", "./tests/unit/register-css.mjs", "--test", "--test-reporter=tap", ...files],
  { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);
process.stdout.write(run.stdout ?? "");
process.stderr.write(run.stderr ?? "");

const out = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
const num = (label) => {
  const m = new RegExp(`^(?:#|ℹ) ${label}\\s+(\\d+)`, "m").exec(out);
  return m ? Number(m[1]) : null;
};
const tests = num("tests");
const pass = num("pass");
const fail = num("fail");
console.log(`[unit] files=${files.length} tests=${tests} pass=${pass} fail=${fail}`);

if (run.status !== 0) process.exit(run.status ?? 1);
if (tests === null || tests < files.length) {
  console.error(`[unit] FAIL: runner reported ${tests} test(s) for ${files.length} file(s); discovery or reporting is broken`);
  process.exit(1);
}
if (fail !== 0) process.exit(1);
