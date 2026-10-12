# ECC dependency recovery — 2026-10-12

Repository: Altus-Realty-Group/ECC-APM. Source baseline: d78b57b4b7189625f043adba7b701a5891813066. This records source/local evidence, not deployed runtime acceptance.

## Reconciled old proposals

| PR | Disposition implemented by this slice |
| --- | --- |
| #94 | React Query 5.90.21 |
| #93 | Framer Motion 12.35.2 |
| #92 | Zod 4.3.6 |
| #91 | Vite 7.3.1, verified Node requirement and build compatibility |
| #90 | Wouter 3.9.0; preserve to/href/asChild link semantics |
| #89 | Playwright 1.58.2; also align @playwright/test rather than duplicate browser cores |
| #71 | Superseded aligned Playwright 1.56.1 proposal by both packages at 1.58.2 |

Use Node ^20.19.0 or >=22.12.0 for Vite 7. Current local validation used Node 24; existing Actions application Node20 resolves a supported current patch. npm CI is the required proof path. npm/package-lock.json is now the single active install path. Developer launch, install helper and browser-test preview commands use npm and the locked local Vite; the stale pnpm lock is retired with history preserved. The launch helper no longer kills another process or downloads an older Vite. A local pnpm importer failed and is not relied on as compatibility proof.

Compatible non-force npm audit fixes refreshed transitive resolutions; @typescript-eslint parser/plugin 8.71.2 retain ESLint 8.57 and TypeScript 5 support. The current ESLint configuration resolves with the new parser/plugin. No migration command, database, backend business logic, secret, vendor call or deployment was executed.

## Evidence

- Fresh npm ci succeeds; guardrail/Vite build succeeds.
- Five executable regressions cover actual DTO invalid types and null/zero, every current App route and entity parameter, link URL forms/child anchors, cache invalidation/clear, and aligned Playwright packages.
- Verify runs test:dependencies as a required explicit step in the existing job; no new job, browser download or trigger. Local suite is under one second; estimated incremental runner compute under two minutes per 100 monthly Verify invocations. Existing four-job ready-PR bounds remain unchanged; estimates are not spend caps.
- All nine existing Python/Bash CI proof tests pass.
- The unmodified main typecheck stops on a malformed string in src/lib/format.test.ts. For an additional dependency comparison only, the same one-character syntax repair was applied temporarily to both local trees and then restored. Both produced the same 288 TypeScript diagnostics with no newly introduced diagnostic after the link repair. This is a regression comparison, not a passing compiler gate. #113 owns the active compiler and frontend debt repair; no exclusion/suppression was added here.
- Registry audit snapshot: original lock 44 findings (4 critical,29 high,10 moderate,1 low); updated lock 7 (1 high,6 moderate,0 critical). These are reported package advisories, not verified runtime exploits or a production clearance.

## Remaining owned work

| Dependency family | Remaining finding | Owner/next action |
| --- | --- | --- |
| drizzle-orm | One high advisory; supplied fix crosses the current 0.x compatibility range | ECC PM must establish the active schema/backend owner, then test that owner's schema/types/query consumers before dependency change. shared/schema.ts is a source consumer; no live writer inferred. |
| drizzle-kit/esbuild loader | Four moderate findings; audit recommends a breaking tool downgrade | Inventory actual migration tooling and approved execution owner. Do not run audit --force, downgrade the migration tool blindly or execute migrations to clear the audit. |
| exceljs/uuid | Two moderate findings; audit suggests a major ExcelJS downgrade | Trace owner-transfer workbook output in server/services/ownerTransferService.ts; prove real schema, round-trip export and existing workbook compatibility before replacement/override. |

Rollback: revert this bounded dependency commit, including lockfiles, compatibility check and link adaptation. Old branches/discussions retain proposal evidence after supersession. Keep runtime/data acceptance separate from the package tests.
