import type { Express } from "express";
import { sbAdmin } from "../lib/supabaseAdmin";

export function installPropertyRoutes(app: Express) {
  // first try internal id
  app.get("/api/properties/:id", async (req, res) => {
    if (!res.locals.ecc) res.locals.ecc = {};
    res.locals.ecc.handler = "410_gone";
    res.locals.ecc.contract = "SYSTEM";
    res.locals.ecc.canonical = false;
    res.status(410).json({
      ok: false,
      message: "Gone"
    });
  });

  // fallback by DoorLoop id (deep links that use external ids)
  app.get("/api/properties/by-doorloop/:dlId", async (req, res) => {
    if (!res.locals.ecc) res.locals.ecc = {};
    res.locals.ecc.handler = "410_gone";
    res.locals.ecc.contract = "SYSTEM";
    res.locals.ecc.canonical = false;
    res.status(410).json({
      ok: false,
      message: "Gone"
    });
  });
}
