// ECC-D1-CLAUDE-v3: the delivery boundary. Each "REPRODUCED" test failed against 2377084 before the fix (see the PR comment).
import assert from "node:assert/strict";
import { test } from "node:test";
import { createDocumentReader } from "../../../server/lib/documents/reader.ts";
import { DENY_ALL_CLASSIFICATIONS } from "../../../server/lib/documents/unbound.ts";
import type { AuthorityPort, ClassificationPolicy, ContentSource, DocumentStore } from "../../../server/lib/documents/ports.ts";
import type { ReadAuthority } from "../../../shared/authz/protectedRead.ts";
import { classificationVisible, requiredClassifications, type Classification } from "../../../shared/documents/model.ts";
import { OWNER_A, OWNER_B, PROP_A1, SCOPES, SESSION_ID, authState, authority, doc, memoryContent, memoryStore, ownerCtx, propertyCtx, scopeResolver, standardDocs, type Doc } from "./fixtures.ts";

const T0 = 1_000_000;
const PERSON = "10000000-0000-4000-8000-000000000001";
const goodContext = (over: Record<string, unknown> = {}) => ({ actor: PERSON, scopeRefs: ["scope-a"], binding: "synthetic-binding", sessionExpiresAtMs: T0 + 10_000, validUntilMs: T0 + 10_000, ...over });

/** Fully wired reader with an ordered call log across every port, a controllable clock and a constant (clock-independent) authority. */
function wired(docs: Doc[], o: { policy?: ClassificationPolicy; context?: () => unknown; owners?: Map<number, string>; hook?: (what: string) => void } = {}) {
  const clock = { now: T0 };
  const log: string[] = [];
  const hook = (what: string) => { log.push(what); o.hook?.(what); };
  const base = memoryStore(docs);
  const { content } = memoryContent(docs);
  const owners = o.owners ?? new Map(SCOPES.owners);
  const scopes = scopeResolver(owners);
  const store: DocumentStore = {
    linkedOwnerIds: async (p) => { hook("store.linkedOwnerIds"); return base.store.linkedOwnerIds(p); },
    count: async (f) => { hook("store.count"); return base.store.count(f); },
    list: async (f, a, l) => { hook("store.list"); const r = await base.store.list(f, a, l); hook("store.list:done"); return r; },
    get: async (f, id) => { hook("store.get"); const r = await base.store.get(f, id); hook("store.get:done"); return r; },
    getVersion: async (d, v) => { hook("store.getVersion"); return base.store.getVersion(d, v); },
  };
  const src: ContentSource = { read: async (r, m) => { hook("content.read"); const b = await content.read(r, m); hook("content.read:done"); return b; } };
  const authorityPort: AuthorityPort = async () => { hook("authority"); const c = o.context ? o.context() : goodContext(); return { allowed: true, context: c } as unknown as ReadAuthority; };
  const policy: ClassificationPolicy = (c, cl, t) => { hook("policy"); return (o.policy ?? DENY_ALL_CLASSIFICATIONS)(c, cl, t); };
  const scopeLog = { scopeOfOwner: async (id: number) => { hook("scope"); return scopes.scopeOfOwner(id); }, scopeOfProperty: async (id: number) => { hook("scope"); return scopes.scopeOfProperty(id); } };
  const reader = createDocumentReader({ authority: authorityPort, scopes: scopeLog, store, content: src, classificationPolicy: policy, now: () => clock.now });
  return { reader, clock, log, owners };
}
const dl = (r: ReturnType<typeof wired>["reader"], ctx = ownerCtx(OWNER_A), documentId = "d3") => r.download({ sessionId: SESSION_ID, context: ctx, documentId, versionId: `${documentId}-v1` });

// ---------- 1. the final registry read may not be followed by an authorization that predates it ----------
test("REPRODUCED: the FINAL registry read advancing the clock past authority expiry withholds the bytes", async () => {
  let gets = 0;
  const w = wired(standardDocs(), { hook: (what) => { if (what === "store.get:done" && ++gets === 2) w.clock.now = T0 + 10_000; } });   // exactly at the exclusive expiry
  const r = await dl(w.reader);
  assert.notEqual(r.kind, "ready", "bytes must not be delivered once authority has expired");
  assert.ok(!("bytes" in r));
  assert.equal(gets, 2, "the scenario really exercised the second registry read");
});

