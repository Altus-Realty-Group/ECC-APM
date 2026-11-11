# Legal workflow structure — L6 v2

**PR:** #230  
**Branch:** grok/ecc-legal-workflow-structure-20261111  
**Parent:** 5fb91423fc8cb41c972de96b5291a044c3a3ed04

## Corrections
1. Whole projection is validated against its matter. Wrong-matter children, duplicate IDs and malformed L1 dimensions are rejected as conflict.
2. Evidence is default-deny. Only explicitly unrestricted evidence is returned. Restricted evidence is filtered before search/count/metadata.
3. All open missing requirements are kept, including assigned ones. Unassigned is a separate subset. Request-recipient wording is not an actor.
4. Unknown award counts are deduplicated by identity. Unknown amount remains unknown, not zero.
5. Court dates are validated as ISO. Unknown dates stay unknown. No deadline is invented.
6. Outcomes model unavailable, missing, denied, stale and conflict.

## Missing producer
No accepted legal producer exists. Projections remain unbound.

## Rollback
Revert the correction commits on this branch.
