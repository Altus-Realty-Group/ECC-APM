# Field binding recovery sheet

Baseline: `bae05740`. Source evidence only. This sheet accompanies the whole-app UI plan; it does not authorize backend activation or silently widen access.

## Existing accepted frontend card shapes

Source: `src/shared/card-contracts.ts`; reader calls in `src/lib/ecc-resolvers.ts`. “Accepted” here means declared parser shape, not accepted live producer. Unknown object fields are stripped, which explains why adding an upstream field alone cannot fill a card.

| Card | Exact accepted paths | What the current shape cannot populate |
|---|---|---|
| Property | `property.id`, `.name`, `.type`, `.address.line1`, `.address.city`, `.address.state`, `.address.zip`; `kpis.units`, `.activeLeases`, `.occupancyPct`, `.avgRentCents` | Reported property status, asset photo, owner/units arrays, contact roles, parcel/APN, coordinates, condition, activity, dates, posted financial history |
| Unit | `unit.id`, `.unit_label`, `.status`; `property.id`; `lease.id`, `.status` | Physical dimensions, rents, property display/address, all tenants, inspection/make-ready/work facts |
| Lease | `lease.id`, `.status`, `.rent_cents`; `unit.id`; `property.id`; `tenant.id`, `.display_name` | Start/end, deposits, amendments, all parties/guarantors, balances/payment history, property/unit labels |
| Tenant | `tenant.id`, `.display_name`; `leases[].id`, `.status`; `activeLease.id`, `.status` | Email/phone/contact preference, move-in/out, reported tenant status, posted balance, payment metrics, work and correspondence |
| Owner | `owner.id`, `.display_name`; `properties[].id`, `.name` | Legal/company/contact/address/status, dated ownership/share, unit/rent KPIs, agreement coverage, statements/distributions |

Server source in `server/routes/rpc.ts` emits unit `label` rather than `unit_label`, and lease `rentCents`, `start`, `end` rather than the parser's rent name/date shape. Fix by an explicit versioned mapping and tests. Do not make schemas passthrough or spread raw provider objects into components. Owner lookups using legacy `owner_id`/`ownerid` need replacement with verified relationship evidence. Backend code presence is not permission to mount it.

## Display-field groups and required binding decisions

Each named group below is required by the target page/card specification. A field absent from an accepted reader stays pending in its own visual region; the requirement is not removed.