test("REPRODUCED: the FINAL registry read revoking financial_tax permission after returning its row withholds the bytes", async () => {
  let allow = true, gets = 0;
  const w = wired(standardDocs(), { policy: (_c, cl) => allow && cl === "financial_tax", hook: (what) => { if (what === "store.get:done" && ++gets === 2) allow = false; } });
  const r = await dl(w.reader, ownerCtx(OWNER_A), "d2");
  assert.deepEqual(r, { kind: "stale" });
  assert.equal(gets, 2);
  const ok = wired(standardDocs(), { policy: (_c, cl) => cl === "financial_tax" });
  assert.equal((await dl(ok.reader, ownerCtx(OWNER_A), "d2")).kind, "ready", "control: unchanged permission delivers a financial/tax document");
});

test("the registry read of a linked agreement is also followed by (not preceded by) the final authorization", async () => {
  const owners = new Map(SCOPES.owners);
  let gets = 0;
  const w = wired(standardDocs(), { owners, hook: (what) => { if (what === "store.get:done" && ++gets === 2) owners.delete(OWNER_A); } });
  assert.deepEqual(await dl(w.reader, propertyCtx(PROP_A1), "d1"), { kind: "stale" }, "the home owner stopped being authorized during the final registry read");
  assert.equal((await dl(wired(standardDocs()).reader, propertyCtx(PROP_A1), "d1")).kind, "ready", "control");
});

test("ordering: after the final authorization decision there is no further registry or provider read before delivery", async () => {
  for (const [name, ctx, id] of [["owner document", ownerCtx(OWNER_A), "d3"], ["linked agreement under a property", propertyCtx(PROP_A1), "d1"]] as const) {
    const w = wired(standardDocs());
    assert.equal((await dl(w.reader, ctx, id)).kind, "ready", name);
    const lastAuth = Math.max(...w.log.map((e, i) => (["authority", "scope", "policy", "store.linkedOwnerIds"].includes(e) ? i : -1)));
    const io = w.log.map((e, i) => (/^(store\.(get|list|count|getVersion)|content\.read)$/.test(e) ? i : -1)).filter((i) => i >= 0);
    assert.ok(io.length >= 2 && Math.max(...io) < lastAuth, `${name}: the last registry/provider read (#${Math.max(...io)}) must precede the final authorization (#${lastAuth}); log: ${w.log.join(" > ")}`);
  }
  const l = wired(standardDocs());
  assert.equal((await l.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) })).kind, "ready");
  const lastAuth = Math.max(...l.log.map((e, i) => (["authority", "scope", "policy", "store.linkedOwnerIds"].includes(e) ? i : -1)));
  assert.ok(Math.max(...l.log.map((e, i) => (/^store\.(list|count)$/.test(e) ? i : -1))) < lastAuth, `list: ${l.log.join(" > ")}`);
});

test("changes during the FINAL registry read of a list (list/count) withhold the metadata, clock-independent of the authority", async () => {
  for (const [name, op, trigger] of [["clock passes expiry during list", "clock", "store.list:done"], ["policy revoked during list", "policy", "store.list:done"], ["mapping removed during list", "mapping", "store.list:done"]] as const) {
    let allow = true;
    const owners = new Map(SCOPES.owners);
    const w = wired(standardDocs(), { owners, policy: (_c, cl) => allow && cl === "financial_tax", hook: (what) => {
      if (what !== trigger) return;
      if (op === "clock") w.clock.now = T0 + 10_000; else if (op === "policy") allow = false; else owners.delete(OWNER_A);
    } });
    const r = await w.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) });
    assert.ok(r.kind !== "ready" && !("documents" in r), `${name}: ${r.kind}`);
  }
  assert.equal((await wired(standardDocs(), { policy: (_c, cl) => cl === "financial_tax" }).reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) })).kind, "ready", "control");
});

test("expiry is checked immediately before returning: one tick before expiry delivers, the expiry instant does not", async () => {
  const w = wired(standardDocs());
  w.clock.now = T0 + 10_000 - 1;
  assert.equal((await dl(w.reader)).kind, "ready");
  w.clock.now = T0 + 10_000;
  assert.notEqual((await dl(w.reader)).kind, "ready");
});

