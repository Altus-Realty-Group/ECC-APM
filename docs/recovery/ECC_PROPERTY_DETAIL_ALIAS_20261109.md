# Legacy property-detail navigation correction

Observed: 2026-11-09. Existing campaign: M01 / issue #198.
Base: `8ccab7082b9dbf81f08209c95675f9f9c728a47d`.

## Delivered source behavior

`/portfolio/properties/:id` previously showed an ID and an asset-card placeholder.
It now replaces that history entry with `/card/property/:id`, preserving the
original numeric ID and query string. Browser Back therefore does not revisit the
legacy redirect. The canonical card retains its existing resolver, access-denied,
loading, error and Back-to-properties behavior.

Invalid legacy IDs (non-decimal, nonpositive or unsafe integers) render an error
and a touch-sized Back-to-properties link without mounting the card reader.
No backend contract, API target, authorization, workflow or dependency changes.
Rollback: revert this isolated frontend change.

## Verification

- Actual Wouter memory routing proves ID/query preservation and replacement of
  only the legacy history entry; direct bookmarks and invalid links are covered.
- Full unit suite: 56 files, 383 passed, zero failed/skipped.
- TypeScript and guardrail/production build passed. The existing large-bundle
  advisory remains. After a test-only renderer cleanup, all three added tests
  passed again without renderer warnings.
- Chromium launch failed before opening a page: process-singleton socket creation
  is denied by this environment. No fresh browser, layout or live acceptance is
  claimed. Browser Back is covered by router history, not a fresh browser run.

## Related recovery state, kept separate from this frontend fix

Direct read-only evidence from AltusCommandCenter
`ssexobxvtuxwnblwplzh` on 2026-11-09:

- Installed capture migrations: `20261105175010`, `20261105213736`.
- Capture disabled; account unverified; zero reserved provider attempts and zero
  custody pages. Only lease-payments has a verified resource contract.
- Stored credential probe: 2026-11-05 23:07:30 UTC, false / MISSING_CREDENTIAL.
  This is historical runtime evidence, not a fresh secret-presence probe.
- Scheduler function has no Authorization header. Edge capture v1 remains ACTIVE
  with gateway JWT verification enabled. The five-minute cron exists and its
  disabled control prevents routine outbound capture.
- Backend PR102 head `98ecbd4f582c7c0967878abf20fa742b49f35efc` has successful
  ci-proof-pack run `42127424958` and smoke run `42127425018`.

The exact gateway follow-up SQL from PR102 was reviewed and submitted through the
migration connector. Automatic approval review rejected the action because the
current instruction did not authorize its exact persistent production function,
role and outbound-dispatch changes. No workaround was attempted. It remains
unapplied and requires explicit approval of that concrete migration. A later
credential-presence-only scheduler probe must not enable capture or call DoorLoop.

## External work delivery

Both assignments were presented as complete copy-paste prompts to Dion in the
current chat. No connected Claude/Grok execution or current watch is established.

| Recipient | Assignment | Source / permitted work | Delivery | Execution |
| --- | --- | --- | --- | --- |
| Claude Code | ECC-CAPTURE-C1-v1 | Backend PR102 exact head above; scoped source/test corrections, production read-only | AWAITING_MANUAL_HANDOFF | NOT_CONFIRMED |
| Grok | ECC-M01-G1-v1 | ECC main at the base above; corrected route census documents, draft PR | AWAITING_MANUAL_HANDOFF | NOT_CONFIRMED |

Codex retains frontend correction and integration review. No new external paid
jobs, services or resources were launched; no quantified cost cap is claimed.
External delivery, passing source tests and live acceptance remain separate.
