import { Router, type Request } from "express";
import type { makeControlPlaneProtectedPropertyReader } from "../lib/authz/controlPlanePropertyDecision";

type Ports = {
  /** Read the verified session from server middleware. Browser-supplied identity fields are not session authority. */
  resolveSessionId: (request: Request) => string | null | Promise<string | null>;
  readProperty: ReturnType<typeof makeControlPlaneProtectedPropertyReader>;
};

/** Candidate for the existing /api/rpc mount. Requires explicit session and scoped-reader wiring. */
export function createProtectedPropertyCardRouter({ resolveSessionId, readProperty }: Ports) {
  const router = Router({ caseSensitive: true, strict: true });
  router.all("/get_property_card", async (req, res) => {
    res.set("Cache-Control", "private, no-store");

    if (req.method !== "GET") {
      return res.set("Allow", "GET").status(405).json({ error: "method not allowed" });
    }

    const id = req.query.id;
    const propertyId = typeof id === "string" ? Number(id) : NaN;
    if (Object.keys(req.query).length !== 1 || !Number.isSafeInteger(propertyId)
      || propertyId <= 0 || String(propertyId) !== id) {
      return res.status(400).json({ error: "invalid property id" });
    }

    try {
      const sessionId = await resolveSessionId(req);
      if (!sessionId) return res.status(401).json({ error: "unauthenticated" });

      const result = await readProperty(sessionId, propertyId);
      if (result.outcome === "ready") return res.json(result.card);
      if (result.outcome === "denied") return res.status(403).json({ error: "not permitted" });
    } catch {
      // Keep session, authority and storage failures out of the browser response.
    }

    return res.status(503).json({ error: "unavailable" });
  });
  return router;
}