// ---------- 3. section / classification / permission matrix: list, count and download ----------
const CLASSES: Classification[] = ["general", "confidential", "restricted", "financial_tax"];
const SECTIONS = ["financial-tax", "correspondence", "statements-reports"];
const PERMISSIONS: Classification[][] = [[], ["restricted"], ["financial_tax"], ["restricted", "financial_tax"]];
/** An independent oracle (does not call the function under test). */
function oracle(section: string, cls: Classification, granted: Classification[]): boolean {
  const classOk = cls === "general" || cls === "confidential" || granted.includes(cls);
  const sectionOk = section !== "financial-tax" || granted.includes("financial_tax");
  return classOk && sectionOk;
}
test("REPRODUCED: requiredClassifications(financial-tax, restricted) requires BOTH restricted and financial_tax", () => {
  assert.deepEqual([...requiredClassifications("financial-tax", "restricted")].sort(), ["financial_tax", "restricted"]);
  assert.equal(classificationVisible("financial-tax", "restricted", ["general", "confidential", "restricted"]), false, "restricted allowed but financial_tax denied must not open it");
  assert.equal(classificationVisible("financial-tax", "restricted", ["general", "confidential", "financial_tax"]), false, "financial_tax allowed but restricted denied must not open it");
  assert.equal(classificationVisible("financial-tax", "restricted", ["general", "confidential", "restricted", "financial_tax"]), true);
  assert.deepEqual([...requiredClassifications("financial-tax", "financial_tax")], ["financial_tax"]);
  assert.deepEqual([...requiredClassifications("financial-tax", "general")].sort(), ["financial_tax", "general"]);
  assert.deepEqual([...requiredClassifications("correspondence", "restricted")], ["restricted"]);
});
test("matrix: every section x classification x permission set agrees with the oracle for LIST, COUNT and DOWNLOAD", async () => {
  let checked = 0;
  for (const section of SECTIONS) for (const cls of CLASSES) for (const granted of PERMISSIONS) {
    const home = section === "statements-reports" || section === "correspondence" || section === "financial-tax";
    assert.ok(home);
    const docs = [doc("mx", `Matrix ${section} ${cls}`, { homeOwner: OWNER_A, section, classification: cls }), doc("ctrl", "Control letter", { homeOwner: OWNER_A, section: "correspondence" })];
    const w = wired(docs, { policy: (_c, c) => granted.includes(c) });
    const expected = oracle(section, cls, granted);
    const label = `${section}/${cls}/granted[${granted.join(",")}]`;
    const list = await w.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) });
    assert.ok(list.kind === "ready", label);
    if (list.kind !== "ready") continue;
    assert.equal(list.documents.some((d) => d.id === "mx"), expected, `list ${label}`);
    assert.equal(list.total, expected ? 2 : 1, `count ${label}`);
    const searched = await w.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), search: "matrix" });
    assert.ok(searched.kind === "ready" && searched.total === (expected ? 1 : 0) && searched.documents.length === (expected ? 1 : 0), `search ${label}`);
    const d = await dl(w.reader, ownerCtx(OWNER_A), "mx");
    assert.equal(d.kind === "ready", expected, `download ${label}: ${d.kind}`);
    if (!expected) assert.deepEqual(d, { kind: "missing" }, `download ${label}`);
    assert.equal((await dl(w.reader, ownerCtx(OWNER_A), "ctrl")).kind, "ready", `control ${label}`);
    checked++;
  }
  assert.equal(checked, SECTIONS.length * CLASSES.length * PERMISSIONS.length);
});
test("a store that applies only the declared class is refused when the section rule would hide the row (restricted + financial-tax)", async () => {
  const docs = [doc("rt", "Restricted tax", { homeOwner: OWNER_A, section: "financial-tax", classification: "restricted" })];
  const base = memoryStore(docs).store;
  const { content } = memoryContent(docs);
  const w = createDocumentReader({ authority: async () => ({ allowed: true, context: goodContext() }) as never, scopes: scopeResolver(), content, classificationPolicy: (_c, c) => c === "restricted", now: () => T0,
    store: { ...base, count: async () => 1, list: async () => [docs[0].row], get: async () => docs[0].row } });
  assert.deepEqual(await w.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) }), { kind: "unavailable" });
  assert.deepEqual(await w.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "rt", versionId: "rt-v1" }), { kind: "unavailable" });
});

