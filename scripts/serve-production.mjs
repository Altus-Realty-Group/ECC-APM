// App-owned production web host: static build plus the same protected API boundary.
// Does not boot the legacy Node API, database clients or background sync jobs.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { protectedBackendMiddleware, bridgeConfig } from './protected-backend-bridge.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff' };
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
export async function createProductionServer({ directory = fileURLToPath(new URL('../dist', import.meta.url)), env = process.env, fetcher = fetch } = {}) {
  const root = await realpath(directory);
  const index = await realpath(resolve(root, 'index.html'));
  if (!index.startsWith(root + sep) || !(await stat(index)).isFile()) throw new Error('Build missing');
  let build = { repository: 'Altus-Realty-Group/ECC-APM', commitSha: null, dirtyBuild: true };
  try {
    const value = JSON.parse(await readFile(resolve(root, 'ecc-build-identity.json'), 'utf8'));
    if (value.repository === build.repository && /^[a-f0-9]{40}$/.test(value.commitSha) && typeof value.dirtyBuild === 'boolean') build = { repository: value.repository, commitSha: value.commitSha, dirtyBuild: value.dirtyBuild };
  } catch { /* Unknown build identity must remain explicit. */ }
  const boundary = protectedBackendMiddleware({ env, fetcher });
  return createServer((req, res) => {
    const serve = async () => {
      const method = req.method ?? 'GET';
      const raw = req.url ?? '/';
      if (raw === '/health/live') {
        if (!['GET', 'HEAD'].includes(method)) return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
        return json(res, 200, { status: 'running', runtime: 'ecc-production-web', ...build, connectionConfigured: bridgeConfig(env) !== null });
      }
      // This must precede SPA fallback, including in an unconfigured environment.
      await boundary(req, res, () => { void serveStatic().catch(() => { if (!res.headersSent) json(res, 404, { error: 'NOT_FOUND' }); else res.destroy(); }); });
      async function serveStatic() {
        if (!['GET', 'HEAD'].includes(method)) return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
        if (!raw.startsWith('/') || raw.startsWith('//')) return json(res, 400, { error: 'INVALID_PATH' });
        let pathname;
        try { pathname = decodeURIComponent(raw.split('?')[0]); } catch { return json(res, 400, { error: 'INVALID_PATH' }); }
        if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part === '..' || part.startsWith('.'))) return json(res, 400, { error: 'INVALID_PATH' });
        // Encoded API separators cannot fall through into an HTML success response.
        if (/^\/(api|bff)(\/|$)/.test(pathname)) return json(res, 404, { error: 'NOT_FOUND' });
        let candidate;
        try { candidate = await realpath(resolve(root, '.' + pathname)); } catch { candidate = null; }
        if (candidate && candidate !== root && !candidate.startsWith(root + sep)) return json(res, 404, { error: 'NOT_FOUND' });
        let info = candidate ? await stat(candidate) : null;
        if (!info?.isFile()) {
          if (extname(pathname)) return json(res, 404, { error: 'NOT_FOUND' });
          candidate = index; info = await stat(index);
        }
        res.writeHead(200, { 'Content-Type': TYPES[extname(candidate)] ?? 'application/octet-stream', 'Content-Length': info.size,
          'Cache-Control': candidate.includes(sep + 'assets' + sep) && /-[A-Za-z0-9_-]{8,}\./.test(candidate) ? 'public, max-age=31536000, immutable' : 'no-store',
          'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
        if (method === 'HEAD') return res.end();
        const stream = createReadStream(candidate);
        stream.on('error', () => res.destroy());
        res.on('close', () => stream.destroy());
        stream.pipe(res);
      }
    };
    void serve().catch(() => { if (!res.headersSent) json(res, 503, { error: 'CONNECTION_UNAVAILABLE' }); else res.destroy(); });
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid listen port');
  const server = await createProductionServer();
  server.listen(port, process.env.ECC_WEB_HOST ?? '0.0.0.0', () => { console.log('ECC production web host listening on port ' + port); });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { server.close(); server.closeIdleConnections(); });
}
