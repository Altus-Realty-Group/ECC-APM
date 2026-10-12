# ECC_WORKFLOW_CONTRACT_V1

**Version:** 1.0  
**Family:** `WORKFLOW`  

## 1. PURPOSE
This contract defines the strict shape and structural requirements for all mutation workflows (e.g., Owner Transfers, M365 interactions, RPC commands).

## 2. STRUCTURAL RULES
- **Response Shape:** Standard JSON Object `{ ... }` without an explicit array wrapper unless the requested workflow fundamentally acts upon multiple entities simultaneously.
- **Strict Headers Required:**
  - `x-ecc-handler`: Present and matching registry.
  - `x-ecc-contract`: `WORKFLOW`
  - `x-ecc-contract-version`: `v1`
  - `x-ecc-route-canonical`: `true` or `false`
- **Data Shape Variability:** Permitted. The exact JSON object properties may vary based on the workflow domain (e.g., returning `{ transferId: number }` for initiates, or `{ ok: true, graph: { taskId: string } }` for Planner tasks).

## 3. STATUS CODES (MANDATORY)
- `200 OK`: For synchronous, non-destructive, or pure approval/authorization operations.
- `201 Created`: MUST be used when the workflow provisions a new database record (e.g., originating an owner transfer).
- `202 Accepted`: For long-running asynchronous execution delegations.
- `400 Bad Request`: If payload fails server-side Zod validation.
- `500...`: Expressly avoided where possible via Zod/Schema boundaries, caught internally.
