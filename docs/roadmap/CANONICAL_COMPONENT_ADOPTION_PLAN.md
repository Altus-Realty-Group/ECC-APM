# Canonical Component Adoption Plan — ECC

Status: CANONICAL
Owner: Dion / CD
Target Repo: Altus-Realty-Group/ECC-APM

## Purpose
This document records the approved component adoption plan for ECC so the work is durable, auditable, and executed in the correct repo.

## Approved Adoption Set
- cmdk — whole
- TanStack Table — whole
- shadcn/ui — whole
- dnd-kit — whole
- xstate — evaluate by workflow burden
- visx — extract/custom overlay use only where needed
- deck.gl — extract/use only for justified geospatial surfaces
- TanStack Query — evaluate per adapter/data-governance fit

## Required ECC Outcomes
1. Command palette shell for command-center navigation and actions
2. Canonical dense table shell for Type A operational pages
3. Drag-and-drop triage patterns where domain-relevant
4. Premium black/white/gold command-surface styling
5. No backend contract drift
6. No repo drift

## Classification Rules
Every adoption item must be labeled in implementation proof as:
- whole
- extract
- wrap
- pattern-only
- deferred

## Immediate Work Slices
### Slice 1 — Foundation
- inspect existing package manager and dependency graph
- install only architecture-fit dependencies
- write implementation note in repo

### Slice 2 — ECC Shells
- scaffold command palette shell
- scaffold dense table shell
- scaffold drag-and-drop shell if justified

### Slice 3 — Governance
- document deferred items
- record proof of changed files and dependency summary

## Forbidden
- invent backend fields
- invent backend routes
- introduce orange or generic admin styling
- mix backend work into this repo

## Acceptance
Work is accepted only when the repo contains:
- dependency/install changes where justified
- repo-local implementation notes
- scaffolded shells
- proof-ready changed file list
