import type { Request, Response } from "express";

/** No credential check, business service, data write or provider call runs here. */
export function unavailableOperation(_req: Request, res: Response) {
  return res.status(503).json({ok: false, code: "OPERATION_UNAVAILABLE",
    message: "This operation is unavailable."});
}
