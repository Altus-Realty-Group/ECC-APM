import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import { grantsEnvelope } from "../../../shared/authz/conformance.ts";
import { IDS, NOW, OWNER_A, PROP_A1, U, addVersion, makeDoc, makeWorld, type World } from "./evidence-reader-fixtures.ts";

// Isolated negative controls for server/lib/legal/evidenceReader.ts: each control loads a COPY of the reader with exactly one protection removed
// (imports rewritten to the repository files) and must fail the same behaviour the real reader passes. The repository source is never modified.
const SRC = fileURLToPath(new URL("../../../server/lib/legal/evidenceReader.ts", import.meta.url));
type Factory = typeof import("../../../server/lib/legal/evidenceReader.ts").createEvidenceReader;
let seq = 0;
async function load(mutations: [string, string][] = []): Promise<Factory> {
  let src = readFileSync(SRC, "utf8");
  for (const [from, to] of mutations) { assert.ok(src.includes(from), `mutation target not found: ${from.slice(0, 60)}`); src = src.replace(from, to); }
  if (mutations.length) assert.notEqual(src, readFileSync(SRC, "utf8"));
  src = src.replace(/from "(\.[^"]*)"/g, (_m, spec: string) => {
    const base = resolve(dirname(SRC), spec);
    const file = existsSync(`${base}.ts`) ? `${base}.ts` : base;
    return `from ${JSON.stringify(pathToFileURL(file).href)}`;
  });
  const dir = mkdtempSync(join(tmpdir(), "evidence-reader-control-"));
  const out = join(dir, "evidenceReader.ts");
  writeFileSync(out, src);
  return ((await import(pathToFileURL(out).href + `?v=${++seq}`)) as { createEvidenceReader: Factory }).createEvidenceReader;
}
const kind = (r: unknown) => (r as { kind: string }).kind;
const LATE = 3600_000 + 10;

/** Each behaviour returns true when the reader behaves correctly. */
const BEHAVIOURS: Record<string, (f: Factory) => Promise<boolean>> = {
  "final authorization is the last asynchronous step": async (f) => {
    const w = makeWorld(); w.hooks.onStoreGet = (n) => { if (n === 4) w.auth.grantsBody = grantsEnvelope(); };
    return kind(await w.reader({}, f).download(w.req())) === "denied";
  },
  "no version or document operation runs without D1 target authority (oracle closed)": async (f) => {
    const w = makeWorld(); w.propertyScopes.set(PROP_A1, "scope-b");
    const r = await w.reader({}, f).download(w.req());
    return kind(r) === "denied" && w.n.pinned === 0 && w.n.get === 0 && w.n.read === 0;
  },
  "the reader itself enforces the matter scope even if the evidence port does not": async (f) => {
    const w = makeWorld({ portFiltersScope: false }); w.matter.scopeRef = "scope-b";
    const r = await w.reader({}, f).download(w.req());
    return kind(r) === "missing" && w.n.pinned === 0 && w.n.get === 0;
  },
  "a browser-supplied permission or version field is refused before any port": async (f) => {
    const w = makeWorld();
    const r = await w.reader({}, f).download(w.req({ matterAllowed: true, versionId: IDS.v1 }));
    return kind(r) === "denied" && w.log.length === 0;
  },
  "an evidence revision advanced after delivery is withheld": async (f) => {
    const w = makeWorld(); w.hooks.onEvidenceLoad = (n) => { if (n === 2) w.evidence.revision = 3; };
    return kind(await w.reader({}, f).download(w.req())) !== "ready";
  },
  "a different document pinned after delivery is withheld": async (f) => {
    const w = makeWorld(); w.docs.push(makeDoc(U(40), { homeProperty: PROP_A1, section: "tenant-documents", versionIds: [IDS.v2] }));
    w.hooks.onEvidenceLoad = (n) => { if (n === 2) w.evidence.documentVersionId = IDS.v2; };
    return kind(await w.reader({}, f).download(w.req())) !== "ready";
  },
  "expiry at the last authorization read is caught immediately before delivery": async (f) => {
    const probe = makeWorld(); await probe.reader({}, f).download(probe.req());
    const w = makeWorld(); w.hooks.onLinkedOwners = (n) => { if (n === probe.n.owners) w.auth.nowMs = NOW + LATE; };
    return kind(await w.reader({}, f).download(w.req())) === "stale";
  },
  "unbound, withdrawn and restricted evidence never reaches a document operation": async (f) => {
    const w = makeWorld(); w.evidence.documentVersionId = null; w.evidence.storageRef = IDS.v1;
    const r = await w.reader({}, f).download(w.req());
    return kind(r) === "unavailable" && w.n.pinned === 0 && w.n.get === 0;
  },
  "grant drift between the runs is withheld": async (f) => {
    const w = makeWorld(); w.hooks.onEvidenceLoad = (n) => { if (n === 2) w.auth.grantsBody = grantsEnvelope({ ...(w.auth.grantsBody as any).data.grants[0], revision: 2 }); };
    return kind(await w.reader({}, f).download(w.req())) !== "ready";
  },
  "a classification policy change after delivery is withheld": async (f) => {
    const w = makeWorld(); w.hooks.onEvidenceLoad = (n) => { if (n === 2) w.allowClassifications.add("restricted"); };
    return kind(await w.reader({}, f).download(w.req())) === "stale";
  },
  "a change after delivery is reported as stale, a revocation as denied": async (f) => {
    const w = makeWorld(); w.hooks.onPinned = (n) => { if (n === 2) w.docs[0].status = "retired"; };
    return kind(await w.reader({}, f).download(w.req())) === "stale";
  },
  "a newer version is never delivered in place of the pinned one": async (f) => {
    const w = makeWorld(); w.hooks.onPinned = (n) => { if (n === 2) addVersion(w.docs[0], IDS.v2, "NEWER BYTES"); };
    const r = await w.reader({}, f).download(w.req());
    return kind(r) !== "ready" && !w.reads.some((x) => x.endsWith("rev-2"));
  },
  "an unavailable reader leaks nothing and touches nothing": async (f) => {
    const w = makeWorld(); const r = await w.reader({ authority: async () => ({ allowed: false, reason: "AUTHORITY_UNAVAILABLE" }) }, f).download(w.req());
    return kind(r) === "unavailable" && w.log.length === 0 && Object.keys(r).length === 1;
  },
};

