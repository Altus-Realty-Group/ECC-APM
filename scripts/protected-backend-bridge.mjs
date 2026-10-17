// Same-origin ECC transport. No local users, roles, service-role client or implicit API target.
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const LOGIN_COOKIE = '__Host-ecc-login';
const SESSION_COOKIE = '__Host-ecc-session';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE = /^[A-Za-z0-9._~-]{1,512}$/;
const CONTEXT_TTL = 300;
const MAX_BYTES = 5 * 1024 * 1024;
const REVIEW_ENVIRONMENTS = new Set(['development', 'test', 'preview']);
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };

function origin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid origin');
  return url.origin;
}
export function bridgeConfig(env = process.env) {
  try {
    const config = {
      api: origin(env.ECC_BACKEND_ORIGIN), control: origin(env.ECC_CONTROL_PLANE_ORIGIN), public: origin(env.ECC_PUBLIC_ORIGIN),
      application: env.ECC_APPLICATION_ID, client: env.ECC_CONTROL_CLIENT_ID, assertion: env.ECC_CONTROL_CLIENT_ASSERTION,
      person: env.ECC_OWNER_PERSON_ID, account: env.ECC_OWNER_ACCOUNT_ID, environment: env.ECC_ENVIRONMENT,
      seal: env.ECC_SESSION_SEAL_KEY,
    };
    if (!config.application || !config.client || !config.assertion || /[\x00-\x20\x7f]/.test(config.assertion)
      || !UUID.test(config.person ?? '') || !UUID.test(config.account ?? '') || !/^[a-f0-9]{64}$/i.test(config.seal ?? '')
      || !['production', 'staging', ...REVIEW_ENVIRONMENTS].includes(config.environment)) return null;
    if (config.api === config.public || config.control === config.public) return null;
    if (![config.application, config.client].every(v => /^[A-Za-z0-9._:-]{1,128}$/.test(v))) return null;
    return Object.freeze(config);
  } catch { return null; }
}
function cookie(name, value, seconds) {
  return name + '=' + value + '; Path=/; Max-Age=' + seconds + '; HttpOnly; Secure; SameSite=Lax';
}
function readCookie(req, name) {
  const matches = String(req.headers.cookie ?? '').split(';').map(v => v.trim()).filter(v => v.startsWith(name + '='));
  if (matches.length !== 1) return null;
  return matches[0].slice(name.length + 1);
}
function reply(res, status, body) { res.statusCode = status; for (const [key, value] of Object.entries(jsonHeaders)) res.setHeader(key, value); res.end(JSON.stringify(body)); }
function seal(config, value) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', Buffer.from(config.seal, 'hex'), iv, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(config.public + '|' + config.client + '|' + config.application));
  const bytes = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString('base64url');
}
function unseal(config, text) {
  if (!text || text.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(text)) throw new Error('Invalid context');
  const bytes = Buffer.from(text, 'base64url');
  if (bytes.length < 29) throw new Error('Invalid context');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(config.seal, 'hex'), bytes.subarray(0, 12), { authTagLength: 16 });
  decipher.setAAD(Buffer.from(config.public + '|' + config.client + '|' + config.application));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
}
function same(a, b) {
  return typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b)
    && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
async function readJSON(response) {
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new Error('Not JSON');
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Oversized response');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Oversized response'); }
    chunks.push(Buffer.from(value));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function validIdentity(config, data, now, requireAllowed = true) {
  return data && typeof data === 'object' && !Array.isArray(data)
    && data.personId === config.person && data.accountId === config.account && data.applicationId === config.application
    && typeof data.applicationSessionId === 'string' && OPAQUE.test(data.applicationSessionId) && typeof data.expiresAt === 'string' && Number.isFinite(Date.parse(data.expiresAt)) && Date.parse(data.expiresAt) > now
    && (!requireAllowed || data.allowed === true)
    && ((data.decisionMode === 'canonical' && data.billingMode === 'canonical' && data.banner === null) || (data.decisionMode === 'developer_bypass'
      && REVIEW_ENVIRONMENTS.has(config.environment) && (!requireAllowed || (Array.isArray(data.capabilities)
      && data.capabilities.length === 1 && data.capabilities[0] === 'ui.review.read'
      && data.billingMode === 'not_applicable_developer' && data.banner === 'DEV BYPASS · READ ONLY'))));
}
function envelope(body) {
  if (!body || body.error != null || body.meta?.contractVersion !== '1.0.0' || body.meta?.source !== 'control-plane') throw new Error('Invalid session response');
  return body.data;
}
export function allowedRead(url) {
  if (/^\/api\/portfolio\/(properties|units|leases|tenants|owners)$/.test(url.pathname)) return !url.search;
  if (url.pathname === '/api/dashboard/kpi/summary') return !url.search;
  if (/^\/api\/rpc\/get_(property|unit|lease|tenant|owner)_card$/.test(url.pathname)) {
    const ids = url.searchParams.getAll('id');
    return [...url.searchParams.keys()].length === 1 && ids.length === 1 && /^\d+$/.test(ids[0]) && Number.isSafeInteger(Number(ids[0])) && Number(ids[0]) > 0;
  }
  return false;
}

