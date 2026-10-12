# ECC PORTFOLIO LIST CONTRACT V1

This file defines the strict response shape contract for all canonical API portfolio endpoints (`/api/portfolio/*`).

## Applies To
- `GET /api/portfolio/properties`
- `GET /api/portfolio/units`
- `GET /api/portfolio/leases`
- `GET /api/portfolio/tenants`
- `GET /api/portfolio/owners`

## Request Contract
- Endpoints accept `limit` and `offset` as optional query parameters.
- Standard limit default: `50` or `5000` depending on collection.

## Response Contract
- **Shape Must Be a Raw Array.**
- We do **NOT** use nested payloads like `{ data: [...] }` or `{ rows: [...] }` for portfolio reads. This is an explicit, verified FE expectation.
- All empty responses should return an empty array `[]` cleanly, not a `404` or `null`.

```javascript
[
  {
    "id": 1,
    // ... record fields
  }
]
```

## Error State Contract
- Missing dependencies or unconfigured states must trigger a `503 Service Unavailable`, optionally returning `{ ok: false, error: "Server misconfigured" }`.
- Do not return blank 500 pages. Do not crash the node process.
