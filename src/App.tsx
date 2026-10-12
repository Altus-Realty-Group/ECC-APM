import React, { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import Sidebar from "./components/Sidebar";
import { ToastContainer } from "./components/ui/ToastContainer";
import { DevErrorBanner } from "./components/DevErrorBanner";

/**
 * IMPORTANT:
 * These imports point at the V3 pages that already exist as folders with index.tsx.
 * Example tree:
 *   src/pages/portfolio/properties/index.tsx
 *   src/pages/portfolio/units/index.tsx
 *   src/pages/portfolio/leases/index.tsx
 *   src/pages/portfolio/tenants/index.tsx
 *   src/pages/portfolio/owners/index.tsx
 */
import PropertiesPage from "./pages/portfolio/Properties";
import UnitsPage from "./pages/portfolio/Units";
import LeasesPage from "./pages/portfolio/Leases";
import TenantsPage from "./pages/portfolio/Tenants";
import OwnersPage from "./pages/portfolio/Owners";

// Working Asset Card Pages (NOT placeholder components)
import PropertyCardPage from "./pages/card/property";
import UnitCardPage from "./pages/card/unit";
import LeaseCardPage from "./pages/card/lease";
import TenantCardPage from "./pages/card/tenant";
import OwnerCardPage from "./pages/card/owner";

// Reports Pages
import ReportsCreatePage from "./pages/reports/Create";
import ReportsSavedPage from "./pages/reports/Saved";
import ReportsTemplatesPage from "./pages/reports/Templates";

// Admin Pages
import AdminSyncPage from "./features/admin/pages/AdminSyncPage";
import AdminGeocodeManagementPage from "./features/admin/pages/AdminGeocodeManagementPage";
import AdminTransferManagementPage from "./features/admin/pages/AdminTransferManagementPage";

// Systems Pages
import IntegrationsHealthPage from "./features/systems/integrations/IntegrationsHealthPage";

// Owner Transfer
import OwnerTransferPage from "./features/ownerTransfer/OwnerTransferPage";
import OwnerTransferDetailPage from "./features/owners/pages/OwnerTransferDetailPage";

// Property Detail
import PropertyDetailPage from "./pages/PropertyDetailPage";

// Dashboard Page
import DashboardPage from "./features/dashboard/pages/DashboardPage";

// DataHub Page
import DataHub from "./pages/DataHub";


function HomeRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    // pick a known-good landing route that exists in this app
    setLocation("/portfolio/properties");
  }, [setLocation]);
  return null;
}

function NotFound() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-semibold mb-2">Route not found</h1>
      <p className="text-neutral-400 mb-6">
        The page you requested doesn't exist. Try a known route:
      </p>
      <div className="flex gap-3 justify-center">
        <a className="px-3 py-2 rounded-xl border border-neutral-700" href="/portfolio/properties">Properties</a>
        <a className="px-3 py-2 rounded-xl border border-neutral-700" href="/portfolio/units">Units</a>
        <a className="px-3 py-2 rounded-xl border border-neutral-700" href="/portfolio/leases">Leases</a>
      </div>
    </div>
  );
}

export default function App() {

  return (
    <div id="ecc-app">
      <DevErrorBanner />
      <div className="ecc-shell">
        <Sidebar />

        {/* Main content area */}
        <main className="ecc-main" role="main" id="main">
          <Switch>
            {/* Home redirect */}
            <Route path="/"><HomeRedirect /></Route>
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/data" component={DataHub} />


            {/* -------- Portfolio V3 (ACTIVE) -------- */}
            <Route path="/portfolio/properties" component={PropertiesPage} />
            <Route path="/portfolio/properties/:id" component={PropertyDetailPage} />
            <Route path="/portfolio/units" component={UnitsPage} />
            <Route path="/portfolio/leases" component={LeasesPage} />
            <Route path="/portfolio/tenants" component={TenantsPage} />
            <Route path="/portfolio/owners" component={OwnersPage} />
            {/* -------------------------------------- */}

            {/* -------- Working Asset Card Pages -------- */}
            <Route path="/card/property/:id" component={PropertyCardPage} />
            <Route path="/card/unit/:id" component={UnitCardPage} />
            <Route path="/card/lease/:id" component={LeaseCardPage} />
            <Route path="/card/tenant/:id" component={TenantCardPage} />
            <Route path="/card/owner/:id" component={OwnerCardPage} />
            {/* ------------------------------------------ */}

            {/* -------- Reports Pages -------- */}
            <Route path="/reports/create" component={ReportsCreatePage} />
            <Route path="/reports/saved" component={ReportsSavedPage} />
            <Route path="/reports/templates" component={ReportsTemplatesPage} />
            {/* ------------------------------- */}

            {/* -------- Admin Pages -------- */}
            <Route path="/admin/sync" component={AdminSyncPage} />
            <Route path="/admin/geocode" component={AdminGeocodeManagementPage} />
            <Route path="/admin/transfers" component={AdminTransferManagementPage} />

            {/* -------- Systems Pages -------- */}
            <Route path="/systems/integrations" component={IntegrationsHealthPage} />
            {/* ----------------------------- */}

            {/* -------- Owner Transfer -------- */}
            <Route path="/owners/transfer" component={OwnerTransferPage} />
            <Route path="/owners/transfer/detail" component={OwnerTransferDetailPage} />
            {/* -------------------------------- */}

            {/* Keep any other existing routes you have here.
             Do NOT route to the old mock pages (Properties.tsx, etc.). */}

            {/* 404 */}
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </main>
        <ToastContainer />
      </div>
    </div>
  );
}
