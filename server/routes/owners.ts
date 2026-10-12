import type { Express } from "express";
import { sbAdmin } from "../lib/supabaseAdmin";

export function installOwnerRoutes(app: Express) {
  // live type-ahead (company or first/last)
  app.get("/api/owners/search", async (req, res) => {
    if (!res.locals.ecc) res.locals.ecc = {};
    res.locals.ecc.handler = "410_gone";
    res.locals.ecc.contract = "SYSTEM";
    res.locals.ecc.canonical = false;
    res.status(410).json({
      ok: false,
      message: "Gone"
    });
  });

  // properties that belong to an owner (for Owner Card & Transfer modal)
  app.get("/api/owners/:id/properties", async (req, res) => {
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
