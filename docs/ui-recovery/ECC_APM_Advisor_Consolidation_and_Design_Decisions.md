# ECC APM — Advisor Consolidation and Design Decisions

**Date:** November 16, 2026, America/Chicago  
**Inputs:** Gemini, Grok and Claude responses to the Focused Advisor Review brief; Design 05; Full Recovery and Build Plan revision 1.1.  
**Result:** Proposed design direction for plan revision 1.2. This is specification work, not approval, implementation, deployment or provider/database execution.  
**Fixed:** Existing navigation, logo, Altus theme and recovered dashboard information remain.

## 1. Executive decision

Adopt the common operational improvements: compact identity/context, selection-aware commands, visible purpose/audience, reliable draft resumption, a shared external-attempt presentation, explicit proposal-versus-posted financial facts, evidence-backed readiness and meaningful media/channel context.

Keep the dashboard's map prominent beside priority work. Do not default to a queue-only dashboard, hide the map on initial load, or replace navigation with another rail. Improve the balance and first-screen composition through concrete viewport review. No new advisor round is required to resolve the choices below.

The next visual review must demonstrate behavior and information structure, not merely another full-screen collage with more boxes. Each scene should make its current record, decision and next command apparent, and show how the operator recovers from interruption or changed facts.

## 2. Evidence quality and limitations

| Input | Evidence reported by advisor | PM treatment |
|---|---|---|
| Gemini | Claims inspection of Design 05 pages 1–17; no repo/web evidence | Useful visual suggestions, but some observed-layout statements and proposed behavior are incorrect or overbroad. Do not treat confidence labels as verification. |
| Grok | Pages 1–5 inspected; other scenes specification-based/unassessed | Runtime claims such as drafts disappearing are hypotheses, not reproduced defects. Coverage IDs after Accounting drift and are corrected below. |
| Claude | Plan sections 1–7, 13.1–13.4 and 13.6 read; pages 1–11 and 14–17 inspected; other sections/pages omitted | Most specific state/wording findings; coverage is incomplete. Timeline/Court finding is historical source evidence, not reverified current code. |

All three were advisory-only by their own declarations. No runtime integration, persistence, usability, access or provider execution was tested. None delivered the requested independent 58-row coverage register. Their grouped coverage must not become a claim of complete inspection or acceptance.

The PM rechecked Design 05 content for the map/feed layout, account wording and notice controls. The portfolio map and Priority action center are side-by-side at the same vertical start. Gemini's claim that the feed is a small widget below the map is unsupported by this rendering; actual first-fold visibility still requires a real viewport, not inference from a tall PDF page. The Tenant Ledgers scene really does say **Plan-covered amount $1,000** while describing the plan as proposed/not accepted. That wording is a confirmed design inconsistency.

## 3. Consolidated direction

### UX01 — Compact record context without dropping facts

Merge the scope/freshness row and useful identity facts into a compact record header. Use the actual address/person/agreement as the dominant title, followed by type, current relationship, responsible person and a concise source state where relevant. Remove large unused identity space and duplicated titles. Lower-frequency building/ownership details remain discoverable in Overview or contextual disclosure.

Do not impose Gemini's fixed 48 px header on every record: a multiline address, typed agreement, current state and usable 44 px controls need a responsive fit. At 1440 px, target useful property map and current work visible in the first content viewport; record the actual screenshot and measurements. At 1024 px, use a contextual drawer where necessary. At 390 px, retain readable title, scope and action labels without a new navigation system.

### UX02 — Map and priority work remain peers

Retain the dashboard map with adjacent priority feed and all recovered analytical content. Start with the recovered approximately two-thirds/one-third composition; test a 60/40 split if priority rows truncate. Choose the fit from representative labels and task evidence, not a blanket ratio. An individual may deliberately collapse a section as a saved preference; default design does not conceal the map.

Property and SFR Overview keep a substantial location/access map. Properties List/Map/Split retain selection and filters. Map controls remain Directions, Schedule visit, nearby assets and provider-supported layers, with accessible location fallback. Do not expose gate codes, household information or a universal minor count on the map/header.

### UX03 — Commands depend on scope and permission

Record pages keep stable, discoverable quick-action positions for Message…, New service request, Add servicing note and Attach file where authorized. State changes refine labels and eligibility without constantly moving controls. Legitimate future actions must not disappear just because no current work item uses them. Explain unavailable actions inline or on focus, not hover only.

