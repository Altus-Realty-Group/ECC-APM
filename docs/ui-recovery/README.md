# ECC UI recovery execution index

## Current detailed specification - 2026-11-16

- [Full Recovery and Build Plan, revision 1.2](ECC_APM_Full_Recovery_and_Build_Plan.md): all 58 destinations, 33 record tabs, property maps, 24 command contracts and consolidated UX01-UX18 decisions.
- [Advisor consolidation](ECC_APM_Advisor_Consolidation_and_Design_Decisions.md): disposition of 43 findings; adoption/refinement/rejection is not visual approval.
- [UI review and change safety](UI_REVIEW_AND_CHANGE_SAFETY.md): reusable presentation, isolated previews, change classification, impact checks and rollback.
- [Original-build recovery inventory](ECC_Dashboard_Original_Build_Recovery_Inventory.md): retained dashboard capabilities recovered from the supplied original builds. Private shared-folder access links are not included.

These are planning documents, not implemented capabilities. The detailed revision 1.2 specification and its section 14 guide the next design iteration within the fixed shell, navigation and contracts. The existing source inventories, review-register tooling, targeted slices and product master plan remain in force. Existing semantic/categorical chart colors remain available; no forced grey/gold chart palette is introduced.

## Source recovery program and inventories

Revision 2 incorporates Gemini/Grok/Claude advice and Dion's frozen navigation, semantic graph colors, compact “i” help and Codex-before-Dion visual gate. The current UI is rejected and remains unapproved. Use the [whole-app recovery and rebuild plan](ECC_UI_RECOVERY_AND_REBUILD_PLAN.md) before further broad UI work. This is an execution supplement to the existing product master plan.

| Inventory | Scope |
|---|---|
| [Targeted PRs](TARGETED_PRS.md) | Bounded owners/scopes, first parallel wave, dependencies and review gates |
| [Field bindings](FIELD_BINDING_RECOVERY.md) | Current card wire gaps and 28 required data-field groups |
| [Routes](routes.csv) | Every explicit current route plus fallback and source entry |
| [Navigation](navigation-destinations.csv) | Available, planned and hidden destinations |
| [Source components](source-components.csv) | Every TSX module, import reachability, exports and object count |
| [Source controls](source-controls.csv) | Statically identified controls, headings, charts/maps/tables/cards; location, label, handler and link |
| [API references](source-api-references.csv) | Source endpoint references, not live contract acceptance |
| [Snapshot archives](snapshot-archives.csv) | Archive identity, byte size and SHA-256 |
| [Historical snapshots](historical-snapshot-members.csv) | 38 ZIPs, visual-source byte hashes and same-path comparison |
| [Experience review register](experience-review-register.csv) | Stable design IDs, review batches, Codex internal visual gate and Dion decisions; all pending |
| [Manifest](inventory-manifest.json) | Exact source baseline and inventory limitations |

All design approvals are pending. None of these counts establish working workflows or operating data completeness. No UI merge, publication, live sync, credentials, grants, schema or original-file changes are authorized by the inventory itself.
