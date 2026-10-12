import { Request, Response, NextFunction } from 'express';

export function supabaseGuard(req: Request, res: Response, next: NextFunction) {
    const missing = [];
    if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY) {
        missing.push('SUPABASE_SERVICE_ROLE_KEY');
    }

    if (missing.length > 0) {
        return res.status(503).json({
            ok: false,
            error: "Server misconfigured",
            missing_env: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
        });
    }

    next();
}
