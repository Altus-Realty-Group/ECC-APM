# Native legal read UI

The register and matter card consume L1 matter/award identities through the L6
`consumeProjection` boundary. Production remains unbound. This is frontend source
integration, not live authorization, installed schema or an accepted producer.

Operator: ECC legal staff reviewing matters, award verification, open assignments
and source evidence. Register routes and the shared shell/session cache are reused.

| Input or event | Source and state | Visible result | Persistence |
| --- | --- | --- | --- |
| Ready matter read | Adapter, validated L1/L6 projection | Native lifecycle, docket and court references | Read only; refresh re-reads adapter |
| Awards | Validated award identities | One row per award, currency, exact cents, unknown distinct from zero | No calculated balance or write |
| Requirements | L6 requirement queues | Open, assigned and unassigned filters; actor and source date | Local filter only |
| Search | Register input | Docket, case type, court and lifecycle match | Cleared on session context change |
| Evidence | L6 sanitizes before cache/search/count | Explicitly public names and per-reference confidence | No URL delivery or download |
| Court events | L6 source dates and actors | Unknown dates stay unknown; no deadlines calculated | Read only |
| Denial/session change | Existing query/session boundary | Prior rows cleared; old response withheld | Existing shared behavior retained |
| Conflict/missing/stale | Explicit read outcomes | Separate notices; conflict has no trustworthy rows/counts | No fallback fixture |

Duplicate matter identities and award identities across matters reject the whole
register. A detail response for a different requested matter is also a conflict.
Raw unavailable/error details are replaced with fixed notices. Joint obligor counts
never multiply award values. Integer cents are formatted without floating-point
rounding, including the maximum safe integer amount.

Award readiness is not collection approval. The L5 ledger, reconciliation and
eligibility sources are not bound; no outstanding balances are synthesized.
Matter-to-document authorization and verified version delivery remain unbound;
packet, correspondence and audit sections retain explicit unavailable notices.
Captions and creditor names are not invented from identifiers. Docket number is
used as the heading when supplied; otherwise the matter identifier is shown.

Proof: unit coverage exercises wrong-matter responses, duplicate awards, restricted
metadata, multiple awards, zero/null and maximum cents, requirements and court
sources. The isolated browser harness covers 390/1440 widths, navigation, refresh,
keyboard tabs, search/queues, conflicts, denial/session clearing and public evidence.
Fixture proof is not live acceptance. No schema, runtime target or provider is changed.