At portfolio scope, Message/Create/Note require an explicit record or scope selection first. Tenant Ledgers commands apply only after selecting an authorized account, with the selected account shown. No action silently targets an old row. Directions and Schedule visit remain beside the map. Creation can fail or be denied; no workflow is called failure-free because it starts locally.

### UX04 — Primary command follows the selected human decision

The active selection controls the primary action, subject to permission and prerequisite checks. When there is no selection, offer a transparent relevant-work summary or neutral page action. Rank candidate work by the accepted business priority, responsibility, target and blocker facts; do not invent a score. Ties offer Open relevant work (N) with reasons. No automatic navigation or command replacement while typing or reviewing: display a new-event indicator and let the operator change context deliberately.

Partial data disables only commands whose prerequisites are affected. It does not disable useful viewing, notes, preparation or unrelated work across the whole page. An empty queue has a useful neutral action rather than a disabled pseudo-urgent button. Header and active workbench share one dominant action, without duplicate gold commands for the same task.

### UX05 — One dock, explicit modes and stable resumption

Conversation / Work / History remain within the existing record content. Show permission-scoped unread, draft and unknown-outcome indicators. One mode expanded at a time; no second permanent history panel. A neutral dock may be closed to reclaim space, with a labeled launcher and counts; an active dock never auto-collapses. Respect the operator's explicit setting. No mandatory 48 px icon-only rail, automatic dimming overlay or gesture-only mobile sheet.

Server drafts are scoped to user, record, purpose and thread/version, with retention/expiry. Show Saving, Saved time, Save failed and concurrent-change states. Preserve authorized draft, mode and return position through record/tab changes. Re-derive audience before sending. Revoked access masks content immediately, clears inaccessible client content and does not promise a visible saved-draft entry if even its existence is unauthorized. Another operator never inherits private draft content. Closing a composer is not deleting a draft; explicit Discard is separate and handles dirty content.

### UX06 — Purpose and audience belong in the message preview

New Message… opens purpose selection and eligible recipients; an existing reply may retain its purpose and audience if still valid. Avoid an extra blocking dialog on every routine reply. The composer and final preview show full names, relevant capacities, inclusion reason, channel and attachment scope. Changing purpose recomputes eligibility and flags content/attachments needing review.

Use labels such as **Authorized access contact** and **Co-obligor on L-1042**. Do not use a global Full Obligor or Access Only permission badge: capacity and access depend on agreement, purpose, effective dates and actual authority. Non-obligor account access is evaluated from verified representation/authorization, not a universal ban. Minors remain out of default account/notice audiences; any special audience follows reviewed rules and authority. Do not display minor counts everywhere as decoration. This is a product access design, not a new legal rule.

### UX07 — Work identity and source ownership are separate

Use one canonical ECC work/request reference across queue, property, unit and history. Show a distinct linked execution/provider reference only when it exists, with a clear relationship. Two references can legitimately describe intake and execution; never conflate separate real jobs to achieve one visible prefix. Match possible duplicates, allow reviewed linking or a justified distinct request, and handle concurrent creation conflicts.

Use **New service request** for ECC intake; use **Create work order** only where the accepted execution contract supports it. Imported DoorLoop work orders remain visible by their actual IDs. Operator text says **Execution not assigned** or **Handoff not configured** where appropriate. Engineering ownership analysis belongs in integration/admin detail, not a daily work-order table. Exact execution ownership remains unresolved; this specification does not assign it by guess.

### UX08 — External attempt, provider outcome and service are distinct

Provide a shared presentation with record/command/version, immutable attempt ID, actor/time, provider correlation where available and one clear next action. Distinguish local preparation/submission, provider acceptance, delivery, field acknowledgment, completion evidence and formal service as appropriate to the command. Do not collapse these into one generic Confirmed badge.

When outcome is unknown, block a duplicate execution of that logical command and offer reconciliation using verified status lookup or evidence. A provider failure is not automatically safe to retry; accepted retry/idempotency rules still apply. Do not let an operator simply label an uncertain provider attempt failed with no proof. An affected executed version/attempt is immutable. Independent internal notes, evidence gathering and preparation can continue; a new internal draft is not a resend and need not be universally prohibited. A timeout does not become an unsent draft.

### UX09 — Proposed terms never become posted balances

