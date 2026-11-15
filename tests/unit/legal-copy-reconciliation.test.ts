import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("offline copy reconciliation passes its substantive Python suite", () => {
  const result = spawnSync("python3", ["-m", "unittest", "discover", "-s", "tests/legal", "-p", "test_copy_reconciliation.py"],
    { encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }, timeout: 10_000, maxBuffer: 2 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  const count = /Ran (\d+) tests?/.exec(result.stderr);
  assert.ok(count && Number(count[1]) >= 14, "Python discovery must exercise the copy/privacy regression suite");
});
