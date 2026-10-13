# R2: restore related-record journeys

Goal ECC-RECOVERY-20261013. Codex owns this independent slice, based on main
1c8fd1022f46cd26ad0df748ffc053c0ed2c9542. No dependency on the unmerged UI or
operations branches; no overlap with Claude's operations files.

## Reproduction and result

Four current card pages never mount their existing Linked components. Owner
Linked additionally truncates properties to five. Tenant Linked expects property
and unit values absent from TenantCard; Unit Linked expects a tenant absent from
UnitCard. Unchecked identifiers can produce broken links. Four pages lack the
property page's access guard and render no-op Export PDF/Edit buttons.

Restore a Related tab for owner, tenant, lease and unit. Use typed current card
contracts exclusively. Show all returned owner properties and tenant leases;
include an explicitly returned current lease once even if absent from the list.
Unit exposes only property/lease; lease exposes property/unit/tenant. A null
relationship is unreported, not an invented entity. Positive safe integer IDs
produce links to existing Wouter card routes. Invalid IDs remain readable but
cannot be opened. Names fall back to the actual record's ID, never demo ID 1.

Apply existing accessGuard before any record/relationship rendering. Loading,
error, unexpected shape and denied responses have distinct messages and recovery;
a transient refresh failure labels previously loaded details. Remove no-op
Export/Edit buttons on affected cards. No new endpoints, fetches, writes,
contract fields, common CSS, packages or workflow configuration.

## Provenance and decisions

Rebuild behavior in current modules rather than importing historical components.
Current authority: src/shared/card-contracts.ts and src/lib/ecc-resolvers.ts at
the base commit. Existing per-entity Linked.tsx and index.tsx demonstrate the
unmounted functionality. Historical AltusCommand3 card sources provide recovery
context, not authoritative data fields; retain their standalone architecture in
private evidence only:

| Source in AltusCommand3 active ZIP | SHA256 |
| --- | --- |
| src/pages/card/OwnerCard.tsx | b0837aaedf0ab1aa2a5a34d625f3cb0b93678bf56dfc96536c6981a2b2795bf3 |
| src/pages/card/TenantCard.tsx | 750b45f64271aea98e811c6207b4fb99e41548ce7b03706bd40b93e0df357a2c |
| src/pages/card/LeaseCard.tsx | 9abc60820c0aa6c8e5cb110b16ef92f6d7fd13e1fe03a7ab4f1b00d828f15899 |
| src/pages/card/UnitCard.tsx | 34c4879fc2bd7d036ff66f0cf67ab5c7e8e7565bab34437daa44080265d65048 |

No historical endpoints, credentials or computed financial totals imported.
Property relationships remain blocked: current PropertyCard has no relationships.
No broader legal/files/financial tab restoration claimed by this slice.

## Verification and limits

Typecheck, 102 unit tests (six new behavioral tests), 16 dependency tests,
guardrail, build and diff whitespace check passed locally. Browser tests passed
at 1280x844 and 390x844 on the built source: four Related tabs, links beyond the
fifth property, keyboard traversal unit -> lease -> tenant, >=44px related links,
no horizontal overflow/page errors, absent fake Edit control, simulated 403 hides
record tabs/links, Retry restores allowed details. Two journeys passed with zero
retries. API responses are isolated fixtures; no persisted or live business data.

Local test runner used Chromium 153 from a scratch-only npm browser package,
explicit loopback preview bind, and a temporary Playwright executable override.
Normal Playwright CDN downloads failed. No package/lock/runtime/CI edit made to
support this environment. Existing CI must pass on the submitted head.
Replit identity, real records, deployed authorization and full-app runtime remain
unverified. Rollback: revert this slice; no database/runtime rollback.