Replace **Plan-covered amount $1,000** with **Plan proposal $1,000 · not accepted** or a proposal count. Keep proposed terms outside receivable totals. Accepted servicing amounts and remaining installments require accepted schedule and allocation evidence; do not infer a $500 reduction from an unallocated $500 receipt.

The $1,200 posted account, $200 disputed item and $1,000 proposal are linked facts, not three additive financial buckets. Proposed, offered, accepted, active, completed, cancelled and superseded states need versioned transitions and an Account effect statement. Cancelling servicing does not restore a fictional prior ledger balance. A source payment during review refreshes the account and marks affected terms for revalidation.

Do not adopt a universal rule that a plan must be no greater than the undisputed balance, that disputes are never included in negotiated terms, or that multiple proposals are always forbidden. Those are business/contract policies requiring accepted definitions. In this fictional scenario the $1,000 proposal excludes the disputed $200; the example is not universal policy.

### UX10 — Aging overlays preserve the accounting meaning

Disputes, proposed terms and accepted plans can overlap. Use labeled flags, patterns or a selected-account detail bridge to explain those subsets without stacking them as mutually exclusive amounts or subtracting them from posted AR. Do not call an undisputed amount “actionable AR” as though disputed balances cease to exist. Pattern segments require actual per-entry/aging-bucket associations; no guessed placement of a $200 dispute into a specific bucket.

Income, expense and NOI chart series retain their defined basis/sign. Improve contrast using neutral/white series, gold focus, labels and distinct marks. Reject the claim that financial accessibility requires all expense bars below zero. A separately labeled cash-movement/diverging view may be useful where its transformation is explicit; it does not rewrite source signs.

### UX11 — Notice changes explain the interruption

Show affected old/current fact, amount/date/source/version and the exact blocked command. Use Changed labels, a delta column and appropriate semantic emphasis; a payment reducing a balance is not inherently an error, so red is not mandatory on every changed number. Keep Review notice available; restrict affected approval/issue until necessary facts, audience and authority are reviewed.

A refreshed source snapshot is not evidence of legal validity, service or provider atomicity. Preserve earlier drafts and attempt histories. Do not invent process-server, issue-provider or webhook capabilities. If an issue outcome is unknown, apply UX08 to that logical command; unrelated preparation remains possible.

### UX12 — Readiness is a dependency checklist, not a false sequence

Display separate occupancy, construction, readiness, pricing, public-use media and publication states. Show owner, evidence, next action and blocker for each prerequisite. Pricing and media can progress in parallel; do not prescribe Construction → Media → Pricing → Publish as a universal mandatory sequence.

Scope/evidence comparison may lead to Accept handover or Return for correction. Required conditions must be satisfied or explicitly deferred under accepted authority; not every minor punch-list item necessarily prevents acceptance. Manual evidence can be valid if its asset/work association, author, date, version and approval are established. Lack of a Construction Manager push is not a universal ban on acceptance. The actual required conditions remain contract-specific. Acceptance does not publish a listing.

### UX13 — Owner decisions disclose prerequisites without blanket holds

Show scope/cost basis, decision-maker authority, documents and relevant funding/commitment/reserve/payable conditions. Contribution is one condition. A request can be prepared and a conditional approval recorded while release conditions remain open, if authorized; do not block all approvals solely because cash is unreconciled. Label **Approved · release conditions outstanding** where applicable. Available cash remains unverified until its accepted sources and definition are complete; NOI is not cash.

### UX14 — Media and marketing show the specific asset/channel

Replace oversized placeholder house art with compact, classified photo/file previews, captions, counts and manual carousel/list controls. Actual property media must come from authorized records; a generic image is never presented as an asset photograph. Preserve evidence photos separately from public-use selection.

Marketing rows identify unit/listing version and channel. Separate publication/connection status from inquiries, showings and application cohorts. A channel rejection shows the exact rejected field/version, supported correction and permitted retry. No unsupported publish/retry capability is implied by a button.

### UX15 — Safe efficiency tools preserve context

Inbox/work tables show accountable owner, response/work age, current state, linked record and next commitment. Preserve filters, selection, scroll and focus on Return to queue. Central Communication Queue remains the existing planned destination, with activation only after readiness; do not add a competing route.

Bulk controls appear on selection without replacing record identity. Preview per-record eligibility, audience/effect and counts; report per-item outcomes and reconcile partial/unknown results. No indiscriminate bulk assignment, dispatch, account mutation or notice send. Shortcuts are discoverable, optional/disableable, respect focus and never fire while typing in inputs/editors. Critical action cannot depend on a hover, color or gesture alone.

