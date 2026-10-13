# ECC-APM recovery campaign R1
Owner: Dion. PM, navigation and recovered UI owner: Codex. Authorized 2026-10-13.
Canonical repository: Altus-Realty-Group/ECC-APM (1058195656).
Seed base: 1c8fd1022f46cd26ad0df748ffc053c0ed2c9542.

## Goal and delivery
Recover useful functionality from EmpireCommandCenter1, EstateCommand2 and AltusCommand3 into current ECC-APM. Improve every accepted file to current architecture, data integrity, security, accessibility and validation standards. Exported code is recovery evidence, not executable authority. No blanket replacement of the repository or restoration of old secrets/proxies.

All three builds now expose source in Dropbox /Altus Corporation/Software/ECC Reload. Selected source-area counts: Empire client 554, src 19, server 40, api 12; Estate src 285/server 49; Altus src 136. These are inventories, not working-feature counts. Source-only review confirms richer cards, legal screens, work orders, ledger controls and dashboard components. Full active-tree byte/semantic comparison remains part of implementation intake.

## Independent lanes
| Owner | Assignment | Exclusive product ownership | Deliverable |
|---|---|---|---|
| Codex | R1-PM | src/config/navigation.ts; src/components/Sidebar.tsx; src/App.tsx route registration; recovery tooling/docs | Provenance/standards gates, route and navigation reconciliation, independent acceptance |
| Claude Code | R1-C | new src/features/recovery/operations/**; src/lib/recovery/**; docs/recovery/operations/**; tests/unit/recovery-operations* | Authoritative frontend adapter contracts and repaired legal/work-order/ledger candidates |
| Codex (reassigned by Dion 2026-10-13) | R1-G | current src/pages/card/**; src/features/dashboard/**; new src/components/recovery/**; docs/recovery/ui/**; tests/unit/recovery-ui* and recovery-linked-cards*; e2e/recovery-ui* and recovery-linked-cards* | Repaired cards and dashboard components with usable mobile/desktop behavior |

Shared App.tsx, navigation, contracts under src/contracts, queryClient/session boundaries, existing common styles, lockfiles, workflows and package files are PM-owned. Workers submit exact requested shared edits in their own docs; PM integrates after review. Do not independently edit another lane. Existing backend files are inspection-only in this frontend ownership repository; do not invent backend contracts or mutate another repo.

## Implementation sequence
1. Intake: compare active exports with current tree/history and semantic equivalents. Read code before selecting; choose one implementation per feature. Record source build, relative path, revision/hash, duplicate resolution and limitations.
2. Parallel source work: Claude traces authoritative fields, operations and transaction records; Codex ports useful cards/dashboard UI; Codex reconstructs route/section inventory and implements read-only comparison/provenance gates.
3. Contract integration: PM applies verified shared contract and route edits. New data paths may use only verified current authoritative endpoints. Unverified paths remain explicit dependencies, never successful mock behavior.
4. Navigation acceptance: restore the required hierarchy using real usable destinations. Planned features remain in the recovery ledger until implemented. Entity links use actual record identity, never fixed demo ID 1.
5. After first bounded slices pass, refresh the same lanes against accepted main and complete legal, work orders, ledger and dashboard slices. Freeze a reviewable slice; do not indefinitely expand one PR.
6. Validate real browser journeys and runtime/API evidence after separately authorized synchronization. Publication and live database changes need separately scoped approval.

## Non-negotiable incoming-file standard
- Use current React/Wouter/TanStack architecture; avoid a second router, duplicate shell or legacy dependency replacement.
- Database first, authoritative API fallback, calculation last. Preserve null/zero distinction, cents/currency/percentage units, source timestamps and denied-cache/session isolation.
- Ledger source must be real charges/payments. AltusCommand3 TenantLedger generates simulated payments for active leases: reject this behavior. Missing payments are not zero or proof of rent collected.
- AI client currently supports a public VITE function-key variable: reject public credential transport. AI rollout is later, after server-owned credentials, authorization, budgets and verified contracts.
- Navigation exports contain dead destinations and fixed card IDs. Recover information architecture, not broken links.
- No mock operational data, unsupported predictive claims, synthetic successful operations, stale dates presented as fresh or hardcoded business totals.
- Black/white/gold; no orange. Green/red only meaningful financial/status use; gold is target/accent, not body text. >=44px targets, keyboard/focus support, no page overflow at 390px, accessible tables/errors.
- Remove unused imports/dead branches, developer copy, duplicate implementations and unsafe fallbacks in every touched file. Keep effective current safeguards.
- No old environment files, secrets, generated bundles, caches, repair scripts or source archives committed.
- Changes are scoped, reversible and supported by meaningful tests. No new CI triggers/jobs/matrices; existing required checks remain.

## Source evidence already inspected
AltusCommand3: src/lib/navigationTree.ts; src/routes/AppRoutes.tsx; src/pages/card/{Property,Unit,Lease,Tenant,Owner}Card.tsx; src/pages/accounting/TenantLedger.tsx; src/pages/ai/*; src/utils/ai-client.ts.
Empire active client/src/pages: EnhancedLegalCasesPage.tsx (51,590 bytes), LegalCaseDetail.tsx (20,074), LedgerControlPage.tsx (26,472), WorkOrdersPage.tsx (23,980).
Estate active: src/App.tsx (5,823), src/components/Sidebar.tsx (12,647), entity cards, adapters and server code.
Archive inventories are supplementary; active exports can be newer. Reconcile them, do not assume chronology from numbered folder names.

## Proof and handoff
Each ported/rebuilt feature must have an entry under its lane provenance ledger: source, chosen target, contract reference, keep/port/rebuild/reject decision, defects repaired, tests and unresolved backend needs. Do not mark a candidate functional from file size or presence.
Mandatory source checks: npm run typecheck, npm test, npm run test:dependencies, npm run build and existing guardrails; targeted browser proof at desktop and mobile for changed UI. Run tests locally before triggering existing bounded CI once on a reviewable head.
Return exact branch/base/head, PR, changed files, checks/results, current contract evidence, remaining ledger, next action and lane integrity.
Codex retains independent review, shared-file integration and acceptance. No merges or publishing are authorized by this assignment.
Goal ECC-RECOVERY-20261013 is owned in the initiating chat. Claude's V2 return was discovered as PR131, stacked on PR129; actual branch/diff/CI and local proof are reviewed by Codex rather than treating dispatch or acknowledgment as completion. No direct Claude dispatch/status connector is available in this session; future assignment delivery must be verified, not inferred from a PR document. Codex performs accessible independent work directly. Grok's source-access blocker is superseded by Dion's explicit reassignment to Codex. See GOAL.md for current acceptance, exact revisions, dependencies and work orders.

## Rollback
Revert individual source PRs; do not migrate or delete original export files. Tooling is manual and read-only. No database or runtime change is bundled with this campaign seed.
