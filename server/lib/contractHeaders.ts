import { Request, Response } from 'express';
import { ROUTE_REGISTRY } from './routeRegistry.js';

export function setContract(req: Request, res: Response, canonicalPath: string) {
    // If the request came through an alias, its originalUrl won't match the canonicalPath.
    // Try to find if this is a requested alias:
    const basePath = req.originalUrl?.split('?')[0] || canonicalPath;
    let entry = ROUTE_REGISTRY.find(r => r.path === basePath);

    // Fallback to canonical entry if base path has dynamic parameters or wasn't found directly
    if (!entry) {
        entry = ROUTE_REGISTRY.find(r => r.path === canonicalPath);
    }

    if (!entry) return;

    if (!res.locals.ecc) {
        res.locals.ecc = { handler: 'unhandled', contract: 'SYSTEM', version: 'v1', canonical: null };
    }

    res.locals.ecc.handler = entry.handler;

    if (entry.status !== '410_gone') {
        res.locals.ecc.contract = entry.contract_name || 'UNKNOWN';
        res.locals.ecc.version = entry.contract_version || 'v1';
        if (res.locals.ecc.canonical === null) {
            res.locals.ecc.canonical = entry.canonical ?? false;
        }
    } else {
        res.locals.ecc.contract = '410_gone';
    }
}
