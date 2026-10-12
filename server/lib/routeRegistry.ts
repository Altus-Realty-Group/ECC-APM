export interface RouteEntry {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    handler: string;
    status: 'active' | '410_gone' | 'alias';
    group: string;
    replacement?: string;
    // Contract Extensions
    contract_name?: string;
    contract_version?: string;
    contract_family?: 'SYSTEM' | 'GENERIC_COLLECTION' | 'WORKFLOW' | 'ADMIN_SYNC';
    allowed_statuses?: number[];
    canonical?: boolean;
    alias_of?: string;
    required_fields?: string[];
    nullable_fields?: string[];
    meta_requirements?: string;
}

export const ROUTE_REGISTRY: RouteEntry[] = [
    // SYSTEM
    { method: 'GET', path: '/api/health', handler: 'server/index.ts', status: 'active', group: 'System', contract_name: 'SYSTEM', contract_version: 'v1', contract_family: 'SYSTEM', allowed_statuses: [200, 503], canonical: true },
    { method: 'GET', path: '/api/diag/env', handler: 'server/index.ts', status: 'active', group: 'System', contract_name: 'SYSTEM', contract_version: 'v1', contract_family: 'SYSTEM', allowed_statuses: [200], canonical: true },
    { method: 'GET', path: '/api/_meta/routes', handler: 'server/index.ts', status: 'active', group: 'System', contract_name: 'SYSTEM', contract_version: 'v1', contract_family: 'SYSTEM', allowed_statuses: [200], canonical: true },
    { method: 'GET', path: '/api/config/integrations', handler: 'server/index.ts', status: 'active', group: 'Config', contract_name: 'SYSTEM', contract_version: 'v1', contract_family: 'SYSTEM', allowed_statuses: [200], canonical: true },

    // PORTFOLIO (CANONICAL)
    { method: 'GET', path: '/api/portfolio/properties', handler: 'server/index.ts', status: 'active', group: 'Portfolio', contract_name: 'PORTFOLIO_LIST', contract_version: 'v1', contract_family: 'GENERIC_COLLECTION', allowed_statuses: [200], canonical: true },
    { method: 'GET', path: '/api/portfolio/units', handler: 'server/index.ts', status: 'active', group: 'Portfolio', contract_name: 'PORTFOLIO_LIST', contract_version: 'v1', contract_family: 'GENERIC_COLLECTION', allowed_statuses: [200], canonical: true },
    { method: 'GET', path: '/api/portfolio/leases', handler: 'server/index.ts', status: 'active', group: 'Portfolio', contract_name: 'PORTFOLIO_LIST', contract_version: 'v1', contract_family: 'GENERIC_COLLECTION', allowed_statuses: [200], canonical: true },
    { method: 'GET', path: '/api/portfolio/tenants', handler: 'server/index.ts', status: 'active', group: 'Portfolio', contract_name: 'PORTFOLIO_LIST', contract_version: 'v1', contract_family: 'GENERIC_COLLECTION', allowed_statuses: [200], canonical: true },
    { method: 'GET', path: '/api/portfolio/owners', handler: 'server/index.ts', status: 'active', group: 'Portfolio', contract_name: 'PORTFOLIO_LIST', contract_version: 'v1', contract_family: 'GENERIC_COLLECTION', allowed_statuses: [200], canonical: true },
    { method: 'GET', path: '/api/portfolio/_debug/sql', handler: 'server/index.ts', status: 'active', group: 'Portfolio', contract_name: 'SYSTEM', contract_version: 'v1', contract_family: 'SYSTEM', allowed_statuses: [200, 400], canonical: true },

    // MAINTENANCE & ACCOUNTING
    { method: 'GET', path: '/api/maintenance/workorders', handler: 'server/index.ts', status: 'active', group: 'Maintenance', contract_name: 'GENERIC_COLLECTION', contract_version: 'v1', contract_family: 'GENERIC_COLLECTION', allowed_statuses: [200], canonical: true },
    { method: 'GET', path: '/api/accounting/transactions', handler: 'server/index.ts', status: 'active', group: 'Accounting', contract_name: 'GENERIC_COLLECTION', contract_version: 'v1', contract_family: 'GENERIC_COLLECTION', allowed_statuses: [200], canonical: true },

    // WORKFLOW
    { method: 'POST', path: '/api/owner-transfer/initiate', handler: 'server/index.ts', status: 'active', group: 'Workflow', contract_name: 'WORKFLOW', contract_version: 'v1', contract_family: 'WORKFLOW', allowed_statuses: [201], canonical: true },
    { method: 'POST', path: '/api/owner-transfer/approve-accounting', handler: 'server/index.ts', status: 'active', group: 'Workflow', contract_name: 'WORKFLOW', contract_version: 'v1', contract_family: 'WORKFLOW', allowed_statuses: [200], canonical: true },
    { method: 'POST', path: '/api/owner-transfer/authorize', handler: 'server/index.ts', status: 'active', group: 'Workflow', contract_name: 'WORKFLOW', contract_version: 'v1', contract_family: 'WORKFLOW', allowed_statuses: [200], canonical: true },
    { method: 'POST', path: '/api/owner-transfer/execute', handler: 'server/index.ts', status: 'active', group: 'Workflow', contract_name: 'WORKFLOW', contract_version: 'v1', contract_family: 'WORKFLOW', allowed_statuses: [200, 202], canonical: true },
    { method: 'GET', path: '/api/owner-transfer/:id', handler: 'server/routes/ownerTransfer.ts', status: 'active', group: 'Workflow', contract_name: 'WORKFLOW', contract_version: 'v1', contract_family: 'WORKFLOW', allowed_statuses: [200], canonical: true },
    { method: 'POST', path: '/api/owner-transfer/:id/audit', handler: 'server/routes/ownerTransfer.ts', status: 'active', group: 'Workflow', contract_name: 'WORKFLOW', contract_version: 'v1', contract_family: 'WORKFLOW', allowed_statuses: [201], canonical: true },

    // GENERIC ENTITIES & RPC
    { method: 'GET', path: '/api/entities/:table/:id', handler: 'server/routes/entities.ts', status: 'active', group: 'Entities', contract_name: 'GENERIC_COLLECTION', contract_version: 'v1', contract_family: 'GENERIC_COLLECTION', allowed_statuses: [200], canonical: true },
    { method: 'GET', path: '/api/entities/:table', handler: 'server/routes/entities.ts', status: 'active', group: 'Entities', contract_name: 'GENERIC_COLLECTION', contract_version: 'v1', contract_family: 'GENERIC_COLLECTION', allowed_statuses: [200], canonical: true },
    { method: 'POST', path: '/api/rpc/:functionName', handler: 'rpc_guard', status: 'active', group: 'RPC', contract_name: 'SYSTEM', contract_version: 'v1', contract_family: 'SYSTEM', allowed_statuses: [200, 501], canonical: true },

    // CONTROL (NEW CANONICAL FOR ADMIN)
    { method: 'GET', path: '/api/control/sync/health', handler: 'server/routes/syncHealth.ts', status: 'active', group: 'Admin', contract_name: 'SYSTEM', contract_version: 'v1', contract_family: 'SYSTEM', allowed_statuses: [200], canonical: true },
    { method: 'POST', path: '/api/control/sync/run', handler: 'server/routes/adminSync.ts', status: 'active', group: 'Admin', contract_name: 'ADMIN_SYNC', contract_version: 'v1', contract_family: 'ADMIN_SYNC', allowed_statuses: [200, 202], canonical: true },
    { method: 'POST', path: '/api/control/sync/reset-lock', handler: 'not_implemented', status: 'active', group: 'Admin', contract_name: 'ADMIN_SYNC', contract_version: 'v1', contract_family: 'ADMIN_SYNC', allowed_statuses: [200, 501], canonical: true },
    { method: 'POST', path: '/api/control/sync/quick-run', handler: 'not_implemented', status: 'active', group: 'Admin', contract_name: 'ADMIN_SYNC', contract_version: 'v1', contract_family: 'ADMIN_SYNC', allowed_statuses: [200, 501], canonical: true },
    { method: 'POST', path: '/api/control/integrations/m365/planner/tasks', handler: 'not_implemented', status: 'active', group: 'Integrations', contract_name: 'WORKFLOW', contract_version: 'v1', contract_family: 'WORKFLOW', allowed_statuses: [201, 501], canonical: true },

    // ADMIN (ALIASES TO CONTROL)
    { method: 'GET', path: '/api/admin/sync/health', handler: 'alias_forward', status: 'alias', group: 'Admin', alias_of: '/api/control/sync/health', canonical: false, contract_name: 'SYSTEM', contract_version: 'v1', contract_family: 'SYSTEM', allowed_statuses: [200] },
    { method: 'POST', path: '/api/admin/sync/run', handler: 'alias_forward', status: 'alias', group: 'Admin', alias_of: '/api/control/sync/run', canonical: false, contract_name: 'ADMIN_SYNC', contract_version: 'v1', contract_family: 'ADMIN_SYNC', allowed_statuses: [200, 202] },
    { method: 'POST', path: '/api/admin/sync/reset-lock', handler: 'not_implemented', status: 'alias', group: 'Admin', alias_of: '/api/control/sync/reset-lock', canonical: false, contract_name: 'ADMIN_SYNC', contract_version: 'v1', contract_family: 'ADMIN_SYNC', allowed_statuses: [200, 501] },
    { method: 'POST', path: '/api/admin/sync/quick-run', handler: 'not_implemented', status: 'alias', group: 'Admin', alias_of: '/api/control/sync/quick-run', canonical: false, contract_name: 'ADMIN_SYNC', contract_version: 'v1', contract_family: 'ADMIN_SYNC', allowed_statuses: [200, 501] },
    { method: 'POST', path: '/api/admin/integrations/m365/planner/tasks', handler: 'not_implemented', status: 'alias', group: 'Integrations', alias_of: '/api/control/integrations/m365/planner/tasks', canonical: false, contract_name: 'WORKFLOW', contract_version: 'v1', contract_family: 'WORKFLOW', allowed_statuses: [201, 501] },

    // DEPRECATED / 410 GONE
    { method: 'GET', path: '/api/properties/:id', handler: 'server/routes/properties.ts', status: '410_gone', group: 'Legacy', replacement: '/api/portfolio/properties' },
    { method: 'GET', path: '/api/properties/by-doorloop/:dlId', handler: 'server/routes/properties.ts', status: '410_gone', group: 'Legacy', replacement: '/api/portfolio/properties' },
    { method: 'GET', path: '/api/owners/search', handler: 'server/routes/owners.ts', status: '410_gone', group: 'Legacy', replacement: '/api/portfolio/owners' },
    { method: 'GET', path: '/api/owners/:id/properties', handler: 'server/routes/owners.ts', status: '410_gone', group: 'Legacy', replacement: '/api/portfolio/properties' }
];

export function getRouteManifest() {
    return ROUTE_REGISTRY;
}
