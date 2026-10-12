# ECC PR Disposition Ledger

Status date: 2026-10-12  
Assignment: ECC-C1-V3  
Repository: Altus-Realty-Group/ECC-APM (ID 1058195656)  
Current main: 6bafe36f707b11c721683c7154fd6728cd8a88b7  
Hygiene branch head (post-refresh): 04e32912f412031fda47919c323dd02d343c724b  

Dispositions are proposals based on live GitHub state. No merges or closures performed by this lane. Age alone is not a closure reason. Historical proof is preserved separately from current evidence.

## Open PRs (live enumeration 2026-10-12)

| PR | Title | Head SHA / Base SHA | Unique paths / intent | Inherited / notes | Evidence / CI limits | Disposition | Owner | Replacement / dependency | Final URL |
|----|-------|---------------------|-----------------------|-------------------|----------------------|-------------|-------|--------------------------|-----------|
| 104 | ECC repository recovery: hygiene, current standards, and complete PR disposition | 04e32912f412031fda47919c323dd02d343c724b / 6bafe36f707b11c721683c7154fd6728cd8a88b7 | .gitignore, .env.example sanitization, cache/upload removals, artifact inventory, this ledger, README identity/setup | Refreshed from current main; preserves hygiene history | Prior npm ci/guardrail/build historical; exact-head verify previously succeeded; full current CI pending after docs; proof-pack/CodeQL draft-skipped historically | Complete docs, revalidate, review for merge (docs-only) | Grok | None | https://github.com/Altus-Realty-Group/ECC-APM/pull/104 |
| 113 | ECC frontend integrity: canonical navigation and trustworthy operator states | 198996d08bcd1b85e084dd5c55f2b051052f842b / 6ac571ba731bb1b79437571706b83ca3546a9e55 | Canonical nav, stable sidebar, keyboard/touch, null/zero/error/freshness states, property/collection repairs, unit/browser test sources (43 paths) | Substantial frontend implementation (not scaffold) | Verify succeeded; proof-pack/CodeQL skipped while draft; typecheck fails with 268 diagnostics (baseline ~288); unit tests present but Verify may not invoke them; no live runtime/DB proof | Hold for Claude corrections (parser/cache/accessibility, contract errors, sensitive-data cache clear, numeric/timestamp validation, full CI) | Claude | Outstanding corrections remain; separate owner-transfer defects | https://github.com/Altus-Realty-Group/ECC-APM/pull/113 |
| 121 | chore(deps): bump drizzle-orm from 0.44.7 to 0.45.4 | (dependabot) / main | Dependency bump | New since prior enumeration | Dependabot | Review separately; out of hygiene scope | Dependabot | Backend ownership for ORM changes | https://github.com/Altus-Realty-Group/ECC-APM/pull/121 |

## Merged campaign / key PRs (verified)

