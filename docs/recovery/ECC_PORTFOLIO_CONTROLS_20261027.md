# Portfolio list controls — Tenants and Owners labeled search

**Branch:** grok/ecc-portfolio-controls-20261027  
**Base:** main c0939cf39c4e5f67b52b2d2e6b51f79b2d62451e  
**Campaign:** #171  
**Linked:** PR176 (Leases search, frozen)

## Problem
Tenants and Owners used shared FilterBar, which provides only a placeholder and no accessible label. Units already has labeled filters; Properties uses the command surface.

## Correction
Page-local labeled search controls (`htmlFor` / `aria-label`, 44px, gold focus) replace FilterBar on Tenants and Owners. Filter behavior is unchanged. Shared FilterBar was not edited. Leases was not touched.

## Limitations
Success-path browser interaction requires a settled collection. 390px viewport resize is unsupported by the available browser tooling. No live acceptance.

## Rollback
Revert this branch.
