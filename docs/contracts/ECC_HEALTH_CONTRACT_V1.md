# ECC HEALTH CONTRACT V1

Defines the exact shape boundary for `/api/health`.

## Base Endpoint
- `GET /api/health`

## Success Shape (200 OK)
When all required variables (e.g. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are present:
```json
{
  "ok": true,
  "mode": "ready",
  "warnings": [], 
  "env": {
    "SUPABASE_URL": "present",
    "SUPABASE_SERVICE_ROLE_KEY": "present",
    "DATABASE_URL": "missing"
  }
}
```
*Note: If `DATABASE_URL` is omitted, `warnings` must contain `"database_url_unset_using_supabase_only"`.*

## Degraded Shape (503 Service Unavailable)
Triggered securely by `server/lib/env.ts` checking for core variables:
```json
{
  "ok": false,
  "mode": "degraded",
  "error": "Server misconfigured",
  "missing_env": ["SUPABASE_URL"],
  "env": {
    "SUPABASE_URL": "missing"
  }
}
```
