# ECC_ADOPTION_MERGE_READINESS_NOTE

Status: merge-readiness summary for accepted ECC command-surface sequence
Baseline PR: `#99`

## What PR #99 Established

- canonical roadmap and repo-local implementation note
- Type A command-surface scaffold on the live `Properties` surface
- command palette shell, dense table shell, and local-only triage rail
- black/white/gold command-center styling without route, adapter, or backend drift

## Adopted Dependencies In Active Use

| Dependency | State | Active use |
| --- | --- | --- |
| `cmdk` | adopted | `T1` command palette shell |
| `@tanstack/react-table` | adopted | `T3` dense table shell |
| `shadcn/ui` | already present and in use | shell primitives, inputs, table chrome |
| `@dnd-kit/core` / `sortable` / `utilities` | adopted | local `T5` triage rail |
| `@tanstack/react-query` | already present and retained | existing resolver/query layer |

## Deferred

| Item | Status | Why |
| --- | --- | --- |
| `xstate` | deferred | workflow burden not yet high enough for a new orchestration layer |
| `visx` | deferred | no custom overlay requirement established in this rollout |
| `deck.gl` | deferred | no justified geospatial command surface in scope |

## Next Implementation Slices

1. Wire the command palette to more existing ECC-safe portfolio actions without adding hidden mutations.
2. Replace local triage buckets with a reviewed persistence plan only if a canonical backend status model is approved.
3. Extend Type A zoning from `Properties` into additional portfolio surfaces using the same black/white/gold shell.
4. Add richer dense-table controls only where they reuse current resolver fields and query boundaries.

## Scope Guardrails

- preserve Type A zoning
- preserve black/white/gold command surfaces
- no route changes
- no adapter changes
- no backend assumptions or contract invention
