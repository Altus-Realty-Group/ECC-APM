# ECC-APM cleanup execution and backend discovery

Reviewed 2026-10-12; owner Dion; delivery lead ChatGPT in this ECC campaign. Code authority is Altus-Realty-Group/ECC-APM, ID 1058195656. Current baseline after dependency recovery: 417f27aea8ce052b36ab9cd4c89a52e739c43fef. This is an execution checkpoint, not a new plan or production acceptance.

## Goal contract

Clean and modernize all existing PRs and source hygiene while preserving useful work/history; restore trustworthy frontend navigation/data/error states and maintain the approved restart/development sequence. Authorization: Dion's explicit cleanup/proceed directions, including old PRs and workflow upgrades. No new paid services, cloud resources or API charges. Session/Actions invoice cost is not metered here and is unknown; added validation is bounded in existing jobs. Deployment, schema, credentials, API targets, paid providers and financial authority are separate scopes. Claude owns retained #113 frontend; Grok owns retained #104 hygiene/README/complete disposition ledger; lead owns CI, dependency consolidation, source discovery and PR review.

## Delivered in this campaign

- #112 restart/development sequence; #114 executable CI proof repair; #115 canonical identity; #116 shell-input safety; #117 immutable supported validation Actions/time bounds; #111 Supabase architecture standard and source-only record; #110 consolidated governed PI handoff; #118 tested dependency/npm setup recovery.
- Closed obsolete/superseded #70/#77/#78/#81/#82/#83/#84/#88/#97/#98/#106/#107; retained branches/discussions preserve source evidence and salvage requirements.
- #118 replaces individual npm proposals #71/#89/#90/#91/#92/#93/#94. Current package registry audit is seven findings (one high, six moderate), not a clearance; #119 records source consumers and owner/compatibility discovery.
- Remaining workflow proposals #64/#72/#76 are consolidated on refreshed #76; #67 CodeQL v4 intent is already delivered by #117. Exact-head CI/review precedes final disposition.
- #104 current reviewed head bb8f1491dacff073e2af88e9bc6447f4021ddf9a: Verify/proof/CodeQL passed after promotion, documentation/individual ledger corrections outstanding.
- #113 current reviewed head 198996d08bcd1b85e084dd5c55f2b051052f842b: build/guardrail/CodeQL passed, full proof failed with 268 TypeScript errors; malformed-data, denied-cache, tests and accessibility review corrections outstanding. No compiler suppression or runtime pass is accepted.

External V1 reports supplied by Dion establish returned work. V2 instructions were presented but delivery is unconfirmed; PR comments do not activate workers. Updated V3 handoffs must be manually delivered because dependencies/current main and disposition changed. Do not claim either agent ACTIVE from this record. Do not edit their retained branches concurrently without reconciling ownership.

## Source route-to-owner map (not deployed ownership)

| Frontend surface | Source caller/route | Candidate handler/data path | Unresolved acceptance |
| --- | --- | --- | --- |
| Portfolio collections | src/lib/ecc-resolvers.ts -> /api/portfolio/{properties,units,leases,tenants,owners} | server/index.ts collection registrations; source contracts and SQL/Supabase paths | Determine active deployment; prove response envelope, identity, viewer authorization and real record reconciliation. |
| Asset cards | ecc-resolvers card hooks -> /api/rpc/get_{property,unit,lease,tenant,owner}_card | server/routes/rpc.ts mounted under /api/rpc; client Zod card contract | Prove actual RPC/handler/schema owner and nullable field contract; do not accept RPC404 as false empty success. |
| Generic entities | src/lib/ecc-api.ts Entities -> /api/entities/{type} | server/routes/entities.ts, plus separate Python ecc-functions/entities-* routes | Both source families exist; this is not evidence of which is serving current UI. |
| Owner transfer | Owners API/BFF wrappers and owner-transfer UI | server/routes/ownerTransfer.ts, ownerTransferService.ts, index.ts endpoints, Python owner-transfer functions | Establish authorized owner; prove server identity/permission/idempotency/audit; no actor-from-body authorization or inferred central-admin grants. |
| Integration health | src/lib/useIntegrations.ts and config route | server/routes/config.ts / index.ts config registration | Config presence is not integration health or PI consumer proof; no paid provider request for ordinary read. |