### UX16 — Operational timestamps and exports mean what they say

Show capability-level last verified evidence, last successful read/sync and last failure separately when those facts exist. Never invent “last seen 10 minutes ago” for an unbound provider. Report rows can download an authorized exact version directly, with a label/accessible name; download does not mark delivered. Investor/document/file permissions remain server-enforced.

### UX17 — Agreements change the work, not the navigation

Keep Leases navigation and all retained card tabs. Agreement type, signed terms and obligations choose relevant fields/playbooks: conventional renewal, option milestone, amendment or installment evidence as applicable. Do not universally ban renewal or permit remedies from a type label alone. Preserve effective roles and associations appropriate to each domain. Timeline remains attributed servicing events and Court remains sourced court records; their historic shared-panel issue requires current source verification before an implementation claim.

### UX18 — Integration assumptions stay outside workflow promises

ECC owns its canonical conversation identity and maps channel-specific provider/thread/message references to it. Do not try to thread inbound SMS into Microsoft Graph email conversation IDs as a prerequisite. Provider identity, actual send/read/status capabilities, permissions and retry rules need separate verification. Field evidence capture is not repair dispatch; owner approval is not universal project release. No advisor recommendation activates a connector, source write, webhook, portal approval or app handoff.

## 4. Disposition of every numbered finding

**Adopt** = incorporate the concrete correction. **Refine** = adopt the underlying goal with UX rules replacing overreach. **Existing requirement** = already specified; make it visible/testable, not a newly discovered runtime defect. **Reject premise** = do not apply the proposed prescription. These dispositions do not mean the implementation is complete.

