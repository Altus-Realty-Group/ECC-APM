# ECC U01 company workspace — frontend display model

**PR:** #190  
**Branch:** codex/ecc-u01-owner-company-switcher-and-member-portal-20261030  
**Status:** Proposed display model. Not an accepted backend API.

## Separation
Personal account, management customer, owning company, membership, economic interest and resource permissions are distinct. This slice displays membership and explicit grants only.

## Roles
- primary: company contact. Does not grant member administration, financial approval or banking.
- viewer: read-only membership.
- denied: no access. Selection is rejected.

## Adapter
`unboundCompanyWorkspaceAdapter` returns a truthful unavailable state. No operating companies are hardcoded. Fixture adapters are for tests only.

## States
loading, empty, unavailable, denied, error, ready (with optional stale/partial). Late responses after a context change are rejected by epoch.

## Rollback
Revert the company-workspace commits on this branch.
