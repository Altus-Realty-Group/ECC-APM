import { protectedBackendMiddleware } from "./protected-backend-bridge.mjs";

// Explicit server-only binding. Missing/invalid configuration remains unavailable;
// no legacy target, local identity or implicit environment credential is restored.
export function frontendApiBoundary() {
  const attach = server => { server.middlewares.use(protectedBackendMiddleware()); };
  return { name: "ecc-governed-api", configureServer: attach, configurePreviewServer: attach };
}
