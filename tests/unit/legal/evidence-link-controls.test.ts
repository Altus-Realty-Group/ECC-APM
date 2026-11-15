import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

// Isolated negative controls for shared/legal/evidenceLink.ts: each control loads a COPY of the module with exactly one protection removed and must fail the
// same behaviour checks the real module passes. The repository source is never modified.
const SRC = new URL("../../../shared/legal/evidenceLink.ts", import.meta.url);
const CONTRACTS = new URL("../../../shared/legal/contracts.ts", import.meta.url);
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ok = { matter: true, document: true };

type Mod = typeof import("../../../shared/legal/evidenceLink.ts");
let seq = 0;
async function load(mutate?: (src: string) => string): Promise<Mod> {
  const dir = mkdtempSync(join(tmpdir(), "evidence-link-control-"));
  mkdirSync(dir, { recursive: true });
  copyFileSync(CONTRACTS, join(dir, "contracts.ts"));
  const original = readFileSync(SRC, "utf8");
  const src = mutate ? mutate(original) : original;
  if (mutate) assert.notEqual(src, original, "mutation changed nothing (vacuous control)");
  writeFileSync(join(dir, "evidenceLink.ts"), src);
  return (await import(pathToFileURL(join(dir, "evidenceLink.ts")).href + `?v=${++seq}`)) as Mod;
}
const row = (over: Record<string, unknown> = {}) => ({ id: U(1), matterId: U(10), requirementId: U(20), documentVersionId: U(5), withdrawnAt: null, revision: 2, restricted: false, storageRef: "x", ...over });
const throws = (f: () => unknown) => { try { f(); return false; } catch { return true; } };

/** Every behaviour the v2 correction guarantees, as named booleans. */
function behaviours(m: Mod): Record<string, boolean> {
  const omitted: Record<string, unknown> = row(); delete omitted.withdrawnAt;
  const attach = (rev: number) => ({ evidenceId: U(1), documentVersionId: U(5), expectedRevision: rev });
  return {
    "omitted withdrawnAt is rejected": throws(() => m.parseEvidenceRef(omitted)),
    "Feb 30 is rejected": throws(() => m.parseEvidenceRef(row({ withdrawnAt: "2026-02-30T12:00:00Z" }))),
    "leap day 2024-02-29 is accepted": !throws(() => m.parseEvidenceRef(row({ withdrawnAt: "2024-02-29T00:00:00Z" }))),
    "zone-less instant is rejected": throws(() => m.parseEvidenceRef(row({ withdrawnAt: "2026-11-15T10:00:00" }))),
    "row revision above the integer range is rejected": throws(() => m.parseEvidenceRef(row({ revision: 2147483648 }))),
    "request revision at the integer maximum is rejected": throws(() => m.parseAttachRequest(attach(2147483647))),
    "successor of the maximum is refused": throws(() => m.successorRevision(2147483647)),
    "valid replay at the upper boundary is preserved": (() => { try { return m.planAttach(m.parseEvidenceRef(row({ revision: 2147483647 })), m.parseAttachRequest(attach(2147483646)), ok).kind === "replay"; } catch { return false; } })(),
  };
}

test("the real module passes every behaviour check", async () => {
  const b = behaviours(await load());
  for (const [name, passed] of Object.entries(b)) assert.equal(passed, true, name);
});

const CONTROLS: Array<[string, (s: string) => string, string]> = [
  ["omitted fields become null", (s) => s.replace('if (!Object.prototype.hasOwnProperty.call(o, key) || o[key] === undefined) throw new LegalContractError(`${key} must be present (null when there is no value)`);', "if (o[key] === undefined) return null;"), "omitted withdrawnAt is rejected"],
  ["calendar days are not bounded (Feb 30 normalizes)", (s) => s.replace(" || d > (dim as number)", ""), "Feb 30 is rejected"],
  ["leap years are never leap", (s) => s.replace("(y % 4 === 0 && y % 100 !== 0) || y % 400 === 0", "false"), "leap day 2024-02-29 is accepted"],
  ["a zone is optional", (s) => s.replace("(Z|[+-]\\d{2}:\\d{2})$/;", "(Z|[+-]\\d{2}:\\d{2})?$/;").replace('if (m[8] !== "Z") {', 'if (m[8] && m[8] !== "Z") {'), "zone-less instant is rejected"],
  ["row revision range is not enforced", (s) => s.replace("if (v > max) throw", "if (false) throw"), "row revision above the integer range is rejected"],
  ["request revision may equal the column maximum", (s) => s.replace("export const MAX_REQUEST_REVISION = MAX_ROW_REVISION - 1;", "export const MAX_REQUEST_REVISION = MAX_ROW_REVISION;"), "request revision at the integer maximum is rejected"],
  ["successor addition is unchecked", (s) => s.replace("const next = expected + 1;\n  if (next > MAX_ROW_REVISION) throw new LegalContractError(\"revision has no representable successor\");\n  return next;", "return expected + 1;").replace("|| expected > MAX_REQUEST_REVISION) throw", ") throw"), "successor of the maximum is refused"],
  ["the request bound is one too low (boundary replay lost)", (s) => s.replace("export const MAX_REQUEST_REVISION = MAX_ROW_REVISION - 1;", "export const MAX_REQUEST_REVISION = MAX_ROW_REVISION - 2;"), "valid replay at the upper boundary is preserved"],
];
for (const [name, mutate, expected] of CONTROLS)
  test(`negative control: ${name} is caught`, async () => {
    const b = behaviours(await load(mutate));
    assert.equal(b[expected], false, `expected the check "${expected}" to fail`);
  });
