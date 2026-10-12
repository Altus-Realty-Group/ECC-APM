# ECC PR Disposition Ledger

Status date: 2026-10-12
Campaign assignment: ECC-C1-V1
Base main SHA (verified): 6ac571ba731bb1b79437571706b83ca3546a9e55
Hygiene PR #104 head (post-refresh): e5c456e32541d78c7d74670f3ff5640ddd651ed8

This ledger covers PRs open at campaign start (approximately 27), later campaign PRs, and current open PRs (25 as of this update). Dispositions are proposals only. No merges, closures, or history rewrites performed. Age alone is not a closure reason. Review based on actual diffs where inspected.

## Closed / Superseded (preserve evidence)

| PR | Title | State | Notes | Proposed Disposition | Preservation |
|----|-------|-------|-------|----------------------|--------------|
| 82 | chore(ci): fix CI proof pack artifacts | closed | Superseded by merged #114 | Do not revive. Salvage any justified CI artifact ideas into current standards if needed. | Link to #114 |
| 70 | (obsolete Replit authoring/scheduled-write) | closed | Obsolete policy | Preserve disposition evidence. Salvage ignore/documentation ideas without reviving workflows. | Historical |

## Current Open PRs (selected inspected)

| PR | Title | Head/Base | Unique changes | Purpose | Standards gaps | Proof | Proposed disposition | Owner | Next action |
|----|-------|-----------|----------------|---------|----------------|-------|----------------------|-------|-------------|
| 104 | ECC repository recovery: hygiene... | agent/ecc-security-hygiene / main (refreshed) | .gitignore, .env.example, removals of cache/uploads, inventory | Hygiene, recovery docs | None in scope | npm ci/guardrail/build passed previously | Complete and review for merge (docs only) | Grok | Continue docs, revalidate |
| 113 | ECC frontend integrity... | codex/ecc-frontend-integrity-20261012 | Assignment scaffold only | Frontend nav integrity | Product implementation pending | None yet | Hold for Claude owner | Claude | Implement per assignment |
| 111 | docs: adopt Supabase... | (not inspected) | Docs | Architecture standard | Confirm current | - | Review for merge if aligned | - | Inspect diff |
| 110 | Define ECC property identity... | - | - | PI handoff | - | - | Audit | - | Inspect |
| 107 | docs(ECC): scope PI consumer... | - | Docs | Backend authority | - | - | Review | - | Inspect |
| 106 | ECC Control Plane connection... | - | Parked | Handoff | - | - | Hold or salvage | - | Inspect |
| 98 | Install Phase 1 ECC KPI strips... | - | Product | KPIs | May need modernization | - | Audit for unique value, propose modernization | - | Inspect diff |
| 97 | docs: install Altus Prompt Protocol V6 | - | Docs | Governance | - | - | Review | - | Inspect |
| 94-89 | Dependabot bumps (react-query, framer, zod, vite, wouter, playwright) | dependabot branches | Dependency updates | Security/updates | Out of scope for this lane | - | Propose separate review; do not bump in #104 | Dependabot | Owner decision |
| 88 | Restore Properties table rows | - | Product | Table fix | - | - | Audit | - | Inspect |
| 84 | FE fix: asset card cosmetics | - | Product | UI | Brand standards (no orange) | - | Audit | - | Inspect |
| 83 | Dashboard go-live | - | Product | Dashboard | - | - | Audit | - | Inspect |
| 81 | Day 1-2: property asset drill chain route | - | Product | Routing | - | - | Audit | - | Inspect |
| 78 | Phase 3: Tasks/Prospects... | - | Scaffold | Command surface | - | - | Audit | - | Inspect |
| 77 | chore: repo identity + preflight... | - | Identity | Preflight | - | - | Review | - | Inspect |
| 76,72,71,67,64 | Dependabot GitHub Actions / other | - | Action bumps | Updates | Out of scope | - | Separate | Dependabot | Owner |

Full enumeration of all 25+ requires per-PR diff inspection. This is a starting ledger; expand with actual head/base/unique files from get_files calls.

## Remaining Archives (from inventory)

See docs/security/REPOSITORY_ARTIFACT_INVENTORY.md. Propose retention: verify snapshots for authority, then dedicated archival PR if needed. No irreversible deletion here.

## Next

- Revalidate current references to removed paths.
- Upgrade README with current identity/security/setup.
- Classify stale docs.
- Continue bounded validation.
