import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { parseFileList } from "../../src/features/files/fileReader";

test("file reads distinguish true empty lists from failed or malformed sources", () => {
  assert.deepEqual(parseFileList({ ok: true, items: [] }, "DL"), []);
  for (const payload of [{}, { ok: false, items: [] }, { items: null }, { items: [null] }, { items: [{ name: "" }] }]) {
    assert.throws(() => parseFileList(payload, "DL"));
  }
  const file = parseFileList({ items: [{ id: 7, name: "Lease.pdf", size: 0, url: "https://example.test/lease.pdf" }] }, "DBX")[0];
  assert.equal(file.size, 0);
  assert.equal(file.name, "Lease.pdf");
  assert.throws(() => parseFileList({ items: [{ name: "bad", url: "javascript:alert(1)" }] }, "DL"));
});

test("DLQ replay refuses success without processing an actual failed item", async () => {
  const routes = new Map<string, Function>();
  const router = { get: (path: string, handler: Function) => routes.set(`GET ${path}`, handler), post: (path: string, handler: Function) => routes.set(`POST ${path}`, handler) };
  let externalCalls = 0;
  const deny = () => { externalCalls++; throw new Error("External call forbidden"); };
  const source = readFileSync(new URL("../../server/routes/admin/sync.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function("require", "exports", "process", compiled)((name: string) => {
    if (name === "express") return { Router: () => router };
    if (name.includes("supabaseAdmin")) return { sbAdmin: { from: deny } };
    if (name.includes("doorloop")) return { dlPaginate: deny, dlFetchFull: deny };
    throw new Error(`Unexpected import ${name}`);
  }, exports, { env: { ADMIN_SYNC_TOKEN: "isolated-test-token" } });
  const handler = routes.get("POST /dlq/requeue")!;
  let status = 200, body: unknown;
  const response = { status: (n: number) => { status = n; return response; }, json: (value: unknown) => { body = value; return response; } };
  await handler({ headers: {}, query: {}, body: { id: "missing" } }, response);
  assert.equal(status, 401);
  await handler({ headers: { "x-admin-token": "isolated-test-token" }, query: {}, body: { id: "missing" } }, response);
  assert.equal(status, 503);
  assert.deepEqual(body, { ok: false, error: "Requeue is not available." });
  assert.equal(externalCalls, 0);
});

test("unimplemented file readers cannot report a successful empty list", async () => {
  const routes = new Map<string, Function>();
  const router = { get: (path: string, handler: Function) => routes.set(path, handler) };
  let providerCalls = 0;
  const source = readFileSync(new URL("../../server/routes/files.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("require", "exports", "process", compiled)((name: string) => {
    if (name === "express") return { default: { Router: () => router } };
    if (name.includes("graph")) return { listSharePointRoot: () => { providerCalls++; throw new Error("Provider forbidden"); } };
    throw new Error(`Unexpected import ${name}`);
  }, {}, { env: {} });
  for (const path of ["/api/files/doorloop/list", "/api/files/sharepoint/list"]) {
    let status = 200, body: unknown;
    const response = { status: (n: number) => { status = n; return response; }, json: (value: unknown) => { body = value; return response; } };
    await routes.get(path)!({}, response);
    assert.equal(status, 503);
    assert.deepEqual(body, { ok: false, message: "Files are not available." });
  }
  assert.equal(providerCalls, 0);
});
