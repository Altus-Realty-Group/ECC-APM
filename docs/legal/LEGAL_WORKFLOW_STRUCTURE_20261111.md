# Legal workflow structure — L6

**PR:** draft from grok/ecc-legal-workflow-structure-20261111  
**Base:** 5fb91423fc8cb41c972de96b5291a044c3a3ed04 (PR223)  
**Issue:** #219

## Projections
Pure read projections under shared/legal/workflow/. Not an accepted producer contract.

- publicEvidence: filters restricted evidence before search/count. Unauthorized results expose no restricted filenames, IDs or URLs.
- missingRequirements: open requirements with no assigned actor. "Request to" text is not an actor.
- courtEventsWithSource: preserves source and responsible actor. Missing date stays unknown. No deadline is calculated.
- verifiedAwardCount / unknownAwardCount: deduplicate by award identity. Unknown amount is not zero.

## Mapping for Codex
Card sections consume these projections. Unavailable, missing, denied, stale and conflict states remain explicit. Dimensions (lifecycle, verification, readiness, confidence) stay separate.

## Missing producer
No accepted legal producer exists. Projections are unbound until Claude/Codex accept a contract.

## Rollback
Revert the workflow commits on this branch.
