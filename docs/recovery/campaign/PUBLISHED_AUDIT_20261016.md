# ECC published audit - 2026-10-16

Published target: https://ecc-apm-v-10.replit.app . Source baseline main bfe9540b7c0058e7368838117679b17ccc04e54a. Codex inspected the rendered desktop app (1363x936) and current source. This report is an audit, not release acceptance. External Claude/Grok audit prompts were presented to Dion; delivery/execution remain unconfirmed.

## Runtime alignment

Not proven. Published /ops/operations renders Page not found, while source main App.tsx registers the OperationsRecoveryPage. Published errors reference /src/...tsx and Vite dependency paths. These observations do not identify the deployed commit or authorize environment changes. No live operational writes were attempted.

## Observed published routes

| Route | Observed outcome |
| --- | --- |
| /portfolio/properties | Loading settles to Properties could not be loaded with Retry. Header/summary still show 0 loaded / Markets:0 / 0 visible rows. |
| /portfolio/units | Loading settles to Units could not be loaded with Retry. Zero result summaries remain visible. |
| /portfolio/leases | Shows 0 leases, active, ended and $0 MRR; table says endpoint returned successfully with zero entries. Source trace finds invalid relative fetch URLs and ignored errors. |
| /portfolio/tenants | Error Loading Data with HttpError: HTTP503 BACKEND_NOT_CONNECTED. Technical error leaks into operator copy; 0 results footer remains. |
| /portfolio/owners | Shows two sample company rows and permits CSV export. Source confirms mounted Owners.tsx uses a constant MOCK array, no API read. Export was not invoked. |
| /reports/create | Heading and one instruction sentence; no creation controls. |
| /reports/saved | Heading and one instruction sentence; no saved-record reader. |
| /reports/templates | Heading and one instruction sentence; no template listing. |
| /data | Claims Live Azure Functions integration; then Error:503 plus No rows. Exposes Owners Search, Transfer Context and an enabled initiate-transfer control. No write control was invoked. |
| /systems/integrations | Global Contract violation / process is not defined. Shell disappears. Browser logs also report missing queryFn for /api/health/sync and /api/config/integrations. |
| /dashboard | Loading settles to portfolio summary could not be loaded with Retry. |
| /ops/operations | Page not found, despite registered route on current source main. |

## Source-confirmed defects and product gaps

1. Navigation: only 11 actual linked destinations across five groups; 46 known destinations deliberately never rendered. The mounted Operations page is also absent from navigation. The count is from executing the navigation module, not counting source lines. Accounting, legal, communication, maintenance and investor pages sampled are literal Stub components; they are not finished workflows merely hidden by the menu.
2. Mounted Owners.tsx contains hardcoded operating records. App imports this capitalized implementation instead of the separate real-hook lowercase owners/index.tsx. Simply retargeting requires review: the alternate page also needs access/error-state assessment.
3. Mounted Leases.tsx calls useCollection with leases/properties/tenants relative strings. useCollection fetches those strings and sets data=[] on error. The page ignores error/loading and derives zero count/MRR. The lowercase alternate has a cents/dollars conflation, so it must not be adopted blindly.
4. Tenant status defaults to Current when absent. Access/lifecycle parity with Properties/Units needs review.
5. All three linked Reports pages are heading-only placeholders. Owner Financials/Lease Financials say Placeholder; tenant Files says No files without fetching records.
6. Dashboard is four KPIs plus occupancy history. Dormant richer widgets contain broken routes/no-op actions and cannot safely be relinked wholesale.
7. DataHub's transfer surface contradicts the intended unavailable write posture and needs explicit read/write separation. Its claim of a live integration is unproven.
8. IntegrationsHealthPage uses browser-undefined process and lacks query functions for two queries. Its crash reaches the global boundary.
9. Backend source release blocker: server/routes/rpc.ts forwards arbitrary POST functionName to a privileged client, while portfolio/card reads also lack a verified actor. Connecting the backend before resolving these paths is not authorized by a UI fix.

## PR146 independent review

Head6f30c3bc93829179d44ecbd30a742c0a3ab0ed91 defaults to deny before DB, but is not functional identity integration. Review corrections: DataHub always sends order=id.desc, which planRead rejects; lease selected fields also disagree. Malformed non-array DB results become 200 empty rows. The500-row cap reports returned row length as total cardinality with no truncation/paging signal. These need caller-shaped and malformed/truncation tests before acceptance. No actual owner/property grant mapping is inferred from Control Plane identity.

## Prioritized implementation slices

- Codex: current source/runtime alignment; truthful mounted owner/lease reads; Integrations crash/query repair; DataHub write/read separation; approved backend connection only after authorization containment.
- Claude: correct PR146 caller/malformed/completeness issues; contain arbitrary RPC dispatch and establish actual scoped authorization; authoritative work-order read vertical slice. No new login.
- Grok: portfolio null/zero/activity fixes; complete card tab and dashboard action audit; operator error states and mobile/keyboard journey proof. Keep existing R9 work separate from unrelated fixes.
- Separate feature slices: report create/persist/list/reopen/export, recorded lease ledger, legal cases/documents, communications and investor reporting. Each requires actual accepted record contracts. No stub or disabled label counts as implemented workflow.

## Navigation proposal in this branch

Expose the existing Operations route and show the46 known unavailable destinations without links or stub routes. The proposal leaves12 actual links, adds no backend/data operations, and makes the longer rail scroll independently. This is visibility only, not restoration of46 workflows. Browser proof is pending; do not merge it as full product completion.

## Coverage limits

Desktop visible navigation routes were inspected; card detail journeys could not be established from genuine records because portfolio reads fail and Owners is synthetic. No operational mutations, vendor sends, DB access, live auth proof, mobile resize, touch hardware or other-browser proof performed in this audit. Claude/Grok results remain pending. Private-preview browser access was blocked on redirect to a separate Replit account origin; the published target was accessible and audited independently.