// ---------- 4. the A1 context is validated and snapshotted at the authority boundary ----------
test("REPRODUCED: the REAL A1 authority port with validUntilMs replaced by NaN no longer delivers", async () => {
  const docs = standardDocs();
  const a = authState();
  const real = authority(a);
  const wrap = (mutate: (c: Record<string, unknown>) => unknown): AuthorityPort => async (s, r) => {
    const out = await real(s, r);
    return out.allowed ? ({ allowed: true, context: mutate({ ...out.context }) } as unknown as ReadAuthority) : out;
  };
  const build = (port: AuthorityPort) => { const { store, calls } = memoryStore(docs); const { content, reads } = memoryContent(docs);
    return { calls, reads, reader: createDocumentReader({ authority: port, scopes: scopeResolver(), store, content, classificationPolicy: DENY_ALL_CLASSIFICATIONS, now: () => a.nowMs }) }; };
  const control = build(wrap((c) => c));
  assert.equal((await dl(control.reader)).kind, "ready", "control: the unmodified real A1 context delivers");
  assert.equal((await control.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) })).kind, "ready");
  const nan = build(wrap((c) => ({ ...c, validUntilMs: Number.NaN })));
  assert.deepEqual(await dl(nan.reader), { kind: "unavailable" });
  assert.deepEqual(nan.reads, []);
});

const MALFORMED: [string, (c: Record<string, unknown>) => unknown][] = [
  ["validUntilMs NaN", (c) => ({ ...c, validUntilMs: Number.NaN })], ["validUntilMs Infinity", (c) => ({ ...c, validUntilMs: Number.POSITIVE_INFINITY })],
  ["validUntilMs -Infinity", (c) => ({ ...c, validUntilMs: Number.NEGATIVE_INFINITY })], ["validUntilMs undefined", (c) => ({ ...c, validUntilMs: undefined })],
  ["validUntilMs missing", (c) => { const { validUntilMs, ...rest } = c; void validUntilMs; return rest; }], ["validUntilMs null", (c) => ({ ...c, validUntilMs: null })],
  ["validUntilMs string", (c) => ({ ...c, validUntilMs: "999999999999" })], ["validUntilMs zero", (c) => ({ ...c, validUntilMs: 0 })], ["validUntilMs negative", (c) => ({ ...c, validUntilMs: -5 })],
  ["validUntilMs bigint", (c) => ({ ...c, validUntilMs: 10n })],
  ["sessionExpiresAtMs NaN", (c) => ({ ...c, sessionExpiresAtMs: Number.NaN })], ["sessionExpiresAtMs missing", (c) => { const { sessionExpiresAtMs, ...rest } = c; void sessionExpiresAtMs; return rest; }],
  ["actor missing", (c) => ({ ...c, actor: undefined })], ["actor not a uuid", (c) => ({ ...c, actor: "someone" })], ["actor a number", (c) => ({ ...c, actor: 7 })],
  ["scopeRefs missing", (c) => ({ ...c, scopeRefs: undefined })], ["scopeRefs empty", (c) => ({ ...c, scopeRefs: [] })], ["scopeRefs a string", (c) => ({ ...c, scopeRefs: "scope-a" })],
  ["scopeRefs with an invalid ref", (c) => ({ ...c, scopeRefs: ["scope-a", "bad,ref"] })], ["scopeRefs with a non-string", (c) => ({ ...c, scopeRefs: [7] })],
  ["binding missing", (c) => ({ ...c, binding: undefined })], ["binding empty", (c) => ({ ...c, binding: "" })], ["binding not a string", (c) => ({ ...c, binding: 5 })],
  ["context null", () => null], ["context a string", () => "context"], ["context an array", () => []],
];
test("malformed A1 contexts fail closed on LIST and DOWNLOAD without touching the registry or the provider", async () => {
  for (const [name, mutate] of MALFORMED) {
    const w = wired(standardDocs(), { context: () => mutate(goodContext()) });
    assert.equal(JSON.stringify(await w.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) })), '{"kind":"unavailable"}', `list: ${name}`);
    assert.equal(JSON.stringify(await dl(w.reader)), '{"kind":"unavailable"}', `download: ${name}`);
    assert.ok(!w.log.some((e) => /^(store\.|content\.)/.test(e)), `${name}: no registry or provider call; log: ${w.log.join(" > ")}`);
    assert.ok(!w.log.includes("policy") && !w.log.includes("scope"), `${name}: not even the scope or policy ports`);
  }
  const ok = wired(standardDocs());
  assert.equal((await ok.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) })).kind, "ready", "control: a well-formed context");
  assert.equal((await dl(ok.reader)).kind, "ready");
});
test("an already-expired context is denied and the context handed to the policy port is a frozen snapshot", async () => {
  const expired = wired(standardDocs(), { context: () => goodContext({ validUntilMs: T0 }) });
  assert.deepEqual(await dl(expired.reader), { kind: "denied" });
  let seen: unknown;
  const live = goodContext();
  const w = wired(standardDocs(), { context: () => live, policy: (c) => { seen = c; return false; } });
  await dl(w.reader);
  assert.ok(Object.isFrozen(seen) && Object.isFrozen((seen as { scopeRefs: string[] }).scopeRefs), "the port's context is snapshotted, not the live object");
  assert.notEqual(seen, live);
  // The snapshot is isolated from later mutation of the port's object, and the FRESH decision re-validates what the port returns now:
  // a context corrupted after the first decision is refused rather than trusted.
  const snapshots: Array<{ validUntilMs: number; scopeRefs: readonly string[] }> = [];
  const mutating = wired(standardDocs(), { context: () => live, policy: (c) => { snapshots.push(c); return false; }, hook: (what) => { if (what === "content.read:done") { live.validUntilMs = Number.NaN; live.scopeRefs = []; } } });
  const r = await dl(mutating.reader);
  assert.deepEqual(r, { kind: "unavailable" }, "the corrupted fresh context is refused");
  assert.ok(snapshots.length > 0 && snapshots.every((c) => c.validUntilMs === T0 + 10_000 && c.scopeRefs.length === 1), "the snapshot taken earlier was not changed by the later mutation");
});

