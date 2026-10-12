# ECC - APM (Empire Command Center for Altus Property Management)

Repository: Altus-Realty-Group/ECC-APM (ID 1058195656). Package name: `ecc-apm`.

This is the ECC frontend and local adapter/proxy surface. It consumes backend contracts; it does not redefine them. Replit is runtime observation only; source of truth is GitHub.

## Current Standards

- Identity: ECC-APM / ecc-apm.
- Security: Do not commit secrets. This hygiene snapshot removes tracked environment/cache files and retains a placeholder template. Historical exposure and remaining archives are not independently cleared by this review. Use approved runtime stores.
- Storage/Privacy: Business originals and archives retained until evidenced disposition. No irreversible deletion or history rewrite.
- UI: Black/white/gold. No orange. Accessible high-contrast financial UI.
- Contracts: GitHub owns code truth. Operational data uses verified database truth first, authoritative API fallback second, calculation last. Frontend consumes owned backend contracts.
- Workflow: Narrow, evidence-based PRs. No direct-main authoring.
- Cost: Metered Actions; disclose triggers, bounds, and expected minutes.

## Setup (single install path)

Node requirement (from package.json engines): `^20.19.0 || >=22.12.0`.

1. Use npm and package-lock.json exclusively (no pnpm).
2. `npm ci`
3. Optional local env: copy `.env.example` to ignored `.env.local` and set `VITE_API_BASE` only if overriding the default.
4. `npm run guardrail && npm run build`
5. Development: `npm run dev` (concurrently starts Vite web on 5173 and local API via `tsx server/index.ts`).

### API configuration (traced, no target changes)

- `VITE_API_BASE` is read by `src/lib/api.ts` and `src/lib/config.ts`, but their defaults differ: `api.ts` uses an empty `BASE` for relative `api()` paths and separately exports `/api` as `API_BASE`; `config.ts` defaults to `/api`. Several direct `/api/...` fetches do not use this setting. Verify the affected caller; the variable is not a universal target switch.
- In local Vite dev (`vite.config.js`), `/api` is proxied to `https://ecc-triage-node-staging.azurewebsites.net` (changeOrigin true). This is the remote staging proxy; it does not claim live runtime or database alignment.
- Local API server runs in parallel via the `dev` script for full-stack local work. No production targets or credentials are modified here.

## Recovery & Hygiene

See `docs/security/REPOSITORY_ARTIFACT_INVENTORY.md` and `docs/recovery/PR_DISPOSITION_LEDGER.md`.

Historical snapshots and `.archive/` are inventoried and retained pending evidenced disposition. Git history is not rewritten. Removed env/cache/upload files from the hygiene snapshot are not recommended for restoration.

### Rollback
Revert reviewed docs changes or restore selected source paths from preserved commits. Reversing the full hygiene removal would restore tracked environment/cache artifacts and requires a separate security-reviewed decision. Never blindly restore the complete removed snapshot.

## Stale Material

Historical recovery scripts, old Replit authoring workflows, and superseded CI proposals are classified as non-authoritative. Canonical plan, AGENTS.md, and current merged documentation remain references. See ledger for individual PR dispositions.
