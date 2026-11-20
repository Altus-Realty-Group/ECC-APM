import assert from "node:assert/strict";
import { test } from "node:test";
import { makeVerifiedWorkingPropertyBinding } from "../../../server/lib/authz/verifiedWorkingPropertyBinding";

const binding = {
  propertyId: 7,
  companyId: "44444444-4444-4444-8444-444444444444",
  workingEntityId: "55555555-5555-4555-8555-555555555555",
  connectionRef: "fixture-connection",
  nativeProviderPropertyId: "1234567890abcdef12345678",
};
const evidence = {
  evidence_id: "fixture-link", resource: "properties", result_sha256: "a".repeat(64), revoked_at: null,
};
const identity = {
  resource: "properties", native_key: "7", entity_id: binding.workingEntityId,
  connection_ref: binding.connectionRef, source_id: binding.nativeProviderPropertyId,
  native_evidence: evidence.evidence_id, mapping_evidence: evidence,
};
const company = { ...binding, status: "verified", revokedAt: null, receiptSha256: "b".repeat(64) };

function resolver(identities: readonly unknown[], companyReceipts: readonly unknown[]) {
  return makeVerifiedWorkingPropertyBinding({
    loadWorkingIdentities: async key => { assert.equal(key, "7"); return identities; },
    loadCompanyReceipts: async id => { assert.equal(id, 7); return companyReceipts; },
  });
}

test("property grant binding comes from exact, separately evidenced identity and company records", async () => {
  assert.deepEqual(await resolver([identity], [company])(7), binding);
});

test("ambiguous or missing identity and company scopes cannot supply a binding", async () => {
  assert.equal(await resolver([], [company])(7), null);
  assert.equal(await resolver([identity], [])(7), null);
  assert.equal(await resolver([identity, identity], [company])(7), null);
  assert.equal(await resolver([identity], [company, { ...company, status: "retired" }])(7), null);
});

test("only matching connection, provider ID, entity and ECC ID can supply a binding", async () => {
  for (const patch of [
    { propertyId: 8 }, { connectionRef: "other-connection" },
    { nativeProviderPropertyId: "other-property" }, { workingEntityId: binding.companyId },
  ]) assert.equal(await resolver([identity], [{ ...company, ...patch }])(7), null);
  assert.equal(await resolver([{ ...identity, native_key: "07" }], [company])(7), null);
});

test("a missing, malformed or revoked receipt cannot supply a binding", async () => {
  for (const patch of [
    { status: "proposed" }, { revokedAt: undefined }, { revokedAt: "2026-11-19T12:00:00Z" }, { receiptSha256: "bad" },
  ]) assert.equal(await resolver([identity], [{ ...company, ...patch }])(7), null);
  for (const patch of [
    { evidence_id: "different" }, { resource: "owners" }, { result_sha256: "bad" },
    { revoked_at: undefined }, { revoked_at: "2026-11-19T12:00:00Z" },
  ]) assert.equal(await resolver([{ ...identity, mapping_evidence: { ...evidence, ...patch } }], [company])(7), null);
});

test("invalid property IDs never call either source", async () => {
  const resolve = resolver([identity], [company]);
  for (const id of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) assert.equal(await resolve(id), null);
});
