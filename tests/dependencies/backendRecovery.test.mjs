import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {unavailableOperation} from "../../server/lib/unavailableOperation.ts";
import {DropboxFolder, DropboxLink, DropboxSearch, GraphToken, GraphBuckets,
  GraphTask, GraphItems, GeocodeResponse} from "../../server/lib/vendorResponseContracts.ts";
import {uploadBufferToDropbox} from "../../server/lib/dropbox.ts";

test("unfinished operation handler returns failure without a service/provider call", () => {
  let status, body;
  const res = {status(n) {status = n; return this;}, json(value) {body = value; return this;}};
  unavailableOperation({body: {transferId: 17}}, res);
  assert.equal(status, 503);
  assert.equal(body.ok, false);
  assert.equal(body.code, "OPERATION_UNAVAILABLE");
});

test("transfer containment mounts before the historical data-writing router", () => {
  const source = readFileSync(new URL("../../server/index.ts", import.meta.url), "utf8");
  const router = source.indexOf("app.use('/api', ownerTransferRouter)");
  assert.ok(router > 0);
  for (const path of ["/api/owner-transfer", "/api/owner-transfers", "/api/owners/initiatetransfer",
    "/api/owners/approvetransfer", "/api/owners/authorizetransfer", "/api/owners/executetransfer"]) {
    const mount = source.indexOf(`app.use('${path}', unavailableOperation)`);
    assert.ok(mount >= 0 && mount < router, path);
  }
  for (const path of ["/api/maintenance/workorders", "/api/accounting/transactions", "/api/portfolio/_debug/sql"]) {
    assert.ok(source.includes(`app.get("${path}", unavailableOperation)`), path);
  }
  assert.doesNotMatch(source, /Math\.random\(|await (?:initiateTransfer|authorizeExecution|executeTransfer|generateAccountingReport)\(/);
});

test("provider parsing distinguishes an empty result from an invalid payload", () => {
  for (const [schema, empty] of [[DropboxFolder, {entries: []}], [DropboxSearch, {matches: []}],
    [GraphBuckets, {value: []}], [GraphItems, {value: []}], [GeocodeResponse, {results: []}]]) {
    assert.equal(schema.safeParse(empty).success, true);
    for (const malformed of [null, [], {}, {entries: "wrong", matches: "wrong", value: "wrong", results: "wrong"}]) {
      assert.equal(schema.safeParse(malformed).success, false);
    }
  }
  assert.equal(GraphToken.safeParse({access_token: 17}).success, false);
  assert.equal(GraphTask.safeParse({id: null}).success, false);
  assert.equal(DropboxLink.safeParse({link: "not a URL"}).success, false);
  assert.equal(GeocodeResponse.safeParse({results: [{geometry: {location: {lat: "41", lng: -87}}}]}).success, false);
});

test("native-fetch upload receives unchanged binary workbook bytes", async () => {
  const oldFetch = globalThis.fetch;
  const oldToken = process.env.DROPBOX_ACCESS_TOKEN;
  process.env.DROPBOX_ACCESS_TOKEN = "isolated-test-fixture";
  const bytes = Buffer.from([0, 255, 80, 75, 128]);
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({url, options});
    return new Response(JSON.stringify(calls.length === 1 ? {path_lower: "/fixture.xlsx"} : {url: "https://example.invalid/fixture?dl=0"}),
      {status: 200, headers: {"content-type": "application/json"}});
  };
  try {
    const result = await uploadBufferToDropbox({path: "/fixture.xlsx", buffer: bytes});
    assert.equal(calls.length, 2);
    assert.ok(calls[0].options.body instanceof Uint8Array);
    assert.deepEqual(Buffer.from(calls[0].options.body), bytes);
    assert.equal(result.url, "https://example.invalid/fixture?dl=1");
  } finally {
    globalThis.fetch = oldFetch;
    if (oldToken === undefined) delete process.env.DROPBOX_ACCESS_TOKEN;
    else process.env.DROPBOX_ACCESS_TOKEN = oldToken;
  }
});

test("direct legacy service calls cannot invoke data, export or vendor writers", async () => {
  const service = await import("../../server/services/ownerTransferService.ts");
  for (const name of ["initiateTransfer", "generateAccountingReport", "markApprovedByAccounting",
    "authorizeExecution", "executeTransfer", "getTransferDetails"]) {
    await assert.rejects(service[name](17), error => error.status === 503 && error.code === "OPERATION_UNAVAILABLE");
  }
});
