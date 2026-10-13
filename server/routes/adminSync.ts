import express from "express";
import { unavailableOperation } from "../lib/unavailableOperation";

// Legacy alternative router referenced a missing sync module. Preserve recovery URLs
// without enabling sync or resetting locks until ownership and authorization are proven.
const router = express.Router();
router.post("/run", unavailableOperation);
router.post("/reset-lock", unavailableOperation);
router.post("/quick-run", unavailableOperation);
export default router;
