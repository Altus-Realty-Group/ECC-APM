import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchDataHubRows } from "../../src/lib/ecc-collection-hooks";
import { createQueryClient } from "../../src/lib/queryClient";
import { getSessionEpoch, handleSessionBoundary, StaleSessionError } from "../../src/lib/sessionScope";

test("old Data Hub query closures cannot replay prior-session search text under a new session", async () => {
  const prior = getSessionEpoch();
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify([{ id: 1 }]), { status: 200, headers: { "content-type": "application/json" } }); };
  const client = createQueryClient();
  try {
    handleSessionBoundary(client);
    await assert.rejects(fetchDataHubRows("/api/owners/search?q=prior-identity", prior), StaleSessionError);
    assert.equal(calls, 0);
    assert.deepEqual(await fetchDataHubRows("/api/entities/owners?limit=25", getSessionEpoch()), [{ id: 1 }]);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; client.clear(); }
});
