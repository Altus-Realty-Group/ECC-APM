# Legal workflow projection boundary

Source-only, unbound; no accepted legal producer or live access is established.
PR #230 remains stacked on the native legal foundation.

`consumeProjection(unknown)` is the consumption entry. It accepts a raw
projection or an explicit ready/nonready outcome and returns only whitelisted
fields. Every collection and row is narrowed before access. L1 matter/award
parsers enforce dimensions, revision, money and obligors. Normalized amount
objects and wire amounts are reconciled explicitly: conflicting representations
are rejected, not selected by null-coalescing. Null stays unknown; zero stays zero.

Wrong-matter children, duplicate IDs, malformed nullable fields, unsafe evidence
URL schemes, impossible dates and invalid identities yield a generic conflict
without source IDs, filenames, URLs or reasons. Calendar validation handles leap
years without coercing array/object values to dates. Snapshot asOf accepts null,
a real ISO calendar date or a valid UTC RFC3339 timestamp.

Missing/malformed evidence classification is restricted. Only an explicit
`restricted === false` may enter the ready projection. Filtering happens in the
boundary itself before counts or search consumers, not in an optional later
helper. Output is copied so subsequent source mutation cannot modify it.

Ready includes summary counts computed from that sanitized projection: public
evidence, open requirements, unassigned open requirements, unknown award amounts
and verified monetary awards. All open requirements remain present, including
assigned ones; request-recipient wording is never promoted to an actor. Missing,
denied, unavailable, stale and conflict outcomes discard unrelated payload fields
and private source diagnostics. The default producer remains unbound.

Compatibility helpers validate their inputs. Identical repeated awards are
counted once by the legacy count helpers; conflicting repeated awards are
rejected. Whole-projection duplicate identities are rejected in accordance with
the L1 projection boundary. Helpers do not create awards, money or deadlines.

Local proof: 21 focused cases, including classification normalization, actual
nonready execution, malformed collection/row matrices, normalized/wire money,
privacy, source-mutation isolation and real calendar cases. Four deliberate
mutations (classification default, output masking, conflicting money and denied
payload echo) are caught by assertions. Full checks are reported on the reviewed
source head; no PostgreSQL or live-producer claim follows from this slice.

Rollback: revert the boundary correction source commit. No database, provider,
operational document, shared shell or UI state was changed by this work.
