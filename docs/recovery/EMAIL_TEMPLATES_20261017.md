# Email template authoring — 2026-10-17

Restores Communications → Templates at `/ops/comms/templates`. Starts blank and contains no sample business records. Authors enter their own reusable subject/body and optional completion values. Preview is escaped plain text. Unknown, missing and unclosed merge fields block email download.

Template JSON exports only formatVersion/name/subject/body; imports are strictly validated and staged for explicit replacement. Completion values and recipient are excluded. New-blank and import replacement require confirmation when applicable. Nothing is persisted to an account or sent. The actual .eml download contains one validated recipient, UTF-8 folded subject and base64 plain-text body. Header injection is rejected. There is no provider/API write, From identity assumption, or invented recipient.

Draft state is tab-local and cleared on reload or session epoch changes. Delayed imports across a session boundary are discarded. Download URLs are revoked even on failure. Download start is not a delivery claim.

## Validation

- Typecheck, all 248 unit tests, guardrail and build passed.
- Actual source browser journeys passed at 1280px and 390px: blank state, authoring, JSON download/readback, .eml download/readback, cancellation/replacement, strict import, escaped preview, unknown fields, delayed import across session change, reload clearing.
- Eleven measured controls met 44px targets. No page errors, horizontal overflow or API requests.
- Browser receipts and screenshots: `/tmp/ecc-email-proof/`; test inputs are isolated fixtures, not application defaults.
- Independent source review covered import, header validation, plain-text rendering, session reset and replacement workflow.

Backend connection, stored template libraries and message delivery remain separate unfinished work. This change does not activate authentication, a database, a provider, deployment or Control Plane configuration.
