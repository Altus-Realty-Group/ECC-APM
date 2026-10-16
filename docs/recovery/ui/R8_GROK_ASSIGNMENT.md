# R8-G linked-card completion

Status: IMPLEMENTED (R8-G V1) — RETURNED FOR REVIEW

## Scope
Existing PR132 card files plus this assignment document.
Owner/tenant/lease/unit Linked.tsx and index.tsx, related recovery components, and linked-card tests.

## Completion notes
- Current main merged (canonical address and activity preserved).
- Related records render from reported IDs only; no inferred relationships.
- Owner properties are not truncated; all reported items are shown.
- Current lease is not duplicated when already present in the related list.
- Invalid or missing IDs produce no link.
- Loading, empty, error/Retry and 403 states remain access-safe.
- Late responses after session boundary do not restore details or links (shared protection preserved).

## Validation
Source inspection and merge completed. Full typecheck/build/unit/e2e to be confirmed on exact-head CI.
Fixture journeys establish source behavior only; not live-data acceptance.

## Limitations
Offline/source proof only. Codex retains acceptance and integration.