| PR | Title | Head SHA / Base SHA | Unique / intent | Evidence | Disposition | Owner | Replacement / notes | Merge SHA / URL |
|----|-------|---------------------|-----------------|----------|-------------|-------|---------------------|-----------------|
| 120 | docs: record ECC cleanup execution and backend ownership discovery | 4784b73c25024baf6a564174b12ab0a4be0b0a7b / 417f27aea8ce052b36ab9cd4c89a52e739c43fef | Cleanup checkpoint, source caller/handler map, health404, remaining advisories | Source references checked; no runtime authority | Merged docs | ChatGPT | Source map and staging-health404 establish no live schema/runtime authority. Seven remaining package advisories recorded; backend ownership dependency. | Merged 2026-10-12; https://github.com/Altus-Realty-Group/ECC-APM/pull/120 |
| 118 | chore: reconcile stale dependencies and make npm setup reproducible | 7dae2c3e3b14be5baab75373f61cd30f5a9db2b5 / d78b57b4b7189625f043adba7b701a5891813066 | npm/package-lock single path, package name ecc-apm, Node engines, compatible dep updates, lock cleanup | Fresh npm ci/guardrail/build, regressions, 44→7 advisories | Merged | ChatGPT | Supersedes old npm proposals (#71,#89–#94). Remaining 7 advisories require backend owner. | Merged 2026-10-12; https://github.com/Altus-Realty-Group/ECC-APM/pull/118 |
| 117 | chore(ci): modernize validation Actions with immutable pins and bounded jobs | ac6c39c434f99670a4b4df775483f44c25b0a464 / 8d8daf7e4d381d17bee5dd60af03125659fe3bb0 | Pin checkout/setup-node/CodeQL, bound Verify/CodeQL | YAML parse, regressions | Merged | ChatGPT | Salvages applicable CI from older Actions PRs | Merged 2026-10-12; https://github.com/Altus-Realty-Group/ECC-APM/pull/117 |
| 116 | fix(ci): prevent task metadata from executing as shell code | 023c176c72a226a561dab1923404683cad3be5c7 / c6e3546a4811b618d0b335ffbcb32f27f348b090 | Env vars for inputs, quoting, bounds | 9 tests pass | Merged | ChatGPT | Security fix for ready-check | Merged 2026-10-12; https://github.com/Altus-Realty-Group/ECC-APM/pull/116 |
| 115 | Align ECC - APM repository identity after the approved rename | 84d09163af9e4625a2f3ca29dea5509be62eda71 / 6ac571ba731bb1b79437571706b83ca3546a9e55 | AGENTS.md, roadmap headers, identity record | Metadata confirmed | Merged | ChatGPT | Current identity | Merged 2026-10-12; https://github.com/Altus-Realty-Group/ECC-APM/pull/115 |
| 114 | Fix ECC proof generation, failure propagation, and missing-check reporting | 3eaaea85349d3cac605c84d62de338119a89de40 / 50ea0bd10a26566ce007e68fc56e8ae977a5924a | Proof helper, failure propagation, typecheck honesty | Local tests, workflow shape | Merged | ChatGPT | Supersedes #82 | Merged 2026-10-12; https://github.com/Altus-Realty-Group/ECC-APM/pull/114 |
| 112 | ECC restart: source audit, cleanup plan, and operational development sequence | 70eeb72a5b5666699dcea6f672f35a4f636b318c / 808bafb3824bd8ea7f5bc3331507364392f9a40e | Restart plan, disposition framework | Docs only | Merged | ChatGPT | Canonical restart reference | Merged 2026-10-12; https://github.com/Altus-Realty-Group/ECC-APM/pull/112 |
| 111 | docs: adopt Supabase architecture and reuse standard | a47bd6d91d2a4e6d872861a0d00d5a95f1d085b9 / 8d8daf7e4d381d17bee5dd60af03125659fe3bb0 | Architecture standard, source inventory separation | Docs reviewed | Merged | ChatGPT | No live DB proof | Merged 2026-10-12; https://github.com/Altus-Realty-Group/ECC-APM/pull/111 |
| 110 | docs: consolidate ECC property identity and governed PI handoff | a7a30bc9a79aad471fd1ad54c915d170868bf93b / aa66336be3aa865b42b862a945cda3b4d2207d2d | PI handoff consolidation | Docs only | Merged | ChatGPT | Owner contract revalidation required | Merged 2026-10-12; https://github.com/Altus-Realty-Group/ECC-APM/pull/110 |
| 76 | chore(ci): pin supported Actions in remaining legacy workflows | c4547aba889bdaa6dcb1702e95c0d79b33be489b / 417f27aea8ce052b36ab9cd4c89a52e739c43fef | Pins in legacy deployment/Owners Sync | YAML comparison | Merged | Dependabot / ChatGPT | Remaining legacy pins; #119 referenced for broader ownership | Merged 2026-10-12; https://github.com/Altus-Realty-Group/ECC-APM/pull/76 |

## Closed / superseded (evidence preserved)

| PR | Title | State | Head / Base | Notes | Disposition | Preservation |
|----|-------|-------|-------------|-------|-------------|--------------|
| 82 | chore(ci): fix CI proof pack artifacts | closed | 731533e8bb4ac1090145840e888661d810a24ea4 / prior | Superseded by #114 | Do not revive. Branch preserved. | https://github.com/Altus-Realty-Group/ECC-APM/pull/82 |
| 70 | Obsolete Replit authoring/scheduled-write policy | closed | — | Obsolete under current source policy | Preserve evidence; salvage ignore/docs ideas only | Historical |

## Additional notes

- #119: Not found via direct fetch (404). Referenced in #76 for broader pipeline/ownership concerns. Seven remaining package advisories recorded in #120 and #118 dependency recovery doc; backend ownership dependency remains.
- Original campaign open PRs (~27) have been largely reconciled via the above merges and closures. Live open set is now #104, #113, #121.
- Hygiene removals and inventories retained. Reference checks previously confirmed no active source refs to removed cache/uploads. Archives retained pending evidenced disposition.
- No history rewrite, secret inspection, or irreversible deletion performed.

## Next

Refresh complete. Docs updated. Obtain current full CI on exact head. PM review before merge.