| Finding | Decision | Consolidated instruction |
|---|---|---|
| GEM-01 | Refine | UX04/UX11: one primary decision; coordinate header/workbench. Do not manufacture an extra gold action from an incorrect equal-weight premise. |
| GEM-02 | Refine | UX12: show the actual missing prerequisite and owner; do not label every pending turn a red blocked state. |
| GEM-03 | Refine | UX10: distinguish overlapping financial subsets only where source associations support them. |
| GEM-04 | Reject premise | UX10: no mandatory negative expense bars or unsupported accessibility claim. Improve actual contrast and labels. |
| GEM-05 | Reject placement | UX06: restricted household/access details only where relevant and authorized, not a universal minor badge in the header. |
| GEM-06 | Refine | UX15: selection-aware, eligible bulk actions with per-item review/results; assignment does not mean dispatch. |
| GEM-07 | Adopt | UX14: distinguish unit/channel operation status from business funnel metrics. |
| GEM-08 | Refine | UX16: actual evidence/sync/failure timestamps; no invented timestamp or equivalence between last evidence and sync. |
| GEM-09 | Adopt | UX16: direct authorized exact-version download with an accessible label. |
| GEM-10 | Adopt clarity | UX09: proposal not accepted, posted balance unchanged by offering terms; severity is a design-risk assessment, not a proved live error. |
| GEM-11 | Refine | UX05: closing/cancelling is not discarding; separate and label actual destructive action and retain draft. |
| GEM-12 | Adopt | UX13: explain missing available-cash inputs and open their reconciliation detail. |
| GRO-01 | Refine | UX02/UX04: visible priority work and selection-aware primary, without removing/collapsing the default map. |
| GRO-02 | Existing requirement | UX05: server draft, saved/failure/concurrent states and return context; loss not demonstrated by static PDF. |
| GRO-03 | Refine | UX06: required audience in preview, purpose selection when needed; avoid extra mandatory dialog on every valid reply. |
| GRO-04 | Existing requirement | UX07: canonical work plus linked execution identity; matching/linking and concurrency proof. |
| GRO-05 | Refine | UX03: stable relevant controls, eligibility and selection; do not remove useful record actions solely because a current workflow differs. |
| GRO-06 | Adopt clarity | UX09/UX10: proposal subset is not additional AR, with no universal undisputed-only plan rule. |
| GRO-07 | Adopt | UX12: completion evidence, acceptance and marketing conditions visibly distinct. |
| GRO-08 | Existing requirement | UX08/UX11: immutable attempt and unknown state; no duplicate logical execution or return to unsent. |
| GRO-09 | Reject default collapse | UX02: preserve the prominent dashboard map; optional user preference can collapse it deliberately. |
| GRO-10 | Refine | UX15: labels identify actual filtered records/next task; never invent a city blocker count. |
| GRO-11 | Preserve boundary | UX15: use existing planned Communication Queue route plus scoped dock; no new competing route or silent activation. |
| GRO-12 | Adopt | UX14: meaningful classified asset media/list; no false property photos. |
| GRO-13 | Adopt | UX06: purpose-specific audience and inclusion reason in preview. |
| GRO-14 | Refine | UX04: useful neutral action on empty/partial scopes; no artificial urgent/disabled primary. |
| GRO-15 | Adopt clarity | UX08/UX18: handoff requested, acknowledged and execution states separated. |
| GRO-16 | Refine | UX15: consistent verb/object and scoped drill-down; selection and return retained. |
| CLA-01 | Adopt confirmed wording fix | UX09: Plan proposal, not accepted; accepted remaining terms need allocation evidence. |
| CLA-02 | Refine | UX08: shared attempt presentation with stage-specific outcomes; no blanket ban on independent draft preparation. |
| CLA-03 | Refine | UX06: Message… and purpose/audience by context, without universal minor/representation rules. |
| CLA-04 | Refine | UX07: consistent canonical identity and honest execution link, not a forced global SR prefix replacing actual provider IDs. |
| CLA-05 | Adopt | UX05: badges, single active mode, saved/failure/concurrent/permission states; preserve privacy on revoked access. |
| CLA-06 | Refine | UX03/UX04: scope-aware actions and transparent priority, no wholesale loss of useful creation/saved-view affordances. |
| CLA-07 | Refine | UX09: lifecycle and account effect; no universal undisputed-only or one-proposal policy. |
| CLA-08 | Refine | UX12/UX18: provenance/association/authority required; no universal rejection of manually verified evidence. |
| CLA-09 | Refine | UX13: per-decision conditions and conditional approval; release is distinct. |
| CLA-10 | Adopt label | UX06: explicit person role/capacity in relevant context; tint is optional and never sufficient. |
| CLA-11 | Refine | UX17: contract-specific fields/actions; no blanket prohibition from a type label. |
| CLA-12 | Adopt / preserve | UX15: owner/age/link columns and saved views; existing availability label correctly remains unchanged in conceptual review. |
| CLA-13 | Adopt | UX14: unit/listing-version/channel scope and meaningful media. |
| CLA-14 | Retain verification item | UX17: Timeline/Court separate semantics; historical source report not revalidated current implementation. |
| CLA-15 | Adopt direction | UX01/UX02: compact context and earlier useful map/work; first-fold improvement must be measured at real viewports. |

### Additional recommendations outside numbered findings

Do not adopt automatic icon-rail collapse; automatic dimming overlays; a fixed 48 px record header; a full-gold bulk header replacing identity; mandatory linear media/pricing gates; a guessed timeout threshold that permits retries; provider status chosen without evidence; universal approval freezes; or SMS-to-Graph threading. All are replaced by the relevant UX rule above. They are not new tasks for the advisors.

## 5. Correct full-navigation application register

The register below applies the consolidated design to every existing destination. It is a specification disposition, not a claim that all screens have been rendered or accepted. IDs follow the frozen plan, correcting Grok's shifted ranges. Planned destinations retain their availability flags.

