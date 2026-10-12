# Empire Command Center (ECC) Frontend

Replit_Front_End_ECC is the ECC frontend ownership layer for Altus. It contains the ECC user interface, local adapter and proxy surfaces, and frontend integration patterns used to consume backend contracts without redefining them.

## Current Standards

- Identity: Altus Realty Group ECC frontend.
- Security: No tracked secrets or environment values. Use .env.example placeholders only. Secrets in approved runtime stores.
- Storage/Privacy: No business data in Git. Archives inventoried for disposition.
- UI: Black/white/gold brand. No orange. Accessible, high-contrast financial UI.
- Contracts: Frontend consumes backend; no invention of contracts.
- Workflow: Narrow PRs, evidence-based, no direct main authoring. Replit is runtime observation only.
- Cost: Metered Actions; disclose triggers and bounds.

## Setup

1. Copy .env.example to .env.local (ignored).
2. Set VITE_API_BASE to the approved API origin.
3. npm ci
4. npm run guardrail && npm run build

## Recovery & Hygiene

See docs/security/REPOSITORY_ARTIFACT_INVENTORY.md and docs/recovery/PR_DISPOSITION_LEDGER.md.

Historical snapshots in snapshots/ and .archive/ are inventoried. Do not treat as current source of truth. Git history is not rewritten.

### Rollback
Close unmerged PRs. Revert specific commits if merged. Do not restore removed env or cache files.

## Stale Material Classification

- Recovery scripts and .archive/ : historical, classify as non-authoritative.
- Old CI proof or Replit authoring workflows: superseded; see ledger.
- Canonical plan and AGENTS.md remain current references.

For full disposition of open PRs, see the ledger.
