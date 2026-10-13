# R1-G Recovery Source Access Gap

Lane: R1-G V1  
Date: 2026-10-13  
Status: Dropbox recovery sources unavailable from this environment.

The assigned Dropbox folder (https://www.dropbox.com/scl/fo/cclt4ic22siuc1wc49ob6/ANA-ZHqnd5YuOG79gD28Dl0?rlkey=t87tjru886duu8l3078p1z81l&dl=0) requires authentication. Browser and open_page both returned a signup/login wall. No recovery export contents were inspected.

## Current code inspected (seed head e6f397fed9737b301b1bcfdbf90358e40e58a795)

Entity card modules under src/pages/card/{property,owner,tenant,lease,unit}/ contain:
- index.tsx, Tabs.tsx, Overview.tsx, Details.tsx, Financials.tsx, Linked.tsx, Legal.tsx, Files.tsx, Activity.tsx, HeroBlock.tsx, RightRail.tsx, CardParts.tsx

Dashboard under src/features/dashboard/components/ contains:
- KpiCard.tsx, KpiTicker.tsx, FinancialSnapshot.tsx, FinancialsAndLeasing.tsx, OccupancyBreakdown.tsx, OccupancyByCity.tsx, LeasingFunnel.tsx, ActionCenter.tsx, PriorityActionFeed.tsx, PortfolioGoogleMap.tsx, ChartContainer.tsx, Sparkline.tsx, TrendIndicator.tsx, ActionButton.tsx

## Exact recovery files needed to proceed

From the three named exports (AltusCommand3, EmpireCommandCenter1, EstateCommand2), the following are required for comparison and selective port:

1. Entity card implementations (especially richer tabs, linked entities, financial panels):
   - Any *Card*.tsx / *card*/** under client/src or equivalent for property, owner, tenant, lease, unit
   - Specifically: Overview, Financials, Linked, Tabs, Hero, RightRail variants that show richer presentation than current

2. Dashboard widgets and pages:
   - Dashboard page and components that render KPI strips, financial snapshots, occupancy, leasing funnel, action center
   - Chart components and data adapters used by those widgets

3. Supporting styles or shared card primitives that are not already in current architecture (to be scoped under src/components/recovery if ported)

Without these files, no provenance comparison or selective port can be performed. Current modules remain the baseline. No mock data or invented metrics will be introduced.

## Next action

Provide Dropbox access (share link that does not require login, or export the relevant card/dashboard files into the repository or a reachable location) so the bounded vertical slice can be selected and implemented.
