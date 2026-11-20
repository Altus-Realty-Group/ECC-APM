# UI review and change safety

Owner: Codex, ECC design/integration. Final visual decision: Dion.
Status: required implementation/review protocol; documentation only in this PR.
Date: 2026-11-16.

## Purpose and current limits

Dion must be able to request a denser table, a larger property map, different
component placement or a clearer action label without rebuilding data access or
changing financial/workflow meaning. Use small, reversible presentation changes
with explicit impact checks. This reduces regression risk; it does not promise
that changes can never break anything.

The review infrastructure and component boundaries below are implementation
requirements, not a claim that a configurable UI, saved server drafts, new preview
or write-capable integration exists today. Existing source-only UI state is
described in [UI state and exports](../architecture/ECC_UI_STATE_AND_EXPORTS.md):
email drafts are currently memory-only with session clearing. The server-scoped
draft design remains separate accepted-contract work.

## 1. Preserve the shell and semantic boundaries

| Layer | Reuse / intended extension | Change boundary |
|---|---|---|
| Existing shell | `src/config/navigation.ts`, Sidebar, WorkspaceBar, existing card/matter tab arrays, logo assets | Frozen labels, order, paths, redirects, availability, tab identity and logo. Review preferences are not authorization to change them. |
| Presentation | Existing `src/styles/workspace.css` cascade, scoped component styles, CardShell and existing table/chart/help primitives | Tokens, spacing, columns, visual arrangement, readable labels and responsive fit. No CSS hiding as permission enforcement. |
| Semantic view/action boundary | Accepted card/domain types, typed read-only view models and stable command identities | Pure mapping from accepted facts to presentation; labels/placement cannot change eligibility, money calculations, recipient rules or command effects. |
| Data/provider boundary | Existing resolvers/adapters, session scope, accepted authorization and command contracts | Separate reviewed scope for schema, mapping, auth, persistence, provider execution and runtime binding. No presentation toggle can bypass it. |

The adopted component plan remains
[CANONICAL_COMPONENT_ADOPTION_PLAN.md](../roadmap/CANONICAL_COMPONENT_ADOPTION_PLAN.md).
Inspect what is actually present before wrapping/introducing a component. Do not
install a second UI framework or duplicate state library solely for the review.

## 2. Make the common changes small

Implement shared presentation boundaries around the existing shell:

- Context header: title/record, concise facts, freshness, selection and actions.
- Action region: stable command ID, label, icon, availability/reason and handler.
  Presentation chooses placement; accepted authorization controls eligibility.
- Property location: map/list selection, accessible address fallback and location
  actions; map provider is behind its verified boundary.
- Dense table: typed columns, numeric alignment, selection, sort/filter and
  scoped row/bulk actions; reuse canonical table patterns.
- Chart: series/basis/period/unit/legend, null behavior, accessible table and
  drill context; calculations stay in accepted domain functions.
- Context dock: Conversation/Work/History presentation with preserved authorized
  context; no duplicate permanent history panel.
- Work/evidence and external-attempt views: render domain state; do not invent
  transitions in JSX, layout descriptors or feature switches.

Use a small typed screen-composition specification where it removes repetition:
named component slots, section order, supported column spans, allowed density and
declared breakpoints. Do not build a runtime drag-and-drop page builder, arbitrary
JSON form engine or expression evaluator for this task. Configurable section
order is limited to record content; existing navigation and record tabs are not
configuration fields. Reading order and keyboard order must follow the layout.

Centralize visual variables at the existing scoped token layer; use component
variants for genuinely different density. Do not scatter one-off color/spacing
patches through every page or add broad global selectors that affect unreviewed
screens. Preserve semantic and accessible categorical chart colors; no orange
and no forced grey/gold chart palette.

## 3. Review in an isolated but representative preview

Extend the existing R01 isolated review and scoped browser harnesses rather than
starting another competing gallery. R03 typed fixtures remain subject to their
own exact contract/metric review. Neither PR's existence is acceptance.

The review preview must:

1. Import the same reusable presentation components and exact existing shell
   that production will use. It must not become a detached HTML imitation whose
   CSS/components are rewritten again after approval.
2. Build from a separate test/design entry. No new production route, query-string
   fixture mode, deployed mock adapter or client flag enabling synthetic data.
3. Label fixtures permanently. Use synthetic identities and typed accepted
   models; proposed presentation-only facts remain explicitly proposed.
4. Block operating API/provider requests. Maps can use clearly labeled schematic
   geometry in review; production coordinates/imagery/attribution require their
   verified contract. No vendor calls, email/SMS sends, live SQL or credentials.
5. Offer populated, empty, missing, partial, stale, denied, failure, long-content
   and unknown-outcome scenes. Include SFR, fourplex, apartment, construction,
   typed agreement and shared-obligation examples where relevant.
6. Exercise real presentation interactions: selection, map/list filtering,
   relevant chart range/drill, menus, forms, dock modes and record-return state.
   Prototype transitions are not proof of backend writes or durable persistence.
