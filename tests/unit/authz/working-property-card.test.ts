import assert from "node:assert/strict";
import { test } from "node:test";
import { makeWorkingPropertyCardReader } from "../../../server/lib/authz/workingPropertyCard";

const scope = {
  propertyId: 7,
  companyId: "44444444-4444-4444-8444-444444444444",
  nativeProviderPropertyId: "1234567890abcdef12345678",
  workingEntityId: "55555555-5555-4555-8555-555555555555",
  connectionRef: "fixture-connection",
  actor: "11111111-1111-4111-8111-111111111111",
  validUntilMs: 1_800_000_000_000,
};
const row = {
  resource: "properties",
  entity_id: scope.workingEntityId,
  connection_ref: scope.connectionRef,
  source_id: scope.nativeProviderPropertyId,
  native_key: "7",
  native_evidence: "fixture-reviewed-link",
  source_run_ref: "fixture-capture",
  provider_fields: {
    name: "Fixture property", type: "Residential",
    address: { street1: "7 Fixture St", city: "Fixture City", zip: "01234", latitude: 41 },
    financialDetails: { balance: 10 }, active: false,
  },
};

test("Working card forwards the scoped read and exposes only verified card fields", async () => {
  const read = makeWorkingPropertyCardReader(async request => {
    assert.deepEqual(request, scope);
    return [row];
  });
  assert.deepEqual(await read(scope), {
    property: { id: 7, name: "Fixture property", type: "Residential",
      address: { line1: "7 Fixture St", city: "Fixture City", state: "", zip: "01234" } },
    kpis: { units: null, activeLeases: null, occupancyPct: null, avgRentCents: null },
  });
});

test("missing projection is absent while ambiguous or mismatched evidence fails closed", async () => {
  assert.equal(await makeWorkingPropertyCardReader(async () => [])(scope), null);
  await assert.rejects(makeWorkingPropertyCardReader(async () => [row, row])(scope), /ambiguous/);
  for (const patch of [
    { resource: "owners" }, { entity_id: scope.companyId }, { connection_ref: "other" },
    { source_id: "different" }, { native_key: "07" }, { native_evidence: null },
    { source_run_ref: "" }, { provider_fields: { address: { zip: 123 } } },
  ]) await assert.rejects(makeWorkingPropertyCardReader(async () => [{ ...row, ...patch }])(scope));
});

test("omitted data is unavailable rather than inferred from legacy aliases", async () => {
  const read = makeWorkingPropertyCardReader(async () =>
    [{ ...row, provider_fields: { address: { street_1: "Stale alias" } } }]);
  assert.deepEqual(await read(scope), {
    property: { id: 7, name: "", type: "UNKNOWN", address: { line1: "", city: "", state: "", zip: "" } },
    kpis: { units: null, activeLeases: null, occupancyPct: null, avgRentCents: null },
  });
});
