# ECC U01 company workspace — corrections

**PR:** #190  
**Branch:** codex/ecc-u01-owner-company-switcher-and-member-portal-20261030  
**Head:** after corrections  

## Fixes
1. Page-local CSS is imported from CompanyWorkspace.tsx.
2. selectCompany fails closed: denied or missing returns selected: null. Incoming selectedId that is denied is not rendered.
3. load accepts AbortSignal. Unmount/replacement aborts and increments epoch. Late resolve/reject from an older context is discarded. Selection is cleared at the boundary.
4. Display model keeps personal account, management customer, owning company and membership separate. companyId is not a cross-customer key.
5. Tests cover fail-closed selection, primary-without-powers, unbound unavailable, CSS import, and AbortSignal acceptance.

## Limitations
- SSR does not execute effects; settled UI is proven by pure helpers and source assertions, not by a live browser render of the ready state.
- 390px viewport resize remains unsupported by available browser tooling. Source CSS declares the wrap; measured acceptance is not claimed.
- No live owner access. Adapter remains unbound.

## Rollback
Revert the correction commits on this branch.
