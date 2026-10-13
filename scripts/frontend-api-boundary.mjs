// No implicit staging target. Preserve unavailable responses as JSON, never SPA HTML.
export function frontendApiBoundary() {
  const attach = server => { server.middlewares.use((req, res, next) => {
    const pathname = (req.url ?? "").split("?")[0];
    if (!/^\/(api|bff)(\/|$)/.test(pathname)) return next();
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ error: "BACKEND_NOT_CONNECTED", message: "This fresh ECC-APM workspace has no verified backend connection." }));
  }); };
  return { name: "ecc-unbound-api", configureServer: attach, configurePreviewServer: attach };
}
