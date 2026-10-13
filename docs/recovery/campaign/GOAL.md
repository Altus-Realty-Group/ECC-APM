# ECC recovery goal: ECC-RECOVERY-20261013

Owner: Dion. Accountable delivery/review: Codex. Operations implementation: Claude Code.
Last source/check review: 2026-10-13 UTC.
Canonical repository: Altus-Realty-Group/ECC-APM (1058195656).
Main/base: 1c8fd1022f46cd26ad0df748ffc053c0ed2c9542.

## Outcome and authority

Recover useful missing functionality from the three Replit exports, improve accepted
files to current standards, and deliver targeted reviewable PRs. Restore usable
navigation and human journeys backed by truthful data. File counts, rendered gates
and green source checks are not full recovery.

Authorized: private-source inspection, frontend rebuilds, tests, isolated branches,
draft PRs, independent review and shared route integration. Excluded: raw private
exports/access links in public Git, invented data/contracts, backend activation or
target wiring, live writes/migrations, external paid dispatch, merge and deployment.
No new paid resources, packages or CI workflows in these product PRs.

## Current work orders

All rows share the exact main base above unless a stacked base is stated. Proof lives
in their PR descriptions and lane documentation. Two attempts per unchanged failure,
then diagnose/change approach. One lead plus one external implementation lane; no
recursive agents or new provider jobs. No continuing/background execution claimed.

| Order / owner | Permitted slice / PR | State and observed revision | Acceptance / next action |
| --- | --- | --- | --- |
| R1-PM / Codex | campaign docs, comparator / PR128 | review; d03e94f8 before this checkpoint, verify success | Read-only comparator fixture verified; goal checkpoint added here; independent review pending |
| R1-UI / Codex | property rent/hero, dashboard history, scoped component/tests / PR130 | verified local product slice; 123662d0 | 100 unit, 16 dependency, typecheck/guardrail/build; desktop and 390px browser journeys now 2/2; required verify success. Unmerged; real-data acceptance blocked |
| R1-C / Claude | operations adapters/views/tests / PR129 | foundation review; bfb9be72, verify success | Keep domains unverified and zero requests; evaluate correction stack before integration |
| R1-C V2 / Claude; independent review Codex | same operations slice / PR131; base bfb9be72 | reviewed at 89cc1a2c, verify success | Local repeat: 111 unit, 16 dependency, typecheck/guardrail/build and 6/6 desktop/390px gated-route journeys. Grouped per-lease sums/overflow and loading path repaired. No live operations activated |
| R2-LINKED / Codex | four entity Linked/index modules, scoped components/tests/docs / PR132 | source implemented and local verified; 5e03ec41 | 102 unit, 16 dependency, typecheck/guardrail/build; 2/2 browser journeys incl keyboard links and simulated 403/retry; required exact-head verify success |
| R2-SESSION / Codex PM review | five scoped operations source/test/doc files / PR133; base 89cc1a2c | verified source/query lifecycle; aebe38ca, required verify success | Shared TanStack/epoch/access guard replaces local state; 113 unit, 16 dependency, typecheck/guardrail/build and six gate browser journeys pass. No real domain activated |
| R2-SOURCE / Codex | private archive inspection; derived findings in this record | inspected subset, source-only | Removed Claude's extraction barrier for selected historical evidence via findings below. No raw source publication; full active-tree duplicate reconciliation still pending |
| CONTRACT-AUTHORITY / Codex + Dion/backend owner | source-only discovery, issue119; no target mutation | blocked | Identify the current approved backend/database/environment, contract owner and authorized read access; then verify real records, scopes and payloads before any activation |
| NAVIGATION / Codex | src/config/navigation.ts, Sidebar, App routes | pending usable domain/contract proof | Recover hierarchy by real destinations, not link all 46 planned stubs. Related journeys are restored in PR132; no claim of complete navigation |
| RUNTIME / Codex | exact Replit preview identity and human real-data journeys | blocked by contract authority and unmerged source | Prove signed-in scope, expected records, refresh, retry and desktop/390px on authorized exact runtime after approved integration; fixtures cannot substitute |

Existing PRs stay independently reviewable. PR131 is stacked on PR129; do not merge
the correction directly into main or infer deployment. PR130 and PR132 have no
overlapping product files. No worker branch was taken over or modified during review.

## Historical evidence supplied by Codex inspection

These are forensic findings from the Empire 20250815 archive; not a live schema or
current API, and not hash-equality proof against the later active export.

| Source / original SHA256 | Findings / decision |
| --- | --- |
| server/legal-routes.ts / 74c4dfd3d8b31bfb47f3e048c39a458efddf5a90f889f1bb8c6e01e872337d0f | List/detail relationship values are placeholders; detail fabricates rent, dates and linked records. Route mapping differs from the historical declared schema. Do not promote it to current contract authority. Read/write registration in this file does not establish caller authorization. |
| server/accounting-routes.ts / c1e4500d4d896fde7419ee4e81c86fa136b7db302631198278fa5bf8aee45a34 | Ledger synthesizes recurring charges from lease terms and mixes them with recorded payments, uses floating money/zero fallbacks, and contains malformed SQL in the original archive. Reject its financial semantics and route as activation authority; require real posted charges/payments and explicit currency units. |
| shared/schema.ts / 1e0e1a0c6e5a334d8d098b0b89f048dd06508147eb1fdfa8cd7886b7bf7a130d | Contains historical legal/staging/payment declarations; does not establish deployed schema, current access, posted-charge source, or a work-order contract. Legal shape differs from the legal route's assumptions. Do not apply migrations from archive contents. |
| server/routes.ts / 138192fe8bb43a1454bcfa0b585a28efb361fd2b76cafae596b93bf4b5cc70f3 | Selected legal sections inspected: a duplicate create route simulates success without persistence; staged-edit SQL column names are constructed from body keys; archive also exposes diagnostic routes. Reject wholesale restoration. Other source sections not fully reviewed. |
| client/src/pages/LegalAdvancedOpsPage.tsx / fe805f2b20554f4a069d11513d6d2ec4fcaacb05759cb67c048a533425c2a027 | Selected fetch/mutation section inspected: errors become empty lists; escalation/document actions assume endpoints and treat JSON as success without response validation. Keep actions disabled pending verified provider, legal rules, authorization and persistent outcomes. Full module review remains pending. |

