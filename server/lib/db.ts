import { Pool } from 'pg';
import { requireServerEnv, getDatabaseUrl } from './env';

let _pool: Pool | null = null;

export function getDbPool(): Pool {
  requireServerEnv();

  if (!_pool) {
    const dbUrl = getDatabaseUrl();

    if (!dbUrl) {
      throw new Error('Database functionality requested, but no database URL is available via DATABASE_URL, SUPABASE_DB_URL, or PG* vars.');
    }

    _pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  return _pool;
}

// Proxy the old pool export for backwards compatibility
export const pool = new Proxy({} as Pool, {
  get: (target, prop) => getDbPool()[prop as keyof Pool]
});

export default pool;