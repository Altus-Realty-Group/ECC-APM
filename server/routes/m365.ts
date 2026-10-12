import express from "express";
import { recordAudit } from "../lib/audit";
import { emitBus } from "../lib/bus.js";
import { createPlannerTask } from "../lib/m365/graph.js";
import { setContract } from "../lib/contractHeaders.js";

const router = express.Router();

router.post("/m365/planner/tasks", async (req, res) => {
  // Minimal payload: { title, notes, entity_type, entity_id, due_date }
  const { title, notes, entity_type, entity_id, due_date } = req.body || {};
  // For now: record audit + optional bus; later: call Graph if env is present.
  await recordAudit({
    event_type: "M365_PLANNER_TASK_CREATED",
    label: "M365_ACTION",
    ref_table: entity_type || null,
    ref_id: entity_id || null,
    payload: { title, notes, due_date }
  });
  await emitBus("m365.planner.task_created", { title, notes, entity_type, entity_id, due_date });
  // Try Graph if configured
  try {
    const planId = process.env.M365_PLANNER_PLAN_ID || "";
    const bucketId = process.env.M365_PLANNER_BUCKET_ID || "";
    if (planId) {
      const task = await createPlannerTask({
        title: title || "ECC Task",
        notes,
        dueDateTime: due_date || undefined,
        planId,
        bucketId: bucketId || undefined
      });
      setContract(req, res, '/api/control/integrations/m365/planner/tasks');
      return res.status(201).json({ ok: true, graph: { taskId: task?.id } });
    }
  } catch (e: any) {
    // Graceful: still ok, we already audited; include hint
    setContract(req, res, '/api/control/integrations/m365/planner/tasks');
    return res.status(201).json({ ok: true, note: "Planner not fully configured for Graph call", error: String(e.message || e) });
  }
  setContract(req, res, '/api/control/integrations/m365/planner/tasks');
  return res.status(201).json({ ok: true, note: "Planner plan not configured; audit-only" });
});

export default router;