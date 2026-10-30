# ECC U01 company workspace — context and request lifecycle

**PR:** #190  
**Branch:** codex/ecc-u01-owner-company-switcher-and-member-portal-20261030  

## Fixes retained
- Page-local CSS import.
- selectCompany fails closed on denied/missing.

## Additional fixes
1. WorkspaceContext carries sessionEpoch (from useSessionEpoch) and customerId. Loaded data and selection are bound to that context. A same adapter object does not establish the same session/customer. companyId is not a cross-customer key.
2. Active AbortController is held in a ref. Replacement, retry, context change and unmount abort the current request and increment the epoch. Late success and late error from a superseded context are discarded.
3. Denied-company names are omitted from the list. No discovery contract authorizes disclosure.
4. Primary contact confers no permissions. Explicit grants are preserved.

## Proof
- Unit tests: 6/6 pass (fail-closed selection, primary-without-powers, unbound unavailable, CSS import, context+signal, denied omitted).
- Typecheck: pass.
- Mounted react-test-renderer harness is not in package.json. Requested Codex patch: add react-test-renderer@18.3.1 as a devDependency so session-boundary and retry-abort mounted tests can run. Until then, mounted proof is not claimed.

## Limitations
- Source CSS 44px rules are not measured 390px or browser acceptance.
- No live owner access. Adapter remains unbound.
- Mounted lifecycle tests require the requested test-renderer dependency.

## Rollback
Revert the context/lifecycle commits on this branch.
