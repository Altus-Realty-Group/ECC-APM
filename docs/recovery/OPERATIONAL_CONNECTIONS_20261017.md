# ECC operational connections workspace - 2026-10-17

STATUS: LOCAL SOURCE AND BROWSER VERIFIED; SERVER BINDING / LIVE ACCEPTANCE PENDING.
Repository: Altus-Realty-Group/ECC-APM (1058195656).
Branch: codex/ecc-operational-connections-20261017.
Base: local integrated 47fe43afcc7f9e047b5b0bc33a77e258a0451498.
The containing commit identifies the delivered source revision.

## Operator job and scope

An ECC operator needs to open the application responsible for the next part of
field, construction, deal or property-fact work. The workspace keeps that path
visible without inventing linked business records, delivery receipts or tasks.
One Operational connections title and a primary Review ECC work orders action
anchor the page; each fixed application has its purpose, next step, ownership and
safe list-level navigation or an honest unavailable state. Body text is white /
neutral on black with gold reserved for the primary action, focus and emphasis.

New actual route: /systems/connections. Systems -> Connections links to this
implemented page. The shorter navigation label avoids sidebar truncation; page
title stays Operational connections. Existing unavailable integration destinations
remain inventory of unfinished data exchanges; this workspace does not complete
them. No original destination, business feature or scope was removed.

## Source contract with the root lane

The root owns the new protected GET /api/workspace/connections. This UI consumes
only that agreed route through sessionFetchJSON and the existing query client.
The response is exactly { applications: [{ key, navigationUrl }] }, containing
exactly one of each fixed key: field-app, construction-manager, deal-room and
property-intelligence. Unknown, duplicate, omitted or malformed keys/fields fail
the whole response. The client normalizes display order independently of wire
order. A null URL is unavailable, never an invented fallback.

Server attestation and configured origin allowlist remain root-owned. Client
validation additionally requires HTTPS, no credentials/control characters/
backslashes/query/fragment/custom port, no IP/localhost/internal-like host, and
these exact starting paths: Field App /properties, CM /projects, Deal Room /.
No runtime origin is hardcoded or guessed. A Property Intelligence URL is rejected:
there is not yet an executable ECC consumer profile, so that key remains null.

External anchors explicitly announce opening a new tab and use noopener/noreferrer.
No record ID/address is interpolated and no browser session/token is forwarded.
Navigation availability is not data integration, shared identity, delivery or
application-health proof. The copy explains record matching and evidence delivery
need separate confirmation. ECC work-order ownership is preserved.

## State and dependency behavior

| Event/state | Source / state owner | Visible result |
| --- | --- | --- |
| Initial read | Protected workspace route; existing shared session transport | Context/purpose remain; loading, no external link |
| Valid success | Strict parser; fixed app order | Configured list links; null remains unavailable |
| Active refresh | Existing query fetch state | Prior URLs withheld until current read settles |
| 503 / malformed / unsafe response | Existing query + ContractError | Failure/Retry, no retained external URLs |
| 401/403 | Existing shared query denial purge | Denied / canonical sign-in, no cached external links |
| Session boundary/logout | Existing epoch, cache purge and access suspension | New epoch query; prior URLs disappear; no new persistence |
| Open app | Server-approved URL after client validation | Navigation only; no cross-app record write or dispatch |

Query key: [workspace, connections, sessionEpoch]. No new storage, auth mechanism,
backend query, provider operation, refresh scheduler or business-record schema.
No data, counts, tasks, prices or receipts are synthesized from application links.

## Canonical source discovery used for boundaries

Read-only current main checkpoints:
- Field App 46ad746acbfe3864ceb0b481950bdbfd71e7a347: client/src/App.tsx registers
  /properties and record/capture routes. server/lib/cm-identity-map.ts has no
  authorized durable numeric-ID-to-CM-UUID resolver. Cross-app PM handoff:
  docs/production/FIELD_APP_CM_DEALROOM_BLUEPRINTS_PM_HANDOFF.md.
- CM 7d8b6c17f74d0a5927b525b3a1729e37d661cb1b: src/app/routes.tsx registers
  /projects. docs/integrations/ECC_DOORLOOP_WORK_ORDER_PROJECTION.md and executable
  src/features/ecc-work-order-projection/ declare the read-only ECC-owned work-order
  seam; no live loader exists. docs/ECC_EVENT_CONTRACT.md keeps source object/record
  references and manual-first coordination. CM owns construction records.
- Deal Room 2637928e5873d6ef4824a2a45174ffca0644e9a3: client/src/App.tsx registers
  /. docs/property-intelligence/PROPERTY_FACTS_DISPLAY.md says its facts surface
  is source-implemented but not activated; documents require verified property
  mapping, scoped membership and explicit publication.
- Property Intelligence implementation in price-engine
  ec8dbc213e9964cd6128fc12127e1118f98fd4b5:
  supabase/functions/property-intelligence-consumer-api/index.ts projectionMap
  registers deal_room_property_v1 and price_engine_underwriting_v1 only. It checks
  approved consumer policy and a unique active confidence-1 property identity map;
  schema/admin references to ecc_property_audit do not provide an ECC API profile.

These checkpoints are source evidence, not current runtime hosts, live deployment,
identity grants or cross-app record mappings. Addresses, email, numeric casts and
names cannot supply missing authority. The inspected shared project orientation
files do not override these repository-owned implementation facts.

## Validation

- Nine focused contract/render/session/navigation tests plus ten existing
  navigation tests passed. Cases include exact keys/order, malformed shape,
  duplicate IDs/unknown keys, malicious links, null, safe new-tab anchors, denied,
  cached failure, loading/refresh and session purge.
- Full unit suite266 passed, zero failures/skips.
- Full typecheck and guardrail/build passed; existing large-bundle advisory remains.
- git diff --check passed.

Actual-source Chromium153/Playwright journeys at1280x844 and390x844 touch passed:
loading without links, successful3 configured starting links, external popup
navigation with null opener (destination intercepted), failed503 cached refresh /
Retry, malformed200, unsafe URL200, session replacement of prior URL,403 denial /
canonical sign-in, and all-null unavailable state. Only GET workspace requests
occurred,12 per viewport; no provider requests, page errors or horizontal overflow.
Six workspace controls measured >=44px high and>=197.0625px wide. Actual Tab from
the focused primary action reached Refresh application links; visible focus checked.
Desktop/mobile ready screenshots were visually inspected. No browser dependency,
lockfile, config or CI change: reusable scratch Chromium and a private scratch
Vite optimization cache were used. Browser/Vite processes exited after proof.

Scratch evidence: /tmp/ecc-connections-proof/browser.mjs, receipts.json,
ready-1280.png, ready-390.png, denied-1280.png and denied-390.png.
The navigation-label shortening to Connections followed screenshots; the actual
route/behavior did not change. Existing screenshots show the longer label and do
not prove the final sidebar wording.

LIMITS: Browser responses and external destination were isolated fixtures; not
operating records or live app calls. Root server attestation/configuration,
actual approved origins, entitlement grants, deployed alignment and destination
journeys remain separate acceptance. This page makes no production-ready claim.

## Scope, dependency and rollback

Only App route/import, single navigation entry, own UI/parser/CSS, tests and this
proof change. No server, auth/session implementation, backend target, environment,
provider, database, dependency, workflow, other repository or live runtime edit.
Depends on the root-owned protected workspace endpoint in PR155. A missing route
renders honest failure. Rollback: revert this UI commit; no data rollback.
