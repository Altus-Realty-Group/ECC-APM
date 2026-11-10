# ECC launch and native Legal Operations work orders

Date: 2026-11-10. Owner: current ECC PM/Codex. Sponsor: Dion.
Existing campaign: ECC issue171. Legal domain: U08 / issue197.
Slice labels below are delivery slices, not replacements for existing capability IDs.

## Goal and ownership

Deliver live core property-management records in ECC and build ECC-native legal
operations: command dashboard, matter/party asset cards, evidence, court/task
workflow, verified judgment accounting and controlled internal attorney packets.
DoorLoop owns its upstream tenancy/accounting facts, not litigation status,
court orders, legal strategy, case workflow or judgment accounting.

The supplied legal files were actually read. They are unverified source snapshots,
not a court-verified judgment portfolio. Do not publish their case captions, debtor
names, row contents, identity documents, private links or folder paths to GitHub.

Exact current ECC main: `8ccab7082b9dbf81f08209c95675f9f9c728a47d`.
Ingestion prepared source: PR102 at
`570ee3220f1786deaeb9ec255560ec08d5c732f6`; verify current integration base.
Existing frontend PR210 and backend PR102 remain separate work to review; neither
an issue assignment nor this plan activates an external worker.

## Target PR queue

| Slice / issue | Owner | Target outcome | Dependencies |
| --- | --- | --- | --- |
| [C1](https://github.com/Altus-Realty-Group/doorloop-sync-backend/issues/103) | Codex | admit core resources and prove bounded initial capture | Independent preparation |
| [C2](https://github.com/Altus-Realty-Group/doorloop-sync-backend/issues/104) | Codex | promote captured core records with identity and relationship reconciliation | C1 |
| [C3](https://github.com/Altus-Realty-Group/doorloop-sync-backend/issues/105) | Codex | reconcile financial projections and source-backed dashboard measures | C2 |
| [A1](https://github.com/Altus-Realty-Group/ECC-APM/issues/211) | Claude Code | protected Supabase read contracts and current-session authorization | Independent preparation |
| [U1](https://github.com/Altus-Realty-Group/ECC-APM/issues/212) | Grok | connect company workspace, portfolio cards and dashboard to accepted reads | A1, C2, C3 |
| [REL](https://github.com/Altus-Realty-Group/ECC-APM/issues/213) | Codex | combined release, refresh and recovery acceptance | C1, C2, C3, A1, U1 |
| [L1](https://github.com/Altus-Realty-Group/ECC-APM/issues/214) | Claude Code | native case ownership, schema reuse and versioned contracts | Independent preparation |
| [L2](https://github.com/Altus-Realty-Group/ECC-APM/issues/215) | Codex | private workbook preview and idempotent matter/requirement intake | L1 |
| [L3](https://github.com/Altus-Realty-Group/ECC-APM/issues/216) | Grok | command dashboard, case list and linked legal asset cards | L1 |
| [L4](https://github.com/Altus-Realty-Group/ECC-APM/issues/217) | Codex | case-first Dropbox evidence manifest and central missing-record queue | L1, L2 |
| [L5](https://github.com/Altus-Realty-Group/ECC-APM/issues/218) | Claude Code | judgment award ledger, payment reversals and collection eligibility | L1, L2 |
| [L6](https://github.com/Altus-Realty-Group/ECC-APM/issues/219) | Grok | evidence explorer, court timeline and accountable case workflows | L3, L4, L5 |
| [L7](https://github.com/Altus-Realty-Group/ECC-APM/issues/220) | Claude Code | controlled internal attorney packet and evidence snapshot export | L4, L5 |
| [L8](https://github.com/Altus-Realty-Group/ECC-APM/issues/221) | Codex | role-based end-to-end acceptance and controlled adoption | L1, L2, L3, L4, L5, L6, L7, A1 |

Each issue records scope, acceptance and execution limits. Open implementation
PRs only with a real scoped diff. Do not create14empty draft PRs. Preserve one
branch owner and separate independently reviewable financial families.

## Launch order and parallel work

Codex prepares bounded first capture and core promotion. Claude can prepare
protected reads and the native legal model independently of source-data arrival.
Grok can build fixture-backed legal surfaces against reviewed versioned contracts
without pretending they are live or enabling unaccepted endpoints.
Final real binding requires accepted data and current-session authorization.

For legal, L1 model/contract and L2 private preview precede committed intake.
L3 dashboard/card source can proceed with explicit synthetic contract fixtures;
L4 provider evidence indexing and L5 judgment accounting then supply the remaining
workflow and packet views. L8 proves the combined real actor journeys.

## Verified legal source and schema findings

Attached source filenames:
- Altus_Judgment_Collections_Master_Register_2026-11-10_v3.xlsx
- Altus_Tramel_Missing_Judgment_Documents_2026-11-10.xlsx
- ECC_APM_v1_Legal_Case_and_Judgment_Collections_Handoff_2026-11-10.md

Actual read:27matter rows,81requirements,27folder summaries and18source-note
key/value rows (notes have no header). The master contains an exact second copy
of the standalone81requirements. Both provenance references must survive, while
only81logical requirements are proposed. All27judgments unverified; all81money
cells and all27docket/court/creditor sets unknown. No amount becomes zero or an
award because a spreadsheet row exists.

Historical workbook file-count totals207; later handoff inventory implies206.
Both are historical claims. Folder summaries lack per-file IDs/versions/hashes;
they are not207document records or a current canonical count.

Read-only AltusCommandCenter census on2026-11-10:
- public.legal_cases, legal_case_events, case_history, case_tags and
  legal_case_import_staging each contain0rows.
- A distinct public.legal_cases_import_staging contains216legacy rows. Preserve
  these and reconcile their lineage; do not equate them with the new27matters.
- All six tables have RLS enabled but no policies. Existing RLS flags alone do
  not establish a usable or correct actor authorization contract.
- legal_cases links UUID fields to core entity id_uuid, while the second staging
  model uses integer resolved IDs. Use reviewed explicit crosswalks.
- Two case_type checks disagree: the tighter one excludes collections and
  eviction_and_damages. A global case_number unique constraint lacks jurisdiction.
  These must be reconciled in a reviewed migration; never work around by coercing
  every matter into other or editing applied migration history.
- files/file_assets/files_new/tasks/tasks_new/task_events/audit_events/audit_logs
  exist as reuse candidates; their row grains, callers and access still need review.
- Current ECC legal route is an unverified-contract-gated recovery view; card
  legal panels are unavailable. No accepted legal API is mounted by source alone.

These are aggregate schema/data observations, not permission to alter production.

## Native model and source placement decisions

ECC is the domain owner; Supabase contains persistence and execution. The
DoorLoop collector repository must not become the legal workflow engine.
ECC-APM remains the frontend/code entry point. Its current AGENTS.md identifies
a frontend layer and protects backend logic/wiring. Claude A1/L1 must first
record a bounded authoring/runtime ownership ADR, inspect retained source and
propose the exact native Supabase legal-source location before backend edits.
This plan does not silently reactivate historical server/ecc-functions handlers,
move product ownership to Control Plane or create a new repository/service.
A contract/schema proposal may proceed without production mutation.

Reuse legal_cases as the candidate matter root only after fixing identity/scope
constraints. Add independent party participation, specific award/obligation,
financial entry, evidence review, requirements or packet snapshot entities only
where the verified existing structures cannot serve their grain/lifecycle.
Do not create a new table because a UI needs a card or tab. Preserve audits and
existing legacy staging history, and list retirements only after consumer proof.

## Agent dispatch and costs

Claude Code: A1,L1,L5,L7; AWAITING_MANUAL_HANDOFF / NOT_CONFIRMED.
Grok: U1,L3,L6; AWAITING_MANUAL_HANDOFF / NOT_CONFIRMED.
Codex: C1,C2,C3,REL,L2,L4,L8; current-chat PM/integration owner.
A PR comment is not a dispatch receipt. No Claude watch or connected external
execution channel is evidenced. Full prompts are supplied to Dion in the chat.
No new paid jobs, infrastructure, subscriptions or API entitlements are assumed.
Use isolated local tests first; preserve required CI without duplicate fan-out.

## Acceptance and approval boundary

Source/tests/private local preview and reviewable PRs are authorized by Dion's
November10request. No production import, migration, activation, deployment,
permission grant, external legal contact or packet send is authorized by this
planning request. Prepare concrete rollout packages and preserve earlier holds.
No automatic statutory deadlines, interest rates, legal conclusions, filings,
garnishments or collection demands. Court/creditor/accounting evidence and
appropriate internal/counsel review drive the legal states.

All UI follows ECC black/white/gold and its shared shell. A persisted authorized
case journey, role-scoped document retrieval and a subsequent real source refresh
are acceptance; fixture appearance, row counts and function health are not.