// ---------- the synchronous tail: expiry immediately before returning, and the final row under the FRESH authorization ----------
test("expiry is read AGAIN immediately before returning: authority that expires only at the very last clock reading withholds the result", async () => {
  const mk = (docs: Doc[], validUntilMs: number) => {
    let reads = 0;
    const { store } = memoryStore(docs); const { content } = memoryContent(docs);
    const reader = createDocumentReader({ authority: async () => ({ allowed: true, context: goodContext({ validUntilMs }) }) as never, scopes: scopeResolver(), store, content,
      classificationPolicy: DENY_ALL_CLASSIFICATIONS, now: () => T0 + reads++ });
    return { reader, reads: () => reads };
  };
  for (const op of ["download", "list"] as const) {
    const run = (r: ReturnType<typeof mk>["reader"]) => (op === "download" ? dl(r) : r.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) }));
    const dry = mk(standardDocs(), T0 + 1_000_000);
    assert.equal((await run(dry.reader)).kind, "ready", `${op}: control with a distant expiry`);
    const total = dry.reads();
    const exact = mk(standardDocs(), T0 + total - 1);     // only the FINAL reading (index total-1) reaches the expiry instant
    const r = await run(exact.reader);
    assert.notEqual(r.kind, "ready", `${op}: expiring at the final reading must withhold the result`);
    assert.ok(!("bytes" in r) && !("documents" in r), op);
    const justBefore = mk(standardDocs(), T0 + total);     // one unit later: still valid at every reading
    assert.equal((await run(justBefore.reader)).kind, "ready", `${op}: one tick before expiry still delivers`);
  }
});
test("time passing DURING the synchronous tail after the final decision still withholds the result (expiry read immediately before returning)", async () => {
  // Rows whose properties advance the clock when read model work done synchronously after the final authorization decision.
  const makeReader = (docs: Doc[], clock: { now: number }, spy: { hits: number; trigger: number; field: string; target: "get" | "list" }) => {
    const base = memoryStore(docs).store; const { content } = memoryContent(docs);
    const ticking = (row: StoreRowLike): StoreRowLike => {
      const copy: Record<string, unknown> = { ...row };
      const value = copy[spy.field];
      Object.defineProperty(copy, spy.field, { enumerable: true, configurable: true, get() { if (++spy.hits === spy.trigger) clock.now = T0 + 10_000; return value; } });
      return copy as unknown as StoreRowLike;
    };
    const reader = createDocumentReader({ authority: async () => ({ allowed: true, context: goodContext() }) as never, scopes: scopeResolver(), content, classificationPolicy: DENY_ALL_CLASSIFICATIONS, now: () => clock.now,
      store: { ...base,
        get: async (f, id) => { const r = await base.get(f, id); return r && spy.target === "get" ? ticking(r) : r; },
        list: async (f, a, l) => (await base.list(f, a, l)).map((r) => (spy.target === "list" ? ticking(r) : r)) } });
    return reader;
  };
  for (const target of ["get", "list"] as const) {
    const field = target === "get" ? "classification" : "receipts";
    const run = (reader: ReturnType<typeof makeReader>) => (target === "get" ? dl(reader) : reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), limit: 1 }));
    const dry = { hits: 0, trigger: Number.POSITIVE_INFINITY, field, target };
    const dryClock = { now: T0 };
    assert.equal((await run(makeReader(standardDocs(), dryClock, dry))).kind, "ready", `${target}: control (the clock never advances)`);
    assert.ok(dry.hits >= 2, `${target}: the property is read more than once (${dry.hits})`);
    // Advance the clock on the LAST read of that property: after the final authorization decision, during the synchronous tail.
    const live = { hits: 0, trigger: dry.hits, field, target };
    const clock = { now: T0 };
    const r = await run(makeReader(standardDocs(), clock, live));
    assert.equal(live.hits, dry.hits, `${target}: same code path`);
    assert.equal(clock.now, T0 + 10_000, `${target}: the clock really advanced during the tail`);
    assert.notEqual(r.kind, "ready", `${target}: expired during the synchronous tail must not deliver`);
    assert.ok(!("bytes" in r) && !("documents" in r), target);
  }
});