test("the real reader passes every behaviour", async () => {
  const f = await load();
  for (const [name, check] of Object.entries(BEHAVIOURS)) assert.equal(await check(f), true, name);
});

const CONTROLS: [string, [string, string][], string][] = [
  ["final authorization removed", [['const last = await finalAuthorize(p.sessionId, first);\n    if ("kind" in last)', 'const last: any = { validUntilMs: first.ctx.validUntilMs };\n    if ("kind" in last)']], "final authorization is the last asynchronous step"],
  ["D1 target authority no longer gates version resolution", [['if (authorized.length === 0) return fail("denied");', ""]], "no version or document operation runs without D1 target authority (oracle closed)"],
  ["matter scope check removed", [['if (!ctx.scopeRefs.includes(matter.scopeRef)) return fail("missing");', ""]], "the reader itself enforces the matter scope even if the evidence port does not"],
  ["request whitelist weakened to a type check", [['if (keys.length !== REQUEST_KEYS.length || !REQUEST_KEYS.every((k) => keys.includes(k) && Object.getOwnPropertyDescriptor(req, k)?.get === undefined)) return fail("denied");', ""]], "a browser-supplied permission or version field is refused before any port"],
  ["revalidation does not compare the evidence revision", [["a.matterId === b.matterId && a.evidenceId === b.evidenceId && a.evidenceRevision === b.evidenceRevision &&", "a.matterId === b.matterId && a.evidenceId === b.evidenceId &&"]], "an evidence revision advanced after delivery is withheld"],
  ["delivered document and version are not compared with the revalidated plan", [["|| delivered.documentId !== again.plan.documentId || delivered.versionId !== again.plan.versionId", ""], ["a.documentId === b.documentId && a.versionId === b.versionId", "true"]], "a different document pinned after delivery is withheld"],
  ["final expiry check removed", [["t >= first.ctx.validUntilMs || t >= again.ctx.validUntilMs || t >= last.validUntilMs", "false"]], "expiry at the last authorization read is caught immediately before delivery"],
  ["evidence state checked only after document operations", [['if (state === "unbound") return fail("unavailable");', ""]], "unbound, withdrawn and restricted evidence never reaches a document operation"],
  ["A1 binding drift ignored", [["first.ctx.binding !== again.ctx.binding", "false"], ["first.targetKey !== again.targetKey", "false"], ["if (ctx.binding !== first.ctx.binding) return fail(\"stale\");", ""], ["return target.stateKey === first.targetKey ? { validUntilMs: ctx.validUntilMs } : fail(\"stale\");", "return { validUntilMs: ctx.validUntilMs };"]], "grant drift between the runs is withheld"],
  ["target state key ignores classification policy and linked owners", [['|${sortedAllowed.join(",")}|${sortedLinked.join(",")}`', "`"]], "a classification policy change after delivery is withheld"],
  ["post-delivery failures are not collapsed to stale", [['fail(again.kind === "denied" || again.kind === "unavailable" ? again.kind : "stale")', "fail(again.kind)"]], "a change after delivery is reported as stale, a revocation as denied"],
  ["unavailable authority no longer short-circuits", [['if (!auth.allowed) return fail(auth.reason === "AUTHORITY_UNAVAILABLE" || auth.reason === "CLOCK_INVALID" ? "unavailable" : "denied");\n      const ctx = snapshotContext(auth.context);\n      if (!ctx) { note({ type: "invalid_authority_context" }); return fail("unavailable"); }\n      const t0', 'const ctx = snapshotContext((auth as any).context ?? { actor: "10000000-0000-4000-8000-000000000001", scopeRefs: ["scope-a"], binding: "b", sessionExpiresAtMs: Date.now() + 1e9, validUntilMs: Date.now() + 1e9 });\n      if (!ctx) { note({ type: "invalid_authority_context" }); return fail("unavailable"); }\n      const t0']], "an unavailable reader leaks nothing and touches nothing"],
];
for (const [name, mutations, behaviour] of CONTROLS)
  test(`negative control: ${name} is caught`, async () => {
    const f = await load(mutations);
    assert.equal(await BEHAVIOURS[behaviour](f), false, `expected "${behaviour}" to fail`);
  });
