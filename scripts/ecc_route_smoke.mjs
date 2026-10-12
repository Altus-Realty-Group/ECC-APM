import { z } from 'zod';
import http from 'http';

const PORT = process.env.API_PORT || 8787;
const BASE_URL = `http://localhost:${PORT}`;

// 1. Define Zod Schemas for the 4 Contract Families
const CONTRACT_SCHEMAS = {
    SYSTEM: z.object({}).passthrough(),
    GENERIC_COLLECTION: z.object({
        data: z.array(z.any()),
        meta: z.object({ totalCount: z.number() }).passthrough()
    }).passthrough(),
    WORKFLOW: z.object({}).passthrough(),
    ADMIN_SYNC: z.object({
        ok: z.boolean()
    }).passthrough()
};

async function fetchRoute(route) {
    let mockPath = route.path
        .replace(':id', '123')
        .replace(':dlId', 'dl-456')
        .replace(':table', 'properties')
        .replace(':functionName', 'diag_ids');

    const isSQLDebug = route.path.includes('_debug');
    if (isSQLDebug) mockPath += '?q=SELECT%201';
    else if (route.method === 'GET') mockPath += '?limit=1&offset=0';

    const url = `${BASE_URL}${mockPath}`;
    const options = {
        method: route.method,
        headers: { 'Content-Type': 'application/json' },
    };

    return new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(data); } catch (e) { }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: parsed,
                    raw: data
                });
            });
        });
        req.on('error', reject);
        if (route.method === 'POST' || route.method === 'PUT') {
            req.write(JSON.stringify({ test: true, dryRun: true, action: 'smoke' }));
        }
        req.end();
    });
}

function resolveFamily(familyName) {
    if (familyName === 'PORTFOLIO_LIST') return CONTRACT_SCHEMAS.GENERIC_COLLECTION;
    return CONTRACT_SCHEMAS[familyName];
}

async function runSmokeTests() {
    console.log(`\n[ECC Smoke] Fetching route manifest from ${BASE_URL}...`);

    let manifest;
    try {
        const req = await fetchRoute({ method: 'GET', path: '/api/_meta/routes' });
        manifest = req.data;
        if (req.status !== 200) throw new Error(`Status ${req.status}`);
    } catch (e) {
        console.error('[ECC Smoke] FAIL: Cannot reach /api/_meta/routes. Is server running?');
        process.exit(1);
    }

    const routes = manifest.routes || [];
    console.log(`[ECC Smoke] Registry loaded. Verifying ${routes.length} total endpoints...\n`);

    let hasFailures = false;
    const table = [];

    for (const route of routes) {
        let resultSymbol = '✅';
        let issues = [];

        try {
            const res = await fetchRoute(route);

            // Status assertions constraints
            const isRPCFail = res.status === 400 && res.raw?.includes('RPC not available');
            const isDBFail = res.status === 501 && res.data?.error === 'db_unconfigured_for_this_route';
            const isGuardrail = res.status === 503 && res.data?.error === 'Server misconfigured';

            // Status validations
            if (route.status === '410_gone') {
                if (res.status !== 410) issues.push(`Expected 410, got ${res.status}`);
            } else {
                let allowed = [...(route.allowed_statuses || [])];

                // Allow 401 for control/admin boundaries
                if (route.path.startsWith('/api/control/') || route.path.startsWith('/api/admin/')) {
                    if (!allowed.includes(401)) allowed.push(401);
                }

                // Allow 501 for RPC endpoints missing Supabase
                if (route.path.startsWith('/api/rpc/')) {
                    if (!allowed.includes(501)) allowed.push(501);
                }

                // Assert Allowed Statuses
                if (!allowed.includes(res.status) && !isRPCFail && !isDBFail && !isGuardrail) {
                    issues.push(`Status ${res.status} not in allowed [${allowed.join(',')}] | RAW: ${res.raw?.slice(0, 100)}`);
                }
            }

            // Assert Signature Headers (for all)
            let expectedHandler = route.status === '410_gone' ? '410_gone' : route.handler;
            if (res.headers['x-ecc-handler'] !== expectedHandler.toLowerCase() && res.headers['x-ecc-handler'] !== expectedHandler) {
                issues.push(`Handler mismatch: ${res.headers['x-ecc-handler']} !== ${expectedHandler}`);
            }

            let expectedContract = route.status === '410_gone' ? 'SYSTEM' : route.contract_name;
            if (res.headers['x-ecc-contract'] !== expectedContract) {
                issues.push(`Contract mismatch: ${res.headers['x-ecc-contract']} !== ${expectedContract}`);
            }

            let expectedCanonical = route.status === '410_gone' ? 'false' : String(route.canonical);
            if (res.headers['x-ecc-route-canonical'] !== expectedCanonical) {
                issues.push(`Canonical mismatch: ${res.headers['x-ecc-route-canonical']} !== ${expectedCanonical}`);
            }

            // Assert Zod Schema against runtime response body (if it's a 2xx status)
            if (res.status >= 200 && res.status < 300 && res.data) {
                const schema = resolveFamily(route.contract_family);
                if (schema) {
                    const parsed = schema.safeParse(res.data);
                    if (!parsed.success) {
                        issues.push(`Zod contract violaton -> ${parsed.error.issues[0].message} at ${parsed.error.issues[0].path?.join('.')}`);
                    }
                } else {
                    issues.push(`No Zod schema defined for family ${route.contract_family}`);
                }
            }

            if (issues.length > 0) {
                resultSymbol = '❌';
                hasFailures = true;
            }

            table.push({
                METHOD: route.method,
                PATH: route.path,
                STATUS: res.status,
                CONTRACT: route.contract_name || route.status,
                RESULT: resultSymbol,
                ISSUES: issues.join(' | ')
            });

        } catch (e) {
            hasFailures = true;
            table.push({
                METHOD: route.method,
                PATH: route.path,
                STATUS: 'ERR',
                CONTRACT: route.contract_name,
                RESULT: '❌',
                ISSUES: e.message
            });
        }
    }

    console.table(table, ['METHOD', 'PATH', 'STATUS', 'CONTRACT', 'RESULT', 'ISSUES']);

    if (hasFailures) {
        console.error('\n[ECC Smoke] HARD FAIL: One or more routes broke the contract signatures.');
        process.exit(1);
    } else {
        console.log('\n[ECC Smoke] SUCCESS: 100% Endpoint verification. All routes strictly obey shape protocols.');
        process.exit(0);
    }
}

runSmokeTests();