Developer launcher starts WEB and local API; server source listens on API_PORT/default8787. Vite dev /api proxy instead targets ecc-triage-node-staging.azurewebsites.net, sets secure:false and may synthesize handler/content-type headers. Those frontend-added headers cannot prove which backend implementation answered. BFF mounting is disabled by a source constant. Current AGENTS declares frontend ownership while server and ecc-functions coexist.

The deployment workflow targets empirecommandcenter-altus-staging with Python3.11 and ecc-functions package; these source names are not proof of active Azure ownership or a deployment request. Eleven source Python HTTP trigger records include authLevel=anonymous, including owner-transfer commands; per-function and inherited access controls still require a reviewed owner audit before any live reachability/security conclusion.

## Runtime discovery evidence and limits

A single bounded unauthenticated GET to the source-declared Node staging host /api/health on 2026-10-12 returned HTTP404. No portfolio records, secrets or privileged commands were requested. This neither proves the host is the active runtime nor identifies its repository/SHA. Local server/index health only describes configuration presence; it does not establish deployed source identity. Do not redirect APIs or revive a legacy backend to make this probe pass.

No actual ECC frontend runtime URL, build provenance, signed-in role, expected real records or current database project/schema was verified. Human browser/data acceptance is READINESS UNVERIFIED. Regression fixtures/SSR tests establish source compatibility only. Next runtime action requires the actual authorized ECC preview/published URL, then exact source/process identity and list -> property -> unit -> lease -> tenant/owner journeys, with authoritative data, persistence/reload and denied/failed recovery. No synthetic operational records.

## Active defects and next actions

| ID | Evidence/severity | Owner/current action | Closure evidence |
| --- | --- | --- | --- |
| ECC-FE-01 | #113 compiler failure and malformed payload success; high | Claude retained #113, refreshed V3 correction | Current-head compiler/build/configured tests and parser regressions; no empty/zero substitution for malformed data. |
| ECC-FE-02 | Cached dashboard/card/collection data can survive denied refresh; high source finding | Claude #113 | Clear/hide sensitive rows, details, selections and async responses after denial/logout/account change; isolated negative cases plus actual authorized runtime retest. |
| ECC-DOC-01 | #104 README identity/setup and grouped/incomplete disposition; medium | Grok #104 V3 | Actual Node/npm commands/source config readers; every original/campaign PR individual exact-head/base/diff/owner/disposition row, final live enumeration. |
| ECC-BE-01 | Synthetic operational records, privilege/debug SQL gaps and conflicting source owners; high source findings | Lead #119 discovery, then verified backend owner | Real handler/data identity, server authorization and no fabricated business records; separately reviewed owning backend changes. |
| ECC-DEP-01 | Seven remaining ORM/export package advisories | Lead #119/confirmed backend owner | Actual schema/query/migration/tool/export compatibility proof before major change or retirement; registry results rechecked. |
| ECC-RT-01 | Source host health404; actual frontend runtime/build/data unavailable | Dion supplies authorized ECC URL; lead verifies identity and human journeys | Current runtime SHA/role/data and critical workflow coverage; source/CI success alone cannot close. |

Reuse the master restart plan for D1 daily operating pilot and D2 one persistent high-value workflow once foundation acceptance is met. Do not substitute disabled task/prospect scaffolds or activate central auth/paid PI as a cleanup side effect. Detailed all-PR inventory remains Grok's existing ledger in #104; this record does not replace it. Rollback: remove this documentation checkpoint without altering application/data behavior.
