# R1-G: Cards and dashboard recovery
Owner: Grok. Status: assignment seed, implementation not started/accepted.
Read the campaign plan and incoming-file standard in the Codex governance PR before implementation. Start from this independent branch, whose base is main at 1c8fd1022f46cd26ad0df748ffc053c0ed2c9542.

Objective: recover richer entity-card and dashboard presentation into current ECC-APM using current verified frontend contracts. Select strongest active-export implementation per feature; retain the current data/session/access safeguards. Finish one bounded card/dashboard vertical slice, validate it, freeze it for review and continue pending slices after accepted dependencies.

Exclusive targets: current src/pages/card/**, src/features/dashboard/**, new src/components/recovery/**, docs/recovery/ui/**, tests/unit/recovery-ui*, e2e/recovery-ui*. Contract ownership and shared shell/nav/routes remain with Codex.

Sources: AltusCommand3 entity cards and dashboard widgets; EmpireCommandCenter1 active client card/dashboard modules; EstateCommand2 current card layouts. Compare active exports to archive versions. Preserve useful financial/property tabs and linked entities, not demo record ID 1 or unsupported metrics.

Standards: React/Wouter/TanStack current architecture; database/API truthful values; null vs zero, exact monetary/percentage units and source timestamps; loading/empty/denied/partial/error states; black/white/gold, no orange; 44px mobile controls; keyboard/focus, no 390px overflow; charts distinguish losses/profits/targets and handle negative/zero data. Every imported/touched file needs provenance and specific defect adjudication.

Do not modify App.tsx, Sidebar/navigation, src/lib/recovery, operations components, shared queryClient/session, existing src/contracts, shared styles, package/lock/workflow files, APIs/proxies, secrets or live data. Keep new styles scoped under src/components/recovery. Request shared contract/route changes with evidence in docs/recovery/ui/INTEGRATION_REQUEST.md.

Validate typecheck, unit/dependency checks, build, targeted card/dashboard tests and desktop/mobile browser journeys. No mock production figures or backend invention. Simulated test fixtures cannot be claimed as live-data acceptance.

Return exact PR/head, changed paths, source provenance, before/after behaviors, validation results, unresolved contract/route needs, remaining slice, lane integrity and next action. No merges or publication. Grok does not monitor GitHub implicitly; report back directly to Dion.
