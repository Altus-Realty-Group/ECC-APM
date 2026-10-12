# ECC Adoption Implementation Note V1

## Scope Boundary
This adoption pass is frontend-only and proof-oriented. It adds command-surface scaffolds on top of the existing ECC portfolio/property surface and does not change routes, response envelopes, adapter contracts, query keys, or backend field expectations.

The roadmap path requested in the prompt, `docs/roadmap/CANONICAL_COMPONENT_ADOPTION_PLAN.md`, was not present on the clean `main` baseline for this repo. This PR adds that file so the repo contains an explicit canonical adoption record instead of relying on an out-of-band brief.

## Runtime / Package Manager Fit
- Runtime: Vite + React + TypeScript frontend with `wouter` routing
- Existing data governance seam: `src/lib/ecc-resolvers.ts` backed by React Query
- Existing UI governance seam: `components.json` confirms repo-local `shadcn/ui` setup
- Package manager reality: `npm` was used for install/build in this adoption pass because `pnpm` is not available in the current environment and `package-lock.json` is present in-repo

## Adopted vs Deferred
| Dependency / Pattern | Classification | Decision | Why | Intended Surface |
| --- | --- | --- | --- | --- |
| `cmdk` | whole | adopted | Lightweight command palette fits ECC command-bar posture without changing contracts | Global command palette shell and Type A `T1` command bar |
| `@tanstack/react-table` | whole | adopted | Dense table behavior is needed beyond the current bespoke table for sorting, selection, and zoning discipline | Portfolio `Properties` dense table shell at `T3` |
| `shadcn/ui` | whole | adopted-already-present | Repo already contains `components.json` and compatible aliasing; no separate package source or Altus fork is referenced in-repo | Existing and future command-surface primitives |
| `@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/utilities` | whole | adopted | Safe local drag triage is relevant for ECC operator review and can stay client-only | Optional `T5` triage rail |
| `@tanstack/react-query` | whole | adopted-already-present | Already wired to canonical resolver hooks and does not violate current adapter/data-governance rules | Existing ECC collection/card fetch layer |
| `xstate` | deferred | deferred | Current workflow burden for this proof surface does not justify another orchestration layer; state remains local and additive | Reserve for multi-step command workflows or approval flows |
| `visx` | extract | deferred | No custom chart overlay requirement was needed to deliver the Type A shell; existing charting surfaces remain untouched | Future custom analytic overlays only |
| `deck.gl` | extract | deferred | Repo already uses Google Maps / Leaflet surfaces; no justified geospatial adoption need was proven in this PR | Future map-heavy intelligence views only |

## Source Choice Notes
- No internal Altus package fork or Git source was referenced in `package.json`, `package-lock.json`, or `pnpm-lock.yaml`.
- New dependencies were installed from npm directly because no repo-local evidence pointed to an org-hosted alternative.
- `shadcn/ui` was treated as already adopted through existing repo configuration instead of re-initializing or pulling a parallel package source.

## Type A Command Surface Plan
- `T0 Context`: page title, operational posture, record counts, and proof-safe scope text
- `T1 Command Bar`: global palette entry, quick actions, and route-safe navigation commands
- `T2 Filters / Search`: existing property search plus quick chips and density controls
- `T3 Table Shell`: dense TanStack table using current property collection fields only
- `T4 Footer / Summary`: visible row counts, occupancy snapshot, and selected-row summary
- `T5 Optional Drilldown Rail`: drag-and-drop triage buckets for operator review without persistence

## Surface Notes
### Command Palette Surface
- Global `cmdk` shell opens with `Ctrl/Cmd + K`
- Commands are route-safe and frontend-safe: navigate to known ECC routes, jump to current portfolio views, and focus current proof surfaces
- No hidden mutations or backend-triggering actions are included

### Dense Table Shell
- Anchored to the existing `Properties` page because it already consumes the canonical property collection resolver
- Uses current known property fields only: `id`, `name`, `address`, `units`, `occupancy`, and `market`
- Adds dense-table affordances: sorting, row selection, command-surface zoning, and summary footer

### Drag-and-Drop Triage Plan
- Implemented as an optional client-only drilldown rail fed by the current visible property rows
- Buckets are operator labels, not backend statuses: `Watchlist`, `Review`, `Escalate`
- Drag state is intentionally local-only to avoid repo drift or false workflow completion claims

## Styling / Governance Notes
- Preserves black / white / gold command-center direction using existing ECC token surfaces
- Uses `lucide-react` icons already approved and present in the repo
- No orange surfaces or generic admin styling were introduced
- New shell components use graphite/elevated panels and dense spacing rather than card-grid marketing patterns

## Deferred Items and Reasons
- `xstate`: deferred because the scaffold does not yet cross a threshold of multi-step, asynchronous workflow complexity
- `visx`: deferred because no custom overlay or chart primitive was necessary to prove the adoption path
- `deck.gl`: deferred because existing map surfaces are sufficient and no geospatial command surface was in scope

## Proof Boundary
- Frontend-only additions
- No route additions or removals
- No API contract edits
- No field invention
- No mutation of backend adapters, endpoints, or DTO assumptions
