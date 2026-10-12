# ECC ROUTE REGISTRY CONTRACT V1

## Authoritative Endpoint
- `GET /api/_meta/routes`

## Mandate
This endpoint MUST match the runtime reality of the Express instance. 
The manifest is sourced directly from `server/lib/routeRegistry.ts`.
**NO SHADOW ROUTES.** Any endpoint bound to `/api/*` MUST exist in the registry arrays.

## Response Shape (200 OK)
```json
{
  "ok": true,
  "routes": [
    {
      "method": "GET",
      "path": "/api/health",
      "handler": "server/index.ts",
      "status": "active",
      "group": "System"
    },
    {
      "method": "GET",
      "path": "/api/properties/:id",
      "handler": "server/routes/properties.ts",
      "status": "410_gone",
      "replacement": "/api/portfolio/properties",
      "group": "Legacy"
    }
  ]
}
```
