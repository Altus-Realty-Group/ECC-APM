# ECC_GENERIC_COLLECTION_CONTRACT_V1

**Version:** 1.0  
**Family:** `GENERIC_COLLECTION`  

## 1. PURPOSE
This contract strictly enforces the envelope structure for all dynamically retrieved collections (e.g., general entities, maintenance metrics, accounting ledgers, and nested property arrays).

## 2. ENVELOPE (LOCKED)
```json
{
  "data": [
    { ... }
  ],
  "meta": {
    "totalCount": 0
  }
}
```
*Note: Any endpoint mapped to the generic collection must array-wrap singular objects if fetching explicitly by ID, or shift them to the appropriate `WORKFLOW`/`SYSTEM` bounds.*

## 3. STRUCTURAL RULES
- **Empty States:** Must return `{ "data": [], "meta": { "totalCount": 0 } }`. Null `data` is forbidden.
- **Strict Headers Required:**
  - `x-ecc-handler`: Present and matching registry.
  - `x-ecc-contract`: Contract subclass (e.g. `PORTFOLIO_LIST`, `GENERIC_COLLECTION`).
  - `x-ecc-contract-version`: `v1`
  - `x-ecc-route-canonical`: Boolean reflecting proxy origin.
