# ECC - APM (Empire Command Center for Altus Property Management)

Repository: Altus-Realty-Group/ECC-APM (ID 1058195656). Package name: `ecc-apm`.

This is the ECC frontend and local adapter/proxy surface. It consumes backend contracts; it does not redefine them. Replit is runtime observation only; source of truth is GitHub.

## Current Standards

- Identity: ECC-APM / ecc-apm.
- Security: No tracked secrets. `.env.example` is placeholder only. Secrets remain in approved runtime stores.
- Storage/Privacy: Business originals and archives retained until evidenced disposition. No irreversible deletion or history rewrite.
- UI: Black/white/gold. No orange. Accessible high-contrast financial UI.
- Contracts: Frontend consumes backend. Source first; verified database preferred; API fallback; calculation last.
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

- `VITE_API_BASE` is read by `src/lib/api.ts`, `src/lib/config.ts`, and related clients. Default falls back to `/api`.
- In local Vite dev (`vite.config.js`), `/api` is proxied to `https://ecc-triage-node-staging.azurewebsites.net` (changeOrigin true). This is the remote staging proxy; it does not claim live runtime or database alignment.
- Local API server runs in parallel via the `dev` script for full-stack local work. No production targets or credentials are modified here.

## Recovery & Hygiene

See `docs/security/REPOSITORY_ARTIFACT_INVENTORY.md` and `docs/recovery/PR_DISPOSITION_LEDGER.md`.

Historical snapshots and `.archive/` are inventoried and retained pending evidenced disposition. Git history is not rewritten. Removed env/cache/upload files from the hygiene snapshot are not recommended for restoration.

### Rollback
Revert individual commits on this branch. Close unmerged PRs. Do not restore removed env or cache artifacts.

## Stale Material

Historical recovery scripts, old Replit authoring workflows, and superseded CI proposals are classified as non-authoritative. Canonical plan, AGENTS.md, and current merged documentation remain references. See ledger for individual PR dispositions.