Private references remain available to Codex. Claude's original Dropbox .ts extraction
block was real; these reviewed findings resolve selected comparison questions without
claiming Claude read those files or that all exports have been audited.

## Acceptance ledger and remaining review

- Provenanced migration/rebuild with modern files: bounded UI and operations slices
  implemented/tested; full feature inventory/duplicate reconciliation remains open.
- Financial truth: no generated payments imported; no generated recurring ledger
  charges accepted. Per-lease overflow tests pass. Real balances remain unverified.
- Usable navigation/cards: Related tabs and real-ID navigation pass local fixture
  journeys. Whole historical menu and all legal/files/financial tabs not restored.
- Access/session: current card guards reused; simulated denied recovery passes.
  Codex repaired operations component-local state in PR133 using the existing query
  provider, epoch keys and shared denial purge. QueryObserver/client regressions prove
  observed prior-session row removal, cross-domain/portfolio purge and rejection of
  late previous-session responses. These are query lifecycle fixtures; populated
  mounted browser journeys against actual deployed authentication remain required.
  Current production domains stay unverified and make zero network requests.
- Runtime/business acceptance: blocked. The source startup intentionally returns
  BACKEND_NOT_CONNECTED for unbound API/BFF requests. A useful unavailable message
  does not restore missing records. Issue119 remains open, owning backend identity
  and live data source unverified. No source build is a deployed-authentication pass.
- Nothing merged, deployed or owner-accepted. Goal remains OPEN.

## Cost and closure

Existing session tools/local runtime and existing bounded repository checks only.
No paid API/provider/job admitted and no new subscriptions/cloud resource/CI fan-out.
Marginal session and Actions charges are unknown; no monetary cap or zero-cost claim.
No outstanding external job reservation was created by Codex; Claude subscription
execution cost is not measured here. Retry ceiling is procedural, not invoice control.

Next dependency requiring owner evidence: canonical current backend/database and
environment for ECC records, plus its responsible owner/authorized read path.
Codex retains acceptance and source review; do not ask the owner to re-upload the
archives or redo source comparison already available here.

## Integration closure checkpoint

Local integration rehearsal, not a remote merge or deployment:
`1f4b91c003d03961c51c3ebf9ce6e7b369bcd663`, combining exact product heads
PR130 `123662d0`, PR132 `5e03ec41`, PR133 `aebe38ca` (includes PR131/129),
and prior governance checkpoint `f7dcba33`, on the main base. No merge conflicts.
Typecheck, 123 unit tests (15 files), 16 dependency checks, guardrail/build and
whitespace check passed. Ten focused Playwright journeys passed with zero retries
on the combined built product: rent/history, four related cards/denied recovery,
and three unavailable operations domains at desktop/390px. Chromium 153 with
scratch-only executable and loopback overrides; fixtures only, no live writes.
Build retains its pre-existing large-chunk warning; no performance pass inferred.

All product heads above passed the existing required GitHub verify. Analyze and
proof-pack were skipped; skipped checks are not passes. This documentation-only
receipt needs its own current-head check. Proposed integration order is PR131 into
PR129, PR133 into that operations stack, then independent source PRs after review
and explicit merge authority. No branch ref/main/runtime was changed by rehearsal.

Whole-goal verdict: OPEN, real-data/runtime acceptance blocked. Do not close issue119,
restore all planned navigation links, or call unavailable operations restored.
Next necessary owner evidence is the intended current ECC backend/database identity,
environment and owner-approved read path. Codex can use the retained private source
for further comparisons without requesting another source upload. Claude's completed
V2 return is reviewed; no new Claude/background job was dispatched by this checkpoint.

## Backend discovery update - 2026-10-13

Dion identified this same ECC-APM repository as the next source. It contains both
Express and Azure Function implementations; no separate backend repository is
required just to continue source tracing. Read-only Supabase discovery located
an existing ECC-named project and verified portfolio tables contain records.
Live metadata also confirms legal/work-order/charge/payment tables exist; prior
source-only absence was never proof of database absence. Detailed counts, schema
and security findings remain in the private owner report, not public source.

The remaining prerequisite is the authenticated runtime binding and authoritative
read contract/source generation, not asking Dion again for the source repository.
Unit label and lease-rent wire names differ from current frontend schemas; joined
read errors/zero defaults and mixed numeric/UUID identity need scoped repairs.
Operation generations/import readiness and current backend actor scopes must be
verified before activating records. No live data/schema or target configuration
changed during discovery. Shared platform documents remain orientation only.