| ID | Existing destination | Revision 1.2 design application |
|---|---|---|
| S01 | Command center | UX02–UX04, UX15: map/feed peers, scoped commands, transparent next work, retained analytics. |
| S02 | Properties | UX01–UX03, UX07: synchronized map/list, early location/work, stable selection. |
| S03 | Units | UX01, UX07, UX12: separate occupancy/readiness, meaningful blocker/owner, parent map. |
| S04 | Leases | UX06, UX09, UX17: typed terms, obligations and relevant lifecycle work. |
| S05 | Tenants | UX05/UX06: contextual capacities, privacy, drafts and correct audience. |
| S06 | Owners | UX06/UX13: authority, conditions, unverified cash detail and owner conversation. |
| S07 | Reports · Overview | UX03/UX16: scope/audience-aware catalog and actual output evidence. |
| S08 | Reports · Create | UX05/UX16: dirty/saved form, source/basis preview, explicit generate/deliver separation. |
| S09 | Reports · Saved | UX16: exact-version download, manifest and independent delivery state. |
| S10 | Reports · Templates | UX03/UX16: version/diff/review; retirement does not rewrite outputs. |
| S11 | Operations | UX04/UX07/UX15: accountable queue, dependencies, stable resume. |
| S12 | Case Manager | UX08/UX11/UX17: affected facts, immutable attempts and distinct matter context. |
| S13 | Advanced Legal Ops | UX08/UX11: reconciled attempts and review ownership. |
| S14 | Legal Docs | UX08/UX11/UX16: exact originals/versions, issue versus service and authorized preview. |
| S15 | Attorney Reports | UX08/UX16: packet/version/audience, actual delivery/acknowledgment. |
| S16 | Work Orders | UX07/UX08/UX12/UX15: intake/execution identity, reviewed scope/access, evidence and eligible bulk work. |
| S17 | Vendors | UX03/UX12: qualification/capacity evidence and assignment eligibility. |
| S18 | Materials & Inventory | UX07/UX15/UX18: actual stock owner, source movements and bounded selection actions. |
| S19 | Smart Routing | UX02/UX08/UX18: route suggestion, access constraints and separate dispatch/acknowledgment. |
| S20 | AI Intelligence | UX04/UX18: findings explain evidence and next human decision, no automatic completion. |
| S21 | Build/Repair Projects | UX07/UX12/UX18: linked scope/work/provenance and handover. |
| S22 | Capital Projects | UX12/UX13: decision conditions, funding/authority and operations release. |
| S23 | Tenant Ledgers | UX03/UX09/UX10: selected-account commands and posted/proposed separation. |
| S24 | Accounting · Overview | UX10/UX13: period/basis, non-additive facts and actual reconciliation. |
| S25 | Rent Collection | UX06/UX08/UX09: authorized contact, actual payments/allocations, provider handoff. |
| S26 | Expenses | UX10/UX13: invoice/posted/commitment distinction and meaningful sign. |
| S27 | Financial Reports | UX10/UX16: basis/period/source reconciliation and exact version. |
| S28 | Collections Dashboard | UX09/UX10/UX15: aging with overlapping flags and accountable servicing queue. |
| S29 | Collections Log | UX05/UX08: one attributed history and preserved attempts. |
| S30 | Payment Plans | UX09: proposals, offers, accepted terms, actual allocations and cancellation history. |
| S31 | Deposits | UX10/UX13: liability and evidence-backed disposition, distinct from cash/income. |
| S32 | Transfers | UX03/UX08/UX13: authority/impact, explicit command and reconciliation. |
| S33 | Subsidized Housing | UX06/UX17: role/agency purpose, distinct obligation types and verified dates. |
| S34 | Assistance Programs | UX06/UX09: application/award/receipt distinct and purpose-scoped communication. |
| S35 | Vacancy review | UX02/UX12/UX14: location, readiness blockers and approved marketing. |
| S36 | Renewal planning | UX06/UX17: type/terms-specific review and communication. |
| S37 | Risk Summary | UX04/UX18: explained facts/uncertainty and human review. |
| S38 | ML Leasing Logs | UX16/UX18: actual input/output/version evidence, no invented deployed capability. |
| S39 | Communication · Templates | UX06/UX16: purpose, variables, exact reviewed version. |
| S40 | Communication · Queue | UX05–UX08/UX15: central inbox, sender/owner/age, scoped draft and linked work. |
| S41 | Communication · Logs | UX08/UX16: acceptance/delivery/unknown separate with real timestamps. |
| S42 | Data Hub · Overview | UX03/UX16: identity/classification conflicts and accepted count bridge. |
| S43 | Sync Audit | UX16: run/entity/page evidence and actual timestamps. |
| S44 | Sync Management | UX08/UX16/UX18: bounded recovery; no blind command replay. |
| S45 | Raw Data | UX06/UX16: permission-scoped immutable payload/lineage without secrets. |
| S46 | Sync Logs | UX08/UX16: sanitized correlation and actual outcome history. |
| S47 | Data · System Settings | UX03/UX16/UX18: authorized versioned diff and change scope. |
| S48 | Integrations | UX08/UX16/UX18: capability-level binding, evidence and recovery. |
| S49 | Workspace preferences | UX02/UX05/UX15: explicit density/dock preferences, no navigation/brand mutation. |
| S50 | Automation | UX03/UX08/UX18: simulated bounded effect, explicit authorized activation and recovery. |
| S51 | Dropbox Files | UX06/UX16: exact-version registry, permissions and actual custody receipt. |
| S52 | CoreLogic / MLS Grid | UX02/UX16/UX18: address match, licensed sources and explicit fetch cost/authority. |
| S53 | Field App Link | UX08/UX12/UX18: capture/proof, acknowledgment and acceptance separately. |
| S54 | Deal Room Link | UX07/UX16/UX18: verified IDs/purpose/permissions and actual handoff state. |
| S55 | Marketing | UX08/UX12/UX14: unit/listing/channel scope and meaningful media/funnel. |
| S56 | Investor · Dashboard | UX02/UX06/UX13: authorized holdings map, sourced performance and decisions. |
| S57 | Investor · Portfolio Analytics | UX10/UX13/UX16: scoped basis, valuation/debt dates and no guessed cash. |
| S58 | Investor · Financial Reports | UX06/UX16: reviewed authorized exact versions and delivery evidence. |