| Group ID | Required fields | Grain / units / semantics | Principal display / click |
|---|---|---|---|
| F01 Asset identity | Internal property ID, UUID bridge, provider source ID, name, full address, type, explicit status | One property; ID families remain distinct; provider ID is a crosswalk | Property register/title; → property card/source |
| F02 Location/parcel | Verified latitude/longitude, geocode/source/confidence, city/state/ZIP, APN/parcel, assessor link | One verified property observation; no manufactured coordinates | Map, city table, property rail; → exact property/assessor |
| F03 Ownership | Owner ID, verified company identity, property ID, effective start/end, share/capacity if recorded | One ownership relationship; many owners/properties allowed | Ownership groups, Related, agreements; → owner/property |
| F04 Unit physical | Unit ID/property ID, label, beds, baths, floor area/unit, floor/type/features where sourced | One unit; missing dimensions stay unknown | Unit register/card; → unit/property |
| F05 Unit operating | Reported status, status observation date, inspection condition, readiness decision/evidence, assigned work | Separate status/condition/readiness; not rent-derived | Inventory/readiness panels; → unit/work/inspection |
| F06 Tenancy | Lease ID/property/unit, all tenant/guarantor IDs, role/capacity, temporal occupancy links | Explicit relationships; no one-lease-one-unit assumption | Lease/Tenant/Related; → linked cards |
| F07 Lease terms | Status, start/end, executed date, monthly rent/currency/frequency, deposit terms, amendment identity | Dates retain business meaning; cents are not raw dollars | Lease/renewal/rent-roll; → executed version/lease |
| F08 People/contact | Name, legal/entity name, email, phone, address, preference, role/source | Restricted contacts; no public or cross-party leakage | Owner/Tenant/contacts; → approved draft/contact action |
| F09 Portfolio scope | Total included properties/units, excluded/unknown count, company/property filter, observation time | Scope and coverage travel with totals | Header/KPIs/report caption; → filtered register |
| F10 Occupancy | Occupied units, eligible total units, unknown/excluded units, fraction, date/history | Definition must be reconciled; lease coverage separately labelled until corrected | Ring/history/city bars; → exact included units |
| F11 Rent roll | Contract rent, market rent, effective period, explicit active status and attributable unit/lease | Monetary basis/currency; market is not collected cash | MRR/rent roll/cards; → lease/unit |
| F12 Posted ledger | Entry ID, posted/effective date, lease/tenant/property, type, memo, integer amount/currency, source/reversal | Charges/payments/credits/adjustments distinct; no generated charges | Ledger/balance/history; → transaction/source |
| F13 Expenses/NOI | Bill/expense ID, vendor/property, operating category, period/basis, income/expense totals, reviewed NOI | Same period/currency/accounting basis, reconciled totals | Finance chart/owner/property; → expense/report |
| F14 Deposits/owner finance | Deposit liability/movements, owner allocation/share, fees, contributions/distributions, statement period/version | Liabilities are not revenue; allocations explicit | Lease/Owner Financials; → posted entries/statement |
| F15 Collections | Due population/amount, posted receipts/credits, exclusions, rate definition and period | Numerator/denominator/cohort match; unknown is not 0% | Collections KPI/queue; → tenant/lease/posted receipt |
| F16 Leasing activity | Lead/tour/application/approval/signature event ID/time/status and originating record | Actual events, deduplicated cohort/period; transitions not assumed | Funnel; → stage register/source |
| F17 Work/condition | Work ID, property/unit, description, priority, status, actor/vendor, scheduled/actual date, estimate/actual cost, evidence | Explicit business records; local review selection is not assignment | Action feed/work queue/card; → detail/evidence |
| F18 Renewal workflow | Source end date, planning date/window, responsible actor, review/offer/decision, actual notice/amendment | Date buckets are calculations; notice requirements are separate governed rules | Horizon/renewal tab; → lease/draft/amendment |
| F19 Matter | Matter UUID, scope, court, docket, case type, lifecycle, revision, property/party links | Native legal matter; separate dimensions | Legal register/overview; → matter/linked card |
| F20 Award/obligors | Award ID/matter, kind, amount/currency or explicit null, verification, creditor, obligors/capacities, revision | Joint award counted once; null ≠ zero | Judgment/packet; → award evidence/ledger |
| F21 Judgment ledger | Entry ID/sequence/type/amount/currency/evidence, reversal, reconciliation/fingerprint/as-of, approval | L5 rules; no wall-clock expiry invented for business as-of | Judgment balances/eligibility; → exact supporting entries |
| F22 Requirements/court | Requirement ID/status/assigned actor/source date; event ID/date/source/actor | Source date not deadline; request recipient not assigned actor | Tasks/court/upcoming queue; → matter/evidence |
| F23 Documents | Document ID/version ID/target links, title/type/section, class, revision/hash/size, delivery receipt, recorded date | Immutable versions; names/folders not identity; receipt not permission | Files/preview/packet; → authorized exact bytes |
| F24 Evidence bindings | Evidence ID/matter/requirement, immutable version, confidence/restricted/withdrawn state/revision | L4 binding, explicit withdrawal; no storage_ref parsing | Evidence/packet; → exact permitted exhibit |
| F25 Messages | Template/message ID/version, record context, approved recipient/content, provider state, delivered/failed times | Draft/download/send/delivery are distinct | Communications; → message/evidence |
| F26 Report output | Report/layout version, source scope/as-of/period, creator, output ID/version/classification, delivery/receipt | Immutable issued output; download time not source freshness | Saved/owner/investor report; → exact output |
| F27 Audit/activity | Event ID/subject, actor, business/event time, action, revision/delta, evidence link, restricted mask | Append-only source events; absence of reader not empty activity | Activity/Audit; → source/evidence |
| F28 Capture/data quality | Account/resource admission, request/run/page/revision, custody, reconciliation/coverage/errors and source age | Installed capture ≠ complete portfolio; Imported/Working/Reconciliation distinguish observations and accepted facts | Data Hub/integration status; → bounded diagnostic evidence |

## Proof before a binding is called working

For each implementation, append exact source contract/column and adapter path, cardinality, permission, unit/date definition, normal/unknown/zero/boundary fixture, real-data reconciliation where authorized, component ID, and destination ID. The binding is incomplete until a real supplied value survives **source → authorized reader → parser → selected page/card/tab → chart/summary → refresh**, and denial/session replacement removes it everywhere.

Current source API paths are catalogued separately; no new path is invented here. A missing producer is an explicit delivery dependency, not a reason to remove a component or show fabricated data.
