# ECC_ADMIN_SYNC_CONTRACT_V1

**Version:** 1.0  
**Family:** `ADMIN_SYNC`  

## 1. PURPOSE
This contract dictates the structural bounds for all system-level background synchronization, indexing, and migration command paths (primarily the `Control` and `Admin` trees targeting remote databases).

## 2. STRUCTURAL RULES
- **Response Shape:** Static JSON Status Object `{ ok: boolean, message?: string, ... }`.
- **Strict Headers Required:**
  - `x-ecc-handler`: Present and matching registry.
  - `x-ecc-contract`: `ADMIN_SYNC`
  - `x-ecc-contract-version`: `v1`
  - `x-ecc-route-canonical`: `true` or `false` (explicit aliases).

## 3. STATUS CODES (MANDATORY)
- `200 OK`: Successful synchronous execution or lock resolution.
- `202 Accepted`: For operations decoupled from the thread pool.
- `401 Unauthorized`: Hard requirement for all internal endpoints missing the correct runtime tokens.

## 4. DEVIATION PROTOCOL
Changing this shape impacts the M365 polling mechanisms and Admin Control Panels. No deviations are permitted without altering this primary definition.