7. Keep fixture/test-only code outside production dependency reachability and
   built assets; verify that separation before a product change is released.

Do not expose sensitive drafts or records through preview storage. Browser
preferences may retain permitted presentation choices, never private business
content. No pin, role badge or fake receipt is operating evidence.

## 4. Classify a review request before editing

| Requested change | Normal implementation scope | Required checks |
|---|---|---|
| Spacing, typography, density, border, contrast | Shared scoped tokens/variant | All affected consumer families, readable long content, focus and representative widths; preserve color meaning. |
| Move/resize map, table, chart or dock | Typed composition / responsive component | Retained information, DOM reading order, selection/focus, labels, overflow and each affected breakpoint. |
| Change an action label or icon | Presentation metadata keyed by stable command ID | Same handler, scope, eligibility, preview and effect; verify text accurately predicts the next action. |
| Change filter default or column order | Page view configuration | Same accepted data and totals; accessible table semantics; saved-view compatibility and return position. |
| Change action eligibility, audience, stage transition or financial meaning | Domain/command contract review | Focused policy/contract tests, concurrency, negative cases and persistence/refresh proof as applicable. Not a cosmetic change. |
| Add/change DB field, parser, schema, provider write or auth path | Separately bounded data/integration PR | Verified ownership and compatibility; DB/API/access evidence and appropriate authorization. No scope expansion under a visual request. |
| Change navigation, routes, tabs, logo or availability | Frozen boundary | Separate explicit Dion instruction; an internal composition preference is insufficient. |

## 5. Keep review decisions attached to the reviewed version

Use the existing `experience-review-register.csv` and its generator/tests as the
starting tracking mechanism. Preserve stable design IDs and previous decisions.
Do not mark all items approved because a family has one accepted screenshot.

For each reviewed slice, record:

- Screen/design ID, user task and exact source head/revision.
- Fixture identity/version, active state and source/contract classification.
- Viewport width AND height, shell state, zoom and scroll position.
- Shared component/token/composition dependencies and affected consumers.
- Requested change, observed result, checks, known limitations and next step.
- Codex internal review separately from Dion's decision and actual-data readiness.

An approved screenshot belongs to that version and state. Changes to its
component, token, composition, input fixture or behavior invalidate affected
evidence. Preserve old evidence as history and mark impacted decisions for
re-review. The current generator's behavior must be inspected before extending
it to dependency-aware invalidation; this document does not claim that extension
already exists. Re-review impacted consumers, not unrelated inventory rows.

## 6. Check the impact without wasting CI

For a docs-only change, check links, inventory counts, whitespace, existing
documentation/review-register tests and guardrails. Do not add meaningless tests
that assert a paragraph exists. This PR adds no CI workflow or dependency.

For later shared/product changes:

- Run existing mandatory typecheck, applicable unit/contract tests and build.
- Use existing bounded browser proof where the changed surface is in scope;
  preserve required checks. Do not duplicate full expensive suites on both push
  and PR or add large matrices/browser downloads for a spacing tweak.
- Map changed shared patterns to all consumers. Use representative family checks
  plus every unique/high-risk financial, audience, permission and attempt state.
- Check 1920/1440 desktop, 1024 laptop and 390 narrow compositions as applicable.
  A fold claim names height; a static PDF is not a viewport measurement.
- Verify keyboard/focus, labels, long text, map failure fallback, chart units/nulls,
  selected-row actions and returns. Test row-selection changes during commands.
- Compare before/after source/financial totals, action IDs/handlers and data
  requests. A layout change must not alter accounting or recipient behavior.
- After actual persistence is implemented, verify save/reload and permission
  changes against its accepted server path. Do not claim memory retention or a
  fixture response proves durable server drafts.

No universal promise of zero regressions. Use these checks to find and isolate
problems before Dion review and release.

## 7. Delivery and rollback

Work in a narrow GitHub branch/PR with one implementation writer. Keep
presentation, field/adapter changes and live activation as separately reviewable
scopes; do not rewrite unrelated approved work to apply review feedback.

Present a complete coherent slice to Dion: before/after, the same representative
tasks, supported widths/states, changes made and concise live/pending/deferred
limits. Codex first resolves obvious clutter, dead actions, tiny text and missing
information internally. Do not repeatedly ask Dion to approve individual cells.

Keep the last accepted source revision and its evidence available. A presentation
regression rolls back its narrow commit/configuration without data migration,
provider replay or destructive reset. Feature activation follows the existing
readiness decision; it is not a theme setting. Confirm the previous state after
rollback. Never use a UI rollback to reverse real ledger facts, sent notices,
delivery attempts or accepted evidence.

## Review change record template

```text
Screen/design ID and user task:
Current source head / fixture revision / reviewed state:
Requested change and expected operator benefit:
Classification: presentation / interaction / contract / frozen-boundary
Shared components/tokens and affected consumers:
Information and action behavior retained:
Before/after evidence and viewport width x height:
Checks run and result; unverified limitations:
Codex visual review:
Dion decision and reviewed revision:
Rollback source revision and verification:
Next action:
```
