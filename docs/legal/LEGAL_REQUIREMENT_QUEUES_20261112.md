# Legal requirement queues — L6

**Branch:** grok/ecc-legal-requirement-queues-20261112  
**Base:** 34875e934ff0223f67bf537a514114af3b14bdbf (PR230)

## Queues
Pure projections. Accept unknown input through consumeProjection. Do not weaken validation.

- open: all open requirements, including assigned
- assigned: open with an assigned actor
- unassigned: open with no assigned actor
- byActor: grouping of assigned by actor

Resolved requirements are excluded. Counts agree with unique requirements. sourceDate is a source date. Unknown stays unknown. No deadline, overdue, priority or actor is invented. Request-recipient wording is not an assignment.

Unavailable, missing, denied, stale and conflict remain distinct from a ready empty queue. Raw errors and restricted evidence metadata are not exposed.

## Rollback
Revert the queues commits on this branch.