test("the row from the FINAL registry read is validated against the fresh authorization: a filter-violating or different row is never delivered", async () => {
  const mutations: [string, (r: StoreRowLike) => StoreRowLike][] = [
    ["declared restricted (default-deny)", (r) => ({ ...r, classification: "restricted" })],
    ["a financial-tax section row declared general", (r) => ({ ...r, section: "financial-tax", classification: "general" })],
    ["a different home owner", (r) => ({ ...r, homeOwnerId: OWNER_B })],
    ["an unknown section", (r) => ({ ...r, section: "elsewhere" })],
    ["a malformed row", () => ({ documentId: "d3" }) as never],
    ["a different document", (r) => ({ ...r, documentId: "d8", currentVersion: { ...r.currentVersion, documentId: "d8" } })],
  ];
  for (const [name, mutate] of mutations) {
    const docs = standardDocs();
    const base = memoryStore(docs).store; const { content } = memoryContent(docs);
    let gets = 0;
    const reader = createDocumentReader({ authority: async () => ({ allowed: true, context: goodContext() }) as never, scopes: scopeResolver(), content, classificationPolicy: DENY_ALL_CLASSIFICATIONS, now: () => T0,
      store: { ...base, get: async (f, id) => { const row = await base.get(f, id); return ++gets === 2 && row ? mutate(row as StoreRowLike) : row; } } });
    const r = await dl(reader);
    assert.notEqual(r.kind, "ready", name);
    assert.ok(!("bytes" in r), name);
    assert.equal(gets, 2, `${name}: the scenario reached the final registry read`);
  }
  const same = standardDocs(); const { store } = memoryStore(same); const { content } = memoryContent(same);
  const ok = createDocumentReader({ authority: async () => ({ allowed: true, context: goodContext() }) as never, scopes: scopeResolver(), content, store, classificationPolicy: DENY_ALL_CLASSIFICATIONS, now: () => T0 });
  assert.equal((await dl(ok)).kind, "ready", "control: an identical final row delivers");
});
type StoreRowLike = import("../../../server/lib/documents/ports.ts").StoreRow;

export { OWNER_B };