## 6. Retained tab application

All 33 tab identities and sequences remain. Apply UX01/UX03–UX06 to record identity, commands, draft/audience and selected scope across tabs. Property Overview keeps the required map; the unit retains parent-map context; owner maps are authorized holdings only.

| Family | Retained tabs | Specific corrections |
|---|---|---|
| Property | Overview / Financials / Legal / Files | Earlier map/work; UX10/UX13 financial basis/conditions; UX08/UX11 matters; UX14/UX16 evidence/media/custody. |
| Unit | Overview / Related / Financials / Legal / Files | UX12 independent readiness; effective links; typed cost/obligation; UX11 matter evidence; UX14 classified photos/marketing. |
| Lease | Overview / Related / Financials / Legal / Files | UX17 agreement-specific work; effective capacities; UX09 proposals/allocations; UX08/UX11 notice attempts; signed originals/amendments. |
| Tenant | Overview / Related / Financials / Legal / Files | UX06 purpose/capacity; historical relationships; shared obligations once; authorized matters and permission-scoped documents. |
| Owner | Overview / Related / Financials / Legal / Files | UX13 authority/conditions/cash basis; effective interests; related matter access; versioned ownership/management evidence. |
| Legal | Overview / Timeline / Documents / Judgment / Tasks / Correspondence / Court / Packet / Audit | UX11 changed facts; attributed history distinct from docket; exact versions; sourced judgment/projection; accountable tasks; UX06 audience; packet manifest/delivery; UX08 immutable attempts. |

## 7. Next visual review: concrete scenes and acceptance

Prepare one consolidated revision rather than soliciting new renderings from advisors. Start with these linked scenes and carry the same components through all page families:

1. **Dashboard at 1440 and 1920:** map and priority work both visible; selection changes the scoped primary; all recovered intelligence remains discoverable.
2. **Fourplex property and SFR at 1440/1024/390:** compact identity, earlier map, unit/household context, meaningful quick actions and a dock that opens by intent.
3. **Account and plan:** $1,200 posted / $200 disputed / $1,000 proposed, followed by a $500 source receipt and revalidation, with no invented allocation.
4. **Notice interruption and unknown issue outcome:** exact changed fields, reviewed version, immutable attempt and scoped reconciliation, while harmless preparation remains available.
5. **Property message:** purpose/audience inline; non-obligor access contact; draft saved/failure/concurrent/permission states; no redundant confirmation dialog.
6. **B2 handover and listing:** source/provenance, parallel pricing/media checks, reviewed acceptance and per-channel actual outcome.

For a first-screen claim, record viewport width **and height**, shell state, scroll position and text sizes. For a speed claim, compare observed task completion and errors using the same task/data/permissions; static click estimates are hypotheses. A preview is not persistence or provider proof. Runtime acceptance still requires the source/interaction/database/reload evidence in the full plan.

## 8. Delivery status

Reviewed the three supplied responses; consolidated all **43 numbered findings** and the significant unnumbered proposals; corrected the navigation coverage; and incorporated the resulting direction into proposed Full Recovery and Build Plan revision **1.2**. At the original consolidation checkpoint, no new renderings, repository edits, deployments, database changes, provider calls or advisor messages were performed. The subsequent documentation-only repository publication does not implement or approve these designs. Design 05 remains a prior conceptual reference, not an approved final UI.