export function workspaceConnections(env) {
  const navigation = (name, path) => {
    try {
      if (!env[name]) return null;
      const target = new URL(origin(env[name]));
      if (!target.hostname.includes('.') || target.hostname.endsWith('.') || /(^localhost$|\.(localhost|local|internal|test|invalid)$|^[\d.]+$|:)/i.test(target.hostname) || target.port) return null;
      return target.origin + path;
    } catch { return null; }
  };
  return { applications: [
    { key: 'field-app', navigationUrl: navigation('ECC_FIELD_APP_ORIGIN', '/properties') },
    { key: 'construction-manager', navigationUrl: navigation('ECC_CONSTRUCTION_MANAGER_ORIGIN', '/projects') },
    { key: 'deal-room', navigationUrl: navigation('ECC_DEAL_ROOM_ORIGIN', '/') },
    // No executable ECC consumer profile exists in the current PI producer.
    { key: 'property-intelligence', navigationUrl: null },
  ] };
}

export function protectedBackendMiddleware({ env = process.env, fetcher = fetch, now = Date.now } = {}) {
  const config = bridgeConfig(env);
  const attestHeaders = config ? { 'X-Control-Client-Id': config.client, 'X-Control-Client-Assertion': config.assertion, Accept: 'application/json' } : {};
  const current = async (session) => {
    try {
      const response = await fetcher(config.control + '/api/control/v1/session/current', {
        headers: { ...attestHeaders, 'X-Control-Application-Session': session }, redirect: 'error', signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;
      const data = envelope(await readJSON(response));
      return validIdentity(config, data, now()) && data.applicationSessionId === session ? data : null;
    } catch {
      // Authorization uncertainty is a denial so browser caches cannot preserve old access.
      return null;
    }
  };
  return async (req, res, next) => {
    const raw = req.url ?? '/';
    if (!/^\/(api|bff)(\/|\?|$)/.test(raw)) return next();
    try {
      const url = new URL(raw, config?.public ?? 'https://unbound.invalid');
      if (!config) return reply(res, 503, { error: 'BACKEND_NOT_CONNECTED', message: 'The portfolio connection is unavailable.' });
      const method = req.method ?? 'GET';
      if (method === 'POST' && url.pathname === '/api/access/sign-out' && !url.search) {
        if (req.headers.origin !== config.public || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')
          || !/^application\/json(?:;|$)/i.test(String(req.headers['content-type'] ?? ''))) return reply(res, 403, { error: 'NOT_PERMITTED' });
        let bytes = 0; const chunks = [];
        for await (const chunk of req) { bytes += chunk.length; if (bytes > 1024) return reply(res, 413, { error: 'INVALID_REQUEST' }); chunks.push(chunk); }
        let request;
        try { request = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(res, 400, { error: 'INVALID_REQUEST' }); }
        if (!request || Array.isArray(request) || Object.keys(request).length !== 1 || request.scope !== 'application') return reply(res, 400, { error: 'INVALID_REQUEST' });
        // Clear this browser's cookie even if central revocation cannot be confirmed.
        res.setHeader('Set-Cookie', [cookie(SESSION_COOKIE, '', 0), cookie(LOGIN_COOKIE, '', 0)]);
        const session = readCookie(req, SESSION_COOKIE);
        if (!session || !OPAQUE.test(session)) return reply(res, 401, { error: 'SESSION_REQUIRED', localCleared: true });
        const active = await current(session);
        if (!active) return reply(res, 403, { error: 'NOT_PERMITTED', localCleared: true });
        const response = await fetcher(config.control + '/api/control/v1/session/logout', {
          method: 'POST', headers: { ...attestHeaders, 'X-Control-Application-Session': session, 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'application' }), redirect: 'error', signal: AbortSignal.timeout(5000),
        });
        const body = response.ok ? envelope(await readJSON(response)) : null;
        if (!body || body.scope !== 'application' || body.revoked !== true) return reply(res, 503, { error: 'SIGN_OUT_UNCONFIRMED', localCleared: true });
        return reply(res, 200, { signedOut: true, scope: 'application' });
      }
      if (method !== 'GET' && method !== 'HEAD') return reply(res, 405, { error: 'READ_ONLY', message: 'This connection supports reviewed reads only.' });
      if (method === 'HEAD' && url.pathname.startsWith('/api/access/')) return reply(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      if (url.pathname === '/api/access/sign-in') {
        const state = randomBytes(32).toString('base64url'), nonce = randomBytes(32).toString('base64url'), verifier = randomBytes(48).toString('base64url');
        const context = seal(config, { state, nonce, verifier, expires: now() + CONTEXT_TTL * 1000 });
        const target = new URL(config.control + '/api/control/v1/session/authorize');
        for (const [key, value] of Object.entries({ applicationId: config.application, clientId: config.client, redirectUri: config.public + '/api/access/callback',
          codeChallenge: createHash('sha256').update(verifier).digest('base64url'), codeChallengeMethod: 'S256', state, nonce })) target.searchParams.set(key, value);
        res.writeHead(302, { ...jsonHeaders, Location: target.href, 'Set-Cookie': cookie(LOGIN_COOKIE, context, CONTEXT_TTL), 'Referrer-Policy': 'no-referrer' });
        return res.end();
      }
      if (url.pathname === '/api/access/callback') {
        res.setHeader('Set-Cookie', cookie(LOGIN_COOKIE, '', 0));
        const context = unseal(config, readCookie(req, LOGIN_COOKIE));
        if (context.expires <= now() || context.expires > now() + CONTEXT_TTL * 1000 || !same(context.state, url.searchParams.get('state'))
          || url.searchParams.getAll('state').length !== 1 || url.searchParams.getAll('code').length !== 1 || !OPAQUE.test(url.searchParams.get('code') ?? '')) {
          return reply(res, 403, { error: 'SESSION_REQUIRED', message: 'Start sign-in again.' });
        }
        const response = await fetcher(config.control + '/api/control/v1/session/exchange', {
          method: 'POST', headers: { ...attestHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: url.searchParams.get('code'), codeVerifier: context.verifier, clientId: config.client, redirectUri: config.public + '/api/access/callback' }),
          redirect: 'error', signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) return reply(res, 403, { error: 'SESSION_REQUIRED', message: 'Sign-in could not be confirmed.' });
        const data = envelope(await readJSON(response));
        if (!validIdentity(config, data, now(), false)) {
          return reply(res, 403, { error: 'NOT_PERMITTED', message: 'This account does not have access.' });
        }
        // Exchange alone is not acceptance. Re-check current authorization before issuing a cookie.
        const active = await current(data.applicationSessionId);
        if (!active) return reply(res, 403, { error: 'NOT_PERMITTED', message: 'Access could not be confirmed.' });
        res.writeHead(302, { ...jsonHeaders, Location: config.public + '/dashboard', 'Set-Cookie': [cookie(LOGIN_COOKIE, '', 0),
          cookie(SESSION_COOKIE, active.applicationSessionId, Math.min(3600, Math.floor((Date.parse(active.expiresAt) - now()) / 1000)))], 'Referrer-Policy': 'no-referrer' });
        return res.end();
      }
      const session = readCookie(req, SESSION_COOKIE);
      if (!session || !OPAQUE.test(session)) return reply(res, 401, { error: 'SESSION_REQUIRED', message: 'Sign in with Altus to load your portfolio.' });
      const identity = await current(session);
      if (!identity) {
        res.setHeader('Set-Cookie', cookie(SESSION_COOKIE, '', 0));
        return reply(res, 403, { error: 'NOT_PERMITTED', message: 'Access could not be confirmed.' });
      }
      res.setHeader('X-ECC-Review-Mode', identity.decisionMode === 'developer_bypass' ? 'read-only' : 'canonical');
      if (url.pathname === '/api/workspace/connections' && !url.search) {
        if (method === 'HEAD') { res.writeHead(200, jsonHeaders); return res.end(); }
        return reply(res, 200, workspaceConnections(env));
      }
      if (!allowedRead(url)) return reply(res, 404, { error: 'NOT_FOUND', message: 'This read is not available.' });
      const response = await fetcher(config.api + url.pathname + url.search, { method: 'GET', headers: { Accept: 'application/json' },
        redirect: 'error', signal: AbortSignal.timeout(10000) });
      if (!response.ok) return reply(res, [401, 403, 404].includes(response.status) ? response.status : 502, { error: 'READ_FAILED', message: 'The records could not be loaded.' });
      const body = await readJSON(response);
      if (!body || typeof body !== 'object' || body.ok === false || body.error != null) throw new Error('Invalid read');
      if (method === 'HEAD') { res.writeHead(200, jsonHeaders); return res.end(); }
      return reply(res, 200, body);
    } catch {
      return reply(res, 503, { error: 'CONNECTION_UNAVAILABLE', message: 'The portfolio connection could not be confirmed. Try again.' });
    }
  };
}
