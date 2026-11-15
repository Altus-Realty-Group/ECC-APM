# L4 evidence linkage: implementation acceptance

Status: proposed design, source inspection only. No live or reconstructed SQL
proof is claimed by this document. See ADR-0004-matter-document-version-linkage.

## Existing sources and missing capabilities

| Fact | Canonical source | Boundary |
| --- | --- | --- |
| Matter, requirement and evidence identity | L1 legal_cases / legal_evidence_refs / legal_evidence_requirements | Matter scope is independent of document access |
| Document and immutable version | D1 document_records / document_versions | Never derive from storage_ref or filenames |
| Property UUID and numeric identity | Same properties row: id_uuid and id | Verified join, no suffix cast or inferred pairing |
| Owner agreement coverage | D1 document_property_links plus property_owners | Exact document-owner-property association |
| Delivery evidence | D1 latest append-only receipt plus bytes checked by size and SHA-256 | Offline COPY ONLY reconciliation is not a receipt |
| Confidence | L1 evidence confidence | Does not verify a court order or satisfy a requirement |
| Open/satisfied/waived status | L1 requirement | Attaching a file cannot change status; any L6 resolved mapping must explicitly preserve source meaning |
| Assigned actor / court source dates | Future accepted producer | No assignment columns or court-date producer inferred from requirement status |
| Packet version manifest | Private immutable-version metadata helper | Hash is neither authority nor completeness |

## SQL and contract acceptance

The additive proposal follows ADR-0004 and the corrected combined reconstruction;
ORM declarations are not schema authority. It is a separately reversible follow-up
to the unchanged 001/D1/002 proposals. Exact FK/index/trigger custody requires
review before implementation. No live DDL or new grants/policies are authorized.

| Required case | Expected proof |
| --- | --- |
| Existing legacy refs | All new fields null; no storage_ref parsing or row rewrite |
| Direct INSERT with bound/withdrawn fields | Refused; no insert-path journal/revision bypass |
| Valid attachment | Exact registered version, expected revision, required actor and transaction journal |
| Unknown version / wrong requirement matter | FK/composite-matter refusal, no row/journal change |
| Duplicate version for same matter | Exact replay is no-op or explicit conflict; never duplicate rows/events |
| Same version in different matters | Independent refs, independently authorized |
| Retarget existing attachment / reassigned matter | Refused, no evidence or journal mutation |
| Withdraw | Explicit actor and expected revision; exactly one event; no delete/implicit restoration |
| Restricted attachment/withdrawal journal events | Existing evidence-subject mask retained/extended; no hidden IDs or event counts leak |
| Confidence updates | Existing guard and journal protocol retained |
| Concurrent attach / retry / reply loss | One durable result; fresh key cannot duplicate an unresolved write |
| Rollback with bound or withdrawn refs | Refused without changes; no document/version/journal loss |
| Empty rollback | Removes only objects introduced by the follow-up |
| Schema shadows / temp relations | Only qualified, verified public objects changed |

The source-only writer command is unavailable until real write authority is
accepted. SQL integrity proof cannot stand in for current-session/resource proof.

## Protected reader and UI acceptance after model acceptance

| Required case | Expected outcome |
| --- | --- |
| Matter allowed, document denied (or reverse) | Denied; no metadata, count, cursor or bytes |
| Same company scope, unrelated property | Denied; scope equality does not create an association |
| Owner document for another property | Denied even when owner is readable |
| Missing numeric/UUID join / unsafe bigint | Denied or unavailable, never guessed target |
| Restricted or financial-tax missing either permission | No searchable metadata or leaked hidden counts |
| Withdrawn / unbound / retired record | No downloadable evidence; fixed non-identifying outcome |
| Pinned version no longer current | Stale/unavailable; never silently replace version |
| Latest delivery failed after earlier verified | Withhold; no stale receipt fallback |
| Corrupt bytes, digest, size or identity mismatch | Conflict/unavailable, no download |
| Grant, mapping or classification revoked mid-read | Withhold after final reauthorization |
| Authority expires during final store/provider read | Withhold before delivery |
| Session changes or denial elsewhere in UI | Existing purge/epoch protection clears prior evidence |
| Journal listing/search/count | Same matter/document/classification intersection, including attachment/withdrawal events |
| Required exhibit inaccessible | Packet cannot be complete; no restricted reason details |

UI retains the simple ownership/property layout and public evidence confidence.
Document links remain disabled until the protected transport is actually bound.
No public Dropbox links, provider paths, real names or operational payloads belong
in source fixtures. Court verification, assignment, requirement satisfaction and
collection eligibility each require their own authoritative record.

## Release boundary

Authoritative grants, scope mappings, installed RLS/runtime role, reviewed apply
and backfill, authenticated provider observations, mounted transport and allowed/
denied/revoked live journeys remain separate gates. This design does not remove
any gate or authorize deployment. Revert this documentation PR to roll it back.
